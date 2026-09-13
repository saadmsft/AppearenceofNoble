import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createMonthlyCatalog, monthlyBook, monthlyCatalog } from '../src/lib/monthly-series.ts'
import { audiobookPosition } from '../src/lib/audiobooks.ts'
import { buildListeningQueue, createListeningCatalog, createListeningEngine, validateListeningData } from '../src/lib/listening.ts'
import { isMonthlyChapter, spokenStoryText, storyAudioManifestSchema } from '../src/lib/story-audio.ts'
import { parseRoute, routeUrl } from '../src/lib/route.ts'
import { normalizeSearch } from '../src/lib/search.ts'
import { narrations } from '../src/lib/library.ts'
import { storyEpisodes } from '../src/lib/stories.ts'
import { createReadingStore } from '../src/lib/reading.ts'
import { validateMp3 } from '../scripts/audio/core.ts'
import { monthlyFixture } from './fixtures/monthly-fixture.ts'
import { ListeningFakeMedia, ListeningMemoryStorage } from './fixtures/listening-fixture.ts'

const empty = { version: 1, tracks: [] }
test('monthly publication is explicit, complete, source-linked and isolated from drafts', () => {
  const { series, audio } = monthlyFixture()
  const valid = createMonthlyCatalog(series, audio)
  assert.equal(monthlyBook(valid.episodes[0], 'en', valid).duration, 900)
  assert.equal(monthlyBook(valid.episodes[0], 'ur', valid).duration, 900)
  assert.deepEqual(createMonthlyCatalog({ version: 1, episodes: [] }, empty).episodes, [])
  for (const status of ['draft', 'approved', 'scheduled']) {
    assert.throws(() => createMonthlyCatalog({ ...series, episodes: [{ ...series.episodes[0], status }] }, audio))
  }
  assert.throws(() => createMonthlyCatalog(series, empty), /requires English and Urdu/)
  assert.throws(() => createMonthlyCatalog({ version: 1, episodes: [] }, audio), /orphan/)
  assert.throws(() => createMonthlyCatalog({ ...series, episodes: [...series.episodes, ...series.episodes] }, audio), /Duplicate/)
  const badSource = structuredClone(series)
  badSource.episodes[0].chapters[0].sourceIds = ['missing']
  assert.throws(() => createMonthlyCatalog(badSource, audio))
  const badParent = structuredClone(series)
  badParent.episodes[0].chapters[0].monthlyEpisodeId = 'another'
  assert.throws(() => createMonthlyCatalog(badParent, audio))
  const badLink = structuredClone(series)
  badLink.episodes[0].sources[0].url = 'https://sunnah.com.evil.invalid/'
  assert.throws(() => createMonthlyCatalog(badLink, audio))
  assert.equal(storyAudioManifestSchema.safeParse(audio).success, false, 'existing short-story duration limit stays unchanged')
})

test('monthly chapter queues resume long positions, advance, round-trip backups and reject mixing', async () => {
  const fixture = monthlyFixture()
  const publication = createMonthlyCatalog(fixture.series, fixture.audio)
  const rows = [...narrations, ...storyEpisodes, ...publication.chapters]
  const catalog = createListeningCatalog(rows, empty, empty, publication.manifest)
  const storage = new ListeningMemoryStorage()
  const engine = createListeningEngine({ rows, manifest: empty, monthlyManifest: publication.manifest, storage: () => storage })
  const media = new ListeningFakeMedia()
  engine.bindAudio(media)
  const input = { shelf: 'life' as const, topic: 'all' as const, title: publication.episodes[0].title, entryIds: publication.chapters.map((chapter) => chapter.id) }
  assert.ok(engine.startQueue(input, 'en').ok)
  media.metadata(450)
  await Promise.resolve()
  engine.seek(420)
  engine.pause()
  assert.equal(engine.getSnapshot().currentNarration, null)
  assert.ok(isMonthlyChapter(engine.getSnapshot().currentStory!))
  assert.ok(validateListeningData(engine.getSnapshot().data, catalog).ok)
  const book = monthlyBook(publication.episodes[0], 'en', publication)
  assert.equal(audiobookPosition(book, engine.getSnapshot().data).seconds, 420)
  const reloaded = createListeningEngine({ rows, manifest: empty, monthlyManifest: publication.manifest, storage: () => storage })
  assert.equal(reloaded.getSnapshot().playing, false)
  assert.equal(audiobookPosition(book, reloaded.getSnapshot().data).hasResume, true)
  const reading = createReadingStore(() => storage, new Set(narrations.map((row) => row.id)), engine)
  const backup = reading.exportBackup([])
  assert.ok(backup.ok)
  assert.ok(reading.prepareImport(backup.value, []).ok)
  assert.equal(buildListeningQueue(catalog, input, 'ar').ok, false)
  assert.equal(buildListeningQueue(catalog, { ...input, entryIds: [input.entryIds[0], storyEpisodes[0].id] }, 'en').ok, false)
  assert.equal(buildListeningQueue(catalog, { ...input, entryIds: [input.entryIds[0], narrations[0].id] }, 'en').ok, false)
  const other = { ...publication.chapters[1], monthlyEpisodeId: 'other' }
  const mixed = createListeningCatalog([publication.chapters[0], other], empty, empty, publication.manifest)
  assert.equal(buildListeningQueue(mixed, input, 'en').ok, false)
  engine.play()
  media.end()
  assert.equal(engine.getSnapshot().currentStory?.id, input.entryIds[1])
  media.metadata(450)
  await Promise.resolve()
  media.end()
  assert.equal(audiobookPosition(book, engine.getSnapshot().data, engine.getSnapshot()).atEnd, true)
  assert.equal(audiobookPosition(book, engine.getSnapshot().data).entryId, input.entryIds[0])
  engine.dismiss()
})

test('monthly routes preserve episode and language but never leak episode state to other views', () => {
  const base = new URL('https://thenobleproject.org/?view=monthly&episode=before-birth&lang=ur')
  const route = parseRoute(base)
  assert.equal(route.view, 'monthly')
  assert.equal(route.shelf, 'all')
  assert.equal(route.episode, 'before-birth')
  assert.deepEqual(parseRoute(routeUrl(base, route)), route)
  assert.equal(routeUrl(base, { ...route, view: 'audiobooks' }).searchParams.has('episode'), false)
  assert.equal(parseRoute(new URL('https://thenobleproject.org/?view=monthly&episode=../draft')).episode, undefined)
})

test('all published monthly audio retains exact assets, scripts and measured durations', () => {
  const sha = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex')
  const normalized = (text: string) => normalizeSearch(text).replaceAll(' ', '')
  for (const chapter of monthlyCatalog.chapters) {
    assert.ok(!narrations.some((row) => row.id === chapter.id))
    assert.ok(!storyEpisodes.some((row) => row.id === chapter.id))
    for (const language of ['en', 'ur'] as const) {
      const track = monthlyCatalog.tracks.get(`${chapter.id}:${language}`)!
      assert.equal(track.scriptHash, sha(spokenStoryText(chapter.text[language])))
      assert.equal(track.transcriptHash, sha(track.transcript))
      assert.equal(normalized(track.transcript), normalized(spokenStoryText(chapter.text[language])))
      const bytes = readFileSync(new URL(`../public/${track.asset}`, import.meta.url))
      assert.equal(bytes.length, track.byteLength)
      assert.equal(sha(bytes), track.sha256)
      assert.equal(validateMp3(bytes, 128), track.durationSeconds)
    }
  }
})
