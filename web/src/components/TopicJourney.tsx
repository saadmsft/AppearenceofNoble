import { useRef, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, ChevronDown, ChevronUp, Headphones } from 'lucide-react'
import type { Language, Narration, Shelf, Topic } from '../lib/schema.ts'
import type { Chapter } from '../lib/chapters.ts'
import { shelfPresentation, topicLabels } from '../lib/catalog.ts'
import { number, translate } from '../lib/i18n.ts'
import { isEstablished } from '../lib/search.ts'
import { focusSection } from '../lib/scroll.ts'
import { SourceName } from './NarrationCard'
import { TopicReports } from './TopicReports'
import { TopicArtwork } from './TopicArtwork'
import { Button } from './ui/button'
import { LifeContext } from './LifeContext'

type JourneyProps = {
  language: Language
  shelf: Shelf
  chapters: Chapter[]
  paused: boolean
  readerOpen: boolean
  savedIds: ReadonlySet<string>
  readIds: ReadonlySet<string>
  collectionHref: string
  onCollection: () => void
  onPause: () => void
  onSave: (id: string) => void
  onRead: (row: Narration, topic: Topic, includeCautioned: boolean, button: HTMLButtonElement) => void
  onListen?: (chapter: Chapter, includeCautioned: boolean) => void
}

export function TopicJourney(props: JourneyProps) {
  const t = (key: Parameters<typeof translate>[1]) => translate(props.language, key)
  const { chapters } = props
  return <div className="topic-journey">
    <header className="journey-intro page-width">
      <h2 id="journey-heading" tabIndex={-1}>{t(shelfPresentation[props.shelf].journeyTitle)}</h2>
      <div><p>{t('journeyDescription')}</p>
        <a className="text-link" href={props.collectionHref} onClick={(event) => {
          if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); props.onCollection() }
        }}>{t('browseAllNarrations')}<ArrowUpRight size={16} className="directional" aria-hidden="true" /></a>
      </div>
    </header>
    <nav className="journey-index page-width" aria-label={t('jumpToTheme')}>
      {chapters.map((chapter) => <button type="button" key={chapter.topic} onClick={() => focusSection(`chapter-${chapter.topic}`)}>
        {topicLabels[chapter.topic][props.language]}
      </button>)}
    </nav>
    <span className="journey-note page-width">{t('highlightNotice')}</span>
    {chapters.map((chapter, index) => <JourneyChapter key={chapter.topic} chapter={chapter} next={chapters[index + 1]} {...props} />)}
    <div className="journey-finish page-width">
      <BookOpen size={26} aria-hidden="true" />
      <div><h2>{t('journeyEndTitle')}</h2><p>{t('journeyEndDescription')}</p></div>
      <Button onClick={props.onCollection}>{t('browseAllNarrations')}<ArrowRight size={16} className="directional" aria-hidden="true" /></Button>
    </div>
  </div>
}

function JourneyChapter({ chapter, next, language, paused, readerOpen, savedIds, readIds, onPause, onSave, onRead, onListen }: JourneyProps & { chapter: Chapter; next?: Chapter }) {
  const [expanded, setExpanded] = useState(false)
  const [contextExpanded, setContextExpanded] = useState(false)
  const [includeCautioned, setIncludeCautioned] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string>) => translate(language, key, values)
  const reports = includeCautioned ? chapter.reports : chapter.reports.filter(isEstablished)
  const readCount = reports.filter((row) => readIds.has(row.id)).length
  const panelId = `narrations-${chapter.topic}`
  const topicLabel = topicLabels[chapter.topic][language]

  function hideNarrations() {
    setExpanded(false)
    toggle.current?.focus()
  }

  return <section className="journey-chapter" data-topic={chapter.topic} data-expanded={expanded} aria-labelledby={`chapter-${chapter.topic}`}>
    <div className="chapter-layout page-width">
      <h2 className="chapter-title" id={`chapter-${chapter.topic}`} tabIndex={-1}>{topicLabel}</h2>
      <TopicArtwork topic={chapter.topic} language={language} paused={paused} reading={readerOpen || expanded || contextExpanded} onPause={onPause} />
      <div className="chapter-copy">
        <LifeContext topic={chapter.topic} language={language} onDisclosure={setContextExpanded} />
        <h3 className="chapter-highlights-label">{t('keyHighlights')}</h3>
        <ul className="chapter-highlights">
          {chapter.highlights.map((highlight, index) => <li key={`${highlight.sourceId}-${index}`}>
            <p>{highlight.text[language]}</p>
            <button type="button" className="highlight-source" onClick={(event) => onRead(highlight.source, chapter.topic, false, event.currentTarget)}
              aria-label={t('readHighlightSource', { title: highlight.text[language] })}>
              <SourceName source={highlight.source.source} language={language} /><ArrowUpRight size={12} className="directional" aria-hidden="true" />
            </button>
          </li>)}
        </ul>
        <div className="chapter-actions">
          {onListen && <Button variant="outline" onClick={() => onListen(chapter, includeCautioned)}
            aria-label={t('playNamedChapter', { topic: topicLabel })}><Headphones size={17} aria-hidden="true" />{t('playChapter')}</Button>}
          <Button ref={toggle} onClick={() => expanded ? hideNarrations() : setExpanded(true)} aria-expanded={expanded} aria-controls={panelId}
            aria-label={t(expanded ? 'hideTopicNarrations' : 'showTopicNarrations', { topic: topicLabel })}>
            {t(expanded ? 'hideNarrations' : 'showNarrations')} <span className="chapter-report-count">{number(reports.length, language)}</span>
            {expanded ? <ChevronUp size={17} aria-hidden="true" /> : <ChevronDown size={17} aria-hidden="true" />}
          </Button>
          {next && <button type="button" className="chapter-next" onClick={() => focusSection(`chapter-${next.topic}`)}>
            {t('nextTheme', { topic: topicLabels[next.topic][language] })}<ArrowDown size={14} aria-hidden="true" />
          </button>}
        </div>
        {includeCautioned && !expanded && <p className="story-caution-notice">{t('chapterAllGradesNotice')}</p>}
        {readCount > 0 && <p className="chapter-reading-progress">{t('markedRead', { read: number(readCount, language), total: number(reports.length, language) })}</p>}
      </div>
    </div>
    <div id={panelId} className="chapter-reports page-width" role="region" aria-label={t('topicNarrations', { topic: topicLabel })} hidden={!expanded}>
      {expanded && <>
        <TopicReports chapter={chapter} language={language} includeCautioned={includeCautioned}
          onToggleCautioned={() => setIncludeCautioned((value) => !value)} savedIds={savedIds} onSave={onSave} onRead={onRead} />
        <div className="chapter-reports-footer">
          <Button variant="outline" onClick={hideNarrations}>{t('hideNarrations')}<ChevronUp size={16} aria-hidden="true" /></Button>
          {next && <button type="button" className="text-link" onClick={() => focusSection(`chapter-${next.topic}`)}>
            {t('nextTheme', { topic: topicLabels[next.topic][language] })}<ArrowDown size={16} aria-hidden="true" />
          </button>}
        </div>
      </>}
    </div>
  </section>
}
