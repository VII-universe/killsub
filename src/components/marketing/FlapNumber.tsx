'use client'

import { useEffect, useRef, useState } from 'react'
import SplitFlap from './SplitFlap'


/** A split-flap number that counts from 0 to `value` as it scrolls into view. */
export default function FlapNumber({ value, locale, label }: { value: number; locale: string; label: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let cleanup: (() => void) | null = null
    let cancelled = false
    import('./reveal').then(({ scrubProgress }) => { if (!cancelled) cleanup = scrubProgress(el, (p) => setShown(Math.round(value * (1 - Math.pow(1 - p, 3))))) })
    return () => { cancelled = true; cleanup?.() }
  }, [value])
  return <span ref={ref}><SplitFlap value={shown} locale={locale} label={label} /></span>
}
