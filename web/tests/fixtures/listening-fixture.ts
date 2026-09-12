import { audioFormat, audioRenderingProfile, audioVoices } from '../../src/lib/audio.ts'
import type { AudioLanguage, AudioTrack } from '../../src/lib/audio.ts'
import type { Narration } from '../../src/lib/schema.ts'

/** Artificial metadata only: no speech, network dependency, or source corpus changes. */
export function listeningFixture() {
  const rows: Narration[] = ['first', 'second', 'cautioned', 'missing'].map((id) => ({
    id, title: { en: `Source ${id}`, ur: `ماخذ ${id}` },
    narrator: { en: 'Fixture narrator', ur: 'راوی' }, topics: ['mercy'],
    source: { collection: 'tirmidhi', reference: '1', url: 'https://sunnah.com/tirmidhi:1' },
    relatedSources: [], grade: {
      level: id === 'cautioned' ? 'weak' : 'sahih',
      attribution: { en: 'Fixture attribution', ur: 'درجہ' },
    },
    arabic: 'متن روایت', arabicFull: 'متن روایت کی جانچ کے لیے مصنوعی مثال',
    summary: { en: 'A fixture summary', ur: 'خلاصہ' },
    context: { en: 'Fixture context', ur: 'سیاق' }, checkedAt: '2026-09-12',
  }))
  const tracks: AudioTrack[] = rows.slice(0, 3).flatMap((row, index) =>
    (['ar', 'en', 'ur'] as AudioLanguage[]).map((language, langIndex) => {
      const key = (language === 'ar' && index > 0 ? 1 : index * 3 + langIndex + 1).toString(16).repeat(64)
      const transcript = `Fixture <em>transcript</em> ${key.slice(0, 1)}`
      return {
        entryId: row.id, language, cacheKey: key, asset: `audio/${key}.mp3`,
        voice: audioVoices[language], kind: language === 'ar' ? 'full-report' : 'editorial-summary',
        synthetic: true, transcript, transcriptHash: key, transcriptCharacters: transcript.length,
        billableCharacters: transcript.length, format: audioFormat, renderingProfile: audioRenderingProfile,
        byteLength: 288, sha256: key, durationSeconds: 90,
      }
    }))
  const chapter = {
    shelf: 'character' as const, topic: 'mercy' as const, title: { en: 'Mercy', ur: 'رحمت' },
    entryIds: ['first', 'second', 'first', 'cautioned'],
  }
  return { rows, manifest: { version: 1 as const, tracks }, chapter }
}

export class ListeningMemoryStorage {
  values = new Map<string, string>()
  writes = 0
  failure: 'quota' | 'unavailable' | 'verify' | null = null
  getItem(key: string) {
    if (this.failure === 'unavailable') throw new DOMException('Blocked', 'SecurityError')
    return this.values.get(key) ?? null
  }
  setItem(key: string, value: string) {
    if (this.failure === 'quota') throw new DOMException('Full', 'QuotaExceededError')
    this.writes++
    if (this.failure !== 'verify') this.values.set(key, value)
  }
}

export class ListeningFakeMedia extends EventTarget {
  src = ''
  currentTime = 0
  duration = NaN
  playbackRate = 1
  paused = true
  readyState = 0
  plays = 0
  loads = 0
  pending: Promise<void> | null = null
  play() {
    this.plays++
    this.paused = false
    this.dispatchEvent(new Event('playing'))
    return this.pending ?? Promise.resolve()
  }
  pause() {
    const wasPlaying = !this.paused
    this.paused = true
    if (wasPlaying) this.dispatchEvent(new Event('pause'))
  }
  load() { this.loads++; this.currentTime = 0; this.duration = NaN; this.readyState = 0 }
  removeAttribute(name: string) { if (name === 'src') this.src = '' }
  metadata(duration = 90) {
    this.duration = duration
    this.readyState = 1
    this.dispatchEvent(new Event('loadedmetadata'))
  }
  end() { this.currentTime = this.duration; this.paused = true; this.dispatchEvent(new Event('ended')) }
}
