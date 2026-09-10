import { useState } from 'react'
import { ArrowUpRight, BookOpen, Download, ExternalLink, ShieldCheck } from 'lucide-react'
import { collectionLabels, gradeLabels, topicLabels } from '../lib/catalog.ts'
import { date, number, translate } from '../lib/i18n.ts'
import { lastChecked, narrations, primarySourceCount } from '../lib/library.ts'
import { collections, grades, topics } from '../lib/schema.ts'
import type { Language } from '../lib/schema.ts'
import { isEstablished } from '../lib/search.ts'
import { Button } from './ui/button'
import { SourceName } from './NarrationCard'

export const repositoryUrl = 'https://github.com/saadmsft/AppearenceofNoble'
const correctionUrl = `${repositoryUrl}/issues/new?template=source-correction.yml`

export function EditorialNote({ language }: { language: Language }) {
  return <aside className="editorial-note">
    <ShieldCheck size={24} aria-hidden="true" />
    <div>
      <h3>{translate(language, 'editorialTitle')}</h3>
      <p>{translate(language, 'editorialDetail')}</p>
      <a href={correctionUrl} target="_blank" rel="noopener noreferrer" className="text-link">{translate(language, 'corrections')}<ArrowUpRight size={15} className="directional" aria-hidden="true" /></a>
    </div>
  </aside>
}

export function GuidePage({ language }: { language: Language }) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key)
  const sections = [
    ['guideOneTitle', 'guideOne'], ['guideTwoTitle', 'guideTwo'], ['guideThreeTitle', 'guideThree'],
    ['guideFourTitle', 'guideFour'], ['guideFiveTitle', 'guideFive'],
  ] as const
  const gradeDescriptions = { sahih: 'gradeSahih', hasan: 'gradeHasan', weak: 'gradeWeak', disputed: 'gradeDisputed', ungraded: 'gradeUngraded' } as const
  return <div className="about-page page-width">
    <header className="page-intro"><p className="eyebrow">{t('guideEyebrow')}</p><h1>{t('guideTitle')}</h1><p>{t('guideIntro')}</p></header>
    <div className="guide-steps">{sections.map(([title, body], index) => <section key={title} className="guide-step">
      <span className="step-number" aria-hidden="true">{number(index + 1, language).padStart(language === 'en' ? 2 : 1, '0')}</span>
      <div><h2>{t(title)}</h2><p>{t(body)}</p></div>
    </section>)}</div>
    <section className="grade-guide"><h2>{t('gradeKey')}</h2><div>{grades.map((grade) => <article key={grade}>
      <h3 className={`grade-badge ${grade === 'sahih' || grade === 'hasan' ? 'grade-established' : 'grade-caution'}`}>{gradeLabels[grade][language]}</h3>
      <p>{t(gradeDescriptions[grade])}</p>
    </article>)}</div></section>
    <EditorialNote language={language} />
  </div>
}

export function SourcesPage({ language, onTopic }: { language: Language; onTopic: (topic: typeof topics[number]) => void }) {
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string>) => translate(language, key, values)
  const [downloadError, setDownloadError] = useState(false)
  const references = [...new Map(narrations.flatMap((row) => [row.source, ...row.relatedSources]).map((source) => [source.url, source])).values()]
  const count = (value: number) => number(value, language)

  function downloadResearch() {
    let objectUrl: string | undefined
    try {
      const data = {
        title: 'The Noble Appearance',
        version: 1,
        lastChecked,
        scope: 'Selected reports from seven major Sunni collections. Not exhaustive across traditions or chains.',
        translationNotice: 'English and Urdu are original editorial summaries, not verbatim translations. arabic is an excerpt; arabicFull preserves the full primary report, including the chain and in-report compiler/transmitter remarks.',
        gradingNotice: 'The grade applies to the primary source, not automatically to related transmissions.',
        entries: narrations,
      }
      objectUrl = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }))
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = 'noble-appearance-research.json'
      anchor.click()
      setDownloadError(false)
    } catch (error) {
      if (!(error instanceof DOMException)) throw error
      setDownloadError(true)
    } finally {
      if (objectUrl) {
        const url = objectUrl
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    }
  }

  return <div className="about-page page-width">
    <header className="page-intro"><p className="eyebrow">{t('sourcesEyebrow')}</p><h1>{t('sourcesTitle')}</h1><p>{t('sourcesIntro')}</p></header>
    <div className="research-stats">
      <div><strong>{count(narrations.length)}</strong><span>{t('entries')}</span></div>
      <div><strong>{count(primarySourceCount)}</strong><span>{t('references')}</span></div>
      <div><strong>{date(lastChecked, language)}</strong><span>{t('checked')}</span></div>
    </div>
    <div className="scope-grid">
      <section><h2>{t('scopeTitle')}</h2><p>{t('scopeDetail')}</p></section>
      <section><h2>{t('limitsTitle')}</h2><p>{t('limitsDetail')}</p></section>
      <section><h2>{t('datesTitle')}</h2><p>{t('datesDetail')}</p></section>
    </div>
    <section className="coverage-section"><h2>{t('coverageTitle')}</h2><p>{t('coverageDetail')}</p>
      <div className="coverage-grid">{topics.map((topic) => {
        const rows = narrations.filter((row) => row.topics.includes(topic))
        return <button type="button" key={topic} onClick={() => onTopic(topic)}>
          <span>{topicLabels[topic][language]}</span><strong>{count(rows.length)}</strong>
          <small>{gradeLabels.sahih[language]} / {gradeLabels.hasan[language]}: {count(rows.filter(isEstablished).length)}</small>
        </button>
      })}</div>
    </section>
    <section className="source-index">
      <h2>{t('sourceIndex')}</h2><p>{t('sourceIndexDetail')}</p>
      {collections.map((collection) => {
        const collectionSources = references.filter((source) => source.collection === collection)
          .sort((a, b) => a.reference.localeCompare(b.reference, 'en', { numeric: true }))
        if (!collectionSources.length) return null
        const primaryEntries = narrations.filter((row) => row.source.collection === collection).length
        return <details key={collection}>
          <summary><BookOpen size={19} aria-hidden="true" /><span>{collectionLabels[collection][language]}</span>
            <small>{primaryEntries ? t('sourceEntries', { count: count(primaryEntries) }) : t('noPrimary')}</small>
          </summary>
          <div className="source-index-links">{collectionSources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">
            <SourceName source={source} language={language} /><ExternalLink size={13} aria-hidden="true" />
          </a>)}</div>
        </details>
      })}
    </section>
    <section className="export-panel"><Download size={28} aria-hidden="true" /><div>
      <h2>{t('export')}</h2><p>{t('exportDetail')}</p><small>{t('allData')}</small>
    </div><Button onClick={downloadResearch}><Download size={16} aria-hidden="true" />JSON</Button>
      {downloadError && <p role="alert">{t('downloadFailed')} <a href={`${repositoryUrl}/tree/main/content`}>{t('repository')}</a></p>}
      <div className="offline-download">
        <a className="button button-outline" href="./noble-appearance.html" download="noble-appearance.html"><Download size={16} aria-hidden="true" />{t('offlineDownload')}</a>
        <p>{t('offlineDetail')}</p>
      </div>
    </section>
    <EditorialNote language={language} />
    <p className="acknowledgments">{t('acknowledgments')}</p>
    <a className="text-link" href="https://saadmsft.github.io/AppearenceofNoble/THIRD-PARTY-NOTICES.txt" target="_blank" rel="noopener noreferrer">{t('licenses')}<ExternalLink size={14} aria-hidden="true" /></a>
  </div>
}
