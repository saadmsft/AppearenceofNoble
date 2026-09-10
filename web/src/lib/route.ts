import { collections, grades, languages, topics } from './schema.ts'
import type { Language } from './schema.ts'
import { defaultFilters } from './search.ts'
import type { Filters } from './search.ts'

export const views = ['collection', 'guide', 'sources', 'saved'] as const
export type View = typeof views[number]
export type Route = Filters & { view: View; language?: Language; entry: string | null }

function allowed<T extends string>(value: string | null, values: readonly T[]): value is T {
  return value !== null && values.some((item) => value === item)
}

export function parseRoute(url: URL): Route {
  const params = url.searchParams
  const view = params.get('view')
  const language = params.get('lang')
  const topic = params.get('topic')
  const collection = params.get('source')
  const grade = params.get('grade')
  const match = /^#narration\/([a-z0-9-]+)$/.exec(url.hash)
  return {
    view: allowed(view, views) ? view : 'collection',
    language: allowed(language, languages) ? language : undefined,
    topic: allowed(topic, topics) ? topic : 'all',
    collection: allowed(collection, collections) ? collection : 'all',
    grade: allowed(grade, ['established', 'all', ...grades] as const) ? grade : defaultFilters.grade,
    query: (params.get('q') ?? '').slice(0, 300),
    entry: match?.[1] ?? null,
  }
}

export function routeUrl(base: URL, route: Route): URL {
  const url = new URL(base)
  const values = {
    view: route.view === 'collection' ? '' : route.view,
    lang: route.language ?? '',
    topic: route.topic === 'all' ? '' : route.topic,
    source: route.collection === 'all' ? '' : route.collection,
    grade: route.grade === defaultFilters.grade ? '' : route.grade,
    q: route.query,
  }
  for (const [key, value] of Object.entries(values)) {
    if (value) url.searchParams.set(key, value)
    else url.searchParams.delete(key)
  }
  url.hash = route.entry ? `narration/${route.entry}` : ''
  return url
}
