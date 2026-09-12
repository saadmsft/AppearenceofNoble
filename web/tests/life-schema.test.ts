import assert from 'node:assert/strict'
import { test } from 'node:test'
import appearance from '../../content/appearance.json' with { type: 'json' }
import { corpusSchema, lifeTopics } from '../src/lib/schema.ts'
import { lifeMilestoneSchema, lifeMilestonesSchema, validateLifeReferences } from '../src/lib/life-schema.ts'

const row = corpusSchema.parse(appearance)[0]
const text = { en: 'A test fixture, not historical content.', ur: 'یہ آزمائشی متن ہے، تاریخی مواد نہیں۔' }
const fixture = {
  topic: 'life-early-years',
  title: text,
  era: text,
  dateLabel: text,
  datePrecision: 'period',
  dateNote: text,
  chronologySources: [{ url: 'https://example.com/source', title: text, supports: text }],
  places: ['makkah'],
  placeNote: text,
  narrationIds: [row.id],
  highlights: [{ sourceId: row.id, text }],
}

test('milestone chronology requires its own bilingual qualifications and evidence', () => {
  assert.equal(lifeMilestoneSchema.safeParse(fixture).success, true)
  for (const patch of [
    { chronologySources: [] }, { dateNote: undefined }, { placeNote: undefined },
    { datePrecision: 'sahih' }, { era: { en: 'No Urdu' } }, { places: ['invented-place'] },
    { highlights: [] }, { narrator: text },
  ]) assert.equal(lifeMilestoneSchema.safeParse({ ...fixture, ...patch }).success, false)
})

test('milestones reject unsafe citations, duplicate identities and unlinked highlights', () => {
  for (const url of ['javascript:alert(1)', 'http://example.com/source', 'https://user:password@example.com/']) {
    assert.equal(lifeMilestoneSchema.safeParse({
      ...fixture, chronologySources: [{ url, title: text, supports: text }],
    }).success, false)
  }
  for (const patch of [
    { narrationIds: [row.id, row.id] }, { places: ['makkah', 'makkah'] },
    { highlights: [{ sourceId: 'not-in-this-milestone', text }] },
    { highlights: Array.from({ length: 4 }, () => ({ sourceId: row.id, text })) },
  ]) assert.equal(lifeMilestoneSchema.safeParse({ ...fixture, ...patch }).success, false)
})

test('the complete Life sequence is ordered, bounded and cannot silently omit a milestone', () => {
  const sequence = lifeTopics.map((topic) => ({ ...fixture, topic }))
  assert.equal(lifeMilestonesSchema.safeParse(sequence).success, true)
  assert.equal(lifeMilestonesSchema.safeParse(sequence.slice(1)).success, false)
  assert.equal(lifeMilestonesSchema.safeParse([...sequence].reverse()).success, false)
  assert.equal(lifeMilestonesSchema.safeParse([...sequence, sequence[0]]).success, false)
})

test('Life can reference a canonical older entry but never an unknown or cautioned highlight', () => {
  const milestone = lifeMilestoneSchema.parse(fixture)
  assert.doesNotThrow(() => validateLifeReferences([milestone], [row]))
  assert.throws(() => validateLifeReferences([milestone], []), /Unknown Life source/)
  assert.throws(() => validateLifeReferences([milestone], [{
    ...row, grade: { level: 'weak', attribution: text },
  }]), /requires an established source/)
  assert.equal(row.topics.some((topic) => topic.startsWith('life-')), false)
})
