import { AudioToolError, ssml, validateMp3 } from './core.ts'
import type { PlannedTrack } from './core.ts'
import { audioFormat } from '../../src/lib/audio.ts'

const regions = new Set([
  'australiaeast', 'brazilsouth', 'canadacentral', 'canadaeast', 'centralus', 'eastasia',
  'eastus', 'eastus2', 'francecentral', 'germanywestcentral', 'centralindia', 'italynorth',
  'japaneast', 'japanwest', 'koreacentral', 'northcentralus', 'northeurope', 'norwayeast',
  'qatarcentral', 'southafricanorth', 'southcentralus', 'southeastasia', 'swedencentral',
  'switzerlandnorth', 'switzerlandwest', 'uaenorth', 'uksouth', 'ukwest', 'westcentralus',
  'westeurope', 'westus', 'westus2', 'westus3',
])

export function speechEndpoint(region: string, explicit?: string): string {
  if (!regions.has(region)) throw new AudioToolError('unsupported-speech-region-not-global')
  const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`
  // Exact comparison rejects credentials, alternate ports, queries, redirects and lookalike hosts.
  if (explicit !== undefined && explicit !== endpoint) throw new AudioToolError('unapproved-speech-endpoint')
  return endpoint
}

export type SpeechConfig = { key: string; region: string; endpoint?: string }

export function validateSpeechConfig(config: SpeechConfig): string {
  const endpoint = speechEndpoint(config.region, config.endpoint)
  if (config.key.length < 16 || config.key.length > 512 || !/^[\x21-\x7E]+$/.test(config.key)) {
    throw new AudioToolError('invalid-speech-key-environment')
  }
  return endpoint
}

export class ProviderStatusError extends AudioToolError {
  status: number
  retryAfterMs: number

  constructor(status: number, retryAfterMs: number) {
    super(`speech-http-${status}`)
    this.status = status
    this.retryAfterMs = retryAfterMs
  }
}

function retryDelay(value: string | null): number {
  if (value === null) return 1_000
  const milliseconds = /^\d+$/.test(value) ? Number(value) * 1_000 : Date.parse(value) - Date.now()
  return Number.isFinite(milliseconds) ? Math.max(1_000, milliseconds) : 1_000
}

async function responseBytes(response: Response): Promise<Uint8Array> {
  if (!response.body) throw new AudioToolError('speech-empty-response')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const result = await reader.read()
      if (result.done) break
      length += result.value.length
      if (length > 4_000_000) {
        await reader.cancel()
        throw new AudioToolError('speech-response-too-large')
      }
      chunks.push(result.value)
    }
  } finally {
    reader.releaseLock()
  }
  return Buffer.concat(chunks, length)
}

export async function requestAudio(
  track: PlannedTrack,
  config: SpeechConfig,
  fetcher: typeof fetch = fetch,
  timeoutMs = 60_000,
): Promise<Uint8Array> {
  const endpoint = validateSpeechConfig(config)
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) {
    throw new AudioToolError('invalid-request-timeout')
  }
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new AudioToolError('speech-request-timeout-reservation-retained'))
    }, timeoutMs)
  })
  const request = async () => {
    const response = await fetcher(endpoint, {
      method: 'POST', redirect: 'error', signal: controller.signal,
      headers: {
        'Ocp-Apim-Subscription-Key': config.key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': audioFormat,
        'User-Agent': 'TheNobleProjectOfflineAudio/2.0',
      },
      body: ssml(track),
    })
    if (response.status !== 200) {
      await response.body?.cancel()
      throw new ProviderStatusError(response.status, retryDelay(response.headers.get('retry-after')))
    }
    const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
    if (type !== 'audio/mpeg' && type !== 'audio/mp3') {
      await response.body?.cancel()
      throw new AudioToolError('speech-unexpected-content-type')
    }
    const bytes = await responseBytes(response)
    const declaredLength = response.headers.get('content-length')
    if (declaredLength !== null && (!/^\d+$/.test(declaredLength) || Number(declaredLength) !== bytes.length)) {
      throw new AudioToolError('speech-content-length-mismatch')
    }
    validateMp3(bytes)
    return bytes
  }
  try {
    return await Promise.race([request(), timeout])
  } catch (error) {
    // Transport errors can contain request metadata. Never expose their text or causes.
    if (controller.signal.aborted) throw new AudioToolError('speech-request-timeout-reservation-retained')
    if (error instanceof TypeError || error instanceof DOMException) {
      throw new AudioToolError('speech-transport-failure-reservation-retained')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}
