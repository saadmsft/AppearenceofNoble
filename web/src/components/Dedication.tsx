import { translate } from '../lib/i18n.ts'
import type { Language } from '../lib/schema.ts'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog'

type DedicationProps = {
  open: boolean
  language: Language
  onClose: () => void
}

export function Dedication({ open, language, onClose }: DedicationProps) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key)
  return <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
    <DialogContent className="dedication-content" closeLabel={t('dedicationClose')}
      dir={language === 'ur' ? 'rtl' : 'ltr'} lang={language}>
      <div className="dedication-body">
        <span className="dedication-ornament" aria-hidden="true" />
        <DialogTitle className="dedication-title">{t('dedicationTitle')}</DialogTitle>
        <DialogDescription className="dedication-intro">{t('dedicationIntro')}</DialogDescription>
        <p className="dedication-parents">{t('dedicationParents')}</p>
        <Button className="dedication-continue" onClick={onClose}>{t('dedicationContinue')}</Button>
      </div>
    </DialogContent>
  </Dialog>
}
