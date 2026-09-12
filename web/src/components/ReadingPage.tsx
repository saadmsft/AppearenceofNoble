import { useEffect, useId, useRef, useState } from 'react'
import type { Language, Narration } from '../lib/schema.ts'
import type { ReadingController } from '../hooks/useReading.ts'
import { getNoteText, getReadingEntry, readingLimits } from '../lib/reading.ts'
import type { ImportMode, ImportPreview, OnBookmarksChange, ReadingIssue } from '../lib/reading.ts'
import { readingLabel } from '../lib/reading-labels.ts'
import { ReadingIssueMessage } from './ReadingTools.tsx'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog'
import '../reading.css'

export type ReadingPageProps = {
  language: Language
  allNarrations: readonly Narration[]
  reading: ReadingController
  bookmarks: readonly string[]
  onBookmarksChange: OnBookmarksChange
  onOpen: (row: Narration, button: HTMLButtonElement) => void
  /** Receives a narration ID, not a source-book ID. No parent shelf type is required. */
  getCollectionLabel?: (id: string, language: Language) => string
  getCollectionLabels?: (id: string, language: Language) => string[]
}

export function ReadingPage({ language, allNarrations, reading, bookmarks, onBookmarksChange, onOpen, getCollectionLabel, getCollectionLabels }: ReadingPageProps) {
  const t = (key: Parameters<typeof readingLabel>[1]) => readingLabel(language, key)
  const id = useId()
  const rows = new Map(allNarrations.map((row) => [row.id, row]))
  const last = reading.data.lastOpened ? rows.get(reading.data.lastOpened.id) : undefined
  const groups = new Map<string, { total: number; read: number }>()
  for (const row of rows.values()) {
    const labels = getCollectionLabels?.(row.id, language) ?? [getCollectionLabel?.(row.id, language) ?? t('allEntries')]
    for (const label of new Set(labels)) {
      const count = groups.get(label) ?? { total: 0, read: 0 }
      groups.set(label, { total: count.total + 1, read: count.read + (getReadingEntry(reading.data, row.id).read === true ? 1 : 0) })
    }
  }
  const noteIds = [...new Set([...Object.keys(reading.data.entries), ...Object.keys(reading.drafts)])]
    .filter((entryId) => getNoteText(reading, entryId).length > 0)
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [mode, setMode] = useState<ImportMode>('merge')
  const [formIssue, setFormIssue] = useState<ReadingIssue | null>(null)
  const [notice, setNotice] = useState<'downloaded' | 'restored' | 'fileFailed' | 'downloadFailed' | null>(null)
  const [loadingFile, setLoadingFile] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const cancelButton = useRef<HTMLButtonElement>(null)
  const fileRequest = useRef(0)

  useEffect(() => () => { fileRequest.current += 1 }, [])

  function resetForm() {
    fileRequest.current += 1
    setText('')
    setPreview(null)
    setMode('merge')
    setFormIssue(null)
    setNotice(null)
    setLoadingFile(false)
    if (fileInput.current) fileInput.current.value = ''
  }

  async function readFile(file: File | undefined) {
    const request = ++fileRequest.current
    setText('')
    setNotice(null)
    setFormIssue(null)
    setLoadingFile(false)
    if (!file) return
    if (file.size > readingLimits.fileBytes) { setFormIssue({ code: 'file-too-large' }); return }
    setLoadingFile(true)
    try {
      const content = await file.text()
      if (request === fileRequest.current) setText(content)
    } catch (error) {
      if (!(error instanceof DOMException)) throw error
      if (request === fileRequest.current) setNotice('fileFailed')
    } finally {
      if (request === fileRequest.current) setLoadingFile(false)
    }
  }

  function download() {
    setNotice(null)
    setFormIssue(null)
    const result = reading.exportBackup(bookmarks)
    if (!result.ok) { setFormIssue(result.issue); return }
    try {
      const url = URL.createObjectURL(new Blob([result.value], { type: 'application/json' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `noble-project-private-backup-${new Date().toISOString().slice(0, 10)}.json`
      try {
        document.body.append(anchor)
        anchor.click()
        setNotice('downloaded')
      } finally {
        anchor.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    } catch (error) {
      if (!(error instanceof DOMException)) throw error
      setNotice('downloadFailed')
    }
  }

  return <section className="reading-page page-width" lang={language} dir={language === 'ur' ? 'rtl' : 'ltr'} aria-labelledby={`${id}-heading`}>
    <header className="reading-page-heading">
      <h1 id={`${id}-heading`}>{t('title')}</h1>
      <p>{t('privacy')}</p>
      <p>{t('noAutoRead')}</p>
    </header>
    <ReadingIssueMessage issue={reading.importIssue ?? reading.issue} language={language} />
    {reading.issue && <Button variant="outline" onClick={() => { reading.reload() }}>{t('reload')}</Button>}
    <section className="reading-panel" aria-labelledby={`${id}-resume`}>
      <h2 id={`${id}-resume`}>{t('resume')}</h2>
      {last ? <Button variant="outline" onClick={(event) => onOpen(last, event.currentTarget)}>{last.title[language]}</Button>
        : <p>{reading.data.lastOpened ? t('unknown') : t('noResume')}</p>}
    </section>
    <section className="reading-panel" aria-labelledby={`${id}-progress`}>
      <h2 id={`${id}-progress`}>{t('progress')}</h2>
      {getCollectionLabels && <p className="reading-help">{t('sharedProgress')}</p>}
      <ul className="reading-progress-list">{[...groups].map(([label, counts]) => <li key={label}>
        <h3>{label}</h3>
        <p><bdi>{counts.read.toLocaleString(language)}</bdi> {t('readOf')} <bdi>{counts.total.toLocaleString(language)}</bdi></p>
        <progress value={counts.read} max={counts.total || 1} aria-label={label} />
      </li>)}</ul>
    </section>
    <section className="reading-panel" aria-labelledby={`${id}-notes`}>
      <h2 id={`${id}-notes`}>{t('notes')} <bdi>({noteIds.length.toLocaleString(language)})</bdi></h2>
      {!noteIds.length ? <p>{t('noNotes')}</p> : <ul className="reading-notes-list">{noteIds.map((entryId) => {
        const row = rows.get(entryId)
        const unsaved = Object.hasOwn(reading.drafts, entryId)
        return <li key={entryId}>
          <h3>{row?.title[language] ?? entryId}</h3>
          {getCollectionLabel && row && <p className="reading-help">{getCollectionLabel(entryId, language)}</p>}
          <p className="reading-note-text" dir="auto">{getNoteText(reading, entryId)}</p>
          <p className={unsaved ? 'reading-issue' : 'reading-saved'}>{t(unsaved ? 'unsaved' : 'saved')}</p>
          {row ? <Button variant="outline" size="sm" onClick={(event) => onOpen(row, event.currentTarget)}>{t('open')}</Button> : <p>{t('unknown')}</p>}
        </li>
      })}</ul>}
    </section>
    <section className="reading-panel" aria-labelledby={`${id}-backup`}>
      <h2 id={`${id}-backup`}>{t('backup')}</h2>
      <p>{t('downloadDetail')}</p>
      <Button variant="outline" onClick={download}>{t('download')}</Button>
      <form className="reading-import-form" onSubmit={(event) => {
        event.preventDefault()
        setNotice(null)
        setFormIssue(null)
        const result = reading.prepareImport(text, bookmarks)
        if (result.ok) {
          setMode(reading.writable && (!result.value.listening || result.value.listening.merge) ? 'merge' : 'replace')
          setPreview(result.value)
        }
        else setFormIssue(result.issue)
      }}>
        <h3>{t('import')}</h3>
        <label htmlFor={`${id}-file`}>{t('file')}</label>
        <input ref={fileInput} id={`${id}-file`} type="file" accept=".json,application/json"
          onChange={(event) => { void readFile(event.target.files?.[0]) }} />
        <label htmlFor={`${id}-json`}>{t('paste')}</label>
        <textarea id={`${id}-json`} value={text} rows={5} spellCheck={false} autoComplete="off" dir="ltr"
          onChange={(event) => {
            fileRequest.current += 1
            setLoadingFile(false)
            setNotice(null)
            const next = event.target.value
            if (next.length > readingLimits.fileBytes || new TextEncoder().encode(next).byteLength > readingLimits.fileBytes) {
              setFormIssue({ code: 'file-too-large' })
              return
            }
            setFormIssue(null)
            setText(next)
            if (fileInput.current) fileInput.current.value = ''
          }} />
        <div className="reading-actions">
          <Button type="submit" disabled={loadingFile || !text}>{t('preview')}</Button>
          <Button variant="ghost" onClick={resetForm}>{t('reset')}</Button>
        </div>
      </form>
      {loadingFile && <p role="status">{t('readingFile')}</p>}
      <ReadingIssueMessage issue={formIssue} language={language} />
      {notice && <p role={notice === 'fileFailed' || notice === 'downloadFailed' ? 'alert' : 'status'}>{t(notice)}</p>}
    </section>
    <Dialog open={preview !== null} onOpenChange={(open) => { if (!open) resetForm() }}>
      <DialogContent className="reading-confirm" closeLabel={t('close')} lang={language} dir={language === 'ur' ? 'rtl' : 'ltr'}
        onOpenAutoFocus={(event) => { event.preventDefault(); cancelButton.current?.focus() }}
        onCloseAutoFocus={(event) => { event.preventDefault(); fileInput.current?.focus({ preventScroll: true }) }}>
        <DialogTitle>{t('restoreTitle')}</DialogTitle>
        <DialogDescription>{t('restoreDetail')}</DialogDescription>
        {preview && <>
          <h3>{t('importedCounts')}</h3>
          <dl className="reading-import-counts">
            <div><dt>{t('read')}</dt><dd>{preview.counts.read.toLocaleString(language)}</dd></div>
            <div><dt>{t('unread')}</dt><dd>{preview.counts.unread.toLocaleString(language)}</dd></div>
            <div><dt>{t('notes')}</dt><dd>{preview.counts.notes.toLocaleString(language)}</dd></div>
            <div><dt>{t('bookmarks')}</dt><dd>{preview.counts.bookmarks.toLocaleString(language)}</dd></div>
            {preview.listening && <div><dt>{t('listeningPositions')}</dt><dd>{preview.listening.positions.toLocaleString(language)}</dd></div>}
          </dl>
          {preview.listening
            ? <p className="reading-help">{t('listeningRestore')}</p>
            : <p className="reading-help">{t('legacyListeningUntouched')}</p>}
          {preview.listening && !preview.listening.merge && <p className="reading-issue">{t('listeningMergeUnavailable')}</p>}
          <fieldset className="reading-import-options">
            <legend>{t('confirmRestore')}</legend>
            <label><input type="radio" name={`${id}-mode`} value="merge" checked={mode === 'merge'} disabled={!reading.writable || Boolean(preview.listening && !preview.listening.merge)}
              onChange={() => setMode('merge')} /> <strong>{t('merge')}</strong><span>{t('mergeDetail')}</span></label>
            <label><input type="radio" name={`${id}-mode`} value="replace" checked={mode === 'replace'}
              onChange={() => setMode('replace')} /> <strong>{t('replace')}</strong><span>{t('replaceDetail')}</span></label>
          </fieldset>
          {preview.conflicts.length > 0 && <details className="reading-conflicts">
            <summary>{t('conflicts')} ({preview.conflicts.length.toLocaleString(language)})</summary>
            <ul>{preview.conflicts.map((entryId) => <li key={entryId}>
              <h4>{rows.get(entryId)?.title[language] ?? entryId}</h4>
              <h5>{t('localText')}</h5><p className="reading-note-text" dir="auto">{getReadingEntry(reading.data, entryId).note}</p>
              <h5>{t('backupText')}</h5><p className="reading-note-text" dir="auto">{getReadingEntry(preview.backup.reading, entryId).note}</p>
            </li>)}</ul>
          </details>}
          {preview.readConflicts.length > 0 && <p>{t('readConflicts')}: {preview.readConflicts.length.toLocaleString(language)}</p>}
          <ReadingIssueMessage issue={formIssue} language={language} />
          <div className="reading-actions">
            <Button ref={cancelButton} variant="outline" onClick={resetForm}>{t('cancel')}</Button>
            <Button onClick={() => {
              const result = reading.applyImport(preview, { mode, confirmed: true, bookmarks, onBookmarksChange })
              if (result.ok) { resetForm(); setNotice('restored') }
              else setFormIssue(result.issue)
            }}>{t('confirmRestore')}</Button>
          </div>
        </>}
      </DialogContent>
    </Dialog>
  </section>
}
