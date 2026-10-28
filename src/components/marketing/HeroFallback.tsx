'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { CardData, Lang } from './content'

const COUNT = 9

/** DOM-only hero: the same cards drop onto a pile with CSS animation and feed the counter. Used when WebGL is unavailable or stalls. */
export default function HeroFallback({ cards, lang, onLand, reason, showReason }: { cards: CardData[]; lang: Lang; onLand: (price: number) => void; reason: string; showReason?: boolean }) {
  const onLandRef = useRef(onLand)
  useEffect(() => { onLandRef.current = onLand }, [onLand])
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const pile = useMemo(() => {
    const seed = { v: 7 }
    const rnd = () => { seed.v = (seed.v * 16807) % 2147483647; return seed.v / 2147483647 }
    return Array.from({ length: COUNT }, (_, i) => ({
      card: cards[i % cards.length],
      dx: (rnd() - 0.5) * 36,
      dy: (rnd() - 0.5) * 10,
      rot: (rnd() - 0.5) * 28 + (rnd() < 0.14 ? 180 : 0),
      delay: i * 0.9,
    }))
  }, [cards])

  useEffect(() => {
    if (reduced) { onLandRef.current(pile.reduce((a, p) => a + p.card.price, 0)); return }
    const timers = pile.map((p, i) => window.setTimeout(() => onLandRef.current(p.card.price), (p.delay + 1.15) * 1000 + i))
    return () => timers.forEach(clearTimeout)
  }, [pile, reduced])

  const locale = lang === 'en' ? 'en-GB' : 'cs-CZ'
  return (
    <div className="mk-fallback" data-reduced={reduced} aria-hidden="true">
      {pile.map((p, i) => (
        <div
          key={i}
          className="mk-fcard"
          style={{ ['--dx' as string]: `${p.dx}%`, ['--dy' as string]: `${p.dy}%`, ['--rot' as string]: `${p.rot}deg`, ['--delay' as string]: `${p.delay}s`, zIndex: i }}
        >
          <span className="mk-fcard-name">{p.card.name}</span>
          <span className="mk-fcard-price mono">{p.card.price.toLocaleString(locale)} Kč</span>
        </div>
      ))}
      {showReason && <p className="mk-perf">fallback: {reason}</p>}
    </div>
  )
}
