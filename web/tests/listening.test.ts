import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildListeningQueue, createListeningCatalog, createListeningEngine, emptyListening,
  listeningKey, listeningLimits, loadListening, mergeListeningData, parseListeningData,
  replaceListeningData, saveListening, serializeListeningData, validateListeningData,
} from '../src/lib/listening.ts'
import { listeningFixture, ListeningFakeMedia, ListeningMemoryStorage } from './fixtures/listening-fixture.ts'

function setup() {
  const fixture = listeningFixture()
  const storage = new ListeningMemoryStorage()
  const catalog = createListeningCatalog(fixture.rows, fixture.manifest)
  let clock = 0
  const engine = createListeningEngine({
    ...fixture, storage: () => storage, pageHref: 'http://localhost:5178/',
    now: () => clock,
  })
  const media = new ListeningFakeMedia()
  engine.bindAudio(media)
  return { ...fixture, storage, catalog, engine, media, tick: (ms: number) => { clock += ms } }
}

test('queue preserves canonical order and summaries when Arabic assets are shared', () => {
  const { catalog, chapter } = setup()
  const ar = buildListeningQueue(catalog, chapter, 'ar')
  assert.ok(ar.ok)
  assert.deepEqual(ar.value.queue.entryIds, ['first', 'second'])
  assert.deepEqual(ar.value.items.map((item) => item.entryIds), [['first', 'second']])
  const en = buildListeningQueue(catalog, ar.value.queue, 'en')
  assert.ok(en.ok)
  assert.deepEqual(en.value.items.map((item) => item.entryId), ['first', 'second'])
})

test('queue requires caution opt-in and keeps missing tracks as explicit stops', () => {
  const { catalog, chapter } = setup()
  const result = buildListeningQueue(catalog, { ...chapter, includeCautioned: true, entryIds: ['cautioned', 'missing'] }, 'en')
  assert.ok(result.ok)
  assert.deepEqual(result.value.items.map((item) => item.entryId), ['cautioned', 'missing'])
  assert.equal(result.value.items[1].track, null)
  assert.equal(buildListeningQueue(catalog, { ...chapter, entryIds: ['unknown'] }, 'en').ok, false)
  assert.equal(buildListeningQueue(catalog, { ...chapter, entryIds: ['cautioned'] }, 'en').ok, false)
})

test('validation rejects all untrusted state fields, identities and limits', () => {
  const { catalog, engine, chapter, media } = setup()
  engine.startQueue(chapter, 'en')
  media.metadata()
  engine.seek(12.34)
  const valid = engine.getSnapshot().data
  assert.ok(validateListeningData(valid, catalog).ok)
  assert.ok(parseListeningData(JSON.stringify(valid), catalog).ok)
  for (const patch of [
    { version: 2 }, { language: 'xx' }, { rate: 12 }, { follow: true },
    { positions: [{ ...valid.positions[0], time: -1 }] },
    { positions: [{ ...valid.positions[0], time: Infinity }] },
    { positions: [{ ...valid.positions[0], cacheKey: 'f'.repeat(64) }] },
    { positions: [{ ...valid.positions[0], sha256: 'f'.repeat(64) }] },
    { positions: [{ ...valid.positions[0], entryId: 'unknown' }] },
    { positions: [{ ...valid.positions[0], url: 'https://evil.invalid/a.mp3' }] },
    { positions: [valid.positions[0], valid.positions[0]] },
    { queue: { ...valid.queue, entryIds: ['unknown'] } },
    { queue: { ...valid.queue, currentEntryId: 'missing' } },
    { queue: { ...valid.queue, entryIds: ['first', 'first'] } },
    { queue: { ...valid.queue, shelf: 'unknown' } },
    { queue: { ...valid.queue, topic: 'face' } },
    { queue: { ...valid.queue, title: { en: '<script>x</script>', ur: '' } } },
    { queue: { ...valid.queue, entryIds: ['cautioned'], currentEntryId: 'cautioned' } },
  ]) assert.equal(validateListeningData({ ...valid, ...patch }, catalog).ok, false, JSON.stringify(patch))
  assert.equal(validateListeningData({ ...valid, positions: Array(listeningLimits.entries + 1).fill(valid.positions[0]) }, catalog).ok, false)
  assert.equal(parseListeningData('{', catalog).ok, false)
  assert.equal(parseListeningData(' '.repeat(listeningLimits.fileBytes + 1), catalog).ok, false)
  assert.equal(serializeListeningData({ ...valid, rate: 99 }, catalog).ok, false)
  assert.ok(serializeListeningData(valid, catalog).ok)
})

