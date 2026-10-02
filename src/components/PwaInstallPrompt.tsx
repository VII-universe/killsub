'use client'

import { useEffect, useState } from 'react'

const VISIT_KEY = 'killsub-dashboard-visits'
const DISMISSED_KEY = 'killsub-pwa-banner-dismissed'
const VISITS_BEFORE_PROMPT = 2

export default function PwaInstallPrompt() {
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)

    let shouldShow = false
    try {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const dismissed = localStorage.getItem(DISMISSED_KEY) === '1'

      if (!isStandalone && !dismissed) {
        const visits = Number(localStorage.getItem(VISIT_KEY) || '0') + 1
        localStorage.setItem(VISIT_KEY, String(visits))
        shouldShow = visits >= VISITS_BEFORE_PROMPT
      }
    } catch {
      // ignore — localStorage can throw in private browsing
    }

    const timer = shouldShow ? setTimeout(() => setShow(true), 0) : null

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      if (timer) clearTimeout(timer)
    }
  }, [])

  const handleInstall = async () => {
    const promptEvent = deferredPrompt as (Event & { prompt: () => void }) | null
    if (promptEvent?.prompt) {
      promptEvent.prompt()
    }
    dismiss()
  }

  const dismiss = () => {
    setShow(false)
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // ignore
    }
  }

  if (!show) return null

  return (
    <div className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom,0px)+112px)] z-40 rounded-2xl border border-white/10 bg-[#0f0a1a]/95 backdrop-blur-xl p-4 shadow-2xl shadow-black/40 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 font-black text-white">
          K
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">Nainstaluj Killsub na domovskou obrazovku</p>
          <p className="mt-0.5 text-xs text-white/60">Rychlejší přístup, funguje i offline.</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={dismiss}
          className="flex-1 rounded-xl border border-white/10 py-2 text-xs font-semibold text-white/70"
        >
          Teď ne
        </button>
        <button
          type="button"
          onClick={handleInstall}
          className="flex-1 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 py-2 text-xs font-bold text-white"
        >
          Nainstalovat
        </button>
      </div>
    </div>
  )
}
