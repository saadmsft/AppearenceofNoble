import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Bookmark, BookOpen, Check, ChevronRight, Info, Moon, Search, ShieldCheck, Sun, X } from 'lucide-react'
import { AboutFooter } from './components/Footer'
import { GuidePage, SourcesPage } from './components/AboutPages'
import { NarrationCard } from './components/NarrationCard'
import { ManuscriptHero } from './components/ManuscriptHero'
import { TopicJourney } from './components/TopicJourney'
import { StoryExperience } from './components/StoryExperience'
import { ShelfSelector } from './components/ShelfSelector'
import { ProjectHome } from './components/ProjectHome'
import { ReadingPage } from './components/ReadingPage'
import { ReadingIssueMessage, ReadingTools } from './components/ReadingTools'
import { useReading } from './hooks/useReading'
import type { BookmarkWriteResult } from './lib/reading.ts'
import { Reader } from './components/Reader'
import { AudioPlayer } from './components/AudioPlayer'
import { Button } from './components/ui/button'
import { collectionLabels, shelfLabels, topicLabels } from './lib/catalog.ts'
import { chapters, characterChapters } from './lib/chapters.ts'
import { number, translate } from './lib/i18n.ts'
import type { MessageKey } from './lib/i18n.ts'
import { getNarrationShelf, getShelfRows, getShelfTopics, narrations } from './lib/library.ts'
import { loadPreferences, savePreferences } from './lib/preferences.ts'
import type { Preferences } from './lib/preferences.ts'
import { parseRoute, routeUrl } from './lib/route.ts'
import type { Route, View } from './lib/route.ts'
import { characterTopics, collections, grades } from './lib/schema.ts'
import type { Language, Narration, Shelf, Topic } from './lib/schema.ts'
import { defaultFilters, filterNarrations } from './lib/search.ts'
import { focusSection, scrollBehavior } from './lib/scroll.ts'

function initialSettings(): ReturnType<typeof loadPreferences> {
  const loaded = loadPreferences(() => window.localStorage)
  const theme = new URL(window.location.href).searchParams.get('scoutTheme')
  if (theme === 'light' || theme === 'dark') return { ...loaded, value: { ...loaded.value, theme } }
  return loaded
}

