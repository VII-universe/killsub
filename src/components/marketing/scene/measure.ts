import type { PileTarget } from './journey'

/** Pile centre in NDC, from where the hero copy actually is. Shared by the standalone boot and the React component. */
export function measurePileTarget(canvas: HTMLCanvasElement): PileTarget | null {
  const hero = document.querySelector('.mk-hero')
  const copy = hero?.querySelector<HTMLElement>('.mk-hero-copy'), ctas = hero?.querySelector<HTMLElement>('.mk-ctas'), note = hero?.querySelector<HTMLElement>('.mk-hero-note')
  if (!copy || !ctas) return null
  const c = canvas.getBoundingClientRect()
  if (c.width === 0 || c.height === 0) return null
  const r = copy.getBoundingClientRect()
  const portrait = c.width / c.height < 0.9
  let cx: number, cy: number
  if (portrait) {
    const top = ctas.getBoundingClientRect().bottom + 12, bottom = (note?.getBoundingClientRect().top ?? c.bottom) - 8
    cx = c.left + c.width / 2; cy = (top + bottom) / 2 + (bottom - top) * 0.05
  } else {
    const left = r.right + 32
    cx = (left + c.right) / 2 - (c.right - left) * 0.04; cy = c.top + c.height * 0.64
  }
  return { x: ((cx - c.left) / c.width) * 2 - 1, y: -((cy - c.top) / c.height) * 2 + 1 }
}
