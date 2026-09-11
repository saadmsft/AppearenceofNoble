import { z } from 'zod'

export const readingKey = 'noble-project.reading.v1'
export const readingLimits = {
  noteLength: 10_000,
  totalNoteLength: 500_000,
  entries: 2_000,
  idLength: 160,
  fileBytes: 4 * 1024 * 1024,
} as const

const idSchema = z.string().max(readingLimits.idLength).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const entrySchema = z.object({
  read: z.boolean().optional(),
  note: z.string().min(1).max(readingLimits.noteLength).optional(),
}).strict()
const readingSchema = z.object({
  version: z.literal(1),
  entries: z.record(idSchema, entrySchema),
  lastOpened: z.object({ id: idSchema, at: z.iso.datetime() }).strict().nullable(),
}).strict().refine((data) => Object.keys(data.entries).length <= readingLimits.entries)
  .refine((data) => Object.values(data.entries).reduce((sum, entry) => sum + (entry.note?.length ?? 0), 0) <= readingLimits.totalNoteLength)
const bookmarksSchema = z.array(idSchema).max(readingLimits.entries)
const backupSchema = z.object({
  format: z.literal('noble-project.personal-backup'),
  version: z.literal(1),
  exportedAt: z.iso.datetime(),
  reading: readingSchema,
  bookmarks: bookmarksSchema,
}).strict()

export type ReadingEntry = Readonly<z.infer<typeof entrySchema>>
export type ReadingData = {
  readonly version: 1
  readonly entries: Readonly<Record<string, ReadingEntry>>
  readonly lastOpened: Readonly<{ id: string; at: string }> | null
}
export type ReadingBackup = Omit<z.infer<typeof backupSchema>, 'reading' | 'bookmarks'> & {
  readonly reading: ReadingData
  readonly bookmarks: readonly string[]
}
export type ReadingIssueCode =
  | 'unavailable' | 'quota' | 'invalid-storage' | 'invalid-import' | 'file-too-large'
  | 'note-too-long' | 'total-too-large' | 'empty-note' | 'unknown-ids' | 'invalid-id'
  | 'verify-failed' | 'changed-storage' | 'stale-preview' | 'unsaved-notes'
  | 'replace-required' | 'bookmarks-unconfirmed' | 'busy'
export type ReadingIssue = { readonly code: ReadingIssueCode; readonly ids?: readonly string[] }
export type ReadingResult<T = undefined> = { ok: true; value: T } | { ok: false; issue: ReadingIssue }
export type ReadingStorage = () => Pick<Storage, 'getItem' | 'setItem'>
export type BookmarkWriteResult = { ok: true } | { ok: false }
/** Return ok only after verifying persistence AND updating the parent's bookmark state. */
export type OnBookmarksChange = (ids: string[]) => BookmarkWriteResult
export type ImportMode = 'merge' | 'replace'
export type ReadingCounts = { read: number; unread: number; notes: number; bookmarks: number }
export type ImportPreview = {
  readonly backup: ReadingBackup
  readonly counts: ReadingCounts
  readonly conflicts: readonly string[]
  readonly readConflicts: readonly string[]
  readonly baseline: string
  readonly bookmarks: readonly string[]
}
export type ReadingSnapshot = {
  readonly data: ReadingData
  readonly drafts: Readonly<Record<string, string>>
  readonly issue: ReadingIssue | null
  readonly importIssue: ReadingIssue | null
  readonly writable: boolean
}

const fail = <T = never>(code: ReadingIssueCode, ids?: readonly string[]): ReadingResult<T> =>
  ({ ok: false, issue: ids ? { code, ids } : { code } })
const success = <T>(value: T): ReadingResult<T> => ({ ok: true, value })
export const emptyReading = (): ReadingData => ({ version: 1, entries: {}, lastOpened: null })
export const getReadingEntry = (data: ReadingData, id: string): ReadingEntry =>
  Object.hasOwn(data.entries, id) ? data.entries[id] : {}
export const getNoteText = (snapshot: ReadingSnapshot, id: string): string =>
  Object.hasOwn(snapshot.drafts, id) ? snapshot.drafts[id] : getReadingEntry(snapshot.data, id).note ?? ''

function tooLarge(text: string) {
  return text.length > readingLimits.fileBytes || new TextEncoder().encode(text).byteLength > readingLimits.fileBytes
}

function decode(text: string, invalid: ReadingIssueCode): ReadingResult<unknown> {
  if (tooLarge(text)) return fail('file-too-large')
  try {
    return success(JSON.parse(text) as unknown)
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    return fail(invalid)
  }
}

