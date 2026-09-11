import { createHash } from 'node:crypto'
import { z } from 'zod'
import {
  audioFormat, audioLanguages, audioManifestSchema, audioRenderingProfile, audioVoices,
} from '../../src/lib/audio.ts'
import type { AudioLanguage, AudioManifest, AudioTrack } from '../../src/lib/audio.ts'

export const capMicros = 10_000_000
export const priceMicrosPerCharacter = 15
export const hardAttemptLimit = 3
export const sampleEntryId = 'most-handsome-face-best-form-bara'

export class AudioToolError extends Error {
  constructor(publicCode: string) {
    super(publicCode)
    this.name = 'AudioToolError'
  }
}

export const contentInputSchema = z.array(z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  arabicFull: z.string().min(1),
  summary: z.object({ en: z.string().min(1), ur: z.string().min(1) }),
}))
export type AudioEntry = z.infer<typeof contentInputSchema>[number]

const blessings: Record<AudioLanguage, string> = {
  en: 'may Allah bless him and grant him peace',
  ur: 'صلی اللہ علیہ وسلم',
  ar: 'صلى الله عليه وسلم',
}

export function spokenTranscript(input: string, language: AudioLanguage): string {
  // Editorial/source text is otherwise preserved, including isnad and compiler remarks.
  const transcript = input.replaceAll('\uFDFA', blessings[language])
  if (!transcript.trim() || /PRIVATE[\s_-]*NOTE/iu.test(transcript)) {
    throw new AudioToolError('invalid-or-private-transcript')
  }
  for (const point of transcript) {
    const code = point.codePointAt(0)!
    if ((code < 32 && code !== 9 && code !== 10 && code !== 13)
      || (code >= 0xD800 && code <= 0xDFFF) || code === 0xFFFE || code === 0xFFFF) {
      throw new AudioToolError('invalid-xml-character')
    }
  }
  // REST truncates at ten minutes. Long reports require an explicitly reviewed splitting design.
  if (Array.from(transcript).length > 4_500) throw new AudioToolError('report-too-long-for-single-clip')
  return transcript
}

export function unicodeCharacters(text: string): number {
  return Array.from(text).length
}

export function billableCharacters(text: string): number {
  return Array.from(text).reduce((sum, point) => sum + (/\p{Script=Han}/u.test(point) ? 2 : 1), 0)
}

export function escapeXml(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&apos;')
}

export function sha256(input: string | Uint8Array): string {
  return createHash('sha256').update(input).digest('hex')
}

export function cacheKey(transcript: string, voice: string, format = audioFormat, profile = audioRenderingProfile): string {
  return sha256(JSON.stringify({ transcript, voice, format, profile }))
}

export type PlannedTrack = Omit<AudioTrack, 'byteLength' | 'sha256' | 'durationSeconds'>

export function planTracks(entries: AudioEntry[]): PlannedTrack[] {
  const ids = new Set<string>()
  return entries.flatMap((entry) => {
    if (ids.has(entry.id)) throw new AudioToolError('duplicate-content-entry')
    ids.add(entry.id)
    return audioLanguages.map((language): PlannedTrack => {
      const transcript = spokenTranscript(language === 'ar' ? entry.arabicFull : entry.summary[language], language)
      const voice = audioVoices[language]
      const key = cacheKey(transcript, voice)
      return {
        entryId: entry.id, language, voice, transcript, transcriptHash: sha256(transcript),
        transcriptCharacters: unicodeCharacters(transcript),
        // Reserve the serialized text, including XML entities, to avoid undercounting markup.
        // The only SSML tags we generate are the non-billable speak and voice wrappers.
        billableCharacters: billableCharacters(escapeXml(transcript)),
        cacheKey: key, asset: `audio/${key}.mp3`, format: audioFormat,
        renderingProfile: audioRenderingProfile, synthetic: true,
        kind: language === 'ar' ? 'full-report' : 'editorial-summary',
      }
    })
  })
}

export function ssml(track: PlannedTrack): string {
  if (track.voice !== audioVoices[track.language] || track.renderingProfile !== audioRenderingProfile) {
    throw new AudioToolError('unsupported-rendering-configuration')
  }
  const locale = track.voice.slice(0, 5)
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}"><voice name="${track.voice}">${escapeXml(track.transcript)}</voice></speak>`
}

