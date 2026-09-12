import assert from 'node:assert/strict'
import { test } from 'node:test'
import manifest from '../src/data/audio-manifest.json' with { type: 'json' }
import { narrations } from '../src/lib/library.ts'
import { createListeningEngine, emptyListening, listeningKey } from '../src/lib/listening.ts'
import type { ListeningData, ListeningStorage } from '../src/lib/listening.ts'
import { createReadingBackup, createReadingStore, emptyReading, readingKey } from '../src/lib/reading.ts'
import type { ReadingResult } from '../src/lib/reading.ts'

const first = 'most-handsome-face-best-form-bara'
const second = 'life-first-revelation-hira'
const known = new Set(narrations.map((row) => row.id))

function value<T>(result: ReadingResult<T>): T {
  assert.equal(result.ok, true, JSON.stringify(result))
  if (!result.ok) throw new Error('Expected successful personal data operation')
  return result.value
}
function audioData(entryId: string, time: number): ListeningData {
  const track = manifest.tracks.find((item) => item.entryId === entryId && item.language === 'en')!
  return { ...emptyListening(), positions: [{
    entryId, language: 'en', cacheKey: track.cacheKey, sha256: track.sha256, time, completed: false,
  }] }
}
function setup(rawListening = JSON.stringify(audioData(first, 3.25))) {
  const values = new Map<string, string>([
    [listeningKey, rawListening],
    [readingKey, JSON.stringify({ ...emptyReading(), entries: { [first]: { read: false, note: 'Local private note' } } })],
  ])
  let blocked = ''
  const storage: ListeningStorage = () => ({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, text) => {
      if (key === blocked) throw new DOMException('Full', 'QuotaExceededError')
      values.set(key, text)
    },
  })
  const listening = createListeningEngine({ rows: narrations, manifest, storage })
  const reading = createReadingStore(storage, known, listening)
  return { values, listening, reading, block: (key: string) => { blocked = key } }
}
function backup(listening = audioData(second, 6.5)) {
  return value(createReadingBackup({
    ...emptyReading(), entries: { [first]: { read: true, note: 'Imported private note' } },
  }, [second], '2026-09-12T00:00:00.000Z', listening))
}
const acceptBookmarks = () => ({ ok: true as const })

test('version-2 export includes validated listening state but no source text or preferences', () => {
  const target = setup()
  const text = value(target.reading.exportBackup([first]))
  const data = JSON.parse(text)
  assert.equal(data.version, 2)
  assert.deepEqual(data.listening, audioData(first, 3.25))
  assert.equal(data.reading.entries[first].note, 'Local private note')
  for (const field of ['arabicFull', 'transcript', 'preferences', 'summary']) assert.equal(text.includes(`"${field}"`), false)
})

test('version-2 merge preserves local notes, explicit unread and listening conflicts', () => {
  const target = setup()
  const incoming: ListeningData = { ...audioData(second, 6.5), positions: [
    ...audioData(first, 12).positions, ...audioData(second, 6.5).positions,
  ] }
  const preview = value(target.reading.prepareImport(backup(incoming), []))
  assert.equal(preview.listening?.positions, 2)
  value(target.reading.applyImport(preview, { mode: 'merge', confirmed: true, bookmarks: [], onBookmarksChange: acceptBookmarks }))
  assert.equal(target.reading.getSnapshot().data.entries[first].note, 'Local private note')
  assert.equal(target.reading.getSnapshot().data.entries[first].read, false)
  assert.equal(target.listening.getSnapshot().data.positions.find((item) => item.entryId === first)?.time, 3.25)
  assert.equal(target.listening.getSnapshot().data.positions.find((item) => item.entryId === second)?.time, 6.5)
  assert.equal(target.listening.getSnapshot().playing, false)
  assert.equal(target.listening.getSnapshot().follow, false)
})

