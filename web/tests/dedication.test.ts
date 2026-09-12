import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dedicationLabels, dedicationSessionKey, dismissDedication, loadDedication } from '../src/lib/dedication.ts'
import type { DedicationStorage } from '../src/lib/dedication.ts'

test('the dedication preserves the approved names and continuing support', () => {
  assert.equal(dedicationLabels.en.mother, 'Farkhanda Abid')
  assert.equal(dedicationLabels.en.father, 'Abid Mahmood')
  assert.equal(dedicationLabels.ur.mother, 'فرخندہ عابد')
  assert.equal(dedicationLabels.ur.father, 'عابد محمود')
  assert.match(dedicationLabels.en.dedication, /Allah.*Prophet Muhammad \(S\.A\.W\.W\.\)/)
  assert.match(dedicationLabels.en.gratitude, /continue to support me/)
})

test('dismissal uses only its own session flag and survives a reload in that session', () => {
  const values = new Map([['noble-project.reading.v1', 'private reading data']])
  const touched: string[] = []
  const storage: DedicationStorage = () => ({
    getItem: (key) => { touched.push(key); return values.get(key) ?? null },
    setItem: (key, value) => { touched.push(key); values.set(key, value) },
  })
  assert.deepEqual(loadDedication(storage), { dismissed: false, issue: null })
  assert.equal(dismissDedication(storage), null)
  assert.deepEqual(loadDedication(storage), { dismissed: true, issue: null })
  assert.ok(touched.every((key) => key === dedicationSessionKey))
  assert.equal(values.get('noble-project.reading.v1'), 'private reading data')
})

test('blocked or discarded session writes are explicit and unexpected errors propagate', () => {
  const blocked = () => { throw new DOMException('Blocked', 'SecurityError') }
  assert.deepEqual(loadDedication(blocked), { dismissed: false, issue: 'unavailable' })
  assert.equal(dismissDedication(blocked), 'unavailable')
  assert.equal(dismissDedication(() => ({ getItem: () => null, setItem: () => {} })), 'verify-failed')
  assert.deepEqual(loadDedication(() => ({ getItem: () => 'invalid', setItem: () => {} })), { dismissed: false, issue: 'invalid' })
  const unexpected = () => { throw new Error('Unexpected bug') }
  assert.throws(() => loadDedication(unexpected), /Unexpected bug/)
  assert.throws(() => dismissDedication(unexpected), /Unexpected bug/)
})
