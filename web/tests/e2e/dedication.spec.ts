import { expect, test } from '@playwright/test'

// Start each test with a clean localStorage so the dedication pop-up is shown.
test.use({ storageState: { cookies: [], origins: [] } })

test('English dedication pop-up shows on first visit and can be dismissed', async ({ page }) => {
  await page.goto('./?lang=en&scoutTheme=light')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'A dedication', exact: true })).toBeVisible()
  await expect(dialog).toContainText('gratitude to Allah')
  await expect(dialog).toContainText('Prophet Muhammad')
  await expect(dialog).toContainText('Farkhanda Abid')
  await expect(dialog).toContainText('Abid Mahmood Abid')
  await dialog.getByRole('button', { name: 'Enter the project', exact: true }).click()
  await expect(dialog).not.toBeVisible()
})

test('Dismissed dedication is remembered across reloads', async ({ page }) => {
  await page.goto('./?lang=en&scoutTheme=light')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Enter the project', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await page.reload()
  await expect(page.getByRole('dialog')).not.toBeVisible()
})

test('Urdu dedication pop-up honours RTL and translated names', async ({ page }) => {
  await page.goto('./?lang=ur&scoutTheme=light')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAttribute('dir', 'rtl')
  await expect(dialog.getByRole('heading', { name: 'انتساب', exact: true })).toBeVisible()
  await expect(dialog).toContainText('فرخندہ عابد')
  await expect(dialog).toContainText('عابد محمود عابد')
})
