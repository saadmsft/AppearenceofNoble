import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createReadingBackup, createReadingStore, emptyReading, getNoteText, getReadingEntry,
  loadReading, planReadingImport, prepareReadingImport, readingCounts, readingKey, readingLimits, saveReading,
} from '../src/lib/reading.ts'
import type { ReadingData, ReadingResult, ReadingStorage } from '../src/lib/reading.ts'

const known = new Set(['first-entry', 'second-entry', 'third-entry', 'constructor'])
const at = '2026-09-11T12:00:00.000Z'
function value<T>(result: ReadingResult<T>): T {
  assert.equal(result.ok, true, JSON.stringify(result))
  if (!result.ok) throw new Error('Expected success')
  return result.value
}
function issue<T>(result: ReadingResult<T>) {
  assert.equal(result.ok, false)
  if (result.ok) throw new Error('Expected failure')
  return result.issue
}
function memory(initial: string | null = null) {
  const values = new Map<string, string>()
  if (initial !== null) values.set(readingKey, initial)
  const touched: string[] = []
  let error: DOMException | null = null
  const storage: ReadingStorage = () => ({
    getItem(key) { touched.push(key); return values.get(key) ?? null },
    setItem(key, text) {
      touched.push(key)
      if (error) throw error
      values.set(key, text)
    },
  })
  return { values, touched, storage, failWrites: (next: DOMException | null) => { error = next } }
}
function data(entries: ReadingData['entries']): ReadingData {
  return { version: 1, entries, lastOpened: null }
}
const backup = (entries: ReadingData['entries'], bookmarks: string[] = []) =>
  value(createReadingBackup(data(entries), bookmarks, at))

test('a new store does not migrate, read, or rewrite legacy preferences or bookmarks', () => {
  const target = memory()
  const old = '{"language":"ur","theme":"dark","bookmarks":["first-entry"],"textSize":"large","bilingual":true}'
  target.values.set('noble-appearance.preferences.v1', old)
  const store = createReadingStore(target.storage, known)
  assert.deepEqual(store.getSnapshot().data, emptyReading())
  value(store.openEntry('first-entry'))
  value(store.setNote('first-entry', 'My private note'))
  assert.equal(target.values.get('noble-appearance.preferences.v1'), old)
  assert.ok(target.touched.every((key) => key === readingKey))
})

test('opening an entry saves resume without marking read; repeated opens are idempotent', () => {
  const target = memory()
  const store = createReadingStore(target.storage, known)
  value(store.openEntry('first-entry'))
  const saved = target.values.get(readingKey)
  assert.equal(store.getSnapshot().data.lastOpened?.id, 'first-entry')
  assert.equal(getReadingEntry(store.getSnapshot().data, 'first-entry').read, undefined)
  value(store.openEntry('first-entry'))
  assert.equal(target.values.get(readingKey), saved)
  value(store.openEntry('second-entry'))
  const restored = createReadingStore(target.storage, known)
  assert.equal(restored.getSnapshot().data.lastOpened?.id, 'second-entry')
  assert.deepEqual(restored.getSnapshot().data.entries, {})
})

test('explicit unread and plain-text notes survive reload and updates are immutable', () => {
  const target = memory()
  const store = createReadingStore(target.storage, known)
  const original = store.getSnapshot()
  value(store.setRead('first-entry', true))
  const marked = store.getSnapshot()
  value(store.setRead('first-entry', false))
  const note = '<script>alert("private")</script>\nاردو نوٹ & <b>text</b>'
  value(store.setNote('first-entry', note))
  const restored = createReadingStore(target.storage, known).getSnapshot()
  assert.deepEqual(restored.data.entries['first-entry'], { read: false, note })
  assert.equal(getNoteText(restored, 'first-entry'), note)
  assert.deepEqual(original.data.entries, {})
  assert.equal(marked.data.entries['first-entry'].read, true)
  assert.deepEqual(readingCounts(restored.data), { read: 0, unread: 1, notes: 1, bookmarks: 0 })
})

test('prototype-like valid IDs do not inherit note/read state or mutate prototypes', () => {
  const store = createReadingStore(memory().storage, known)
  assert.deepEqual(getReadingEntry(store.getSnapshot().data, 'constructor'), {})
  value(store.setNote('constructor', 'An actual stable ID'))
  assert.equal(getNoteText(store.getSnapshot(), 'constructor'), 'An actual stable ID')
  assert.equal(issue(store.setNote('__proto__', 'no')).code, 'invalid-id')
})

