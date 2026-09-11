import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, mkdir, readFile, realpath, rm, stat, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import {
  audioManifestSchema, audioRenderingProfile, audioVoices, resetAudio, resolveAudioAsset,
} from '../src/lib/audio.ts'
import type { AudioManifest, AudioTrack } from '../src/lib/audio.ts'
import {
  AudioToolError, billableCharacters, cacheKey, capMicros, emptyLedger, escapeXml, hardAttemptLimit,
  ledgerSchema, mergeManifest, planTracks, reserveAttempt, sha256, spokenTranscript, spentMicros, ssml,
  unicodeCharacters, validateMp3,
} from '../scripts/audio/core.ts'
import type { AudioEntry, Ledger, PlannedTrack } from '../scripts/audio/core.ts'
import { cachedTracks, describePlan, generate } from '../scripts/audio/pipeline.ts'
import { requestAudio, speechEndpoint } from '../scripts/audio/provider.ts'
import {
  acquireLock, atomicWrite, jsonBytes, loadEntries, privateLedgerPath, readOptional,
} from '../scripts/audio/storage.ts'
import type { AudioStorage } from '../scripts/audio/storage.ts'

const entry: AudioEntry = {
  id: 'test-report', arabicFull: 'حدثنا الراوي قال رسول الله ﷺ. قال المصنف.',
  summary: { en: 'The Prophet ﷺ was kind.', ur: 'نبی کریم ﷺ مہربان تھے۔' },
}
const plans = planTracks([entry])
const config = { key: '0'.repeat(32), region: 'eastus' }
const blank: AudioManifest = { version: 1, tracks: [] }

// Artificial MPEG frame fixture, not synthesized speech or a playable narration.
function mp3Fixture(): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(288)
  bytes.set([0xFF, 0xF3, 0x64, 0xC0], 0)
  bytes.set([0xFF, 0xF3, 0x64, 0xC0], 144)
  return bytes
}

function completed(track = plans[0]): AudioTrack {
  const bytes = mp3Fixture()
  return { ...track, byteLength: bytes.length, sha256: sha256(bytes), durationSeconds: validateMp3(bytes) }
}

class MemoryStorage implements AudioStorage {
  audio = new Map<string, Uint8Array>()
  receipts = new Map<string, AudioTrack>()
  manifest: AudioManifest = blank
  ledger: Ledger = emptyLedger()
  events: string[] = []
  async readAudio(key: string) { return this.audio.get(key) ?? null }
  async readReceipt(key: string) { return this.receipts.get(key) ?? null }
  async writeAudio(key: string, bytes: Uint8Array) { this.events.push('audio'); this.audio.set(key, bytes) }
  async writeReceipt(track: AudioTrack) { this.events.push('receipt'); this.receipts.set(track.cacheKey, track) }
  async writeManifest(manifest: AudioManifest) { this.events.push('manifest'); this.manifest = manifest }
  async writeLedger(ledger: Ledger) { this.events.push('reserve'); this.ledger = ledger }
}

const noSleep = async () => {}
const successFetch: typeof fetch = async () => new Response(mp3Fixture(), { headers: { 'content-type': 'audio/mpeg' } })

function generateOptions(storage: MemoryStorage, tracks: PlannedTrack[] = [plans[0]]) {
  return {
    storage, tracks, manifest: blank, cached: new Map<string, AudioTrack>(), ledger: storage.ledger,
    mode: 'bulk' as const, resourceApproved: true, samplesApproved: true, bulkApproved: true,
    config, sleep: noSleep, fetcher: successFetch,
  }
}

