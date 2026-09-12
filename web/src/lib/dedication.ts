export const dedicationSeenKey = 'noble-appearance.dedication.seen.v1'

export function hasSeenDedication(): boolean {
  try {
    return window.localStorage.getItem(dedicationSeenKey) === 'true'
  } catch {
    return true
  }
}

export function markDedicationSeen(): void {
  try {
    window.localStorage.setItem(dedicationSeenKey, 'true')
  } catch {
    // Storage unavailable; the dedication will re-appear on the next reload.
  }
}
