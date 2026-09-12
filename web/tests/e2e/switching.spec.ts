import { expect, test } from './fixtures.ts'
import { shelfLabels } from '../../src/lib/catalog.ts'
import { translate } from '../../src/lib/i18n.ts'
import type { Shelf } from '../../src/lib/schema.ts'

for (const language of ['en', 'ur'] as const) {
  test(`repeated collection switching replaces the entire journey without stale headers (${language})`, async ({ page }) => {
    await page.addInitScript((lang) => {
      const id = 'most-handsome-face-best-form-bara'
      localStorage.setItem('noble-appearance.preferences.v1', JSON.stringify({
        language: lang, theme: 'light', bookmarks: [id], textSize: 'large', bilingual: true, motion: 'paused',
      }))
      localStorage.setItem('noble-project.reading.v1', JSON.stringify({
        version: 1,
        entries: { [id]: { read: true, note: 'Preserve this private switching fixture.' } },
        lastOpened: { id, at: '2026-09-11T21:00:00Z' },
      }))
    }, language)
    await page.goto(`./?view=journey&shelf=appearance&lang=${language}`)
    const storedBefore = await page.evaluate(() => ({
      preferences: localStorage.getItem('noble-appearance.preferences.v1'),
      reading: localStorage.getItem('noble-project.reading.v1'),
    }))

    async function expectShelf(shelf: Shelf) {
      await expect(page.locator('.hero-shell')).toHaveCount(1)
      await expect(page.locator('.topic-journey')).toHaveCount(1)
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
      const first = translate(language, shelf === 'character' ? 'characterHeroFirst' : 'heroFirst')
      const second = translate(language, shelf === 'character' ? 'characterHeroSecond' : 'heroSecond')
      await expect(page.locator('.hero-shell h1')).toHaveText(`${first} ${second}`)
      await expect(page.locator('.journey-chapter')).toHaveCount(shelf === 'character' ? 8 : 16)
      await expect(page.locator('.narration-card')).toHaveCount(0)
      expect(new URL(page.url()).searchParams.get('shelf')).toBe(shelf)
      const ids = await page.locator('[id]').evaluateAll((elements) => elements.map((element) => element.id))
      expect(new Set(ids).size).toBe(ids.length)
    }

    await expectShelf('appearance')
    await page.locator('.journey-chapter').first().locator('.chapter-actions .button[aria-expanded]').click()
    await expect(page.locator('.narration-card').first()).toBeVisible()

    for (const shelf of ['character', 'appearance', 'character', 'appearance'] as const) {
      await page.getByRole('group', { name: translate(language, 'shelfFilter'), exact: true })
        .getByRole('button', { name: shelfLabels[shelf][language], exact: true }).click()
      await expectShelf(shelf)
    }
    await page.goBack()
    await expectShelf('character')
    await page.goBack()
    await expectShelf('appearance')
    await page.goForward()
    await expectShelf('character')

    expect(await page.evaluate(() => ({
      preferences: localStorage.getItem('noble-appearance.preferences.v1'),
      reading: localStorage.getItem('noble-project.reading.v1'),
    }))).toEqual(storedBefore)
  })
}
