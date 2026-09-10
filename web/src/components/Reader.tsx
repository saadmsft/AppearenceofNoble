import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Bookmark, Check, Copy, ExternalLink, Info, Languages } from 'lucide-react'
import type { Language, Narration } from '../lib/schema.ts'
import type { Preferences } from '../lib/preferences.ts'
import { topicLabels } from '../lib/catalog.ts'
import { date, translate } from '../lib/i18n.ts'
import { isEstablished } from '../lib/search.ts'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog'
import { GradeBadge, SourceName } from './NarrationCard'

type ReaderProps = {
  entry: string | null
  row: Narration | undefined
  language: Language
  preferences: Preferences
  saved: boolean
  previous: Narration | undefined
  next: Narration | undefined
  onSave: () => void
  onClose: () => void
  onNavigate: (id: string) => void
  onPreferences: (patch: Partial<Preferences>) => void
  restoreFocus: () => void
}

export function Reader(props: ReaderProps) {
  return <Dialog open={props.entry !== null} onOpenChange={(open) => { if (!open) props.onClose() }}>
    <DialogContent closeLabel={translate(props.language, 'close')} dir={props.language === 'ur' ? 'rtl' : 'ltr'}
      lang={props.language} data-text-size={props.preferences.textSize}
      onCloseAutoFocus={(event) => { event.preventDefault(); props.restoreFocus() }}>
      <ReaderBody key={props.entry} {...props} />
    </DialogContent>
  </Dialog>
}