test('Unicode billing counts codepoints, not UTF-16 units, and conservatively handles SSML entities', () => {
  assert.equal(unicodeCharacters('A😀 بَ\n'), 6)
  assert.equal(billableCharacters('A😀 بَ\n'), 6)
  assert.equal(billableCharacters('漢'), 2)
  const track = planTracks([{ ...entry, summary: { ...entry.summary, en: 'A & <B>' } }])[1]
  assert.equal(track.transcriptCharacters, 7)
  assert.equal(track.billableCharacters, billableCharacters('A &amp; &lt;B&gt;'))
  assert.match(ssml(track), /<voice name="en-GB-RyanNeural">A &amp; &lt;B&gt;<\/voice>/)
  assert.equal((ssml(track).match(/<[^>]+>/g) ?? []).length, 4, 'only unbilled speak/voice wrappers')
  assert.equal(escapeXml(`"'<> &`), '&quot;&apos;&lt;&gt; &amp;')
})

test('honorifics expand in the spoken language without removing source text or normalizing marks', () => {
  assert.equal(spokenTranscript('X ﷺ.', 'en'), 'X may Allah bless him and grant him peace.')
  assert.equal(spokenTranscript('ﷺ', 'ur'), 'صلی اللہ علیہ وسلم')
  assert.equal(spokenTranscript('ﷺ', 'ar'), 'صلى الله عليه وسلم')
  assert.equal(plans[0].transcript, entry.arabicFull.replace('ﷺ', 'صلى الله عليه وسلم'))
  assert.equal(spokenTranscript(' e\u0301 \n', 'en'), ' e\u0301 \n')
  assert.throws(() => spokenTranscript('PRIVATE NOTE: do not publish', 'en'), /private-transcript/)
  assert.throws(() => spokenTranscript('x\u0000', 'en'), /invalid-xml/)
  assert.throws(() => spokenTranscript('\uD800', 'en'), /invalid-xml/)
  assert.throws(() => spokenTranscript('a'.repeat(4501), 'en'), /too-long/)
})

test('cache identities include exact transcript, stock voice, format and rendering configuration', () => {
  const first = cacheKey('text', audioVoices.en)
  assert.equal(first, cacheKey('text', audioVoices.en))
  assert.notEqual(first, cacheKey('text ', audioVoices.en))
  assert.notEqual(first, cacheKey('text', audioVoices.ur))
  assert.notEqual(first, cacheKey('text', audioVoices.en, 'another-format'))
  assert.notEqual(first, cacheKey('text', audioVoices.en, undefined, `${audioRenderingProfile}-changed`))
  const duplicate = planTracks([entry, { ...entry, id: 'another-entry' }])
  assert.equal(duplicate[0].cacheKey, duplicate[3].cacheKey)
  assert.throws(() => planTracks([entry, entry]), /duplicate-content/)
})

test('private note fields are excluded and every content JSON is discovered, including new character files', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'noble-audio-content-'))
  try {
    for (const name of ['appearance', 'character-virtues', 'character-relationships']) {
      await atomicWrite(join(folder, `${name}.json`), jsonBytes([{ ...entry, id: name, privateNote: 'PRIVATE NOTE never read aloud' }]))
    }
    const rows = await loadEntries(folder)
    assert.equal(rows.length, 3)
    assert.equal(planTracks(rows).length, 9)
    assert.ok(!JSON.stringify(rows).includes('PRIVATE NOTE'))
    await atomicWrite(join(folder, 'invalid.json'), jsonBytes({ not: 'an array' }))
    await assert.rejects(loadEntries(folder), /invalid-file-schema/)
  } finally {
    await rm(folder, { recursive: true })
  }
})

test('manifest rejects nonstatic paths, swapped voices, unknown fields and duplicate mappings', () => {
  const track = completed()
  assert.ok(audioManifestSchema.safeParse({ version: 1, tracks: [track] }).success)
  for (const asset of ['../audio/x.mp3', '/audio/x.mp3', 'https://evil.test/x.mp3', '//evil.test/x.mp3',
    `audio/${'a'.repeat(64)}.mp3?key=secret`, `audio/%2e%2e/x.mp3`, 'data:audio/mpeg;base64,AA']) {
    assert.equal(resolveAudioAsset(asset), null)
    assert.equal(audioManifestSchema.safeParse({ version: 1, tracks: [{ ...track, asset }] }).success, false)
  }
  assert.equal(resolveAudioAsset(track.asset), `https://saadmsft.github.io/AppearenceofNoble/${track.asset}`)
  assert.equal(audioManifestSchema.safeParse({ version: 1, tracks: [track, track] }).success, false)
  assert.equal(audioManifestSchema.safeParse({ version: 1, tracks: [{ ...track, voice: audioVoices.en }] }).success, false)
  assert.equal(audioManifestSchema.safeParse({ version: 1, tracks: [{ ...track, key: 'private' }] }).success, false)
  assert.equal(audioManifestSchema.safeParse({ version: 1, tracks: [track, { ...track, entryId: 'other', sha256: 'b'.repeat(64) }] }).success, false)
})