test('storage distinguishes absent, corrupt, unavailable, quota, verification and concurrent writes', () => {
  const { storage, catalog } = setup()
  const get = () => storage
  assert.equal(loadListening(get, catalog).issue, null)
  storage.values.set(listeningKey, '{')
  assert.equal(loadListening(get, catalog).issue?.code, 'invalid-storage')
  storage.values.delete(listeningKey)
  storage.failure = 'unavailable'
  assert.equal(loadListening(get, catalog).issue?.code, 'unavailable')
  storage.failure = 'quota'
  assert.deepEqual(saveListening(get, emptyListening(), null, catalog), { ok: false, issue: { code: 'quota' } })
  storage.failure = 'verify'
  assert.deepEqual(saveListening(get, emptyListening(), null, catalog), { ok: false, issue: { code: 'verify-failed' } })
  storage.failure = null
  storage.values.set(listeningKey, '{}')
  assert.deepEqual(saveListening(get, emptyListening(), null, catalog), { ok: false, issue: { code: 'changed-storage' } })
  assert.equal(storage.values.get(listeningKey), '{}')
})

test('engine never autoplays on attachment, restore or shelf changes and never writes reading state', () => {
  const { engine, media, storage, chapter, rows, manifest } = setup()
  assert.equal(media.plays, 0)
  engine.startQueue(chapter, 'en')
  media.metadata()
  media.currentTime = 17.125
  engine.pause()
  const restored = createListeningEngine({ rows, manifest, storage: () => storage })
  const nextMedia = new ListeningFakeMedia()
  restored.bindAudio(nextMedia)
  nextMedia.metadata()
  assert.equal(nextMedia.plays, 0)
  assert.equal(nextMedia.currentTime, 17.125)
  assert.equal(restored.getSnapshot().follow, false)
  restored.setShelf('character')
  restored.setShelf('all')
  assert.equal(nextMedia.plays, 0)
  assert.deepEqual([...storage.values.keys()], [listeningKey])
})

test('engine checkpoints precise positions at bounded intervals and clamps after metadata', () => {
  const { engine, media, chapter, tick, storage } = setup()
  engine.startQueue(chapter, 'en')
  media.metadata()
  engine.seek(81.123)
  engine.pause()
  const writes = storage.writes
  engine.play()
  media.currentTime = 82.25
  media.dispatchEvent(new Event('timeupdate'))
  assert.equal(storage.writes, writes)
  tick(2000)
  media.dispatchEvent(new Event('timeupdate'))
  assert.equal(engine.getSnapshot().data.positions[0].time, 82.25)
  assert.equal(storage.writes, writes + 1)
  engine.setLanguage('ar')
  media.metadata(10)
  assert.equal(media.currentTime, 0)
  engine.seek(500)
  assert.equal(media.currentTime, 10)
  engine.setLanguage('en')
  media.metadata(20)
  assert.equal(media.currentTime, 0, 'saved position beyond the actual EOF restarts')
  engine.seek(-3)
  assert.equal(media.currentTime, 0)
  engine.seek(NaN)
  assert.equal(media.currentTime, 0)
})

