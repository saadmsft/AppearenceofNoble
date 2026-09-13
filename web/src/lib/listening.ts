import { z } from 'zod'
import { audioLanguages, audioManifestSchema, resetAudio, resolveAudioAsset } from './audio.ts'
import type { AudioLanguage } from './audio.ts'
import { isMonthlyChapter, isStoryEpisode, monthlyAudioManifestSchema, monthlyMaxTrackSeconds, storyAudioManifestSchema } from './story-audio.ts'
import type { ListeningEntry, PlayableAudioTrack, StoryEpisode } from './story-audio.ts'
import { isEstablished, shelves, topics, topicsByShelf } from './schema.ts'
import type { Localized, Narration, Shelf, Topic } from './schema.ts'

export const listeningKey = 'noble-project.listening.v1'
export const listeningLimits = { entries: 2_000, idLength: 160, fileBytes: 4 * 1024 * 1024 } as const
export const listeningRates = [0.75, 1, 1.25, 1.5] as const
export type ListeningIssueCode =
  | 'invalid-data' | 'invalid-storage' | 'file-too-large' | 'unknown-identity'
  | 'invalid-metadata' | 'empty-queue' | 'missing-track' | 'asset-error'
  | 'playback-rejected' | 'playback-aborted' | 'media-unavailable'
  | 'unavailable' | 'quota' | 'verify-failed' | 'changed-storage'
  | 'replace-required' | 'stale-preview' | 'busy'
export type ListeningIssue = { readonly code: ListeningIssueCode }
export type ListeningResult<T> = { ok: true; value: T } | { ok: false; issue: ListeningIssue }
const ok = <T>(value: T): ListeningResult<T> => ({ ok: true, value })
const fail = <T = never>(code: ListeningIssueCode): ListeningResult<T> => ({ ok: false, issue: { code } })

const id = z.string().max(listeningLimits.idLength).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const digest = z.string().regex(/^[a-f0-9]{64}$/)
const title = z.object({ en: z.string().trim().min(1).max(400), ur: z.string().trim().min(1).max(400) }).strict()
const queueInputSchema = z.object({
  shelf: z.enum(shelves), topic: z.union([z.enum(topics), z.literal('all')]),
  title, entryIds: z.array(id).min(1).max(listeningLimits.entries),
  includeCautioned: z.boolean().default(false),
}).strict().refine((queue) => queue.topic === 'all' || topicsByShelf[queue.shelf].includes(queue.topic))
const queueSchema = queueInputSchema.safeExtend({ currentEntryId: id, includeCautioned: z.boolean() })
  .refine((queue) => new Set(queue.entryIds).size === queue.entryIds.length && queue.entryIds.includes(queue.currentEntryId))
const cursorSchema = z.object({
  entryId: id, language: z.enum(audioLanguages), cacheKey: digest, sha256: digest,
  time: z.number().min(0).max(monthlyMaxTrackSeconds), completed: z.boolean(),
}).strict()
/** Structural schema for backup envelopes. Use validateListeningData (or the
 * controller's validateData) as well to check current source/manifest identities.
 */
export const listeningDataSchema = z.object({
  version: z.literal(1), language: z.enum(audioLanguages),
  rate: z.number().refine((rate) => listeningRates.some((value) => value === rate)),
  positions: z.array(cursorSchema).max(listeningLimits.entries), queue: queueSchema.nullable(),
}).strict().refine((data) => new Set(data.positions.map(cursorId)).size === data.positions.length)

