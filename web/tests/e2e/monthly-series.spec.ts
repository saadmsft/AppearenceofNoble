import { join } from 'node:path'
import { expect, test } from './fixtures.ts'

test('monthly section is reachable from home, navigation and audiobooks without publishing drafts', async ({ page }, testInfo) => {
  const audioRequests: string[] = []
  page.on('request', (request) => { if (/\/audio\/.*\.mp3/.test(request.url())) audioRequests.push(request.url()) })
  await page.goto('./?lang=en')
  await page.getByRole('button', { name: 'Discover the monthly journey', exact: true }).click()
  await expect(page).toHaveURL(/view=monthly/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Monthly Series')
  await expect(page.getByRole('link', { name: 'Monthly Series', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByText('First episode in preparation', { exact: true })).toBeVisible()
  await expect(page.getByText('No episodes published yet.', { exact: true })).toBeVisible()
  await expect(page.locator('.monthly-player')).toHaveCount(0)
  await expect(page.locator('audio')).toHaveCount(1)
  expect(await page.locator('audio').evaluate((element) => element.paused)).toBe(true)
  expect(audioRequests).toEqual([])
  if (process.env.MONTHLY_ARTIFACTS) {
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: join(process.env.MONTHLY_ARTIFACTS, `monthly-archive-${testInfo.project.name}.png`), fullPage: true })
  }
  await page.getByRole('button', { name: 'Explore the audiobooks', exact: true }).click()
  await expect(page.locator('.audiobook-card')).toHaveCount(3)
  await page.getByRole('button', { name: 'Discover the monthly journey', exact: true }).click()
  await page.goBack()
  await expect(page).toHaveURL(/view=audiobooks/)
  await page.getByRole('link', { name: 'Monthly Series', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Monthly Series')
})

test('monthly Urdu, dark mode and reduced motion preserve layout and honest unavailable links', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./?view=monthly&lang=ur&scoutTheme=dark')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ماہانہ سلسلہ')
  await expect(page.getByRole('button', { name: 'کم حرکت', exact: true })).toBeDisabled()
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'English', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Monthly Series')
  await page.goto('./?view=monthly&episode=unpublished-draft&lang=en')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Episode not available')
  await expect(page.locator('.monthly-player')).toHaveCount(0)
  await page.getByRole('button', { name: 'All monthly episodes', exact: true }).click()
  await expect(page).not.toHaveURL(/episode=/)
  await expect(page.getByText('First episode in preparation', { exact: true })).toBeVisible()
})

test('monthly decorative pause is persistent and navigation fits narrow screens', async ({ page }) => {
  await page.goto('./?view=monthly&lang=en')
  await page.getByRole('button', { name: 'Pause ornament motion', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Resume ornament motion', exact: true })).toHaveAttribute('aria-pressed', 'true')
  for (const width of [360, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.getByRole('link', { name: 'Monthly Series', exact: true })).toBeInViewport()
  }
})
