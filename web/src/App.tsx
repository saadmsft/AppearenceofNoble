import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Bookmark, BookOpen, Check, ChevronRight, Info, Moon, Search, ShieldCheck, Sun, X } from 'lucide-react'
import { AboutFooter } from './components/Footer'
import { GuidePage, SourcesPage } from './components/AboutPages'
import { NarrationCard } from './components/NarrationCard'
import { ManuscriptHero } from './components/ManuscriptHero'
import { Reader } from './components/Reader'
import { Button } from './components/ui/button'
import { collectionLabels, topicLabels } from './lib/catalog.ts'
import { number, translate } from './lib/i18n.ts'
import type { MessageKey } from './lib/i18n.ts'
import { narrations } from './lib/library.ts'
import { loadPreferences, savePreferences } from './lib/preferences.ts'
import type { Preferences } from './lib/preferences.ts'
import { parseRoute, routeUrl } from './lib/route.ts'
import type { Route, View } from './lib/route.ts'
import { collections, grades, topics } from './lib/schema.ts'
import type { Language, Topic } from './lib/schema.ts'
import { defaultFilters, filterNarrations } from './lib/search.ts'

function initialSettings(): ReturnType<typeof loadPreferences> {
  const loaded = loadPreferences(() => window.localStorage)
  const theme = new URL(window.location.href).searchParams.get('scoutTheme')
  if (theme === 'light' || theme === 'dark') return { ...loaded, value: { ...loaded.value, theme } }
  return loaded
}

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'paused'
    ? 'instant'
    : 'smooth'
}

function scrollToCollection() {
  const heading = document.getElementById('collection-heading')
  heading?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
  heading?.focus({ preventScroll: true })
}

