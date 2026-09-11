export function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'paused'
    ? 'instant'
    : 'smooth'
}

export function focusSection(id: string) {
  const section = document.getElementById(id)
  section?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
  section?.focus({ preventScroll: true })
}
