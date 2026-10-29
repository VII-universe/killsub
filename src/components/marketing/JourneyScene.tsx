'use client'

import { useEffect, useRef, useState } from 'react'
import type { CardData, Lang, Content } from './content'
import type { JourneyHandle, PerfSample, PileTarget, ScrollState } from './scene/journey'
import HeroFallback from './HeroFallback'
import { measurePileTarget } from './scene/measure'

declare global { interface Window { __ksScene?: { handle: JourneyHandle | null; landed: number; ready: boolean; failed: string | null; promise: Promise<JourneyHandle | null> | null } } }

type Props = { cards: CardData[]; lang: Lang; sceneLabel: string; timeline: Content['timeline']; wrapped: Content['wrapped']['card'] }

function supportsWebGL2() { try { return !!document.createElement('canvas').getContext('webgl2') } catch { return false } }

function ndcOf(el: Element | null, canvas: HTMLCanvasElement, dx = 0, dy = 0): PileTarget | null {
  if (!el) return null
  const c = canvas.getBoundingClientRect(), r = el.getBoundingClientRect()
  if (c.width === 0 || c.height === 0) return null
  const cx = r.left + r.width / 2 + dx, cy = r.top + r.height / 2 + dy
  return { x: ((cx - c.left) / c.width) * 2 - 1, y: -((cy - c.top) / c.height) * 2 + 1 }
}

function progressOf(el: Element | null, vh: number, mode: 'exit' | 'sticky' | 'enter'): number {
  if (!el) return 0
  const r = el.getBoundingClientRect()
  if (mode === 'exit') return Math.min(1, Math.max(0, -r.top / r.height))                     // 0 at top, 1 when scrolled away
  if (mode === 'sticky') return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)))  // tall section with sticky content
  return Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.9)))                                     // 0 when entering, 1 when its top is near the top
}