test('engine language selection pauses and retains language-specific cursors and all logical entries', () => {
  const { engine, media, chapter } = setup()
  engine.startQueue(chapter, 'en')
  media.metadata()
  engine.seek(24.75)
  engine.next()
  media.metadata()
  engine.seek(9.5)
  engine.setLanguage('ar')
  media.metadata()
  assert.equal(engine.getSnapshot().playing, false)
  assert.equal(engine.getSnapshot().items.length, 1)
  assert.equal(media.currentTime, 0)
  engine.setLanguage('en')
  media.metadata()
  assert.equal(engine.getSnapshot().items.length, 2)
  assert.equal(engine.getSnapshot().currentNarration?.id, 'second')
  assert.equal(media.currentTime, 9.5)
  engine.previous()
  media.metadata()
  assert.equal(media.currentTime, 24.75)
})

test('engine advances only an explicitly started queue, stops at missing or final clips and resets completed resume', () => {
  const { engine, media, chapter } = setup()
  engine.startQueue(chapter, 'en')
  media.metadata()
  media.end()
  assert.equal(engine.getSnapshot().currentNarration?.id, 'second')
  assert.equal(media.plays, 2)
  media.metadata()
  media.end()
  assert.equal(engine.getSnapshot().ended, true)
  assert.equal(media.plays, 2)
  engine.play()
  assert.equal(media.currentTime, 0)
  engine.startQueue({ ...chapter, entryIds: ['first', 'missing', 'second'] }, 'en')
  media.metadata()
  media.end()
  assert.equal(engine.getSnapshot().error?.code, 'missing-track')
  assert.equal(engine.getSnapshot().currentNarration?.id, 'missing')
  assert.equal(media.paused, true)
})

test('engine rejects obsolete play promises without corrupting newly selected audio', async () => {
  const { engine, media, chapter } = setup()
  let reject!: (reason: Error) => void
  media.pending = new Promise<void>((_, no) => { reject = no })
  engine.startQueue(chapter, 'en')
  media.pending = null
  engine.startEntry('second', 'ur')
  reject(new DOMException('Old play', 'AbortError'))
  await Promise.resolve()
  assert.equal(engine.getSnapshot().error, null)
  assert.equal(engine.getSnapshot().currentTrack?.language, 'ur')
  media.pending = Promise.reject(new DOMException('Blocked', 'NotAllowedError'))
  engine.play()
  await Promise.resolve()
  assert.equal(engine.getSnapshot().error?.code, 'playback-rejected')
  media.pending = null
  engine.play()
  assert.equal(engine.getSnapshot().error, null)
  media.dispatchEvent(new Event('error'))
  assert.equal(engine.getSnapshot().error?.code, 'asset-error')
  engine.play()
  assert.equal(engine.getSnapshot().error, null)
})

test('engine pauses actual interrupts, preserves rate state, and suspends follow without disabling it', () => {
  const { engine, media, chapter } = setup()
  engine.startQueue(chapter, 'en')
  media.metadata()
  engine.setRate(1.5)
  assert.equal(media.playbackRate, 1.5)
  assert.equal(engine.getSnapshot().playing, true)
  engine.setRate(77)
  assert.equal(media.playbackRate, 1.5)
  engine.setFollow(true)
  engine.suspendFollow()
  assert.equal(engine.getSnapshot().follow, true)
  assert.equal(engine.getSnapshot().followSuspended, true)
  engine.setFollow(true)
  assert.equal(engine.getSnapshot().followSuspended, false)
  engine.setShelf('character')
  assert.equal(media.paused, false)
  engine.setShelf('appearance')
  assert.equal(media.paused, true)
  engine.play()
  media.pause()
  assert.equal(engine.getSnapshot().playing, false)
  const count = media.plays
  media.end()
  assert.equal(media.plays, count, 'interrupted queue cannot auto-advance')
})

