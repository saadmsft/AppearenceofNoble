import { audioLanguages, resolveAudioAsset } from '../lib/audio.ts'
import { listeningRates } from '../lib/listening.ts'
import type { ListeningContext, ListeningController, ListeningIssue, ListeningIssueCode } from '../lib/listening.ts'
import { getTopicShelf, isEstablished } from '../lib/schema.ts'
import type { Language } from '../lib/schema.ts'
import { isMonthlyChapter } from '../lib/story-audio.ts'
import '../audio.css'

const listeningLabels = {
  en: {
    title: 'Chapter listening', synthetic: 'Synthetic narration', previous: 'Previous narration', next: 'Next narration',
    pause: 'Pause', resume: 'Resume', dismiss: 'Dismiss player', seek: 'Seek narration',
    language: 'Narration language', rate: 'Playback speed', source: 'Open source',
    ar: 'Arabic · full report', en: 'English · editorial summary', ur: 'Urdu · editorial summary',
    scope: 'Synthetic stock voice', loading: 'Loading saved MP3…', ended: 'Queue complete. Resume replays this clip.',
    follow: 'Follow the story', suspended: 'Following suspended during exploration.', restoreFollow: 'Resume following',
    caution: 'Cautioned report', include: 'Include this cautioned report', entry: 'Play this entry',
    download: 'Download / open MP3', transcript: 'Exact spoken transcript', about: 'About this audio',
    notice: 'AI-generated stock voices, not recordings or imitations of any historical person. Pronunciation can be imperfect; consult the written source.',
    online: 'Saved MP3s need a connection unless downloaded. Background playback depends on your browser and device.',
    checkpoint: 'Paused positions are saved on this device. An abrupt browser closure can lose the latest checkpoint.',
    reload: 'Reload saved listening state', aliases: 'Also represents', of: 'of', unknownDuration: 'Duration loads with MP3',
    storyScope: 'Synthetic editorial story', storyEn: 'English · narrated story', storyUr: 'Urdu · narrated story', storySource: 'Open story and sources',
  },
  ur: {
    title: 'باب کی سماعت', synthetic: 'مصنوعی آواز میں روایت', previous: 'پچھلی روایت', next: 'اگلی روایت',
    pause: 'روکیں', resume: 'دوبارہ سنیں', dismiss: 'پلیئر بند کریں', seek: 'روایت میں مقام منتخب کریں',
    language: 'آواز کی زبان', rate: 'سننے کی رفتار', source: 'ماخذ کھولیں',
    ar: 'عربی · مکمل روایت', en: 'انگریزی · ادارتی خلاصہ', ur: 'اردو · ادارتی خلاصہ',
    scope: 'مصنوعی معیاری آواز', loading: 'محفوظ MP3 لوڈ ہو رہی ہے…', ended: 'سماعت مکمل۔ دوبارہ سننے سے یہی آڈیو شروع ہوگی۔',
    follow: 'کہانی کے ساتھ چلیں', suspended: 'آپ کی تلاش کے دوران کہانی کے ساتھ چلنا معطل ہے۔', restoreFollow: 'کہانی کے ساتھ دوبارہ چلیں',
    caution: 'قابلِ احتیاط روایت', include: 'اس قابلِ احتیاط روایت کو شامل کریں', entry: 'یہ روایت سنیں',
    download: 'MP3 ڈاؤن لوڈ کریں / کھولیں', transcript: 'بولے گئے الفاظ کا مکمل متن', about: 'اس آڈیو کے بارے میں',
    notice: 'یہ مصنوعی ذہانت کی معیاری آوازیں ہیں، کسی تاریخی شخصیت کی ریکارڈنگ یا نقل نہیں۔ تلفظ میں غلطی ہو سکتی ہے؛ تحریری ماخذ سے رجوع کریں۔',
    online: 'محفوظ MP3 کے لیے کنکشن درکار ہے، جب تک اسے ڈاؤن لوڈ نہ کیا ہو۔ پس منظر میں سماعت براؤزر اور آلے پر منحصر ہے۔',
    checkpoint: 'روکی ہوئی آڈیو کا مقام اسی آلے پر محفوظ ہوتا ہے۔ براؤزر اچانک بند ہونے پر تازہ ترین مقام ضائع ہو سکتا ہے۔',
    reload: 'محفوظ سماعت کی حالت دوبارہ لوڈ کریں', aliases: 'یہ ماخذ بھی شامل ہیں', of: 'از', unknownDuration: 'دورانیہ MP3 کے ساتھ لوڈ ہوگا',
    storyScope: 'مصنوعی آواز میں ادارتی بیانیہ', storyEn: 'انگریزی · بیانیہ', storyUr: 'اردو · بیانیہ', storySource: 'بیانیہ اور مآخذ کھولیں',
  },
} as const

