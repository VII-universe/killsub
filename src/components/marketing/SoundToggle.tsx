'use client'

import { useEffect, useState } from 'react'
import { isSoundOn, setSoundOn } from './sound'

export default function SoundToggle({ label }: { label: string }) {
  const [on, setOn] = useState(false)
  useEffect(() => { const id = window.setTimeout(() => setOn(isSoundOn()), 0); return () => window.clearTimeout(id) }, [])
  return (
    <button type="button" className="mk-nav-link mono mk-sound" aria-pressed={on} onClick={() => { const n = !on; setOn(n); setSoundOn(n) }} title={label}>
      <span aria-hidden="true" className="mk-sound-bars"><i /><i /><i /></span>
      <span className="mk-sr-only">{label}</span>
    </button>
  )
}
