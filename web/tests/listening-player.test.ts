import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { chromium } from '@playwright/test'
import { listeningFixture } from './fixtures/listening-fixture.ts'
import { listeningBrowserCoverage } from './fixtures/listening-coverage.ts'
import { listeningNativeLaunchOptions, listeningPcmFixture } from './fixtures/listening-native-fixture.ts'

test('native listening fixture has complete correctly sized PCM frames at both comparison rates', () => {
  for (const sampleRate of [10_000, 48_000]) {
    const clip = listeningPcmFixture(sampleRate)
    assert.equal(clip.toString('ascii', 0, 4), 'RIFF')
    assert.equal(clip.readUInt32LE(4), clip.length - 8)
    assert.equal(clip.toString('ascii', 8, 16), 'WAVEfmt ')
    assert.equal(clip.readUInt32LE(16), 16)
    assert.equal(clip.readUInt16LE(20), 1)
    assert.equal(clip.readUInt16LE(22), 1)
    assert.equal(clip.readUInt32LE(24), sampleRate)
    assert.equal(clip.readUInt32LE(28), sampleRate * 2)
    assert.equal(clip.readUInt16LE(32), 2)
    assert.equal(clip.readUInt16LE(34), 16)
    assert.equal(clip.toString('ascii', 36, 40), 'data')
    assert.equal(clip.readUInt32LE(40), clip.length - 44)
    assert.equal((clip.length - 44) / clip.readUInt32LE(28), 0.8)
  }
})

