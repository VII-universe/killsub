'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type ThemeId = 'neon' | 'care-blue' | 'luxury-matte' | 'vibrant-cyan' | 'emerald'

export interface ThemeOption {
  id: ThemeId
  name: string
  desc: string
  color: string
  glow: string
  icon: string
}

export const THEMES: ThemeOption[] = [
  {
    id: 'neon',
    name: 'Neon Cyber',
    desc: 'Oblíbený neonový fialovo-purpurový styl (UXDA Gold)',
    color: '#ec4899',
    glow: 'rgba(236,72,153,0.4)',
    icon: '⚡',
  },
  {
    id: 'care-blue',
    name: 'Care AI Blue',
    desc: 'Hluboká kobaltová modř s přehlednou čitelností a AI robotem',
    color: '#3b82f6',
    glow: 'rgba(59,130,246,0.4)',
    icon: '🤖',
  },
  {
    id: 'luxury-matte',
    name: 'Stealth Matte',
    desc: 'Čistý uhlíkový minimalismus s hmatatelnými kartami',
    color: '#e2e8f0',
    glow: 'rgba(255,255,255,0.2)',
    icon: '🕶️',
  },
  {
    id: 'vibrant-cyan',
    name: 'RedDot Electric',
    desc: 'Oceněný kontrastní tyrkys & energická modrá',
    color: '#06b6d4',
    glow: 'rgba(6,182,212,0.4)',
    icon: '💎',
  },
  {
    id: 'emerald',
    name: 'Emerald Wealth',
    desc: 'Luxusní smaragdové tóny s vysokou důvěrou',
    color: '#10b981',
    glow: 'rgba(16,185,129,0.4)',
    icon: '🌱',
  },
]

interface ThemeContextType {
  currentTheme: ThemeId
  setTheme: (theme: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: 'neon',
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentThemeState] = useState<ThemeId>('neon')

  useEffect(() => {
    const saved = localStorage.getItem('killsub-theme') as ThemeId
    if (saved && THEMES.some((t) => t.id === saved)) {
      setCurrentThemeState(saved)
      document.documentElement.setAttribute('data-theme', saved)
    } else {
      document.documentElement.setAttribute('data-theme', 'neon')
    }
  }, [])

  const setTheme = (theme: ThemeId) => {
    setCurrentThemeState(theme)
    localStorage.setItem('killsub-theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
