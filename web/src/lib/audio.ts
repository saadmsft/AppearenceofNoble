import { z } from 'zod'

export const audioLanguages = ['ar', 'en', 'ur'] as const
export type AudioLanguage = typeof audioLanguages[number]
export const audioVoices = {
  en: 'en-GB-RyanNeural',
  ur: 'ur-PK-AsadNeural',
  ar: 'ar-SA-HamedNeural',
} as const
export const audioFormat = 'audio-24khz-48kbitrate-mono-mp3'
export const audioRenderingProfile = 'stock-neural-speak-voice-only-v1'
export const publicAudioBase = 'https://thenobleproject.org/'
export const legacyAudioBase = 'https://saadmsft.github.io/AppearenceofNoble/'

const digest = z.string().regex(/^[a-f0-9]{64}$/)
export const audioAssetSchema = z.string().regex(/^audio\/[a-f0-9]{64}\.mp3$/)
export const audioTrackSchema = z.object({
  entryId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  language: z.enum(audioLanguages),
  voice: z.enum([audioVoices.ar, audioVoices.en, audioVoices.ur]),
  kind: z.enum(['full-report', 'editorial-summary']),
  synthetic: z.literal(true),
  transcript: z.string().min(1),
  transcriptHash: digest,
  transcriptCharacters: z.number().int().positive(),
  billableCharacters: z.number().int().positive(),
  cacheKey: digest,
  format: z.literal(audioFormat),
  renderingProfile: z.literal(audioRenderingProfile),
  asset: audioAssetSchema,
  byteLength: z.number().int().positive(),
  sha256: digest,
  durationSeconds: z.number().positive().max(590),
}).strict().superRefine((track, context) => {
  if (track.voice !== audioVoices[track.language]
    || track.kind !== (track.language === 'ar' ? 'full-report' : 'editorial-summary')
    || track.asset !== `audio/${track.cacheKey}.mp3`
    || track.transcriptCharacters !== Array.from(track.transcript).length) {
    context.addIssue({ code: 'custom', message: 'Inconsistent audio track metadata' })
  }
})
export type AudioTrack = z.infer<typeof audioTrackSchema>

export const audioManifestSchema = z.object({
  version: z.literal(1),
  tracks: z.array(audioTrackSchema),
}).strict().superRefine((manifest, context) => {
  const mappings = new Set<string>()
  const assets = new Map<string, string>()
  for (const track of manifest.tracks) {
    const mapping = `${track.entryId}:${track.language}`
    const { entryId: _entryId, ...metadata } = track
    const fingerprint = JSON.stringify(metadata)
    if (mappings.has(mapping) || (assets.has(track.asset) && assets.get(track.asset) !== fingerprint)) {
      context.addIssue({ code: 'custom', message: 'Conflicting audio mappings' })
    }
    mappings.add(mapping)
    assets.set(track.asset, fingerprint)
  }
})
export type AudioManifest = z.infer<typeof audioManifestSchema>

export function resolveAudioAsset(asset: string, pageHref?: string): string | null {
  const parsed = audioAssetSchema.safeParse(asset)
  if (!parsed.success) return null
  if (pageHref) {
    const page = new URL(pageHref)
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(page.hostname)
    if (local && (page.protocol === 'http:' || page.protocol === 'https:')) {
      return new URL(parsed.data, new URL(page.pathname, page.origin)).href
    }
    if (page.origin === 'https://saadmsft.github.io' && page.pathname.startsWith('/AppearenceofNoble/')) {
      return `${legacyAudioBase}${parsed.data}`
    }
  }
  return `${publicAudioBase}${parsed.data}`
}

export function tracksForEntry(manifest: AudioManifest, entryId: string): AudioTrack[] {
  return manifest.tracks.filter((track) => track.entryId === entryId)
}

export function resetAudio(element: Pick<HTMLAudioElement, 'pause' | 'currentTime' | 'removeAttribute' | 'load'>) {
  element.pause()
  element.removeAttribute('src')
  element.load()
}
