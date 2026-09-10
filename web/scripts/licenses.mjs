import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const inventory = JSON.parse(execFileSync('pnpm', ['licenses', 'list', '--prod', '--json'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 8 * 1024 * 1024,
}))
const packages = Object.values(inventory).flat().sort((a, b) => a.name.localeCompare(b.name))
const overrides = new Map([
  ['react-remove-scroll-bar@2.3.8', join(root, 'scripts/license-overrides/react-remove-scroll-bar-2.3.8.txt')],
])
const sections = ['THE NOBLE APPEARANCE - THIRD-PARTY NOTICES\n\nLicenses for redistributed production dependencies, including locally hosted fonts.\n']
for (const dependency of packages) {
  const path = dependency.paths[0]
  const files = readdirSync(path).filter((name) => /^(?:licen[cs]e|copying)(?:[.-]|$)/i.test(name))
  const override = overrides.get(`${dependency.name}@${dependency.versions.join(',')}`)
  if (files.length === 0 && !override) throw new Error(`Missing license notice for ${dependency.name}; review before redistributing.`)
  const notices = files.length
    ? files.map((name) => readFileSync(join(path, name), 'utf8'))
    : [readFileSync(override, 'utf8')]
  sections.push([
    '='.repeat(72),
    `${dependency.name} ${dependency.versions.join(', ')} (${dependency.license})`,
    dependency.homepage ?? '',
    ...notices,
  ].join('\n\n'))
}
writeFileSync(join(root, 'public', 'THIRD-PARTY-NOTICES.txt'), `${sections.join('\n\n')}\n`)
console.log(`Bundled license notices for ${packages.length} production dependencies.`)
