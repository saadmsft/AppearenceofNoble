import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { chromium } from '@playwright/test'
import { planTracks } from '../scripts/audio/core.ts'
import { resolveAudioAsset } from '../src/lib/audio.ts'

test('audio asset URLs support local review without allowing arbitrary remote hosts', () => {
  const asset = `audio/${'a'.repeat(64)}.mp3`
  assert.equal(resolveAudioAsset(asset, 'http://127.0.0.1:5178/AppearenceofNoble/?view=home'), `http://127.0.0.1:5178/AppearenceofNoble/${asset}`)
  assert.equal(resolveAudioAsset(asset, 'file:///tmp/noble-project.html'), resolveAudioAsset(asset))
  assert.equal(resolveAudioAsset(asset, 'https://example.invalid/'), resolveAudioAsset(asset))
  assert.equal(resolveAudioAsset('../secret.mp3', 'http://localhost:5178/'), null)
})

test('static player is accessible, escapes transcripts, and unloads audio on selection, route, language and unmount', async () => {
  const tracks = planTracks([{
    id: 'player-fixture', arabicFull: 'سند. متن الرواية. تعليق المصنف.',
    summary: { en: 'Editorial <em>text</em>, not a full translation.', ur: 'یہ ادارتی خلاصہ ہے۔' },
  }]).map((track) => ({ ...track, byteLength: 288, sha256: 'a'.repeat(64), durationSeconds: 0.048 }))
  const fixtureId = 'noble-audio-fixture'
  const cacheDir = await mkdtemp(join(tmpdir(), 'noble-player-vite-'))
  const server = await createServer({
    configFile: false, root: fileURLToPath(new URL('../', import.meta.url)),
    cacheDir, logLevel: 'error',
    resolve: { dedupe: ['react', 'react-dom'] },
    optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client', 'react/jsx-dev-runtime', 'react/jsx-runtime', 'zod'] },
    css: { postcss: { plugins: [] } },
    plugins: [react(), {
      name: 'isolated-audio-player-fixture',
      resolveId(id) { if (id === fixtureId) return `\0${fixtureId}` },
      load(id) {
        if (id !== `\0${fixtureId}`) return
        return `
          import React from 'react';
          import { createRoot } from 'react-dom/client';
          import { AudioPlayer } from '/src/components/AudioPlayer.tsx';
          const root = createRoot(document.getElementById('root'));
          const tracks = ${JSON.stringify(tracks)};
          window.renderAudio = (entryId = 'player-fixture', language = 'en', supplied = true) =>
            root.render(React.createElement(React.StrictMode, null,
              React.createElement(AudioPlayer, { entryId, language, tracks: supplied ? tracks : [] })));
          window.unmountAudio = () => root.unmount();
          window.renderAudio();
        `
      },
      configureServer(vite) {
        vite.middlewares.use((request, response, next) => {
          if (request.url !== '/audio-player-fixture') return next()
          void vite.transformIndexHtml(request.url,
            `<html><head></head><body><div id="root"></div><script type="module" src="/@id/${fixtureId}"></script></body></html>`,
          ).then((html) => {
            response.setHeader('content-type', 'text/html')
            response.end(html)
          }).catch(next)
        })
      },
    }],
    server: { host: '127.0.0.1', port: 0, hmr: false },
  })
  await server.listen()
  const address = server.httpServer?.address()
  assert.ok(address && typeof address !== 'string')
  const origin = `http://127.0.0.1:${address.port}`
  const fixtureAsset = (asset: string) => resolveAudioAsset(asset, `${origin}/audio-player-fixture`)
  // A new private browser, never the shared Playwright tool/browser.
  let browser
  try {
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    const external: string[] = []
    await page.route('**/*', (route) => {
      if (new URL(route.request().url()).origin === origin) return route.continue()
      external.push(route.request().url())
      return route.abort()
    })
    await page.addInitScript(() => {
      const events: string[] = []
      Object.assign(window, { audioEvents: events })
      HTMLMediaElement.prototype.pause = function () { events.push(`pause:${this.getAttribute('src')}`) }
      HTMLMediaElement.prototype.load = function () { events.push(`load:${this.getAttribute('src')}`) }
    })
    await page.goto(`${origin}/audio-player-fixture`)
    const audio = page.locator('audio')
    await audio.waitFor()
    const en = tracks.find((track) => track.language === 'en')!
    const ar = tracks.find((track) => track.language === 'ar')!
    const ur = tracks.find((track) => track.language === 'ur')!
    assert.equal(await audio.getAttribute('src'), fixtureAsset(en.asset), 'StrictMode restores the source')
    assert.equal(await audio.getAttribute('autoplay'), null)
    assert.equal(await audio.getAttribute('preload'), 'none')
    assert.notEqual(await audio.getAttribute('controls'), null)
    assert.match(await audio.getAttribute('aria-label') ?? '', /Play or pause/)
    assert.match(await page.locator('.audio-notice').allTextContents().then((items) => items.join(' ')), /internet connection/)
    await page.getByLabel('Playback speed').selectOption('1.5')
    assert.equal(await audio.evaluate((element: HTMLAudioElement) => element.playbackRate), 1.5)
    await page.getByText('Exact spoken transcript', { exact: true }).click()
    assert.equal(await page.locator('.audio-transcript p').textContent(), en.transcript)
    assert.equal(await page.locator('.audio-transcript em').count(), 0)
    assert.equal(await page.locator('.audio-download').getAttribute('href'), fixtureAsset(en.asset))
    await page.getByLabel('Narration language').selectOption('ar')
    assert.equal(await audio.getAttribute('src'), fixtureAsset(ar.asset))
    assert.equal(await audio.evaluate((element: HTMLAudioElement) => element.playbackRate), 1)
    assert.equal(await page.locator('.audio-transcript p').getAttribute('dir'), 'rtl')
    assert.ok(await page.evaluate((url) => Reflect.get(window, 'audioEvents').includes(`pause:${url}`), fixtureAsset(en.asset)))
    await page.evaluate(() => Reflect.get(window, 'renderAudio')('player-fixture', 'ur'))
    await page.locator('.audio-player[lang="ur"]').waitFor()
    assert.equal(await audio.getAttribute('src'), fixtureAsset(ur.asset))
    assert.equal(await page.locator('.audio-player').getAttribute('dir'), 'rtl')
    await audio.dispatchEvent('error', { bubbles: false })
    await page.getByRole('alert').waitFor()
    assert.equal(await audio.count(), 0)
    assert.equal(await page.locator('.audio-download').count(), 1)
    await page.evaluate(() => Reflect.get(window, 'renderAudio')('player-fixture', 'en'))
    await audio.waitFor()
    await page.evaluate(() => Reflect.get(window, 'renderAudio')('missing-entry', 'en'))
    await page.getByRole('status').waitFor()
    assert.equal(await audio.count(), 0)
    assert.match(await page.getByRole('status').textContent() ?? '', /not been published/)
    await page.evaluate(() => Reflect.get(window, 'renderAudio')('player-fixture', 'en'))
    await audio.waitFor()
    await page.evaluate(() => Reflect.get(window, 'audioEvents').splice(0))
    await page.evaluate(() => Reflect.get(window, 'unmountAudio')())
    assert.deepEqual(await page.evaluate(() => Reflect.get(window, 'audioEvents')), [
      `pause:${fixtureAsset(en.asset)}`, 'load:null',
    ])
    assert.deepEqual(external, [], 'no Speech calls, library prefetch, or external dependency requests')
  } finally {
    await browser?.close()
    await server.close()
    await rm(cacheDir, { recursive: true })
  }
})
