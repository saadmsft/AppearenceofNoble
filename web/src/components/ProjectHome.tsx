import { useRef } from 'react'
import { ArrowRight, ArrowUpRight, BookOpen, Headphones, Pause, Play } from 'lucide-react'
import { shelfLabels, shelfPresentation, topicLabels } from '../lib/catalog.ts'
import { number, translate } from '../lib/i18n.ts'
import { getShelfRows, getShelfTopics } from '../lib/library.ts'
import type { Language, Narration, Shelf } from '../lib/schema.ts'
import { shelves } from '../lib/schema.ts'
import { useAmbientMotion } from '../hooks/useAmbientMotion'
import { useInkEntrance } from '../hooks/useOrnamentMotion'
import { Rosette } from './ManuscriptHero'
import { Button } from './ui/button'
import { audiobookLabels } from '../lib/audiobook-labels.ts'
import { MonthlySeriesInvitation } from './MonthlySeries'

export function ProjectHome({ language, paused, readerOpen, readIds, lastOpened, onPause, onShelf, onResume, onListen, onExplore, onAudiobooks, onMonthly }: {
  language: Language
  paused: boolean
  readerOpen: boolean
  readIds: ReadonlySet<string>
  lastOpened?: Narration
  onPause: () => void
  onShelf: (shelf: Shelf) => void
  onListen: (shelf: Shelf) => void
  onExplore: () => void
  onAudiobooks: () => void
  onMonthly: () => void
  onResume: (row: Narration, button: HTMLButtonElement) => void
}) {
  const art = useRef<HTMLDivElement>(null)
  const motion = useAmbientMotion(art, !paused && !readerOpen)
  useInkEntrance(art, motion.running)
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string>) => translate(language, key, values)
  return <div className="project-home page-width">
    <section className="project-welcome">
      <div className="project-welcome-copy">
        <h1>{t('projectHeadline')}</h1>
        <p>{t('projectDescription')}</p>
        <div className="home-experience-actions">
          <Button onClick={onAudiobooks}><Headphones size={17} aria-hidden="true" />{audiobookLabels[language].homeListen}</Button>
          <Button variant="outline" onClick={onExplore}><BookOpen size={17} aria-hidden="true" />{audiobookLabels[language].readExplore}</Button>
        </div>
        {lastOpened && <button type="button" className="resume-reading" onClick={(event) => onResume(lastOpened, event.currentTarget)}>
          <BookOpen size={20} aria-hidden="true" /><span><small>{t('continueReading')}</small><strong>{lastOpened.title[language]}</strong></span><ArrowUpRight size={18} className="directional" aria-hidden="true" />
        </button>}
      </div>
      <div className="project-emblem" ref={art} data-running={motion.running}>
        <div className="project-rosette">
          <Rosette />
          <div className="name-calligraphy" lang="ar" dir="rtl"><span>مُحَمَّدٌ</span><small>صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ</small></div>
        </div>
        <button type="button" className="project-motion-toggle" onClick={onPause} aria-pressed={paused || motion.reduced} disabled={motion.reduced}>
          {paused || motion.reduced ? <Play size={12} aria-hidden="true" /> : <Pause size={12} aria-hidden="true" />}
          {t(motion.reduced ? 'reducedMotion' : paused ? 'resumeMotion' : 'pauseMotion')}
        </button>
      </div>
    </section>
    <MonthlySeriesInvitation language={language} onOpen={onMonthly} />
    <section className="project-collections" aria-label={t('projectCollections')}>
      {shelves.map((shelf) => {
        const rows = getShelfRows(shelf)
        const shelfTopics = getShelfTopics(shelf)
        const read = rows.filter((row) => readIds.has(row.id)).length
        return <article className={`project-collection collection-${shelf}`} key={shelf}>
          <h2>{shelfLabels[shelf][language]}</h2>
          <p>{t(shelfPresentation[shelf].introduction)}</p>
          <div className="collection-topic-preview">{shelfTopics.slice(0, 4).map((topic) => <span key={topic}>{topicLabels[topic][language]}</span>)}</div>
          <div className="collection-details">
            <span>{number(rows.length, language)} {t('entries')} <span aria-hidden="true">/</span> {number(shelfTopics.length, language)} {t(shelf === 'life' ? 'milestones' : 'themes')}</span>
            {read > 0 && <span>{t('markedRead', { read: number(read, language), total: number(rows.length, language) })}</span>}
          </div>
          <Button variant={shelf === 'life' ? 'default' : 'outline'} onClick={() => onShelf(shelf)}>
            {t(shelfPresentation[shelf].storyAction)}<ArrowRight size={17} className="directional" aria-hidden="true" />
          </Button>
          <button type="button" className="collection-listen-link" onClick={() => onListen(shelf)}>
            <Headphones size={15} aria-hidden="true" />{t('listenToStory')}
          </button>
        </article>
      })}
    </section>
    <p className="project-privacy">{t('privacy')}</p>
  </div>
}
