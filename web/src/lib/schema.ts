import { z } from 'zod'

export const topics = [
  'overview', 'complexion', 'face', 'eyes', 'hair', 'beard', 'mouth', 'build',
  'hands', 'feet', 'seal', 'movement', 'fragrance', 'voice', 'smile', 'dress',
] as const
export const collections = ['bukhari', 'muslim', 'tirmidhi', 'shamail', 'abudawud', 'ibnmajah', 'nasai'] as const
export const grades = ['sahih', 'hasan', 'weak', 'disputed', 'ungraded'] as const
export const languages = ['en', 'ur'] as const

export type Language = typeof languages[number]
export type Topic = typeof topics[number]
export type Collection = typeof collections[number]
export type Grade = typeof grades[number]
export type Localized = { en: string; ur: string }

const localizedSchema = z.object({
  en: z.string().trim().min(1),
  ur: z.string().trim().min(1).regex(/[\u0600-\u06ff]/),
}).strict()

export const referenceSchema = z.object({
  collection: z.enum(collections),
  reference: z.string().regex(/^\d+[a-z]?(?:,\s*\d+[a-z]?)*$/),
  url: z.url().refine((value) => /^https:\/\/sunnah\.com\/[a-z]+:\d+[a-z]?$/.test(value), 'Use an individual primary-source URL'),
}).strict().refine(
  (value) => new URL(value.url).pathname === `/${value.collection}:${value.reference.split(',')[0].trim()}`,
  'URL must match the collection and primary number',
)

export const narrationSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: localizedSchema,
  narrator: localizedSchema,
  topics: z.array(z.enum(topics)).min(1).refine((value) => new Set(value).size === value.length, 'Duplicate topic'),
  source: referenceSchema,
  relatedSources: z.array(referenceSchema),
  grade: z.object({
    level: z.enum(grades),
    attribution: localizedSchema,
  }).strict(),
  arabic: z.string().min(8).regex(/[\u0600-\u06ff]/),
  arabicFull: z.string().min(30).regex(/[\u0600-\u06ff]/),
  summary: localizedSchema,
  context: localizedSchema,
  checkedAt: z.iso.date(),
}).strict()

export const corpusSchema = z.array(narrationSchema).min(1).superRefine((rows, context) => {
  const ids = new Set<string>()
  const arabicBySource = new Map<string, string>()
  for (const [index, row] of rows.entries()) {
    if (ids.has(row.id)) {
      context.addIssue({ code: 'custom', path: [index, 'id'], message: 'Duplicate entry ID' })
    }
    ids.add(row.id)
    if (!row.arabicFull.normalize('NFC').includes(row.arabic.normalize('NFC'))) {
      context.addIssue({ code: 'custom', path: [index, 'arabic'], message: 'Excerpt must occur in the full primary report' })
    }
    const sameSource = arabicBySource.get(row.source.url)
    if (sameSource !== undefined && sameSource !== row.arabicFull) {
      context.addIssue({ code: 'custom', path: [index, 'arabicFull'], message: 'Entries sharing a source must preserve the same full Arabic' })
    }
    arabicBySource.set(row.source.url, row.arabicFull)
    if (['bukhari', 'muslim'].includes(row.source.collection) && row.grade.level !== 'sahih') {
      context.addIssue({ code: 'custom', path: [index, 'grade'], message: 'Unexpected collection classification' })
    }
  }
})

export type Narration = z.infer<typeof narrationSchema>
export type Reference = z.infer<typeof referenceSchema>
