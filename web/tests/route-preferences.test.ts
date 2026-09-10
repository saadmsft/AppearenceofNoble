import assert from 'node:assert/strict'
import { test } from 'node:test'
import { defaultPreferences, loadPreferences, preferenceKey, savePreferences } from '../src/lib/preferences.ts'
import { parseRoute, routeUrl } from '../src/lib/route.ts'

test('routes round-trip search, filters, language, saved view and narration at the Pages base path', () => {
  const url = new URL('https://saadmsft.github.io/AppearenceofNoble/?lang=ur&view=saved&q=بال&topic=hair&source=bukhari&grade=all#narration/example-entry')
  const route = parseRoute(url)
  assert.equal(route.language, 'ur')
  assert.equal(route.view, 'saved')
  assert.equal(route.topic, 'hair')
  assert.equal(route.entry, 'example-entry')
  assert.equal(route.query, 'بال')
  const generated = routeUrl(new URL('https://saadmsft.github.io/AppearenceofNoble/?scoutTheme=dark'), route)
  assert.equal(generated.pathname, '/AppearenceofNoble/')
  assert.equal(generated.searchParams.get('scoutTheme'), 'dark')
  assert.deepEqual(parseRoute(generated), route)
})

test('unknown route parameters and malformed fragments cannot inject state', () => {
  const route = parseRoute(new URL('https://example.com/?view=evil&grade=trusted&topic=skin&source=bad&lang=xx#narration/%3Cscript%3E'))
  assert.equal(route.view, 'collection')
  assert.equal(route.grade, 'established')
  assert.equal(route.topic, 'all')
  assert.equal(route.collection, 'all')
  assert.equal(route.language, undefined)
  assert.equal(route.entry, null)
  assert.equal(parseRoute(new URL(`https://example.com/?q=${'a'.repeat(500)}`)).query.length, 300)
})

test('preferences and bookmarks survive a save/load round trip', () => {
  const values = new Map<string, string>()
  const storage = () => ({ getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } })
  assert.deepEqual(loadPreferences(storage), { value: defaultPreferences, issue: null })
  const preferences = { ...defaultPreferences, language: 'ur' as const, theme: 'dark' as const, bookmarks: ['a-report'], textSize: 'large' as const, bilingual: true }
  assert.equal(savePreferences(storage, preferences), null)
  assert.deepEqual(loadPreferences(storage), { value: preferences, issue: null })
})

test('unavailable and corrupted storage produce explicit issues rather than silent persistence claims', () => {
  const blocked = () => { throw new DOMException('Storage blocked', 'SecurityError') }
  assert.equal(loadPreferences(blocked).issue, 'unavailable')
  assert.equal(savePreferences(blocked, defaultPreferences), 'unavailable')
  const corrupt = () => ({ getItem: () => '{invalid', setItem: () => {} })
  assert.equal(loadPreferences(corrupt).issue, 'invalid')
  const wrongShape = () => ({ getItem: () => '{"theme":"evil"}', setItem: () => {} })
  assert.equal(loadPreferences(wrongShape).issue, 'invalid')
  const unexpected = () => { throw new Error('programming error') }
  assert.throws(() => loadPreferences(unexpected), /programming error/)
})

test('stored bookmark ids are deduplicated and arbitrary object values are rejected', () => {
  const data = { ...defaultPreferences, bookmarks: ['a-report', 'a-report'] }
  const storage = () => ({ getItem: (key: string) => key === preferenceKey ? JSON.stringify(data) : null, setItem: () => {} })
  assert.deepEqual(loadPreferences(storage).value.bookmarks, ['a-report'])
  const malicious = () => ({ getItem: () => '{"language":"en","theme":"dark","bookmarks":[{}],"textSize":"normal","bilingual":false}', setItem: () => {} })
  assert.equal(loadPreferences(malicious).issue, 'invalid')
})
