import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

export function useInkEntrance(target: RefObject<Element | null>, running: boolean) {
  const seen = useRef(false)
  useEffect(() => {
    const element = target.current
    if (!element || !running || seen.current) return
    seen.current = true
    element.classList.add('ink-arrival')
    const timer = window.setTimeout(() => element.classList.remove('ink-arrival'), 800)
    return () => {
      window.clearTimeout(timer)
      element.classList.remove('ink-arrival')
    }
  }, [target, running])
}

export function useOrnamentPointer(target: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const element = target.current
    if (!element) return
    const media = window.matchMedia('(hover: hover) and (pointer: fine)')
    let frame = 0
    let bounds = element.getBoundingClientRect()
    let x = 0
    let y = 0
    const reset = () => {
      cancelAnimationFrame(frame)
      frame = 0
      element.style.setProperty('--ornament-x', '0')
      element.style.setProperty('--ornament-y', '0')
      element.setAttribute('data-pointer-active', 'false')
    }
    const enter = () => { bounds = element.getBoundingClientRect() }
    const move = (event: PointerEvent) => {
      if (!enabled || !media.matches || event.pointerType !== 'mouse') return
      x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / Math.max(1, bounds.width) * 2 - 1))
      y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / Math.max(1, bounds.height) * 2 - 1))
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0
        element.style.setProperty('--ornament-x', x.toFixed(3))
        element.style.setProperty('--ornament-y', y.toFixed(3))
        element.setAttribute('data-pointer-active', 'true')
      })
    }
    reset()
    if (!enabled) return
    element.addEventListener('pointerenter', enter)
    element.addEventListener('pointermove', move, { passive: true })
    element.addEventListener('pointerleave', reset)
    window.addEventListener('resize', enter)
    media.addEventListener('change', reset)
    return () => {
      element.removeEventListener('pointerenter', enter)
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerleave', reset)
      window.removeEventListener('resize', enter)
      media.removeEventListener('change', reset)
      reset()
    }
  }, [target, enabled])
}
