import { shelfLabels } from '../lib/catalog.ts'
import { translate } from '../lib/i18n.ts'
import { shelves } from '../lib/schema.ts'
import type { Language, Shelf } from '../lib/schema.ts'

export function ShelfSelector({ value, language, allowAll = true, onChange }: {
  value: Shelf | 'all'
  language: Language
  allowAll?: boolean
  onChange: (shelf: Shelf | 'all') => void
}) {
  return <div className="shelf-selector" role="group" aria-label={translate(language, 'shelfFilter')}>
    {allowAll && <button type="button" aria-pressed={value === 'all'} onClick={() => onChange('all')}>{translate(language, 'allShelves')}</button>}
    {shelves.map((shelf) => <button type="button" key={shelf} aria-pressed={value === shelf} onClick={() => onChange(shelf)}>{shelfLabels[shelf][language]}</button>)}
  </div>
}
