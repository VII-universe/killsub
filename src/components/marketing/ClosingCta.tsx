'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { playKlap } from './sound'

/** "Zjistit, kolik odtéká": the last card drops into the drain, then the registration opens. */
export default function ClosingCta({ label }: { label: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLAnchorElement>(null)
  const onClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return
    e.preventDefault()
    if (busy) return
    setBusy(true)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.dispatchEvent(new CustomEvent('ks:drop'))
    window.setTimeout(() => playKlap(0.25), 560)
    router.prefetch('/register')
    window.setTimeout(() => router.push('/register'), reduced ? 0 : 780)
  }
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current
    if (!el || e.pointerType !== 'mouse') return
    const r = el.getBoundingClientRect()
    el.style.transform = `translate(${((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * 6}px, ${((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * 6}px)`
  }
  return (
    <a ref={ref} href="/register" className="mk-btn mk-btn-primary" onClick={onClick} onPointerMove={onMove} onPointerLeave={() => { if (ref.current) ref.current.style.transform = '' }} aria-busy={busy}>
      {label}
    </a>
  )
}
