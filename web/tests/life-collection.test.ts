import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { lifeChapters } from '../src/lib/chapters.ts'
import { getNarrationMilestones, getNarrationTopics, lifeMilestones } from '../src/lib/life.ts'
import { appearanceNarrations, characterNarrations, getNarrationShelf, getShelfRows, lifeNarrations, narrations } from '../src/lib/library.ts'
import { corpusSchema, lifeTopics } from '../src/lib/schema.ts'
import { defaultFilters, filterNarrations, isEstablished } from '../src/lib/search.ts'

test('Life adds a bounded source corpus without replacing the original ninety-five entries', () => {
  assert.equal(appearanceNarrations.length, 71)
  assert.equal(characterNarrations.length, 24)
  assert.ok(lifeNarrations.length > 0 && lifeNarrations.length <= 24)
  assert.equal(narrations.length, 95 + lifeNarrations.length)
  assert.equal(new Set(narrations.map((row) => row.id)).size, narrations.length)
  for (const row of lifeNarrations) assert.equal(getNarrationShelf(row.id), 'life')
  for (const row of appearanceNarrations) assert.equal(getNarrationShelf(row.id), 'appearance')
  for (const row of characterNarrations) assert.equal(getNarrationShelf(row.id), 'character')
})

test('all twelve Life milestones expose their actual reports and reviewed Story passages', () => {
  assert.deepEqual(lifeMilestones.map((milestone) => milestone.topic), lifeTopics)
  assert.deepEqual(lifeChapters.map((chapter) => chapter.topic), lifeTopics)
  assert.deepEqual(new Set(getShelfRows('life').map((row) => row.id)),
    new Set(lifeMilestones.flatMap((milestone) => milestone.narrationIds)))
  for (const [index, milestone] of lifeMilestones.entries()) {
    const chapter = lifeChapters[index]
    assert.deepEqual(chapter.reports.map((row) => row.id), milestone.narrationIds)
    for (const highlight of chapter.highlights) {
      assert.ok(isEstablished(highlight.source))
      assert.ok(chapter.reports.includes(highlight.source))
      assert.ok(milestone.highlights.some((item) => item.sourceId === highlight.sourceId && item.text.en === highlight.text.en))
    }
  }
})

test('cross-listed sources are searchable in Life without mutating their canonical topics', () => {
  for (const milestone of lifeMilestones) {
    const results = filterNarrations(getShelfRows('life'), { ...defaultFilters, topic: milestone.topic })
    assert.ok(results.length > 0, milestone.topic)
    for (const row of results) {
      assert.ok(milestone.narrationIds.includes(row.id))
      assert.ok(getNarrationTopics(row).includes(milestone.topic))
      assert.ok(getNarrationMilestones(row.id).includes(milestone))
    }
  }
  assert.ok(filterNarrations(getShelfRows('life'), { ...defaultFilters, query: 'hijrat' }).length > 0)
  assert.ok(filterNarrations(getShelfRows('life'), { ...defaultFilters, query: 'ہجرت' }).length > 0)
  assert.ok(appearanceNarrations.every((row) => row.topics.every((topic) => !topic.startsWith('life-'))))
  assert.ok(characterNarrations.every((row) => row.topics.every((topic) => !topic.startsWith('life-'))))
})

test('both Life source partitions retain their independently captured Arabic fingerprints', () => {
  for (const part of ['makkan', 'madinan']) {
    const rows = corpusSchema.parse(JSON.parse(readFileSync(new URL(`../../content/life-${part}.json`, import.meta.url), 'utf8')))
    const audit = JSON.parse(readFileSync(new URL(`../../research/life-${part}-audit.json`, import.meta.url), 'utf8'))
    const manifest = [...new Map(rows.map((row) => [row.source.url, row.arabicFull]))]
      .sort(([a], [b]) => a.localeCompare(b, 'en'))
    assert.equal(createHash('sha256').update(JSON.stringify(manifest)).digest('hex'), audit.arabicSourceManifestSha256)
    assert.ok(rows.every((row) => row.checkedAt === audit.checkedAt))
  }
})
