import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, ChevronDown, ChevronUp, Headphones, Pause, Play } from 'lucide-react'
import type { RefObject } from 'react'
import type { Chapter } from '../lib/chapters.ts'
import type { Language, Narration, Shelf, Topic } from '../lib/schema.ts'
import { buildStoryScenes, storySceneIndex } from '../lib/story.ts'
import type { StoryScene } from '../lib/story.ts'
import { shelfPresentation, topicLabels } from '../lib/catalog.ts'
import { getLifeMilestone } from '../lib/life.ts'
import { number, translate } from '../lib/i18n.ts'
import { isEstablished } from '../lib/search.ts'
import { scrollBehavior } from '../lib/scroll.ts'
import { useAmbientMotion } from '../hooks/useAmbientMotion'
import { useStoryPosition } from '../hooks/useStoryPosition'
import { TopicMotif } from './TopicArtwork'
import { TopicReports } from './TopicReports'
import { SourceName } from './NarrationCard'
import { Button } from './ui/button'
import { LifeContext, LifeStageContext, LifeTimeline } from './LifeContext'
import '../story.css'

export type StoryExperienceProps = {
  shelf: Shelf
  language: Language
  chapters: Chapter[]
  requestedTopic: Topic | 'all'
  requestedBeat: number
  paused: boolean
  readerOpen: boolean
  savedIds: ReadonlySet<string>
  readIds: ReadonlySet<string>
  onNavigate: (topic: Topic, beat: number) => void
  onReadingView: (topic: Topic) => void
  onCollection: () => void
  onPause: () => void
  onSave: (id: string) => void
  onRead: (row: Narration, topic: Topic, beat: number, includeCautioned: boolean, button: HTMLButtonElement) => void
  onListen?: (chapter: Chapter, includeCautioned: boolean) => void
  playingEntryId?: string
  followingSourceOnly?: boolean
  navigationRevision?: number
  focusNavigation?: boolean
}

