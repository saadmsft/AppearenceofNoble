import { expect, test } from './fixtures.ts'
import { shelfLabels, topicLabels } from '../../src/lib/catalog.ts'
import { translate } from '../../src/lib/i18n.ts'

for (const language of ['en', 'ur'] as const) {
  test(`Story Edition preserves sources and position while opening a narration (${language})`, async ({ page }) => {
    await page.addInitScript(() => {
      document.addEventListener('click', (event) => {
        if (event.target instanceof Element && event.target.closest('.story-source-button')) {
          Object.assign(window, { storySourceClickPosition: window.scrollY })
        }
      }, true)
    })
    await page.goto(`./?view=story&shelf=appearance&lang=${language}`)
    await expect(page.locator('.story-experience')).toHaveCount(1)
    await expect(page.locator('.story-stage')).toHaveCount(1)
    await expect(page.locator('.story-chapter')).toHaveCount(16)
    await expect(page.locator('.narration-card')).toHaveCount(0)
    await page.getByRole('button', { name: translate(language, 'storyBegin'), exact: true }).click()
    const first = page.locator('#story-appearance-complexion-0')
    await expect(first).toBeFocused()
    await first.getByRole('button').scrollIntoViewIfNeeded()
    await first.getByRole('button').click()
    const before = await page.evaluate(() => Number(Reflect.get(window, 'storySourceClickPosition')))
    const reader = page.getByRole('dialog').filter({ has: page.locator('.reader-body') })
    await expect(reader).toBeVisible()
    await expect(reader.getByRole('link', { name: translate(language, 'openSource'), exact: true })).toHaveAttribute('href', 'https://sunnah.com/bukhari:3547')
    await page.keyboard.press('Escape')
    await expect(reader).not.toBeVisible()
    await expect(first.getByRole('button')).toBeFocused()
    expect(Math.abs(await page.evaluate(() => window.scrollY) - before)).toBeLessThan(4)
  })

  test(`Story chapter jumps and browser history select the correct passage (${language})`, async ({ page }) => {
    await page.goto(`./?view=story&shelf=appearance&lang=${language}`)
    await page.getByRole('combobox', { name: translate(language, 'storyChapter'), exact: true }).selectOption('eyes')
    await expect(page.locator('#story-appearance-eyes-0')).toBeFocused()
    await expect(page.locator('.story-stage')).toHaveAttribute('data-topic', 'eyes')
    await page.getByRole('button', { name: translate(language, 'storyNext'), exact: true }).click()
    await expect(page.locator('#story-appearance-eyes-1')).toBeFocused()
    expect(new URL(page.url()).searchParams.get('beat')).toBe('1')
    await page.goBack()
    await expect(page.locator('#story-appearance-eyes-0')).toBeFocused()
    await page.goForward()
    await expect(page.locator('#story-appearance-eyes-1')).toBeFocused()
    await page.reload()
    await expect(page.locator('#story-appearance-eyes-1')).toBeFocused()
  })

  test(`repeated Story collection swaps leave one stage and preserve reading data (${language})`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('noble-project.reading.v1', JSON.stringify({
      version: 1, entries: { 'most-handsome-face-best-form-bara': { read: true, note: 'Story privacy fixture' } },
      lastOpened: { id: 'most-handsome-face-best-form-bara', at: '2026-09-11T21:00:00Z' },
    })))
    await page.goto(`./?view=story&shelf=appearance&lang=${language}`)
    const before = await page.evaluate(() => localStorage.getItem('noble-project.reading.v1'))
    for (const shelf of ['character', 'appearance', 'character', 'appearance'] as const) {
      await page.getByRole('group', { name: translate(language, 'shelfFilter'), exact: true })
        .getByRole('button', { name: shelfLabels[shelf][language], exact: true }).click()
      await expect(page.locator('.story-stage')).toHaveCount(1)
      await expect(page.locator('.story-experience')).toHaveCount(1)
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
      await expect(page.locator('.story-chapter')).toHaveCount(shelf === 'appearance' ? 16 : 8)
      await expect(page.locator('.narration-card')).toHaveCount(0)
      const ids = await page.locator('[id]').evaluateAll((elements) => elements.map((element) => element.id))
      expect(new Set(ids).size).toBe(ids.length)
    }
    expect(await page.evaluate(() => localStorage.getItem('noble-project.reading.v1'))).toBe(before)
  })
}