test('engine detachment releases the only media and reattachment does not autoplay', () => {
  const { engine, media, chapter } = setup()
  engine.startQueue(chapter, 'en')
  media.metadata()
  media.currentTime = 12.8
  engine.bindAudio(null)
  assert.equal(media.src, '')
  assert.equal(media.paused, true)
  engine.bindAudio(media)
  media.metadata()
  assert.equal(media.currentTime, 12.8)
  assert.equal(media.plays, 1)
  const other = new ListeningFakeMedia()
  engine.bindAudio(other)
  assert.equal(media.src, '')
  assert.equal(other.plays, 0)
  engine.dismiss()
  assert.equal(other.src, '')
  assert.equal(engine.getSnapshot().queue, null)
})

test('imports preserve local conflicts, require confirmed replacement, and cannot restore follow or autoplay', () => {
  const { engine, media, chapter, catalog } = setup()
  engine.startQueue(chapter, 'en')
  media.metadata()
  engine.seek(12.12)
  engine.pause()
  const local = engine.getSnapshot().data
  const imported = { ...local, positions: [{ ...local.positions[0], time: 45 }] }
  const merged = mergeListeningData(local, imported, catalog)
  assert.ok(merged.ok)
  assert.equal(merged.value.positions[0].time, 12.12)
  assert.equal(replaceListeningData(imported, catalog, false).ok, false)
  assert.ok(replaceListeningData(imported, catalog, true).ok)
  const baseline = JSON.stringify(local)
  assert.equal(engine.replaceData(imported, { mode: 'replace', confirmed: true, baseline: 'stale' }).ok, false)
  const result = engine.replaceData(imported, { mode: 'replace', confirmed: true, baseline })
  assert.ok(result.ok)
  media.metadata()
  assert.equal(media.currentTime, 45)
  assert.equal(engine.getSnapshot().playing, false)
  assert.equal(engine.getSnapshot().follow, false)
})

test('engine blocks corrupt and concurrently changed storage until explicit recovery', () => {
  const { engine, media, chapter, storage, rows, manifest } = setup()
  engine.startQueue(chapter, 'en')
  media.metadata()
  storage.values.set(listeningKey, 'broken')
  engine.checkStorage()
  assert.equal(engine.getSnapshot().storageIssue?.code, 'changed-storage')
  assert.equal(media.paused, true)
  engine.seek(5)
  assert.equal(storage.values.get(listeningKey), 'broken')
  engine.reload()
  assert.equal(engine.getSnapshot().storageIssue?.code, 'invalid-storage')
  const other = createListeningEngine({ rows, manifest, storage: () => storage })
  other.startQueue(chapter, 'en')
  assert.equal(storage.values.get(listeningKey), 'broken')
  assert.equal(other.replaceData(emptyListening(), { mode: 'merge', confirmed: true }).ok, false)
  assert.ok(other.replaceData(emptyListening(), { mode: 'replace', confirmed: true }).ok)
  assert.equal(other.getSnapshot().storageIssue, null)
})

test('engine advances when native media emits its EOF pause before ended', () => {
  const { engine, media, chapter } = setup()
  engine.startQueue(chapter, 'en')
  media.metadata()
  media.currentTime = media.duration
  media.pause()
  media.end()
  assert.equal(engine.getSnapshot().currentNarration?.id, 'second')
  assert.equal(media.plays, 2)
})

test('engine ignores abort from unloaded old resources and surfaces current-operation abort rejection', async () => {
  const { engine, media, chapter } = setup()
  engine.startQueue(chapter, 'en')
  media.dispatchEvent(new Event('abort'))
  assert.equal(engine.getSnapshot().error, null)
  media.pending = Promise.reject(new DOMException('Current abort', 'AbortError'))
  engine.play()
  await Promise.resolve()
  assert.equal(engine.getSnapshot().error?.code, 'playback-aborted')
})

test('engine row updates do not reset live media state and rejects unavailable manifests', () => {
  const { engine, media, chapter, rows, storage } = setup()
  engine.startQueue(chapter, 'en')
  media.metadata()
  engine.seek(31.12)
  engine.setRows([...rows])
  assert.equal(engine.getSnapshot().currentTime, 31.12)
  assert.equal(engine.getSnapshot().duration, 90)
  const invalid = createListeningEngine({ rows, manifest: { version: 1, tracks: [{ asset: 'https://evil.invalid/x' }] }, storage: () => storage })
  assert.equal(invalid.startQueue(chapter, 'en').ok, false)
  assert.equal(invalid.getSnapshot().error?.code, 'invalid-metadata')
})

