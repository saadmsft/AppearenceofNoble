import rawManifest from '../data/story-audio-manifest.json' with { type: 'json' }
import { storyAudioManifestSchema } from './story-audio.ts'
import { storiesByShelf } from './stories.ts'
import type { Language, Shelf } from './schema.ts'
import type { ListeningData, ListeningSnapshot } from './listening.ts'

const manifest = storyAudioManifestSchema.parse(rawManifest)
const tracks = new Map(manifest.tracks.map((track) => [`${track.entryId}:${track.language}`, track]))

export function audiobook(shelf: Shelf, language: Language) {
  const chapters = storiesByShelf(shelf).map((episode) => {
    const track = tracks.get(`${episode.id}:${language}`)
    if (!track) throw new Error(`Missing audiobook recording: ${episode.id}:${language}`)
    return { episode, track, duration: track.durationSeconds }
  })
  return { shelf, language, chapters, duration: chapters.reduce((sum, chapter) => sum + chapter.duration, 0) }
}

type PositionedBook = {
  shelf: Shelf; language: Language; duration: number
  chapters: readonly { episode: { id: string }; track: { cacheKey: string; sha256: string }; duration: number }[]
}

export function audiobookPosition(book: PositionedBook, data: ListeningData, live?: ListeningSnapshot) {
  if (!book.chapters.length || book.duration <= 0) throw new Error('Listening position requires a nonempty recorded book')
  const valid = data.positions.filter((cursor) => book.chapters.some(({ episode, track }) =>
    episode.id === cursor.entryId && cursor.language === book.language
      && cursor.cacheKey === track.cacheKey && cursor.sha256 === track.sha256))
  const latest = valid.at(-1)
  let index = latest ? book.chapters.findIndex(({ episode }) => episode.id === latest.entryId) : 0
  let time = latest?.time ?? 0
  let completed = latest?.completed ?? false
  if (live?.currentStory?.shelf === book.shelf && live.language === book.language) {
    const liveIndex = book.chapters.findIndex(({ episode }) => episode.id === live.currentStory?.id)
    const saved = valid.find((cursor) => cursor.entryId === live.currentStory?.id)
    if (liveIndex >= 0 && (!saved?.completed || live.playing || live.currentTime > 0)) {
      index = liveIndex
      time = live.currentTime
      completed = live.ended
    }
  }
  time = completed ? book.chapters[index].duration : Math.max(0, Math.min(time, book.chapters[index].duration))
  const seconds = book.chapters.slice(0, index).reduce((sum, chapter) => sum + chapter.duration, 0) + time
  const atEnd = completed && index === book.chapters.length - 1
  const resumeIndex = atEnd ? 0 : completed ? Math.min(index + 1, book.chapters.length - 1) : index
  return {
    seconds, fraction: Math.max(0, Math.min(1, seconds / book.duration)), atEnd,
    hasResume: seconds > 0 && !atEnd, chapterIndex: resumeIndex,
    entryId: book.chapters[resumeIndex].episode.id,
  }
}

export function audiobookTime(seconds: number) {
  const value = Math.max(0, Math.round(seconds))
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
}
