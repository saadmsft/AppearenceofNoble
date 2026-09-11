import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'
import { audioManifestSchema } from '../../src/lib/audio.ts'
import { AudioToolError, capMicros, emptyLedger, ledgerSchema, planTracks, sampleEntryId, spentMicros } from './core.ts'
import { cachedTracks, describePlan, generate } from './pipeline.ts'
import { speechEndpoint } from './provider.ts'
import {
  acquireLock, atomicWrite, diskStorage, jsonBytes, loadEntries, parseJson, privateLedgerPath, readOptional,
} from './storage.ts'

const usage = `Offline static audio tooling (Node 24)
  node web/scripts/audio/cli.ts dry-run [--scope samples|bulk] [--entry-id ID] [--ledger ABSOLUTE_PATH] [--check-coverage]
  node web/scripts/audio/cli.ts sample --ledger ABSOLUTE_PATH [--init-ledger] --resource-approved [--entry-id ID]
  node web/scripts/audio/cli.ts bulk --ledger ABSOLUTE_PATH --resource-approved --samples-approved --bulk-approved [--entry-id REVIEWED_SAMPLE_ID]
Options: --max-attempts 1..3 (default 3, lifetime per clip), --timeout-ms 1..120000 (default 60000).
Only sample/bulk read AZURE_SPEECH_KEY, AZURE_SPEECH_REGION and optional AZURE_SPEECH_ENDPOINT.
Paid modes are manual only. Resource/rate authorization and listening approval must happen outside this CLI.
Never create a replacement ledger to retry or raise the fixed $10 before-tax cap.`