function ReaderBody({ row, language, preferences, saved, previous, next, onSave, onClose, onNavigate, onPreferences }: ReaderProps) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
    document.querySelector('.dialog-content')?.scrollTo({ top: 0 })
  }, [row?.id])

  async function copyLink() {
    if (!navigator.clipboard?.writeText) {
      setCopyState('failed')
      return
    }
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopyState('copied')
    } catch (error) {
      if (!(error instanceof DOMException)) throw error
      setCopyState('failed')
    }
  }

  function navigate(id: string) {
    onNavigate(id)
  }

  if (!row) return <div className="reader-missing">
    <Info size={32} aria-hidden="true" />
    <DialogTitle>{t('notFound')}</DialogTitle>
    <DialogDescription>{t('notFoundDetail')}</DialogDescription>
    <Button onClick={onClose}>{t('backCollection')}</Button>
  </div>

  const primaryLanguage: Language = language
  const secondaryLanguage: Language = language === 'en' ? 'ur' : 'en'
  const displayedLanguages = preferences.bilingual ? [primaryLanguage, secondaryLanguage] : [primaryLanguage]

  return <>
    <div className="reader-heading">
      <p className="eyebrow">{t('reader')}</p>
      <div className="reader-meta">
        <span className="source-name"><SourceName source={row.source} language={language} /></span>
        <GradeBadge row={row} language={language} />
      </div>
      <DialogTitle asChild><h2 ref={heading} tabIndex={-1}>{row.title[language]}</h2></DialogTitle>
      <p className="narrator"><span>{t('narratedBy')}</span> {row.narrator[language]}</p>
      <div className="topic-tags">{row.topics.map((topic) => <span key={topic}>{topicLabels[topic][language]}</span>)}</div>
      <DialogDescription className="reader-disclaimer">{t('translationNotice')}</DialogDescription>
    </div>
    <div className="reader-toolbar">
      <Button size="sm" variant="outline" onClick={() => onPreferences({ bilingual: !preferences.bilingual })} aria-pressed={preferences.bilingual}>
        <Languages size={16} aria-hidden="true" />{t('bothLanguages')}
      </Button>
      <label className="text-size-control"><span className="sr-only">{t('textSize')}</span>
        <select value={preferences.textSize} onChange={(event) => {
          const size = event.target.value
          if (size === 'normal' || size === 'large' || size === 'larger') onPreferences({ textSize: size })
        }}>
          <option value="normal">{t('normalSize')}</option>
          <option value="large">{t('largeSize')}</option>
          <option value="larger">{t('largerSize')}</option>
        </select>
      </label>
      <Button size="icon" variant="ghost" onClick={onSave} aria-pressed={saved} className={saved ? 'is-saved' : ''} aria-label={translate(language, saved ? 'unsave' : 'save', { title: row.title[language] })}>
        {saved ? <Check size={18} aria-hidden="true" /> : <Bookmark size={18} aria-hidden="true" />}
      </Button>
    </div>
    <div className="reader-body">
      {!isEstablished(row) && <aside className="caution-panel" role="note">
        <Info size={20} aria-hidden="true" />
        <div><h3>{t('cautionTitle')}</h3><p>{t('cautionDetail')}</p></div>
      </aside>}
      <section className="reader-arabic">
        <h3 className="micro-label">{t('arabicExcerpt')}</h3>
        <p className="arabic" lang="ar" dir="rtl">{row.arabic}</p>
      </section>
      <details className="full-arabic">
        <summary>{t('fullArabic')}</summary>
        <p className="full-arabic-notice">{t('fullArabicNotice')}</p>
        <p className="arabic" lang="ar" dir="rtl" data-full-arabic>{row.arabicFull}</p>
      </details>
      {displayedLanguages.map((lang) => <section className="meaning-section" key={lang} lang={lang} dir={lang === 'ur' ? 'rtl' : 'ltr'}>
        <h3 className="micro-label">{translate(lang, lang === 'en' ? 'englishMeaning' : 'urduMeaning')}</h3>
        <p>{row.summary[lang]}</p>
        <aside className="context-note">
          <h4>{translate(lang, 'context')}</h4><p>{row.context[lang]}</p>
        </aside>
      </section>)}
      <section className="attribution-section">
        <h3>{t('grading')}</h3>
        <p>{row.grade.attribution[language]}</p>
      </section>
      <section className="reference-panel">
        <div><h3 className="micro-label">{t('primarySource')}</h3>
          <a href={row.source.url} target="_blank" rel="noopener noreferrer" className="source-link">
            <SourceName source={row.source} language={language} /><ExternalLink size={15} aria-hidden="true" />
          </a>
        </div>
        <a href={row.source.url} target="_blank" rel="noopener noreferrer" className="text-link">{t('openSource')}<ArrowRight size={15} className="directional" aria-hidden="true" /></a>
        {row.relatedSources.length > 0 && <div className="related-sources">
          <h4>{t('related')}</h4>
          <div>{row.relatedSources.map((source) => <a href={source.url} target="_blank" rel="noopener noreferrer" key={source.url}>
            <SourceName source={source} language={language} /><ExternalLink size={12} aria-hidden="true" />
          </a>)}</div>
          <p>{t('relatedNotice')}</p>
        </div>}
        <p className="source-date">{t('checked')}: {date(row.checkedAt, language)}</p>
      </section>
      <div className="share-row">
        <Button variant="outline" size="sm" onClick={() => { void copyLink() }}><Copy size={15} aria-hidden="true" />{t('copyLink')}</Button>
        <p role="status">{copyState === 'copied' ? t('copied') : copyState === 'failed' ? t('copyFailed') : ''}</p>
        {copyState === 'failed' && <input readOnly dir="ltr" aria-label={t('shareLink')} value={window.location.href} onFocus={(event) => event.target.select()} />}
      </div>
    </div>
    <div className="reader-navigation">
      <Button variant="ghost" disabled={!previous} onClick={() => { if (previous) navigate(previous.id) }}><ArrowLeft size={16} className="directional" aria-hidden="true" />{t('previous')}</Button>
      <Button variant="ghost" disabled={!next} onClick={() => { if (next) navigate(next.id) }}>{t('next')}<ArrowRight size={16} className="directional" aria-hidden="true" /></Button>
    </div>
  </>
}
