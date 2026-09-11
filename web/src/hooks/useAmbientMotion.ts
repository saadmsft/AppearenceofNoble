import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

export function useAmbientMotion(target: RefObject<HTMLElement | null>, enabled: boolean) {
  const [inView, setInView] = useState(false)
  const [pageVisible, setPageVisible] = useState(() => !document.hidden)
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onPreference = () => setReduced(media.matches)
    const onVisibility = () => setPageVisible(!document.hidden)
    media.addEventListener('change', onPreference)
    document.addEventListener('visibilitychange', onVisibility)

    const observer = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= 0.12), { threshold: [0, 0.12] })
      : null
    if (target.current) observer?.observe(target.current)

    return () => {
      media.removeEventListener('change', onPreference)
      document.removeEventListener('visibilitychange', onVisibility)
      observer?.disconnect()
    }
  }, [target])

  return { running: enabled && inView && pageVisible && !reduced, reduced }
}