const issues: Record<Language, Record<ListeningIssueCode, string>> = {
  en: {
    'invalid-data': 'Listening data is invalid. Review the backup before importing.',
    'invalid-storage': 'Saved listening data is damaged. Export a copy before a confirmed replacement; it has not been overwritten.',
    'file-too-large': 'Listening data exceeds the safe size limit.',
    'unknown-identity': 'A source or saved audio identity has changed. Old positions cannot be used; review a confirmed replacement.',
    'invalid-metadata': 'Audio metadata is invalid. Reading remains available; no replacement audio will be generated.',
    'empty-queue': 'No eligible reports are in this queue. Cautioned reports need explicit inclusion.',
    'missing-track': 'This language’s MP3 has not been published. Select another language or source; no audio will be generated.',
    'asset-error': 'The saved MP3 could not be loaded. Check your connection, then Resume to retry or open the MP3 link.',
    'playback-rejected': 'Playback could not start. Press Resume to retry, or open the MP3 link.',
    'playback-aborted': 'Playback was interrupted. Press Resume to retry.',
    'media-unavailable': 'The audio player is not attached. Reopen the application to listen.',
    unavailable: 'Local listening storage is unavailable. Positions are not being saved; check browser permissions and reload saved state.',
    quota: 'Local storage is full. Positions are not being saved; free space, then reload saved state.',
    'verify-failed': 'The listening save could not be verified. Positions may not be saved; reload saved state before continuing.',
    'changed-storage': 'Listening data changed in another tab. Playback is paused; reload saved state before saving again.',
    'replace-required': 'This operation needs a confirmed replacement of listening data.',
    'stale-preview': 'Listening state changed after the import preview. Prepare a new preview.',
    busy: 'Pause listening before preparing an import.',
  },
  ur: {
    'invalid-data': 'سماعت کی معلومات درست نہیں۔ درآمد سے پہلے بیک اپ دیکھیں۔',
    'invalid-storage': 'محفوظ سماعت کی معلومات خراب ہیں۔ تصدیق شدہ تبدیلی سے پہلے ایک نقل محفوظ کریں؛ پرانی معلومات نہیں بدلی گئیں۔',
    'file-too-large': 'سماعت کی معلومات محفوظ حجم کی حد سے زیادہ ہیں۔',
    'unknown-identity': 'ماخذ یا محفوظ آڈیو کی شناخت بدل گئی ہے۔ پرانے مقامات استعمال نہیں ہو سکتے؛ تصدیق شدہ تبدیلی کا جائزہ لیں۔',
    'invalid-metadata': 'آڈیو کی معلومات درست نہیں۔ مطالعہ دستیاب ہے؛ متبادل آڈیو نہیں بنائی جائے گی۔',
    'empty-queue': 'اس فہرست میں موزوں روایات نہیں۔ قابلِ احتیاط روایات کو واضح طور پر شامل کرنا ضروری ہے۔',
    'missing-track': 'اس زبان کی MP3 ابھی شائع نہیں ہوئی۔ دوسری زبان یا ماخذ منتخب کریں؛ نئی آڈیو نہیں بنائی جائے گی۔',
    'asset-error': 'محفوظ MP3 لوڈ نہیں ہو سکی۔ کنکشن دیکھیں، پھر دوبارہ سنیں یا MP3 کا لنک کھولیں۔',
    'playback-rejected': 'آڈیو شروع نہیں ہو سکی۔ دوبارہ سننے کا بٹن دبائیں یا MP3 کا لنک کھولیں۔',
    'playback-aborted': 'سماعت میں خلل آیا۔ دوبارہ سننے کا بٹن دبائیں۔',
    'media-unavailable': 'آڈیو پلیئر منسلک نہیں۔ سننے کے لیے ایپ دوبارہ کھولیں۔',
    unavailable: 'مقامی سماعت کا ذخیرہ دستیاب نہیں۔ مقامات محفوظ نہیں ہو رہے؛ براؤزر کی اجازتیں دیکھیں اور محفوظ حالت دوبارہ لوڈ کریں۔',
    quota: 'مقامی ذخیرہ بھر گیا ہے۔ مقامات محفوظ نہیں ہو رہے؛ جگہ خالی کر کے محفوظ حالت دوبارہ لوڈ کریں۔',
    'verify-failed': 'سماعت کے محفوظ ہونے کی تصدیق نہیں ہو سکی۔ جاری رکھنے سے پہلے محفوظ حالت دوبارہ لوڈ کریں۔',
    'changed-storage': 'سماعت کی معلومات دوسرے ٹیب میں بدل گئیں۔ سماعت روک دی گئی؛ دوبارہ محفوظ کرنے سے پہلے محفوظ حالت لوڈ کریں۔',
    'replace-required': 'اس عمل کے لیے سماعت کی معلومات بدلنے کی تصدیق ضروری ہے۔',
    'stale-preview': 'درآمد کے جائزے کے بعد سماعت کی حالت بدل گئی۔ نیا جائزہ تیار کریں۔',
    busy: 'درآمد کا جائزہ تیار کرنے سے پہلے سماعت روکیں۔',
  },
}

