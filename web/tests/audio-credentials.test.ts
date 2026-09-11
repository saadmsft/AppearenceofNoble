import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateSpeechConfig } from '../scripts/audio/provider.ts'

test('Speech credentials accept both legacy hex and newer opaque resource keys', () => {
  const endpoint = 'https://swedencentral.tts.speech.microsoft.com/cognitiveservices/v1'
  assert.equal(validateSpeechConfig({ region: 'swedencentral', key: '0'.repeat(32) }), endpoint)
  assert.equal(validateSpeechConfig({ region: 'swedencentral', key: 'test-only-opaque-Azure-format_ABC+/=' }), endpoint)
})

test('Speech credentials reject blank, oversized and header-unsafe values before requests', () => {
  for (const key of ['', 'short', 'x'.repeat(513), `test-only-resource-key\r\nextra`, 'test only resource key']) {
    assert.throws(() => validateSpeechConfig({ region: 'swedencentral', key }), /invalid-speech-key-environment/)
  }
})
