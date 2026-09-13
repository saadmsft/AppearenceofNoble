import { z } from 'zod'
import { audioAssetSchema } from './audio.ts'
import type { AudioTrack } from './audio.ts'
import { localizedSchema, shelves, topics, topicsByShelf } from './schema.ts'
import type { Narration } from './schema.ts'

export const storyAudioProfile = 'gpt-realtime-2.1-2026-07-07-cedar-story-v1'
export const storySalutation = 'صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ'
export const storyEpisodeSchema = z.object({
  kind: z.literal('story'),
  id: z.string().regex(/^story-[a-z0-9-]+$/),
  shelf: z.enum(shelves),
  topic: z.enum(topics),
  title: localizedSchema,
  text: localizedSchema,
  sourceIds: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(1),
}).strict().refine((episode) => topicsByShelf[episode.shelf].includes(episode.topic))
export const monthlyChapterSchema = z.object({
  kind: z.literal('story'),
  id: z.string().regex(/^story-monthly-[a-z0-9-]+$/),
  monthlyEpisodeId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  shelf: z.literal('life'),
  topic: z.literal('all'),
  title: localizedSchema,
  text: localizedSchema,
  sourceIds: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(1),
}).strict()
export type MonthlyChapter = z.infer<typeof monthlyChapterSchema>
export type StoryEpisode = z.infer<typeof storyEpisodeSchema> | MonthlyChapter
export type ListeningEntry = Narration | StoryEpisode
export function isStoryEpisode(entry: ListeningEntry): entry is StoryEpisode {
  return 'kind' in entry && entry.kind === 'story'
}
export function isMonthlyChapter(entry: ListeningEntry): entry is MonthlyChapter {
  return isStoryEpisode(entry) && 'monthlyEpisodeId' in entry
}
export function spokenStoryText(text: string) {
  return text.replaceAll('ﷺ', storySalutation)
}

const digest = z.string().regex(/^[a-f0-9]{64}$/)
export const storyAudioTrackSchema = z.object({
  entryId: z.string().regex(/^story-[a-z0-9-]+$/),
  language: z.enum(['en', 'ur']),
  kind: z.literal('guided-story'),
  synthetic: z.literal(true),
  voice: z.literal('cedar'),
  model: z.literal('gpt-realtime-2.1'),
  modelVersion: z.literal('2026-07-07'),
  renderingProfile: z.literal(storyAudioProfile),
  format: z.literal('audio-24khz-128kbitrate-mono-mp3'),
  transcript: z.string().min(1),
  transcriptHash: digest,
  scriptHash: digest,
  cacheKey: digest,
  asset: audioAssetSchema,
  byteLength: z.number().int().positive(),
  sha256: digest,
  durationSeconds: z.number().positive().max(90),
}).strict().refine((track) => track.asset === `audio/${track.cacheKey}.mp3`)
export const storyAudioManifestSchema = z.object({
  version: z.literal(1),
  tracks: z.array(storyAudioTrackSchema),
}).strict().refine((manifest) => new Set(manifest.tracks.map((track) => `${track.entryId}:${track.language}`)).size === manifest.tracks.length)
export type StoryAudioTrack = z.infer<typeof storyAudioTrackSchema>
export const monthlyAudioManifestSchema = z.object({
  version: z.literal(1),
  tracks: z.array(storyAudioTrackSchema.safeExtend({
    entryId: z.string().regex(/^story-monthly-[a-z0-9-]+$/),
    durationSeconds: z.number().positive().max(590),
  })),
}).strict().refine((manifest) => new Set(manifest.tracks.map((track) => `${track.entryId}:${track.language}`)).size === manifest.tracks.length)
export type PlayableAudioTrack = AudioTrack | StoryAudioTrack
