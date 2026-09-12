import assert from 'node:assert/strict'
import { test } from 'node:test'
import { chapters, chaptersByShelf } from '../src/lib/chapters.ts'
import { shelves } from '../src/lib/schema.ts'
import { buildStoryScenes, storyPosition, storySceneIndex, storyTargetForNarration } from '../src/lib/story.ts'
import { parseRoute, routeUrl } from '../src/lib/route.ts'

test('story scenes retain the reviewed text and exact source of every chapter highlight', () => {
  for (const shelf of shelves) {
    const collection = chaptersByShelf[shelf]
    const scenes = buildStoryScenes(collection, shelf)
    assert.equal(scenes.length, collection.reduce((sum, chapter) => sum + chapter.highlights.length, 0))
    assert.equal(new Set(scenes.map((scene) => scene.id)).size, scenes.length)
    for (const [index, scene] of scenes.entries()) {
      assert.equal(scene.index, index)
      assert.equal(scene.highlight, collection[scene.chapterIndex].highlights[scene.beatIndex])
      assert.ok(scene.chapter.reports.includes(scene.highlight.source))
      assert.ok(scene.id.startsWith(`story-${shelf}-`))
    }
  }
})

test('story navigation is bounded and respects the existing thematic order', () => {
  const scenes = buildStoryScenes(chapters, 'appearance')
  assert.equal(scenes[0].chapter.topic, 'complexion')
  assert.equal(scenes[storySceneIndex(scenes, 'eyes', 0)].chapter.topic, 'eyes')
  assert.equal(storySceneIndex(scenes, 'all', 0), 0)
  assert.equal(storySceneIndex(scenes, 'mercy', 0), 0)
  assert.equal(storySceneIndex(scenes, 'complexion', -1), 0)
  assert.equal(storySceneIndex(scenes, 'complexion', Number.NaN), 0)
  assert.equal(scenes[storySceneIndex(scenes, 'complexion', 99)].beatIndex, 1)
  assert.throws(() => buildStoryScenes([], 'appearance'), /requires chapters/)
})

test('narration following identifies a real passage or explicitly falls back to its chapter', () => {
  const chapter = chapters[0]
  const sourceId = chapter.highlights[0].sourceId
  assert.deepEqual(storyTargetForNarration(chapters, chapter.topic, sourceId),
    { topic: chapter.topic, beat: 0, matched: true })
  const withoutHighlight = chapter.reports.find((row) => !chapter.highlights.some((highlight) => highlight.sourceId === row.id))
  assert.ok(withoutHighlight, 'Exercise a report that has no highlighted story beat')
  assert.deepEqual(storyTargetForNarration(chapters, chapter.topic, withoutHighlight.id),
    { topic: chapter.topic, beat: 0, matched: false })
  assert.equal(storyTargetForNarration(chapters, 'all', 'unknown-entry'), null)
  for (const shelf of shelves) {
    for (const item of chaptersByShelf[shelf]) {
      for (const highlight of item.highlights) {
        const target = storyTargetForNarration(chaptersByShelf[shelf], item.topic, highlight.sourceId)
        assert.equal(target?.topic, item.topic)
        assert.equal(target?.matched, true)
      }
    }
  }
})

test('scroll progression handles bounds, reverse travel and degenerate geometry', () => {
  assert.deepEqual(storyPosition([], 0, 0), { index: 0, local: 0, progress: 0 })
  assert.deepEqual(storyPosition([100, 200, 300], 400, 0), { index: 0, local: 0, progress: 0 })
  assert.deepEqual(storyPosition([100, 200, 300], 400, 450), { index: 2, local: 1, progress: 1 })
  assert.deepEqual(storyPosition([100, 200, 300], 400, 250), { index: 1, local: .5, progress: .5 })
  assert.equal(storyPosition([100, 200, 300], 400, 150).index, 0)
  assert.equal(Number.isFinite(storyPosition([100], 100, 120).progress), true)
})

test('story URLs round-trip passages without changing classic journeys or narration links', () => {
  const url = new URL('https://example.com/AppearenceofNoble/?view=story&shelf=character&topic=mercy&beat=2&lang=ur#narration/character-mercy-sent-as-mercy')
  const route = parseRoute(url)
  assert.equal(route.view, 'story')
  assert.equal(route.storyBeat, 2)
  assert.equal(route.shelf, 'character')
  assert.deepEqual(parseRoute(routeUrl(url, route)), route)
  assert.equal(parseRoute(new URL('https://example.com/?view=story&beat=999')).storyBeat, 0)
  assert.equal(parseRoute(new URL('https://example.com/?view=journey&beat=2')).storyBeat, 0)
  assert.equal(parseRoute(new URL('https://example.com/?view=journey')).view, 'journey')
})