export async function main(args: string[]): Promise<void> {
  let parsed
  try {
    parsed = parseArgs({
      args, allowPositionals: true, strict: true,
      options: {
        help: { type: 'boolean' }, ledger: { type: 'string' }, 'init-ledger': { type: 'boolean' },
        'resource-approved': { type: 'boolean' }, 'samples-approved': { type: 'boolean' },
        'bulk-approved': { type: 'boolean' }, scope: { type: 'string' }, 'entry-id': { type: 'string' },
        'max-attempts': { type: 'string' }, 'timeout-ms': { type: 'string' }, 'check-coverage': { type: 'boolean' },
      },
    })
  } catch (error) {
    if (error instanceof TypeError) throw new AudioToolError('invalid-cli-arguments-use-help')
    throw error
  }
  const { values, positionals } = parsed
  if (values.help) {
    console.log(usage)
    return
  }
  const mode = positionals[0]
  if (positionals.length !== 1 || (mode !== 'dry-run' && mode !== 'sample' && mode !== 'bulk')) {
    throw new AudioToolError('explicit-mode-required-use-help')
  }
  const maxAttempts = Number(values['max-attempts'] ?? '3')
  const timeoutMs = Number(values['timeout-ms'] ?? '60000')
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 3
    || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) {
    throw new AudioToolError('invalid-attempt-or-timeout-limit')
  }
  if ((values.scope && (mode !== 'dry-run' || !['samples', 'bulk'].includes(values.scope)))
    || (values['check-coverage'] && mode !== 'dry-run')
    || (values['init-ledger'] && mode !== 'sample')) {
    throw new AudioToolError('invalid-mode-options')
  }
  if (mode !== 'dry-run') {
    if (process.env.CI) throw new AudioToolError('ci-generation-forbidden')
    if (!values.ledger || !values['resource-approved']) throw new AudioToolError('ledger-and-parent-resource-approval-required')
    if (mode === 'bulk' && (!values['samples-approved'] || !values['bulk-approved'])) {
      throw new AudioToolError('user-samples-and-bulk-approval-required')
    }
  }
  const root = fileURLToPath(new URL('../../../', import.meta.url))
  const manifestPath = join(root, 'web/src/data/audio-manifest.json')
  const assets = join(root, 'web/public/audio')
  const ledgerPath = values.ledger ? await privateLedgerPath(values.ledger, root) : undefined
  const storage = diskStorage(assets, manifestPath, ledgerPath)
  const releaseLedger = mode !== 'dry-run' && ledgerPath ? await acquireLock(`${ledgerPath}.lock`) : undefined
  try {
    const releaseManifest = mode !== 'dry-run' ? await acquireLock(`${manifestPath}.lock`) : undefined
    try {
      let ledger
      if (ledgerPath) {
        const bytes = await readOptional(ledgerPath)
        if (bytes === null) {
          if (!values['init-ledger']) throw new AudioToolError('ledger-missing-explicit-initialization-required')
          ledger = emptyLedger()
          await atomicWrite(ledgerPath, jsonBytes(ledger), 0o600)
        } else {
          if (values['init-ledger']) throw new AudioToolError('ledger-already-exists-never-reset')
          ledger = parseJson(bytes, ledgerSchema)
        }
      }
      const bytes = await readOptional(manifestPath)
      if (bytes === null) throw new AudioToolError('manifest-missing')
      const manifest = parseJson(bytes, audioManifestSchema)
      const allTracks = planTracks(await loadEntries(join(root, 'content')))
      const sampleId = values['entry-id'] ?? sampleEntryId
      const samples = allTracks.filter((track) => track.entryId === sampleId)
      if (samples.length !== 3) throw new AudioToolError('sample-entry-not-found')
      if (samples.some((track) => track.transcriptCharacters > 800)) throw new AudioToolError('choose-a-shorter-sample-entry')
      const tracks = mode === 'sample' || (mode === 'dry-run' && values.scope === 'samples') ? samples : allTracks
      const cached = await cachedTracks(tracks, manifest, storage)
      const plan = describePlan(tracks, cached, ledger, maxAttempts)
      const missingMappings = tracks.filter((track) => !manifest.tracks.some((item) =>
        item.entryId === track.entryId && item.language === track.language && item.cacheKey === track.cacheKey))
      console.log(JSON.stringify({ mode, ...plan, missingManifestMappings: missingMappings.length }, null, 2))
      if (mode === 'dry-run') {
        if (values['check-coverage'] && (plan.newClips > 0 || missingMappings.length > 0)) {
          throw new AudioToolError('static-audio-coverage-incomplete')
        }
        return
      }
      if (!ledger) throw new AudioToolError('ledger-required')
      if (mode === 'bulk' && samples.some((track) => !cached.has(track.cacheKey))) {
        throw new AudioToolError('three-cached-samples-required-before-bulk')
      }
      if (Math.round(plan.expectedNewCostUsd * 1_000_000) > capMicros - spentMicros(ledger)) {
        throw new AudioToolError('remaining-plan-exceeds-shared-budget')
      }
      // Credentials are read only after all manual gates and the offline cost/cache preflight.
      const key = process.env.AZURE_SPEECH_KEY
      const region = process.env.AZURE_SPEECH_REGION
      if (!key || !region) throw new AudioToolError('speech-environment-required')
      const endpoint = speechEndpoint(region, process.env.AZURE_SPEECH_ENDPOINT)
      const result = await generate({
        tracks, manifest, cached, ledger, storage, mode,
        resourceApproved: values['resource-approved'] === true,
        samplesApproved: values['samples-approved'], bulkApproved: values['bulk-approved'],
        config: { key, region, endpoint }, maxAttempts, timeoutMs,
      })
      console.log(JSON.stringify({ complete: true, manifestMappings: result.tracks.length, requestedMappings: tracks.length }))
    } finally {
      await releaseManifest?.()
    }
  } finally {
    await releaseLedger?.()
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Terminal security boundary: unexpected errors remain failures but never print credentials,
  // provider response bodies, request objects, causes, or stacks.
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof AudioToolError ? `Audio tooling failed: ${error.message}` : 'Audio tooling failed: unexpected local failure; inspect local files and permissions.')
    process.exitCode = 1
  })
}