export type ListeningQueueInput = {
  shelf: Shelf; topic: Topic | 'all'; title: Localized; entryIds: readonly string[]; includeCautioned?: boolean
}
export type ListeningContext = Omit<ListeningQueueInput, 'entryIds'>
export type ListeningQueue = Readonly<Omit<ListeningQueueInput, 'includeCautioned'> & {
  includeCautioned: boolean; currentEntryId: string
}>
export type ListeningCursor = Readonly<z.infer<typeof cursorSchema>>
export type ListeningData = {
  readonly version: 1; readonly language: AudioLanguage; readonly rate: number
  readonly positions: readonly ListeningCursor[]; readonly queue: ListeningQueue | null
}
export type ListeningItem = {
  readonly entryId: string; readonly entryIds: readonly string[]; readonly track: PlayableAudioTrack | null
}
export type ListeningCatalog = {
  readonly rows: ReadonlyMap<string, ListeningEntry>
  readonly tracks: ReadonlyMap<string, PlayableAudioTrack>
  readonly issue: ListeningIssue | null
}
export type ListeningStorage = () => Pick<Storage, 'getItem' | 'setItem'>
export const emptyListening = (): ListeningData => ({ version: 1, language: 'en', rate: 1, positions: [], queue: null })
const mappingId = (entryId: string, language: AudioLanguage) => `${entryId}:${language}`
function cursorId(cursor: Pick<ListeningCursor, 'entryId' | 'language'>) {
  return mappingId(cursor.entryId, cursor.language)
}

export function createListeningCatalog(rows: readonly ListeningEntry[], manifest: unknown, storyManifest: unknown = { version: 1, tracks: [] }, monthlyManifest: unknown = { version: 1, tracks: [] }): ListeningCatalog {
  const parsed = audioManifestSchema.safeParse(manifest)
  const stories = storyAudioManifestSchema.safeParse(storyManifest)
  const monthly = monthlyAudioManifestSchema.safeParse(monthlyManifest)
  const tracks: PlayableAudioTrack[] = [
    ...(parsed.success ? parsed.data.tracks : []),
    ...(stories.success ? stories.data.tracks : []),
    ...(monthly.success ? monthly.data.tracks : []),
  ]
  const mappings = new Map(tracks.map((track) => [mappingId(track.entryId, track.language), track]))
  const byId = new Map(rows.map((row) => [row.id, row]))
  const invalidKind = tracks.some((track) => {
    const entry = byId.get(track.entryId)
    return entry && isStoryEpisode(entry) !== (track.kind === 'guided-story')
  })
  return {
    rows: byId, tracks: mappings,
    issue: parsed.success && stories.success && monthly.success && mappings.size === tracks.length && !invalidKind ? null : { code: 'invalid-metadata' },
  }
}

/** Keep logical IDs; only the language-specific projection collapses identical clips. */
export function buildListeningQueue(
  catalog: ListeningCatalog, input: ListeningQueueInput, language: AudioLanguage,
): ListeningResult<{ queue: ListeningQueue; items: readonly ListeningItem[] }> {
  // Accept an existing canonical queue without admitting unknown fields in external data.
  let candidate: unknown = input
  if ('currentEntryId' in input) {
    const { currentEntryId: _current, ...rest } = input
    candidate = rest
  }
  const parsed = queueInputSchema.safeParse(candidate)
  if (!parsed.success || !audioLanguages.includes(language)) return fail('invalid-data')
  if (catalog.issue) return { ok: false, issue: catalog.issue }
  if (parsed.data.entryIds.some((entryId) => !catalog.rows.has(entryId))) return fail('unknown-identity')
  const storyQueue = isStoryEpisode(catalog.rows.get(parsed.data.entryIds[0])!)
  const first = catalog.rows.get(parsed.data.entryIds[0])!
  const monthlyId = isMonthlyChapter(first) ? first.monthlyEpisodeId : null
  if (parsed.data.entryIds.some((entryId) => {
    const entry = catalog.rows.get(entryId)!
    return isStoryEpisode(entry) !== storyQueue || (isStoryEpisode(entry) && entry.shelf !== parsed.data.shelf)
      || (isMonthlyChapter(entry) ? entry.monthlyEpisodeId : null) !== monthlyId
  }) || (storyQueue && language === 'ar') || (monthlyId && parsed.data.topic !== 'all')) return fail('invalid-data')
  const entryIds = [...new Set(parsed.data.entryIds)].filter((entryId) => {
    const entry = catalog.rows.get(entryId)!
    return parsed.data.includeCautioned || isStoryEpisode(entry) || isEstablished(entry)
  })
  if (!entryIds.length) return fail('empty-queue')
  const items: { entryId: string; entryIds: string[]; track: PlayableAudioTrack | null }[] = []
  const seen = new Map<string, number>()
  for (const entryId of entryIds) {
    const track = catalog.tracks.get(mappingId(entryId, language)) ?? null
    const duplicate = track ? seen.get(track.cacheKey) : undefined
    if (duplicate !== undefined) items[duplicate].entryIds.push(entryId)
    else {
      if (track) seen.set(track.cacheKey, items.length)
      items.push({ entryId, entryIds: [entryId], track })
    }
  }
  return ok({ queue: { ...parsed.data, entryIds, currentEntryId: entryIds[0] }, items })
}

