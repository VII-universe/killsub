'use client'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export const EASE_OUT = 'expo.out'
export const EASE_INOUT = 'power3.inOut'
export const EASE_BACK = 'back.out(1.4)'
export const D1 = 0.5
export const D2 = 0.8
export const D3 = 1.2

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Wraps the element's text into `.ln > .ln-in` lines measured at the current width. Plain-text elements only. */
export function splitLines(el: HTMLElement) {
  if (el.dataset.split === '1') return Array.from(el.querySelectorAll<HTMLElement>('.ln-in'))
  const text = el.textContent ?? ''
  el.setAttribute('aria-label', text)
  el.textContent = ''
  const words = text.split(/\s+/).filter(Boolean)
  const spans = words.map((w) => { const s = document.createElement('span'); s.textContent = w; s.style.display = 'inline-block'; el.append(s, document.createTextNode(' ')); return s })
  const lines: HTMLSpanElement[][] = []
  let top: number | null = null
  for (const s of spans) {
    if (top === null || Math.abs(s.offsetTop - top) > 2) { lines.push([s]); top = s.offsetTop } else lines[lines.length - 1].push(s)
  }
  el.textContent = ''
  const inners: HTMLElement[] = []
  for (const ln of lines) {
    const o = document.createElement('span'); o.className = 'ln'; o.setAttribute('aria-hidden', 'true')
    const i = document.createElement('span'); i.className = 'ln-in'; i.textContent = ln.map((s) => s.textContent).join(' ')
    o.append(i); el.append(o); inners.push(i)
  }
  el.dataset.split = '1'
  return inners
}

/** Wraps every character into a `.ch` span for type-on reveals. */
export function splitChars(el: HTMLElement) {
  if (el.dataset.split === '1') return Array.from(el.querySelectorAll<HTMLElement>('.ch'))
  const text = el.textContent ?? ''
  el.setAttribute('aria-label', text)
  el.textContent = ''
  const wrap = document.createElement('span'); wrap.className = 'chs'; wrap.setAttribute('aria-hidden', 'true')
  const out: HTMLElement[] = []
  for (const ch of Array.from(text)) {
    const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch
    wrap.append(s); out.push(s)
  }
  el.append(wrap)
  el.dataset.split = '1'
  return out
}

type Cleanup = () => void

/** Scans a root for data-reveal / data-tilt / data-assemble hooks and wires GSAP + ScrollTrigger. Returns a cleanup. */
export function mountReveals(root: ParentNode): Cleanup {
  const reduced = prefersReducedMotion()
  const triggers: ScrollTrigger[] = []
  const cleanups: Cleanup[] = []
  const once = (el: Element, fn: () => void, start = 'top 85%') => {
    if (reduced) { fn(); return }
    triggers.push(ScrollTrigger.create({ trigger: el, start, once: true, onEnter: fn }))
  }

  // Headlines (server-rendered .mk-line) and paragraphs: lines rise through a mask with a slight rotateX.
  root.querySelectorAll<HTMLElement>('[data-reveal="lines"]').forEach((el) => {
    if (el.closest('.mk-hero')) return
    const inners = el.querySelector('.mk-line-in') ? Array.from(el.querySelectorAll<HTMLElement>('.mk-line-in')) : splitLines(el)
    const stagger = Number(el.dataset.stagger ?? (el.matches('h1,h2,h3') ? 0.07 : 0.04))
    if (reduced) { gsap.set(inners, { y: 0, rotateX: 0, opacity: 1 }); return }
    gsap.set(inners, { y: '110%', rotateX: 8, opacity: 1, transformOrigin: '50% 100%' })
    once(el, () => { gsap.to(inners, { y: '0%', rotateX: 0, duration: D2 + 0.2, ease: EASE_OUT, stagger }) })
  })

  // Mono labels type on, character by character.
  root.querySelectorAll<HTMLElement>('[data-reveal="type"]').forEach((el) => {
    if (el.closest('.mk-hero')) return
    const chars = splitChars(el)
    if (reduced) return
    gsap.set(chars, { opacity: 0 })
    once(el, () => { gsap.to(chars, { opacity: 1, duration: 0.01, ease: 'none', stagger: Math.min(0.02, 0.9 / Math.max(1, chars.length)) }) }, 'top 92%')
  })

  // Blocks arrive with a little overshoot; siblings inside a group are staggered.
  root.querySelectorAll<HTMLElement>('[data-reveal="block"]').forEach((el) => {
    const items = el.dataset.group !== undefined ? Array.from(el.children) as HTMLElement[] : [el]
    const fromX = el.dataset.from === 'x' ? 40 : 0
    const fromY = el.dataset.from === 'x' ? 0 : 36
    if (reduced) return
    gsap.set(items, { x: fromX, y: fromY, opacity: 0 })
    once(el, () => { gsap.to(items, { x: 0, y: 0, opacity: 1, duration: D2, ease: EASE_BACK, stagger: 0.08 }) })
  })

  // Fade-only reveal for things that must not move (images, app frames).
  root.querySelectorAll<HTMLElement>('[data-reveal="fade"]').forEach((el) => {
    if (reduced) return
    gsap.set(el, { opacity: 0 })
    once(el, () => { gsap.to(el, { opacity: 1, duration: D2, ease: EASE_OUT }) })
  })

  // App widgets assemble: calendar cells light up day by day, the score ring is revealed by remounting (see AppFrame).
  root.querySelectorAll<HTMLElement>('[data-assemble="calendar"]').forEach((el) => {
    if (reduced) return
    const cells = Array.from(el.querySelectorAll<HTMLElement>('.grid-cols-7 > *')).filter((c) => c.textContent?.trim())
    gsap.set(cells, { opacity: 0, scale: 0.92, transformOrigin: '50% 50%' })
    once(el, () => { gsap.to(cells, { opacity: 1, scale: 1, duration: 0.5, ease: EASE_OUT, stagger: 0.018 }) }, 'top 80%')
  })

  // 3D tilt toward the pointer (max 6°) with an edge highlight that follows it.
  root.querySelectorAll<HTMLElement>('[data-tilt]').forEach((el) => {
    if (reduced || !window.matchMedia('(hover: hover)').matches) return
    const max = Number(el.dataset.tilt || 6)
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height
      gsap.to(el, { rotateY: (px - 0.5) * 2 * max, rotateX: -(py - 0.5) * 2 * max, duration: 0.5, ease: EASE_OUT, transformPerspective: 900, overwrite: 'auto' })
      el.style.setProperty('--gx', `${px * 100}%`); el.style.setProperty('--gy', `${py * 100}%`)
      el.dataset.hover = 'true'
    }
    const leave = () => { gsap.to(el, { rotateY: 0, rotateX: 0, duration: D2, ease: EASE_OUT, overwrite: 'auto' }); el.dataset.hover = 'false' }
    el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave)
    cleanups.push(() => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave) })
  })

  return () => { triggers.forEach((t) => t.kill()); cleanups.forEach((c) => c()) }
}

/** Scroll-scrubbed 0→1 progress of an element travelling from the bottom of the viewport to its upper third. */
export function scrubProgress(el: Element, onUpdate: (p: number) => void): Cleanup {
  if (prefersReducedMotion()) { onUpdate(1); return () => {} }
  const t = ScrollTrigger.create({ trigger: el, start: 'top 95%', end: 'top 35%', scrub: 0.4, onUpdate: (s) => onUpdate(s.progress) })
  return () => t.kill()
}
