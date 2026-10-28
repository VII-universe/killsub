'use client'

import { useEffect, useRef, useState } from 'react'
import type { CardData, Lang } from './content'
import type { HeroSceneHandle, PerfSample } from './scene/engine'

type Props = { cards: CardData[]; onLand: (price: number) => void; lang: Lang; sceneLabel: string }

function supportsWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch { return false }
}

export default function HeroScene({ cards, onLand, lang, sceneLabel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onLandRef = useRef(onLand)
  const [ready, setReady] = useState(false)
  const [perf, setPerf] = useState<PerfSample | null>(null)
  const [perfOn, setPerfOn] = useState(false)

  useEffect(() => { onLandRef.current = onLand }, [onLand])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !supportsWebGL()) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const q = new URLSearchParams(window.location.search)
    const wantPerf = q.get('perf') === '1'
    // Review-only switch between the two display faces (?display=b). Set after hydration to avoid a mismatch.
    if (q.get('display') === 'b') document.documentElement.dataset.display = 'b'
    setPerfOn(wantPerf)
    let handle: HeroSceneHandle | null = null
    let cancelled = false

    // Scene code (three + rapier) loads after the text has painted so the headline stays the LCP element.
    const start = () => {
      import('./scene/engine').then(async ({ createHeroScene }) => {
        if (cancelled) return
        handle = await createHeroScene(canvas, {
          cards,
          lang,
          reducedMotion: reduced,
          onLand: (p) => onLandRef.current(p),
          onFirstFrame: () => setReady(true),
          onPerf: wantPerf ? setPerf : undefined,
          seed: q.get('seed') ? Number(q.get('seed')) : undefined,
          debug: q.get('debug') === '1',
        })
        if (cancelled) handle.dispose()
      }).catch((err) => console.error('[hero] scene failed', err))
    }
    const hasIdle = typeof window.requestIdleCallback === 'function'
    const id = hasIdle ? window.requestIdleCallback(start, { timeout: 600 }) : window.setTimeout(start, 50)
    return () => {
      cancelled = true
      if (hasIdle) window.cancelIdleCallback(id)
      else window.clearTimeout(id)
      handle?.dispose()
    }
  }, [cards, lang])

  return (
    <div className="mk-hero-scene" data-ready={ready} aria-hidden="false">
      <canvas ref={canvasRef} role="img" aria-label={sceneLabel} />
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