function tooLarge(text: string) {
  return text.length > listeningLimits.fileBytes || new TextEncoder().encode(text).byteLength > listeningLimits.fileBytes
}

/** Strict validation against the current canonical corpus AND saved manifest, never URLs from a backup. */
export function validateListeningData(input: unknown, catalog: ListeningCatalog): ListeningResult<ListeningData> {
  const parsed = listeningDataSchema.safeParse(input)
  if (!parsed.success) return fail('invalid-data')
  const data = parsed.data
  for (const cursor of data.positions) {
    const track = catalog.tracks.get(cursorId(cursor))
    if (!catalog.rows.has(cursor.entryId) || !track || track.cacheKey !== cursor.cacheKey || track.sha256 !== cursor.sha256) {
      return fail('unknown-identity')
    }
    if (!isMonthlyChapter(catalog.rows.get(cursor.entryId)!) && cursor.time > 590) return fail('invalid-data')
  }
  if (data.queue) {
    const queue = buildListeningQueue(catalog, data.queue, data.language)
    if (!queue.ok) return queue
    if (queue.value.queue.entryIds.length !== data.queue.entryIds.length) return fail('invalid-data')
  }
  return ok(data)
}

export function parseListeningData(text: string, catalog: ListeningCatalog): ListeningResult<ListeningData> {
  if (tooLarge(text)) return fail('file-too-large')
  let input: unknown
  try { input = JSON.parse(text) } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    return fail('invalid-data')
  }
  return validateListeningData(input, catalog)
}

export function serializeListeningData(data: unknown, catalog: ListeningCatalog): ListeningResult<string> {
  const parsed = validateListeningData(data, catalog)
  if (!parsed.ok) return parsed
  const text = JSON.stringify(parsed.value)
  return tooLarge(text) ? fail('file-too-large') : ok(text)
}

export function mergeListeningData(local: unknown, imported: unknown, catalog: ListeningCatalog): ListeningResult<ListeningData> {
  const a = validateListeningData(local, catalog)
  const b = validateListeningData(imported, catalog)
  if (!a.ok) return a
  if (!b.ok) return b
  const localIds = new Set(a.value.positions.map(cursorId))
  const positions = [...b.value.positions.filter((cursor) => !localIds.has(cursorId(cursor))), ...a.value.positions]
  return validateListeningData({ ...a.value, positions, queue: a.value.queue ?? b.value.queue }, catalog)
}

export function replaceListeningData(imported: unknown, catalog: ListeningCatalog, confirmed: boolean): ListeningResult<ListeningData> {
  return confirmed ? validateListeningData(imported, catalog) : fail('replace-required')
}

function storageFailure(error: unknown): ListeningIssue {
  return { code: error instanceof Error && error.name === 'QuotaExceededError' ? 'quota' : 'unavailable' }
}

export function loadListening(storage: ListeningStorage, catalog: ListeningCatalog): {
  data: ListeningData; raw: string | null | undefined; issue: ListeningIssue | null
} {
  let raw: string | null
  try { raw = storage().getItem(listeningKey) } catch (error) {
    return { data: emptyListening(), raw: undefined, issue: storageFailure(error) }
  }
  if (raw === null) return { data: emptyListening(), raw, issue: null }
  const parsed = parseListeningData(raw, catalog)
  return parsed.ok ? { data: parsed.value, raw, issue: null } : {
    data: emptyListening(), raw,
    issue: { code: parsed.issue.code === 'invalid-data' ? 'invalid-storage' : parsed.issue.code },
  }
}

