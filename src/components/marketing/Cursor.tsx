'use client'

import { useEffect } from 'react'

/** Custom cursor: a small ring that becomes a "×" over killable cards (hero pile while interactive, kill stage cards). Mouse only. */
export default function Cursor() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const el = document.createElement('div')
    el.className = 'mk-cursor'
    el.innerHTML = '<span class="mk-cursor-x" aria-hidden="true"></span>'
    document.body.append(el)
    let x = -100, y = -100, tx = -100, ty = -100, raf = 0, visible = false
    const onMove = (e: PointerEvent) => {
      tx = e.clientX; ty = e.clientY
      if (!visible) { visible = true; el.dataset.on = 'true' }
      const t = e.target as HTMLElement | null
      const kill = !!t?.closest('.mk-journey[data-hero="true"] canvas, .mk-kill-stage canvas:hover, .mk-kill-stage')
      const link = !!t?.closest('a, button, [role="button"]')
      el.dataset.mode = kill && !link ? 'kill' : link ? 'link' : 'default'
      document.body.dataset.cursor = kill && !link ? 'kill' : 'default'
    }
    const onLeave = () => { visible = false; el.dataset.on = 'false' }
    const tick = () => {
      raf = requestAnimationFrame(tick)
      x += (tx - x) * 0.22; y += (ty - y) * 0.22
      el.style.transform = `translate(${x}px, ${y}px)`
    }
    raf = requestAnimationFrame(tick)
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('mouseleave', onLeave)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', onMove); document.documentElement.removeEventListener('mouseleave', onLeave); el.remove(); delete document.body.dataset.cursor }
  }, [])
  return null
}
