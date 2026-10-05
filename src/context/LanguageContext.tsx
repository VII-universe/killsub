'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { cs, type TranslationKey } from '@/i18n/cs'
import { en } from '@/i18n/en'

export type Lang = 'cs' | 'en'

const DICTS: Record<Lang, Record<TranslationKey, string>> = { cs, en }
const STORAGE_KEY = 'killsub_lang'

interface LanguageContextType {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'cs',
  setLang: () => {},
  t: (key) => cs[key],
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('cs')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null
    if (stored !== 'cs' && stored !== 'en') return

    const timer = setTimeout(() => setLangState(stored), 0)
    return () => clearTimeout(timer)
  }, [])

  const setLang = (next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore — localStorage can throw in private browsing
    }
  }

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      let str = DICTS[lang][key] ?? cs[key] ?? key
      if (vars) {
        for (const [varKey, value] of Object.entries(vars)) {
          str = str.replace(`{${varKey}}`, String(value))
        }
      }
      return str
    },
    [lang]
  )

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  return useContext(LanguageContext)
}
