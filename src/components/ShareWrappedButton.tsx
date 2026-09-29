'use client'

import { useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { Subscription } from './SubscriptionList'
import ServiceLogo from './ServiceLogo'

export default function ShareWrappedButton({
  subscriptions,
  variant = 'compact',
}: {
  subscriptions: Subscription[]
  variant?: 'compact' | 'prominent'
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [mode, setMode] = useState<'monthly' | 'yearly'>('monthly')

  const { monthlyTotal, yearlyTotal, currency, topThree, count, biggestSingle } = (() => {
    const currencyCounts: Record<string, number> = {}
    subscriptions.forEach((s) => {
      currencyCounts[s.currency] = (currencyCounts[s.currency] || 0) + 1
    })
    const currency = Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'CZK'

    const inCurrency = subscriptions.filter((s) => s.currency === currency)
    const withMonthly = inCurrency.map((s) => ({
      ...s,
      monthly: s.billing_cycle === 'yearly' ? s.amount / 12 : s.amount,
    }))
    const monthlyTotal = withMonthly.reduce((sum, s) => sum + s.monthly, 0)
    const yearlyTotal = monthlyTotal * 12
    const topThree = [...withMonthly].sort((a, b) => b.monthly - a.monthly).slice(0, 3)
    const biggestSingle = topThree[0] || null

    return { monthlyTotal, yearlyTotal, currency, topThree, count: subscriptions.length, biggestSingle }
  })()

  const handleShare = async () => {
    if (!cardRef.current) return
    setIsGenerating(true)
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true })
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], 'killsub-wrapped.png', { type: 'image/png' })

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Moje Killsub Wrapped',
          text: 'Podívejte se na přehled mých předplatných v Killsub!',
        })
      } else {
        const link = document.createElement('a')
        link.href = dataUrl
        link.download = 'killsub-wrapped.png'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
      setIsPreviewOpen(false)
    } catch (err) {
      console.error('Sdílení se nezdařilo:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  if (subscriptions.length === 0) return null

  const primaryAmount = mode === 'monthly' ? monthlyTotal : yearlyTotal

  const wrappedCard = (
    <div
      ref={cardRef}
      className="w-full flex flex-col"
      style={{
        maxWidth: 380,
        background: '#0f0a1a',
        border: '1px solid rgba(168,85,247,0.3)',
        borderRadius: 24,
        padding: 28,
      }}
    >
      {/* Header */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
          Killsub
        </p>
        <p style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginTop: 6 }}>
          Můj rok v předplatných
        </p>
      </div>

      {/* Stats grid 2x2 */}
      <div className="grid grid-cols-2 gap-2.5" style={{ marginTop: 20 }}>
        <div style={{ padding: 14, background: 'rgba(255,255,255,0.05)', borderRadius: 12 }}>
          <p style={{ fontSize: 24, fontWeight: 800, color: '#6c47ff' }}>{count}</p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>
            Aktivní služby
          </p>
        </div>
        <div style={{ padding: 14, background: 'rgba(255,255,255,0.05)', borderRadius: 12 }}>
          <p style={{ fontSize: 24, fontWeight: 800, color: '#3d9bff' }}>
            {Math.round(primaryAmount).toLocaleString('cs-CZ')} {currency}
          </p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>
            {mode === 'monthly' ? 'Měsíční útrata' : 'Roční útrata'}
          </p>
        </div>
        <div style={{ padding: 14, background: 'rgba(255,255,255,0.05)', borderRadius: 12 }}>
          <p style={{ fontSize: 24, fontWeight: 800, color: '#a855f7' }} className="truncate">
            {biggestSingle?.name || '—'}
          </p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>
            Nejvyšší útrata
          </p>
        </div>
        <div style={{ padding: 14, background: 'rgba(255,255,255,0.05)', borderRadius: 12 }}>
          <p style={{ fontSize: 24, fontWeight: 800, color: '#22c55e' }}>0 {currency}</p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>
            Ušetřeno zrušením
          </p>
        </div>
      </div>

      {/* Top 3 services */}
      {topThree.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Top služby
          </p>
          <div className="flex items-center" style={{ gap: 14 }}>
            {topThree.map((s) => (
              <div key={s.id} className="flex flex-col items-center" style={{ gap: 5, maxWidth: 72 }}>
                <ServiceLogo name={s.name} size={28} customLogoUrl={s.logo_url} />
                <span className="truncate w-full text-center" style={{ fontSize: 12, fontWeight: 600, color: '#e8eaf0' }}>
                  {s.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 24 }}>
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.4), transparent)' }} />
        <p className="text-center" style={{ marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.08em' }}>
          killsub.app
        </p>
      </div>
    </div>
  )

  return (
    <>
      {variant === 'prominent' ? (
        <div className="space-y-2.5">
          <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-0.5 text-xs w-fit mx-auto">
            <button
              onClick={() => setMode('monthly')}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                mode === 'monthly' ? 'bg-white/15 text-white shadow-sm' : 'text-white/60 hover:text-white'
              }`}
            >
              Měsíční přehled
            </button>
            <button
              onClick={() => setMode('yearly')}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                mode === 'yearly' ? 'bg-white/15 text-white shadow-sm' : 'text-white/60 hover:text-white'
              }`}
            >
              Roční Wrapped
            </button>
          </div>

          <button
            onClick={() => setIsPreviewOpen(true)}
            className="relative overflow-hidden flex w-full items-center justify-center gap-2.5 rounded-3xl bg-gradient-to-r from-pink-500 via-[var(--accent-primary)] to-purple-600 py-3.5 px-5 text-sm font-black text-white shadow-xl shadow-[var(--accent-primary)]/30 hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <span
              className="animate-hero-shimmer pointer-events-none absolute inset-y-0 bg-white"
              style={{ width: 60, opacity: 0.12 }}
            />
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342a3 3 0 100-2.684m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>Sdílet svůj Killsub Wrapped ✨</span>
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsPreviewOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white/80 hover:bg-white/10 transition-all"
          title="Sdílet jako obrázek"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342a3 3 0 100-2.684m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span>Sdílet</span>
        </button>
      )}

      {/* Preview modal — shows exactly what will be shared, before sharing it */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="fixed inset-0" onClick={() => setIsPreviewOpen(false)} />
          <div className="relative z-10 w-full max-w-sm flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            {wrappedCard}

            <div className="mt-5 w-full space-y-2.5">
              <button
                onClick={handleShare}
                disabled={isGenerating}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 via-[var(--accent-primary)] to-purple-600 py-3 px-5 text-sm font-black text-white shadow-xl active:scale-[0.98] disabled:opacity-50 transition-all"
              >
                {isGenerating ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Generuji...</span>
                  </>
                ) : (
                  <span>Sdílet</span>
                )}
              </button>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="flex w-full items-center justify-center rounded-2xl border border-white/15 bg-white/5 py-3 px-5 text-sm font-bold text-white/70 hover:bg-white/10 transition-all"
              >
                Zavřít
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
