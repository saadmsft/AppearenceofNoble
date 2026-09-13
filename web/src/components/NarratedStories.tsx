import { useState } from 'react'
import { BookOpen, Headphones, Play } from 'lucide-react'
import { storiesByShelf } from '../lib/stories.ts'
import { shelfLabels } from '../lib/catalog.ts'
import { narrations } from '../lib/library.ts'
import type { Language, Narration, Shelf, Topic } from '../lib/schema.ts'
import type { ListeningController } from '../lib/listening.ts'
import { ListeningControls } from './ListeningPlayer'
import { ShelfSelector } from './ShelfSelector'
import { SourceName } from './NarrationCard'
import { LifeContext } from './LifeContext'
import { Button } from './ui/button'
import '../narrated-stories.css'

const labels = {
  en: {
    title: 'Let the story unfold in words.',
    intro: 'Three source-linked journeys, written for listening. Choose a collection and a starting chapter, then settle into the story.',
    start: 'Start at chapter', play: 'Play narrated story', language: 'Story language',
    english: 'English', urdu: 'Urdu', script: 'Read the story script', evidence: 'The sources behind this chapter',
    notice: 'Original editorial narration, spoken by an AI voice—not a hadith quotation, full translation or reconstruction of a historical voice.',
    source: 'Read source', visual: 'Open Story view', offline: 'Generated once and saved as MP3s. Listening makes no AI requests. Background playback depends on your browser and device.',
    now: 'Current story chapter', selected: 'Selected starting chapter',
  },
  ur: {
    title: 'الفاظ کے ساتھ سیرت کا سفر سنیے۔',
    intro: 'اصل مآخذ سے جڑے تین سفر، سماعت کے لیے تحریر کیے گئے۔ مجموعہ اور ابتدائی باب منتخب کریں، پھر بیانیے کے ساتھ آگے بڑھیں۔',
    start: 'اس باب سے شروع کریں', play: 'بیانیہ سنیں', language: 'بیانیے کی زبان',
    english: 'انگریزی', urdu: 'اردو', script: 'بیانیے کا متن پڑھیں', evidence: 'اس باب کے اصل مآخذ',
    notice: 'یہ اصل ادارتی بیانیہ ہے جسے مصنوعی آواز میں پڑھا گیا ہے؛ حدیث کا اقتباس، مکمل ترجمہ یا کسی تاریخی آواز کی نقل نہیں۔',
    source: 'ماخذ پڑھیں', visual: 'بیانیہ منظر کھولیں', offline: 'آڈیو ایک بار تیار ہو کر MP3 میں محفوظ ہے۔ سننے پر مصنوعی ذہانت کو نئی درخواست نہیں بھیجی جاتی۔ پس منظر کی سماعت براؤزر اور آلے پر منحصر ہے۔',
    now: 'بیانیے کا موجودہ باب', selected: 'منتخب ابتدائی باب',
  },
} as const

export function NarratedStories({ shelf, language, requestedTopic, listening, onShelf, onRead, onStory }: {
  shelf: Shelf
  language: Language
  requestedTopic: Topic | 'all'
  listening: ListeningController
  onShelf: (shelf: Shelf) => void
  onRead: (row: Narration, button: HTMLButtonElement) => void
  onStory: (topic: Topic) => void
}) {
  const episodes = storiesByShelf(shelf)
  const [startId, setStartId] = useState(() => episodes.find((episode) => episode.topic === requestedTopic)?.id ?? episodes[0].id)
  const active = listening.currentStory?.shelf === shelf ? listening.currentStory : null
  const selected = episodes.find((episode) => episode.id === startId) ?? episodes[0]
  const chapter = active ?? selected
  const audioLanguage = listening.language === 'ar' ? language : listening.language
  const t = labels[language]
  const sources = chapter.sourceIds.map((id) => {
    const source = narrations.find((row) => row.id === id)
    if (!source) throw new Error(`Missing narrated-story evidence: ${id}`)
    return source
  })
  return <section className="narrated-stories page-width">
    <header className="narrated-heading">
      <Headphones size={28} aria-hidden="true" />
      <h1>{t.title}</h1>
      <p>{t.intro}</p>
    </header>
    <ShelfSelector value={shelf} language={language} allowAll={false} onChange={(next) => {
      if (next !== 'all') onShelf(next)
    }} />
    <div className="narrated-layout">
      <div className="narrated-main">
        <h2>{shelfLabels[shelf][language]}</h2>
        <p className="narrated-notice">{t.notice}</p>
        <div className="narrated-start">
          <label><span>{t.start}</span><select value={startId} onChange={(event) => setStartId(event.target.value)}>
            {episodes.map((episode, index) => <option key={episode.id} value={episode.id}>{index + 1}. {episode.title[language]}</option>)}
          </select></label>
          {!active && <label><span>{t.language}</span><select value={audioLanguage} onChange={(event) => {
            const next = event.target.value
            if (next === 'en' || next === 'ur') listening.setLanguage(next)
          }}><option value="en">{t.english}</option><option value="ur">{t.urdu}</option></select></label>}
          <Button onClick={() => listening.startQueue({
            shelf, topic: 'all', title: shelfLabels[shelf],
            entryIds: episodes.map((episode) => episode.id), includeCautioned: false,
          }, audioLanguage, selected.id)}><Play size={16} aria-hidden="true" />{t.play}</Button>
        </div>
        {listening.queue && <div className="audio-player narrated-player">
          <ListeningControls listening={listening} language={language} allowFollow={false} />
        </div>}
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
          aria-label={`${t.source}: ${row.title[language]}`} onClick={(event) => onRead(row, event.currentTarget)}>
          <span><SourceName source={row.source} language={language} /><small>{row.title[language]}</small></span>
          <BookOpen size={15} aria-hidden="true" />
        </button>)}
      </aside>
    </div>
  </section>
}
