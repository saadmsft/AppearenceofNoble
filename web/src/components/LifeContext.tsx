import { ArrowUpRight, MapPin } from 'lucide-react'
import { lifeMilestones, lifePlaceLabels, getLifeMilestone } from '../lib/life.ts'
import { lifePlaceIds } from '../lib/life-schema.ts'
import type { LifeMilestone, LifePlaceId } from '../lib/life-schema.ts'
import { topicLabels } from '../lib/catalog.ts'
import { number, translate } from '../lib/i18n.ts'
import type { Language, Topic } from '../lib/schema.ts'
import '../life.css'

const precisionLabels = {
  approximate: 'lifeApproximate', period: 'lifePeriod', reported: 'lifeReported',
} as const

export function LifeTimeline({ active, language, onNavigate }: {
  active: Topic
  language: Language
  onNavigate: (topic: Topic, beat: number) => void
}) {
  return <nav className="life-timeline page-width" aria-label={translate(language, 'milestoneNavigation')}>
    {lifeMilestones.map((milestone, index) => <button type="button" key={milestone.topic}
      aria-current={active === milestone.topic ? 'step' : undefined}
      onClick={() => onNavigate(milestone.topic, 0)}>
      <span className="life-timeline-number">{number(index + 1, language)}</span>
      <span><strong>{topicLabels[milestone.topic][language]}</strong><small>{milestone.dateLabel[language]}</small></span>
    </button>)}
  </nav>
}

export function LifeContext({ topic, language, onDisclosure }: {
  topic: Topic
  language: Language
  onDisclosure?: (expanded: boolean) => void
}) {
  const milestone = getLifeMilestone(topic)
  if (!milestone) return null
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key)
  return <div className="life-context" data-date-precision={milestone.datePrecision}>
    <div className="life-context-summary">
      <p><strong>{milestone.dateLabel[language]}</strong><span>{t(precisionLabels[milestone.datePrecision])}</span></p>
      <p className="life-place-line"><MapPin size={15} aria-hidden="true" />{milestone.places.map((place) => lifePlaceLabels[place][language]).join(' / ')}</p>
    </div>
    <details className="life-context-evidence" onToggle={(event) => onDisclosure?.(event.currentTarget.open)}>
      <summary>{t('lifeEvidence')}</summary>
      <p>{milestone.dateNote[language]}</p>
      <p>{milestone.placeNote[language]}</p>
      <p className="life-date-boundary">{t('lifeDateBoundary')}</p>
      <ul>{milestone.chronologySources.map((source) => <li key={source.url}>
        <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title[language]}<ArrowUpRight size={14} className="directional" aria-hidden="true" /></a>
        <p>{source.supports[language]}</p>
      </li>)}</ul>
    </details>
  </div>
}

export function LifeStageContext({ topic, language }: { topic: Topic; language: Language }) {
  const milestone = getLifeMilestone(topic)
  if (!milestone) return null
  return <div className="life-stage-context">
    <span>{milestone.dateLabel[language]}</span>
    <span><MapPin size={12} aria-hidden="true" />{milestone.places.map((place) => lifePlaceLabels[place][language]).join(' / ')}</span>
  </div>
}

// These are deliberately schematic drawing positions, not geographic coordinates.
const positions: Record<LifePlaceId, { x: number; y: number; labelX: number; labelY: number; anchor: 'start' | 'end' | 'middle' }> = {
  madinah: { x: 205, y: 92, labelX: 223, labelY: 102, anchor: 'start' },
  uhud: { x: 212, y: 54, labelX: 234, labelY: 56, anchor: 'start' },
  badr: { x: 115, y: 143, labelX: 96, labelY: 151, anchor: 'end' },
  hudaybiyyah: { x: 127, y: 267, labelX: 109, labelY: 253, anchor: 'end' },
  makkah: { x: 205, y: 281, labelX: 197, labelY: 322, anchor: 'middle' },
  hira: { x: 237, y: 242, labelX: 252, labelY: 232, anchor: 'start' },
  mina: { x: 260, y: 285, labelX: 281, labelY: 286, anchor: 'start' },
  taif: { x: 317, y: 337, labelX: 319, labelY: 366, anchor: 'middle' },
}

export function LifeLocatorGraphic({ milestone, language }: { milestone: LifeMilestone; language: Language }) {
  return <g className="life-locator" data-places={milestone.places.join(' ')}>
    <path className="life-locator-grid" d="M56 188H352M56 218H352M176 44V372M190 44V372" />
    <g className="life-compass"><path d="M49 98V58M43 67 49 58 55 67" /><text x="49" y="42" textAnchor="middle">{translate(language, 'lifeNorth')}</text></g>
    {lifePlaceIds.map((place) => {
      const { x, y, labelX, labelY, anchor } = positions[place]
      const active = milestone.places.includes(place)
      const textAnchor = language === 'ur' && anchor !== 'middle' ? (anchor === 'start' ? 'end' : 'start') : anchor
      return <g key={place} className={`life-place ${active ? 'life-place-active' : ''}`}>
        {active && <circle cx={x} cy={y} r="21" className="life-place-ring topic-motion motion-breathe" />}
        <path d={`M${x} ${y - 7}l7 7-7 7-7-7Z`} className="life-place-point" />
        <text x={labelX} y={labelY} textAnchor={textAnchor} direction={language === 'ur' ? 'rtl' : 'ltr'} className="life-place-label">{lifePlaceLabels[place][language]}</text>
      </g>
    })}
  </g>
}