function storageIssue(error: DOMException): ReadingIssueCode {
  return error.name === 'QuotaExceededError' ? 'quota' : 'unavailable'
}

export function loadReading(storage: ReadingStorage): {
  data: ReadingData; raw: string | null | undefined; issue: ReadingIssue | null
} {
  let raw: string | null
  try {
    raw = storage().getItem(readingKey)
  } catch (error) {
    if (!(error instanceof DOMException)) throw error
    return { data: emptyReading(), raw: undefined, issue: { code: storageIssue(error) } }
  }
  if (raw === null) return { data: emptyReading(), raw, issue: null }
  const decoded = decode(raw, 'invalid-storage')
  if (!decoded.ok) return { data: emptyReading(), raw, issue: decoded.issue }
  const parsed = readingSchema.safeParse(decoded.value)
  return parsed.success
    ? { data: parsed.data, raw, issue: null }
    : { data: emptyReading(), raw, issue: { code: 'invalid-storage' } }
}

/** Compare before writing, then read back; never touch the legacy preferences key. */
export function saveReading(storage: ReadingStorage, data: ReadingData, expectedRaw: string | null): ReadingResult<string> {
  const parsed = readingSchema.safeParse(data)
  if (!parsed.success) return fail('total-too-large')
  const raw = JSON.stringify(parsed.data)
  if (tooLarge(raw)) return fail('file-too-large')
  try {
    const target = storage()
    if (target.getItem(readingKey) !== expectedRaw) return fail('changed-storage')
    target.setItem(readingKey, raw)
    if (target.getItem(readingKey) !== raw) return fail('verify-failed')
    return success(raw)
  } catch (error) {
    if (!(error instanceof DOMException)) throw error
    return fail(storageIssue(error))
  }
}

function unknownIds(data: ReadingData, bookmarks: readonly string[], knownIds: ReadonlySet<string>): string[] {
  const ids = [...Object.keys(data.entries), ...bookmarks, ...(data.lastOpened ? [data.lastOpened.id] : [])]
  return [...new Set(ids)].filter((id) => !knownIds.has(id))
}

export function readingCounts(data: ReadingData, bookmarks: readonly string[] = []): ReadingCounts {
  const entries = Object.values(data.entries)
  return {
    read: entries.filter((entry) => entry.read === true).length,
    unread: entries.filter((entry) => entry.read === false).length,
    notes: entries.filter((entry) => entry.note !== undefined).length,
    bookmarks: new Set(bookmarks).size,
  }
}

export function createReadingBackup(data: ReadingData, bookmarks: readonly string[], now = new Date().toISOString()): ReadingResult<string> {
  const parsed = backupSchema.safeParse({
    format: 'noble-project.personal-backup', version: 1, exportedAt: now,
    reading: data, bookmarks: [...new Set(bookmarks)],
  })
  if (!parsed.success) return fail('invalid-import')
  const text = JSON.stringify(parsed.data, null, 2)
  return tooLarge(text) ? fail('file-too-large') : success(text)
}

export function prepareReadingImport(
  text: string, current: ReadingData, bookmarks: readonly string[], knownIds: ReadonlySet<string>,
): ReadingResult<ImportPreview> {
  const decoded = decode(text, 'invalid-import')
  if (!decoded.ok) return decoded
  const parsed = backupSchema.safeParse(decoded.value)
  if (!parsed.success || !bookmarksSchema.safeParse(bookmarks).success) return fail('invalid-import')
  const unknown = unknownIds(parsed.data.reading, parsed.data.bookmarks, knownIds)
  if (unknown.length) return fail('unknown-ids', unknown)
  const backup: ReadingBackup = { ...parsed.data, bookmarks: [...new Set(parsed.data.bookmarks)] }
  const conflicts: string[] = []
  const readConflicts: string[] = []
  for (const [id, imported] of Object.entries(backup.reading.entries)) {
    const local = getReadingEntry(current, id)
    if (local.note !== undefined && imported.note !== undefined && local.note !== imported.note) conflicts.push(id)
    if (local.read !== undefined && imported.read !== undefined && local.read !== imported.read) readConflicts.push(id)
  }
  return success({
    backup, counts: readingCounts(backup.reading, backup.bookmarks), conflicts, readConflicts,
    baseline: JSON.stringify(current), bookmarks: [...bookmarks],
  })
}

