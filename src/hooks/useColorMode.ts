'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'killsub_theme'

// Named useColorMode (not useTheme) — @/context/ThemeContext already exports a
// `useTheme()` for the 5 accent-color palettes (neon, care-blue, ...), driven by
// the `data-theme` attribute. This hook controls a separate light/dark axis via
// `data-mode`, so the two systems can't clobber each other on <html>.
export function useColorMode() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as 'dark' | 'light' | null
    if (!stored) return

    document.documentElement.setAttribute('data-mode', stored)
    const timer = setTimeout(() => setTheme(stored), 0)
    return () => clearTimeout(timer)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem(STORAGE_KEY, next)
    document.documentElement.setAttribute('data-mode', next)
  }

  return { theme, toggleTheme }
}
