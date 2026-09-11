import appearance from '../../../content/appearance.json' with { type: 'json' }
import body from '../../../content/body.json' with { type: 'json' }
import presence from '../../../content/presence.json' with { type: 'json' }
import supplement from '../../../content/supplement.json' with { type: 'json' }
import characterVirtues from '../../../content/character-virtues.json' with { type: 'json' }
import characterRelationships from '../../../content/character-relationships.json' with { type: 'json' }
import { appearanceTopics, characterTopics, corpusSchema, topics } from './schema.ts'
import type { Narration, Shelf } from './schema.ts'

export const appearanceNarrations = corpusSchema.parse([...appearance, ...body, ...presence, ...supplement])
export const characterNarrations = corpusSchema.parse([...characterVirtues, ...characterRelationships])
export const narrations = corpusSchema.parse([...appearanceNarrations, ...characterNarrations])
export const shelfNarrations: Record<Shelf, Narration[]> = { appearance: appearanceNarrations, character: characterNarrations }
const entryShelves = new Map<string, Shelf>([
  ...appearanceNarrations.map((row): [string, Shelf] => [row.id, 'appearance']),
  ...characterNarrations.map((row): [string, Shelf] => [row.id, 'character']),
])

export function getNarrationShelf(id: string): Shelf | undefined {
  return entryShelves.get(id)
}

export function getShelfRows(shelf: Shelf | 'all'): Narration[] {
  return shelf === 'all' ? narrations : shelfNarrations[shelf]
}

export function getShelfTopics(shelf: Shelf | 'all') {
  return shelf === 'appearance' ? appearanceTopics : shelf === 'character' ? characterTopics : topics
}

export const primarySourceCount = new Set(narrations.map((row) => row.source.url)).size
export const lastChecked = narrations.map((row) => row.checkedAt).sort().at(-1)!
