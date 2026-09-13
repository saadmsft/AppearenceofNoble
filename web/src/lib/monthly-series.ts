import { z } from 'zod'
import rawSeries from '../data/monthly-series.json' with { type: 'json' }
import rawAudio from '../data/monthly-audio-manifest.json' with { type: 'json' }
import { localizedSchema } from './schema.ts'
import type { Language } from './schema.ts'
import { monthlyAudioManifestSchema, monthlyChapterSchema } from './story-audio.ts'

const sourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  reference: z.string().trim().min(1),
  url: z.url().refine((value) => {
    const url = new URL(value)
    return url.origin === 'https://sunnah.com' && !url.username && !url.password
  }),
  note: localizedSchema,
}).strict()

export const monthlyEpisodeSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  status: z.literal('published'),
  publishedOn: z.iso.date(),
  title: localizedSchema,
  summary: localizedSchema,
  editorialNote: localizedSchema,
  chapters: z.array(monthlyChapterSchema).min(1),
  sources: z.array(sourceSchema).min(1),
}).strict().superRefine((episode, ctx) => {
  const sourceIds = new Set(episode.sources.map((source) => source.id))
  if (sourceIds.size !== episode.sources.length
    || new Set(episode.chapters.map((chapter) => chapter.id)).size !== episode.chapters.length
    || episode.chapters.some((chapter) => chapter.monthlyEpisodeId !== episode.id
      || chapter.sourceIds.some((id) => !sourceIds.has(id)))) {
    ctx.addIssue({ code: 'custom', message: 'Monthly chapter and source identities must match the published episode' })
  }
})
export type MonthlyEpisode = z.infer<typeof monthlyEpisodeSchema>

export function createMonthlyCatalog(series: unknown, audio: unknown) {
  const parsed = z.object({ version: z.literal(1), episodes: z.array(monthlyEpisodeSchema) }).strict().parse(series)
  const manifest = monthlyAudioManifestSchema.parse(audio)
  const chapters = parsed.episodes.flatMap((episode) => episode.chapters)
  if (new Set(parsed.episodes.map((episode) => episode.id)).size !== parsed.episodes.length
    || new Set(chapters.map((chapter) => chapter.id)).size !== chapters.length) {
    throw new Error('Duplicate monthly publication identity')
  }
  const tracks = new Map(manifest.tracks.map((track) => [`${track.entryId}:${track.language}`, track]))
  if (tracks.size !== chapters.length * 2 || chapters.some((chapter) =>
    !tracks.has(`${chapter.id}:en`) || !tracks.has(`${chapter.id}:ur`))) {
    throw new Error('Every published monthly chapter requires English and Urdu recordings; orphan tracks are not allowed')
  }
  return { episodes: [...parsed.episodes].sort((a, b) => b.publishedOn.localeCompare(a.publishedOn)), chapters, manifest, tracks }
}

export const monthlyCatalog = createMonthlyCatalog(rawSeries, rawAudio)
export const monthlyEpisodes = monthlyCatalog.episodes
export const monthlyChapters = monthlyCatalog.chapters

export function monthlyBook(episode: MonthlyEpisode, language: Language, catalog = monthlyCatalog) {
  const chapters = episode.chapters.map((chapter) => {
    const track = catalog.tracks.get(`${chapter.id}:${language}`)
    if (!track) throw new Error(`Missing monthly recording: ${chapter.id}:${language}`)
    return { episode: chapter, track, duration: track.durationSeconds }
  })
  return { shelf: 'life' as const, language, chapters, duration: chapters.reduce((sum, chapter) => sum + chapter.duration, 0) }
}
