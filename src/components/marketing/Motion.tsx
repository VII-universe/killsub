'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { mountReveals, prefersReducedMotion } from './reveal'

/** Smooth scroll (Lenis) + ScrollTrigger sync + reveal hooks for the whole marketing page. Renders nothing. */
export default function Motion() {
  useEffect(() => {
    const reduced = prefersReducedMotion()
    let lenis: Lenis | null = null
    let cleanupTick: (() => void) | null = null
    if (!reduced) {
      lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1, smoothWheel: true })
      lenis.on('scroll', ScrollTrigger.update)
      const tick = (t: number) => lenis?.raf(t * 1000)
      gsap.ticker.add(tick)
      gsap.ticker.lagSmoothing(0)
      ;(window as Window & { __lenis?: Lenis }).__lenis = lenis
      cleanupTick = () => gsap.ticker.remove(tick)
    }
    // Wait a frame so fonts/layout settle before splitting lines.
    let cleanupReveals: (() => void) | null = null
    const raf = requestAnimationFrame(() => { cleanupReveals = mountReveals(document); ScrollTrigger.refresh() })
    const onLoad = () => ScrollTrigger.refresh()
    window.addEventListener('load', onLoad)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('load', onLoad)
      cleanupReveals?.()
      cleanupTick?.()
      lenis?.destroy()
    }
  }, [])
  return null
}
