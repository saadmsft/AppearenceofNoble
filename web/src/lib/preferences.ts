import { z } from 'zod'

export const preferenceKey = 'noble-appearance.preferences.v1'
export const preferencesSchema = z.object({
  language: z.enum(['en', 'ur']),
  theme: z.enum(['system', 'light', 'dark']),
  bookmarks: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).max(2000),
  textSize: z.enum(['normal', 'large', 'larger']),
  bilingual: z.boolean(),
  motion: z.enum(['auto', 'paused']).default('auto'),
}).strict()
export type Preferences = z.infer<typeof preferencesSchema>
export type StorageIssue = 'unavailable' | 'invalid' | null
export type StorageProvider = () => Pick<Storage, 'getItem' | 'setItem'>
export const defaultPreferences: Preferences = {
  language: 'en', theme: 'system', bookmarks: [], textSize: 'normal', bilingual: false, motion: 'auto',
}

export function loadPreferences(storage: StorageProvider): { value: Preferences; issue: StorageIssue } {
  let raw: string | null
  try {
    raw = storage().getItem(preferenceKey)
  } catch (error) {
    if (!(error instanceof DOMException)) throw error
    return { value: defaultPreferences, issue: 'unavailable' }
  }
  if (!raw) return { value: defaultPreferences, issue: null }
  let decoded: unknown
  try {
    decoded = JSON.parse(raw)
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    return { value: defaultPreferences, issue: 'invalid' }
  }
  const result = preferencesSchema.safeParse(decoded)
  return result.success
    ? { value: { ...result.data, bookmarks: [...new Set(result.data.bookmarks)] }, issue: null }
    : { value: defaultPreferences, issue: 'invalid' }
}

export function savePreferences(storage: StorageProvider, value: Preferences): StorageIssue {
  try {
    const target = storage()
    const serialized = JSON.stringify(preferencesSchema.parse(value))
    target.setItem(preferenceKey, serialized)
    return target.getItem(preferenceKey) === serialized ? null : 'unavailable'
  } catch (error) {
    if (!(error instanceof DOMException)) throw error
    return 'unavailable'
  }
}
