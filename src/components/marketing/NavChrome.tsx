'use client'

import { useEffect } from 'react'

/** Marks the fixed nav as scrolled (gets a backdrop) once the hero's top is gone. Renders nothing. */
export default function NavChrome() {
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>('.mk-nav')
    if (!nav) return
    const update = () => { nav.dataset.scrolled = window.scrollY > 24 ? 'true' : 'false' }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  return null
}
