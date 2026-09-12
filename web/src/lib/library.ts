import appearance from '../../../content/appearance.json' with { type: 'json' }
import body from '../../../content/body.json' with { type: 'json' }
import presence from '../../../content/presence.json' with { type: 'json' }
import supplement from '../../../content/supplement.json' with { type: 'json' }
import characterVirtues from '../../../content/character-virtues.json' with { type: 'json' }
import characterRelationships from '../../../content/character-relationships.json' with { type: 'json' }
import lifeMakkan from '../../../content/life-makkan.json' with { type: 'json' }
import lifeMadinan from '../../../content/life-madinan.json' with { type: 'json' }
import { lifeMilestones } from './life.ts'
import { validateLifeReferences } from './life-schema.ts'
import { corpusSchema, topics, topicsByShelf } from './schema.ts'
import type { Narration, Shelf } from './schema.ts'

export const appearanceNarrations = corpusSchema.parse([...appearance, ...body, ...presence, ...supplement])
export const characterNarrations = corpusSchema.parse([...characterVirtues, ...characterRelationships])
export const lifeNarrations = corpusSchema.parse([...lifeMakkan, ...lifeMadinan])
export const narrations = corpusSchema.parse([...appearanceNarrations, ...characterNarrations, ...lifeNarrations])
validateLifeReferences(lifeMilestones, narrations)
const byId = new Map(narrations.map((row) => [row.id, row]))
const lifeIds = new Set(lifeMilestones.flatMap((milestone) => milestone.narrationIds))
if (lifeNarrations.some((row) => !lifeIds.has(row.id))) throw new Error('Every Life source must belong to a milestone')
const lifeRows = [...lifeIds].map((id) => {
  const row = byId.get(id)
  if (!row) throw new Error(`Missing canonical Life source: ${id}`)
  return row
})
export const shelfNarrations: Record<Shelf, Narration[]> = { appearance: appearanceNarrations, character: characterNarrations, life: lifeRows }
const entryShelves = new Map<string, Shelf>([
  ...appearanceNarrations.map((row): [string, Shelf] => [row.id, 'appearance']),
  ...characterNarrations.map((row): [string, Shelf] => [row.id, 'character']),
  ...lifeNarrations.map((row): [string, Shelf] => [row.id, 'life']),
])

export function getNarrationShelf(id: string): Shelf | undefined {
  return entryShelves.get(id)
}

export function getNarrationShelves(id: string): Shelf[] {
  const primary = entryShelves.get(id)
  if (!primary) return []
  return primary !== 'life' && lifeIds.has(id) ? [primary, 'life'] : [primary]
}

export function getShelfRows(shelf: Shelf | 'all'): Narration[] {
  return shelf === 'all' ? narrations : shelfNarrations[shelf]
}

export function getShelfTopics(shelf: Shelf | 'all') {
  return shelf === 'all' ? topics : topicsByShelf[shelf]
}

export const primarySourceCount = new Set(narrations.map((row) => row.source.url)).size
export const lastChecked = narrations.map((row) => row.checkedAt).sort().at(-1)!
