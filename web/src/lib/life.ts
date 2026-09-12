import makkan from '../data/life-makkan.json' with { type: 'json' }
import madinan from '../data/life-madinan.json' with { type: 'json' }
import { lifeMilestonesSchema } from './life-schema.ts'
import type { LifeMilestone, LifePlaceId } from './life-schema.ts'
import type { LifeTopic, Localized, Narration, Topic } from './schema.ts'

export const lifeMilestones = lifeMilestonesSchema.parse([...makkan, ...madinan])
const milestonesByTopic = new Map<Topic, LifeMilestone>(lifeMilestones.map((milestone) => [milestone.topic, milestone]))
const entryMilestones = new Map<string, LifeTopic[]>()
for (const milestone of lifeMilestones) {
  for (const id of milestone.narrationIds) {
    const existing = entryMilestones.get(id) ?? []
    entryMilestones.set(id, [...existing, milestone.topic])
  }
}

export function getLifeMilestone(topic: Topic) {
  return milestonesByTopic.get(topic)
}

export function getNarrationTopics(row: Narration): Topic[] {
  return [...new Set<Topic>([...row.topics, ...(entryMilestones.get(row.id) ?? [])])]
}

export function getNarrationMilestones(id: string) {
  return lifeMilestones.filter((milestone) => milestone.narrationIds.includes(id))
}

export const lifePlaceLabels: Record<LifePlaceId, Localized> = {
  makkah: { en: 'Makkah', ur: 'مکہ' },
  hira: { en: 'Hira', ur: 'حرا' },
  taif: { en: "Ta'if", ur: 'طائف' },
  madinah: { en: 'Madinah', ur: 'مدینہ' },
  badr: { en: 'Badr', ur: 'بدر' },
  uhud: { en: 'Uhud', ur: 'اُحد' },
  hudaybiyyah: { en: 'Al-Hudaybiyyah', ur: 'حدیبیہ' },
  mina: { en: 'Mina', ur: 'منیٰ' },
}