export function StoryExperience(props: StoryExperienceProps) {
  const { shelf, language, chapters, requestedTopic, requestedBeat, paused, readerOpen } = props
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string>) => translate(language, key, values)
  const scenes = useMemo(() => buildStoryScenes(chapters, shelf), [chapters, shelf])
  const root = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const passages = useRef<Array<HTMLDivElement | null>>([])
  const navigation = useRef<string | null>(null)
  const readerPosition = useRef<{ top: number; topic: Topic; beat: number } | null>(null)
  const previouslyReading = useRef(readerOpen)
  const [presentation, setPresentation] = useState<{ index: number; outgoing: Topic | null; transition: number }>({ index: 0, outgoing: null, transition: 0 })
  const [expandedTopics, setExpandedTopics] = useState<ReadonlySet<Topic>>(() => new Set())
  const active = scenes[presentation.index]
  const motion = useAmbientMotion(stage, !paused && !readerOpen && !expandedTopics.has(active.chapter.topic))
  const staticMode = paused || motion.reduced
  const copy = shelfPresentation[shelf]
  const navigationRevision = props.navigationRevision ?? 0
  const focusNavigation = props.focusNavigation !== false

  const activate = useCallback((index: number) => {
    setPresentation((current) => {
      if (index === current.index) return current
      const changed = scenes[current.index].chapter.topic !== scenes[index].chapter.topic
      return {
        index,
        outgoing: changed ? scenes[current.index].chapter.topic : current.outgoing,
        transition: changed ? current.transition + 1 : current.transition,
      }
    })
  }, [scenes])

  useStoryPosition(root, passages, !readerOpen, activate)

  useEffect(() => {
    if (!presentation.outgoing) return
    const transition = presentation.transition
    const timer = window.setTimeout(() => {
      setPresentation((current) => current.transition === transition ? { ...current, outgoing: null } : current)
    }, 600)
    return () => window.clearTimeout(timer)
  }, [presentation.outgoing, presentation.transition])

  useEffect(() => {
    const request = `${requestedTopic}:${requestedBeat}:${navigationRevision}`
    const first = navigation.current === null
    if (navigation.current === request) return
    if (requestedTopic === 'all' || (readerOpen && !first)) {
      navigation.current = request
      return
    }
    const index = storySceneIndex(scenes, requestedTopic, requestedBeat)
    const frame = requestAnimationFrame(() => {
      const target = passages.current[index]
      if (!target) return
      navigation.current = request
      const header = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 88
      const narrow = window.matchMedia('(max-width: 760px)').matches
      const stageHeight = narrow ? stage.current?.getBoundingClientRect().height ?? 0 : 0
      const offset = header + stageHeight + (narrow ? 28 : 48)
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY - offset,
        behavior: first || readerOpen || Math.abs(index - presentation.index) > 1 ? 'instant' : scrollBehavior(),
      })
      if (!readerOpen && focusNavigation) target.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [requestedTopic, requestedBeat, navigationRevision, focusNavigation, readerOpen, scenes, presentation.index])

  useEffect(() => {
    let frame = 0
    if (previouslyReading.current && !readerOpen) {
      const saved = readerPosition.current
      readerPosition.current = null
      if (saved && saved.topic === requestedTopic && saved.beat === requestedBeat) {
        frame = requestAnimationFrame(() => window.scrollTo({ top: saved.top, behavior: 'instant' }))
      }
    }
    previouslyReading.current = readerOpen
    return () => cancelAnimationFrame(frame)
  }, [readerOpen, requestedTopic, requestedBeat])

  function readSource(row: Narration, topic: Topic, beat: number, includeCautioned: boolean, button: HTMLButtonElement) {
    const top = window.scrollY
    window.scrollTo({ top, behavior: 'instant' })
    readerPosition.current = { top, topic, beat }
    props.onRead(row, topic, beat, includeCautioned, button)
  }

  function go(index: number) {
    const scene = scenes[index]
    if (scene) props.onNavigate(scene.chapter.topic, scene.beatIndex)
  }

  function setExpanded(topic: Topic, expanded: boolean) {
    setExpandedTopics((current) => {
      const next = new Set(current)
      if (expanded) next.add(topic)
      else next.delete(topic)
      return next
    })
  }

  return <div className="story-experience" ref={root} data-shelf={shelf} data-static={staticMode} data-active-topic={active.chapter.topic}>
    <header className="story-prologue page-width">
      <div>
        <h1 id="story-heading" tabIndex={-1}>{t(copy.storyTitle)}</h1>
        <p>{t(copy.storyIntroduction)}</p>
        <div className="story-start-actions">
          <Button onClick={() => go(0)}>{t('storyBegin')}<ArrowDown size={17} aria-hidden="true" /></Button>
          <button type="button" className="text-link" onClick={() => props.onReadingView(active.chapter.topic)}>{t('storyReadingView')}<BookOpen size={16} aria-hidden="true" /></button>
        </div>
        {props.followingSourceOnly && <p className="story-follow-note" role="status">{t('followSourceOnly')}</p>}
      </div>
      <div className="story-prologue-mark" aria-hidden="true">
        <svg viewBox="0 0 200 200" fill="none"><path d="M100 12 188 100 100 188 12 100Z" /><path d="M38 38H162V162H38Z" /><circle cx="100" cy="100" r="50" /></svg>
        <span lang="ar" dir="rtl">{copy.shortCalligraphy}</span>
      </div>
    </header>
    {shelf === 'life' && <LifeTimeline active={active.chapter.topic} language={language} onNavigate={props.onNavigate} />}
    <div className="story-layout page-width">
      <div className="story-visual-column">
        <StoryStage stageRef={stage} active={active} outgoing={presentation.outgoing} language={language}
          chapterCount={chapters.length} chapters={chapters} running={motion.running} reduced={motion.reduced} paused={paused}
          onPause={props.onPause} onNavigate={props.onNavigate}
          onPrevious={() => go(presentation.index - 1)} onNext={() => go(presentation.index + 1)}
          previousDisabled={presentation.index === 0} nextDisabled={presentation.index === scenes.length - 1}
          onReadingView={() => props.onReadingView(active.chapter.topic)}
          onListen={props.onListen ? () => props.onListen?.(active.chapter, false) : undefined} />
      </div>
      <div className="story-passages">
        {chapters.map((chapter, chapterIndex) => <StoryChapter key={`${shelf}-${chapter.topic}`}
          chapter={chapter} chapterIndex={chapterIndex} scenes={scenes.filter((scene) => scene.chapter.topic === chapter.topic)}
          activeIndex={presentation.index} passages={passages} language={language} shelf={shelf}
          savedIds={props.savedIds} readIds={props.readIds} onSave={props.onSave} onRead={readSource}
          onListen={props.onListen} playingEntryId={props.playingEntryId}
          onExpanded={(expanded) => setExpanded(chapter.topic, expanded)} />)}
      </div>
    </div>
    <footer className="story-ending page-width">
      <span className="heading-flower" aria-hidden="true" />
      <h2>{t('storyEnding')}</h2>
      <p>{t('storyEndingDetail')}</p>
      <Button onClick={props.onCollection}>{t('browseAllNarrations')}<ArrowRight size={16} className="directional" aria-hidden="true" /></Button>
    </footer>
  </div>
}