test('note and aggregate bounds reject edits without replacing previous text', () => {
  const store = createReadingStore(memory().storage, known)
  value(store.setNote('first-entry', 'Keep this'))
  assert.equal(issue(store.setNote('first-entry', 'x'.repeat(readingLimits.noteLength + 1))).code, 'note-too-long')
  assert.equal(issue(store.setNote('first-entry', '')).code, 'empty-note')
  assert.equal(getNoteText(store.getSnapshot(), 'first-entry'), 'Keep this')
  const many = Object.fromEntries(Array.from({ length: 50 }, (_, index) => [`entry-${index}`, { note: 'n'.repeat(readingLimits.noteLength) }]))
  const target = memory(JSON.stringify(data(many)))
  const full = createReadingStore(target.storage, new Set([...Object.keys(many), 'first-entry']))
  assert.equal(issue(full.setNote('first-entry', 'x')).code, 'total-too-large')
  assert.equal(getNoteText(full.getSnapshot(), 'first-entry'), '')
})

test('unknown IDs are rejected for actions and known-ID changes preserve stored records', () => {
  const target = memory()
  const store = createReadingStore(target.storage, known)
  assert.deepEqual(issue(store.setNote('future-entry', 'x')), { code: 'unknown-ids', ids: ['future-entry'] })
  value(store.setNote('first-entry', 'Keep me'))
  store.setKnownIds(new Set(['second-entry']))
  assert.equal(store.getSnapshot().issue?.code, 'unknown-ids')
  value(store.setRead('second-entry', true))
  assert.equal(loadReading(target.storage).data.entries['first-entry'].note, 'Keep me')
})

test('note deletion requires confirmation of the exact text and preserves read state', () => {
  const store = createReadingStore(memory().storage, known)
  value(store.setRead('first-entry', false))
  value(store.setNote('first-entry', 'First text'))
  const expected = getNoteText(store.getSnapshot(), 'first-entry')
  value(store.setNote('first-entry', 'Changed after opening confirmation'))
  assert.equal(issue(store.deleteNote('first-entry', expected, true)).code, 'stale-preview')
  assert.ok(getReadingEntry(store.getSnapshot().data, 'first-entry').note)
  value(store.deleteNote('first-entry', 'Changed after opening confirmation', true))
  assert.deepEqual(store.getSnapshot().data.entries['first-entry'], { read: false })
})

test('corrupt or empty stored JSON is not silently overwritten; unexpected exceptions propagate', () => {
  for (const raw of ['', '{bad', '{"version":2}', '{"version":1,"entries":[],"lastOpened":null}']) {
    const target = memory(raw)
    const store = createReadingStore(target.storage, known)
    assert.equal(store.getSnapshot().issue?.code, 'invalid-storage')
    assert.equal(issue(store.setRead('first-entry', true)).code, 'replace-required')
    assert.equal(target.values.get(readingKey), raw)
  }
  const unexpected = () => { throw new Error('Unexpected bug') }
  assert.throws(() => loadReading(unexpected), /Unexpected bug/)
  assert.throws(() => saveReading(unexpected, emptyReading(), null), /Unexpected bug/)
})

test('unavailable storage is explicit and cannot masquerade as a successful write', () => {
  const blocked = () => { throw new DOMException('Blocked', 'SecurityError') }
  assert.equal(loadReading(blocked).issue?.code, 'unavailable')
  const store = createReadingStore(blocked, known)
  assert.equal(issue(store.setNote('first-entry', 'Draft remains')).code, 'unavailable')
  assert.equal(getNoteText(store.getSnapshot(), 'first-entry'), 'Draft remains')
  assert.deepEqual(store.getSnapshot().data, emptyReading())
})

test('a failed reload preserves the last known data without claiming storage is readable', () => {
  const target = memory()
  let blocked = false
  const storage: ReadingStorage = () => {
    if (blocked) throw new DOMException('Blocked', 'SecurityError')
    return target.storage()
  }
  const store = createReadingStore(storage, known)
  value(store.setNote('first-entry', 'Last known good text'))
  value(store.openEntry('first-entry'))
  blocked = true
  assert.equal(issue(store.reload()).code, 'unavailable')
  assert.equal(store.getSnapshot().writable, false)
  assert.equal(getNoteText(store.getSnapshot(), 'first-entry'), 'Last known good text')
  assert.equal(issue(store.openEntry('first-entry')).code, 'unavailable')
  blocked = false
  value(store.reload())
  assert.equal(store.getSnapshot().writable, true)
})