function App() {
  const [initial] = useState(initialSettings)
  const [preferences, setPreferences] = useState<Preferences>(initial.value)
  const [storageIssue, setStorageIssue] = useState(initial.issue)
  const [route, setRoute] = useState(() => parseRoute(new URL(window.location.href)))
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [limit, setLimit] = useState(12)
  const [notice, setNotice] = useState<{ key: MessageKey; version: number } | null>(null)
  const reading = useReading(narrations)
  const { openEntry: trackOpenedEntry } = reading
  const searchInput = useRef<HTMLInputElement>(null)
  const lastReadButton = useRef<HTMLButtonElement | null>(null)
  const language: Language = route.language ?? preferences.language
  const theme = preferences.theme === 'system' ? (systemDark ? 'dark' : 'light') : preferences.theme
  const t = (key: MessageKey, values?: Record<string, string | number>) => translate(language, key, values)
  const count = (value: number) => number(value, language)
  const savedIds = useMemo(() => new Set(preferences.bookmarks), [preferences.bookmarks])
  const savedCount = narrations.filter((row) => savedIds.has(row.id)).length
  const isSavedView = route.view === 'saved'
  const scopedRows = getShelfRows(route.shelf)
  const visibleTopics = getShelfTopics(route.shelf)
  const journeyShelf = route.shelf === 'character' ? 'character' : 'appearance'
  const activeChapters = journeyShelf === 'character' ? characterChapters : chapters
  const results = filterNarrations(scopedRows, route, isSavedView ? savedIds : undefined)
  const topicResults = filterNarrations(scopedRows, { ...route, topic: 'all' }, isSavedView ? savedIds : undefined)
  const selected = narrations.find((row) => row.id === route.entry)
  const selectedId = selected?.id
  const readIds = useMemo(() => new Set(Object.entries(reading.data.entries).filter(([, value]) => value.read === true).map(([id]) => id)), [reading.data.entries])
  const lastOpened = narrations.find((row) => row.id === reading.data.lastOpened?.id)
  const selectedShelf = selected ? getNarrationShelf(selected.id) : undefined
  const readerResults = selectedShelf && (route.view === 'home' || route.view === 'reading')
    ? filterNarrations(getShelfRows(selectedShelf), defaultFilters)
    : results
  const selectedIndex = readerResults.findIndex((row) => row.id === route.entry)

  useEffect(() => {
    if (selectedId) trackOpenedEntry(selectedId)
  }, [selectedId, trackOpenedEntry])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onTheme = () => setSystemDark(media.matches)
    media.addEventListener('change', onTheme)
    const onNavigation = () => {
      setRoute(parseRoute(new URL(window.location.href)))
      setLimit(12)
    }
    window.addEventListener('popstate', onNavigation)
    window.addEventListener('hashchange', onNavigation)
    return () => {
      media.removeEventListener('change', onTheme)
      window.removeEventListener('popstate', onNavigation)
      window.removeEventListener('hashchange', onNavigation)
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr'
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.motion = preferences.motion
    document.title = `${translate(language, 'name')} | ${route.view === 'journey' || route.view === 'story' ? shelfLabels[journeyShelf][language] : translate(language, route.view === 'saved' ? 'saved' : route.view === 'reading' ? 'reading' : route.view === 'guide' ? 'guide' : route.view === 'sources' ? 'sources' : 'strapline')}`
  }, [language, theme, route.view, journeyShelf, preferences.motion])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !route.entry && searchInput.current) {
        event.preventDefault()
        searchInput.current.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [route.entry])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(null), 3500)
    return () => window.clearTimeout(timeout)
  }, [notice])

  function updateRoute(patch: Partial<Route>, replace = false) {
    const next = { ...route, ...patch }
    const url = routeUrl(new URL(window.location.href), next)
    if (replace) window.history.replaceState(null, '', url)
    else window.history.pushState(null, '', url)
    setRoute(next)
    if (Object.keys(patch).some((key) => ['query', 'topic', 'collection', 'grade', 'view', 'shelf'].includes(key))) setLimit(12)
  }

  function updatePreferences(patch: Partial<Preferences>) {
    const next = { ...preferences, ...patch }
    setPreferences(next)
    const issue = savePreferences(() => window.localStorage, next)
    setStorageIssue(issue)
    return issue === null
  }

  function toggleSaved(id: string) {
    const alreadySaved = savedIds.has(id)
    updatePreferences({ bookmarks: alreadySaved ? preferences.bookmarks.filter((item) => item !== id) : [...preferences.bookmarks, id] })
    setNotice((current) => ({ key: alreadySaved ? 'removedStatus' : 'savedStatus', version: (current?.version ?? 0) + 1 }))
  }

  function restoreBookmarks(bookmarks: string[]): BookmarkWriteResult {
    const next = { ...preferences, bookmarks: [...new Set(bookmarks)] }
    const issue = savePreferences(() => window.localStorage, next)
    setStorageIssue(issue)
    if (issue) return { ok: false }
    setPreferences(next)
    return { ok: true }
  }

  function openPersonalEntry(row: Narration, button: HTMLButtonElement) {
    const shelf = getNarrationShelf(row.id)
    if (!shelf) throw new Error(`Cannot open an unknown collection entry: ${row.id}`)
    lastReadButton.current = button
    updateRoute({ ...defaultFilters, shelf, storyBeat: 0, entry: row.id })
  }

  function readingCollectionLabel(id: string, lang: Language) {
    const shelf = getNarrationShelf(id)
    return shelf ? shelfLabels[shelf][lang] : translate(lang, 'notFound')
  }

  function setLanguage(next: Language) {
    updatePreferences({ language: next })
    updateRoute({ language: next }, true)
  }

  function navigate(view: View, topic?: Topic, shelf: Shelf | 'all' = view === 'journey' || view === 'story' ? 'appearance' : 'all') {
    updateRoute({ ...defaultFilters, view, shelf, topic: topic ?? 'all', storyBeat: 0, grade: view === 'saved' || (view === 'collection' && topic) ? 'all' : 'established', entry: null })
    window.scrollTo({ top: 0 })
  }

  function navHref(view: View, shelf: Shelf | 'all' = view === 'journey' || view === 'story' ? 'appearance' : 'all') {
    return routeUrl(new URL(window.location.href), { ...route, ...defaultFilters, view, shelf, storyBeat: 0, grade: view === 'saved' ? 'all' : 'established', entry: null }).href
  }

  function resetFilters() {
    updateRoute({ ...defaultFilters, grade: isSavedView ? 'all' : 'established' })
  }

  return <div className="app-shell" lang={language}>
    <a className="skip-link" href="#main-content">{t('skip')}</a>
    <header className="site-header">
      <div className="header-inner page-width">
        <a href={navHref('home')} className="brand" onClick={(event) => {
          if (!event.metaKey && !event.ctrlKey) { event.preventDefault(); navigate('home') }
        }}>
          <span className="brand-mark" aria-hidden="true"><BookOpen size={22} /></span>
          <span><strong>{t('name')}</strong><small>{t('strapline')}</small></span>
        </a>
        <nav className="primary-nav" aria-label={t('collection')}>
          {(['home', 'collection', 'reading', 'guide', 'sources'] as const).map((view) => <a key={view} href={navHref(view)}
            aria-current={route.view === view ? 'page' : undefined}
            onClick={(event) => { if (!event.metaKey && !event.ctrlKey) { event.preventDefault(); navigate(view) } }}>
            {t(view)}
          </a>)}
        </nav>
        <div className="header-actions">
          <a className={`saved-nav button button-ghost button-icon ${isSavedView ? 'is-saved' : ''}`} href={navHref('saved')} aria-label={`${t('saved')} (${count(savedCount)})`}
            aria-current={isSavedView ? 'page' : undefined}
            onClick={(event) => { if (!event.metaKey && !event.ctrlKey) { event.preventDefault(); navigate('saved') } }}>
            <Bookmark size={18} aria-hidden="true" />
            {savedCount > 0 && <span className="saved-count">{count(savedCount)}</span>}
          </a>
          <Button variant="ghost" size="icon" aria-label={t(theme === 'dark' ? 'light' : 'dark')} onClick={() => {
            const url = new URL(window.location.href)
            url.searchParams.delete('scoutTheme')
            window.history.replaceState(null, '', url)
            updatePreferences({ theme: theme === 'dark' ? 'light' : 'dark' })
          }}>
            {theme === 'dark' ? <Sun size={19} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </Button>
          <div className="language-switch" role="group" aria-label="Language / زبان">
            <button type="button" lang="en" dir="ltr" onClick={() => setLanguage('en')} aria-pressed={language === 'en'} aria-label="English">EN</button>
            <button type="button" lang="ur" dir="rtl" onClick={() => setLanguage('ur')} aria-pressed={language === 'ur'} aria-label="اردو">اردو</button>
          </div>
        </div>
      </div>
    </header>

    {storageIssue && <aside className="storage-notice page-width" role="alert">
      <Info size={18} aria-hidden="true" /><p>{t(storageIssue === 'unavailable' ? 'storageUnavailable' : 'storageInvalid')}</p>
      <Button variant="ghost" size="icon" aria-label={t('dismiss')} onClick={() => setStorageIssue(null)}><X size={17} aria-hidden="true" /></Button>
    </aside>}

    <main id="main-content" tabIndex={-1}>
      {route.view === 'home' && <>
        {reading.issue && <div className="page-width"><ReadingIssueMessage issue={reading.issue} language={language} /></div>}
        <ProjectHome language={language} paused={preferences.motion === 'paused'} readerOpen={route.entry !== null}
          readIds={readIds} lastOpened={lastOpened} onShelf={(shelf) => navigate('story', undefined, shelf)} onResume={openPersonalEntry}
          onPause={() => updatePreferences({ motion: preferences.motion === 'paused' ? 'auto' : 'paused' })} />
      </>}
      {route.view === 'reading' && <ReadingPage language={language} allNarrations={narrations} reading={reading}
        bookmarks={preferences.bookmarks} onBookmarksChange={restoreBookmarks} onOpen={openPersonalEntry} getCollectionLabel={readingCollectionLabel} />}
      {(route.view === 'journey' || route.view === 'story') &&
        <div className="journey-collection-switch page-width">
          <p>{t('collectionContext')}</p>
          <ShelfSelector value={journeyShelf} language={language} allowAll={false} onChange={(shelf) => {
            if (shelf === 'all') throw new Error('A journey requires a single project collection')
            navigate(route.view, undefined, shelf)
          }} />
          {route.view === 'journey' && <button type="button" className="story-mode-link" onClick={() => navigate('story', route.topic === 'all' ? undefined : route.topic, journeyShelf)}>
            {t('storyView')}<BookOpen size={15} aria-hidden="true" />
          </button>}
        </div>
      }
      {route.view === 'story' && <StoryExperience key={`story-${journeyShelf}`} shelf={journeyShelf} language={language}
        chapters={activeChapters} requestedTopic={route.topic} requestedBeat={route.storyBeat}
        paused={preferences.motion === 'paused'} readerOpen={route.entry !== null}
        savedIds={savedIds} readIds={readIds} onSave={toggleSaved}
        onPause={() => updatePreferences({ motion: preferences.motion === 'paused' ? 'auto' : 'paused' })}
        onNavigate={(topic, storyBeat) => updateRoute({ topic, storyBeat })}
        onReadingView={(topic) => {
          navigate('journey', topic, journeyShelf)
          requestAnimationFrame(() => focusSection(`chapter-${topic}`))
        }}
        onCollection={() => navigate('collection', undefined, journeyShelf)}
        onRead={(row, topic, storyBeat, includeCautioned, button) => {
          lastReadButton.current = button
          updateRoute({ ...defaultFilters, view: 'story', shelf: journeyShelf, topic, storyBeat, grade: includeCautioned ? 'all' : 'established', entry: row.id })
        }} />}
      {route.view === 'journey' && <>
        <ManuscriptHero key={`hero-${journeyShelf}`} language={language} shelf={journeyShelf} entryCount={getShelfRows(journeyShelf).length} topicCount={activeChapters.length}
          paused={preferences.motion === 'paused'} readerOpen={route.entry !== null} guideHref={navHref('guide')}
          onExplore={() => focusSection(`chapter-${activeChapters[0].topic}`)} onGuide={() => navigate('guide')}
          onPause={() => updatePreferences({ motion: preferences.motion === 'paused' ? 'auto' : 'paused' })} />
        <TopicJourney key={`chapters-${journeyShelf}`} language={language} shelf={journeyShelf} chapters={activeChapters} paused={preferences.motion === 'paused'} readerOpen={route.entry !== null}
          savedIds={savedIds} readIds={readIds} collectionHref={navHref('collection', journeyShelf)} onCollection={() => navigate('collection', undefined, journeyShelf)}
          onPause={() => updatePreferences({ motion: preferences.motion === 'paused' ? 'auto' : 'paused' })} onSave={toggleSaved}
          onRead={(row, topic, includeCautioned, button) => {
            lastReadButton.current = button
            updateRoute({ ...defaultFilters, view: 'journey', shelf: journeyShelf, topic, grade: includeCautioned ? 'all' : 'established', entry: row.id })
          }} />
      </>}

      {(route.view === 'collection' || isSavedView) && <section className="library-section page-width">
        <header className="collection-heading">
          <h1 id="collection-heading" tabIndex={-1}>{t(isSavedView ? 'savedTitle' : 'browseTitle')}<span className="heading-flower" aria-hidden="true" /></h1>
          <div><p>{t(isSavedView ? 'savedDescription' : 'browseDescription')}</p>
            <span className="collection-language-note"><span lang="en">English</span><span aria-hidden="true">/</span><span lang="ur">اردو</span></span>
          </div>
        </header>
        <ShelfSelector value={route.shelf} language={language} onChange={(shelf) => updateRoute({ ...defaultFilters, shelf, grade: isSavedView ? 'all' : 'established' })} />
        <div className="filter-panel">
          <div className="search-field">
            <label htmlFor="narration-search" className="sr-only">{t('search')}</label>
            <Search size={20} aria-hidden="true" />
            <input id="narration-search" ref={searchInput} type="search" value={route.query} maxLength={300}
              autoComplete="off" placeholder={t('searchPlaceholder')} dir="auto"
              onChange={(event) => updateRoute({ query: event.target.value }, true)} aria-describedby="search-hint" />
            {route.query ? <button type="button" aria-label={t('clearSearch')} onClick={() => { updateRoute({ query: '' }, true); searchInput.current?.focus() }}><X size={18} aria-hidden="true" /></button> : <kbd aria-hidden="true">⌘ K</kbd>}
          </div>
          <label className="filter-select"><span>{t('gradeFilter')}</span>
            <select value={route.grade} onChange={(event) => {
              const value = event.target.value
              if (value === 'all' || value === 'established' || grades.some((grade) => grade === value)) {
                const parsed = parseRoute(new URL(`?grade=${encodeURIComponent(value)}`, window.location.href))
                updateRoute({ grade: parsed.grade })
              }
            }}>
              <option value="established">{t('established')}</option><option value="all">{t('allGrades')}</option>
              <option value="sahih">{t('sahihOnly')}</option><option value="hasan">{t('hasanOnly')}</option>
              <option value="weak">{t('weakOnly')}</option><option value="disputed">{t('disputedOnly')}</option><option value="ungraded">{t('ungradedOnly')}</option>
            </select>
          </label>
          <label className="filter-select"><span>{t('sourceFilter')}</span>
            <select value={route.collection} onChange={(event) => {
              const value = event.target.value
              if (value === 'all' || collections.some((collection) => collection === value)) {
                const parsed = parseRoute(new URL(`?source=${encodeURIComponent(value)}`, window.location.href))
                updateRoute({ collection: parsed.collection })
              }
            }}>
              <option value="all">{t('allSources')}</option>
              {collections.map((collection) => <option value={collection} key={collection}>{collectionLabels[collection][language]}</option>)}
            </select>
          </label>
        </div>
        <div className="filter-explanation">
          <p id="search-hint">{t('searchHint')}</p>
          {route.grade === 'established' && <p><ShieldCheck size={14} aria-hidden="true" />{t('cautionHidden')} <button type="button" className="inline-link" onClick={() => updateRoute({ grade: 'all' })}>{t('includeCautioned')}</button></p>}
        </div>

        <div className="library-layout">
          <aside className="topic-sidebar">
            <p className="micro-label">{t('browseTopics')}</p>
            <nav className="topic-nav" aria-label={t('browseTopics')}>
              <button type="button" aria-pressed={route.topic === 'all'} onClick={() => updateRoute({ topic: 'all' })}>
                <BookOpen size={16} aria-hidden="true" /><span>{t('allTopics')}</span><small>{count(topicResults.length)}</small>
              </button>
              {visibleTopics.map((topic) => <button type="button" key={topic} aria-pressed={route.topic === topic} onClick={() => updateRoute({ topic })}>
                <span className="topic-indicator" aria-hidden="true" /><span>{topicLabels[topic][language]}</span><small>{count(topicResults.filter((row) => row.topics.includes(topic)).length)}</small>
              </button>)}
            </nav>
            <div className="sidebar-note"><span className="tiny-ornament" aria-hidden="true" /><h3>{t('noImages')}</h3><p>{t('noImagesDetail')}</p></div>
          </aside>
          <div className="collection-results">
            <div className="results-heading">
              <h3>{route.topic === 'all' ? t('allTopics') : topicLabels[route.topic][language]}<ChevronRight size={14} className="directional" aria-hidden="true" /></h3>
              <p role="status" aria-live="polite">{t('results', { count: count(results.length) })}</p>
              {(route.query || route.topic !== 'all' || route.collection !== 'all' || route.grade !== (isSavedView ? 'all' : 'established')) &&
                <button type="button" className="inline-link reset-link" onClick={resetFilters}>{t('reset')}</button>}
            </div>
            {results.length === 0 ? <div className="empty-state">
              {isSavedView ? <Bookmark size={36} aria-hidden="true" /> : <Search size={36} aria-hidden="true" />}
              <h3>{t(isSavedView ? (savedCount ? 'savedFiltered' : 'emptySaved') : 'noResults')}</h3>
              <p>{t(isSavedView ? (savedCount ? 'savedFilteredDetail' : 'emptySavedDetail') : 'noResultsDetail')}</p>
              <Button variant="outline" onClick={isSavedView && !savedCount ? () => navigate('collection') : resetFilters}>
                {t(isSavedView && !savedCount ? 'explore' : 'reset')}
              </Button>
            </div> : <>
              <div className="narration-grid">{results.slice(0, limit).map((row, index) => <NarrationCard key={row.id} row={row} language={language}
                featured={index === 0 && !isSavedView && route.topic === 'all' && !route.query && route.collection === 'all' && route.grade === 'established'}
                saved={savedIds.has(row.id)} onSave={() => toggleSaved(row.id)}
                onRead={(button) => { lastReadButton.current = button; updateRoute({ entry: row.id }) }} />)}</div>
              <div className="pagination">
                <p>{t('shown', { shown: count(Math.min(limit, results.length)), total: count(results.length) })}</p>
                {limit < results.length
                  ? <Button variant="outline" onClick={() => setLimit((value) => value + 12)}>{t('loadMore')}<ArrowDown size={15} aria-hidden="true" /></Button>
                  : <span>{t('endOfResults')}</span>}
              </div>
            </>}
          </div>
        </div>
      </section>}
      {route.view === 'guide' && <GuidePage language={language} />}
      {route.view === 'sources' && <SourcesPage language={language} shelf={route.shelf} onShelf={(shelf) => updateRoute({ shelf })}
        onTopic={(topic) => navigate('collection', topic, characterTopics.some((item) => item === topic) ? 'character' : 'appearance')} />}
    </main>
    <AboutFooter language={language} onJourney={() => navigate('journey')} onGuide={() => navigate('guide')} onSources={() => navigate('sources')} />
    <div className={`reading-status ${notice ? 'visible' : ''}`} role="status" aria-live="polite">
      {notice && <><Check size={17} aria-hidden="true" />{t(notice.key)}</>}
    </div>
    <Reader entry={route.entry} row={selected} language={language} preferences={preferences} saved={selected ? savedIds.has(selected.id) : false}
      previous={selectedIndex > 0 ? readerResults[selectedIndex - 1] : undefined}
      next={selectedIndex >= 0 ? readerResults[selectedIndex + 1] : undefined}
      collectionLabel={selectedShelf ? shelfLabels[selectedShelf][language] : undefined}
      audioContent={selected ? <AudioPlayer entryId={selected.id} language={language} /> : undefined}
      readingContent={selected ? <ReadingTools row={selected} language={language} reading={reading} /> : undefined}
      onSave={() => { if (selected) toggleSaved(selected.id) }}
      onClose={() => updateRoute({ entry: null })}
      onNavigate={(entry) => updateRoute({ entry })}
      onPreferences={updatePreferences}
      restoreFocus={() => {
        if (lastReadButton.current?.isConnected) lastReadButton.current.focus({ preventScroll: true })
        else (document.getElementById('collection-heading') ?? document.getElementById('story-heading') ?? document.getElementById('journey-heading') ?? document.getElementById('main-content'))?.focus({ preventScroll: true })
      }} />
    <button className="back-top button button-ghost button-icon" type="button" aria-label={t('backTop')} onClick={() => {
      window.scrollTo({ top: 0, behavior: scrollBehavior() })
      document.getElementById('main-content')?.focus({ preventScroll: true })
    }}><ArrowUp size={17} aria-hidden="true" /></button>
  </div>
}

export default App