test('confirmed version-2 replacement applies all stores and removes absent listening positions', () => {
  const target = setup()
  target.listening.setFollow(true)
  let bookmarks: string[] = []
  const preview = value(target.reading.prepareImport(backup(), []))
  value(target.reading.applyImport(preview, { mode: 'replace', confirmed: true, bookmarks: [], onBookmarksChange: (next) => {
    bookmarks = next
    return { ok: true }
  } }))
  assert.deepEqual(bookmarks, [second])
  assert.equal(target.reading.getSnapshot().data.entries[first].note, 'Imported private note')
  assert.deepEqual(target.listening.getSnapshot().data, audioData(second, 6.5))
  assert.equal(target.listening.getSnapshot().playing, false)
  assert.equal(target.listening.getSnapshot().follow, false)
})

test('version-1 replacement leaves existing listening bytes untouched', () => {
  const target = setup()
  const before = target.values.get(listeningKey)
  const old = value(createReadingBackup(emptyReading(), []))
  const preview = value(target.reading.prepareImport(old, []))
  assert.equal(preview.listening, undefined)
  value(target.reading.applyImport(preview, { mode: 'replace', confirmed: true, bookmarks: [], onBookmarksChange: acceptBookmarks }))
  assert.equal(target.values.get(listeningKey), before)
})

test('unknown audio identities reject the entire version-2 backup before applying any data', () => {
  const target = setup()
  const before = [...target.values]
  const input = JSON.parse(backup())
  input.listening.positions[0].sha256 = 'f'.repeat(64)
  const result = target.reading.prepareImport(JSON.stringify(input), [])
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.issue.code, 'listening-invalid')
  assert.deepEqual([...target.values], before)
})

test('listening changes after preview prevent reading and bookmark writes', () => {
  const target = setup()
  const preview = value(target.reading.prepareImport(backup(), []))
  const beforeReading = target.values.get(readingKey)
  target.listening.setRate(1.25)
  let changed = false
  const result = target.reading.applyImport(preview, { mode: 'replace', confirmed: true, bookmarks: [], onBookmarksChange: () => {
    changed = true
    return { ok: true }
  } })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.issue.code, 'stale-preview')
  assert.equal(target.values.get(readingKey), beforeReading)
  assert.equal(changed, false)
})

test('external listening writes invalidate confirmation before other stores change', () => {
  const target = setup()
  const preview = value(target.reading.prepareImport(backup(), []))
  const beforeReading = target.values.get(readingKey)
  target.values.set(listeningKey, JSON.stringify(audioData(first, 9)))
  const result = target.reading.applyImport(preview, { mode: 'replace', confirmed: true, bookmarks: [], onBookmarksChange: acceptBookmarks })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.issue.code, 'stale-preview')
  assert.equal(target.values.get(readingKey), beforeReading)
})

test('a failed final listening write reports a sticky partial restore instead of success', () => {
  const target = setup()
  const preview = value(target.reading.prepareImport(backup(), []))
  target.block(listeningKey)
  let savedBookmarks = false
  const result = target.reading.applyImport(preview, { mode: 'replace', confirmed: true, bookmarks: [], onBookmarksChange: () => {
    savedBookmarks = true
    return { ok: true }
  } })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.issue.code, 'listening-unconfirmed')
  assert.equal(savedBookmarks, true)
  assert.equal(target.reading.getSnapshot().data.entries[first].note, 'Imported private note')
  assert.equal(target.reading.getSnapshot().importIssue?.code, 'listening-unconfirmed')
  assert.deepEqual(JSON.parse(target.values.get(listeningKey)!), audioData(first, 3.25))
})

test('corrupt listening storage blocks export and merge but permits confirmed replacement', () => {
  const target = setup('{broken')
  const exported = target.reading.exportBackup([])
  assert.equal(exported.ok, false)
  assert.equal(target.values.get(listeningKey), '{broken')
  const preview = value(target.reading.prepareImport(backup(), []))
  assert.equal(preview.listening?.merge, null)
  value(target.reading.applyImport(preview, { mode: 'replace', confirmed: true, bookmarks: [], onBookmarksChange: acceptBookmarks }))
  assert.deepEqual(target.listening.getSnapshot().data, audioData(second, 6.5))
})