test('story evidence stays click-only, with explicit cautions and a classic-reading alternative', async ({ page }) => {
  await page.goto('./?view=story&shelf=appearance&lang=en')
  const eyes = page.locator('.story-chapter[data-topic="eyes"]')
  await eyes.getByRole('button', { name: 'View narrations about Eyes', exact: true }).click()
  await expect(eyes.locator('.narration-card').first()).toBeVisible()
  await expect(eyes.locator('.grade-caution')).toHaveCount(0)
  await eyes.getByRole('button', { name: 'Include cautioned reports', exact: true }).click()
  await expect(eyes.locator('.grade-caution').first()).toBeVisible()
  await page.locator('.story-stage').getByRole('button', { name: 'Reading view', exact: true }).click()
  await expect(page.locator('.topic-journey')).toHaveCount(1)
  await expect(page.locator('.story-stage')).toHaveCount(0)
  await page.getByRole('button', { name: 'Story view', exact: true }).click()
  await expect(page.locator('.story-stage')).toHaveCount(1)
})

test('reduced motion and a short Urdu viewport retain readable scenes and working sources', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('./?view=story&shelf=character&lang=ur')
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('.story-experience')).toHaveAttribute('data-static', 'true')
  await expect(page.locator('.story-stage .topic-motion').first()).toHaveCSS('animation-name', 'none')
  await expect(page.locator('.story-stage').getByRole('button', { name: 'حرکت محدود ہے', exact: true })).toBeDisabled()
  await page.getByRole('combobox', { name: translate('ur', 'storyChapter'), exact: true }).selectOption('patience')
  await expect(page.locator('#story-character-patience-0')).toBeFocused()
  await expect(page.locator('.story-stage')).toHaveAttribute('data-topic', 'patience')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.locator('#story-character-patience-0 .story-source-button').click()
  await expect(page.getByRole('dialog').filter({ has: page.locator('.reader-body') })).toBeVisible()
})

test('scrolling alone never marks a story passage read', async ({ page }) => {
  await page.goto('./?view=story&shelf=character&lang=en')
  const before = await page.evaluate(() => localStorage.getItem('noble-project.reading.v1'))
  await page.getByRole('combobox', { name: 'Story chapter', exact: true }).selectOption('family-community')
  await expect(page.locator('.story-stage')).toHaveAttribute('data-topic', 'family-community')
  await expect(page.locator('.story-stage-caption p')).toHaveText(topicLabels['family-community'].en)
  expect(await page.evaluate(() => localStorage.getItem('noble-project.reading.v1'))).toBe(before)
})

test('the shared stage has bounded layers and obeys pause, visibility and reader state', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('./?view=story&shelf=appearance&lang=en&topic=complexion')
  const stage = page.locator('.story-stage')
  await stage.scrollIntoViewIfNeeded()
  await expect(stage).toHaveAttribute('data-running', 'true')
  await page.getByRole('combobox', { name: 'Story chapter', exact: true }).selectOption('eyes')
  await expect(stage).toHaveAttribute('data-topic', 'eyes')
  expect(await stage.locator('.story-motif-layer').count()).toBeLessThanOrEqual(2)
  await expect(stage.locator('.story-motif-layer')).toHaveCount(1)
  await stage.getByRole('button', { name: 'Pause motion', exact: true }).click()
  await expect(page.locator('.story-experience')).toHaveAttribute('data-static', 'true')
  await expect(stage.locator('.topic-motion').first()).toHaveCSS('animation-name', 'none')
  await stage.getByRole('button', { name: 'Resume motion', exact: true }).click()
  await expect(stage).toHaveAttribute('data-running', 'true')
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(stage).toHaveAttribute('data-running', 'false')
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.locator('#story-appearance-eyes-0 .story-source-button').click()
  await expect(stage).toHaveAttribute('data-running', 'false')
  await page.keyboard.press('Escape')
})