test('independent native control completes valid PCM clips without the listening engine', async () => {
  const browser = await chromium.launch(listeningNativeLaunchOptions())
  try {
    const cases = [10_000, 48_000].flatMap((sampleRate) => [false, true].map((hidden) => ({ sampleRate, hidden })))
    for (const { sampleRate, hidden } of cases) {
      const page = await browser.newPage()
      const clip = listeningPcmFixture(sampleRate)
      const origin = 'http://127.0.0.1:5178'
      // Intercept every request on this private page: same fulfillment/MP3 path
      // as the shared fixture, but no React, hook, controller or media overrides.
      await page.route('**/*', (route) => {
        const url = new URL(route.request().url())
        if (url.origin !== origin) return route.abort()
        if (url.pathname === '/native-control') return route.fulfill({
          contentType: 'text/html',
          body: `<button>Play native control</button><audio controls ${hidden ? 'hidden' : ''}></audio>`,
        })
        if (url.pathname.startsWith('/AppearenceofNoble/audio/')) return route.fulfill({ contentType: 'audio/wav', body: clip })
        return route.fulfill({ status: 404, body: '' })
      })
      await page.goto(`${origin}/native-control`)
      assert.equal(await page.evaluate(() => [HTMLMediaElement.prototype.play, HTMLMediaElement.prototype.pause,
        HTMLMediaElement.prototype.load, Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime')!.get!]
        .every((method) => Function.prototype.toString.call(method).includes('[native code]'))), true)
      await page.evaluate((src) => {
        const media = document.querySelector('audio')!
        const events: unknown[] = []
        Reflect.set(window, 'controlEvents', events)
        for (const name of ['loadedmetadata', 'playing', 'timeupdate', 'pause', 'waiting', 'ended', 'error']) {
          media.addEventListener(name, (event) => events.push({
            event: name, time: media.currentTime, duration: media.duration, paused: media.paused,
            readyState: media.readyState, error: media.error?.code, trusted: event.isTrusted,
          }))
        }
        media.src = src
        document.querySelector('button')!.addEventListener('click', () => { void media.play() })
      }, `${origin}/AppearenceofNoble/audio/first.mp3`)
      await page.getByRole('button', { name: 'Play native control' }).click()
      await page.waitForFunction(() => !document.querySelector('audio')!.paused && document.querySelector('audio')!.readyState === 4)
      // Match the shared test's interrupted first → second → first sequence.
      for (const entry of ['second', 'first']) {
        await page.evaluate(async (src) => {
          const media = document.querySelector('audio')!
          media.pause()
          media.src = src
          media.load()
          await media.play()
        }, `${origin}/AppearenceofNoble/audio/${entry}.mp3`)
      }
      await page.waitForFunction(() => document.querySelector('audio')!.ended, undefined, { timeout: 5000 }).catch(async (error: unknown) => {
        console.info(`Independent native ${sampleRate}Hz ${hidden ? 'hidden' : 'visible'} control:`, await page.evaluate(() => {
          const media = document.querySelector('audio')!
          return {
            events: Reflect.get(window, 'controlEvents'), currentTime: media.currentTime, duration: media.duration,
            buffered: Array.from({ length: media.buffered.length }, (_, index) => [media.buffered.start(index), media.buffered.end(index)]),
            paused: media.paused, ended: media.ended, readyState: media.readyState, error: media.error?.code,
          }
        }))
        throw error
      })
      assert.equal(await page.locator('audio').evaluate((media: HTMLAudioElement) => media.error), null)
      assert.equal(await page.locator('audio').evaluate((media: HTMLAudioElement) => media.currentTime), 0.8)
      assert.equal(await page.evaluate(() => Reflect.get(window, 'controlEvents')
        .some((event: { event: string; time: number; trusted: boolean }) => event.event === 'ended' && event.time > 0.0512 && event.trusted)), true)
      await page.close()
    }
  } finally {
    await browser.close()
  }
})

test('shared player keeps one StrictMode media element, accessible reader controls and private paused resume', async () => {
  const fixture = listeningFixture()
  const fixtureId = 'noble-listening-fixture'
  const cacheDir = await mkdtemp(join(tmpdir(), 'noble-listening-vite-'))
  const server = await createServer({
    configFile: false, root: fileURLToPath(new URL('../', import.meta.url)),
    cacheDir, logLevel: 'error', resolve: { dedupe: ['react', 'react-dom'] },
    optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client', 'react/jsx-dev-runtime', 'react/jsx-runtime', 'zod'] },
    css: { postcss: { plugins: [] } },
    plugins: [react(), {
      name: 'isolated-listening-player-fixture',
      resolveId(id) { if (id === fixtureId) return `\0${fixtureId}` },
      load(id) {
        if (id !== `\0${fixtureId}`) return
        return `
          import React, {useState} from 'react';
          import {createRoot} from 'react-dom/client';
          import {useListening} from '/src/hooks/useListening.ts';
          import {ListeningPlayer} from '/src/components/ListeningPlayer.tsx';
          import {AudioPlayer} from '/src/components/AudioPlayer.tsx';
          import '/src/index.css';
          const fixture = ${JSON.stringify(fixture)};
          function Fixture() {
            const [language, setLanguage] = useState('en');
            const [shelf, setShelf] = useState('character');
            const [reader, setReader] = useState(null);
            const [useContext, setUseContext] = useState(true);
            const listening = useListening(fixture.rows, shelf, {manifest: fixture.manifest});
            window.listening = listening;
            window.fixture = {setLanguage, setShelf, setReader, setUseContext};
            window.stableBind ??= listening.bindAudio;
            window.stableStart ??= listening.startQueue;
            return React.createElement(React.Fragment, null,
              React.createElement('button', {onClick: () => listening.startQueue(fixture.chapter, 'en')}, 'Play chapter'),
              React.createElement(ListeningPlayer, {listening, language, readerOpen: !!reader, onOpenSource: setReader}),
              reader && React.createElement('div', {role: 'dialog', 'aria-label': 'Source reader'},
                React.createElement('button', {onClick: () => setReader(null)}, 'Close reader'),
                React.createElement(AudioPlayer, {entryId: reader, language, listening,
                  context: useContext ? {shelf: 'character', topic: 'mercy', title: fixture.chapter.title} : undefined})));
          }
          const root = createRoot(document.getElementById('root'));
          window.unmountListening = () => root.unmount();
          root.render(React.createElement(React.StrictMode, null, React.createElement(Fixture)));
        `
      },
      configureServer(vite) {
        vite.middlewares.use((request, response, next) => {
          if (request.url !== '/listening-player-fixture') return next()
          void vite.transformIndexHtml(request.url,
            `<html><head></head><body><div id="root"></div><script type="module" src="/@id/${fixtureId}"></script></body></html>`,
          ).then((html) => { response.setHeader('content-type', 'text/html'); response.end(html) }).catch(next)
        })
      },
    }],
    server: { host: '127.0.0.1', port: 0, hmr: false },
  })
  await server.listen()
  const address = server.httpServer?.address()
  assert.ok(address && typeof address !== 'string')
  const origin = `http://127.0.0.1:${address.port}`
  let browser
  try {
    browser = await chromium.launch(listeningNativeLaunchOptions())
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    await page.coverage.startJSCoverage({ resetOnNavigation: false })
    const external: string[] = []
    await page.route('**/*', (route) => {
      if (new URL(route.request().url()).origin === origin) return route.continue()
      external.push(route.request().url())
      return route.abort()
    })
    await page.addInitScript(() => {
      const records = new WeakMap<HTMLMediaElement, { paused: boolean; time: number; duration: number }>()
      const get = (element: HTMLMediaElement) => {
        if (!records.has(element)) records.set(element, { paused: true, time: 0, duration: NaN })
        return records.get(element)!
      }
      Object.assign(window, { plays: 0 })
      Object.defineProperties(HTMLMediaElement.prototype, {
        paused: { get() { return get(this).paused } },
        readyState: { get() { return Number.isFinite(get(this).duration) ? 1 : 0 } },
        currentTime: { get() { return get(this).time }, set(value) { get(this).time = value } },
        duration: { get() { return get(this).duration } },
      })
      HTMLMediaElement.prototype.pause = function () {
        if (!get(this).paused) {
          get(this).paused = true
          this.dispatchEvent(new Event('pause'))
        }
      }
      HTMLMediaElement.prototype.load = function () {
        get(this).time = 0
        get(this).duration = NaN
        if (this.getAttribute('src')) queueMicrotask(() => {
          get(this).duration = 90
          this.dispatchEvent(new Event('loadedmetadata'))
        })
      }
      HTMLMediaElement.prototype.play = function () {
        Reflect.set(window, 'plays', Reflect.get(window, 'plays') + 1)
        get(this).paused = false
        this.dispatchEvent(new Event('playing'))
        return Promise.resolve()
      }
    })
    await page.goto(`${origin}/listening-player-fixture`)
    await page.locator('audio').waitFor({ state: 'attached' })
    assert.equal(await page.locator('audio').count(), 1)
    assert.equal(await page.evaluate(() => Reflect.get(window, 'plays')), 0)
    assert.equal(await page.locator('audio').getAttribute('autoplay'), null)
    await page.evaluate(() => Reflect.set(window, 'stableMedia', document.querySelector('audio')))
    await page.getByRole('button', { name: 'Play chapter', exact: true }).click()
    await page.getByRole('button', { name: 'Pause', exact: true }).waitFor()
    assert.equal(await page.locator('audio').count(), 1)
    assert.match(await page.locator('.listening-player').innerText(), /1 of 2/)
    await page.getByRole('button', { name: 'Open source: Source first', exact: true }).click()
    const reader = page.getByRole('dialog')
    await reader.waitFor()
    assert.equal(await page.locator('audio').count(), 1)
    await reader.getByRole('button', { name: 'Pause', exact: true }).click()
    await reader.getByLabel('Seek narration').fill('23.5')
    assert.equal(await page.evaluate(() => Reflect.get(window, 'listening').currentTime), 23.5)
    await reader.getByRole('button', { name: 'Resume', exact: true }).focus()
    await page.keyboard.press('Enter')
    await reader.getByRole('button', { name: 'Pause', exact: true }).waitFor()
    await reader.getByLabel('Playback speed').selectOption('1.5')
    await page.getByRole('button', { name: 'Close reader' }).click()
    assert.equal(await page.evaluate(() => Reflect.get(window, 'listening').playing), true)
    assert.equal(await page.evaluate(() => Reflect.get(window, 'stableMedia') === document.querySelector('audio')), true)
    const plays = await page.evaluate(() => Reflect.get(window, 'plays'))
    await page.evaluate(() => Reflect.get(window, 'fixture').setReader('second'))
    await reader.getByRole('button', { name: 'Play this entry', exact: true }).waitFor()
    assert.equal(await page.evaluate(() => Reflect.get(window, 'plays')), plays)
    await reader.getByRole('button', { name: 'Play this entry', exact: true }).click()
    assert.equal(await page.evaluate(() => Reflect.get(window, 'listening').currentNarration.id), 'second')
    await page.getByRole('button', { name: 'Close reader' }).click()
    await page.getByLabel('Narration language').selectOption('ar')
    assert.equal(await page.evaluate(() => Reflect.get(window, 'listening').playing), false)
    await page.evaluate(() => Reflect.get(window, 'fixture').setLanguage('ur'))
    await page.locator('.listening-player[lang="ur"]').waitFor()
    assert.equal(await page.locator('.listening-player').getAttribute('dir'), 'rtl')
    assert.equal(await page.evaluate(() => Reflect.get(window, 'listening').language), 'ar')
    await page.locator('.listening-player .audio-transcript summary').click()
    assert.equal(await page.locator('.audio-transcript em').count(), 0)
    assert.equal(await page.locator('.audio-transcript p').getAttribute('dir'), 'rtl')
    assert.ok((await page.locator('.audio-download').getAttribute('href'))?.startsWith(`${origin}/AppearenceofNoble/audio/`))
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await page.evaluate(() => {
      const control = Reflect.get(window, 'listening')
      control.seek(38.25)
      control.play()
      window.dispatchEvent(new Event('pagehide'))
    })
    assert.equal(await page.evaluate(() => Reflect.get(window, 'listening').playing), false)
    assert.equal(await page.evaluate(() => Reflect.get(window, 'stableBind') === Reflect.get(window, 'listening').bindAudio), true)
    assert.equal(await page.evaluate(() => Reflect.get(window, 'stableStart') === Reflect.get(window, 'listening').startQueue), true)
    await page.reload()
    await page.locator('.listening-player').waitFor()
    assert.equal(await page.evaluate(() => Reflect.get(window, 'plays')), 0)
    assert.equal(await page.evaluate(() => Reflect.get(window, 'listening').currentTime), 38.25)
    await page.evaluate((chapter) => Reflect.get(window, 'listening').startQueue({ ...chapter, includeCautioned: true }, 'ar'), fixture.chapter)
    assert.match(await page.locator('.audio-caution').innerText(), /Source cautioned/,
      'deduplicated audio must retain warnings for every cautioned source alias')
    await page.evaluate(() => Reflect.get(window, 'fixture').setReader('cautioned'))
    assert.equal(await page.getByRole('dialog').getByRole('button', { name: 'Play this entry', exact: true }).isDisabled(), true)
    await page.getByRole('dialog').getByLabel(/Include this cautioned report/).check()
    await page.getByRole('dialog').getByRole('button', { name: 'Play this entry', exact: true }).click()
    assert.equal(await page.evaluate(() => Reflect.get(window, 'listening').currentNarration.id), 'cautioned')
    await page.getByRole('button', { name: 'Close reader' }).click()
    for (const theme of ['light', 'dark']) {
      await page.evaluate((value) => { document.documentElement.dataset.theme = value }, theme)
      const checks = await page.locator('.listening-player').evaluate((element) => {
        const rgb = (value: string) => value.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((channel) => {
          const component = channel / 255
          return component <= 0.04045 ? component / 12.92 : ((component + 0.055) / 1.055) ** 2.4
        })
        const luminance = (value: string) => {
          const [r, g, b] = rgb(value)
          return 0.2126 * r + 0.7152 * g + 0.0722 * b
        }
        const bg = luminance(getComputedStyle(element).backgroundColor)
        const contrast = [...element.querySelectorAll('.audio-notice, .audio-caution, .listening-source-button, .audio-download')].map((node) => {
          const color = luminance(getComputedStyle(node).color)
          return (Math.max(bg, color) + 0.05) / (Math.min(bg, color) + 0.05)
        })
        const heights = [...element.querySelectorAll('button, select, summary, input[type="range"]')].map((node) => node.getBoundingClientRect().height)
        return { contrast, heights, overflow: document.documentElement.scrollWidth > innerWidth }
      })
      assert.ok(checks.contrast.every((value) => value >= 4.5), `${theme} player text meets AA contrast`)
      assert.ok(checks.heights.every((value) => value >= 44), `${theme} player controls have 44px hit targets`)
      assert.equal(checks.overflow, false)
    }
    await page.evaluate(() => {
      localStorage.setItem('noble-project.listening.v1', '{broken');
      window.dispatchEvent(new StorageEvent('storage', { key: 'noble-project.listening.v1' }))
    })
    await page.getByRole('alert').waitFor()
    assert.match(await page.getByRole('alert').innerText(), /another tab|changed/i)
    await page.getByRole('button', { name: 'Reload saved listening state' }).click()
    assert.match(await page.getByRole('alert').innerText(), /damaged/)
    await page.evaluate(() => {
      Reflect.get(window, 'fixture').setUseContext(false)
      Reflect.get(window, 'fixture').setReader('second')
    })
    await page.getByRole('dialog').getByRole('button', { name: 'Play this entry', exact: true }).click()
    assert.equal(await page.evaluate(() => Reflect.get(window, 'listening').queue.shelf), 'character',
      'reader fallback context must derive the source collection')
    await page.evaluate(() => Reflect.get(window, 'unmountListening')())
    assert.equal(await page.locator('audio').count(), 0)
    const coverage = await page.coverage.stopJSCoverage()
    for (const file of ['hooks/useListening.ts', 'components/ListeningPlayer.tsx']) {
      const percent = listeningBrowserCoverage(coverage, file)
      console.info(`Browser authored-line coverage ${file}: ${percent.toFixed(2)}%`)
      assert.ok(percent >= 80, `${file} needs at least 80% authored-line coverage`)
    }

    // Real browser event ordering, with a silent PCM response instead of source assets.
    // There are no mocked media methods on this independent page.
    const native = await browser.newPage()
    await native.addInitScript(() => {
      const events: unknown[] = []
      Reflect.set(window, 'nativeListeningEvents', events)
      for (const name of ['loadstart', 'pause', 'playing', 'ended', 'abort', 'error', 'loadedmetadata', 'seeking', 'seeked', 'waiting', 'stalled']) {
        document.addEventListener(name, (event) => {
          if (!(event.target instanceof HTMLMediaElement)) return
          const media = event.target
          events.push({
            event: name, src: media.src, time: media.currentTime, duration: media.duration,
            paused: media.paused, error: media.error?.code, trusted: event.isTrusted,
          })
        }, true)
      }
    })
    const silence = listeningPcmFixture(10_000)
    await native.route('**/*', (route) => {
      const url = new URL(route.request().url())
      if (url.origin !== origin) { external.push(url.href); return route.abort() }
      if (url.pathname.includes('/audio/')) return route.fulfill({ contentType: 'audio/wav', body: silence })
      return route.continue()
    })
    await native.goto(`${origin}/listening-player-fixture`)
    assert.equal(await native.evaluate(() => [HTMLMediaElement.prototype.play, HTMLMediaElement.prototype.pause,
      HTMLMediaElement.prototype.load, Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime')!.get!]
      .every((method) => Function.prototype.toString.call(method).includes('[native code]'))), true,
    'native acceptance must not inherit any mocked media methods or currentTime accessors')
    await native.getByRole('button', { name: 'Play chapter', exact: true }).click()
    await native.waitForFunction(() => Reflect.get(window, 'listening').playing)
    await native.evaluate(() => Reflect.get(window, 'listening').startEntry('second', 'en'))
    await native.waitForFunction(() => Reflect.get(window, 'listening').playing)
    assert.equal(await native.evaluate(() => Reflect.get(window, 'listening').error), null)
    await native.getByRole('button', { name: 'Play chapter', exact: true }).click()
    await native.waitForFunction(() => Reflect.get(window, 'listening').currentNarration?.id === 'second').catch(async (error: unknown) => {
      console.info('Native listening failure state:', await native.evaluate(() => {
        const control = Reflect.get(window, 'listening')
        const media = document.querySelector('audio')!
        return {
          events: Reflect.get(window, 'nativeListeningEvents'), entry: control.currentNarration?.id,
          error: control.error, playing: control.playing, ended: control.ended, time: control.currentTime,
          media: {
            time: media.currentTime, duration: media.duration, paused: media.paused, ended: media.ended,
            seeking: media.seeking, readyState: media.readyState, networkState: media.networkState,
            error: media.error?.code,
            buffered: Array.from({ length: media.buffered.length }, (_, index) => [media.buffered.start(index), media.buffered.end(index)]),
          },
        }
      }))
      throw error
    })
    await native.waitForFunction(() => Reflect.get(window, 'listening').ended)
    assert.equal(await native.evaluate(() => Reflect.get(window, 'listening').error), null)
    const ended = await native.evaluate(() => (Reflect.get(window, 'nativeListeningEvents') as {
      event: string; src: string; time: number; duration: number; trusted: boolean
    }[]).filter((event) => event.event === 'ended').slice(-2))
    assert.equal(ended.length, 2, 'both chapter clips reach native EOF, not just controller state changes')
    assert.deepEqual(ended.map((event) => new URL(event.src).pathname), fixture.manifest.tracks
      .filter((track) => track.language === 'en' && ['first', 'second'].includes(track.entryId))
      .map((track) => `/AppearenceofNoble/${track.asset}`))
    assert.ok(ended.every((event) => event.trusted && event.time === event.duration && event.time > 0.0512),
      'completion comes from trusted browser ended events after real media-clock progression')
    assert.equal(await native.evaluate(() => Reflect.get(window, 'listening').playing), false)
    assert.equal(await native.locator('audio').count(), 1)
    assert.deepEqual(external, [])
  } finally {
    await browser?.close()
    await server.close()
    await rm(cacheDir, { recursive: true })
  }
})
