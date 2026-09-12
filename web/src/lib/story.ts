import type { Chapter } from './chapters.ts'
import type { Shelf, Topic } from './schema.ts'

export type StoryScene = {
  id: string
  index: number
  chapterIndex: number
  beatIndex: number
  chapter: Chapter
  highlight: Chapter['highlights'][number]
}

export function buildStoryScenes(chapters: readonly Chapter[], shelf: Shelf): StoryScene[] {
  if (!chapters.length || chapters.some((chapter) => !chapter.highlights.length)) {
    throw new Error('A story requires chapters with source-backed passages')
  }
  let index = 0
  return chapters.flatMap((chapter, chapterIndex) => chapter.highlights.map((highlight, beatIndex) => ({
    id: `story-${shelf}-${chapter.topic}-${beatIndex}`,
    index: index++,
    chapterIndex,
    beatIndex,
    chapter,
    highlight,
  })))
}

export function storySceneIndex(scenes: readonly StoryScene[], topic: Topic | 'all', beat: number): number {
  const candidates = scenes.filter((scene) => scene.chapter.topic === topic)
  if (!candidates.length) return 0
  const requested = Number.isFinite(beat) ? Math.trunc(beat) : 0
  return candidates[Math.max(0, Math.min(candidates.length - 1, requested))].index
}

export function storyPosition(starts: readonly number[], end: number, anchor: number) {
  if (!starts.length) return { index: 0, local: 0, progress: 0 }
  let index = 0
  while (index < starts.length - 1 && anchor >= starts[index + 1]) index++
  const finish = starts[index + 1] ?? end
  const local = Math.max(0, Math.min(1, (anchor - starts[index]) / Math.max(1, finish - starts[index])))
  return { index, local, progress: (index + local) / starts.length }
}
