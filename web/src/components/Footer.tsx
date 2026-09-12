import { ArrowUpRight, BookOpen } from 'lucide-react'
import type { Language } from '../lib/schema.ts'
import { translate } from '../lib/i18n.ts'
import { repositoryUrl } from './AboutPages'
import { dedicationLabels } from '../lib/dedication.ts'
import type { DedicationStorageIssue } from '../lib/dedication.ts'

export function AboutFooter({ language, onJourney, onGuide, onSources, onDedication, dedicationIssue }: {
  language: Language; onJourney: () => void; onGuide: () => void; onSources: () => void
  onDedication: (button: HTMLButtonElement) => void
  dedicationIssue: DedicationStorageIssue
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key)
  return <footer className="site-footer">
    <div className="page-width footer-inner">
      <div className="footer-brand"><BookOpen size={22} aria-hidden="true" /><h2>{t('name')}</h2><p>{t('footerDescription')}</p><small>{t('footerScope')}</small></div>
      <nav aria-label={t('guide')}>
        <button type="button" onClick={onJourney}>{t('journey')}</button>
        <button type="button" onClick={onGuide}>{t('guide')}</button>
        <button type="button" onClick={onSources}>{t('sources')}</button>
        <button type="button" className="dedication-link" onClick={(event) => onDedication(event.currentTarget)}>{dedicationLabels[language].reopen}</button>
        <a href={repositoryUrl} target="_blank" rel="noopener noreferrer">{t('repository')}<ArrowUpRight size={14} className="directional" aria-hidden="true" /></a>
        <a href={`${repositoryUrl}/issues/new?template=source-correction.yml`} target="_blank" rel="noopener noreferrer">{t('corrections')}<ArrowUpRight size={14} className="directional" aria-hidden="true" /></a>
      </nav>
      {dedicationIssue && <p className="dedication-storage-note" role="status">{dedicationLabels[language].storage}</p>}
      <div className="footer-bottom"><p>{t('privacy')}</p><span lang="ar" dir="rtl" className="footer-arabic">اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ</span></div>
    </div>
  </footer>
}
