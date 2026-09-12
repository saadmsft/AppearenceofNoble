import { expect, test } from './fixtures'

test('the project home retains Appearance and Character beside Life without revealing narration cards', async ({ page }) => {
  await page.goto('./?lang=en')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Closer through words. Deeper through understanding.')
  await expect(page.locator('.project-collection')).toHaveCount(3)
  await expect(page.locator('.narration-card')).toHaveCount(0)
  await page.getByRole('button', { name: 'Enter the Character story', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Character, in remembered encounters.')
  await expect(page.locator('.story-chapter')).toHaveCount(8)
  await expect(page.locator('.narration-card')).toHaveCount(0)
  await page.getByRole('button', { name: 'View narrations about Mercy', exact: true }).click()
  await expect(page.locator('.narration-card').first()).toBeVisible()
  await expect(page.locator('.grade-caution')).toHaveCount(0)
  await page.getByRole('button', { name: 'The Noble Appearance', exact: true }).click()
  await expect(page.locator('.story-chapter')).toHaveCount(16)
  await expect(page.locator('.narration-card')).toHaveCount(0)
})

test('project collection and hadith-book filters are independent', async ({ page }) => {
  await page.goto('./?lang=en&view=collection&shelf=all')
  await page.getByRole('button', { name: 'The Noble Character', exact: true }).click()
  await expect(page.locator('.narration-card').first()).toHaveAttribute('data-entry', /^character-/)
  await page.getByRole('combobox', { name: 'Source book', exact: true }).selectOption('bukhari')
  for (const source of await page.locator('.narration-card .source-name').allTextContents()) expect(source).toContain('Sahih al-Bukhari')
  expect(new URL(page.url()).searchParams.get('shelf')).toBe('character')
  expect(new URL(page.url()).searchParams.get('source')).toBe('bukhari')
  await page.reload()
  await expect(page.getByRole('button', { name: 'The Noble Character', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('legacy bookmarks remain available across the new project home', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('noble-appearance.preferences.v1', JSON.stringify({
      language: 'en', theme: 'light', bookmarks: ['most-handsome-face-best-form-bara'],
      textSize: 'large', bilingual: true, motion: 'paused',
    }))
  })
  await page.goto('./')
  await page.getByRole('link', { name: /^Saved \(/ }).click()
  await expect(page.locator('.narration-card')).toHaveCount(1)
  await expect(page.locator('.narration-card')).toHaveAttribute('data-entry', 'most-handsome-face-best-form-bara')
  await page.getByRole('button', { name: /^Read: / }).click()
  await expect(page.getByRole('dialog')).toHaveAttribute('data-text-size', 'large')
  await expect(page.getByRole('dialog').locator('.meaning-section')).toHaveCount(2)
})

test('Urdu project navigation retains the manuscript layout and correct collection', async ({ page }) => {
  await page.goto('./?lang=ur')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('الفاظ سے قربت')
  await page.getByRole('button', { name: 'اخلاق کے سفر میں داخل ہوں', exact: true }).click()
  await expect(page.locator('.story-chapter')).toHaveCount(8)
  expect(new URL(page.url()).searchParams.get('shelf')).toBe('character')
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
