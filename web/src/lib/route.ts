import { collections, getTopicShelf, grades, languages, shelves, topics } from './schema.ts'
import type { Language, Shelf } from './schema.ts'
import { defaultFilters } from './search.ts'
import type { Filters } from './search.ts'

export const views = ['home', 'story', 'journey', 'collection', 'reading', 'guide', 'sources', 'saved'] as const
export type View = typeof views[number]
export type Route = Filters & { view: View; shelf: Shelf | 'all'; language?: Language; entry: string | null; storyBeat: number }

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
  const shelf = params.get('shelf')
  const beat = params.get('beat')
  const hasLibraryFilters = ['q', 'topic', 'source', 'grade'].some((key) => params.has(key))
  const match = /^#narration\/([a-z0-9-]+)$/.exec(url.hash)
  const resolvedView = allowed(view, views) ? view : hasLibraryFilters ? 'collection' : 'home'
  const topicShelf = allowed(topic, topics) ? getTopicShelf(topic) : undefined
  const inferredShelf = topicShelf && topicShelf !== 'appearance' ? topicShelf : resolvedView === 'home' || resolvedView === 'reading' || resolvedView === 'saved' ? 'all' : 'appearance'
  return {
    view: resolvedView,
    shelf: allowed(shelf, [...shelves, 'all'] as const) ? shelf : inferredShelf,
    language: allowed(language, languages) ? language : undefined,
    topic: allowed(topic, topics) ? topic : 'all',
    collection: allowed(collection, collections) ? collection : 'all',
    grade: allowed(grade, ['established', 'all', ...grades] as const) ? grade : defaultFilters.grade,
    query: (params.get('q') ?? '').slice(0, 300),
    entry: match?.[1] ?? null,
    storyBeat: resolvedView === 'story' && beat !== null && /^[0-2]$/.test(beat) ? Number(beat) : 0,
  }
}

export function routeUrl(base: URL, route: Route): URL {
  const url = new URL(base)
  const values = {
    view: route.view,
    shelf: route.shelf,
    lang: route.language ?? '',
    topic: route.topic === 'all' ? '' : route.topic,
    source: route.collection === 'all' ? '' : route.collection,
    grade: route.grade === defaultFilters.grade ? '' : route.grade,
    q: route.query,
    beat: route.view === 'story' && route.storyBeat > 0 ? String(route.storyBeat) : '',
  }
  for (const [key, value] of Object.entries(values)) {
    if (value) url.searchParams.set(key, value)
    else url.searchParams.delete(key)
  }
  url.hash = route.entry ? `narration/${route.entry}` : ''
  return url
}