const reservationSchema = z.object({
  cacheKey: z.string().regex(/^[a-f0-9]{64}$/),
  characters: z.number().int().positive(),
  costMicros: z.number().int().positive(),
  at: z.string().datetime(),
  mode: z.enum(['sample', 'bulk']),
}).strict()
export const ledgerSchema = z.object({
  version: z.literal(1),
  capMicros: z.literal(capMicros),
  priceMicrosPerCharacter: z.literal(priceMicrosPerCharacter),
  reservations: z.array(reservationSchema),
}).strict().superRefine((ledger, context) => {
  if (ledger.reservations.some((item) => item.costMicros !== item.characters * priceMicrosPerCharacter)
    || spentMicros(ledger) > capMicros) {
    context.addIssue({ code: 'custom', message: 'Invalid budget ledger' })
  }
})
export type Ledger = {
  version: 1
  capMicros: typeof capMicros
  priceMicrosPerCharacter: typeof priceMicrosPerCharacter
  reservations: z.infer<typeof reservationSchema>[]
}

export function emptyLedger(): Ledger {
  return { version: 1, capMicros, priceMicrosPerCharacter, reservations: [] }
}

export function spentMicros(ledger: Ledger): number {
  return ledger.reservations.reduce((sum, reservation) => sum + reservation.costMicros, 0)
}

export function attemptCount(ledger: Ledger, key: string): number {
  return ledger.reservations.filter((item) => item.cacheKey === key).length
}

export function reserveAttempt(ledger: Ledger, track: PlannedTrack, mode: 'sample' | 'bulk', maxAttempts: number): Ledger {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > hardAttemptLimit) {
    throw new AudioToolError('invalid-attempt-limit')
  }
  if (attemptCount(ledger, track.cacheKey) >= maxAttempts) throw new AudioToolError('attempt-limit-reached')
  const costMicros = track.billableCharacters * priceMicrosPerCharacter
  if (!Number.isSafeInteger(costMicros) || costMicros <= 0 || spentMicros(ledger) + costMicros > capMicros) {
    throw new AudioToolError('budget-cap-would-be-exceeded')
  }
  return ledgerSchema.parse({
    ...ledger,
    reservations: [...ledger.reservations, {
      cacheKey: track.cacheKey, characters: track.billableCharacters, costMicros,
      at: new Date().toISOString(), mode,
    }],
  })
}

export function mergeManifest(existing: AudioManifest, completed: AudioTrack[]): AudioManifest {
  const tracks = new Map(existing.tracks.map((track) => [`${track.entryId}:${track.language}`, track]))
  for (const track of completed) tracks.set(`${track.entryId}:${track.language}`, track)
  return audioManifestSchema.parse({
    version: 1,
    tracks: [...tracks.values()].sort((a, b) => `${a.entryId}:${a.language}`.localeCompare(`${b.entryId}:${b.language}`, 'en')),
  })
}

export function validateMp3(bytes: Uint8Array): number {
  if (bytes.length < 288 || bytes.length > 4_000_000) throw new AudioToolError('invalid-mp3-length')
  let offset = 0
  if (Buffer.from(bytes.subarray(0, 3)).toString('ascii') === 'ID3') {
    if (bytes.length < 10 || ![3, 4].includes(bytes[3]) || bytes.slice(6, 10).some((byte) => byte > 127)) {
      throw new AudioToolError('invalid-mp3-id3')
    }
    offset = 10 + bytes.slice(6, 10).reduce((size, byte) => size * 128 + byte, 0)
    if (bytes[3] === 4 && (bytes[5] & 0x10)) offset += 10
  }
  let frames = 0
  while (offset < bytes.length) {
    if (bytes.length - offset === 128
      && Buffer.from(bytes.subarray(offset, offset + 3)).toString('ascii') === 'TAG') {
      offset += 128
      break
    }
    // MPEG-2 Layer III, 48 kbit/s, 24 kHz, mono; each frame contains 576 samples.
    if (offset + 4 > bytes.length || bytes[offset] !== 0xFF || (bytes[offset + 1] & 0xFE) !== 0xF2
      || (bytes[offset + 2] & 0xFC) !== 0x64 || (bytes[offset + 3] & 0xC0) !== 0xC0) {
      throw new AudioToolError('invalid-mp3-frame')
    }
    offset += 144 + ((bytes[offset + 2] >> 1) & 1)
    frames++
  }
  const duration = frames * 576 / 24_000
  if (frames < 2 || offset !== bytes.length || duration >= 590) throw new AudioToolError('invalid-or-truncated-mp3')
  return duration
}
