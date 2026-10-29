// Standalone entry (bundled by scripts/build-scene.mjs into public/scene/boot.js). Boots the hero scene on the
// server-rendered canvas as soon as the HTML is parsed, long before React hydrates; React then adopts the handle.
import { createJourney, type JourneyHandle } from './journey'
import { measurePileTarget } from './measure'
import type { CardData } from '../content'

type Config = { cards: CardData[]; lang: 'cs' | 'en'; wrapped?: Parameters<typeof createJourney>[1]['wrapped'] }
type Shared = { handle: JourneyHandle | null; landed: number; ready: boolean; failed: string | null; promise: Promise<JourneyHandle | null> | null }

const w = window as Window & { __ksScene?: Shared }
const shared: Shared = (w.__ksScene ||= { handle: null, landed: 0, ready: false, failed: null, promise: null })

function supportsWebGL2() { try { return !!document.createElement('canvas').getContext('webgl2') } catch { return false } }

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
  shared.promise = createJourney(canvas, {
    cards: cfg.cards, lang: cfg.lang, wrapped: cfg.wrapped, reducedMotion: reduced,
    onLand: (p) => { shared.landed += p; window.dispatchEvent(new CustomEvent('ks:land', { detail: p })) },
    onFirstFrame: () => { shared.ready = true; holder.dataset.ready = 'true' },
    getPileTarget: () => measurePileTarget(canvas),
    seed: q.get('seed') ? Number(q.get('seed')) : undefined,
    debug: q.get('debug') === '1',
    noAdapt: q.get('noadapt') === '1',
  }).then((h) => { shared.handle = h; return h }).catch((e) => { shared.failed = String(e?.message || e); console.error('[scene boot]', e); return null })
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
else boot()
