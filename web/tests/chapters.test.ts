import assert from 'node:assert/strict'
import { test } from 'node:test'
import { chapters } from '../src/lib/chapters.ts'
import { narrations } from '../src/lib/library.ts'
import { topics } from '../src/lib/schema.ts'
import { isEstablished } from '../src/lib/search.ts'

test('the journey starts with complexion then eyes and covers each theme exactly once', () => {
  assert.deepEqual(chapters.slice(0, 2).map((chapter) => chapter.topic), ['complexion', 'eyes'])
  assert.equal(chapters.length, topics.length)
  assert.deepEqual(new Set(chapters.map((chapter) => chapter.topic)), new Set(topics))
})

test('every bilingual highlight retains an established, on-topic primary source', () => {
  for (const chapter of chapters) {
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
    assert.deepEqual(chapter.reports, narrations.filter((row) => row.topics.includes(chapter.topic)))
    assert.ok(chapter.reports.some(isEstablished))
  }
  assert.ok(chapters.find((chapter) => chapter.topic === 'eyes')?.reports.some((row) => !isEstablished(row)))
  assert.equal(new Set(chapters.flatMap((chapter) => chapter.reports.map((row) => row.id))).size, narrations.length)
})
