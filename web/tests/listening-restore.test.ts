import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createListeningCatalog, createListeningEngine, emptyListening, listeningDataSchema,
  listeningKey, validateListeningData,
} from '../src/lib/listening.ts'
import { listeningFixture, ListeningFakeMedia, ListeningMemoryStorage } from './fixtures/listening-fixture.ts'

function setup() {
  const fixture = listeningFixture()
  const storage = new ListeningMemoryStorage()
  const engine = createListeningEngine({ ...fixture, storage: () => storage })
  const media = new ListeningFakeMedia()
  engine.bindAudio(media)
  return { ...fixture, storage, engine, media }
}

test('listening schema is strict and accepts Life chapter context without importing app data', () => {
  const { rows, manifest } = listeningFixture()
  const data = {
    ...emptyListening(),
    queue: {
      shelf: 'life', topic: 'life-hijrah', title: { en: 'Journey', ur: 'سفر' },
      entryIds: ['first'], currentEntryId: 'first', includeCautioned: false,
    },
  }
  assert.ok(listeningDataSchema.safeParse(data).success)
  assert.ok(validateListeningData(data, createListeningCatalog(rows, manifest)).ok)
  assert.equal(listeningDataSchema.safeParse({ ...data, follow: true }).success, false)
  assert.equal(listeningDataSchema.safeParse({ ...data, queue: { ...data.queue, includeCautioned: undefined } }).success, false)
  assert.equal(listeningDataSchema.safeParse({ ...data, queue: { ...data.queue, url: 'https://untrusted.invalid/' } }).success, false)
})

test('checkpointAndExport captures precise media time and reports persistence separately from export validity', () => {
  const { engine, media, chapter, storage } = setup()
  engine.startQueue(chapter, 'en')
  media.metadata()
  media.currentTime = 19.875
  const getter = engine.checkpointAndExport
  const saved = getter()
  assert.ok(saved.ok)
  assert.equal(saved.value.data.positions[0].time, 19.875)
  assert.equal(saved.value.baseline, JSON.stringify(saved.value.data))
  assert.equal(saved.value.storageIssue, null)
  assert.equal(saved.value.writable, true)
  assert.equal(engine.getSnapshot().playing, true, 'export is not an implicit playback interrupt')
  storage.failure = 'quota'
  media.currentTime = 20.125
  const unsaved = getter()
  assert.ok(unsaved.ok)
  assert.equal(unsaved.value.data.positions[0].time, 20.125)
  assert.equal(unsaved.value.storageIssue?.code, 'quota')
  assert.equal(unsaved.value.writable, false)
  assert.equal(engine.checkpointAndExport, getter)
})

test('controller validates imported canonical IDs and both current asset identities', () => {
  const { engine, media, chapter } = setup()
  engine.startQueue(chapter, 'en')
  media.metadata()
  engine.pause()
  const data = engine.exportData()
  assert.ok(data.ok)
  assert.ok(engine.validateData(data.value).ok)
  for (const patch of [
    { entryId: 'unknown' }, { language: 'ur' }, { cacheKey: 'f'.repeat(64) },
    { sha256: 'f'.repeat(64) }, { asset: 'https://untrusted.invalid/audio.mp3' },
  ]) {
    const imported: unknown = { ...data.value, positions: [{ ...data.value.positions[0], ...patch }] }
    assert.equal(engine.validateData(imported).ok, false)
    assert.equal(engine.prepareRestore(imported, 'replace').ok, false)
  }
})

test('prepareRestore rejects active playback and captures a detached validated merge plan when paused', () => {
  const { engine, media, chapter } = setup()
  engine.startQueue(chapter, 'en')
  media.metadata()
  engine.seek(12.5)
  assert.deepEqual(engine.prepareRestore(emptyListening(), 'merge'), { ok: false, issue: { code: 'busy' } })
  engine.pause()
  const local = engine.exportData()
  assert.ok(local.ok)
  const imported = { ...local.value, positions: [{ ...local.value.positions[0], time: 45 }] }
  const prepared = engine.prepareRestore(imported, 'merge')
  assert.ok(prepared.ok)
  imported.positions[0].time = 77
  assert.equal(prepared.value.mode, 'merge')
  assert.equal(prepared.value.baseline, JSON.stringify(engine.getSnapshot().data))
  assert.equal(prepared.value.data.positions[0].time, 12.5)
  const applied = engine.applyRestore(prepared.value, { confirmed: true, expectedBaseline: prepared.value.baseline })
  assert.ok(applied.ok)
  assert.equal(applied.value.positions[0].time, 12.5)
  assert.equal(engine.getSnapshot().playing, false)
})

