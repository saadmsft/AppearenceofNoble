import { useEffect, useState, useSyncExternalStore } from 'react'
import staticManifest from '../data/audio-manifest.json'
import storyManifest from '../data/story-audio-manifest.json'
import monthlyManifest from '../data/monthly-audio-manifest.json'
import { createListeningEngine, listeningKey } from '../lib/listening.ts'
import type { ListeningController, ListeningStorage } from '../lib/listening.ts'
import type { Shelf } from '../lib/schema.ts'
import type { ListeningEntry } from '../lib/story-audio.ts'
import type { AudioLanguage } from '../lib/audio.ts'

export type { ListeningController } from '../lib/listening.ts'
export type UseListeningOptions = { manifest?: unknown; storyManifest?: unknown; monthlyManifest?: unknown; storage?: ListeningStorage; initialLanguage?: AudioLanguage }

/** Mount once at the App root. Options are initial dependencies, not reactive preferences.
 * Construction never creates media; ListeningPlayer supplies the sole stable audio ref.
 */
export function useListening(
  rows: readonly ListeningEntry[], currentShelf: Shelf | 'all', options: UseListeningOptions = {},
): ListeningController {
  const [engine] = useState(() => createListeningEngine({
    rows, manifest: options.manifest ?? staticManifest,
    storyManifest: options.storyManifest ?? storyManifest,
    monthlyManifest: options.monthlyManifest ?? monthlyManifest,
    storage: options.storage ?? (() => window.localStorage),
    pageHref: typeof window === 'undefined' ? undefined : window.location.href,
    initialLanguage: options.initialLanguage,
  }))
  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot)
  useEffect(() => { engine.setRows(rows) }, [engine, rows])
  useEffect(() => { engine.setShelf(currentShelf) }, [engine, currentShelf])
  useEffect(() => {
    const pagehide = () => engine.pause()
    const visibility = () => { if (document.visibilityState === 'hidden') engine.checkpoint() }
    const storage = (event: StorageEvent) => {
      if (event.key === listeningKey || event.key === null) engine.checkStorage()
    }
    window.addEventListener('pagehide', pagehide)
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('storage', storage)
    return () => {
      window.removeEventListener('pagehide', pagehide)
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('storage', storage)
      engine.pause()
    }
  }, [engine])
  // Engine functions are allocated once, so refs and parent effects do not churn on timeupdate.
  return { ...snapshot, ...engine }
}