export default function JourneyScene({ cards, lang, sceneLabel, timeline, wrapped }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [perf, setPerf] = useState<PerfSample | null>(null)
  const [perfOn, setPerfOn] = useState(false)
  const [fallback, setFallback] = useState<string | null>(null)
  const [heroMode, setHeroMode] = useState(true)
  const pushRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const [pushes, setPushes] = useState<number[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!supportsWebGL2()) { window.setTimeout(() => setFallback('no webgl2'), 0); return }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const q = new URLSearchParams(window.location.search)
    if (q.get('perf') === '1') window.setTimeout(() => setPerfOn(true), 0)
    if (q.get('fallback') === '1') { window.setTimeout(() => setFallback('forced by ?fallback=1'), 0); return }
    let handle: JourneyHandle | null = null
    let cancelled = false, raf = 0, lastHero = true
    // The DOM fallback is in the server HTML and animates from first paint; it stays until the scene's first frame, so the hero never looks dead.
    const watchdog = 0
    canvas.addEventListener('webglcontextlost', () => { if (!cancelled) setFallback('context lost') }, { once: true })
    const land = (price: number) => window.dispatchEvent(new CustomEvent('ks:land', { detail: price }))

    const sections = () => ({
      hero: document.querySelector('.mk-hero'), tl: document.querySelector('.mk-timeline'), ov: document.querySelector('.mk-overview'),
      wr: document.querySelector('.mk-wrapped'), cl: document.querySelector('.mk-closing'),
      col: document.querySelector('.mk-column-stack'), wcard: document.querySelector('.mk-wrapped-slot'), drain: document.querySelector('.mk-closing-drain'),
    })
    let visiblePushes: number[] = []
    const measure = () => {
      raf = requestAnimationFrame(measure)
      if (!handle) return
      const vh = window.innerHeight, S = sections()
      const state: ScrollState = {
        hero: progressOf(S.hero, vh, 'exit'), timeline: progressOf(S.tl, vh, 'sticky'), timelineEnter: progressOf(S.tl, vh, 'enter'), overview: progressOf(S.ov, vh, 'enter'),
        wrapped: progressOf(S.wr, vh, 'enter'), wrappedExit: progressOf(S.wr, vh, 'exit'), closing: progressOf(S.cl, vh, 'enter'),
        columnTarget: ndcOf(S.col, canvas, 0, 30), wrappedTarget: ndcOf(S.wcard, canvas), drainTarget: ndcOf(S.drain, canvas, 0, 0),
      }
      handle.setScroll(state)
      const isHero = state.hero < 0.5
      if (isHero !== lastHero) { lastHero = isHero; setHeroMode(isHero) }
    }

    const callbacks = {
      onLand: (p: number) => land(p),
      onPerf: q.get('perf') === '1' ? setPerf : undefined,
      getPileTarget: () => measurePileTarget(canvas),
      onBackground: (hex: string) => { document.documentElement.style.setProperty('--mk-bg-live', hex) },
      onTimeline: ({ positions }: { positions: Record<number, { x: number; y: number; falling: number }> }) => {
        const keys = Object.keys(positions).map(Number)
        if (keys.length !== visiblePushes.length || keys.some((k, i) => k !== visiblePushes[i])) { visiblePushes = keys; setPushes(keys) }
        for (const k of keys) {
          const el = pushRefs.current[k]
          if (!el) continue
          const p = positions[k]
          const caught = 1 - p.falling
          el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%) translateY(${-24 - caught * 10}px)`
          el.style.opacity = String(Math.min(1, caught * 1.5))
        }
      },
    }
    // Preferred path: the standalone boot script (public/scene/boot.js) already started the scene on this canvas.
    const shared = window.__ksScene
    if (shared && (shared.promise || shared.failed)) {
      if (shared.failed) { window.setTimeout(() => setFallback(shared.failed!), 0); return }
      shared.promise!.then((h) => {
        if (cancelled || !h) { if (!h && !cancelled) setFallback(shared.failed || 'boot failed'); return }
        handle = h
        if (shared.ready) setReady(true); else { const t = window.setInterval(() => { if (shared.ready) { setReady(true); window.clearInterval(t) } }, 100); window.setTimeout(() => window.clearInterval(t), 20000) }
        h.setCallbacks({ ...callbacks, onLand: (p) => { shared.landed += p; land(p) } })
        h.relayout()
        raf = requestAnimationFrame(measure)
      })
      return () => { cancelled = true; cancelAnimationFrame(raf); handle?.setCallbacks({ onTimeline: undefined, onPerf: undefined }) }
    }

    const start = () => {
      import('./scene/journey').then(async ({ createJourney }) => {
        if (cancelled) return
        handle = await createJourney(canvas, {
          cards, lang, reducedMotion: reduced,
          ...callbacks,
          onFirstFrame: () => { setReady(true) },
          wrapped,
          noAdapt: q.get('noadapt') === '1',
          seed: q.get('seed') ? Number(q.get('seed')) : undefined,
          debug: q.get('debug') === '1',
        })
        if (cancelled) { handle.dispose(); return }
        raf = requestAnimationFrame(measure)
      }).catch((err) => { console.error('[journey] scene failed', err); setFallback(String(err?.message || err)) })
    }
    // The text is server-rendered and painted already; fetch the scene right away so the first card lands within ~3 s on 4G.
    const id = window.setTimeout(start, 0)
    return () => {
      cancelled = true
      window.clearTimeout(id)
      void watchdog; cancelAnimationFrame(raf); handle?.dispose()
    }
  }, [cards, lang, wrapped])

  const locale = lang === 'en' ? 'en-GB' : 'cs-CZ'
  return (
    <div className="mk-journey" data-ready={ready && !fallback} data-forced={!!fallback} data-hero={heroMode}>
      <script id="ks-scene-config" type="application/json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ cards, lang, wrapped }).replace(/</g, '\\u003c') }} />
      <canvas ref={canvasRef} role="img" aria-label={sceneLabel} hidden={!!fallback} />
      <div className="mk-journey-fallback"><HeroFallback cards={cards} lang={lang} onLand={(p) => window.dispatchEvent(new CustomEvent('ks:land', { detail: p }))} reason={fallback || ''} showReason={perfOn && !!fallback} /></div>
      <div className="mk-journey-pushes" aria-hidden="true">
        {pushes.map((ci) => {
          const card = cards[ci]
          const date = lang === 'en' ? `${card.day} Nov` : `${card.day}. 11.`
          return (
            <div key={ci} ref={(el) => { pushRefs.current[ci] = el }} className="mk-push mk-push-float">
              <span className="mk-push-app"><span className="mk-push-icon" />{timeline.push.app}<span className="mk-push-when mono">{timeline.push.when}</span></span>
              <span className="mk-push-title">⏰ {card.name} {lang === 'en' ? 'renews in a week' : 'se obnovuje za týden'}</span>
              <span className="mk-push-body">{lang === 'en' ? `On ${date} you'll be charged ${card.price.toLocaleString(locale)} Kč. Keep it?` : `Dne ${date} ti strhnou ${card.price.toLocaleString(locale)} Kč. Chceš pokračovat?`}</span>
            </div>
          )
        })}
      </div>
      {perfOn && perf && (
        <div className="mk-perf" aria-live="off">{perf.text}<br /><button type="button" onClick={() => navigator.clipboard?.writeText(perf.text)}>copy</button></div>
      )}
    </div>
  )
}
