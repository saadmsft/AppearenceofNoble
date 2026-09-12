import { expect, test } from './fixtures.ts'
import { narrations } from '../../src/lib/library.ts'

test('integrated notes, explicit reading marks and resume survive navigation and reload', async ({ page }) => {
  await page.goto('./?lang=en&view=collection&shelf=appearance')
  const card = page.locator('.narration-card').first()
  const entryId = await card.getAttribute('data-entry')
  await card.getByRole('button', { name: /^Read: / }).click()
  const dialog = page.getByRole('dialog').filter({ has: page.locator('.reader-body') })
  const mark = dialog.getByRole('checkbox', { name: 'I have read this entry', exact: true })
  await expect(mark).not.toBeChecked()
  const text = 'PRIVATE_TEST_NOT_FOR_RESEARCH_2026 <em>plain text</em>'
  await dialog.getByLabel('Private note (plain text)', { exact: true }).fill(text)
  await expect(dialog.getByRole('status').filter({ hasText: 'Saved in this browser' })).toBeVisible()
  await mark.check()
  await page.keyboard.press('Escape')
  await page.getByRole('link', { name: 'Home', exact: true }).click()
  await expect(page.locator('.resume-reading')).toBeVisible()
  await page.getByRole('link', { name: 'My reading', exact: true }).click()
  await expect(page.locator('.reading-notes-list')).toContainText(text)
  await expect(page.locator('.reading-notes-list em')).toHaveCount(0)
  expect(await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('noble-project.reading.v1')!)
    return Object.values<{ read?: boolean }>(data.entries).filter((entry) => entry.read === true).length
  })).toBe(1)
  await page.reload()
  await expect(page.locator('.reading-notes-list')).toContainText(text)
  await page.locator('.reading-notes-list').getByRole('button', { name: 'Open entry', exact: true }).click()
  expect(new URL(page.url()).hash).toBe(`#narration/${entryId}`)
  await expect(dialog.getByRole('checkbox', { name: 'I have read this entry', exact: true })).toBeChecked()
  await expect(dialog.getByLabel('Private note (plain text)', { exact: true })).toHaveValue(text)
  await dialog.getByRole('button', { name: 'Delete note', exact: true }).click()
  const confirm = page.getByRole('dialog', { name: 'Delete this private note?', exact: true })
  await page.keyboard.press('Escape')
  await expect(confirm).not.toBeVisible()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Delete note', exact: true })).toBeFocused()
  await expect(dialog.getByLabel('Private note (plain text)', { exact: true })).toHaveValue(text)
  await dialog.getByRole('button', { name: 'Delete note', exact: true }).click()
  await confirm.getByRole('button', { name: 'Delete this text', exact: true }).click()
  await expect(dialog.getByLabel('Private note (plain text)', { exact: true })).toHaveValue('')
  await expect(dialog.getByRole('checkbox', { name: 'I have read this entry', exact: true })).toBeChecked()
})

test('private backup restores bookmarks without changing theme and never appears in research exports', async ({ page }) => {
  await page.goto('./?lang=en&view=reading&scoutTheme=light')
  await page.getByRole('button', { name: 'Use dark theme', exact: true }).click()
  const id = 'character-mercy-kissing-al-hasan'
  const privateText = 'PRIVATE_BACKUP_SECRET_TEST_2'
  const backup = {
    format: 'noble-project.personal-backup', version: 1, exportedAt: new Date().toISOString(),
    reading: { version: 1, entries: { [id]: { read: true, note: privateText } }, lastOpened: { id, at: new Date().toISOString() } },
    bookmarks: [id],
  }
  await page.getByLabel('Or paste private backup JSON', { exact: true }).fill(JSON.stringify(backup))
  await page.getByRole('button', { name: 'Preview restore', exact: true }).click()
  const preview = page.getByRole('dialog', { name: 'Review before restoring', exact: true })
  await expect(page.locator('.reading-notes-list')).toHaveCount(0)
  await preview.getByRole('radio', { name: /^Replace/ }).check()
  await preview.getByRole('button', { name: 'Confirm restore', exact: true }).click()
  await expect(page.locator('.reading-notes-list')).toContainText(privateText)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('.reading-notes-list')).toContainText(privateText)
  await page.getByRole('link', { name: /^Saved \(/ }).click()
  await expect(page.locator('.narration-card')).toHaveCount(1)
  await expect(page.locator('.narration-card')).toHaveAttribute('data-entry', id)
  await page.getByRole('link', { name: 'Sources & method', exact: true }).click()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'JSON', exact: true }).click()
  const download = await pending
  const stream = await download.createReadStream()
  if (!stream) throw new Error('Research download missing')
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  const content = Buffer.concat(chunks).toString('utf8')
  expect(content).not.toContain(privateText)
  const data = JSON.parse(content)
  expect(data.reading).toBeUndefined()
  expect(data.entries.length).toBe(narrations.length)
})

test('real static MP3 playback shares one engine, survives reader close and pauses on collection switch', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  await page.goto('./?lang=en&view=journey&shelf=appearance#narration/most-handsome-face-best-form-bara')
  const dialog = page.getByRole('dialog').filter({ has: page.locator('.reader-body') })
  const audio = page.locator('audio')
  await expect(audio).toHaveCount(1)
  await expect(dialog.locator('audio')).toHaveCount(0)
  await audio.evaluate((element) => { element.muted = true })
  await dialog.getByRole('button', { name: 'Play this entry', exact: true }).click()
  await expect.poll(() => audio.evaluate((element) => element.currentTime)).toBeGreaterThan(0.2)
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(audio).toHaveCount(1)
  expect(await audio.evaluate((element) => element.paused)).toBe(false)
  await page.getByRole('button', { name: 'The Noble Character', exact: true }).click()
  await expect.poll(() => audio.evaluate((element) => element.paused)).toBe(true)
  expect(requests.some((url) => /\.mp3(?:$|\?)/.test(url))).toBe(true)
  expect(requests.some((url) => /speech\.microsoft\.com|cognitiveservices\.azure\.com/i.test(url))).toBe(false)
})
