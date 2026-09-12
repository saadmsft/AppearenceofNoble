import assert from 'node:assert/strict'
import { test } from 'node:test'
import { shelves, topics } from '../src/lib/schema.ts'
import { parseRoute, routeUrl } from '../src/lib/route.ts'

const milestoneTopics = [
  'life-early-years', 'life-revelation', 'life-makkan-years', 'life-taif',
  'life-hijrah', 'life-madinah', 'life-badr', 'life-uhud',
  'life-hudaybiyyah', 'life-makkah-return', 'life-farewell', 'life-final-days',
]

test('Life joins the existing collections with twelve distinct milestone topics', () => {
  assert.deepEqual(shelves, ['appearance', 'character', 'life'])
  for (const topic of milestoneTopics) assert.ok(topics.some((value) => value === topic), topic)
  assert.equal(new Set(topics).size, topics.length)
})

test('every Life milestone round-trips through Story and Reading routes', () => {
  for (const topic of milestoneTopics) {
    const url = new URL(`https://example.com/AppearenceofNoble/?view=story&shelf=life&topic=${topic}&beat=1&lang=ur`)
    const route = parseRoute(url)
    assert.equal(route.shelf, 'life')
    assert.equal(route.topic, topic)
    assert.equal(route.storyBeat, 1)
    assert.deepEqual(parseRoute(routeUrl(url, route)), route)
    const reading = parseRoute(new URL(`https://example.com/?view=journey&topic=${topic}`))
    assert.equal(reading.shelf, 'life')
    assert.equal(reading.topic, topic)
    assert.equal(reading.view, 'journey')
  }
})

test('Life routing preserves legacy defaults and ignores invalid milestones', () => {
  assert.equal(parseRoute(new URL('https://example.com/')).view, 'home')
  assert.equal(parseRoute(new URL('https://example.com/?topic=complexion')).shelf, 'appearance')
  assert.equal(parseRoute(new URL('https://example.com/?topic=mercy')).shelf, 'character')
  assert.equal(parseRoute(new URL('https://example.com/?view=journey')).view, 'journey')
  const route = parseRoute(new URL('https://example.com/?view=story&shelf=life&topic=life-invented&beat=999'))
  assert.equal(route.shelf, 'life')
  assert.equal(route.topic, 'all')
  assert.equal(route.storyBeat, 0)
})