test('quota errors retain failed drafts across navigation; retry persists them after recovery', () => {
  const target = memory()
  const store = createReadingStore(target.storage, known)
  value(store.setNote('first-entry', 'Saved text'))
  target.failWrites(new DOMException('Full', 'QuotaExceededError'))
  assert.equal(issue(store.setNote('first-entry', 'Unsaved text')).code, 'quota')
  assert.equal(getNoteText(store.getSnapshot(), 'first-entry'), 'Unsaved text')
  assert.equal(store.getSnapshot().data.entries['first-entry'].note, 'Saved text')
  assert.equal(issue(store.exportBackup([])).code, 'unsaved-notes')
  assert.equal(issue(store.prepareImport(backup({}), [])).code, 'unsaved-notes')
  target.failWrites(null)
  value(store.openEntry('second-entry'))
  assert.equal(getNoteText(store.getSnapshot(), 'first-entry'), 'Unsaved text')
  value(store.setNote('first-entry', 'Unsaved text'))
  assert.deepEqual(store.getSnapshot().drafts, {})
  assert.equal(createReadingStore(target.storage, known).getSnapshot().data.entries['first-entry'].note, 'Unsaved text')
})

test('failed note deletion preserves both stored text and failed draft', () => {
  const target = memory()
  const store = createReadingStore(target.storage, known)
  value(store.setNote('first-entry', 'Saved'))
  target.failWrites(new DOMException('Full', 'QuotaExceededError'))
  store.setNote('first-entry', 'Draft')
  assert.equal(issue(store.deleteNote('first-entry', 'Draft', true)).code, 'quota')
  assert.equal(getNoteText(store.getSnapshot(), 'first-entry'), 'Draft')
  assert.equal(store.getSnapshot().data.entries['first-entry'].note, 'Saved')
})

test('write readback mismatch is never reported as saved', () => {
  const noOp: ReadingStorage = () => ({ getItem: () => null, setItem: () => {} })
  assert.equal(issue(saveReading(noOp, emptyReading(), null)).code, 'verify-failed')
  const store = createReadingStore(noOp, known)
  assert.equal(issue(store.setNote('first-entry', 'Retained draft')).code, 'verify-failed')
  assert.equal(getNoteText(store.getSnapshot(), 'first-entry'), 'Retained draft')
  assert.deepEqual(store.getSnapshot().data.entries, {})
})

test('competing tabs cannot overwrite a changed store without reload and review', () => {
  const target = memory()
  const first = createReadingStore(target.storage, known)
  const second = createReadingStore(target.storage, known)
  value(first.setNote('first-entry', 'From first tab'))
  assert.equal(issue(second.setNote('second-entry', 'From second tab')).code, 'changed-storage')
  assert.equal(loadReading(target.storage).data.entries['second-entry'], undefined)
  value(second.reload())
  assert.equal(getNoteText(second.getSnapshot(), 'second-entry'), 'From second tab')
  value(second.setNote('second-entry', 'From second tab'))
  assert.equal(loadReading(target.storage).data.entries['first-entry'].note, 'From first tab')
})

test('a backup contains only personal state and preserves exact text in a round trip', () => {
  const current = { ...data({ 'first-entry': { read: false, note: '<img src=x onerror=alert(1)>\nاردو' } }), lastOpened: { id: 'first-entry', at } }
  const text = value(createReadingBackup(current, ['second-entry', 'second-entry'], at))
  const preview = value(prepareReadingImport(text, emptyReading(), [], known))
  assert.deepEqual(Object.keys(JSON.parse(text)).sort(), ['bookmarks', 'exportedAt', 'format', 'reading', 'version'])
  assert.deepEqual(preview.backup.reading, current)
  assert.deepEqual(preview.backup.bookmarks, ['second-entry'])
  assert.deepEqual(preview.counts, { notes: 1, read: 0, unread: 1, bookmarks: 1 })
})