test('partial manifest merge preserves unrelated entries and updates each entry/language only once', () => {
  const ar = completed()
  const en = completed(plans[1])
  const merged = mergeManifest({ version: 1, tracks: [ar] }, [en, en, { ...ar, entryId: 'other' }])
  assert.equal(merged.tracks.length, 3)
  assert.deepEqual(mergeManifest(merged, [ar]), merged)
})

test('ledger reserves integer microdollars and never crosses the shared cap or refunds retries', () => {
  let ledger = emptyLedger()
  const expensive = { ...plans[0], billableCharacters: 333_333 }
  ledger = reserveAttempt(ledger, expensive, 'sample', 3)
  ledger = reserveAttempt(ledger, expensive, 'bulk', 3)
  assert.equal(spentMicros(ledger), 9_999_990)
  assert.throws(() => reserveAttempt(ledger, { ...plans[0], billableCharacters: 1 }, 'bulk', 3), /budget-cap/)
  assert.equal(ledger.capMicros, capMicros)
  assert.equal(ledgerSchema.safeParse({ ...ledger, capMicros: capMicros + 1 }).success, false)
  for (const max of [0, 4, 1.5]) assert.throws(() => reserveAttempt(emptyLedger(), plans[0], 'sample', max), /attempt-limit/)
})

test('sample and bulk require their own gates before reservations, and sample mode cannot disguise bulk', async () => {
  const store = new MemoryStorage()
  await assert.rejects(generate({ ...generateOptions(store), resourceApproved: false }), /resource-approval/)
  await assert.rejects(generate({ ...generateOptions(store), samplesApproved: false }), /samples-and-bulk/)
  await assert.rejects(generate({ ...generateOptions(store), bulkApproved: false }), /samples-and-bulk/)
  await assert.rejects(generate({ ...generateOptions(store), mode: 'sample' }), /three-short-clips/)
  assert.deepEqual(store.events, [])
})

test('every request is preceded by a durable reservation, including bounded 429 and 5xx retries', async () => {
  const store = new MemoryStorage()
  let attempts = 0
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(store.ledger.reservations.length, attempts + 1)
    assert.equal(url, speechEndpoint('eastus'))
    assert.equal(init?.redirect, 'error')
    assert.equal(new Headers(init?.headers).get('X-Microsoft-OutputFormat'), 'audio-24khz-48kbitrate-mono-mp3')
    assert.equal(init?.body, ssml(plans[0]))
    attempts++
    return attempts < 3 ? new Response('DO NOT PRINT provider secrets', { status: attempts === 1 ? 429 : 503 }) : successFetch(url, init)
  }
  await generate({ ...generateOptions(store), fetcher })
  assert.equal(attempts, hardAttemptLimit)
  assert.equal(store.manifest.tracks.length, 1)
  assert.deepEqual(store.events, ['reserve', 'reserve', 'reserve', 'audio', 'receipt', 'manifest'])
  assert.equal(spentMicros(store.ledger), plans[0].billableCharacters * 15 * 3)
})

