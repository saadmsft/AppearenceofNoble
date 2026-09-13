import { z } from 'zod'
import scripts from '../data/story-scripts.json' with { type: 'json' }
import { chaptersByShelf } from './chapters.ts'
import { topicLabels } from './catalog.ts'
import { isEstablished, localizedSchema, shelves, topics } from './schema.ts'
import { storyEpisodeSchema } from './story-audio.ts'
import type { Shelf } from './schema.ts'

const parsed = z.array(z.object({ topic: z.enum(topics), text: localizedSchema }).strict())
  .length(topics.length).parse(scripts)
const byTopic = new Map(parsed.map((script) => [script.topic, script.text]))
if (byTopic.size !== topics.length) throw new Error('Every story chapter needs one original bilingual script')

export const storyEpisodes = shelves.flatMap((shelf) => chaptersByShelf[shelf].map((chapter) => {
  const text = byTopic.get(chapter.topic)
  if (!text || chapter.highlights.some((highlight) => !isEstablished(highlight.source))) {
    throw new Error(`Invalid story evidence for ${chapter.topic}`)
  }
  return storyEpisodeSchema.parse({
    kind: 'story', id: `story-${shelf}-${chapter.topic.replace(/^life-/, '')}`,
    shelf, topic: chapter.topic, title: topicLabels[chapter.topic], text,
    sourceIds: [...new Set(chapter.highlights.map((highlight) => highlight.sourceId))],
  })
}))
export const storiesByShelf = (shelf: Shelf) => storyEpisodes.filter((episode) => episode.shelf === shelf)
export const getStoryEpisode = (id: string) => storyEpisodes.find((episode) => episode.id === id)
