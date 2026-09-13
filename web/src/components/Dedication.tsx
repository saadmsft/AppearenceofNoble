import { useRef } from 'react'
import type { Language } from '../lib/schema.ts'
import { dedicationLabels } from '../lib/dedication.ts'
import type { DedicationStorageIssue } from '../lib/dedication.ts'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { InkSeal } from './InkSeal'
import '../dedication.css'

export function Dedication({ open, language, storageIssue, onClose, onLanguage, restoreFocus, paused }: {
  open: boolean
  language: Language
  storageIssue: DedicationStorageIssue
  onClose: () => void
  onLanguage: (language: Language) => void
  restoreFocus: () => void
  paused: boolean
}) {
  const enter = useRef<HTMLButtonElement>(null)
  const t = dedicationLabels[language]
  return <Dialog open={open} onOpenChange={(value) => { if (!value) onClose() }}>
    <DialogContent className="dedication-dialog" closeLabel={t.close} lang={language} dir={language === 'ur' ? 'rtl' : 'ltr'}
      onOpenAutoFocus={(event) => { event.preventDefault(); enter.current?.focus({ preventScroll: true }) }}
      onCloseAutoFocus={(event) => { event.preventDefault(); restoreFocus() }}>
      <div className="dedication-language language-switch" role="group" aria-label="Language / زبان">
        <button type="button" lang="en" dir="ltr" aria-label="English" aria-pressed={language === 'en'} onClick={() => onLanguage('en')}>EN</button>
        <button type="button" lang="ur" dir="rtl" aria-label="اردو" aria-pressed={language === 'ur'} onClick={() => onLanguage('ur')}>اردو</button>
      </div>
      <InkSeal paused={paused} />
      <DialogTitle className="dedication-title">{t.title}</DialogTitle>
      <DialogDescription asChild>
        <div className="dedication-copy">
          <p className="dedication-first">{t.dedication}</p>
          <p className="dedication-parents">{t.beforeMother}{' '}<strong>{t.mother}</strong>{language === 'en' ? ', ' : ' '}
            {t.beforeFather}{' '}<strong>{t.father}</strong>{language === 'en' ? ', ' : ' '}{t.gratitude}</p>
        </div>
      </DialogDescription>
      <Button className="dedication-enter" ref={enter} onClick={onClose}>{t.enter}</Button>
      {storageIssue && <p className="dedication-storage-note">{t.storage}</p>}
    </DialogContent>
  </Dialog>
}
