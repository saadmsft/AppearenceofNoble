import assert from 'node:assert/strict'
import { test } from 'node:test'
import { chapters, characterChapters } from '../src/lib/chapters.ts'
import { appearanceNarrations, characterNarrations } from '../src/lib/library.ts'
import { appearanceTopics, characterTopics } from '../src/lib/schema.ts'
import { isEstablished } from '../src/lib/search.ts'

test('the journey starts with complexion then eyes and covers each theme exactly once', () => {
  assert.deepEqual(chapters.slice(0, 2).map((chapter) => chapter.topic), ['complexion', 'eyes'])
  assert.equal(chapters.length, appearanceTopics.length)
  assert.deepEqual(new Set(chapters.map((chapter) => chapter.topic)), new Set(appearanceTopics))
})

test('every bilingual highlight retains an established, on-topic primary source', () => {
  for (const chapter of [...chapters, ...characterChapters]) {
    assert.ok(chapter.highlights.length >= 2 && chapter.highlights.length <= 3, chapter.topic)
    for (const highlight of chapter.highlights) {
      assert.ok(isEstablished(highlight.source), highlight.sourceId)
      assert.equal(highlight.source.id, highlight.sourceId)
      assert.ok(highlight.source.topics.includes(chapter.topic))
      assert.ok(highlight.text.en.length > 15)
      assert.match(highlight.text.ur, /[\u0600-\u06ff]/)
      assert.ok(chapter.reports.includes(highlight.source))
    }
  }
})

test('topic panels use the actual complete corpus without dropping cautioned reports', () => {
  for (const chapter of chapters) {
    assert.deepEqual(chapter.reports, appearanceNarrations.filter((row) => row.topics.includes(chapter.topic)))
    assert.ok(chapter.reports.some(isEstablished))
  }
  assert.ok(chapters.find((chapter) => chapter.topic === 'eyes')?.reports.some((row) => !isEstablished(row)))
  assert.equal(new Set(chapters.flatMap((chapter) => chapter.reports.map((row) => row.id))).size, appearanceNarrations.length)
})

test('Character covers the approved eight themes with established on-topic evidence', () => {
  assert.deepEqual(characterChapters.map((chapter) => chapter.topic), [...characterTopics])
  for (const chapter of characterChapters) {
    assert.ok(new Set(chapter.reports.filter(isEstablished).map((row) => row.source.url)).size >= 2)
    assert.deepEqual(chapter.reports, characterNarrations.filter((row) => row.topics.includes(chapter.topic)))
  }
})
