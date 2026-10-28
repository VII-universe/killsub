'use client'

import { useEffect } from 'react'
import { prefersReducedMotion } from './reveal-lite'

/** Smooth scroll (Lenis) + ScrollTrigger + reveal hooks. The libraries load after first paint so they never delay hydration or the scene. */
export default function Motion() {
  useEffect(() => {
    let cleanup: (() => void) | null = null
    let cancelled = false
    const start = () => {
      import('./motion-runtime').then(({ mountMotion }) => { if (!cancelled) cleanup = mountMotion(prefersReducedMotion()) })
    }
    const id = window.setTimeout(start, 120)
    return () => { cancelled = true; window.clearTimeout(id); cleanup?.() }
  }, [])
  return null
}