test('attempt limits persist across resumptions and retries never overspend', async () => {
  const store = new MemoryStorage()
  let attempts = 0
  const fetcher: typeof fetch = async () => { attempts++; return new Response(null, { status: 429 }) }
  await assert.rejects(generate({ ...generateOptions(store), fetcher }), /speech-http-429/)
  assert.equal(attempts, 3)
  await assert.rejects(generate({ ...generateOptions(store), fetcher }), /attempt-limit-reached/)
  assert.equal(attempts, 3)
  assert.equal(store.manifest.tracks.length, 0)

  const tight = new MemoryStorage()
  tight.ledger = reserveAttempt(emptyLedger(), { ...plans[1], billableCharacters: 666_660 }, 'sample', 3)
  await assert.rejects(generate({ ...generateOptions(tight), fetcher }), /budget-cap/)
  assert.equal(attempts, 3)
})

test('storage failure before reservation completion prevents the request', async () => {
  const store = new MemoryStorage()
  store.writeLedger = async () => { throw new AudioToolError('disk-full') }
  let calls = 0
  await assert.rejects(generate({
    ...generateOptions(store), fetcher: async () => { calls++; return successFetch('unused') },
  }), /disk-full/)
  assert.equal(calls, 0)
  assert.equal(store.manifest.tracks.length, 0)
})

test('identical reports reuse one verified MP3 and completed runs are idempotent', async () => {
  const store = new MemoryStorage()
  const tracks = planTracks([entry, { ...entry, id: 'same-report' }])
  let calls = 0
  const fetcher: typeof fetch = async () => { calls++; return successFetch('unused') }
  const first = await generate({ ...generateOptions(store, tracks), fetcher })
  assert.equal(calls, 3)
  assert.equal(first.tracks.length, 6)
  const cache = await cachedTracks(tracks, first, store)
  const plan = describePlan(tracks, cache, store.ledger)
  assert.equal(plan.uniqueClips, 3)
  assert.equal(plan.newClips, 0)
  assert.equal(plan.expectedNewCostUsd, 0)
  assert.equal(plan.cachedClips, 3)
  await generate({ ...generateOptions(store, tracks), manifest: first, cached: cache, fetcher })
  assert.equal(calls, 3)
})

test('three short samples and later bulk share one ledger and cache the identical Arabic primary report', async () => {
  const store = new MemoryStorage()
  const first = await generate({ ...generateOptions(store, plans), mode: 'sample' })
  assert.equal(first.tracks.length, 3)
  const all = planTracks([entry, {
    ...entry, id: 'additional-report',
    summary: { en: 'A different editorial summary.', ur: 'ایک مختلف ادارتی خلاصہ۔' },
  }])
  const cached = await cachedTracks(all, first, store)
  const plan = describePlan(all, cached, store.ledger)
  assert.equal(plan.mappings, 6)
  assert.equal(plan.uniqueClips, 5)
  assert.equal(plan.newClips, 2)
  await generate({ ...generateOptions(store, all), manifest: first, cached })
  assert.equal(store.ledger.reservations.filter((item) => item.mode === 'sample').length, 3)
  assert.equal(store.ledger.reservations.filter((item) => item.mode === 'bulk').length, 2)
  assert.equal(store.manifest.tracks.length, 6)
})

test('receipt recovers a completed asset after a manifest write failure, without paying again', async () => {
  const store = new MemoryStorage()
  store.writeManifest = async () => { throw new AudioToolError('manifest-write-failed') }
  await assert.rejects(generate(generateOptions(store)), /manifest-write-failed/)
  assert.equal(store.receipts.size, 1)
  assert.equal(store.manifest.tracks.length, 0)
  const cached = await cachedTracks([plans[0]], blank, store)
  let calls = 0
  store.writeManifest = async (manifest) => { store.manifest = manifest }
  await generate({
    ...generateOptions(store), cached, fetcher: async () => { calls++; throw new Error('must not fetch') },
  })
  assert.equal(calls, 0)
  assert.equal(store.manifest.tracks.length, 1)
})