test('backup validation rejects wrong shapes, executable-looking IDs, unknown fields and unsupported versions', () => {
  const good = JSON.parse(backup({}))
  for (const invalid of [
    {}, { ...good, version: 2 }, { ...good, secret: 'not allowed' },
    { ...good, reading: { ...good.reading, entries: { 'first-entry': { note: { html: 'no' } } } } },
    { ...good, reading: { ...good.reading, entries: { 'first-entry': { note: '' } } } },
    { ...good, reading: { ...good.reading, entries: { 'first-entry': { read: 'true' } } } },
    { ...good, reading: { ...good.reading, entries: { '<script>': { read: true } } } },
    { ...good, reading: { ...good.reading, entries: { 'first-entry': { note: 'a'.repeat(10_001) } } } },
    { ...good, bookmarks: ['first-entry', 42] },
  ]) assert.equal(issue(prepareReadingImport(JSON.stringify(invalid), emptyReading(), [], known)).code, 'invalid-import')
  assert.equal(issue(prepareReadingImport('{bad', emptyReading(), [], known)).code, 'invalid-import')
})

test('unknown imported entry, bookmark, and resume IDs are all reported with no writes', () => {
  const text = value(createReadingBackup({
    ...data({ 'unknown-note': { note: 'Preserve rather than silently drop' } }),
    lastOpened: { id: 'unknown-resume', at },
  }, ['unknown-bookmark']))
  const target = memory()
  const store = createReadingStore(target.storage, known)
  const error = issue(store.prepareImport(text, []))
  assert.equal(error.code, 'unknown-ids')
  assert.deepEqual(new Set(error.ids), new Set(['unknown-note', 'unknown-resume', 'unknown-bookmark']))
  assert.equal(target.values.get(readingKey), undefined)
})

test('import text bounds apply before parsing and count UTF-8 bytes', () => {
  assert.equal(issue(prepareReadingImport('x'.repeat(readingLimits.fileBytes + 1), emptyReading(), [], known)).code, 'file-too-large')
  assert.equal(issue(prepareReadingImport('ا'.repeat(readingLimits.fileBytes / 2 + 1), emptyReading(), [], known)).code, 'file-too-large')
})

test('merge previews conflicts, keeps local notes and explicit unread, unions bookmarks, and retains resume', () => {
  const current = { ...data({ 'first-entry': { read: false, note: 'Local' }, 'second-entry': { read: true } }), lastOpened: { id: 'second-entry', at } }
  const imported = { ...data({ 'first-entry': { read: true, note: 'Imported' }, 'second-entry': { note: 'New note' }, 'third-entry': { read: false } }), lastOpened: { id: 'third-entry', at } }
  const text = value(createReadingBackup(imported, ['third-entry']))
  const preview = value(prepareReadingImport(text, current, ['first-entry'], known))
  assert.deepEqual(preview.conflicts, ['first-entry'])
  assert.deepEqual(preview.readConflicts, ['first-entry'])
  const merged = value(planReadingImport(current, ['first-entry'], preview.backup, 'merge'))
  assert.deepEqual(merged.data.entries['first-entry'], { read: false, note: 'Local' })
  assert.deepEqual(merged.data.entries['second-entry'], { read: true, note: 'New note' })
  assert.deepEqual(merged.bookmarks, ['first-entry', 'third-entry'])
  assert.deepEqual(merged.data.lastOpened, current.lastOpened)
  assert.equal(current.entries['second-entry'].note, undefined)
})

test('replace exactly restores the backup and deletes absent local notes/progress/bookmarks', () => {
  const target = memory(JSON.stringify(data({ 'first-entry': { read: true, note: 'Remove' } })))
  const store = createReadingStore(target.storage, known)
  const preview = value(store.prepareImport(backup({ 'second-entry': { read: false, note: 'Restored' } }, ['third-entry']), ['first-entry']))
  let bookmarks: string[] = []
  value(store.applyImport(preview, {
    mode: 'replace', confirmed: true, bookmarks: ['first-entry'],
    onBookmarksChange: (ids) => { bookmarks = ids; return { ok: true } },
  }))
  assert.deepEqual(loadReading(target.storage).data, data({ 'second-entry': { read: false, note: 'Restored' } }))
  assert.deepEqual(bookmarks, ['third-entry'])
  assert.equal(store.getSnapshot().importIssue, null)
})

test('restore does not invoke bookmarks if the reading write fails', () => {
  const target = memory()
  const store = createReadingStore(target.storage, known)
  const preview = value(store.prepareImport(backup({ 'first-entry': { note: 'Import' } }), []))
  target.failWrites(new DOMException('Full', 'QuotaExceededError'))
  let called = false
  const result = store.applyImport(preview, { mode: 'merge', confirmed: true, bookmarks: [], onBookmarksChange: () => { called = true; return { ok: true } } })
  assert.equal(issue(result).code, 'quota')
  assert.equal(called, false)
})

