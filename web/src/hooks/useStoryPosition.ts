import { useEffect } from 'react'
import type { RefObject } from 'react'
import { storyPosition } from '../lib/story.ts'

export function useStoryPosition(
  root: RefObject<HTMLDivElement | null>,
  passages: RefObject<Array<HTMLDivElement | null>>,
  enabled: boolean,
  onScene: (index: number) => void,
) {
  useEffect(() => {
    const element = root.current
    if (!element || !enabled) return
    let frame = 0
    let starts: number[] = []
    let end = 0
    let dirty = true

    function update() {
      frame = 0
      if (document.hidden) return
      const nodes = passages.current.filter((node): node is HTMLDivElement => node !== null)
      if (!nodes.length) return
      if (dirty) {
        starts = nodes.map((node) => node.getBoundingClientRect().top + window.scrollY)
        const last = nodes[nodes.length - 1]
        end = last.getBoundingClientRect().bottom + window.scrollY
        const header = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 88
        element!.style.setProperty('--story-top', `${header + 12}px`)
        dirty = false
      }
      const narrow = window.matchMedia('(max-width: 760px)').matches
      const stageBottom = element!.querySelector('.story-stage')?.getBoundingClientRect().bottom ?? 0
      const anchorOffset = narrow
        ? Math.min(window.innerHeight - 48, stageBottom + Math.max(0, window.innerHeight - stageBottom) * 0.45)
        : window.innerHeight * 0.52
      const anchor = window.scrollY + anchorOffset
      const position = storyPosition(starts, end, anchor)
      element!.style.setProperty('--story-progress', position.progress.toFixed(4))
      element!.style.setProperty('--story-local', position.local.toFixed(4))
      onScene(position.index)
    }

    function request() {
      if (!frame && !document.hidden) frame = requestAnimationFrame(update)
    }
    function measure() { dirty = true; request() }
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null
    observer?.observe(element)
    window.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', measure)
    document.addEventListener('visibilitychange', request)
    request()
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('scroll', request)
      window.removeEventListener('resize', measure)
      document.removeEventListener('visibilitychange', request)
    }
  }, [root, passages, enabled, onScene])
}
