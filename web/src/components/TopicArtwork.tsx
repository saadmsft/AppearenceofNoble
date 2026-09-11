import { useId, useRef } from 'react'
import { Pause, Play } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { AppearanceTopic, CharacterTopic, Language, Topic } from '../lib/schema.ts'
import { appearanceTopics, characterTopics } from '../lib/schema.ts'
import { topicLabels } from '../lib/catalog.ts'
import { translate } from '../lib/i18n.ts'
import { useAmbientMotion } from '../hooks/useAmbientMotion'

function phase(index: number): CSSProperties {
  return { animationDelay: `${index * -0.65}s` }
}

const characterMotifs: Record<CharacterTopic, AppearanceTopic> = {
  mercy: 'fragrance', patience: 'build', humility: 'movement', generosity: 'hands',
  justice: 'eyes', forgiveness: 'smile', honesty: 'seal', 'family-community': 'beard',
}

function artworkTopic(topic: Topic): AppearanceTopic {
  const character = characterTopics.find((item) => item === topic)
  if (character) return characterMotifs[character]
  const resolved = appearanceTopics.find((item) => item === topic)
  if (!resolved) throw new Error(`No artwork defined for topic: ${topic}`)
  return resolved
}

function Motif({ topic, glowId }: { topic: AppearanceTopic; glowId: string }) {
  switch (topic) {
    case 'complexion':
      return <>
        <circle cx="200" cy="200" r="116" fill={`url(#${glowId})`} stroke="none" />
        {[72, 108, 144].map((radius, index) => <circle className="topic-motion motion-radiance" style={phase(index)} key={radius} cx="200" cy="200" r={radius} />)}
        <path d="M200 48 352 200 200 352 48 200Z" className="motif-hairline" />
        <path d="M200 160 240 200 200 240 160 200Z" className="motif-fill topic-motion motion-breathe" />
      </>
    case 'eyes':
      return <>
        <path className="motif-hairline" d="M40 200H360M200 60V340" />
        {[110, 290].map((x, index) => <g className={`topic-motion ${index ? 'motion-pair-right' : 'motion-pair-left'}`} key={x}>
          {[102, 74, 46].map((size) => <rect key={size} x={x - size / 2} y={200 - size / 2} width={size} height={size} transform={`rotate(45 ${x} 200)`} />)}
          <circle cx={x} cy="200" r="5" className="motif-fill" />
        </g>)}
      </>
    case 'face':
      return <>
        <circle cx="200" cy="200" r="108" />
        <circle cx="200" cy="200" r="96" className="motif-hairline" />
        <g className="topic-motion motion-orbit">
          {Array.from({ length: 16 }, (_, i) => <path key={i} transform={`rotate(${i * 22.5} 200 200)`} d="M200 44V76M195 56H205" />)}
        </g>
        <path d="M200 112 288 200 200 288 112 200Z" className="topic-motion motion-breathe" />
        <circle cx="200" cy="200" r="40" fill={`url(#${glowId})`} />
      </>
    case 'hair':
      return <>
        {[0, 1, 2, 3, 4, 5].map((i) => <g key={i} transform={`translate(${i * 29} 0)`}>
          <path className="topic-motion motion-flow" style={phase(i)} d="M90 56C8 140 198 158 90 254S110 352 90 358" />
        </g>)}
        <path d="M45 44H355M45 366H355" className="motif-hairline" />
      </>
    case 'beard':
      return <>
        <path d="M200 40 360 200 200 360 40 200Z" className="motif-hairline" />
        {[0, 1, 2, 3, 4].map((i) => <g className="topic-motion motion-ink" style={phase(i)} key={i}>
          <path d={`M${80 + i * 38} 104V296M104 ${80 + i * 38}H296`} />
          <rect x={104 + i * 8} y={104 + i * 8} width={192 - i * 16} height={192 - i * 16} />
        </g>)}
      </>
    case 'mouth':
      return <>
        {[126, 200, 274].map((y, row) => <g className="topic-motion motion-tiles" style={phase(row)} key={y}>
          {[88, 144, 200, 256, 312].map((x) => <rect key={x} x={x - 17} y={y - 17} width="34" height="34" transform={`rotate(45 ${x} ${y})`} />)}
        </g>)}
        <path className="motif-hairline" d="M56 68H344M56 332H344" />
      </>
    case 'build':
      return <>
        <path d="M52 318H348M52 82H348M200 42V358" className="motif-hairline" />
        {[100, 166, 234, 300].map((x, i) => <g className="topic-motion motion-balance" style={phase(i)} key={x}>
          <path d={`M${x - 20} 294V134L${x} 104L${x + 20} 134V294Z`} />
          <path d={`M${x} 126V270`} className="motif-hairline" />
        </g>)}
      </>
    case 'hands':
      return <>
        {[80, 110, 140].map((r, i) => <g className="topic-motion motion-touch" style={phase(i)} key={r}>
          <circle cx="164" cy="200" r={r * 0.72} />
          <circle cx="236" cy="200" r={r * 0.72} />
        </g>)}
        <path d="M200 44V104M200 296V356" className="motif-hairline" />
        <rect x="190" y="190" width="20" height="20" transform="rotate(45 200 200)" className="motif-fill" />
      </>
    case 'feet':
      return <>
        <path d="M70 300 330 100" className="motif-hairline" />
        {[0, 1, 2, 3, 4, 5].map((i) => <g className="topic-motion motion-steps" style={phase(i)} key={i}>
          <rect x={63 + i * 44} y={268 - i * 32} width="34" height="34" transform={`rotate(45 ${80 + i * 44} ${285 - i * 32})`} />
          <circle cx={80 + i * 44} cy={285 - i * 32} r="3" className="motif-fill" />
        </g>)}
      </>
    case 'seal':
      return <>
        <circle cx="200" cy="200" r="140" className="motif-hairline" strokeDasharray="2 10" />
        <g className="topic-motion motion-emblem">
          {[0, 45].map((angle) => <rect key={angle} x="104" y="104" width="192" height="192" transform={`rotate(${angle} 200 200)`} />)}
          <path d="M200 112 225 175 288 200 225 225 200 288 175 225 112 200 175 175Z" />
        </g>
        <circle cx="200" cy="200" r="18" fill={`url(#${glowId})`} />
      </>
    case 'movement':
      return <>
        {[124, 176, 228, 280].map((y, i) => <path key={y} className="topic-motion motion-travel" style={phase(i)} d={`M48 ${y}C130 ${y - 94} 268 ${y + 84} 352 ${y - 20}`} pathLength="1" />)}
        <path d="M48 80V320M352 80V320" className="motif-hairline" />
      </>
    case 'fragrance':
      return <>
        <circle cx="200" cy="200" r="136" className="motif-hairline" />
        <g className="topic-motion motion-bloom">
          {Array.from({ length: 8 }, (_, i) => <path key={i} transform={`rotate(${i * 45} 200 200)`} d="M200 70C264 115 236 168 200 200C164 168 136 115 200 70Z" />)}
        </g>
        <circle className="motif-fill" cx="200" cy="200" r="7" />
      </>
    case 'voice':
      return <>
        <path d="M40 200H360" className="motif-hairline" />
        {[88, 126, 164, 202, 240, 278, 316].map((x, i) => <g className="topic-motion motion-voice" style={phase(i)} key={x}>
          <path d={`M${x} ${112 + (i % 3) * 22}V${288 - (i % 3) * 22}`} />
          <circle cx={x} cy="200" r="5" className="motif-fill" />
        </g>)}
      </>
    case 'smile':
      return <>
        <circle cx="200" cy="200" r="134" className="motif-hairline" />
        {[0, 1, 2].map((i) => <g className="topic-motion motion-unfold" style={phase(i)} key={i}>
          <path transform={`rotate(${i * 60} 200 200)`} d="M200 78 262 164 322 200 262 236 200 322 138 236 78 200 138 164Z" />
        </g>)}
      </>
    case 'dress':
      return <>
        <path d="M72 72H328V328H72Z" className="motif-hairline" />
        {[0, 1, 2, 3].map((row) => <g className="topic-motion motion-weave" style={phase(row)} key={row}>
          {[0, 1, 2, 3].map((col) => <path key={col} d={`M${92 + col * 58} ${92 + row * 58}h40v40h-40Z`} />)}
        </g>)}
        <path d="M200 52V348M52 200H348" />
      </>
    case 'overview':
      return <>
        <circle cx="200" cy="200" r="144" className="motif-hairline" />
        <g className="topic-motion motion-rosette">
          {Array.from({ length: 8 }, (_, i) => <path key={i} transform={`rotate(${i * 45} 200 200)`} d="M200 54 236 144 290 110 256 164 346 200 256 236 290 290 236 256 200 346" />)}
        </g>
        <circle cx="200" cy="200" r="54" fill={`url(#${glowId})`} />
      </>
  }
}

