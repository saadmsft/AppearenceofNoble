import { expect, test } from './fixtures.ts'
import { createServer } from 'vite'
import type { ViteDevServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createReadingBackup, emptyReading } from '../../src/lib/reading.ts'

// The virtual harness mounts only owned components, so these tests do not need App wiring.
const harness = `
import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useReading } from '/src/hooks/useReading.ts'
import { ReadingTools } from '/src/components/ReadingTools.tsx'
import { ReadingPage } from '/src/components/ReadingPage.tsx'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '/src/components/ui/dialog.tsx'
import '/src/index.css'
import '@fontsource/noto-nastaliq-urdu/400.css'
const h = React.createElement
const rows = [
  { id: 'first-entry', title: { en: 'First entry', ur: 'پہلی روایت' } },
  { id: 'second-entry', title: { en: 'Second entry', ur: 'دوسری روایت' } },
]
function Harness() {
  const language = new URLSearchParams(location.search).get('lang') === 'ur' ? 'ur' : 'en'
  const reading = useReading(rows)
  const [selected, setSelected] = useState(null)
  const [showPage, setShowPage] = useState(true)
  const [bookmarks, setBookmarks] = useState([])
  const trigger = useRef(null)
  const [openEffects, setOpenEffects] = useState(0)
  const openEntry = reading.openEntry
  useEffect(() => {
    if (selected) { setOpenEffects((count) => count + 1); openEntry(selected.id) }
  }, [selected, openEntry])
  const open = (row, button) => { trigger.current = button; setSelected(row) }
  const changeBookmarks = (ids) => {
    if (new URLSearchParams(location.search).has('failBookmarks')) return { ok: false }
    const key = 'noble-appearance.preferences.v1'
    const old = JSON.parse(localStorage.getItem(key) || '{}')
    const next = JSON.stringify({ ...old, bookmarks: ids })
    localStorage.setItem(key, next)
    if (localStorage.getItem(key) !== next) return { ok: false }
    setBookmarks(ids)
    return { ok: true }
  }
  return h(React.Fragment, null,
    h('button', { onClick: () => setShowPage(!showPage) }, 'Toggle page'),
    h('button', { onClick: (event) => open(rows[0], event.currentTarget) }, 'Read first'),
    h('output', { 'data-testid': 'open-effects' }, openEffects),
    showPage && h(ReadingPage, {
      language, allNarrations: rows, reading, bookmarks, onBookmarksChange: changeBookmarks, onOpen: open,
      getCollectionLabel: () => language === 'ur' ? 'مجموعہ' : 'Test collection',
    }),
    h(Dialog, { open: !!selected, onOpenChange: (opened) => { if (!opened) setSelected(null) } },
      h(DialogContent, {
        closeLabel: 'Close reader', lang: language, dir: language === 'ur' ? 'rtl' : 'ltr',
        onCloseAutoFocus: (event) => { event.preventDefault(); trigger.current?.focus() },
      },
        h(DialogTitle, null, 'Harness reader'),
        h(DialogDescription, null, 'Reader containing personal reading tools'),
        selected && h(ReadingTools, { key: selected.id, row: selected, language, reading }),
      ),
    ),
  )
}
createRoot(document.getElementById('root')).render(h(React.StrictMode, null, h(Harness)))
`

let server: ViteDevServer
let url: string
let cacheDir: string
test.beforeAll(async () => {
  cacheDir = await mkdtemp(join(tmpdir(), 'noble-reading-e2e-'))
  server = await createServer({
    root: fileURLToPath(new URL('../../', import.meta.url)),
    cacheDir,
    server: { host: '127.0.0.1', port: 0, strictPort: false },
    plugins: [{
      name: 'isolated-reading-test',
      resolveId(id) { if (id.endsWith('/src/__reading-harness.js')) return '\0virtual:reading-harness' },
      load(id) { if (id === '\0virtual:reading-harness') return harness },
      configureServer(vite) {
        vite.middlewares.use(async (request, response, next) => {
          if (!request.url?.split('?')[0].endsWith('/__reading-harness')) { next(); return }
          const html = await vite.transformIndexHtml(request.url, '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/src/__reading-harness.js"></script></body></html>')
          response.setHeader('Content-Type', 'text/html')
          response.end(html)
        })
      },
    }],
  })
  await server.listen()
  const address = server.httpServer?.address()
  if (!address || typeof address === 'string') throw new Error('Reading test server did not expose a port')
  url = `http://127.0.0.1:${address.port}${server.config.base}__reading-harness`
})
test.afterAll(async () => {
  await server?.close()
  await rm(cacheDir, { recursive: true })
})