function listeningIssueText(issue: ListeningIssue, language: Language) {
  return issues[language][issue.code]
}
function timeLabel(seconds: number) {
  const value = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0))
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
}
export type ListeningPlayerProps = {
  listening: ListeningController; language: Language; onOpenSource: (id: string) => void; readerOpen: boolean
}

function ListeningMediaElement({ attach }: { attach: ListeningController['bindAudio'] }) {
  return <audio ref={attach} preload="none" hidden aria-hidden="true" />
}

/** The audio sibling is never conditionally rendered or moved into a reader. */
export function ListeningPlayer({ listening, language, onOpenSource, readerOpen }: ListeningPlayerProps) {
  const visible = Boolean(listening.queue || listening.error || listening.storageIssue)
  return <>
    <ListeningMediaElement attach={listening.bindAudio} />
    <section className="listening-player audio-player" aria-label={listeningLabels[language].title}
      lang={language} dir={language === 'ur' ? 'rtl' : 'ltr'} hidden={!visible || readerOpen}>
      <ListeningControls listening={listening} language={language} onOpenSource={onOpenSource} />
    </section>
  </>
}

export function EntryListeningPlayer({ entryId, language, listening, context }: {
  entryId: string; language: Language; listening: ListeningController; context?: ListeningContext
}) {
  const [includeCautioned, setIncludeCautioned] = useState(false)
  const row = listening.getNarration(entryId)
  const caution = row && !isEstablished(row)
  const t = listeningLabels[language]
  return <section className="audio-player" aria-label={t.synthetic} lang={language} dir={language === 'ur' ? 'rtl' : 'ltr'}>
    <h3>{t.synthetic}</h3>
    {listening.currentNarration?.id !== entryId && <div className="listening-entry-action">
      {caution && <label className="listening-follow">
        <input type="checkbox" checked={includeCautioned} onChange={(event) => setIncludeCautioned(event.target.checked)} />
        {t.include} · {row.grade.attribution[language]}
      </label>}
      {!listening.queue && <label className="audio-language"><span>{t.language}</span>
        <select value={listening.language} onChange={(event) => {
          const next = audioLanguages.find((value) => value === event.target.value)
          if (next) listening.setLanguage(next)
        }}>{audioLanguages.map((value) => <option key={value} value={value}>{t[value]}</option>)}</select>
      </label>}
      <button type="button" disabled={Boolean(caution && !includeCautioned && !context?.includeCautioned)}
        onClick={() => listening.startEntry(entryId, listening.language,
          context ? { ...context, includeCautioned: includeCautioned || context.includeCautioned }
            : row ? { shelf: getTopicShelf(row.topics[0]), topic: 'all', title: row.title, includeCautioned } : undefined)}>
        {t.entry}
      </button>
    </div>}
    <ListeningControls listening={listening} language={language} />
  </section>
}

