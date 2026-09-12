import { useLayoutEffect, useRef, useState } from 'react'
import staticManifest from '../data/audio-manifest.json'
import {
  audioLanguages, audioManifestSchema, resetAudio, resolveAudioAsset, tracksForEntry,
} from '../lib/audio.ts'
import type { AudioLanguage, AudioTrack } from '../lib/audio.ts'
import type { ListeningContext, ListeningController } from '../lib/listening.ts'
import { EntryListeningPlayer } from './ListeningPlayer.tsx'
import '../audio.css'

const manifest = audioManifestSchema.safeParse(staticManifest)

const labels = {
  en: {
    title: 'Synthetic narration',
    cached: 'Saved MP3 · generated once, not on each playback.',
    about: 'About this audio',
    notice: 'AI-generated stock voices, not recordings or imitations of any historical person. Pronunciation can be imperfect; consult the written source for quotation and study.',
    scope: 'Arabic: full primary report, including the chain of narration and compiler remarks. English and Urdu: original editorial summaries, not full translations.',
    online: 'Audio needs an internet connection, including in the downloaded HTML. Text remains available offline. Save individual MP3s for offline listening.',
    language: 'Narration language', rate: 'Playback speed', transcript: 'Exact spoken transcript',
    download: 'Download / open MP3', playback: 'Play or pause synthetic narration',
    unavailable: 'This narration has not been published yet. Reading remains available; no replacement voice will be generated.',
    invalid: 'Audio metadata is unavailable or invalid. Reading remains available.',
    error: 'This MP3 could not be loaded. Check your connection or open the MP3 link. Reading remains available.',
    ar: 'Arabic - full report', en: 'English - editorial summary', ur: 'Urdu - editorial summary',
  },
  ur: {
    title: 'مصنوعی آواز میں روایت',
    cached: 'محفوظ MP3 — ایک بار تیار کی گئی، ہر بار سننے پر نہیں۔',
    about: 'اس آڈیو کے بارے میں',
    notice: 'یہ مصنوعی ذہانت کی معیاری آوازیں ہیں، کسی تاریخی شخصیت کی ریکارڈنگ یا نقل نہیں۔ تلفظ میں غلطی ہو سکتی ہے؛ نقل اور تحقیق کے لیے تحریری ماخذ سے رجوع کریں۔',
    scope: 'عربی: مکمل اصل روایت، سند اور مؤلف کے تبصروں سمیت۔ انگریزی اور اردو: اصل ادارتی خلاصے، مکمل تراجم نہیں۔',
    online: 'آڈیو کے لیے انٹرنیٹ درکار ہے، ڈاؤن لوڈ کی گئی HTML فائل میں بھی۔ متن آف لائن دستیاب رہتا ہے۔ آف لائن سننے کے لیے ہر MP3 الگ محفوظ کریں۔',
    language: 'آواز کی زبان', rate: 'سننے کی رفتار', transcript: 'بولے گئے الفاظ کا مکمل متن',
    download: 'MP3 ڈاؤن لوڈ کریں / کھولیں', playback: 'مصنوعی روایت سنیں یا روکیں',
    unavailable: 'اس روایت کی آڈیو ابھی شائع نہیں ہوئی۔ مطالعہ دستیاب ہے؛ کوئی متبادل آواز نہیں بنائی جائے گی۔',
    invalid: 'آڈیو کی معلومات دستیاب نہیں یا درست نہیں۔ مطالعہ دستیاب ہے۔',
    error: 'یہ MP3 لوڈ نہیں ہو سکی۔ انٹرنیٹ کنکشن دیکھیں یا MP3 کا لنک کھولیں۔ مطالعہ دستیاب ہے۔',
    ar: 'عربی - مکمل روایت', en: 'انگریزی - ادارتی خلاصہ', ur: 'اردو - ادارتی خلاصہ',
  },
} as const

export type AudioPlayerProps = {
  entryId: string
  language: 'en' | 'ur'
  tracks?: readonly AudioTrack[]
  listening?: ListeningController
  context?: ListeningContext
}

export function AudioPlayer(props: AudioPlayerProps) {
  if (props.listening) return <EntryListeningPlayer key={props.entryId} {...props} listening={props.listening} />
  return <EntryAudioPlayer key={`${props.entryId}:${props.language}`} {...props} />
}

function EntryAudioPlayer({ entryId, language, tracks: suppliedTracks }: AudioPlayerProps) {
  const [selected, setSelected] = useState<AudioLanguage>(language)
  const t = labels[language]
  const source = suppliedTracks === undefined ? manifest : audioManifestSchema.safeParse({ version: 1, tracks: suppliedTracks })
  const tracks = source.success ? tracksForEntry(source.data, entryId) : []
  const track = tracks.find((item) => item.language === selected)
  return <section className="audio-player" aria-label={t.title} lang={language} dir={language === 'ur' ? 'rtl' : 'ltr'}>
    <h3>{t.title}</h3>
    <p className="audio-notice">{t.cached}</p>
    <label className="audio-language">
      <span>{t.language}</span>
      <select value={selected} onChange={(event) => {
        const next = audioLanguages.find((item) => item === event.target.value)
        if (next) setSelected(next)
      }}>
        {audioLanguages.map((item) => <option key={item} value={item}>{t[item]}</option>)}
      </select>
    </label>
    {!source.success ? <p role="status">{t.invalid}</p>
      : !track ? <p role="status">{t.unavailable}</p>
        : <StaticClip key={track.cacheKey} track={track} language={language} />}
    <details className="audio-about">
      <summary>{t.about}</summary>
      <p className="audio-scope">{t.scope}</p>
      <p className="audio-notice">{t.notice}</p>
      <p className="audio-notice">{t.online}</p>
    </details>
  </section>
}

function StaticClip({ track, language }: { track: AudioTrack; language: 'en' | 'ur' }) {
  const ref = useRef<HTMLAudioElement>(null)
  const [failed, setFailed] = useState(false)
  const [rate, setRate] = useState(1)
  const t = labels[language]
  const src = resolveAudioAsset(track.asset, window.location.href)
  useLayoutEffect(() => {
    const audio = ref.current
    if (!audio || !src) return
    // Restore the source after React StrictMode's development cleanup/setup cycle.
    audio.src = src
    return () => resetAudio(audio)
  }, [src, failed])

  if (!src) return <p role="status">{t.invalid}</p>
  return <div className="audio-clip">
    {failed ? <p role="alert" className="audio-error">{t.error}</p> : <>
      <audio ref={ref} src={src} controls preload="none" aria-label={`${t.playback}: ${t[track.language]}`}
        onError={() => setFailed(true)} />
      <label className="audio-rate">
        <span>{t.rate}</span>
        <select value={rate} onChange={(event) => {
          const next = Number(event.target.value)
          if (![0.75, 1, 1.25, 1.5].includes(next)) return
          setRate(next)
          if (ref.current) ref.current.playbackRate = next
        }}>
          {[0.75, 1, 1.25, 1.5].map((value) => <option key={value} value={value}>{value}x</option>)}
        </select>
      </label>
    </>}
    <a className="audio-download" href={src} target="_blank" rel="noopener noreferrer" download={`${track.cacheKey}.mp3`}>
      {t.download}
    </a>
    <details className="audio-transcript">
      <summary>{t.transcript}</summary>
      <p lang={track.language} dir={track.language === 'en' ? 'ltr' : 'rtl'}>{track.transcript}</p>
    </details>
  </div>
}
