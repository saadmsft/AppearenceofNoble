import { useRef } from 'react'
import { useAmbientMotion } from '../hooks/useAmbientMotion'
import { useInkEntrance } from '../hooks/useOrnamentMotion'
import '../illuminated-motion.css'

export function InkSeal({ paused }: { paused: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  const motion = useAmbientMotion(ref, !paused)
  useInkEntrance(ref, motion.running)
  return <span ref={ref} className="dedication-ornament ink-seal" aria-hidden="true">
    <svg viewBox="0 0 60 60" fill="none">
      <path pathLength="1" d="M30 4 56 30 30 56 4 30ZM12 12H48V48H12ZM30 18 42 30 30 42 18 30Z" />
    </svg>
  </span>
}
