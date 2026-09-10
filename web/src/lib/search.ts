import { collectionLabels, topicAliases, topicLabels } from './catalog.ts'
import type { Collection, Grade, Narration, Topic } from './schema.ts'

export type GradeFilter = 'established' | 'all' | Grade
export type Filters = {
  query: string
  topic: 'all' | Topic
  collection: 'all' | Collection
  grade: GradeFilter
}

export const defaultFilters: Filters = { query: '', topic: 'all', collection: 'all', grade: 'established' }

export function normalizeSearch(text: string): string {
  return text.normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[\u0640\u200c\u200d]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/[يىے]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[٠-٩۰-۹]/g, (digit) => String(digit.charCodeAt(0) - (digit <= '٩' ? 0x660 : 0x6f0)))
    .toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

export function isEstablished(row: Narration): boolean {
  return row.grade.level === 'sahih' || row.grade.level === 'hasan'
}

export function searchText(row: Narration): string {
  return normalizeSearch([
    row.title.en, row.title.ur, row.narrator.en, row.narrator.ur,
    row.summary.en, row.summary.ur, row.context.en, row.context.ur, row.arabic, row.arabicFull,
    ...[row.source, ...row.relatedSources].flatMap((source) => [
      source.reference, collectionLabels[source.collection].en, collectionLabels[source.collection].ur,
    ]),
    ...row.topics.flatMap((topic) => [topicLabels[topic].en, topicLabels[topic].ur, topicAliases[topic]]),
  ].join(' '))
}

const index = new WeakMap<Narration, string>()

export function filterNarrations(rows: Narration[], filters: Filters, saved?: ReadonlySet<string>): Narration[] {
  const terms = normalizeSearch(filters.query).split(' ').filter(Boolean)
  return rows.filter((row) => {
    if (saved && !saved.has(row.id)) return false
    if (filters.topic !== 'all' && !row.topics.includes(filters.topic)) return false
    if (filters.collection !== 'all' && row.source.collection !== filters.collection) return false
    if (filters.grade === 'established' && !isEstablished(row)) return false
    if (filters.grade !== 'all' && filters.grade !== 'established' && row.grade.level !== filters.grade) return false
    let text = index.get(row)
    if (text === undefined) {
      text = searchText(row)
      index.set(row, text)
    }
    return terms.every((term) => text.includes(term))
  })
}
