import type { LaunchOptions } from '@playwright/test'

/** Use Chromium's device-free native output sink instead of depending on the
 * host's CoreAudio device/clock. This does NOT override HTMLMediaElement,
 * decoding, currentTime, seeking, play promises, or native media events.
 * Only the test browser uses this switch; production playback is unchanged.
 */
export function listeningNativeLaunchOptions(): LaunchOptions {
  return { headless: true, args: ['--disable-audio-output'] }
}

/** Complete 0.8-second mono PCM WAV of silence, held only in test memory.
 * 10 kHz retains the original regression fixture (512 frames = 0.0512s);
 * 48 kHz is the conventional-rate independent comparison. No source MP3,
 * speech synthesis, external file, or generated application asset is involved.
 */
export function listeningPcmFixture(sampleRate: number): Buffer {
  const byteLength = sampleRate * 2 * 0.8
  const clip = Buffer.alloc(44 + byteLength)
  clip.write('RIFF', 0)
  clip.writeUInt32LE(clip.length - 8, 4)
  clip.write('WAVEfmt ', 8)
  clip.writeUInt32LE(16, 16)
  clip.writeUInt16LE(1, 20)
  clip.writeUInt16LE(1, 22)
  clip.writeUInt32LE(sampleRate, 24)
  clip.writeUInt32LE(sampleRate * 2, 28)
  clip.writeUInt16LE(2, 32)
  clip.writeUInt16LE(16, 34)
  clip.write('data', 36)
  clip.writeUInt32LE(byteLength, 40)
  return clip
}