/** Shared controls only: safe inside an inert-backed dialog, with no second audio element. */
export function ListeningControls({ listening, language, onOpenSource, allowFollow = true }: {
  listening: ListeningController; language: Language; onOpenSource?: (id: string) => void; allowFollow?: boolean
}) {
  const t = listeningLabels[language]
  const row = listening.currentEntry
  const story = listening.currentStory !== null
  const canFollow = allowFollow && !(row && isMonthlyChapter(row))
  const track = listening.currentTrack
  const src = track ? resolveAudioAsset(track.asset, typeof window === 'undefined' ? undefined : window.location.href) : null
  const aliases = listening.items[listening.position]?.entryIds.filter((id) => id !== row?.id) ?? []
  const cautioned = listening.items[listening.position]?.entryIds
    .map(listening.getNarration).filter((entry) => entry && !isEstablished(entry)) ?? []
  return <div className="listening-controls">
    {listening.queue && <>
      <div className="listening-heading">
        <div className="listening-source">
          <p className="listening-chapter">{listening.queue.title[language]} · {listening.position + 1} {t.of} {listening.items.length}</p>
          {row && (onOpenSource
            ? <button type="button" className="listening-source-button" aria-label={`${story ? t.storySource : t.source}: ${row.title[language]}`}
              onClick={() => onOpenSource(row.id)}>{row.title[language]}</button>
            : <p className="listening-current">{row.title[language]}</p>)}
          <p className="audio-notice">{story ? t.storyScope : t.scope} · {story ? (listening.language === 'ur' ? t.storyUr : t.storyEn) : t[listening.language]}</p>
        </div>
        <button type="button" onClick={listening.dismiss} aria-label={t.dismiss} className="listening-dismiss">×</button>
      </div>
      {cautioned.map((entry) => entry && <p key={entry.id} className="audio-caution">
        {t.caution} · {entry.title[language]} · {entry.grade.attribution[language]}
      </p>)}
      <div className="listening-transport">
        <button type="button" onClick={listening.previous} disabled={listening.position <= 0}>{t.previous}</button>
        <button type="button" className="listening-play" onClick={listening.playing || listening.loading ? listening.pause : listening.play}
          disabled={!track}>{listening.playing || listening.loading ? t.pause : t.resume}</button>
        <button type="button" onClick={listening.next} disabled={listening.position < 0 || listening.position >= listening.items.length - 1}>{t.next}</button>
      </div>
      <div className="listening-timeline" dir="ltr">
        <output>{timeLabel(listening.currentTime)}</output>
        <input type="range" aria-label={t.seek} min={0} max={listening.duration || track?.durationSeconds || 0} step={0.1}
          value={listening.currentTime} disabled={!track || !listening.duration}
          aria-valuetext={`${timeLabel(listening.currentTime)} / ${listening.duration ? timeLabel(listening.duration) : t.unknownDuration}`}
          onChange={(event) => listening.seek(Number(event.target.value))} />
        <output aria-label={listening.duration ? undefined : t.unknownDuration}>{listening.duration ? timeLabel(listening.duration) : '—:—'}</output>
      </div>
      <div className="listening-options">
        <label className="audio-language"><span>{t.language}</span>
          <select value={listening.language} onChange={(event) => {
            const next = audioLanguages.find((value) => value === event.target.value)
            if (next) listening.setLanguage(next)
          }}>{audioLanguages.filter((value) => !story || value !== 'ar').map((value) => <option key={value} value={value}>{story ? (value === 'ur' ? t.storyUr : t.storyEn) : t[value]}</option>)}</select>
        </label>
        <label className="audio-rate"><span>{t.rate}</span>
          <select value={listening.rate} onChange={(event) => listening.setRate(Number(event.target.value))}>
            {listeningRates.map((rate) => <option key={rate} value={rate}>{rate}×</option>)}
          </select>
        </label>
        {canFollow && <label className="listening-follow"><input type="checkbox" checked={listening.follow}
          onChange={(event) => listening.setFollow(event.target.checked)} />{t.follow}</label>}
      </div>
      {canFollow && listening.follow && listening.followSuspended && <p className="audio-notice">{t.suspended}{' '}
        <button type="button" onClick={() => listening.setFollow(true)}>{t.restoreFollow}</button>
      </p>}
      {(listening.loading || listening.ended) && <p role="status" className="audio-notice">{listening.loading ? t.loading : t.ended}</p>}
      <div className="listening-resources">
        {src && <a className="audio-download" href={src} download={`${track!.cacheKey}.mp3`} target="_blank" rel="noopener noreferrer">{t.download}</a>}
        {track && <details className="audio-transcript">
          <summary>{t.transcript}</summary>
          {aliases.length > 0 && <div className="audio-notice">{t.aliases}: {aliases.map((id) => (
            <span key={id}> {listening.getEntry(id)?.title[language]} </span>
          ))}</div>}
          <p lang={track.language} dir={track.language === 'en' ? 'ltr' : 'rtl'}>{track.transcript}</p>
        </details>}
        <details className="audio-about">
          <summary>{t.about}</summary>
          <p className="audio-notice">{t.notice}</p>
          <p className="audio-notice">{t.online}</p>
          <p className="audio-notice">{t.checkpoint}</p>
        </details>
      </div>
    </>}
    {listening.error && <p role="alert" className="audio-error">{listeningIssueText(listening.error, language)}</p>}
    {listening.storageIssue && <div role="alert" className="audio-error">
      <p>{listeningIssueText(listening.storageIssue, language)}</p>
      <button type="button" onClick={listening.reload}>{t.reload}</button>
    </div>}
  </div>
}
import { useState } from 'react'