/** Optimistic compare-before-write plus read-back; storage is not a cross-tab transaction. */
export function saveListening(
  storage: ListeningStorage, data: unknown, expectedRaw: string | null, catalog: ListeningCatalog,
): ListeningResult<string> {
  const serialized = serializeListeningData(data, catalog)
  if (!serialized.ok) return serialized
  try {
    const target = storage()
    if (target.getItem(listeningKey) !== expectedRaw) return fail('changed-storage')
    target.setItem(listeningKey, serialized.value)
    if (target.getItem(listeningKey) !== serialized.value) return fail('verify-failed')
    return serialized
  } catch (error) { return { ok: false, issue: storageFailure(error) } }
}

export type ListeningMedia = Pick<HTMLAudioElement,
  'src' | 'currentTime' | 'duration' | 'playbackRate' | 'paused' | 'readyState' |
  'play' | 'pause' | 'load' | 'removeAttribute' | 'addEventListener' | 'removeEventListener'> & {
    readonly error?: Pick<MediaError, 'code'> | null
  }
export type ListeningSnapshot = {
  readonly data: ListeningData; readonly queue: ListeningQueue | null
  readonly items: readonly ListeningItem[]; readonly position: number
  readonly currentNarration: Narration | null; readonly currentStory: StoryEpisode | null
  readonly currentEntry: ListeningEntry | null; readonly currentTrack: PlayableAudioTrack | null
  readonly language: AudioLanguage; readonly rate: number
  readonly currentTime: number; readonly duration: number
  readonly playing: boolean; readonly loading: boolean; readonly ended: boolean
  readonly error: ListeningIssue | null; readonly storageIssue: ListeningIssue | null
  readonly writable: boolean; readonly follow: boolean; readonly followSuspended: boolean
}
export type ListeningReplaceOptions = { mode: 'merge' | 'replace'; confirmed: boolean; baseline?: string }
export type ListeningRestoreMode = 'merge' | 'replace'
export type ListeningExport = {
  readonly data: ListeningData
  readonly baseline: string
  /** Export success means valid memory data, NOT that its local-storage write succeeded. */
  readonly storageIssue: ListeningIssue | null
  readonly writable: boolean
}
export type ListeningRestorePreview = {
  readonly mode: ListeningRestoreMode
  readonly baseline: string
  /** Validated planned result; merge already preserves local position conflicts. */
  readonly data: ListeningData
}
export type ListeningApplyRestoreOptions = { confirmed: boolean; expectedBaseline: string }
export type ListeningEngineOptions = {
  rows: readonly ListeningEntry[]; manifest: unknown; storyManifest?: unknown; monthlyManifest?: unknown; storage: ListeningStorage; pageHref?: string; now?: () => number
  initialLanguage?: AudioLanguage
}

/** Side-effect-free construction: React StrictMode may construct/discard this object.
 * Media is exclusively supplied by a stable root ref; no detached Audio objects.
 */
