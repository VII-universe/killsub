'use client'

import { useEffect, useRef, useState } from 'react'
import type { CardData, Lang } from './content'
import type { HeroSceneHandle, PerfSample, PileTarget } from './scene/engine'
import HeroFallback from './HeroFallback'

type Props = { cards: CardData[]; onLand: (price: number) => void; lang: Lang; sceneLabel: string }

function supportsWebGL2() {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch { return false }
}

/** Pile centre in NDC, computed from where the copy block actually is so the scene never sits under the text. */
function measurePileTarget(canvas: HTMLCanvasElement): PileTarget | null {
  const hero = canvas.closest('.mk-hero')
  const copy = hero?.querySelector<HTMLElement>('.mk-hero-copy')
  const ctas = hero?.querySelector<HTMLElement>('.mk-ctas')
  const note = hero?.querySelector<HTMLElement>('.mk-hero-note')
  if (!copy || !ctas) return null
  const c = canvas.getBoundingClientRect()
  if (c.width === 0 || c.height === 0) return null
  const r = copy.getBoundingClientRect()
  const portrait = c.width / c.height < 0.9
  let cx: number, cy: number
  if (portrait) {
    const top = ctas.getBoundingClientRect().bottom + 12
    const bottom = (note?.getBoundingClientRect().top ?? c.bottom) - 8
    cx = c.left + c.width / 2
    cy = (top + bottom) / 2 + (bottom - top) * 0.05
  } else {
    const left = r.right + 32
    cx = (left + c.right) / 2 - (c.right - left) * 0.04
    cy = c.top + c.height * 0.64
  }
  return { x: ((cx - c.left) / c.width) * 2 - 1, y: -((cy - c.top) / c.height) * 2 + 1 }
}

export default function HeroScene({ cards, onLand, lang, sceneLabel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onLandRef = useRef(onLand)
  const [ready, setReady] = useState(false)
  const [perf, setPerf] = useState<PerfSample | null>(null)
  const [perfOn, setPerfOn] = useState(false)
  const [fallback, setFallback] = useState<string | null>(null)

  useEffect(() => { onLandRef.current = onLand }, [onLand])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!supportsWebGL2()) { window.setTimeout(() => setFallback('no webgl2'), 0); return }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const q = new URLSearchParams(window.location.search)
    const wantPerf = q.get('perf') === '1'
    if (wantPerf) window.setTimeout(() => setPerfOn(true), 0)
    if (q.get('fallback') === '1') { window.setTimeout(() => setFallback('forced by ?fallback=1'), 0); return }
    let handle: HeroSceneHandle | null = null
    let cancelled = false
    let copyObserver: ResizeObserver | null = null
    let gotFrame = false
    // If WebGL never produces a frame (driver fault, context loss, stalled device), hand the hero to the DOM fallback.
    const watchdog = window.setTimeout(() => { if (!gotFrame && !cancelled) { console.warn('[hero] no frame in 8 s, using fallback'); setFallback('timeout'); handle?.dispose(); handle = null } }, 8000)
    canvas.addEventListener('webglcontextlost', () => { if (!cancelled) setFallback('context lost') }, { once: true })

    // Scene code (three) loads after the text has painted so the headline stays the LCP element; Rapier follows the first frame.
    const start = () => {
      import('./scene/engine').then(async ({ createHeroScene }) => {
        if (cancelled) return
        handle = await createHeroScene(canvas, {
          cards,
          lang,
          reducedMotion: reduced,
          onLand: (p) => onLandRef.current(p),
          onFirstFrame: () => { gotFrame = true; window.clearTimeout(watchdog); setReady(true) },
          onPerf: wantPerf ? setPerf : undefined,
          getPileTarget: () => measurePileTarget(canvas),
          seed: q.get('seed') ? Number(q.get('seed')) : undefined,
          debug: q.get('debug') === '1',
        })
        if (cancelled) { handle.dispose(); return }
        const copy = canvas.closest('.mk-hero')?.querySelector('.mk-hero-copy')
        if (copy) { copyObserver = new ResizeObserver(() => handle?.relayout()); copyObserver.observe(copy) }
      }).catch((err) => { console.error('[hero] scene failed', err); window.clearTimeout(watchdog); setFallback(String(err?.message || err)) })
    }
    const hasIdle = typeof window.requestIdleCallback === 'function'
    const id = hasIdle ? window.requestIdleCallback(start, { timeout: 600 }) : window.setTimeout(start, 50)
    return () => {
      cancelled = true
      if (hasIdle) window.cancelIdleCallback(id)
      else window.clearTimeout(id)
      window.clearTimeout(watchdog)
      copyObserver?.disconnect()
      handle?.dispose()
    }
  }, [cards, lang])

  return (
    <div className="mk-hero-scene" data-ready={ready && !fallback}>
      <canvas ref={canvasRef} role="img" aria-label={sceneLabel} hidden={!!fallback} />
      {fallback && <HeroFallback cards={cards} lang={lang} onLand={(p) => onLandRef.current(p)} reason={fallback} showReason={perfOn} />}
      {perfOn && perf && (
        <div className="mk-perf" aria-live="off">
          {perf.text}
          <br />
          <button type="button" onClick={() => navigator.clipboard?.writeText(perf.text)}>copy</button>
        </div>
      )}
    </div>
  )
}
