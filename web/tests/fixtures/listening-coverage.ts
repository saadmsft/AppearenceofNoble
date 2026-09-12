import { createRequire } from 'node:module'

// Use PostCSS's already-installed source-map reader, not a new test dependency.
const { SourceMapConsumer } = createRequire(import.meta.resolve('postcss'))('source-map-js') as {
  SourceMapConsumer: new (map: unknown) => {
    eachMapping: (callback: (mapping: { generatedLine: number; generatedColumn: number; originalLine: number | null }) => void) => void
  }
}
type BrowserCoverage = {
  url: string; source?: string
  functions: { ranges: { startOffset: number; endOffset: number; count: number }[] }[]
}

/** Vite's unexecuted HMR wrappers are not authored component code.
 * Map executed V8 ranges back to source lines and union coverage across reloads.
 */
export function listeningBrowserCoverage(entries: readonly BrowserCoverage[], file: string): number {
  const lines = new Map<number, boolean>()
  for (const entry of entries.filter((value) => new URL(value.url).pathname === `/src/${file}`)) {
    const source = entry.source ?? ''
    const map = /\/\/# sourceMappingURL=data:application\/json[^,]*;base64,([A-Za-z0-9+/=]+)/.exec(source)
    if (!map) throw new Error(`Missing source map for listening fixture: ${file}`)
    const consumer = new SourceMapConsumer(JSON.parse(Buffer.from(map[1], 'base64').toString('utf8')))
    const executed = new Uint8Array(source.length)
    const ranges = entry.functions.flatMap((fn) => fn.ranges).sort((a, b) =>
      (b.endOffset - b.startOffset) - (a.endOffset - a.startOffset))
    for (const range of ranges) executed.fill(range.count ? 1 : 0, range.startOffset, range.endOffset)
    const offsets = [0]
    for (let index = 0; index < source.length; index++) if (source[index] === '\n') offsets.push(index + 1)
    consumer.eachMapping((mapping) => {
      if (!mapping.originalLine) return
      const covered = executed[offsets[mapping.generatedLine - 1] + mapping.generatedColumn] === 1
      lines.set(mapping.originalLine, Boolean(lines.get(mapping.originalLine) || covered))
    })
  }
  if (!lines.size) throw new Error(`No authored listening code covered: ${file}`)
  return 100 * [...lines.values()].filter(Boolean).length / lines.size
}
