'use client'

import { useEffect, useRef } from 'react'

export default function Taxameter() {
  const heroRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const perYear = 8208
    const perSecond = perYear / 365 / 86400

    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const secondsThisYear = (now.getTime() - startOfYear.getTime()) / 1000
    const target = perSecond * secondsThisYear

    const duration = 2000
    const start = performance.now()

    function easeOut(t: number) { return 1 - Math.pow(1 - t, 3) }

    function tick(now2: number) {
      const elapsed = now2 - start
      const progress = Math.min(elapsed / duration, 1)
      const value = easeOut(progress) * target
      const rounded = Math.floor(value)
      const formatted = rounded.toLocaleString('cs-CZ')

      if (heroRef.current) heroRef.current.textContent = formatted

      const ctaEl = document.getElementById('cta-counter')
      if (ctaEl) ctaEl.textContent = formatted + ' Kč'

      if (progress < 1) {
        requestAnimationFrame(tick)
      } else {
        setInterval(() => {
          const n = new Date()
          const s = (n.getTime() - new Date(n.getFullYear(), 0, 1).getTime()) / 1000
          const v = Math.floor(perSecond * s)
          const f = v.toLocaleString('cs-CZ')
          if (heroRef.current) heroRef.current.textContent = f
          const c = document.getElementById('cta-counter')
          if (c) c.textContent = f + ' Kč'
        }, 1000)
      }
    }

    requestAnimationFrame(tick)
  }, [])

  return <span ref={heroRef} className="taxameter-num">0</span>
}
