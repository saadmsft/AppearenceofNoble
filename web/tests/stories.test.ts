import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import reportManifest from '../src/data/audio-manifest.json' with { type: 'json' }
import rawManifest from '../src/data/story-audio-manifest.json' with { type: 'json' }
import { storyEpisodes, storiesByShelf } from '../src/lib/stories.ts'
import { isStoryEpisode, spokenStoryText, storyAudioManifestSchema } from '../src/lib/story-audio.ts'
import { narrations } from '../src/lib/library.ts'
import { isEstablished, shelves } from '../src/lib/schema.ts'
import { buildListeningQueue, createListeningCatalog, createListeningEngine } from '../src/lib/listening.ts'
import { createReadingStore } from '../src/lib/reading.ts'
import { normalizeSearch } from '../src/lib/search.ts'
import { parseRoute, routeUrl } from '../src/lib/route.ts'
import { validateMp3 } from '../scripts/audio/core.ts'

const manifest = storyAudioManifestSchema.parse(rawManifest)
const rows = [...narrations, ...storyEpisodes]
const catalog = createListeningCatalog(rows, reportManifest, manifest)
const sha = (text: string | Uint8Array) => createHash('sha256').update(text).digest('hex')
const normalized = (text: string) => normalizeSearch(text).replaceAll(' ', '')

test('all thirty-six editorial chapters have bilingual scripts and established source references', () => {
  assert.equal(storyEpisodes.length, 36)
  assert.deepEqual(shelves.map((shelf) => storiesByShelf(shelf).length), [16, 8, 12])
  assert.equal(new Set(storyEpisodes.map((episode) => episode.id)).size, 36)
  for (const episode of storyEpisodes) {
    assert.ok(isStoryEpisode(episode))
    assert.ok(!narrations.some((row) => row.id === episode.id))
    assert.ok(episode.text.en.length > 150)
    assert.match(episode.text.ur, /[\u0600-\u06ff]/)
    for (const id of episode.sourceIds) {
      const source = narrations.find((row) => row.id === id)
      assert.ok(source && isEstablished(source), id)
    }
  }
})

test('all seventy-two story recordings retain scripts, actual transcripts and verified MP3 assets', () => {
  assert.equal(manifest.tracks.length, 72)
  for (const episode of storyEpisodes) {
    for (const language of ['en', 'ur'] as const) {
      const track = manifest.tracks.find((item) => item.entryId === episode.id && item.language === language)
      assert.ok(track)
      assert.equal(track.kind, 'guided-story')
      assert.equal(track.scriptHash, sha(spokenStoryText(episode.text[language])))
      assert.equal(track.transcriptHash, sha(track.transcript))
      assert.equal(normalized(track.transcript), normalized(spokenStoryText(episode.text[language])))
      const bytes = readFileSync(new URL(`../public/${track.asset}`, import.meta.url))
      assert.equal(bytes.length, track.byteLength)
      assert.equal(sha(bytes), track.sha256)
      assert.equal(validateMp3(bytes, 128), track.durationSeconds)
      assert.throws(() => validateMp3(bytes), /invalid-mp3-frame/, 'legacy report validation stays strict')
    }
  }
})

test('the playback catalog distinguishes editorial stories from report records', () => {
  const values = new Map<string, string>()
  const engine = createListeningEngine({
    rows, manifest: reportManifest, storyManifest: manifest,
    storage: () => ({ getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value) } }),
  })
  const episodes = storiesByShelf('life')
  const input = { shelf: 'life' as const, topic: 'all' as const, title: { en: 'Life story', ur: 'سیرت کا بیانیہ' }, entryIds: episodes.map((episode) => episode.id) }
  assert.equal(engine.startQueue(input, 'ur', episodes[3].id).ok, true)
  assert.equal(engine.getSnapshot().position, 3)
  assert.equal(engine.getSnapshot().currentNarration, null)
  assert.equal(engine.getSnapshot().currentStory?.id, episodes[3].id)
  assert.equal(engine.getNarration(episodes[3].id), null)
  assert.equal(buildListeningQueue(catalog, input, 'ar').ok, false)
  assert.equal(buildListeningQueue(catalog, { ...input, entryIds: [episodes[0].id, narrations[0].id] }, 'en').ok, false)
  const reading = createReadingStore(() => ({
    getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value) },
  }), new Set(narrations.map((row) => row.id)), engine)
  const exported = reading.exportBackup([])
  assert.equal(exported.ok, true)
  if (exported.ok) {
    const backup = JSON.parse(exported.value)
    assert.equal(backup.version, 2)
    assert.equal(backup.listening.queue.currentEntryId, episodes[3].id)
    assert.deepEqual(backup.reading.entries, {})
    assert.equal(reading.prepareImport(exported.value, []).ok, true)
  }
})

test('listen-only routes preserve collection, chapter and language without changing old views', () => {
  const url = new URL('https://example.com/AppearenceofNoble/?view=listen&shelf=life&topic=life-hijrah&lang=ur')
  const route = parseRoute(url)
  assert.equal(route.view, 'listen')
  assert.equal(route.shelf, 'life')
  assert.deepEqual(parseRoute(routeUrl(url, route)), route)
  assert.equal(parseRoute(new URL('https://example.com/?view=journey')).view, 'journey')
})