export function TopicArtwork({ topic, language, paused, reading, onPause }: {
  topic: Topic
  language: Language
  paused: boolean
  reading: boolean
  onPause: () => void
}) {
  const target = useRef<HTMLDivElement>(null)
  const motion = useAmbientMotion(target, !paused && !reading)
  const glowId = useId()
  const controlLabel = translate(language, motion.reduced ? 'reducedMotion' : paused ? 'resumeMotion' : 'pauseMotion')

  return <div className="topic-artwork" ref={target} data-motif={topic} data-running={motion.running}>
    <div className="topic-art-frame">
      <svg viewBox="0 0 400 400" fill="none" aria-hidden="true" focusable="false">
        <defs><radialGradient id={glowId}>
          <stop offset="0" stopColor="var(--cp-accent)" stopOpacity=".3" />
          <stop offset="1" stopColor="var(--cp-accent)" stopOpacity="0" />
        </radialGradient></defs>
        <Motif topic={artworkTopic(topic)} glowId={glowId} />
      </svg>
    </div>
    <div className="topic-art-caption">
      <p>{translate(language, topic === 'voice' ? 'voiceOrnamentNotice' : 'ornamentNotice')}</p>
      <button type="button" className="chapter-motion-toggle" disabled={motion.reduced} aria-pressed={paused || motion.reduced}
        aria-label={`${controlLabel} — ${topicLabels[topic][language]}`} onClick={onPause}>
        {paused || motion.reduced ? <Play size={12} aria-hidden="true" /> : <Pause size={12} aria-hidden="true" />}
        {controlLabel}
      </button>
    </div>
  </div>
}
