import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { chromium, expect } from '@playwright/test'
import { monthlyFixture } from './fixtures/monthly-fixture.ts'
import { listeningNativeLaunchOptions } from './fixtures/listening-native-fixture.ts'

test('approved monthly episode UI uses real shared playback, resume, sources and bilingual transcripts', async () => {
  const fixture = monthlyFixture()
  const cacheDir = await mkdtemp(join(tmpdir(), 'noble-monthly-'))
  const fixtureId = 'virtual:monthly-player'
  const server = await createServer({
    configFile: false, root: fileURLToPath(new URL('..', import.meta.url)),
    cacheDir, logLevel: 'error', resolve: { dedupe: ['react', 'react-dom'], alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
    server: { host: '127.0.0.1', port: 0, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'zod'] },
    css: { postcss: { plugins: [] } },
    plugins: [react(), {
      name: 'monthly-test-only',
      resolveId(id) { if (id === fixtureId) return `\0${fixtureId}` },
      load(id) {
        if (id !== `\0${fixtureId}`) return
        return `
          import React, {useState} from 'react';
          import {createRoot} from 'react-dom/client';
          import {useListening} from '/src/hooks/useListening.ts';
          import {ListeningPlayer} from '/src/components/ListeningPlayer.tsx';
          import {MonthlyEpisodePage} from '/src/components/MonthlySeries.tsx';
          import {monthlyCatalog,createMonthlyCatalog} from '/src/lib/monthly-series.ts';
          import '/src/index.css';
          import '/src/audiobooks.css';
          const fixture = ${JSON.stringify(fixture)};
          const catalog = createMonthlyCatalog(fixture.series, fixture.audio);
          Object.assign(monthlyCatalog, catalog);
          function Fixture() {
            const [language,setLanguage] = useState('en');
            const listening = useListening(catalog.chapters, 'all', {
              manifest:{version:1,tracks:[]},storyManifest:{version:1,tracks:[]},monthlyManifest:catalog.manifest
            });
            window.monthlyListening = listening;
            return React.createElement('div', {lang:language,dir:language==='ur'?'rtl':'ltr'},
              React.createElement('button', {onClick:()=>setLanguage('ur')}, 'Urdu interface'),
              React.createElement(MonthlyEpisodePage,{episode:catalog.episodes[0],language,listening,onBack:()=>{}}),
              React.createElement(ListeningPlayer,{listening,language,readerOpen:true,onOpenSource:()=>{}}));
          }
          createRoot(document.getElementById('root')).render(React.createElement(Fixture));
        `
      },
      configureServer(vite) {
        vite.middlewares.use((request, response, next) => {
          if (request.url !== '/monthly-fixture') return next()
          void vite.transformIndexHtml(request.url,
            `<html data-theme="light"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/@id/${fixtureId}"></script></body></html>`,
          ).then((html) => { response.setHeader('content-type', 'text/html'); response.end(html) }).catch(next)
        })
      },
    }],
  })
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
  try {
    await server.listen()
    browser = await chromium.launch(listeningNativeLaunchOptions())
    const address = server.httpServer!.address()
    assert.ok(address && typeof address !== 'string')
    for (const width of [1440, 393]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } })
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto(`http://127.0.0.1:${address.port}/monthly-fixture`)
      const audio = page.locator('audio')
      await expect(audio).toHaveCount(1)
      assert.equal(await audio.evaluate((element) => element.paused), true)
      await page.getByRole('combobox', { name: 'Audio language', exact: true }).selectOption('ur')
      await page.getByRole('button', { name: 'Start listening', exact: true }).click()
      await expect.poll(() => audio.evaluate((element) => element.currentTime)).toBeGreaterThan(.2)
      await expect(page.locator('.monthly-player')).toBeVisible()
      await page.locator('.monthly-player').getByRole('button', { name: 'Pause', exact: true }).click()
      assert.equal(await audio.evaluate((element) => element.paused), true)
      await page.getByRole('combobox', { name: 'Narration language', exact: true }).selectOption('en')
      await expect(page.locator('.monthly-transcripts summary').first()).toHaveText('Test first')
      await page.locator('.monthly-transcripts summary').first().click()
      await expect(page.getByText('Artificial transcript first.', { exact: true })).toBeVisible()
      await expect(page.locator('.monthly-sources a')).toHaveAttribute('href', 'https://sunnah.com/bukhari:3')
      await page.getByRole('button', { name: /Test second/ }).click()
      await expect.poll(() => audio.evaluate((element) => element.currentTime)).toBeGreaterThan(.2)
      await audio.evaluate((element) => { element.currentTime = 12 })
      await page.locator('.monthly-player').getByRole('button', { name: 'Pause', exact: true }).click()
      await page.reload()
      assert.equal(await audio.evaluate((element) => element.paused), true)
      await page.getByRole('button', { name: 'Continue listening', exact: true }).click()
      await expect.poll(() => audio.evaluate((element) => element.currentTime)).toBeGreaterThan(10)
      await expect(page.getByRole('button', { name: /Test second/ })).toHaveAttribute('aria-current', 'step')
      await page.locator('.monthly-player').getByRole('button', { name: 'Pause', exact: true }).click()
      await page.getByRole('button', { name: 'Urdu interface', exact: true }).click()
      await page.evaluate(() => document.fonts.ready)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
      if (process.env.MONTHLY_ARTIFACTS) await page.screenshot({ path: join(process.env.MONTHLY_ARTIFACTS, `monthly-player-${width}.png`), fullPage: true })
      assert.deepEqual(errors, [])
      await page.close()
    }
  } finally {
    await browser?.close()
    await server.close()
    await rm(cacheDir, { recursive: true, force: true })
  }
})
