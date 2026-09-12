import type { Chapter } from '../lib/chapters.ts'
import type { Language, Narration, Topic } from '../lib/schema.ts'
import { topicLabels } from '../lib/catalog.ts'
import { number, translate } from '../lib/i18n.ts'
import { isEstablished } from '../lib/search.ts'
import { NarrationCard } from './NarrationCard'

type TopicReportsProps = {
  chapter: Chapter
  language: Language
  includeCautioned: boolean
  onToggleCautioned: () => void
  savedIds: ReadonlySet<string>
  onSave: (id: string) => void
  onRead: (row: Narration, topic: Topic, includeCautioned: boolean, button: HTMLButtonElement) => void
}

export function TopicReports({ chapter, language, includeCautioned, onToggleCautioned, savedIds, onSave, onRead }: TopicReportsProps) {
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string>) => translate(language, key, values)
  const reports = includeCautioned ? chapter.reports : chapter.reports.filter(isEstablished)
  const cautioned = chapter.reports.some((row) => !isEstablished(row))
  return <>
    <div className="chapter-reports-heading">
      <h3>{t('topicNarrations', { topic: topicLabels[chapter.topic][language] })}</h3>
      <span>{t('results', { count: number(reports.length, language) })}</span>
    </div>
    <p className="chapter-grade-note">
      {t(includeCautioned ? 'chapterAllGradesNotice' : 'cautionHidden')}
      {cautioned && <button className="inline-link" type="button" aria-pressed={includeCautioned} onClick={onToggleCautioned}>
        {t(includeCautioned ? 'hideCautioned' : 'includeCautioned')}
      </button>}
    </p>
    <div className="narration-grid">
      {reports.map((row) => <NarrationCard key={row.id} row={row} language={language} saved={savedIds.has(row.id)}
        onSave={() => onSave(row.id)} onRead={(button) => onRead(row, chapter.topic, includeCautioned, button)} />)}
    </div>
  </>
}
