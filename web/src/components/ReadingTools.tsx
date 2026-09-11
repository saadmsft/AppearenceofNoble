import { useEffect, useId, useRef, useState } from 'react'
import type { Language, Narration } from '../lib/schema.ts'
import type { ReadingController } from '../hooks/useReading.ts'
import { getNoteText, getReadingEntry } from '../lib/reading.ts'
import type { ReadingIssue } from '../lib/reading.ts'
import { readingIssueText, readingLabel } from '../lib/reading-labels.ts'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog'
import '../reading.css'

export type ReadingToolsProps = {
  row: Narration
  language: Language
  reading: ReadingController
}

export function ReadingIssueMessage({ issue, language }: { issue: ReadingIssue | null; language: Language }) {
  return issue ? <p className="reading-issue" role="alert">{readingIssueText(language, issue)}</p> : null
}

export function ReadingTools({ row, language, reading }: ReadingToolsProps) {
  const t = (key: Parameters<typeof readingLabel>[1]) => readingLabel(language, key)
  const id = useId()
  const textarea = useRef<HTMLTextAreaElement>(null)
  const deleteButton = useRef<HTMLButtonElement>(null)
  const cancelButton = useRef<HTMLButtonElement>(null)
  const [deletion, setDeletion] = useState<{ id: string; text: string } | null>(null)
  const [deleteIssue, setDeleteIssue] = useState<ReadingIssue | null>(null)
  const focusTarget = useRef<'textarea' | 'button'>('button')
  const entry = getReadingEntry(reading.data, row.id)
  const text = getNoteText(reading, row.id)
  const unsaved = Object.hasOwn(reading.drafts, row.id)

  useEffect(() => {
    if (!deletion) return
    // Consume nested Escape before document-level listeners can also dismiss the reader.
    const closeConfirmation = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopImmediatePropagation()
      setDeletion(null)
      setDeleteIssue(null)
    }
    window.addEventListener('keydown', closeConfirmation, true)
    return () => window.removeEventListener('keydown', closeConfirmation, true)
  }, [deletion])

  function confirmDelete(from: 'textarea' | 'button') {
    focusTarget.current = from
    setDeleteIssue(null)
    setDeletion({ id: row.id, text })
  }

  return <section className="reading-tools" lang={language} dir={language === 'ur' ? 'rtl' : 'ltr'} aria-labelledby={`${id}-heading`}>
    <h3 id={`${id}-heading`}>{t('tools')}</h3>
    <p className="reading-help" id={`${id}-privacy`}>{t('privacy')}</p>
    <label className="reading-check">
      <input type="checkbox" checked={entry.read === true} onChange={(event) => { reading.setRead(row.id, event.target.checked) }} />
      <span>{t('markRead')}</span>
    </label>
    <p className="reading-help">{t(entry.read === undefined ? 'notMarked' : entry.read ? 'read' : 'unread')}. {t('noAutoRead')}</p>
    <label className="reading-note-label" htmlFor={`${id}-note`}>{t('note')}</label>
    <textarea ref={textarea} id={`${id}-note`} value={text} rows={5} dir="auto"
      aria-describedby={`${id}-privacy ${id}-limit ${id}-status`}
      aria-invalid={unsaved || undefined} spellCheck={false} autoComplete="off"
      onChange={(event) => {
        const next = event.target.value
        if (!next && text) confirmDelete('textarea')
        else if (next) reading.setNote(row.id, next)
      }} />
    <p className="reading-help" id={`${id}-limit`}>{t('noteLimit')} <bdi>{text.length.toLocaleString(language)} / 10,000</bdi></p>
    <p id={`${id}-status`} className={unsaved ? 'reading-issue' : 'reading-saved'} role="status">
      {unsaved ? t('unsaved') : entry.note !== undefined ? t('saved') : ''}
    </p>
    <ReadingIssueMessage issue={reading.importIssue ?? reading.issue} language={language} />
    <div className="reading-actions">
      {unsaved && <Button variant="outline" size="sm" onClick={() => { reading.setNote(row.id, text) }}>{t('retry')}</Button>}
      {reading.issue && <Button variant="outline" size="sm" onClick={() => { reading.reload() }}>{t('reload')}</Button>}
      <Button ref={deleteButton} variant="ghost" size="sm" disabled={!text} onClick={() => confirmDelete('button')}>{t('deleteNote')}</Button>
    </div>
    <Dialog open={deletion !== null && deletion.id === row.id} onOpenChange={(open) => { if (!open) { setDeletion(null); setDeleteIssue(null) } }}>
      <DialogContent className="reading-confirm" closeLabel={t('close')} lang={language} dir={language === 'ur' ? 'rtl' : 'ltr'}
        onOpenAutoFocus={(event) => { event.preventDefault(); cancelButton.current?.focus() }}
        onEscapeKeyDown={(event) => {
          // A nested confirmation must not pass this Escape to the reader beneath it.
          event.preventDefault()
          event.stopPropagation()
          event.stopImmediatePropagation()
          setDeletion(null)
          setDeleteIssue(null)
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          const target = focusTarget.current === 'button' && !deleteButton.current?.disabled ? deleteButton.current : textarea.current
          target?.focus({ preventScroll: true })
        }}>
        <DialogTitle>{t('deleteTitle')}</DialogTitle>
        <DialogDescription>{t('deleteDetail')}</DialogDescription>
        <p className="reading-note-text reading-delete-text" dir="auto">{deletion?.text}</p>
        <ReadingIssueMessage issue={deleteIssue} language={language} />
        <div className="reading-actions">
          <Button ref={cancelButton} variant="outline" onClick={() => { setDeletion(null); setDeleteIssue(null) }}>{t('cancel')}</Button>
          <Button onClick={() => {
            if (!deletion) return
            const result = reading.deleteNote(deletion.id, deletion.text, true)
            if (result.ok) setDeletion(null)
            else setDeleteIssue(result.issue)
          }}>{t('confirmDelete')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  </section>
}
