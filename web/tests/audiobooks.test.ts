import assert from 'node:assert/strict'
import { test } from 'node:test'
import { audiobook, audiobookPosition, audiobookTime } from '../src/lib/audiobooks.ts'
import { emptyListening } from '../src/lib/listening.ts'
import type { ListeningData } from '../src/lib/listening.ts'
import { parseRoute } from '../src/lib/route.ts'

test('audiobook library has a stable route while existing book links remain valid', () => {
  const library = parseRoute(new URL('https://thenobleproject.org/?view=audiobooks'))
  assert.equal(library.view, 'audiobooks')
  assert.equal(library.shelf, 'all')
  assert.equal(parseRoute(new URL('https://thenobleproject.org/?view=listen&shelf=life')).view, 'listen')
})

test('book durations and chapter counts come from the selected language recordings', () => {
  for (const [shelf, count] of [['appearance', 16], ['character', 8], ['life', 12]] as const) {
    for (const language of ['en', 'ur'] as const) {
      const book = audiobook(shelf, language)
      assert.equal(book.chapters.length, count)
      assert.ok(book.chapters.every(({ track }) => track.language === language))
      assert.equal(book.duration, book.chapters.reduce((sum, chapter) => sum + chapter.track.durationSeconds, 0))
    }
  }
  assert.equal(audiobookTime(125), '2:05')
})

test('resume chooses the saved chapter and time without mutating personal state', () => {
  const book = audiobook('life', 'ur')
  const chapter = book.chapters[3]
  const data: ListeningData = { ...emptyListening(), positions: [{
    entryId: chapter.episode.id, language: 'ur', cacheKey: chapter.track.cacheKey,
    sha256: chapter.track.sha256, time: 8.25, completed: false,
  }] }
  const before = JSON.stringify(data)
  const position = audiobookPosition(book, data)
  assert.equal(position.hasResume, true)
  assert.equal(position.entryId, chapter.episode.id)
  assert.equal(position.chapterIndex, 3)
  assert.equal(position.seconds, book.chapters.slice(0, 3).reduce((sum, item) => sum + item.duration, 0) + 8.25)
  assert.equal(JSON.stringify(data), before)
  assert.equal(audiobookPosition(audiobook('life', 'en'), data).seconds, 0)
})

test('completed chapter resumes at the next chapter and an end position does not claim reading completion', () => {
  const book = audiobook('character', 'en')
  function data(index: number): ListeningData {
    const item = book.chapters[index]
    return { ...emptyListening(), positions: [{
      entryId: item.episode.id, language: 'en', cacheKey: item.track.cacheKey,
      sha256: item.track.sha256, time: item.duration, completed: true,
    }] }
  }
  assert.equal(audiobookPosition(book, data(2)).chapterIndex, 3)
  const end = audiobookPosition(book, data(book.chapters.length - 1))
  assert.equal(end.atEnd, true)
  assert.equal(end.hasResume, false)
  assert.equal(end.entryId, book.chapters[0].episode.id)
  assert.equal(end.seconds, book.duration)
})

test('stale audio identities cannot manufacture audiobook progress', () => {
  const book = audiobook('appearance', 'en')
  const item = book.chapters[0]
  const data: ListeningData = { ...emptyListening(), positions: [{
    entryId: item.episode.id, language: 'en', cacheKey: item.track.cacheKey,
    sha256: 'f'.repeat(64), time: 15, completed: false,
  }] }
  assert.equal(audiobookPosition(book, data).hasResume, false)
  assert.equal(audiobookPosition(book, data).seconds, 0)
})
