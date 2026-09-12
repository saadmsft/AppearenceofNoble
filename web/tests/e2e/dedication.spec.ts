import { expect, test } from '@playwright/test'
import { dedicationSessionKey } from '../../src/lib/dedication.ts'

test('first opening presents the dedication in order, preserves personal data and remembers dismissal', async ({ page }) => {
  const reading = '{"version":1,"entries":{"most-handsome-face-best-form-bara":{"read":false,"note":"Dedication privacy fixture"}},"lastOpened":null}'
  await page.addInitScript((data) => localStorage.setItem('noble-project.reading.v1', data), reading)
  await page.goto('./?lang=en')
  const popup = page.getByRole('dialog', { name: 'Dedication & gratitude', exact: true })
  await expect(popup).toBeVisible()
  const text = await popup.innerText()
  expect(text.indexOf('Allah')).toBeLessThan(text.indexOf('Prophet Muhammad'))
  expect(text.indexOf('Prophet Muhammad')).toBeLessThan(text.indexOf('Farkhanda Abid'))
  expect(text.indexOf('Farkhanda Abid')).toBeLessThan(text.indexOf('Abid Mahmood'))
  await expect(popup).toContainText('who continue to support me in this project')
  await expect(popup.getByRole('button', { name: 'Enter the project', exact: true })).toBeFocused()
  expect(await page.locator('audio').evaluate((audio) => audio.paused)).toBe(true)
  await popup.getByRole('button', { name: 'Enter the project', exact: true }).click()
  await expect(popup).not.toBeVisible()
  expect(await page.evaluate((key) => sessionStorage.getItem(key), dedicationSessionKey)).toBe('1')
  expect(await page.evaluate(() => localStorage.getItem('noble-project.reading.v1'))).toBe(reading)
  await page.reload()
  await expect(page.locator('.dedication-dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Dedication', exact: true }).click()
  await expect(popup).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(popup).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Dedication', exact: true })).toBeFocused()
})

test('the Urdu dedication is readable, dismissible and available in both interface languages', async ({ page }) => {
  await page.goto('./?lang=ur&scoutTheme=dark')
  const popup = page.locator('.dedication-dialog')
  await expect(popup).toHaveAttribute('dir', 'rtl')
  await expect(popup).toContainText('فرخندہ عابد')
  await expect(popup).toContainText('عابد محمود')
  await expect(popup).toContainText('آج بھی میرا ساتھ دے رہے ہیں')
  await page.evaluate(() => document.fonts.ready)
  expect(await popup.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
  await popup.getByRole('button', { name: 'English', exact: true }).click()
  await expect(popup).toHaveAttribute('dir', 'ltr')
  await expect(popup).toContainText('Farkhanda Abid')
  await popup.getByRole('button', { name: 'Close dedication', exact: true }).click()
  await expect(popup).not.toBeVisible()
})

test('direct narration links are not interrupted by the welcome popup', async ({ page }) => {
  await page.goto('./?view=story&shelf=appearance&lang=en#narration/most-handsome-face-best-form-bara')
  await expect(page.getByRole('dialog').filter({ has: page.locator('.reader-body') })).toBeVisible()
  await expect(page.locator('.dedication-dialog')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.locator('.dedication-dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Dedication', exact: true }).click()
  await expect(page.locator('.dedication-dialog')).toBeVisible()
})

test('reduced motion and unavailable session storage do not prevent entering the site', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', {
      get() { throw new DOMException('Blocked for fixture', 'SecurityError') },
    })
  })
  await page.goto('./?lang=en')
  const popup = page.locator('.dedication-dialog')
  await expect(popup).toBeVisible()
  await expect(popup).toHaveCSS('animation-name', 'none')
  await popup.getByRole('button', { name: 'Enter the project', exact: true }).click()
  await expect(popup).not.toBeVisible()
  await expect(page.locator('.site-footer .dedication-storage-note')).toContainText('could not remember')
  await page.getByRole('button', { name: 'Enter the Life story', exact: true }).click()
  await expect(page.locator('.story-chapter')).toHaveCount(12)
})
