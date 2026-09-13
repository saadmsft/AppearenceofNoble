import manifest from '../../src/data/story-audio-manifest.json' with { type: 'json' }

/** Artificial publication for isolated tests only; never imported by the app. */
export function monthlyFixture() {
  const episode = {
    id: 'test-monthly', status: 'published' as const, publishedOn: '2026-09-01',
    title: { en: 'Test monthly episode', ur: 'آزمائشی ماہانہ قسط' },
    summary: { en: 'Artificial episode for player testing.', ur: 'پلیئر کی جانچ کے لیے آزمائشی قسط۔' },
    editorialNote: { en: 'Test content, not historical evidence.', ur: 'یہ آزمائشی متن ہے، تاریخی ثبوت نہیں۔' },
    chapters: ['first', 'second'].map((name) => ({
      kind: 'story' as const, id: `story-monthly-test-${name}`, monthlyEpisodeId: 'test-monthly',
      shelf: 'life' as const, topic: 'all' as const,
      title: { en: `Test ${name}`, ur: `آزمائشی باب ${name}` },
      text: { en: `Artificial transcript ${name}.`, ur: `آزمائشی متن ${name}۔` },
      sourceIds: ['test-source'],
    })),
    sources: [{ id: 'test-source', reference: 'Test reference (not evidence)', url: 'https://sunnah.com/bukhari:3',
      note: { en: 'Fixture link only.', ur: 'صرف آزمائشی رابطہ۔' } }],
  }
  const tracks = episode.chapters.flatMap((chapter, index) => (['en', 'ur'] as const).map((language) => {
    const track = manifest.tracks.filter((item) => item.language === language)[index]
    return { ...track, entryId: chapter.id, language, durationSeconds: 450 }
  }))
  return { episode, series: { version: 1, episodes: [episode] }, audio: { version: 1, tracks } }
}