function App() {
  const [initial] = useState(initialSettings)
  const [preferences, setPreferences] = useState<Preferences>(initial.value)
  const [storageIssue, setStorageIssue] = useState(initial.issue)
  const [route, setRoute] = useState(() => parseRoute(new URL(window.location.href)))
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [limit, setLimit] = useState(12)
  const [notice, setNotice] = useState<{ key: MessageKey; version: number } | null>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const lastReadButton = useRef<HTMLButtonElement | null>(null)
  const language: Language = route.language ?? preferences.language
  const theme = preferences.theme === 'system' ? (systemDark ? 'dark' : 'light') : preferences.theme
  const t = (key: MessageKey, values?: Record<string, string | number>) => translate(language, key, values)
  const count = (value: number) => number(value, language)
  const savedIds = useMemo(() => new Set(preferences.bookmarks), [preferences.bookmarks])
  const savedCount = narrations.filter((row) => savedIds.has(row.id)).length
  const isSavedView = route.view === 'saved'
  const results = filterNarrations(narrations, route, isSavedView ? savedIds : undefined)
  const topicResults = filterNarrations(narrations, { ...route, topic: 'all' }, isSavedView ? savedIds : undefined)
  const selected = narrations.find((row) => row.id === route.entry)
  const selectedIndex = results.findIndex((row) => row.id === route.entry)
  const featured = narrations.find((row) => row.source.url === 'https://sunnah.com/bukhari:3552')

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
    document.title = `${translate(language, 'name')} | ${translate(language, route.view === 'saved' ? 'saved' : route.view === 'guide' ? 'guide' : route.view === 'sources' ? 'sources' : 'strapline')}`
  }, [language, theme, route.view, preferences.motion])

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
    if (Object.keys(patch).some((key) => ['query', 'topic', 'collection', 'grade', 'view'].includes(key))) setLimit(12)
  }

  function updatePreferences(patch: Partial<Preferences>) {
    const next = { ...preferences, ...patch }
    setPreferences(next)
    setStorageIssue(savePreferences(() => window.localStorage, next))
  }

  function toggleSaved(id: string) {
    const alreadySaved = savedIds.has(id)
    updatePreferences({ bookmarks: alreadySaved ? preferences.bookmarks.filter((item) => item !== id) : [...preferences.bookmarks, id] })
    setNotice((current) => ({ key: alreadySaved ? 'removedStatus' : 'savedStatus', version: (current?.version ?? 0) + 1 }))
  }

  function setLanguage(next: Language) {
    updatePreferences({ language: next })
    updateRoute({ language: next }, true)
  }

  function navigate(view: View, topic?: Topic) {
    updateRoute({ ...defaultFilters, view, topic: topic ?? 'all', grade: view === 'saved' || topic ? 'all' : 'established', entry: null })
    window.scrollTo({ top: 0 })
  }

  function navHref(view: View) {
    return routeUrl(new URL(window.location.href), { ...route, ...defaultFilters, view, grade: view === 'saved' ? 'all' : 'established', entry: null }).href
  }

  function resetFilters() {
    updateRoute({ ...defaultFilters, grade: isSavedView ? 'all' : 'established' })
  }

  return <div className="app-shell" lang={language}>
    <a className="skip-link" href="#main-content">{t('skip')}</a>
    <header className="site-header">
      <div className="header-inner page-width">
        <a href={navHref('collection')} className="brand" onClick={(event) => {
          if (!event.metaKey && !event.ctrlKey) { event.preventDefault(); navigate('collection') }
        }}>
          <span className="brand-mark" aria-hidden="true"><BookOpen size={22} /></span>
          <span><strong>{t('name')}</strong><small>{t('strapline')}</small></span>
        </a>
        <nav className="primary-nav" aria-label={t('collection')}>
          {(['collection', 'guide', 'sources'] as const).map((view) => <a key={view} href={navHref(view)}
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
      {route.view === 'collection' && <ManuscriptHero language={language} entryCount={narrations.length} topicCount={topics.length}
        featured={featured} paused={preferences.motion === 'paused'} readerOpen={route.entry !== null} guideHref={navHref('guide')}
        onExplore={scrollToCollection} onGuide={() => navigate('guide')}
        onPause={() => updatePreferences({ motion: preferences.motion === 'paused' ? 'auto' : 'paused' })}
        onFeatured={(row, button) => { lastReadButton.current = button; updateRoute({ entry: row.id }) }} />}

      {(route.view === 'collection' || isSavedView) && <section className="library-section page-width">
        <header className="collection-heading">
          <h2 id="collection-heading" tabIndex={-1}>{t(isSavedView ? 'savedTitle' : 'browseTitle')}<span className="heading-flower" aria-hidden="true" /></h2>
          <div><p>{t(isSavedView ? 'savedDescription' : 'browseDescription')}</p>
            <span className="collection-language-note"><span lang="en">English</span><span aria-hidden="true">/</span><span lang="ur">اردو</span></span>
          </div>
        </header>
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
              {topics.map((topic) => <button type="button" key={topic} aria-pressed={route.topic === topic} onClick={() => updateRoute({ topic })}>
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
      {route.view === 'sources' && <SourcesPage language={language} onTopic={(topic) => navigate('collection', topic)} />}
    </main>
    <AboutFooter language={language} onGuide={() => navigate('guide')} onSources={() => navigate('sources')} />
    <div className={`reading-status ${notice ? 'visible' : ''}`} role="status" aria-live="polite">
      {notice && <><Check size={17} aria-hidden="true" />{t(notice.key)}</>}
    </div>
    <Reader entry={route.entry} row={selected} language={language} preferences={preferences} saved={selected ? savedIds.has(selected.id) : false}
      previous={selectedIndex > 0 ? results[selectedIndex - 1] : undefined}
      next={selectedIndex >= 0 ? results[selectedIndex + 1] : undefined}
      onSave={() => { if (selected) toggleSaved(selected.id) }}
      onClose={() => updateRoute({ entry: null })}
      onNavigate={(entry) => updateRoute({ entry })}
      onPreferences={updatePreferences}
      restoreFocus={() => {
        if (lastReadButton.current?.isConnected) lastReadButton.current.focus({ preventScroll: true })
        else (document.getElementById('collection-heading') ?? document.getElementById('main-content'))?.focus({ preventScroll: true })
      }} />
    <button className="back-top button button-ghost button-icon" type="button" aria-label={t('backTop')} onClick={() => {
      window.scrollTo({ top: 0, behavior: scrollBehavior() })
      document.getElementById('main-content')?.focus({ preventScroll: true })
    }}><ArrowUp size={17} aria-hidden="true" /></button>
  </div>
}

export default App
