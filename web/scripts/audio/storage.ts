import { open, readFile, rename, unlink, mkdir, lstat, realpath, readdir } from 'node:fs/promises'
import { dirname, isAbsolute, join, parse, relative, sep } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { ZodType } from 'zod'
import { audioManifestSchema, audioTrackSchema } from '../../src/lib/audio.ts'
import type { AudioManifest, AudioTrack } from '../../src/lib/audio.ts'
import { AudioToolError, contentInputSchema, ledgerSchema } from './core.ts'
import type { AudioEntry, Ledger } from './core.ts'

export function isMissing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}

export async function readOptional(path: string): Promise<Buffer | null> {
  try {
    const info = await lstat(path)
    if (!info.isFile() || info.isSymbolicLink()) throw new AudioToolError('unsafe-file-path')
    return await readFile(path)
  } catch (error) {
    if (isMissing(error)) return null
    throw error
  }
}

export function parseJson<T>(bytes: Uint8Array, schema: ZodType<T>): T {
  let value: unknown
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'))
  } catch (error) {
    if (error instanceof SyntaxError) throw new AudioToolError('invalid-json-file')
    throw error
  }
  const parsed = schema.safeParse(value)
  if (!parsed.success) throw new AudioToolError('invalid-file-schema')
  return parsed.data
}

async function removeTemporary(path: string): Promise<void> {
  try {
    await unlink(path)
  } catch (error) {
    if (!isMissing(error)) throw error
  }
}

export async function atomicWrite(path: string, bytes: Uint8Array, mode = 0o644): Promise<void> {
  const temporary = `${path}.${randomUUID()}.tmp`
  const file = await open(temporary, 'wx', mode)
  try {
    try {
      await file.writeFile(bytes)
      await file.sync()
    } finally {
      await file.close()
    }
    await rename(temporary, path)
    const folder = await open(dirname(path), 'r')
    try {
      await folder.sync()
    } finally {
      await folder.close()
    }
  } finally {
    await removeTemporary(temporary)
  }
}

export function jsonBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`)
}

export async function acquireLock(path: string): Promise<() => Promise<void>> {
  let file
  try {
    file = await open(path, 'wx', 0o600)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
      throw new AudioToolError('run-locked-manual-recovery-required')
    }
    throw error
  }
  await file.close()
  return () => unlink(path)
}

export async function privateLedgerPath(path: string, repoRoot: string): Promise<string> {
  if (!isAbsolute(path)) throw new AudioToolError('ledger-must-be-absolute-and-outside-repository')
  const folder = await realpath(dirname(path))
  const root = await realpath(repoRoot)
  const location = join(folder, parse(path).base)
  const distance = relative(root, location)
  if (distance === '' || (distance !== '..' && !distance.startsWith(`..${sep}`) && !isAbsolute(distance))) {
    throw new AudioToolError('ledger-must-be-absolute-and-outside-repository')
  }
  // Also exclude the main checkout and other repositories, not just this worktree.
  let ancestor = folder
  while (true) {
    try {
      await lstat(join(ancestor, '.git'))
      throw new AudioToolError('ledger-must-be-absolute-and-outside-repository')
    } catch (error) {
      if (!isMissing(error)) throw error
    }
    const parent = dirname(ancestor)
    if (parent === ancestor) break
    ancestor = parent
  }
  const existing = await readOptional(location)
  if (existing !== null) {
    const info = await lstat(location)
    if ((info.mode & 0o077) !== 0 || info.nlink !== 1) throw new AudioToolError('ledger-must-be-private-0600')
  }
  return location
}

export async function loadEntries(folder: string): Promise<AudioEntry[]> {
  const files = (await readdir(folder)).filter((name) => name.endsWith('.json')).sort()
  if (!files.length) throw new AudioToolError('no-content-files')
  const entries: AudioEntry[] = []
  for (const name of files) {
    if (/private[\s_-]*note/iu.test(name)) throw new AudioToolError('private-input-forbidden')
    const data = await readOptional(join(folder, name))
    if (data === null) throw new AudioToolError('content-disappeared')
    entries.push(...parseJson(data, contentInputSchema))
  }
  return entries
}

export interface AudioStorage {
  readAudio(key: string): Promise<Uint8Array | null>
  readReceipt(key: string): Promise<AudioTrack | null>
  writeAudio(key: string, bytes: Uint8Array): Promise<void>
  writeReceipt(track: AudioTrack): Promise<void>
  writeManifest(manifest: AudioManifest): Promise<void>
  writeLedger(ledger: Ledger): Promise<void>
}

export function diskStorage(assets: string, manifestPath: string, ledgerPath?: string): AudioStorage {
  const assetPath = (key: string, extension: string) => {
    if (!/^[a-f0-9]{64}$/.test(key)) throw new AudioToolError('invalid-cache-key')
    return join(assets, `${key}.${extension}`)
  }
  return {
    readAudio: (key) => readOptional(assetPath(key, 'mp3')),
    async readReceipt(key) {
      const bytes = await readOptional(assetPath(key, 'json'))
      return bytes === null ? null : parseJson(bytes, audioTrackSchema)
    },
    async writeAudio(key, bytes) {
      await mkdir(assets, { recursive: true })
      await atomicWrite(assetPath(key, 'mp3'), bytes)
    },
    async writeReceipt(track) {
      await atomicWrite(assetPath(track.cacheKey, 'json'), jsonBytes(track))
    },
    writeManifest: (manifest) => atomicWrite(manifestPath, jsonBytes(audioManifestSchema.parse(manifest))),
    async writeLedger(ledger) {
      if (!ledgerPath) throw new AudioToolError('ledger-required')
      await atomicWrite(ledgerPath, jsonBytes(ledgerSchema.parse(ledger)), 0o600)
    },
  }
}
