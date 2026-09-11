import { ArrowUpRight, Bookmark, Check, CircleCheck, Info } from 'lucide-react'
import type { Language, Narration, Reference } from '../lib/schema.ts'
import { collectionLabels, gradeLabels } from '../lib/catalog.ts'
import { translate } from '../lib/i18n.ts'
import { isEstablished } from '../lib/search.ts'
import { Button } from './ui/button'

export function GradeBadge({ row, language }: { row: Narration; language: Language }) {
  const established = isEstablished(row)
  const Icon = established ? CircleCheck : Info
  return <span className={`grade-badge ${established ? 'grade-established' : 'grade-caution'}`}>
    <Icon size={13} aria-hidden="true" />{gradeLabels[row.grade.level][language]}
  </span>
}

export function SourceName({ source, language }: { source: Reference; language: Language }) {
  return <>{collectionLabels[source.collection][language]} <bdi className="reference-number">{source.reference}</bdi></>
}

type CardProps = {
  row: Narration
  language: Language
  saved: boolean
  featured?: boolean
  onSave: () => void
  onRead: (button: HTMLButtonElement) => void
}

export function NarrationCard({ row, language, saved, featured = false, onSave, onRead }: CardProps) {
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string>) => translate(language, key, values)
  return <article className={`narration-card ${featured ? 'narration-card-featured' : ''}`} aria-labelledby={`title-${row.id}`} data-entry={row.id} data-saved={saved}>
    <div className="card-heading">
      <div className="card-meta">
        <span className="source-name"><SourceName source={row.source} language={language} /></span>
        <GradeBadge row={row} language={language} />
      </div>
      <h3 id={`title-${row.id}`}>{row.title[language]}</h3>
      <p className="narrator">{row.narrator[language]}</p>
      {!isEstablished(row) && <p className="card-caution"><Info size={14} aria-hidden="true" />{t('cautionTitle')}</p>}
    </div>
    <div className="card-excerpt">
      <span className="micro-label">{t('arabicExcerpt')}</span>
      <p lang="ar" dir="rtl" className="arabic">{row.arabic}</p>
    </div>
    <p className="card-summary">{row.summary[language]}</p>
    <div className="card-bottom">
      <Button variant="ghost" className="read-button" onClick={(event) => onRead(event.currentTarget)} aria-label={t('readNamed', { title: row.title[language] })}>
        {t('read')}<ArrowUpRight size={17} className="directional" aria-hidden="true" />
      </Button>
      <Button variant="ghost" size="icon" className={`bookmark-action ${saved ? 'is-saved' : ''}`} onClick={onSave} aria-pressed={saved} aria-label={t(saved ? 'unsave' : 'save', { title: row.title[language] })}>
        {saved ? <Check size={18} aria-hidden="true" /> : <Bookmark size={18} aria-hidden="true" />}
      </Button>
    </div>
  </article>
}
