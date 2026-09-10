import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = resolve(fileURLToPath(new URL('../dist/', import.meta.url)))
const base = '/AppearenceofNoble/'
const mime = {
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.svg': 'image/svg+xml',
}

function assetPath(reference, relativeTo = dist) {
  if (/^(?:https?:)?\/\//.test(reference)) throw new Error(`External asset cannot be bundled: ${reference}`)
  const path = reference.startsWith(base)
    ? resolve(dist, reference.slice(base.length))
    : resolve(relativeTo, reference)
  if (!path.startsWith(`${dist}${sep}`)) throw new Error(`Asset outside the build: ${reference}`)
  return path
}

function dataUrl(path) {
  const type = mime[extname(path)]
  if (!type) throw new Error(`Unsupported embedded asset: ${path}`)
  return `data:${type};base64,${readFileSync(path).toString('base64')}`
}

let html = readFileSync(resolve(dist, 'index.html'), 'utf8')
const scripts = readdirSync(resolve(dist, 'assets')).filter((name) => name.endsWith('.js'))
if (scripts.length !== 1) throw new Error('Standalone bundling expects one JavaScript chunk; update the inliner before introducing code splitting.')

html = html.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g, (tag) => {
  const reference = /href="([^"]+)"/.exec(tag)?.[1]
  if (!reference) throw new Error('Stylesheet has no href')
  const path = assetPath(reference)
  const css = readFileSync(path, 'utf8').replace(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^)\s]+))\s*\)/g, (match, double, single, plain) => {
    const url = double ?? single ?? plain
    if (url.startsWith('data:')) return match
    return `url("${dataUrl(assetPath(url, dirname(path)))}")`
  })
  return `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`
})

html = html.replace(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g, (_tag, reference) => {
  const code = readFileSync(assetPath(reference), 'utf8')
  return `<script type="module">${code.replace(/<\/script/gi, '<\\/script')}</script>`
})

html = html.replace(/(<link\b[^>]*rel="icon"[^>]*href=")([^"]+)(")/g,
  (_match, before, reference, after) => `${before}${dataUrl(assetPath(reference))}${after}`)

if (/<script\b[^>]*src=|<link\b[^>]*rel="(?:stylesheet|modulepreload)"/.test(html)) {
  throw new Error('Standalone output still contains external script or style resources')
}
const notices = readFileSync(resolve(dist, 'THIRD-PARTY-NOTICES.txt'), 'utf8').replace(/--/g, '- -')
html = html.replace('</body>', `<!--\n${notices}\n-->\n</body>`)
const output = resolve(dist, 'noble-appearance.html')
writeFileSync(output, html)
console.log(`Created self-contained noble-appearance.html (${Math.round(Buffer.byteLength(html) / 1024)} KiB), with embedded fonts and license notices.`)