function StoryStage({ stageRef, active, outgoing, language, chapterCount, chapters, running, reduced, paused,
  onPause, onNavigate, onPrevious, onNext, previousDisabled, nextDisabled, onReadingView, onListen }: {
  stageRef: RefObject<HTMLDivElement | null>
  active: StoryScene
  outgoing: Topic | null
  language: Language
  chapterCount: number
  chapters: Chapter[]
  running: boolean
  reduced: boolean
  paused: boolean
  onPause: () => void
  onNavigate: (topic: Topic, beat: number) => void
  onPrevious: () => void
  onNext: () => void
  previousDisabled: boolean
  nextDisabled: boolean
  onReadingView: () => void
  onListen?: () => void
}) {
  const id = useId()
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string>) => translate(language, key, values)
  const life = getLifeMilestone(active.chapter.topic)
  const inkPath = life ? 'M28 52V348' : 'M24 350C120 420 390 344 370 182S46 20 34 172 302 354 320 220 114 44 94 156 242 300 254 204'
  return <div className="story-stage" ref={stageRef} data-running={running} data-topic={active.chapter.topic}>
    <div className="story-stage-toolbar">
      <label htmlFor={`${id}-chapter`} className="sr-only">{t('storyChapter')}</label>
      <select id={`${id}-chapter`} value={active.chapter.topic} onChange={(event) => {
        const chapter = chapters.find((item) => item.topic === event.target.value)
        if (chapter) onNavigate(chapter.topic, 0)
      }}>
        {chapters.map((chapter) => <option key={chapter.topic} value={chapter.topic}>{topicLabels[chapter.topic][language]}</option>)}
      </select>
      <div className="story-step-controls">
        {onListen && <Button variant="ghost" size="icon" onClick={onListen}
          aria-label={t('playNamedChapter', { topic: topicLabels[active.chapter.topic][language] })}><Headphones size={17} aria-hidden="true" /></Button>}
        <Button variant="ghost" size="icon" onClick={onPrevious} disabled={previousDisabled} aria-label={t('storyPrevious')}><ArrowLeft size={17} className="directional" aria-hidden="true" /></Button>
        <Button variant="ghost" size="icon" onClick={onNext} disabled={nextDisabled} aria-label={t('storyNext')}><ArrowRight size={17} className="directional" aria-hidden="true" /></Button>
      </div>
      <LifeStageContext topic={active.chapter.topic} language={language} />
    </div>
    <div className="story-visual" aria-hidden="true">
      <div className="story-orbital-frame frame-back" />
      <div className="story-orbital-frame frame-front" />
      <svg className="story-ink-path" viewBox="0 0 400 400" fill="none">
        <path className="story-path-track" d={inkPath} />
        <path className="story-path-progress" pathLength="1" d={inkPath} />
      </svg>
      <svg className="story-motifs" viewBox="0 0 400 400" fill="none">
        <defs><radialGradient id={id}><stop offset="0" stopColor="var(--cp-hero-accent)" stopOpacity=".4" /><stop offset="1" stopColor="var(--cp-hero-accent)" stopOpacity="0" /></radialGradient></defs>
        {outgoing && running && <g key={`out-${outgoing}`} className="story-motif-layer story-motif-outgoing"><TopicMotif topic={outgoing} glowId={id} language={language} /></g>}
        <g key={`in-${active.chapter.topic}`} className={`story-motif-layer ${running ? 'story-motif-incoming' : ''}`}><TopicMotif topic={active.chapter.topic} glowId={id} language={language} /></g>
      </svg>
      <span className="story-corner corner-start" /><span className="story-corner corner-end" />
    </div>
    <div className="story-stage-caption">
      <p>{topicLabels[active.chapter.topic][language]}</p>
      <span>{t('storyChapterPosition', { current: number(active.chapterIndex + 1, language), total: number(chapterCount, language) })}</span>
    </div>
    <div className="story-progress-line" aria-hidden="true"><span /></div>
    <div className="story-stage-footer">
      <button type="button" className="story-motion-toggle" onClick={onPause} disabled={reduced} aria-pressed={paused || reduced}>
        {paused || reduced ? <Play size={12} aria-hidden="true" /> : <Pause size={12} aria-hidden="true" />}
        {t(reduced ? 'reducedMotion' : paused ? 'resumeMotion' : 'pauseMotion')}
      </button>
      <button type="button" onClick={onReadingView}>{t('storyReadingView')}<BookOpen size={13} aria-hidden="true" /></button>
    </div>
    <p className="story-ornament-note">{t(life ? 'lifeLocatorNotice' : 'ornamentNotice')}</p>
  </div>
}

