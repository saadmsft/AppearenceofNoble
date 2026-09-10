import appearance from '../../../content/appearance.json' with { type: 'json' }
import body from '../../../content/body.json' with { type: 'json' }
import presence from '../../../content/presence.json' with { type: 'json' }
import supplement from '../../../content/supplement.json' with { type: 'json' }
import { corpusSchema } from './schema.ts'

export const narrations = corpusSchema.parse([...appearance, ...body, ...presence, ...supplement])
export const primarySourceCount = new Set(narrations.map((row) => row.source.url)).size
export const lastChecked = narrations.map((row) => row.checkedAt).sort().at(-1)!
