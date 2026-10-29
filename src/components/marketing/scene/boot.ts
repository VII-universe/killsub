// Standalone entry (bundled by scripts/build-scene.mjs into public/scene/boot.js). Boots the hero scene on the
// server-rendered canvas as soon as the HTML is parsed, long before React hydrates; React then adopts the handle.
import { createJourney, type JourneyHandle } from './journey'
import { measurePileTarget } from './measure'
import type { CardData } from '../content'

type Config = { cards: CardData[]; lang: 'cs' | 'en'; wrapped?: Parameters<typeof createJourney>[1]['wrapped'] }
type Shared = { handle: JourneyHandle | null; landed: number; ready: boolean; failed: string | null; promise: Promise<JourneyHandle | null> | null }

const w = window as Window & { __ksScene?: Shared }
const shared: Shared = (w.__ksScene ||= { handle: null, landed: 0, ready: false, failed: null, promise: null })

// Constant-time check: creating a throwaway WebGL2 context costs a second GPU context (seconds on slow phones).
// If the real renderer then fails, createJourney rejects and the DOM fallback stays.
function supportsWebGL2() { return typeof window !== 'undefined' && 'WebGL2RenderingContext' in window }

function boot() {
  if (shared.promise) return
  const holder = document.querySelector<HTMLElement>('.mk-journey')
  const canvas = holder?.querySelector('canvas')
  const cfgEl = document.getElementById('ks-scene-config')
  if (!holder || !canvas || !cfgEl) return
  const q = new URLSearchParams(location.search)
  if (!supportsWebGL2() || q.get('fallback') === '1') { shared.failed = 'no webgl2'; return }
  let cfg: Config
  try { cfg = JSON.parse(cfgEl.textContent || '{}') } catch { return }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const start = () => createJourney(canvas, {
    cards: cfg.cards, lang: cfg.lang, wrapped: cfg.wrapped, reducedMotion: reduced,
    onLand: (p) => { shared.landed += p; window.dispatchEvent(new CustomEvent('ks:land', { detail: p })) },
    onFirstFrame: () => { shared.ready = true; holder.dataset.ready = 'true' },
    getPileTarget: () => measurePileTarget(canvas),
    seed: q.get('seed') ? Number(q.get('seed')) : undefined,
    debug: q.get('debug') === '1',
    noAdapt: q.get('noadapt') === '1',
  })
  // Mobile: the WebGL context and shader compile are the most expensive work on the page, so they wait for the load
  // event and idle time; the CSS fallback cards fall meanwhile. Desktop starts immediately.
  const mobile = matchMedia('(hover: none) and (pointer: coarse)').matches || innerWidth < 900
  const whenReady = mobile
    ? new Promise<void>((resolve) => {
        const idle = () => {
          const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
          if (ric) ric(() => resolve(), { timeout: 1500 }); else setTimeout(resolve, 200)
        }
        if (document.readyState === 'complete') idle(); else addEventListener('load', idle, { once: true })
      })
    : Promise.resolve()
  // The promise exists synchronously, so React adopts this scene instead of starting its own.
  shared.promise = whenReady.then(start).then((h) => { shared.handle = h; return h }).catch((e) => { shared.failed = String(e?.message || e); console.error('[scene boot]', e); return null })
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
else boot()