export function createListeningEngine(options: ListeningEngineOptions) {
  let catalog = createListeningCatalog(options.rows, options.manifest, options.storyManifest, options.monthlyManifest)
  const loaded = loadListening(options.storage, catalog)
  let raw = loaded.raw
  let data = loaded.raw === null && options.initialLanguage
    ? { ...loaded.data, language: options.initialLanguage } : loaded.data
  let media: ListeningMedia | null = null
  let removeEvents = () => {}
  let operation = 0
  let intent = false
  let internalPause = false
  let checkpointAt = 0
  const now = options.now ?? Date.now
  const listeners = new Set<() => void>()
  const restorePreviews = new WeakMap<ListeningRestorePreview, {
    mode: ListeningRestoreMode; baseline: string; raw: string | null; serialized: string
  }>()
  let snapshot: ListeningSnapshot = {
    data, queue: data.queue, items: [], position: -1, currentNarration: null, currentStory: null, currentEntry: null, currentTrack: null,
    language: data.language, rate: data.rate, currentTime: 0, duration: 0,
    playing: false, loading: false, ended: false, error: null, storageIssue: loaded.issue,
    writable: loaded.issue === null, follow: false, followSuspended: false,
  }
  function emit(patch: Partial<ListeningSnapshot> = {}) {
    snapshot = { ...snapshot, data, queue: data.queue, language: data.language, rate: data.rate, ...patch }
    for (const listener of listeners) listener()
  }
  function project() {
    const result = data.queue ? buildListeningQueue(catalog, data.queue, data.language) : null
    const items = result?.ok ? result.value.items : []
    const position = items.findIndex((item) => item.entryIds.includes(data.queue!.currentEntryId))
    const currentTrack = items[position]?.track ?? null
    const currentEntry = data.queue ? catalog.rows.get(data.queue.currentEntryId) ?? null : null
    emit({
      items, position, currentTrack, currentEntry,
      currentNarration: currentEntry && !isStoryEpisode(currentEntry) ? currentEntry : null,
      currentStory: currentEntry && isStoryEpisode(currentEntry) ? currentEntry : null,
      currentTime: 0, duration: 0, ended: false,
      error: result && !result.ok ? result.issue : data.queue && !currentTrack ? { code: 'missing-track' } : null,
    })
  }
  function persist() {
    if (!snapshot.writable || raw === undefined) return
    const result = saveListening(options.storage, data, raw, catalog)
    if (result.ok) { raw = result.value; emit({ storageIssue: null }) }
    else {
      emit({ storageIssue: result.issue, writable: false })
      if (result.issue.code === 'changed-storage') stop(false)
    }
  }
  function cursor() {
    const track = snapshot.currentTrack
    return data.positions.findLast((value) => value.language === data.language
      && value.cacheKey === track?.cacheKey && value.sha256 === track.sha256)
  }
  function record(time: number, completed = false) {
    const entryId = data.queue?.currentEntryId
    const track = snapshot.currentTrack
    if (!entryId || !track || !Number.isFinite(time)) return
    const next: ListeningCursor = {
      entryId, language: data.language, cacheKey: track.cacheKey, sha256: track.sha256,
      time: Math.max(0, Math.min(snapshot.currentStory && isMonthlyChapter(snapshot.currentStory) ? monthlyMaxTrackSeconds : 590, time)), completed,
    }
    const positions = data.positions.filter((value) => cursorId(value) !== cursorId(next))
    positions.push(next)
    // Most recently checkpointed cursors win only when the local bounded history fills.
    data = { ...data, positions: positions.slice(-listeningLimits.entries) }
  }
  function checkpoint() {
    if (media && media.readyState > 0 && snapshot.currentTrack) {
      record(media.currentTime, snapshot.ended)
      checkpointAt = now()
      emit({ currentTime: media.currentTime })
    }
    persist()
  }
  function stop(check = true) {
    operation++
    intent = false
    if (check) checkpoint()
    internalPause = true
    media?.pause()
    internalPause = false
    emit({ playing: false, loading: false })
  }
  function restoreTime() {
    if (!media || !snapshot.currentTrack || !Number.isFinite(media.duration) || media.duration <= 0) return
    const saved = cursor()
    const time = !saved || saved.completed || saved.time >= media.duration ? 0 : saved.time
    try { media.currentTime = time } catch {
      stop(false)
      emit({ error: { code: 'asset-error' } })
      return
    }
    emit({ currentTime: time, duration: media.duration })
  }
  function selectMedia() {
    if (!media) return
    if (!snapshot.currentTrack) {
      resetAudio(media)
      return
    }
    const src = resolveAudioAsset(snapshot.currentTrack.asset, options.pageHref)
    if (!src) { emit({ error: { code: 'invalid-metadata' } }); return }
    media.src = src
    media.load()
    media.playbackRate = data.rate
    emit({ currentTime: cursor()?.completed ? 0 : cursor()?.time ?? 0, duration: 0, loading: false })
  }
  function play() {
    if (!snapshot.currentTrack) {
      if (data.queue) emit({ error: { code: 'missing-track' } })
      return
    }
    if (!media) { emit({ error: { code: 'media-unavailable' } }); return }
    if (snapshot.error?.code === 'asset-error' || snapshot.error?.code === 'playback-aborted') selectMedia()
    if (snapshot.ended || (media.readyState > 0 && media.currentTime >= media.duration)) {
      media.currentTime = 0
      record(0)
      emit({ currentTime: 0, ended: false })
    }
    const token = ++operation
    intent = true
    emit({ loading: true, error: null })
    try {
      void media.play().then(() => {
        if (token === operation && intent) emit({ playing: !media!.paused, loading: false })
      }, (error: unknown) => {
        if (token !== operation) return
        stop()
        emit({ error: { code: error instanceof Error && error.name === 'AbortError' ? 'playback-aborted' : 'playback-rejected' } })
      })
    } catch {
      if (token === operation) { stop(); emit({ error: { code: 'playback-rejected' } }) }
    }
  }
  function move(position: number, continuePlaying = intent || snapshot.playing) {
    const item = snapshot.items[position]
    if (!item || !data.queue) return
    stop()
    data = { ...data, queue: { ...data.queue, currentEntryId: item.entryId } }
    project()
    selectMedia()
    persist()
    if (continuePlaying) play()
  }
  function bindAudio(element: ListeningMedia | null) {
    if (element === media) return
    if (media) {
      stop()
      removeEvents()
      resetAudio(media)
    }
    media = element
    if (!element) return
    const on = (name: string, handler: () => void) => {
      element.addEventListener(name, handler)
      return () => element.removeEventListener(name, handler)
    }
    const cleanup = [
      on('loadedmetadata', restoreTime),
      on('durationchange', () => {
        if (Number.isFinite(element.duration) && element.duration > 0) {
          emit({ duration: element.duration })
          if (element.currentTime > element.duration) {
            element.currentTime = element.duration
            checkpoint()
          }
        }
      }),
      on('timeupdate', () => {
        if (!snapshot.currentTrack || !Number.isFinite(element.currentTime)) return
        emit({ currentTime: element.currentTime })
        if (snapshot.playing && now() - checkpointAt >= 2000) checkpoint()
      }),
      on('seeking', () => {
        if (element.readyState > 0) {
          emit({ currentTime: element.currentTime })
          checkpoint()
        }
      }),
      on('playing', () => {
        if (!intent) { element.pause(); return }
        emit({ playing: true, loading: false })
      }),
      on('waiting', () => { if (intent) emit({ loading: true }) }),
      on('pause', () => {
        if (internalPause || !element.paused) return
        // Native EOF queues pause before ended. Explicit pauses already clear intent in stop().
        if (intent && Number.isFinite(element.duration) && element.currentTime >= element.duration) return
        intent = false
        operation++
        checkpoint()
        emit({ playing: false, loading: false })
      }),
      on('ended', () => {
        if (!intent || !snapshot.currentTrack || !Number.isFinite(element.duration) || element.currentTime < element.duration) return
        record(Number.isFinite(element.duration) ? element.duration : element.currentTime, true)
        emit({ playing: false, loading: false, ended: true, currentTime: element.currentTime })
        persist()
        if (snapshot.position + 1 < snapshot.items.length) move(snapshot.position + 1, true)
        else { intent = false; operation++ }
      }),
      ...(['error', 'abort'] as const).map((event) => on(event, () => {
        // load()/src replacement queues an abort for the OLD fetch with no current
        // MediaError. Current play() AbortErrors are separately guarded by operation.
        if (!snapshot.currentTrack || (event === 'abort' && (!intent || element.error?.code !== 1))) return
        stop()
        emit({ error: { code: event === 'error' ? 'asset-error' : 'playback-aborted' } })
      })),
    ]
    removeEvents = () => cleanup.forEach((remove) => remove())
    selectMedia()
  }
  function startQueue(input: ListeningQueueInput, language: AudioLanguage, startAt?: string): ListeningResult<undefined> {
    const next = buildListeningQueue(catalog, input, language)
    stop()
    if (!next.ok) { emit({ error: next.issue }); return next }
    if (startAt && !next.value.queue.entryIds.includes(startAt)) {
      emit({ error: { code: 'unknown-identity' } })
      return fail('unknown-identity')
    }
    data = { ...data, language, queue: { ...next.value.queue, currentEntryId: startAt ?? next.value.queue.currentEntryId } }
    project()
    selectMedia()
    persist()
    play()
    return ok(undefined)
  }
  function startEntry(entryId: string, language: AudioLanguage, context?: ListeningContext): ListeningResult<undefined> {
    const row = catalog.rows.get(entryId)
    if (!row) { stop(); emit({ error: { code: 'unknown-identity' } }); return fail('unknown-identity') }
    const shelf = isStoryEpisode(row) ? row.shelf : shelves.find((value) => row.topics.some((topic) => topicsByShelf[value].includes(topic)))!
    return startQueue({
      shelf, topic: 'all', title: row.title, ...context, entryIds: [entryId],
    }, language)
  }
  function setLanguage(language: AudioLanguage) {
    if (!audioLanguages.includes(language) || data.language === language) return
    stop()
    data = { ...data, language }
    project()
    selectMedia()
    persist()
  }
  function seek(time: number) {
    if (!media || !snapshot.currentTrack || !Number.isFinite(time)) return
    const duration = Number.isFinite(media.duration) && media.duration > 0 ? media.duration : snapshot.currentTrack.durationSeconds
    const next = Math.max(0, Math.min(time, duration))
    record(next)
    if (media.readyState > 0) {
      try { media.currentTime = next } catch { emit({ error: { code: 'asset-error' } }); return }
    }
    emit({ currentTime: next, ended: false })
    checkpointAt = now()
    persist()
  }
  function setRate(rate: number) {
    if (!listeningRates.some((value) => value === rate)) return
    data = { ...data, rate }
    if (media) media.playbackRate = rate
    persist()
    emit()
  }
  function reload() {
    stop(false)
    const next = loadListening(options.storage, catalog)
    raw = next.raw
    data = next.data
    emit({ storageIssue: next.issue, writable: next.issue === null, follow: false, followSuspended: false })
    project()
    selectMedia()
  }
  function checkStorage() {
    try {
      if (options.storage().getItem(listeningKey) === raw) return
      stop(false)
      emit({ storageIssue: { code: 'changed-storage' }, writable: false })
    } catch (error) {
      stop(false)
      emit({ storageIssue: storageFailure(error), writable: false })
    }
  }
  function replaceData(imported: unknown, replace: ListeningReplaceOptions): ListeningResult<ListeningData> {
    if (snapshot.playing || intent) return fail('busy')
    if (!replace.confirmed) return fail('replace-required')
    if (replace.baseline !== undefined && replace.baseline !== JSON.stringify(data)) return fail('stale-preview')
    if (replace.mode === 'merge' && !snapshot.writable) return fail('replace-required')
    const next = replace.mode === 'merge' ? mergeListeningData(data, imported, catalog)
      : replaceListeningData(imported, catalog, replace.confirmed)
    if (!next.ok) return next
    // Corrupt/unknown storage is replaceable only by an explicit confirmed replacement.
    if (raw === undefined) return fail('unavailable')
    const saved = saveListening(options.storage, next.value, raw, catalog)
    if (!saved.ok) { emit({ storageIssue: saved.issue, writable: false }); return saved }
    stop(false)
    raw = saved.value
    data = next.value
    emit({ storageIssue: null, writable: true, follow: false, followSuspended: false })
    project()
    selectMedia()
    return ok(data)
  }
  /** Stable synchronous getter for backup-v2. A failed checkpoint remains visible
   * in value.storageIssue; validated in-memory positions are still exportable.
   */
  function checkpointAndExport(): ListeningResult<ListeningExport> {
    checkpoint()
    const validated = validateListeningData(data, catalog)
    if (!validated.ok) return validated
    return ok({
      data: validated.value, baseline: JSON.stringify(data),
      storageIssue: snapshot.storageIssue, writable: snapshot.writable,
    })
  }
  /** The parent pauses first. Preparing never applies imported data. */
  function prepareRestore(imported: unknown, mode: ListeningRestoreMode): ListeningResult<ListeningRestorePreview> {
    if (snapshot.playing || intent) return fail('busy')
    if (mode !== 'merge' && mode !== 'replace') return fail('invalid-data')
    const current = checkpointAndExport()
    if (!current.ok) return current
    if (raw === undefined) return fail('unavailable')
    if (snapshot.storageIssue?.code === 'changed-storage') return fail('changed-storage')
    if (mode === 'merge' && !snapshot.writable) return fail('replace-required')
    const planned = mode === 'merge' ? mergeListeningData(current.value.data, imported, catalog)
      : replaceListeningData(imported, catalog, true)
    if (!planned.ok) return planned
    const preview: ListeningRestorePreview = { mode, baseline: current.value.baseline, data: planned.value }
    restorePreviews.set(preview, { mode, baseline: preview.baseline, raw, serialized: JSON.stringify(preview.data) })
    return ok(preview)
  }
  /** Preview identity, planned content, caller baseline, live baseline and storage
   * baseline must all agree. The final write retains compare/read-back verification.
   */
  function checkRestore(preview: ListeningRestorePreview, apply: ListeningApplyRestoreOptions): ListeningResult<ListeningData> {
    if (snapshot.playing || intent) return fail('busy')
    if (!apply.confirmed) return fail('replace-required')
    const expected = restorePreviews.get(preview)
    if (!expected || preview.mode !== expected.mode || preview.baseline !== expected.baseline
      || apply.expectedBaseline !== expected.baseline || JSON.stringify(data) !== expected.baseline
      || raw !== expected.raw) return fail('stale-preview')
    const serialized = serializeListeningData(preview.data, catalog)
    if (!serialized.ok) return serialized
    if (serialized.value !== expected.serialized) return fail('stale-preview')
    checkStorage()
    if (snapshot.storageIssue?.code === 'changed-storage') return fail('changed-storage')
    if (snapshot.storageIssue?.code === 'unavailable') return fail('unavailable')
    return ok(preview.data)
  }
  function applyRestore(preview: ListeningRestorePreview, apply: ListeningApplyRestoreOptions): ListeningResult<ListeningData> {
    const valid = checkRestore(preview, apply)
    if (!valid.ok) return valid
    const expected = restorePreviews.get(preview)!
    const result = replaceData(preview.data, { mode: expected.mode, confirmed: true, baseline: expected.baseline })
    if (result.ok) restorePreviews.delete(preview)
    return result
  }
  project()
  return {
    getSnapshot: () => snapshot,
    getEntry: (entryId: string) => catalog.rows.get(entryId) ?? null,
    getNarration: (entryId: string) => {
      const entry = catalog.rows.get(entryId)
      return entry && !isStoryEpisode(entry) ? entry : null
    },
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    bindAudio, startQueue, startEntry, play, resume: play, pause: () => stop(),
    previous: () => move(snapshot.position - 1), next: () => move(snapshot.position + 1),
    seek, setLanguage, setRate,
    setShelf: (shelf: Shelf | 'all') => { if (shelf !== 'all' && data.queue && shelf !== data.queue.shelf) stop() },
    setFollow: (follow: boolean) => emit({ follow, followSuspended: false }),
    suspendFollow: () => { if (snapshot.follow) emit({ followSuspended: true }) },
    dismiss: () => {
      stop()
      data = { ...data, queue: null }
      project()
      selectMedia()
      persist()
    },
    checkpoint, checkStorage, reload, replaceData, checkpointAndExport, prepareRestore, checkRestore, applyRestore,
    validateData: (input: unknown) => validateListeningData(input, catalog),
    exportData: () => validateListeningData(data, catalog),
    serialize: () => serializeListeningData(data, catalog),
    setRows: (rows: readonly ListeningEntry[]) => {
      if (rows.length === catalog.rows.size && rows.every((row) => catalog.rows.get(row.id) === row)) return
      catalog = createListeningCatalog(rows, options.manifest, options.storyManifest, options.monthlyManifest)
      const valid = validateListeningData(data, catalog)
      if (!valid.ok) { stop(false); emit({ storageIssue: valid.issue, writable: false, error: valid.issue }) }
      else {
        const { currentTime, duration, ended, error } = snapshot
        project()
        emit({ currentTime, duration, ended, error })
      }
    },
  }
}
export type ListeningEngine = ReturnType<typeof createListeningEngine>
export type ListeningController = ListeningSnapshot & ListeningEngine