function StoryChapter({ chapter, chapterIndex, scenes, activeIndex, passages, language, shelf, savedIds, readIds, onSave, onRead, onExpanded, onListen, playingEntryId }: {
  chapter: Chapter
  chapterIndex: number
  scenes: StoryScene[]
  activeIndex: number
  passages: RefObject<Array<HTMLDivElement | null>>
  language: Language
  shelf: Shelf
  savedIds: ReadonlySet<string>
  readIds: ReadonlySet<string>
  onSave: (id: string) => void
  onRead: StoryExperienceProps['onRead']
  onExpanded: (expanded: boolean) => void
  onListen?: StoryExperienceProps['onListen']
  playingEntryId?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [contextExpanded, setContextExpanded] = useState(false)
  const [includeCautioned, setIncludeCautioned] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string>) => translate(language, key, values)
  const topic = topicLabels[chapter.topic][language]
  const id = `story-reports-${shelf}-${chapter.topic}`
  const displayedReports = includeCautioned ? chapter.reports : chapter.reports.filter(isEstablished)
  const read = displayedReports.filter((row) => readIds.has(row.id)).length

  function reveal(value: boolean) {
    setExpanded(value)
    onExpanded(value || contextExpanded)
    if (!value) toggle.current?.focus()
  }

  return <section className="story-chapter" data-topic={chapter.topic} aria-labelledby={`story-title-${shelf}-${chapter.topic}`}>
    <div className="story-chapter-heading">
      <span aria-hidden="true">{number(chapterIndex + 1, language).padStart(language === 'en' ? 2 : 1, '0')}</span>
      <h2 id={`story-title-${shelf}-${chapter.topic}`}>{topic}</h2>
    </div>
    <LifeContext topic={chapter.topic} language={language} onDisclosure={(value) => {
      setContextExpanded(value)
      onExpanded(value || expanded)
    }} />
    {onListen && <button type="button" className="story-listen-action"
      aria-label={t('playNamedChapter', { topic })} onClick={() => onListen(chapter, includeCautioned)}>
      <Headphones size={17} aria-hidden="true" />{t('playChapter')}
    </button>}
    {scenes.map((scene) => <div className="story-beat" key={scene.id} id={scene.id}
      ref={(element) => { passages.current[scene.index] = element }} tabIndex={-1}
      role="group" aria-labelledby={`${scene.id}-text`} data-active={activeIndex === scene.index} data-scene-index={scene.index}
      data-playing={playingEntryId === scene.highlight.sourceId}>
      {playingEntryId === scene.highlight.sourceId && <span className="story-playing-source"><Headphones size={14} aria-hidden="true" />{t('followingSource')}</span>}
      <p className="story-statement" id={`${scene.id}-text`}>{scene.highlight.text[language]}</p>
      <span className="story-summary-label">{t('originalSummary')}</span>
      <button type="button" className="story-source-button" aria-label={t('readHighlightSource', { title: scene.highlight.text[language] })}
        onClick={(event) => onRead(scene.highlight.source, chapter.topic, scene.beatIndex, false, event.currentTarget)}>
        <span><SourceName source={scene.highlight.source.source} language={language} /></span>
        <ArrowUpRight size={18} className="directional" aria-hidden="true" />
      </button>
    </div>)}
    <div className="story-evidence-actions">
      <Button ref={toggle} variant="outline" className="story-evidence-toggle" aria-expanded={expanded} aria-controls={id}
        aria-label={t(expanded ? 'hideTopicNarrations' : 'showTopicNarrations', { topic })} onClick={() => reveal(!expanded)}>
        {t(expanded ? 'hideNarrations' : 'showNarrations')}
        <span>{number(displayedReports.length, language)}</span>
        {expanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
      </Button>
      {read > 0 && <span>{t('markedRead', { read: number(read, language), total: number(displayedReports.length, language) })}</span>}
    </div>
    {includeCautioned && !expanded && <p className="story-caution-notice">{t('chapterAllGradesNotice')}</p>}
    <div id={id} className="story-evidence" hidden={!expanded}>
      {expanded && <>
        <TopicReports chapter={chapter} language={language} includeCautioned={includeCautioned}
          onToggleCautioned={() => setIncludeCautioned((value) => !value)} savedIds={savedIds} onSave={onSave}
          onRead={(row, topic, include, button) => onRead(row, topic, scenes.length - 1, include, button)} />
        <Button variant="ghost" onClick={() => reveal(false)}>{t('hideNarrations')}<ChevronUp size={16} aria-hidden="true" /></Button>
      </>}
    </div>
  </section>
}