test('cache reuse checks digest, byte length, source metadata, missing files and orphan outputs', async () => {
  const store = new MemoryStorage()
  const track = completed()
  await store.writeAudio(track.cacheKey, mp3Fixture())
  await assert.rejects(cachedTracks([plans[0]], blank, store), /orphan-mp3/)
  await store.writeReceipt(track)
  assert.equal((await cachedTracks([plans[0]], blank, store)).size, 1)
  await store.writeAudio(track.cacheKey, new Uint8Array(288))
  await assert.rejects(cachedTracks([plans[0]], blank, store), /integrity/)
  await store.writeAudio(track.cacheKey, mp3Fixture().slice(0, 280))
  await assert.rejects(cachedTracks([plans[0]], blank, store), /integrity/)
  store.audio.clear()
  await assert.rejects(cachedTracks([plans[0]], blank, store), /cached-mp3-missing/)
  await store.writeAudio(track.cacheKey, mp3Fixture())
  await store.writeReceipt({ ...track, transcript: `${track.transcript}changed` })
  await assert.rejects(cachedTracks([plans[0]], blank, store), /invalid-cache-metadata/)
})

test('MP3 validation rejects HTML, truncated frames, ID3-only files and wrong sample rates', () => {
  assert.equal(validateMp3(mp3Fixture()), 0.048)
  assert.throws(() => validateMp3(Buffer.from('<html>not audio</html>')), /invalid-mp3/)
  assert.throws(() => validateMp3(new Uint8Array(288)), /invalid-mp3/)
  assert.throws(() => validateMp3(mp3Fixture().slice(0, 287)), /invalid-mp3/)
  const wrongRate = mp3Fixture()
  wrongRate[2] = 0x60
  assert.throws(() => validateMp3(wrongRate), /invalid-mp3-frame/)
  const id3 = new Uint8Array(288)
  id3.set([73, 68, 51, 4, 0, 0, 0, 0, 2, 22])
  assert.throws(() => validateMp3(id3), /invalid-or-truncated/)
})

test('endpoint is a regional official REST URL, never the Global billing label or an arbitrary host', () => {
  assert.equal(speechEndpoint('eastus'), 'https://eastus.tts.speech.microsoft.com/cognitiveservices/v1')
  for (const region of ['Global', 'global', 'eastus.evil.test', '', '../eastus']) {
    assert.throws(() => speechEndpoint(region), /unsupported-speech-region/)
  }
  for (const endpoint of ['https://eastus.tts.speech.microsoft.com.evil.test/cognitiveservices/v1',
    'http://eastus.tts.speech.microsoft.com/cognitiveservices/v1',
    'https://secret@eastus.tts.speech.microsoft.com/cognitiveservices/v1',
    'https://eastus.tts.speech.microsoft.com:443/cognitiveservices/v1',
    'https://eastus.tts.speech.microsoft.com/cognitiveservices/v1?key=private']) {
    assert.throws(() => speechEndpoint('eastus', endpoint), /unapproved-speech-endpoint/)
  }
})

test('provider failures and timeout never claim successful assets; reservations remain', async () => {
  const cases: { fetcher: typeof fetch; expected: RegExp }[] = [
    { fetcher: async () => new Response('secret response', { status: 401 }), expected: /speech-http-401/ },
    { fetcher: async () => new Response('secret response', { status: 302 }), expected: /speech-http-302/ },
    { fetcher: async () => new Response('not mp3', { headers: { 'content-type': 'text/html' } }), expected: /unexpected-content-type/ },
    { fetcher: async () => new Response('bad audio', { headers: { 'content-type': 'audio/mpeg' } }), expected: /invalid-mp3/ },
    { fetcher: async () => new Response(mp3Fixture(), { headers: { 'content-type': 'audio/mpeg', 'content-length': '300' } }), expected: /content-length-mismatch/ },
    { fetcher: async () => { throw new TypeError('credential must not appear') }, expected: /transport-failure/ },
    { fetcher: async () => new Promise<Response>(() => {}), expected: /timeout/ },
    { fetcher: async () => new Response(new ReadableStream({ start() {} }), { headers: { 'content-type': 'audio/mpeg' } }), expected: /timeout/ },
  ]
  for (const scenario of cases) {
    const store = new MemoryStorage()
    await assert.rejects(generate({ ...generateOptions(store), fetcher: scenario.fetcher, timeoutMs: 10 }), scenario.expected)
    assert.equal(store.ledger.reservations.length, 1)
    assert.deepEqual(store.events, ['reserve'])
    assert.equal(store.manifest.tracks.length, 0)
  }
})

