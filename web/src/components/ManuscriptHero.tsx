import { useRef } from 'react'
import { ArrowDown, ArrowUpRight, BookOpen, Pause, Play } from 'lucide-react'
import type { Language } from '../lib/schema.ts'
import { number, translate } from '../lib/i18n.ts'
import { useAmbientMotion } from '../hooks/useAmbientMotion'
import { Button } from './ui/button'

export function Rosette({ className = '' }: { className?: string }) {
  return <svg className={`manuscript-rosette ${className}`} viewBox="0 0 600 600" fill="none" aria-hidden="true" focusable="false">
    <g className="rosette-rim">
      <circle cx="300" cy="300" r="283" />
      <circle cx="300" cy="300" r="272" strokeDasharray="1 11" strokeLinecap="round" />
      {Array.from({ length: 16 }, (_, index) => <path key={index} transform={`rotate(${index * 22.5} 300 300)`} d="M300 5 309 18 300 31 291 18Z" />)}
    </g>
    <g className="rosette-petals">
      {Array.from({ length: 16 }, (_, index) => <path key={index} transform={`rotate(${index * 22.5} 300 300)`} pathLength="1" d="M300 46C341 103 366 143 351 181L300 226 249 181C234 143 259 103 300 46Z" />)}
    </g>
    <g className="rosette-tracery">
      {Array.from({ length: 8 }, (_, index) => <rect key={index} x="133" y="133" width="334" height="334" transform={`rotate(${index * 22.5} 300 300)`} rx="1" />)}
    </g>
    <circle className="rosette-center" cx="300" cy="300" r="158" />
    <circle cx="300" cy="300" r="148" />
    <circle cx="300" cy="300" r="140" strokeDasharray="1 9" strokeLinecap="round" />
  </svg>
}

type HeroProps = {
  language: Language
  entryCount: number
  topicCount: number
  paused: boolean
  readerOpen: boolean
  guideHref: string
  onExplore: () => void
  onGuide: () => void
  onPause: () => void
}

export function ManuscriptHero({ language, entryCount, topicCount, paused, readerOpen, guideHref, onExplore, onGuide, onPause }: HeroProps) {
  const art = useRef<HTMLDivElement>(null)
  const motion = useAmbientMotion(art, !paused && !readerOpen)
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key)

  return <>
    <section className="hero-shell" aria-labelledby="hero-title">
      <div className="hero page-width">
        <div className="hero-copy">
          <h1 id="hero-title"><span>{t('heroFirst')}</span>{' '}<em>{t('heroSecond')}</em></h1>
          <p className="hero-description">{t('heroDescription')}</p>
          <div className="hero-actions">
            <Button onClick={onExplore}>{t('beginJourney')}<span className="hero-button-arrow"><ArrowDown size={18} aria-hidden="true" /></span></Button>
            <a href={guideHref} className="hero-guide-link" onClick={(event) => {
              if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onGuide() }
            }}>{t('approach')}<ArrowUpRight size={16} className="directional" aria-hidden="true" /></a>
          </div>
          <p className="hero-reverence"><BookOpen size={16} aria-hidden="true" />{t('noImages')}</p>
        </div>
        <div className="manuscript-art" ref={art} data-running={motion.running} data-reduced={motion.reduced}>
          <svg className="manuscript-arch" viewBox="0 0 600 680" fill="none" aria-hidden="true" focusable="false">
            <path pathLength="1" d="M48 656V308C48 156 174 92 300 24C426 92 552 156 552 308V656" />
            <path pathLength="1" d="M64 656V310C64 165 187 105 300 44C413 105 536 165 536 310V656" />
            <path d="M28 656H572M48 620H86M514 620H552" />
          </svg>
          <div className="art-caption" lang="ar" dir="rtl">الشَّمَائِلُ الْمُحَمَّدِيَّةُ</div>
          <div className="rosette-stage">
            <Rosette />
            <div className="name-calligraphy" lang="ar" dir="rtl">
              <span>مُحَمَّدٌ</span>
              <small>صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ</small>
            </div>
          </div>
        </div>
        <div className="hero-colophon">
          <p><strong>{number(entryCount, language)}</strong> {t('entries')}<span aria-hidden="true">/</span><strong>{number(topicCount, language)}</strong> {t('themes')}</p>
          <button type="button" className="motion-toggle" aria-pressed={paused || motion.reduced} disabled={motion.reduced}
            onClick={onPause} aria-label={t(motion.reduced ? 'reducedMotion' : paused ? 'resumeMotion' : 'pauseMotion')}>
            {paused || motion.reduced ? <Play size={12} aria-hidden="true" /> : <Pause size={12} aria-hidden="true" />}
            {t(motion.reduced ? 'reducedMotion' : paused ? 'resumeMotion' : 'pauseMotion')}
          </button>
        </div>
      </div>
    </section>
  </>
}
