import { z } from 'zod'
import { isEstablished, lifeTopics, localizedSchema } from './schema.ts'
import type { Narration } from './schema.ts'

export const lifePlaceIds = ['makkah', 'hira', 'taif', 'madinah', 'badr', 'uhud', 'hudaybiyyah', 'mina'] as const
export type LifePlaceId = typeof lifePlaceIds[number]

const sourceId = z.string().max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const citationSchema = z.object({
  url: z.url().refine((value) => {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password
  }, 'Chronology citations require credential-free HTTPS links'),
  title: localizedSchema,
  supports: localizedSchema,
}).strict()

export const lifeMilestoneSchema = z.object({
  topic: z.enum(lifeTopics),
  title: localizedSchema,
  era: localizedSchema,
  dateLabel: localizedSchema,
  datePrecision: z.enum(['approximate', 'period', 'reported']),
  dateNote: localizedSchema,
  chronologySources: z.array(citationSchema).min(1).max(8),
  places: z.array(z.enum(lifePlaceIds)).min(1).max(lifePlaceIds.length),
  placeNote: localizedSchema,
  narrationIds: z.array(sourceId).min(1).max(32),
  highlights: z.array(z.object({
    sourceId,
    text: localizedSchema,
  }).strict()).min(1).max(3),
}).strict().superRefine((milestone, context) => {
  if (new Set(milestone.places).size !== milestone.places.length
    || new Set(milestone.narrationIds).size !== milestone.narrationIds.length
    || new Set(milestone.chronologySources.map((source) => source.url)).size !== milestone.chronologySources.length) {
    context.addIssue({ code: 'custom', message: 'Duplicate Life source or place' })
  }
  for (const [index, highlight] of milestone.highlights.entries()) {
    if (!milestone.narrationIds.includes(highlight.sourceId)) {
      context.addIssue({ code: 'custom', path: ['highlights', index, 'sourceId'], message: 'Highlight must cite a source in its milestone' })
    }
  }
})

export const lifeMilestonesSchema = z.array(lifeMilestoneSchema).length(lifeTopics.length)
  .refine((milestones) => milestones.every((milestone, index) => milestone.topic === lifeTopics[index]),
    'Life milestones must cover the reviewed sequence exactly once')

export type LifeMilestone = z.infer<typeof lifeMilestoneSchema>

export function validateLifeReferences(milestones: readonly LifeMilestone[], narrations: readonly Narration[]) {
  const byId = new Map(narrations.map((row) => [row.id, row]))
  for (const milestone of milestones) {
    for (const id of milestone.narrationIds) {
      if (!byId.has(id)) throw new Error(`Unknown Life source in ${milestone.topic}: ${id}`)
    }
    for (const highlight of milestone.highlights) {
      const source = byId.get(highlight.sourceId)
      if (!source || !isEstablished(source)) {
        throw new Error(`Life highlight requires an established source: ${highlight.sourceId}`)
      }
    }
  }
}
