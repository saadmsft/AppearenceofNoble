import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { corpusSchema, topics } from '../src/lib/schema.ts'
import { narrations } from '../src/lib/library.ts'
import { defaultFilters, filterNarrations, isEstablished, normalizeSearch } from '../src/lib/search.ts'
import { translate, translations } from '../src/lib/i18n.ts'

test('every research file is included in the shipped library', () => {
  const folder = new URL('../../content/', import.meta.url)
  const files = readdirSync(folder).filter((name) => name.endsWith('.json'))
  const data: unknown[] = files.flatMap((name) => JSON.parse(readFileSync(new URL(name, folder), 'utf8')))
  const validated = corpusSchema.parse(data)
  assert.ok(validated.length >= 60, 'Maintain the researched breadth of the initial collection')
  assert.deepEqual(new Set(narrations.map((row) => row.id)), new Set(validated.map((row) => row.id)))
  assert.equal(narrations.length, validated.length)
})

test('all themes have source-linked material in both languages', () => {
  for (const topic of topics) assert.ok(narrations.some((row) => row.topics.includes(topic)), topic)
  for (const row of narrations) {
    for (const field of ['title', 'narrator', 'summary', 'context'] as const) {
      assert.ok(row[field].en.trim().length > 3, `${row.id}: ${field}.en`)
      assert.match(row[field].ur, /[\u0600-\u06ff]/, `${row.id}: ${field}.ur`)
    }
    assert.ok(!JSON.stringify(row).includes('\ufffd'), `${row.id}: damaged Unicode`)
    assert.ok(row.relatedSources.every((source) => source.url !== row.source.url), `${row.id}: redundant related source`)
    assert.ok(new Set(row.relatedSources.map((source) => source.url)).size === row.relatedSources.length, `${row.id}: duplicate related source`)
    assert.ok(row.grade.attribution.en.length > 20)
    assert.ok(row.checkedAt <= new Date().toISOString().slice(0, 10), 'Source check cannot be in the future')
  }
})

test('default browsing never silently presents a cautioned report as established', () => {
  const established = filterNarrations(narrations, defaultFilters)
  assert.ok(established.length > 35)
  assert.ok(established.every(isEstablished))
  assert.ok(established.length < narrations.length)
  assert.equal(filterNarrations(narrations, { ...defaultFilters, grade: 'all' }).length, narrations.length)
  const weak = filterNarrations(narrations, { ...defaultFilters, grade: 'weak' })
  assert.ok(weak.length > 0)
  assert.ok(weak.every((row) => row.grade.level === 'weak'))
})

test('search normalizes Arabic marks, Urdu letter variants, and Eastern numerals', () => {
  assert.equal(normalizeSearch('مُحَمَّدٌ'), normalizeSearch('محمد'))
  assert.equal(normalizeSearch('كريم'), normalizeSearch('کریم'))
  assert.equal(normalizeSearch('۳۵۵۲'), '3552')
  assert.equal(normalizeSearch('٣٥٥٢'), '3552')
  assert.equal(normalizeSearch('Shamā’il'), normalizeSearch("Shama'il"))
  assert.ok(filterNarrations(narrations, { ...defaultFilters, query: 'بال' }).some((row) => row.topics.includes('hair')))
  assert.ok(filterNarrations(narrations, { ...defaultFilters, query: 'complexion' }).some((row) => row.topics.includes('complexion')))
  assert.ok(filterNarrations(narrations, { ...defaultFilters, query: 'rangat' }).some((row) => row.topics.includes('complexion')))
  assert.ok(filterNarrations(narrations, { ...defaultFilters, query: 'بخاری ۳۵۵۲' }).some((row) => row.source.url === 'https://sunnah.com/bukhari:3552'))
})

test('Arabic excerpts and related references are searchable', () => {
  const row = narrations.find((entry) => entry.source.url === 'https://sunnah.com/bukhari:3552')!
  assert.ok(filterNarrations(narrations, { ...defaultFilters, query: row.arabic }).includes(row))
  if (row.relatedSources[0]) {
    assert.ok(filterNarrations(narrations, { ...defaultFilters, query: row.relatedSources[0].reference }).includes(row))
  }
})

test('topic, collection, grade, query and saved filters intersect', () => {
  const rows = filterNarrations(narrations, { ...defaultFilters, topic: 'hair', collection: 'bukhari', query: 'hair' })
  assert.ok(rows.length > 0)
  assert.ok(rows.every((row) => row.topics.includes('hair') && row.source.collection === 'bukhari' && isEstablished(row)))
  assert.equal(filterNarrations(narrations, defaultFilters, new Set()).length, 0)
  const first = rows[0]
  assert.deepEqual(filterNarrations(narrations, defaultFilters, new Set([first.id])), [first])
  assert.equal(filterNarrations(narrations, { ...defaultFilters, query: 'definitely-no-matching-narration-987654321' }).length, 0)
})

test('English and Urdu interface keys and interpolation tokens match', () => {
  assert.deepEqual(Object.keys(translations.en).sort(), Object.keys(translations.ur).sort())
  for (const key of Object.keys(translations.en) as (keyof typeof translations.en)[]) {
    assert.ok(translations.ur[key].trim().length > 0, key)
    assert.deepEqual(
      [...translations.en[key].matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort(),
      [...translations.ur[key].matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort(),
      key,
    )
  }
  assert.equal(translate('en', 'results', { count: 5 }), '5 entries')
  assert.equal(translate('ur', 'results', { count: '۵' }), '۵ اندراجات')
})

test('malformed records and duplicate ids fail closed', () => {
  assert.equal(corpusSchema.safeParse([narrations[0], narrations[0]]).success, false)
  assert.equal(corpusSchema.safeParse([{ ...narrations[0], source: { ...narrations[0].source, url: 'javascript:alert(1)' } }]).success, false)
  assert.equal(corpusSchema.safeParse([{ ...narrations[0], source: { ...narrations[0].source, collection: 'nasai' } }]).success, false)
  assert.equal(corpusSchema.safeParse([{ ...narrations[0], summary: { en: 'Only one language' } }]).success, false)
  assert.equal(corpusSchema.safeParse([{ ...narrations[0], arabicFull: undefined }]).success, false)
  assert.equal(corpusSchema.safeParse([{ ...narrations[0], arabic: 'كلمات ليست في نص الرواية' }]).success, false)
})

test('the shipped full Arabic matches the recorded source audit fingerprint', () => {
  const audit = JSON.parse(readFileSync(new URL('../../research/audit.json', import.meta.url), 'utf8'))
  const bySource = new Map(narrations.map((row) => [row.source.url, row.arabicFull]))
  const manifest = [...bySource].sort(([a], [b]) => a.localeCompare(b, 'en'))
  assert.equal(createHash('sha256').update(JSON.stringify(manifest)).digest('hex'), audit.arabicSourceManifestSha256)
  assert.equal(narrations.length, audit.entries)
  assert.equal(bySource.size, audit.uniquePrimaryReferences)
  assert.equal(new Set(narrations.flatMap((row) => [row.source, ...row.relatedSources].map((source) => source.url))).size, audit.uniqueCitedReferences)
  for (const [grade, expected] of Object.entries(audit.primaryGradeLevels)) {
    assert.equal(narrations.filter((row) => row.grade.level === grade).length, expected)
  }
})