test('applyRestore requires explicit confirmation and leaves replacement paused with follow off', () => {
  const { engine, media, chapter } = setup()
  engine.startQueue(chapter, 'en')
  media.metadata()
  engine.seek(12)
  engine.pause()
  engine.setFollow(true)
  const local = engine.exportData()
  assert.ok(local.ok)
  const prepared = engine.prepareRestore({ ...local.value, positions: [{ ...local.value.positions[0], time: 48.625 }] }, 'replace')
  assert.ok(prepared.ok)
  const before = media.plays
  assert.deepEqual(engine.applyRestore(prepared.value, { confirmed: false, expectedBaseline: prepared.value.baseline }),
    { ok: false, issue: { code: 'replace-required' } })
  assert.equal(engine.getSnapshot().currentTime, 12)
  const applied = engine.applyRestore(prepared.value, { confirmed: true, expectedBaseline: prepared.value.baseline })
  assert.ok(applied.ok)
  media.metadata()
  assert.equal(media.currentTime, 48.625)
  assert.equal(media.plays, before)
  assert.equal(engine.getSnapshot().playing, false)
  assert.equal(engine.getSnapshot().follow, false)
  assert.equal(engine.applyRestore(prepared.value, { confirmed: true, expectedBaseline: prepared.value.baseline }).ok, false,
    'a successful preview is consumed')
})

test('applyRestore rejects mismatched expected baselines, in-memory changes and resumed playback without writes', () => {
  const { engine, media, chapter, storage } = setup()
  engine.startQueue(chapter, 'en')
  media.metadata()
  engine.pause()
  const prepared = engine.prepareRestore(emptyListening(), 'replace')
  assert.ok(prepared.ok)
  let writes = storage.writes
  assert.deepEqual(engine.applyRestore(prepared.value, { confirmed: true, expectedBaseline: 'stale' }),
    { ok: false, issue: { code: 'stale-preview' } })
  assert.equal(storage.writes, writes)
  engine.seek(9)
  writes = storage.writes
  assert.deepEqual(engine.applyRestore(prepared.value, { confirmed: true, expectedBaseline: prepared.value.baseline }),
    { ok: false, issue: { code: 'stale-preview' } })
  assert.equal(storage.writes, writes)
  engine.play()
  assert.deepEqual(engine.applyRestore(prepared.value, { confirmed: true, expectedBaseline: prepared.value.baseline }),
    { ok: false, issue: { code: 'busy' } })
})

test('applyRestore rejects forged and modified previews, including otherwise valid replacement data', () => {
  const { engine, storage } = setup()
  const prepared = engine.prepareRestore(emptyListening(), 'replace')
  assert.ok(prepared.ok)
  const writes = storage.writes
  const options = { confirmed: true, expectedBaseline: prepared.value.baseline }
  assert.equal(engine.applyRestore({ ...prepared.value }, options).ok, false)
  Reflect.set(prepared.value, 'data', { ...emptyListening(), rate: 1.5 })
  assert.equal(engine.applyRestore(prepared.value, options).ok, false)
  assert.equal(storage.writes, writes)
})

test('applyRestore detects external changes and never silently replaces a competing tab', () => {
  const { engine, storage } = setup()
  const prepared = engine.prepareRestore(emptyListening(), 'replace')
  assert.ok(prepared.ok)
  const other = JSON.stringify({ ...emptyListening(), rate: 1.5 })
  storage.values.set(listeningKey, other)
  const applied = engine.applyRestore(prepared.value, { confirmed: true, expectedBaseline: prepared.value.baseline })
  assert.deepEqual(applied, { ok: false, issue: { code: 'changed-storage' } })
  assert.equal(storage.values.get(listeningKey), other)
  assert.equal(engine.getSnapshot().storageIssue?.code, 'changed-storage')
})

test('applyRestore returns honest quota and verification failures without replacing in-memory state', () => {
  for (const failure of ['quota', 'verify'] as const) {
    const { engine, storage } = setup()
    const prepared = engine.prepareRestore({ ...emptyListening(), rate: 1.5 }, 'replace')
    assert.ok(prepared.ok)
    storage.failure = failure
    const applied = engine.applyRestore(prepared.value, { confirmed: true, expectedBaseline: prepared.value.baseline })
    assert.deepEqual(applied, { ok: false, issue: { code: failure === 'quota' ? 'quota' : 'verify-failed' } })
    assert.equal(engine.getSnapshot().rate, 1)
    assert.equal(engine.getSnapshot().writable, false)
  }
})

test('corrupt initial storage supports only an explicitly confirmed prepared replacement', () => {
  const fixture = listeningFixture()
  const storage = new ListeningMemoryStorage()
  storage.values.set(listeningKey, '{corrupt')
  const engine = createListeningEngine({ ...fixture, storage: () => storage })
  const exported = engine.checkpointAndExport()
  assert.ok(exported.ok)
  assert.equal(exported.value.storageIssue?.code, 'invalid-storage')
  assert.equal(exported.value.writable, false)
  assert.equal(engine.prepareRestore(emptyListening(), 'merge').ok, false)
  const prepared = engine.prepareRestore(emptyListening(), 'replace')
  assert.ok(prepared.ok)
  assert.equal(storage.values.get(listeningKey), '{corrupt')
  assert.ok(engine.applyRestore(prepared.value, { confirmed: true, expectedBaseline: prepared.value.baseline }).ok)
  assert.equal(engine.getSnapshot().storageIssue, null)
})
