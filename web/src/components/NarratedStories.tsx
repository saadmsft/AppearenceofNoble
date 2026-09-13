import { useState } from 'react'
import { ArrowLeft, BookOpen, Pause, Play, RotateCcw, RotateCw } from 'lucide-react'
import { shelfLabels } from '../lib/catalog.ts'
import { narrations } from '../lib/library.ts'
import { number } from '../lib/i18n.ts'
import { audiobook, audiobookPosition, audiobookTime } from '../lib/audiobooks.ts'
import { audiobookLabels } from '../lib/audiobook-labels.ts'
import type { Language, Narration, Shelf, Topic } from '../lib/schema.ts'
import type { ListeningController } from '../lib/listening.ts'
import { isMonthlyChapter } from '../lib/story-audio.ts'
import { ListeningControls } from './ListeningPlayer'
import { AudiobookCover } from './AudiobookLibrary'
import { SourceName } from './NarrationCard'
import { LifeContext } from './LifeContext'
import { Button } from './ui/button'
import '../narrated-stories.css'

export function NarratedStories({ shelf, language, requestedTopic, listening, onLibrary, onRead, onStory }: {
  shelf: Shelf
  language: Language
  requestedTopic: Topic | 'all'
  listening: ListeningController
  onLibrary: () => void
  onRead: (row: Narration, button: HTMLButtonElement) => void
  onStory: (topic: Topic) => void
}) {
  const [chosenLanguage, setChosenLanguage] = useState<Language>(() => listening.language === 'ar' ? language : listening.language)
  const active = listening.currentStory?.shelf === shelf && !isMonthlyChapter(listening.currentStory) ? listening.currentStory : null
  const audioLanguage = active && listening.language !== 'ar' ? listening.language : chosenLanguage
  const book = audiobook(shelf, audioLanguage)
  const position = audiobookPosition(book, listening.data, listening)
  const continueActive = active && !position.atEnd
  const requested = book.chapters.find(({ episode }) => episode.topic === requestedTopic)?.episode
  const chapter = active ?? requested ?? book.chapters[position.chapterIndex].episode
  const t = audiobookLabels[language]
  function start(entryId: string, resume: boolean) {
    listening.startQueue({
      shelf, topic: 'all', title: shelfLabels[shelf],
      entryIds: book.chapters.map(({ episode }) => episode.id), includeCautioned: false,
    }, audioLanguage, entryId)
    if (!resume) listening.seek(0)
  }
  const sources = chapter.sourceIds.map((id) => {
    const source = narrations.find((row) => row.id === id)
    if (!source) throw new Error(`Missing narrated-story evidence: ${id}`)
    return source
  })
  return <section className="narrated-stories page-width">
    <button type="button" className="text-link" onClick={onLibrary}><ArrowLeft size={16} className="directional" aria-hidden="true" />{t.back}</button>
    <header className="book-detail-header">
      <AudiobookCover shelf={shelf} language={language} />
      <div>
        <h1>{shelfLabels[shelf][language]}</h1>
        <div className="book-facts">
          <span>{number(book.chapters.length, language)} {t.chapters}</span>
          <span>{t.duration}: <bdi>{audiobookTime(book.duration)}</bdi></span>
          <span>{audioLanguage === 'ur' ? t.urdu : t.english}</span>
        </div>
        <p className="book-narrator">{t.narrator}</p>
        <div className="book-detail-actions narrated-start">
          {!active && <label><span>{t.language}</span><select value={audioLanguage} onChange={(event) => {
            if (event.target.value === 'en' || event.target.value === 'ur') setChosenLanguage(event.target.value)
          }}><option value="en">{t.english}</option><option value="ur">{t.urdu}</option></select></label>}
          <Button onClick={() => {
            if (continueActive) { if (listening.playing || listening.loading) listening.pause(); else listening.play() }
            else start(requested?.id ?? position.entryId, !requested && position.hasResume)
          }}>
            {continueActive && (listening.playing || listening.loading) ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
            {continueActive ? (listening.playing || listening.loading ? t.pause : t.continue)
              : requested ? t.playChapter : position.hasResume ? t.continue : t.start}
          </Button>
        </div>
      </div>
    </header>
    <div className="narrated-layout">
      <div className="narrated-main">
        <p className="narrated-notice">{t.notice}</p>
        <div className="book-position">
          <span>{t.position}: <bdi>{audiobookTime(position.seconds)} / {audiobookTime(book.duration)}</bdi></span>
          <progress value={position.seconds} max={book.duration} aria-label={t.position} />
        </div>
        {listening.queue && !(listening.currentStory && isMonthlyChapter(listening.currentStory)) && <div className="audio-player narrated-player">
          <ListeningControls listening={listening} language={language} allowFollow={false} />
          <div className="book-skip-controls">
            <button type="button" disabled={!listening.duration} onClick={() => listening.seek(listening.currentTime - 15)} aria-label={t.back15}><RotateCcw size={16} aria-hidden="true" /> 15</button>
            <button type="button" disabled={!listening.duration} onClick={() => listening.seek(listening.currentTime + 15)} aria-label={t.forward15}><RotateCw size={16} aria-hidden="true" /> 15</button>
          </div>
        </div>}
        <section className="book-chapters"><h2>{t.chapterList}</h2><ol>
          {book.chapters.map(({ episode, duration }, index) => <li key={episode.id}>
            <button type="button" className="book-chapter" data-entry={episode.id}
              aria-current={active?.id === episode.id ? 'step' : undefined} onClick={() => start(episode.id, false)}>
              <span>{number(index + 1, language)}</span><span>{episode.title[language]}</span>
              <bdi>{audiobookTime(duration)}</bdi><Play size={14} aria-hidden="true" />
            </button>
          </li>)}
        </ol></section>
        <p className="narrated-notice">{t.offline}</p>
      </div>
      <aside className="narrated-evidence">
        <p>{active ? t.now : t.selected}</p>
        <h2>{chapter.title[language]}</h2>
        <LifeContext topic={chapter.topic} language={language} />
        <button type="button" className="text-link" onClick={() => onStory(chapter.topic)}><BookOpen size={16} aria-hidden="true" />{t.visual}</button>
        <details className="narrated-script"><summary>{t.script}</summary>
          <p lang={audioLanguage} dir={audioLanguage === 'ur' ? 'rtl' : 'ltr'}>{chapter.text[audioLanguage]}</p>
        </details>
        <h3>{t.evidence}</h3>
        {sources.map((row) => <button type="button" key={row.id} className="story-source-button"
          aria-label={`${t.readSource}: ${row.title[language]}`} onClick={(event) => onRead(row, event.currentTarget)}>
          <span><SourceName source={row.source} language={language} /><small>{row.title[language]}</small></span>
          <BookOpen size={15} aria-hidden="true" />
        </button>)}
      </aside>
    </div>
  </section>
}
