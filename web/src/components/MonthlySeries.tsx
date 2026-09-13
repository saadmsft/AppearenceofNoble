import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Pause, Play, RotateCcw, RotateCw } from 'lucide-react'
import { useAmbientMotion } from '../hooks/useAmbientMotion'
import { monthlyLabels } from '../lib/monthly-labels.ts'
import { monthlyBook, monthlyEpisodes } from '../lib/monthly-series.ts'
import type { MonthlyEpisode } from '../lib/monthly-series.ts'
import { audiobookLabels } from '../lib/audiobook-labels.ts'
import { audiobookPosition, audiobookTime } from '../lib/audiobooks.ts'
import { number } from '../lib/i18n.ts'
import type { Language } from '../lib/schema.ts'
import type { ListeningController } from '../lib/listening.ts'
import { ListeningControls } from './ListeningPlayer'
import { InkSeal } from './InkSeal'
import { Button } from './ui/button'
import '../monthly-series.css'

export function MonthlySeriesInvitation({ language, onOpen }: { language: Language; onOpen: () => void }) {
  const t = monthlyLabels[language]
  return <section className="monthly-invitation">
    <div><h2>{t.title}</h2><p>{t.intro}</p></div>
    <Button variant="outline" onClick={onOpen}>{t.invitation}<ArrowRight size={16} className="directional" aria-hidden="true" /></Button>
  </section>
}