test('engine ignores queued old pause and ended events after an explicit track replacement', () => {
  const { engine, media, chapter } = setup()
  engine.startQueue(chapter, 'en')
  media.metadata()
  engine.startEntry('second', 'en')
  media.dispatchEvent(new Event('pause'))
  assert.equal(engine.getSnapshot().playing, true)
  media.dispatchEvent(new Event('ended'))
  assert.equal(engine.getSnapshot().ended, false)
  assert.equal(engine.getSnapshot().currentNarration?.id, 'second')
})

test('engine resumes the same saved asset across canonical aliases without mixing languages', () => {
  const { engine, media } = setup()
  engine.startEntry('first', 'ar')
  media.metadata()
  engine.seek(27.25)
  engine.startEntry('second', 'ar')
  media.metadata()
  assert.equal(media.currentTime, 27.25)
  engine.seek(32.5)
  engine.startEntry('first', 'ar')
  media.metadata()
  assert.equal(media.currentTime, 32.5)
  engine.setLanguage('en')
  media.metadata()
  assert.equal(media.currentTime, 0)
})

test('imports preserve the latest local shared-asset cursor when an imported alias differs', () => {
  const { engine, media, catalog } = setup()
  engine.startEntry('first', 'ar')
  media.metadata()
  engine.seek(10)
  engine.pause()
  const local = engine.getSnapshot().data
  const imported = { ...local, positions: [{ ...local.positions[0], entryId: 'second', time: 70 }] }
  const merged = mergeListeningData(local, imported, catalog)
  assert.ok(merged.ok)
  assert.ok(engine.replaceData(merged.value, { mode: 'replace', confirmed: true }).ok)
  engine.startEntry('second', 'ar')
  media.metadata()
  assert.equal(media.currentTime, 10)
})

test('engine surfaces blocking store write conflicts without leaving playback running', () => {
  const { engine, media, chapter, storage } = setup()
  engine.startQueue(chapter, 'en')
  media.metadata()
  storage.values.set(listeningKey, JSON.stringify(emptyListening()))
  engine.seek(10)
  assert.equal(engine.getSnapshot().storageIssue?.code, 'changed-storage')
  assert.equal(engine.getSnapshot().playing, false)
  assert.equal(media.paused, true)
})

test('engine keeps the in-memory checkpoint current when persistence has failed', () => {
  const { engine, media, chapter, storage } = setup()
  engine.startQueue(chapter, 'en')
  media.metadata()
  storage.failure = 'quota'
  engine.seek(10)
  assert.equal(engine.getSnapshot().storageIssue?.code, 'quota')
  media.currentTime = 14.125
  engine.checkpoint()
  assert.equal(engine.getSnapshot().data.positions[0].time, 14.125)
  assert.equal(engine.getSnapshot().currentTime, 14.125)
  assert.equal(engine.exportData().ok, true)
})

test('engine exposes metadata restore failures rather than pretending to have resumed precisely', () => {
  const { engine, media, chapter } = setup()
  engine.startQueue(chapter, 'en')
  Object.defineProperty(media, 'currentTime', { get: () => 0, set: () => { throw new DOMException('Not seekable', 'InvalidStateError') } })
  media.metadata()
  assert.equal(engine.getSnapshot().error?.code, 'asset-error')
  assert.equal(engine.getSnapshot().playing, false)
})

test('engine avoids notifying React when a caller supplies a new array of unchanged canonical rows', () => {
  const { engine, rows } = setup()
  let updates = 0
  const unsubscribe = engine.subscribe(() => { updates++ })
  engine.setRows([...rows])
  assert.equal(updates, 0)
  unsubscribe()
})
