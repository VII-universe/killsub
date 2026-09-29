'use client'

import { useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { Subscription } from './SubscriptionList'

export default function ShareWrappedButton({ subscriptions }: { subscriptions: Subscription[] }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const { monthlyTotal, currency, topThree, count } = (() => {
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
    const topThree = [...withMonthly].sort((a, b) => b.monthly - a.monthly).slice(0, 3)

    return { monthlyTotal, currency, topThree, count: subscriptions.length }
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
    } catch (err) {
      console.error('Sdílení se nezdařilo:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  if (subscriptions.length === 0) return null

  return (
    <>
      <button
        onClick={handleShare}
        disabled={isGenerating}
        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white/80 hover:bg-white/10 disabled:opacity-50 transition-all"
        title="Sdílet jako obrázek"
      >
        {isGenerating ? (
          <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342a3 3 0 100-2.684m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        )}
        <span>Sdílet</span>
      </button>

      {/* Off-screen render target for the shareable PNG card */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden="true">
        <div
          ref={cardRef}
          className="w-[400px] p-8 flex flex-col justify-between"
          style={{
            background: 'linear-gradient(160deg, #140c29 0%, #0b0518 60%, #05010c 100%)',
            fontFamily: 'var(--font-sans, sans-serif)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' }}
            >
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            </div>
            <span className="text-white font-black text-sm tracking-tight">KILLSUB WRAPPED</span>
          </div>

          <div className="mt-8">
            <p className="text-[11px] uppercase tracking-wider font-bold" style={{ color: '#d8b4fe' }}>
              Měsíční útrata
            </p>
            <p className="text-white font-black text-4xl mt-1 font-mono">
              {monthlyTotal.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} {currency}
            </p>
            <p className="text-[11px] mt-1" style={{ color: '#d8b4fe' }}>
              napříč {count} {count === 1 ? 'předplatným' : 'předplatnými'}
            </p>
          </div>

          <div className="mt-6 space-y-2">
            <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: '#d8b4fe' }}>
              Top 3 nejdražší
            </p>
            {topThree.map((s, idx) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                <span className="text-white text-xs font-bold">
                  {idx + 1}. {s.name}
                </span>
                <span className="text-white text-xs font-mono font-black">
                  {Math.round(s.monthly).toLocaleString('cs-CZ')} {currency}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-[10px]" style={{ color: '#9333ea' }}>
            killsub.app
          </p>
        </div>
      </div>
    </>
  )
}
