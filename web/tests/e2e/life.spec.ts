import { expect, test } from '@playwright/test'
import { lifeMilestones } from '../../src/lib/life.ts'
import { getShelfRows } from '../../src/lib/library.ts'

test('Life is a complete third story with independent chronology evidence and deliberate source disclosure', async ({ page }) => {
  await page.goto('./?lang=en')
  await expect(page.locator('.project-collection')).toHaveCount(3)
  await page.getByRole('button', { name: 'Enter the Life story', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Life, through its sources.')
  await expect(page.locator('.story-stage')).toHaveCount(1)
  await expect(page.locator('.story-chapter')).toHaveCount(12)
  await expect(page.locator('.life-timeline button')).toHaveCount(12)
  await expect(page.locator('.story-chapter .life-context')).toHaveCount(12)
  await expect(page.locator('.narration-card')).toHaveCount(0)
  await expect(page.locator('.life-context .grade-badge')).toHaveCount(0)
  await page.locator('.story-stage select').selectOption('life-hijrah')
  await expect(page).toHaveURL(/topic=life-hijrah/)
  const chapter = page.locator('.story-chapter[data-topic="life-hijrah"]')
  await chapter.locator('.life-context-evidence > summary').click()
  await expect(chapter.locator('.life-date-boundary')).toContainText('Chronology is not hadith grading')
  expect(await chapter.locator('.life-context-evidence a').count()).toBeGreaterThan(0)
  await chapter.locator('.life-context-evidence > summary').click()
  await chapter.locator('.story-source-button').first().click()
  const reader = page.getByRole('dialog').filter({ has: page.locator('.reader-body') })
  await expect(reader).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(reader).not.toBeVisible()
  await expect(page.locator('.story-experience')).toHaveAttribute('data-shelf', 'life')
  await expect(page.locator('.story-stage')).toHaveCount(1)
})

test('Urdu Life supports milestone navigation, source disclosure and the classic Reading view', async ({ page }) => {
  await page.goto('./?view=story&shelf=life&lang=ur')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('سیرت، مآخذ کی روشنی میں۔')
  await page.locator('.story-stage select').selectOption('life-farewell')
  const chapter = page.locator('.story-chapter[data-topic="life-farewell"]')
  await chapter.locator('.story-evidence-toggle').click()
  await expect(chapter.locator('.narration-card').first()).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.locator('.story-stage-footer').getByRole('button', { name: 'مطالعے کا منظر', exact: true }).click()
  await expect(page).toHaveURL(/view=journey/)
  await expect(page.locator('.hero-shell')).toHaveCount(1)
  await expect(page.locator('.journey-chapter')).toHaveCount(12)
  await expect(page.locator('.journey-chapter .life-context')).toHaveCount(12)
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('three-way switching never leaves old stages or changes private reading data', async ({ page }) => {
  const preferences = {
    language: 'en', theme: 'light', bookmarks: ['most-handsome-face-best-form-bara'],
    textSize: 'large', bilingual: true, motion: 'paused',
  }
  const reading = {
    version: 1, entries: { 'most-handsome-face-best-form-bara': { read: false, note: 'PRIVATE_LIFE_SWITCH_FIXTURE' } },
    lastOpened: null,
  }
  await page.addInitScript(({ preferences, reading }) => {
    localStorage.setItem('noble-appearance.preferences.v1', JSON.stringify(preferences))
    localStorage.setItem('noble-project.reading.v1', JSON.stringify(reading))
  }, { preferences, reading })
  await page.goto('./?view=story&shelf=appearance&lang=en')
  for (const [shelf, label, count] of [
    ['life', 'The Noble Life', 12], ['character', 'The Noble Character', 8],
    ['appearance', 'The Noble Appearance', 16], ['life', 'The Noble Life', 12],
  ] as const) {
    await page.getByRole('button', { name: label, exact: true }).click()
    await expect(page.locator('.story-experience')).toHaveAttribute('data-shelf', shelf)
    await expect(page.locator('.story-stage')).toHaveCount(1)
    await expect(page.locator('.story-chapter')).toHaveCount(count)
    expect(await page.locator('[id]').evaluateAll((elements) => {
      const ids = elements.map((element) => element.id)
      return new Set(ids).size === ids.length
    })).toBe(true)
  }
  await page.goBack()
  await expect(page.locator('.story-experience')).toHaveAttribute('data-shelf', 'appearance')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('noble-project.reading.v1')!))).toEqual(reading)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('noble-appearance.preferences.v1')!))).toEqual(preferences)
})

test('Life public exports include chronology but never private reading or listening state', async ({ page }) => {
  await page.goto('./?view=sources&shelf=life&lang=en')
  await expect(page.locator('.life-chronology-index > details')).toHaveCount(12)
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'JSON', exact: true }).click()
  const download = await pending
  expect(download.suggestedFilename()).toBe('noble-life-research.json')
  const stream = await download.createReadStream()
  if (!stream) throw new Error('Life research download missing')
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  const data = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  expect(data.version).toBe(3)
  expect(data.shelf).toBe('life')
  expect(data.entries).toHaveLength(getShelfRows('life').length)
  expect(data.lifeMilestones).toEqual(lifeMilestones)
  expect(data.reading).toBeUndefined()
  expect(data.listening).toBeUndefined()
  expect(data.bookmarks).toBeUndefined()
})
