import { useState } from 'react'
import { Headphones, Play } from 'lucide-react'
import { audiobook, audiobookPosition, audiobookTime } from '../lib/audiobooks.ts'
import { audiobookLabels } from '../lib/audiobook-labels.ts'
import { shelfLabels, shelfPresentation } from '../lib/catalog.ts'
import { shelves } from '../lib/schema.ts'
import { number } from '../lib/i18n.ts'
import type { Language, Shelf } from '../lib/schema.ts'
import type { ListeningController } from '../lib/listening.ts'
import { Button } from './ui/button'
import '../audiobooks.css'

export function AudiobookCover({ shelf, language }: { shelf: Shelf; language: Language }) {
  return <div className={`audiobook-cover cover-${shelf}`} aria-hidden="true">
    <span className="book-spine" />
    <svg className="book-cover-art" viewBox="0 0 240 210" fill="none">
      {shelf === 'appearance' ? <>
        <circle cx="120" cy="100" r="68" /><circle cx="120" cy="100" r="55" />
        <path d="M120 17 203 100 120 183 37 100ZM68 48H172V152H68Z" />
      </> : shelf === 'character' ? <>
        {[0, 45, 90, 135].map((angle) => <path key={angle} transform={`rotate(${angle} 120 100)`} d="M120 25C175 55 175 145 120 175C65 145 65 55 120 25Z" />)}
        <circle cx="120" cy="100" r="13" />
      </> : <>
        <path d="M120 22V182M62 40H178V164H62Z" />
        {[48, 100, 152].map((y) => <path key={y} d={`M120 ${y - 18}l18 18-18 18-18-18Z`} />)}
      </>}
    </svg>
    <span className="book-cover-calligraphy" lang="ar" dir="rtl">{shelfPresentation[shelf].shortCalligraphy}</span>
    <span className="book-cover-name">{shelfLabels[shelf][language]}</span>
  </div>
}

export function AudiobookLibrary({ language, listening, onOpen, onStart }: {
  language: Language
  listening: ListeningController
  onOpen: (shelf: Shelf) => void
  onStart: (shelf: Shelf, audioLanguage: Language, entryId: string, resume: boolean) => void
}) {
  const [audioLanguage, setAudioLanguage] = useState<Language>(() => listening.language === 'ar' ? language : listening.language)
  const t = audiobookLabels[language]
  return <section className="audiobook-library page-width">
    <header className="audiobook-library-heading">
      <Headphones size={28} aria-hidden="true" />
      <h1>{t.title}</h1><p>{t.intro}</p>
      <label className="book-language"><span>{t.language}</span>
        <select value={audioLanguage} onChange={(event) => {
          if (event.target.value === 'en' || event.target.value === 'ur') setAudioLanguage(event.target.value)
        }}><option value="en">{t.english}</option><option value="ur">{t.urdu}</option></select>
      </label>
    </header>
    <div className="audiobook-grid">{shelves.map((shelf) => {
      const book = audiobook(shelf, audioLanguage)
      const position = audiobookPosition(book, listening.data, listening)
      return <article className="audiobook-card" key={shelf} data-book={shelf}>
        <button type="button" className="audiobook-open" onClick={() => onOpen(shelf)}
          aria-label={`${t.open}: ${shelfLabels[shelf][language]}`}>
          <AudiobookCover shelf={shelf} language={language} />
          <h2>{shelfLabels[shelf][language]}</h2>
        </button>
        <div className="book-facts">
          <span>{number(book.chapters.length, language)} {t.chapters}</span>
          <span><bdi>{audiobookTime(book.duration)}</bdi></span>
          <span>{audioLanguage === 'ur' ? t.urdu : t.english}</span>
        </div>
        <p className="book-narrator">{t.narrator}</p>
        {position.seconds > 0 && <div className="book-position">
          <span>{t.position}: <bdi>{audiobookTime(position.seconds)}</bdi></span>
          <progress value={position.seconds} max={book.duration} aria-label={t.position} />
        </div>}
        <Button onClick={() => onStart(shelf, audioLanguage, position.entryId, position.hasResume)}>
          <Play size={16} aria-hidden="true" />{position.hasResume ? t.continue : t.start}
        </Button>
      </article>
    })}</div>
    <p className="audiobook-library-note">{t.notice}</p>
  </section>
}