test('immediate autosave survives reader unmount, route unmount and reload without auto-read', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(url)
  await page.getByRole('button', { name: 'Read first', exact: true }).click()
  const reader = page.getByRole('dialog', { name: 'Harness reader' })
  await expect(reader.getByRole('checkbox')).not.toBeChecked()
  await reader.getByRole('checkbox').check()
  await reader.getByRole('checkbox').uncheck()
  const note = '<img src=x onerror=alert(1)> plain text\nاردو نوٹ'
  await reader.getByRole('textbox').fill(note)
  await expect(reader.getByRole('status')).toHaveText('Saved in this browser')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Toggle page' }).click()
  await page.getByRole('button', { name: 'Toggle page' }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Read first', exact: true }).click()
  await expect(reader.getByRole('textbox')).toHaveValue(note)
  await expect(reader.getByRole('checkbox')).not.toBeChecked()
  await expect(reader.locator('img')).toHaveCount(0)
  await expect(page.getByTestId('open-effects')).toHaveText('1')
  expect(errors).toEqual([])
})

test('nested delete confirmation traps keyboard focus, cancel restores focus and deletion needs confirmation', async ({ page }) => {
  await page.goto(url)
  await page.getByRole('button', { name: 'Read first', exact: true }).click()
  const reader = page.getByRole('dialog', { name: 'Harness reader' })
  const textarea = reader.getByRole('textbox')
  await textarea.fill('Text to confirm, never silently delete')
  await reader.getByRole('button', { name: 'Delete note', exact: true }).click()
  const confirmation = page.getByRole('dialog', { name: 'Delete this private note?' })
  await expect(confirmation.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(confirmation.getByRole('button', { name: 'Close', exact: true })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(confirmation.getByRole('button', { name: 'Delete this text', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(confirmation).not.toBeVisible()
  await expect(reader).toBeVisible()
  await expect(reader.getByRole('button', { name: 'Delete note', exact: true })).toBeFocused()
  await textarea.fill('')
  await expect(confirmation).toBeVisible()
  await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(textarea).toBeFocused()
  await expect(textarea).toHaveValue('Text to confirm, never silently delete')
  await reader.getByRole('button', { name: 'Delete note', exact: true }).click()
  await confirmation.getByRole('button', { name: 'Delete this text', exact: true }).click()
  await expect(textarea).toHaveValue('')
  await expect(textarea).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Read first', exact: true })).toBeFocused()
})

test('restore previews conflicts, cancel resets file and text, and merge preserves local notes', async ({ page }) => {
  const incoming = createReadingBackup({
    ...emptyReading(), entries: { 'first-entry': { note: 'Imported competing text', read: true } },
  }, ['second-entry'])
  if (!incoming.ok) throw new Error('Invalid test backup')
  await page.goto(url)
  await page.getByRole('button', { name: 'Read first', exact: true }).click()
  await page.getByRole('dialog', { name: 'Harness reader' }).getByRole('textbox').fill('Local text stays')
  await page.keyboard.press('Escape')
  const file = page.getByLabel('Choose a private JSON backup (maximum 4 MiB)')
  await file.setInputFiles({ name: 'private.json', mimeType: 'application/json', buffer: Buffer.from(incoming.value) })
  await page.getByRole('button', { name: 'Preview restore', exact: true }).click()
  const preview = page.getByRole('dialog', { name: 'Review before restoring' })
  await expect(preview.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
  await preview.getByText('Conflicting notes (merge keeps your text)', { exact: false }).click()
  await expect(preview.getByText('Imported competing text', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(file).toBeFocused()
  await expect(file).toHaveValue('')
  await expect(page.getByLabel('Or paste private backup JSON')).toHaveValue('')
  await page.getByLabel('Or paste private backup JSON').fill(incoming.value)
  await page.getByRole('button', { name: 'Preview restore', exact: true }).click()
  await preview.getByRole('button', { name: 'Confirm restore', exact: true }).click()
  await expect(page.getByText('The selected private backup was restored in this browser.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Read first', exact: true }).click()
  const reader = page.getByRole('dialog', { name: 'Harness reader' })
  await expect(reader.getByRole('textbox')).toHaveValue('Local text stays')
  await expect(reader.getByRole('checkbox')).toBeChecked()
})

test('private backup download includes personal state and partial bookmark failures remain explicit', async ({ page }) => {
  await page.goto(`${url}?failBookmarks=1`)
  await page.getByRole('button', { name: 'Read first', exact: true }).click()
  await page.getByRole('dialog', { name: 'Harness reader' }).getByRole('textbox').fill('Private exported note')
  await page.keyboard.press('Escape')
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download private backup', exact: true }).click()
  const downloaded = await downloading
  expect(downloaded.suggestedFilename()).toMatch(/^noble-project-private-backup-/)
  const stream = await downloaded.createReadStream()
  if (!stream) throw new Error('Private backup stream unavailable')
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  const text = Buffer.concat(chunks).toString('utf8')
  expect(JSON.parse(text).reading.entries['first-entry'].note).toBe('Private exported note')
  await page.getByLabel('Or paste private backup JSON').fill(text)
  await page.getByRole('button', { name: 'Preview restore', exact: true }).click()
  const preview = page.getByRole('dialog', { name: 'Review before restoring' })
  await preview.getByRole('button', { name: 'Confirm restore', exact: true }).click()
  await expect(preview.getByRole('alert')).toContainText('Partial restore')
  await preview.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByRole('alert').first()).toContainText('Partial restore')
  await expect(page.getByText('Reading data and bookmarks were saved in this browser.', { exact: true })).toHaveCount(0)
})

test('unknown IDs are visibly rejected and replace explicitly removes absent local notes', async ({ page }) => {
  await page.goto(url)
  await page.getByRole('button', { name: 'Read first', exact: true }).click()
  await page.getByRole('dialog', { name: 'Harness reader' }).getByRole('textbox').fill('Remove only after confirmation')
  await page.keyboard.press('Escape')
  const invalid = createReadingBackup({ ...emptyReading(), entries: { 'future-entry': { note: 'Unknown entry' } } }, [])
  if (!invalid.ok) throw new Error('Invalid test backup')
  await page.getByLabel('Or paste private backup JSON').fill(invalid.value)
  await page.getByRole('button', { name: 'Preview restore', exact: true }).click()
  await expect(page.getByRole('alert').first()).toContainText('Unknown entry IDs')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('Remove only after confirmation', { exact: true })).toBeVisible()
  const empty = createReadingBackup(emptyReading(), [])
  if (!empty.ok) throw new Error('Invalid test backup')
  await page.getByLabel('Or paste private backup JSON').fill(empty.value)
  await page.getByRole('button', { name: 'Preview restore', exact: true }).click()
  const preview = page.getByRole('dialog', { name: 'Review before restoring' })
  await preview.getByRole('radio', { name: /Replace/ }).check()
  await preview.getByRole('button', { name: 'Confirm restore', exact: true }).click()
  await expect(page.getByText('Remove only after confirmation', { exact: true })).toHaveCount(0)
  await page.reload()
  await expect(page.getByText('Your notes will appear here.', { exact: false })).toBeVisible()
})

test('failed autosave remains visibly unsaved after closing and reopening the reader', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'noble-project.reading.v1' && value.includes('Unsaved draft')) throw new DOMException('Full', 'QuotaExceededError')
      original.call(this, key, value)
    }
  })
  await page.goto(url)
  await page.getByRole('button', { name: 'Read first', exact: true }).click()
  const reader = page.getByRole('dialog', { name: 'Harness reader' })
  await reader.getByRole('textbox').fill('Unsaved draft')
  await expect(reader.getByRole('status')).toContainText('Not saved')
  await expect(reader.getByRole('alert')).toContainText('storage is full')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Read first', exact: true }).click()
  await expect(reader.getByRole('textbox')).toHaveValue('Unsaved draft')
  await expect(reader.getByRole('status')).toContainText('Not saved')
})

test('Urdu tools and nested confirmation remain readable and within a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto(`${url}?lang=ur`)
  await page.getByRole('button', { name: 'Read first', exact: true }).click()
  const reader = page.getByRole('dialog', { name: 'Harness reader' })
  await expect(reader.locator('.reading-tools')).toHaveAttribute('dir', 'rtl')
  await reader.getByRole('textbox').fill('یہ ذاتی نوٹ ہے، صرف اسی براؤزر میں محفوظ ہے۔')
  await reader.getByRole('button', { name: 'نوٹ حذف کریں', exact: true }).click()
  const confirmation = page.getByRole('dialog', { name: 'یہ نجی نوٹ حذف کریں؟' })
  await expect(confirmation).toHaveAttribute('dir', 'rtl')
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  const box = await confirmation.boundingBox()
  expect(box?.x).toBeGreaterThanOrEqual(0)
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(360)
  await confirmation.getByRole('button', { name: 'منسوخ کریں', exact: true }).click()
})
