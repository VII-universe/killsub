'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { Content, Lang } from './content'
import SplitFlap from './SplitFlap'

function MagneticLink({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current
    if (!el || e.pointerType !== 'mouse') return
    const r = el.getBoundingClientRect()
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
    el.style.transform = `translate(${dx * 6}px, ${dy * 6}px)`
  }
  const onLeave = () => { if (ref.current) ref.current.style.transform = '' }
  return (
    <Link ref={ref} href={href} className={className} onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
    </Link>
  )
}

export default function Hero({ c, lang }: { c: Content; lang: Lang }) {
  const [total, setTotal] = useState(0)
  useEffect(() => {
    const on = (e: Event) => setTotal((t) => t + Number((e as CustomEvent).detail || 0))
    window.addEventListener('ks:land', on)
    return () => window.removeEventListener('ks:land', on)
  }, [])
  const locale = lang === 'en' ? 'en-GB' : 'cs-CZ'
  const lines = c.hero.headline.split('\n')
  const counterLabel = c.hero.a11y.counter.replace('{value}', Math.round(total).toLocaleString(locale))

  return (
    <section className="mk-hero" aria-labelledby="mk-hero-h">
      <div className="mk-hero-grid">
        <div className="mk-hero-copy">
          <p className="mk-eyebrow mono upper mk-fade" style={{ ['--delay' as string]: '200ms' }}><span className="dot" aria-hidden="true" />{c.hero.eyebrow}</p>
          <p className="mk-counter mk-fade" style={{ ['--delay' as string]: '120ms' }}>
            <SplitFlap value={total} locale={locale} label={counterLabel} />
            <span className="mk-cur" aria-hidden="true">{c.hero.currency}</span>
          </p>
          <p className="mk-counter-label mono mk-fade" style={{ ['--delay' as string]: '300ms' }}>{c.hero.counterLabel}</p>
          <h1 id="mk-hero-h" className="mk-h1">
            {lines.map((l, i) => (
              <span className="mk-line" key={i}><span className="mk-line-in" style={{ ['--i' as string]: i }}>{l}</span></span>
            ))}
          </h1>
          <p className="mk-sub mk-fade" style={{ ['--delay' as string]: '520ms' }}>{c.hero.sub}</p>
          <div className="mk-ctas mk-fade" style={{ ['--delay' as string]: '640ms' }}>
            <MagneticLink href="/register" className="mk-btn mk-btn-primary">{c.hero.ctaPrimary}</MagneticLink>
            <Link href="/try" className="mk-btn mk-btn-ghost">{c.hero.ctaSecondary} <span className="arr" aria-hidden="true">→</span></Link>
          </div>
        </div>
      </div>
      <p className="mk-hero-note mono mk-fade" style={{ ['--delay' as string]: '900ms' }}>{c.hero.note}</p>
    </section>
  )
}