test('long Retry-After stops instead of ignoring provider throttling', async () => {
  const store = new MemoryStorage()
  await assert.rejects(generate({
    ...generateOptions(store),
    fetcher: async () => new Response(null, { status: 429, headers: { 'retry-after': '120' } }),
  }), /retry-after-too-long/)
  assert.equal(store.ledger.reservations.length, 1)
})

test('invalid endpoint configuration never reaches fetch', async () => {
  let calls = 0
  await assert.rejects(requestAudio(plans[0], { ...config, endpoint: 'https://evil.test' }, async () => {
    calls++
    throw new Error('must not fetch')
  }), /unapproved-speech-endpoint/)
  assert.equal(calls, 0)
})

test('private ledger, atomic writes and exclusive locks fail closed', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'noble-audio-ledger-'))
  try {
    const repository = join(folder, 'repo')
    await mkdir(repository)
    const path = join(folder, 'ledger.json')
    await atomicWrite(path, jsonBytes(emptyLedger()), 0o600)
    assert.equal((await stat(path)).mode & 0o777, 0o600)
    assert.equal(await privateLedgerPath(path, repository), await realpath(path))
    await assert.rejects(privateLedgerPath(join(repository, 'ledger.json'), repository), /outside-repository/)
    await assert.rejects(privateLedgerPath('relative.json', repository), /outside-repository/)
    await symlink(path, join(folder, 'link.json'))
    await assert.rejects(privateLedgerPath(join(folder, 'link.json'), repository), /unsafe-file-path/)
    const unlock = await acquireLock(`${path}.lock`)
    await assert.rejects(acquireLock(`${path}.lock`), /run-locked/)
    await unlock()
    assert.equal(await readOptional(`${path}.lock`), null)
    assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), emptyLedger())
  } finally {
    await rm(folder, { recursive: true })
  }
})

test('player reset pauses and unloads the old resource; all available source URLs are static', () => {
  const calls: string[] = []
  resetAudio({
    currentTime: 5,
    pause: () => calls.push('pause'),
    removeAttribute: (name: string) => calls.push(`remove:${name}`),
    load: () => calls.push('load'),
  })
  assert.deepEqual(calls, ['pause', 'remove:src', 'load'])
})

test('CLI dry-run reports actual coverage offline and CI paid modes are forbidden', async () => {
  const cli = new URL('../scripts/audio/cli.ts', import.meta.url)
  const run = (args: string[]) => spawnSync(process.execPath, [cli.pathname, ...args], {
    encoding: 'utf8', env: { CI: '1' },
  })
  const dry = run(['dry-run', '--scope', 'samples'])
  assert.equal(dry.status, 0, dry.stderr)
  const result = JSON.parse(dry.stdout)
  assert.equal(result.mappings, 3)
  assert.equal(result.uniqueClips, 3)
  assert.equal(result.capBeforeTaxUsd, 10)
  const coverage = run(['dry-run', '--check-coverage'])
  const coveragePlan = JSON.parse(coverage.stdout)
  if (coveragePlan.newClips > 0 || coveragePlan.missingManifestMappings > 0) {
    assert.equal(coverage.status, 1)
    assert.match(coverage.stderr, /coverage-incomplete/)
  } else {
    assert.equal(coverage.status, 0, coverage.stderr)
  }
  for (const mode of ['sample', 'bulk']) {
    const paid = run([mode, '--resource-approved', '--bulk-approved', '--samples-approved'])
    assert.equal(paid.status, 1)
    assert.match(paid.stderr, /ci-generation-forbidden/)
  }
})
