'use client'

import { useEffect, useRef, useState } from 'react'

function Cell({ ch }: { ch: string }) {
  const [state, setState] = useState<{ cur: string; prev: string; key: number; phase: 'idle' | 'top' | 'bottom' }>({ cur: ch, prev: ch, key: 0, phase: 'idle' })
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    setState((s) => (s.cur === ch ? s : { cur: ch, prev: s.cur, key: s.key + 1, phase: 'top' }))
  }, [ch])
  const { cur, prev, key, phase } = state
  const animating = phase !== 'idle'
  return (
    <span className="flap-cell" aria-hidden="true">
      <span className="flap-half flap-top"><span>{cur}</span></span>
      <span className="flap-half flap-bottom"><span>{phase === 'top' ? prev : phase === 'bottom' ? '' : cur}</span></span>
      {animating && (
        <>
          <span
            key={`t${key}`}
            className="flap-half flap-top flap-anim-top"
            onAnimationEnd={() => setState((s) => (s.key === key && s.phase === 'top' ? { ...s, phase: 'bottom' } : s))}
          >
            <span>{prev}</span>
          </span>
          <span
            key={`b${key}`}
            className="flap-half flap-bottom flap-anim-bottom"
            onAnimationEnd={() => setState((s) => (s.key === key ? { ...s, phase: 'idle' } : s))}
          >
            <span>{cur}</span>
          </span>
        </>
      )}
    </span>
  )
}

export default function SplitFlap({ value, locale, label }: { value: number; locale: string; label: string }) {
  const text = Math.round(value).toLocaleString(locale)
  const chars = text.split('')
  // Cells are keyed by distance from the end so existing digits keep their flap state when a digit is prepended.
  return (
    <span className="flap-row" role="img" aria-label={label}>
      {chars.map((c, i) =>
        /\d/.test(c) ? <Cell key={`d${chars.length - i}`} ch={c} /> : <span key={`s${chars.length - i}`} className="flap-sep" aria-hidden="true" />
      )}
    </span>
  )
}