test('bookmark write failure yields a sticky partial restore, never complete success', () => {
  const store = createReadingStore(memory().storage, known)
  const preview = value(store.prepareImport(backup({ 'first-entry': { note: 'Import' } }), []))
  assert.equal(issue(store.applyImport(preview, { mode: 'merge', confirmed: true, bookmarks: [], onBookmarksChange: () => ({ ok: false }) })).code, 'bookmarks-unconfirmed')
  assert.equal(store.getSnapshot().data.entries['first-entry'].note, 'Import')
  value(store.openEntry('second-entry'))
  assert.equal(store.getSnapshot().importIssue?.code, 'bookmarks-unconfirmed')
  const retry = value(store.prepareImport(backup({ 'first-entry': { note: 'Import' } }), []))
  value(store.applyImport(retry, { mode: 'merge', confirmed: true, bookmarks: [], onBookmarksChange: () => ({ ok: true }) }))
  assert.equal(store.getSnapshot().importIssue, null)
})

test('bookmark DOMExceptions are partial failures and programming errors propagate', () => {
  for (const error of [new DOMException('No access', 'SecurityError'), new Error('Unexpected callback bug')]) {
    const store = createReadingStore(memory().storage, known)
    const preview = value(store.prepareImport(backup({ 'first-entry': { note: 'Import' } }), []))
    const apply = () => store.applyImport(preview, { mode: 'merge', confirmed: true, bookmarks: [], onBookmarksChange: () => { throw error } })
    if (error instanceof DOMException) assert.equal(issue(apply()).code, 'bookmarks-unconfirmed')
    else assert.throws(apply, /Unexpected callback bug/)
    assert.equal(store.getSnapshot().importIssue?.code, 'bookmarks-unconfirmed')
  }
})

test('restore rejects stale reading state, changed bookmarks, and reused confirmations', () => {
  const store = createReadingStore(memory().storage, known)
  const first = value(store.prepareImport(backup({}), []))
  value(store.setRead('first-entry', true))
  const options = { mode: 'merge' as const, confirmed: true as const, bookmarks: [], onBookmarksChange: () => ({ ok: true as const }) }
  assert.equal(issue(store.applyImport(first, options)).code, 'stale-preview')
  const second = value(store.prepareImport(backup({}), []))
  assert.equal(issue(store.applyImport(second, { ...options, bookmarks: ['second-entry'] })).code, 'stale-preview')
  value(store.applyImport(second, options))
  assert.equal(issue(store.applyImport(second, options)).code, 'stale-preview')
})

test('corrupt storage recovery requires explicit replace and can restore atomically', () => {
  const target = memory('{corrupt')
  const store = createReadingStore(target.storage, known)
  const preview = value(store.prepareImport(backup({ 'first-entry': { note: 'Recovered' } }), []))
  const options = { confirmed: true as const, bookmarks: [], onBookmarksChange: () => ({ ok: true as const }) }
  assert.equal(issue(store.applyImport(preview, { ...options, mode: 'merge' })).code, 'replace-required')
  assert.equal(target.values.get(readingKey), '{corrupt')
  value(store.applyImport(preview, { ...options, mode: 'replace' }))
  assert.equal(loadReading(target.storage).data.entries['first-entry'].note, 'Recovered')
})

test('merged bounds reject too many bookmarks without truncation', () => {
  const currentBookmarks = Array.from({ length: readingLimits.entries }, (_, index) => `entry-${index}`)
  const imported = value(prepareReadingImport(backup({}, ['third-entry']), emptyReading(), [], known))
  assert.equal(issue(planReadingImport(emptyReading(), currentBookmarks, imported.backup, 'merge')).code, 'total-too-large')
  assert.deepEqual(value(planReadingImport(emptyReading(), currentBookmarks, imported.backup, 'replace')).bookmarks, ['third-entry'])
})

test('subscriptions update on failure and actions remain reference-stable', () => {
  const store = createReadingStore(memory().storage, known)
  const open = store.openEntry
  let updates = 0
  const unsubscribe = store.subscribe(() => { updates += 1 })
  store.setNote('first-entry', '')
  assert.equal(updates, 1)
  assert.equal(store.openEntry, open)
  unsubscribe()
  store.openEntry('first-entry')
  assert.equal(updates, 1)
})