export function MonthlySeries({ language, episodeId, listening, paused, readerOpen, onPause, onOpen, onBooks }: {
  language: Language; episodeId?: string; listening: ListeningController
  paused: boolean; readerOpen: boolean; onPause: () => void
  onOpen: (id?: string) => void; onBooks: () => void
}) {
  const art = useRef<HTMLDivElement>(null)
  const motion = useAmbientMotion(art, !paused && !readerOpen)
  const t = monthlyLabels[language]
  const episode = monthlyEpisodes.find((item) => item.id === episodeId)
  if (episode) return <MonthlyEpisodePage key={episode.id} episode={episode} language={language} listening={listening} onBack={() => onOpen()} />
  if (episodeId) return <section className="monthly-series page-width">
    <h1>{t.unavailable}</h1><p>{t.unavailableDetail}</p>
    <Button variant="outline" onClick={() => onOpen()}>{t.back}</Button>
  </section>
  return <section className="monthly-series page-width">
    <header className="monthly-heading"><h1>{t.title}</h1><p>{t.intro}</p></header>
    <div className="monthly-opening">
      <div className="monthly-frontispiece" ref={art} data-running={motion.running} aria-hidden="true">
        <InkSeal paused={!motion.running} />
        <span lang="ar" dir="rtl">السِّيرَة النَّبَوِيَّة</span>
        <span>{t.name}</span>
      </div>
      <div className="monthly-opening-copy">
        <h2>{monthlyEpisodes.length ? t.name : t.firstTitle}</h2>
        {!monthlyEpisodes.length && <><p className="monthly-status">{t.preparing}</p><p>{t.firstDetail}</p></>}
        <p>{t.format}</p>
        {!monthlyEpisodes.length && <p className="monthly-review">{t.review}</p>}
        <button type="button" className="text-link monthly-motion" onClick={onPause} aria-pressed={paused || motion.reduced} disabled={motion.reduced}>
          {paused || motion.reduced ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
          {motion.reduced ? t.reduced : paused ? t.resumeMotion : t.paused}
        </button>
      </div>
    </div>
    <section className="monthly-archive" aria-labelledby="monthly-archive-title">
      <h2 id="monthly-archive-title">{t.archive}</h2>
      {monthlyEpisodes.length ? <ol>{monthlyEpisodes.map((item) => {
        const book = monthlyBook(item, language)
        return <li key={item.id}>
          <div><time dateTime={item.publishedOn}>{publicationDate(item.publishedOn, language)}</time>
            <h3>{item.title[language]}</h3><p>{item.summary[language]}</p>
            <span>{audiobookTime(book.duration)} · {number(book.chapters.length, language)} {audiobookLabels[language].chapters}</span>
          </div>
          <Button variant="outline" onClick={() => onOpen(item.id)}>{t.open}<ArrowRight size={16} className="directional" aria-hidden="true" /></Button>
        </li>
      })}</ol> : <div className="monthly-empty"><BookOpen size={24} aria-hidden="true" /><h3>{t.empty}</h3><p>{t.emptyDetail}</p><Button variant="outline" onClick={onBooks}>{t.books}<ArrowRight size={16} className="directional" aria-hidden="true" /></Button></div>}
    </section>
  </section>
}

function publicationDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === 'ur' ? 'ur-PK' : 'en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

export function MonthlyEpisodePage({ episode, language, listening, onBack }: {
  episode: MonthlyEpisode; language: Language; listening: ListeningController; onBack: () => void
}) {
  const [chosenLanguage, setChosenLanguage] = useState(language)
  const active = episode.chapters.some((chapter) => chapter.id === listening.currentStory?.id)
  const audioLanguage = active && listening.language !== 'ar' ? listening.language : chosenLanguage
  const book = monthlyBook(episode, audioLanguage)
  const position = audiobookPosition(book, listening.data, listening)
  const t = monthlyLabels[language]
  const a = audiobookLabels[language]
  const continueActive = active && !position.atEnd
  function start(id: string, resume: boolean) {
    listening.suspendFollow()
    listening.startQueue({ shelf: 'life', topic: 'all', title: episode.title, entryIds: episode.chapters.map((chapter) => chapter.id), includeCautioned: false }, audioLanguage, id)
    if (!resume) listening.seek(0)
  }
  return <article className="monthly-series monthly-episode page-width">
    <button type="button" className="text-link" onClick={onBack}><ArrowLeft size={16} className="directional" aria-hidden="true" />{t.back}</button>
    <header className="monthly-heading"><h1>{episode.title[language]}</h1><p>{episode.summary[language]}</p>
      <p>{t.released}: <time dateTime={episode.publishedOn}>{publicationDate(episode.publishedOn, language)}</time></p>
      <div className="book-facts"><span>{a.duration}: <bdi>{audiobookTime(book.duration)}</bdi></span><span>{number(book.chapters.length, language)} {a.chapters}</span><span>{audioLanguage === 'ur' ? a.urdu : a.english}</span></div>
    </header>
    <div className="monthly-episode-layout">
      <div>
        <p>{t.editorial}</p><p className="monthly-review">{episode.editorialNote[language]}</p>
        {!active && <label className="book-language"><span>{a.language}</span><select value={audioLanguage} onChange={(event) => {
          if (event.target.value === 'en' || event.target.value === 'ur') setChosenLanguage(event.target.value)
        }}><option value="en">{a.english}</option><option value="ur">{a.urdu}</option></select></label>}
        <Button className="monthly-play" onClick={() => {
          if (continueActive) { if (listening.playing || listening.loading) listening.pause(); else listening.play() }
          else start(position.entryId, position.hasResume)
        }}>{continueActive && (listening.playing || listening.loading) ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
          {continueActive ? (listening.playing || listening.loading ? a.pause : a.continue) : position.hasResume ? a.continue : a.start}</Button>
        <div className="book-position"><span>{a.position}: <bdi>{audiobookTime(position.seconds)} / {audiobookTime(book.duration)}</bdi></span><progress value={position.seconds} max={book.duration} aria-label={a.position} /></div>
        {(active || listening.error || listening.storageIssue) && <section className="audio-player monthly-player">
          <ListeningControls listening={listening} language={language} allowFollow={false} />
          {active && <div className="book-skip-controls">
            <button type="button" disabled={!listening.duration} onClick={() => listening.seek(listening.currentTime - 15)} aria-label={a.back15}><RotateCcw size={16} aria-hidden="true" />15</button>
            <button type="button" disabled={!listening.duration} onClick={() => listening.seek(listening.currentTime + 15)} aria-label={a.forward15}><RotateCw size={16} aria-hidden="true" />15</button>
          </div>}
        </section>}
        <section className="book-chapters"><h2>{a.chapterList}</h2><ol>{book.chapters.map(({ episode: chapter, duration }, index) =>
          <li key={chapter.id}><button type="button" className="book-chapter" aria-current={listening.currentStory?.id === chapter.id ? 'step' : undefined} onClick={() => start(chapter.id, false)}>
            <span>{number(index + 1, language)}</span><span>{chapter.title[language]}</span><bdi>{audiobookTime(duration)}</bdi><Play size={14} aria-hidden="true" />
          </button></li>)}</ol></section>
        <section className="monthly-transcripts"><h2>{t.transcript}</h2>{episode.chapters.map((chapter) =>
          <details key={chapter.id}><summary>{chapter.title[audioLanguage]}</summary><p lang={audioLanguage} dir={audioLanguage === 'ur' ? 'rtl' : 'ltr'}>{chapter.text[audioLanguage]}</p>
            <ul>{chapter.sourceIds.map((id) => {
              const source = episode.sources.find((item) => item.id === id)!
              return <li key={id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.reference}</a></li>
            })}</ul>
          </details>)}</section>
      </div>
      <aside className="monthly-sources"><h2>{t.sources}</h2>{episode.sources.map((source) =>
        <section key={source.id}><h3><a href={source.url} target="_blank" rel="noopener noreferrer">{source.reference}</a></h3><p>{source.note[language]}</p></section>)}</aside>
    </div>
  </article>
}
