import { audioTrackSchema } from '../../src/lib/audio.ts'
import type { AudioManifest, AudioTrack } from '../../src/lib/audio.ts'
import {
  AudioToolError, attemptCount, capMicros, hardAttemptLimit, mergeManifest,
  priceMicrosPerCharacter, reserveAttempt, sha256, spentMicros, validateMp3,
} from './core.ts'
import type { Ledger, PlannedTrack } from './core.ts'
import { ProviderStatusError, requestAudio, validateSpeechConfig } from './provider.ts'
import type { SpeechConfig } from './provider.ts'
import type { AudioStorage } from './storage.ts'

export async function cachedTracks(
  tracks: PlannedTrack[], manifest: AudioManifest, storage: AudioStorage,
): Promise<Map<string, AudioTrack>> {
  const cached = new Map<string, AudioTrack>()
  for (const plan of tracks) {
    if (cached.has(plan.cacheKey)) continue
    const registered = manifest.tracks.find((track) => track.cacheKey === plan.cacheKey)
    const receipt = await storage.readReceipt(plan.cacheKey)
    const metadata = receipt ?? registered
    const bytes = await storage.readAudio(plan.cacheKey)
    if (!metadata) {
      if (bytes !== null) throw new AudioToolError('orphan-mp3-requires-manual-review')
      continue
    }
    if (bytes === null) throw new AudioToolError('cached-mp3-missing')
    const parsed = audioTrackSchema.safeParse(metadata)
    if (!parsed.success) throw new AudioToolError('invalid-cache-metadata')
    const expected = { ...plan, entryId: metadata.entryId }
    if (Object.entries(expected).some(([key, value]) => metadata[key as keyof AudioTrack] !== value)
      || (registered && Object.entries(metadata).some(([key, value]) => key !== 'entryId'
        && registered[key as keyof AudioTrack] !== value))
      || bytes.length !== metadata.byteLength || sha256(bytes) !== metadata.sha256
      || validateMp3(bytes) !== metadata.durationSeconds) {
      throw new AudioToolError('cached-mp3-integrity-failure')
    }
    cached.set(plan.cacheKey, metadata)
  }
  return cached
}

export function describePlan(tracks: PlannedTrack[], cached: Map<string, AudioTrack>, ledger?: Ledger, maxAttempts = hardAttemptLimit) {
  const unique = [...new Map(tracks.map((track) => [track.cacheKey, track])).values()]
  const pending = unique.filter((track) => !cached.has(track.cacheKey))
  const billable = pending.reduce((sum, track) => sum + track.billableCharacters, 0)
  const maximum = pending.reduce((sum, track) => sum + track.billableCharacters
    * Math.max(0, maxAttempts - (ledger ? attemptCount(ledger, track.cacheKey) : 0)), 0)
  return {
    meter: 'S1 Neural TextToSpeechCharacters', billingLabel: 'Global (not an endpoint region)',
    usdPerMillionCharacters: 15, capBeforeTaxUsd: 10,
    mappings: tracks.length, uniqueClips: unique.length,
    cachedClips: unique.length - pending.length, newClips: pending.length,
    mappedTranscriptCodepoints: tracks.reduce((sum, track) => sum + track.transcriptCharacters, 0),
    newTranscriptCodepoints: pending.reduce((sum, track) => sum + track.transcriptCharacters, 0),
    newConservativeBillableCharacters: billable,
    expectedNewCostUsd: billable * priceMicrosPerCharacter / 1_000_000,
    maximumRemainingAttemptsCostUsd: maximum * priceMicrosPerCharacter / 1_000_000,
    reservedBeforeTaxUsd: ledger ? spentMicros(ledger) / 1_000_000 : null,
    remainingBeforeTaxUsd: ledger ? (capMicros - spentMicros(ledger)) / 1_000_000 : null,
    clips: unique.map((track) => ({
      cacheKey: track.cacheKey, language: track.language, voice: track.voice,
      transcriptCodepoints: track.transcriptCharacters, billableCharacters: track.billableCharacters,
      expectedCostUsd: cached.has(track.cacheKey) ? 0 : track.billableCharacters * priceMicrosPerCharacter / 1_000_000,
      cached: cached.has(track.cacheKey),
      mappings: tracks.filter((item) => item.cacheKey === track.cacheKey).map((item) => item.entryId),
    })),
  }
}

type GenerateOptions = {
  tracks: PlannedTrack[]
  manifest: AudioManifest
  storage: AudioStorage
  ledger: Ledger
  cached: Map<string, AudioTrack>
  mode: 'sample' | 'bulk'
  resourceApproved: boolean
  samplesApproved?: boolean
  bulkApproved?: boolean
  config: SpeechConfig
  maxAttempts?: number
  timeoutMs?: number
  fetcher?: typeof fetch
  sleep?: (milliseconds: number) => Promise<void>
}

export async function generate(options: GenerateOptions): Promise<AudioManifest> {
  if (!options.resourceApproved) throw new AudioToolError('parent-resource-approval-required')
  if (options.mode === 'bulk' && (!options.samplesApproved || !options.bulkApproved)) {
    throw new AudioToolError('user-samples-and-bulk-approval-required')
  }
  if (options.mode === 'sample' && (options.tracks.length !== 3
    || new Set(options.tracks.map((track) => track.entryId)).size !== 1
    || new Set(options.tracks.map((track) => track.language)).size !== 3
    || options.tracks.some((track) => track.transcriptCharacters > 800))) {
    throw new AudioToolError('sample-mode-requires-three-short-clips-for-one-entry')
  }
  const maxAttempts = options.maxAttempts ?? hardAttemptLimit
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > hardAttemptLimit) {
    throw new AudioToolError('invalid-attempt-limit')
  }
  if (options.timeoutMs !== undefined && (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1 || options.timeoutMs > 120_000)) {
    throw new AudioToolError('invalid-request-timeout')
  }
  if (options.tracks.some((track) => !options.cached.has(track.cacheKey))) validateSpeechConfig(options.config)
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
  let ledger = options.ledger
  let manifest = options.manifest
  const cached = new Map(options.cached)
  for (const track of options.tracks) {
    let completed = cached.get(track.cacheKey)
    if (!completed) {
      let bytes: Uint8Array
      while (true) {
        const reserved = reserveAttempt(ledger, track, options.mode, maxAttempts)
        // The reservation is durable BEFORE any attempt, and is never refunded automatically.
        await options.storage.writeLedger(reserved)
        ledger = reserved
        try {
          bytes = await requestAudio(track, options.config, options.fetcher, options.timeoutMs)
          break
        } catch (error) {
          if (!(error instanceof ProviderStatusError)
            || (error.status !== 429 && (error.status < 500 || error.status > 599))
            || attemptCount(ledger, track.cacheKey) >= maxAttempts) throw error
          if (error.retryAfterMs > 60_000) throw new AudioToolError('retry-after-too-long-resume-later')
          await sleep(Math.max(error.retryAfterMs, 1_000 * 2 ** (attemptCount(ledger, track.cacheKey) - 1)))
        }
      }
      completed = audioTrackSchema.parse({
        ...track, byteLength: bytes.length, sha256: sha256(bytes), durationSeconds: validateMp3(bytes),
      })
      await options.storage.writeAudio(track.cacheKey, bytes)
      await options.storage.writeReceipt(completed)
      cached.set(track.cacheKey, completed)
      await sleep(1_000)
    }
    manifest = mergeManifest(manifest, [{ ...completed, entryId: track.entryId }])
    await options.storage.writeManifest(manifest)
  }
  return manifest
}