/** Merge fills gaps, never overwrites local notes, explicit unread flags, or resume state. */
export function planReadingImport(current: ReadingData, bookmarks: readonly string[], backup: ReadingBackup, mode: ImportMode): ReadingResult<{
  data: ReadingData; bookmarks: string[]
}> {
  const entries = { ...current.entries }
  for (const [id, imported] of Object.entries(backup.reading.entries)) {
    entries[id] = { ...imported, ...getReadingEntry(current, id) }
  }
  const data = mode === 'replace' ? backup.reading : {
    version: 1 as const, entries, lastOpened: current.lastOpened ?? backup.reading.lastOpened,
  }
  const nextBookmarks = [...new Set(mode === 'replace' ? backup.bookmarks : [...bookmarks, ...backup.bookmarks])]
  if (!readingSchema.safeParse(data).success || !bookmarksSchema.safeParse(nextBookmarks).success) return fail('total-too-large')
  return success({ data, bookmarks: nextBookmarks })
}

export type ApplyImportOptions = {
  mode: ImportMode
  confirmed: true
  bookmarks: readonly string[]
  onBookmarksChange: OnBookmarksChange
}

export function createReadingStore(storage: ReadingStorage, initialKnownIds: ReadonlySet<string>) {
  let knownIds = initialKnownIds
  let loaded = loadReading(storage)
  let raw = loaded.raw
  const retainedUnknown = unknownIds(loaded.data, [], knownIds)
  let snapshot: ReadingSnapshot = {
    data: loaded.data, drafts: {}, writable: loaded.issue === null,
    issue: loaded.issue ?? (retainedUnknown.length ? { code: 'unknown-ids', ids: retainedUnknown } : null),
    importIssue: null,
  }
  let importing = false
  const previews = new WeakSet<ImportPreview>()
  const listeners = new Set<() => void>()
  const emit = (patch: Partial<ReadingSnapshot>) => {
    snapshot = { ...snapshot, ...patch }
    for (const listener of listeners) listener()
  }
  const report = (issue: ReadingIssue): ReadingResult<never> => {
    emit({ issue })
    return { ok: false, issue }
  }
  const validateId = (id: string): ReadingResult => {
    if (!idSchema.safeParse(id).success) return fail('invalid-id')
    return knownIds.has(id) ? success(undefined) : fail('unknown-ids', [id])
  }
  const remainingIssue = (data: ReadingData, drafts: Readonly<Record<string, string>>): ReadingIssue | null => {
    if (Object.keys(drafts).length) return { code: 'unsaved-notes' }
    const unknown = unknownIds(data, [], knownIds)
    return unknown.length ? { code: 'unknown-ids', ids: unknown } : null
  }
  const write = (data: ReadingData, drafts = snapshot.drafts, allowReplace = false): ReadingResult => {
    if (raw === undefined) return report({ code: 'unavailable' })
    if (!snapshot.writable && !allowReplace) return report({ code: 'replace-required' })
    const result = saveReading(storage, data, raw)
    if (!result.ok) return report(result.issue)
    raw = result.value
    emit({ data, drafts, writable: true, issue: remainingIssue(data, drafts) })
    return success(undefined)
  }
  const updateEntry = (id: string, entry: ReadingEntry, drafts = snapshot.drafts): ReadingResult => {
    const entries = { ...snapshot.data.entries, [id]: entry }
    if (entry.read === undefined && entry.note === undefined) delete entries[id]
    return write({ ...snapshot.data, entries }, drafts)
  }
  const checkAction = (id: string): ReadingResult => {
    if (importing) return report({ code: 'busy' })
    const valid = validateId(id)
    return valid.ok ? valid : report(valid.issue)
  }
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    setKnownIds: (ids: ReadonlySet<string>) => {
      knownIds = ids
      if (snapshot.writable) emit({ issue: remainingIssue(snapshot.data, snapshot.drafts) })
    },
    reload: (): ReadingResult => {
      if (importing) return report({ code: 'busy' })
      loaded = loadReading(storage)
      raw = loaded.raw
      emit({
        data: loaded.issue === null ? loaded.data : snapshot.data, writable: loaded.issue === null,
        issue: loaded.issue ?? remainingIssue(loaded.data, snapshot.drafts),
      })
      return loaded.issue ? { ok: false, issue: loaded.issue } : success(undefined)
    },
    openEntry: (id: string): ReadingResult => {
      const valid = checkAction(id)
      if (!valid.ok) return valid
      // Reopening the same entry is idempotent, including React Strict Mode effects.
      if (snapshot.writable && snapshot.data.lastOpened?.id === id) return success(undefined)
      return write({ ...snapshot.data, lastOpened: { id, at: new Date().toISOString() } })
    },
    setRead: (id: string, read: boolean): ReadingResult => {
      const valid = checkAction(id)
      if (!valid.ok) return valid
      return updateEntry(id, { ...getReadingEntry(snapshot.data, id), read })
    },
    setNote: (id: string, text: string): ReadingResult => {
      const valid = checkAction(id)
      if (!valid.ok) return valid
      if (!text.length) return report({ code: 'empty-note' })
      if (text.length > readingLimits.noteLength) return report({ code: 'note-too-long' })
      const drafts = { ...snapshot.drafts, [id]: text }
      const otherIds = new Set([...Object.keys(snapshot.data.entries), ...Object.keys(drafts)])
      const total = [...otherIds].reduce((sum, key) =>
        sum + (Object.hasOwn(drafts, key) ? drafts[key].length : getReadingEntry(snapshot.data, key).note?.length ?? 0), 0)
      if (total > readingLimits.totalNoteLength || otherIds.size > readingLimits.entries) return report({ code: 'total-too-large' })
      const remaining = { ...drafts }
      delete remaining[id]
      const result = updateEntry(id, { ...getReadingEntry(snapshot.data, id), note: text }, remaining)
      if (!result.ok) emit({ drafts })
      return result
    },
    deleteNote: (id: string, expectedText: string, confirmed: true): ReadingResult => {
      const valid = checkAction(id)
      if (!valid.ok) return valid
      if (confirmed !== true || getNoteText(snapshot, id) !== expectedText) return report({ code: 'stale-preview' })
      const { read } = getReadingEntry(snapshot.data, id)
      const remaining = { ...snapshot.drafts }
      delete remaining[id]
      return updateEntry(id, read === undefined ? {} : { read }, remaining)
    },
    prepareImport: (text: string, bookmarks: readonly string[]): ReadingResult<ImportPreview> => {
      if (Object.keys(snapshot.drafts).length) return report({ code: 'unsaved-notes' })
      const result = prepareReadingImport(text, snapshot.data, bookmarks, knownIds)
      if (!result.ok) return report(result.issue)
      previews.add(result.value)
      return result
    },
    applyImport: (preview: ImportPreview, options: ApplyImportOptions): ReadingResult => {
      if (importing) return report({ code: 'busy' })
      if (Object.keys(snapshot.drafts).length) return report({ code: 'unsaved-notes' })
      if (options.confirmed !== true || !previews.has(preview) ||
        preview.baseline !== JSON.stringify(snapshot.data) ||
        JSON.stringify(preview.bookmarks) !== JSON.stringify(options.bookmarks)) return report({ code: 'stale-preview' })
      if (!snapshot.writable && options.mode !== 'replace') return report({ code: 'replace-required' })
      const unknown = unknownIds(preview.backup.reading, preview.backup.bookmarks, knownIds)
      if (unknown.length) return report({ code: 'unknown-ids', ids: unknown })
      const plan = planReadingImport(snapshot.data, options.bookmarks, preview.backup, options.mode)
      if (!plan.ok) return report(plan.issue)
      const written = write(plan.value.data, {}, options.mode === 'replace')
      if (!written.ok) return written
      previews.delete(preview)
      importing = true
      // These stores cannot be committed atomically. Keep an honest partial result until confirmed.
      emit({ importIssue: { code: 'bookmarks-unconfirmed' } })
      try {
        const bookmarksResult = options.onBookmarksChange(plan.value.bookmarks)
        if (bookmarksResult?.ok !== true) return report({ code: 'bookmarks-unconfirmed' })
        emit({ importIssue: null, issue: remainingIssue(snapshot.data, snapshot.drafts) })
        return success(undefined)
      } catch (error) {
        if (!(error instanceof DOMException)) throw error
        return report({ code: 'bookmarks-unconfirmed' })
      } finally {
        importing = false
      }
    },
    exportBackup: (bookmarks: readonly string[]): ReadingResult<string> => {
      if (Object.keys(snapshot.drafts).length) return report({ code: 'unsaved-notes' })
      if (!snapshot.writable) return report({ code: 'replace-required' })
      const result = createReadingBackup(snapshot.data, bookmarks)
      return result.ok ? result : report(result.issue)
    },
  }
}

export type ReadingStore = ReturnType<typeof createReadingStore>
