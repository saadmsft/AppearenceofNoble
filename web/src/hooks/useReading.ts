import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { Narration } from '../lib/schema.ts'
import { createReadingStore } from '../lib/reading.ts'
import type { ApplyImportOptions, ImportPreview, ReadingListeningBridge, ReadingSnapshot, ReadingStore } from '../lib/reading.ts'

export type ReadingController = ReadingSnapshot & Pick<ReadingStore,
  'openEntry' | 'setRead' | 'setNote' | 'deleteNote' | 'prepareImport' | 'applyImport' | 'exportBackup' | 'reload'>

/** Mount once above route/reader switches so failed drafts survive in-app navigation. */
export function useReading(knownEntries: readonly Narration[], listening?: ReadingListeningBridge): ReadingController {
  const [store] = useState(() => createReadingStore(() => window.localStorage, new Set(knownEntries.map((entry) => entry.id)), listening))
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const ids = JSON.stringify(knownEntries.map((entry) => entry.id).sort())

  useEffect(() => {
    const parsed: string[] = JSON.parse(ids)
    store.setKnownIds(new Set(parsed))
  }, [ids, store])

  const hasDrafts = Object.keys(snapshot.drafts).length > 0
  useEffect(() => {
    if (!hasDrafts) return
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [hasDrafts])

  const openEntry = useCallback((id: string) => store.openEntry(id), [store])
  const setRead = useCallback((id: string, read: boolean) => store.setRead(id, read), [store])
  const setNote = useCallback((id: string, text: string) => store.setNote(id, text), [store])
  const deleteNote = useCallback((id: string, text: string, confirmed: true) => store.deleteNote(id, text, confirmed), [store])
  const prepareImport = useCallback((text: string, bookmarks: readonly string[]) => store.prepareImport(text, bookmarks), [store])
  const applyImport = useCallback((preview: ImportPreview, options: ApplyImportOptions) => store.applyImport(preview, options), [store])
  const exportBackup = useCallback((bookmarks: readonly string[]) => store.exportBackup(bookmarks), [store])
  const reload = useCallback(() => store.reload(), [store])
  return { ...snapshot, openEntry, setRead, setNote, deleteNote, prepareImport, applyImport, exportBackup, reload }
}
