'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { toPng } from 'html-to-image'
import { Subscription } from './SubscriptionList'

const MONTH_LABELS = ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čer', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro']

function monthlyAmount(sub: Subscription): number {
  const amt = Number(sub.amount) || 0
  return sub.billing_cycle === 'yearly' ? amt / 12 : amt
}

function annualAmount(sub: Subscription): number {
  return monthlyAmount(sub) * 12
}

function categoryIcon(category: string): string {
  const c = category.toLowerCase()
  if (c.includes('ai') || c.includes('umělá')) return '🤖'
  if (c.includes('stream')) return '📺'
  if (c.includes('hudba') || c.includes('music')) return '🎵'
  if (c.includes('cloud') || c.includes('úlož')) return '☁️'
  if (c.includes('gam') || c.includes('hry')) return '🎮'
  return '📦'
}

function wasActiveInMonth(sub: Subscription, year: number, monthIndex: number): boolean {
  if (!sub.created_at) return true
  const created = new Date(sub.created_at)
  const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59)
  return created <= monthEnd
}

function formatKc(n: number): string {
  return `${Math.round(n).toLocaleString('cs-CZ')} Kč`
}

export default function WrappedView({ subscriptions }: { subscriptions: Subscription[] }) {
  const year = new Date().getFullYear()
  const currentMonthIndex = new Date().getMonth()
  const shareCardRef = useRef<HTMLDivElement>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const activeCount = subscriptions.length
  const cancelledCount = 0 // Killsub doesn't currently retain cancelled/deleted subscriptions

  const totalYear = subscriptions.reduce((sum, s) => sum + annualAmount(s), 0)
  const monthlyAvg = totalYear / 12

  const byCategory = Object.entries(
    subscriptions.reduce<Record<string, number>>((acc, s) => {
      const cat = s.category || 'Ostatní'
      acc[cat] = (acc[cat] || 0) + annualAmount(s)
      return acc
    }, {})
  )
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  const topSubscriptions = [...subscriptions]
    .map((s) => ({ ...s, annual: annualAmount(s) }))
    .sort((a, b) => b.annual - a.annual)
    .slice(0, 5)

  const byMonth = Array.from({ length: 12 }, (_, m) =>
    subscriptions.filter((s) => wasActiveInMonth(s, year, m)).reduce((sum, s) => sum + monthlyAmount(s), 0)
  )

  const topCategory = byCategory[0]
  const maxCategoryAmount = byCategory[0]?.amount || 1
  const maxMonthAmount = Math.max(...byMonth, 1)

  const handleShare = async () => {
    const shareData = {
      title: `Killsub Wrapped ${year}`,
      text: `Za rok ${year} jsem utratil ${formatKc(totalYear)} za předplatná.`,
      url: typeof window !== 'undefined' ? window.location.href : '',
    }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareData.url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // user cancelled the share sheet — not an error
    }
  }

  const handleSaveImage = async () => {
    if (!shareCardRef.current) return
    setIsSaving(true)
    try {
      const dataUrl = await toPng(shareCardRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: '#0d0a1a' })
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `killsub-wrapped-${year}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Uložení obrázku se nezdařilo:', err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col text-white pb-24">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-2xl px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link
            href="/dashboard"
            className="flex flex-shrink-0 items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: '#13151f',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#e8eaf0',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 3L5 8L10 13" />
            </svg>
          </Link>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#e8eaf0' }}>Tvůj rok v číslech</h1>
            <p style={{ fontSize: 12, fontWeight: 500, color: '#8b6fff', marginTop: 2 }}>Killsub Wrapped {year}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5 space-y-6">
        {activeCount === 0 ? (
          <div
            className="flex flex-col items-center text-center"
            style={{ minHeight: '60vh', justifyContent: 'center' }}
          >
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 88,
                height: 88,
                background: 'linear-gradient(135deg, rgba(108,71,255,0.25), rgba(61,155,255,0.15))',
                border: '1px solid rgba(108,71,255,0.3)',
              }}
            >
              <span style={{ fontSize: 36 }}>🎁</span>
            </div>
            <h2 className="mt-5" style={{ fontSize: 18, fontWeight: 700, color: '#e8eaf0' }}>
              Zatím nemáš co shrnout
            </h2>
            <p className="mt-2" style={{ fontSize: 13, color: '#8b8fa8', lineHeight: 1.5 }}>
              Přidej svá předplatná a příští rok pro tebe připravíme Wrapped.
            </p>
            <Link
              href="/dashboard"
              className="mt-5 inline-flex items-center justify-center text-white"
              style={{
                background: 'linear-gradient(135deg, #6c47ff, #3d9bff)',
                borderRadius: 12,
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Přejít na dashboard
            </Link>
          </div>
        ) : (
          <>
            {/* Share card */}
            <div
              id="shareCard"
              ref={shareCardRef}
              className="wrapped-card relative overflow-hidden"
              style={{ background: '#0d0a1a', borderRadius: 24, padding: 24, border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="wrapped-blob-purple" />
              <div className="wrapped-blob-blue" />
              <div className="wrapped-blob-pink" />

              <div className="relative">
                <div className="flex items-center gap-1.5 w-fit" style={{
                  background: 'rgba(108,71,255,0.2)',
                  border: '1px solid rgba(108,71,255,0.4)',
                  borderRadius: 100,
                  padding: '5px 12px',
                }}>
                  <span className="wrapped-pulse-dot" />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa' }}>Killsub Wrapped {year}</span>
                </div>

                <p className="mt-5" style={{ fontSize: 11, fontWeight: 600, color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Celková útrata za rok
                </p>
                <p
                  className="wrapped-gradient-text"
                  style={{ fontSize: 52, fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.1, marginTop: 4 }}
                >
                  {formatKc(totalYear)}
                </p>
                <p style={{ fontSize: 13, color: '#8b8fa8', marginTop: 4 }}>
                  leden – prosinec {year} · {activeCount} předplatných
                </p>

                {activeCount < 3 && (
                  <p className="mt-2" style={{ fontSize: 11, color: '#f59e0b' }}>
                    Přidej více předplatných pro kompletní přehled
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2 mt-5">
                  <div className="wrapped-tile">
                    <p style={{ fontSize: 20, fontWeight: 800, color: '#e8eaf0' }}>{activeCount}</p>
                    <p style={{ fontSize: 10, color: '#8b8fa8', marginTop: 2 }}>aktivních předplatných</p>
                  </div>
                  <div className="wrapped-tile">
                    <p style={{ fontSize: 20, fontWeight: 800, color: '#e8eaf0' }}>{formatKc(monthlyAvg)}</p>
                    <p style={{ fontSize: 10, color: '#8b8fa8', marginTop: 2 }}>průměrně / měsíc</p>
                  </div>
                  <div className="wrapped-tile">
                    <p style={{ fontSize: 20, fontWeight: 800, color: '#e8eaf0' }}>{cancelledCount}</p>
                    <p style={{ fontSize: 10, color: '#8b8fa8', marginTop: 2 }}>zrušená letos</p>
                  </div>
                </div>

                {topCategory && (
                  <div
                    className="flex items-center gap-3 mt-3"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 14,
                      padding: 14,
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{categoryIcon(topCategory.category)}</span>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 10, color: '#8b8fa8' }}>Největší kategorie</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#e8eaf0' }}>{topCategory.category}</p>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#e8eaf0' }}>{formatKc(topCategory.amount)}</span>
                  </div>
                )}

                <div
                  className="flex items-center justify-between mt-5 pt-4"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 7,
                        background: 'linear-gradient(135deg, #6c47ff, #3d9bff)',
                      }}
                    />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#e8eaf0' }}>killsub.app</span>
                  </div>
                  <span style={{ fontSize: 11, color: '#8b8fa8' }}>killsub.vercel.app/wrapped</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleShare}
                className="save-cta-btn w-full text-white active:scale-[0.98] transition-transform"
                style={{
                  background: 'linear-gradient(135deg, #6c47ff, #3d9bff)',
                  borderRadius: 14,
                  padding: 16,
                  fontSize: 15,
                  fontWeight: 700,
                  boxShadow: '0 4px 24px rgba(108,71,255,0.4)',
                }}
              >
                {copied ? 'Odkaz zkopírován ✓' : 'Sdílet Wrapped'}
              </button>
              <button
                type="button"
                onClick={handleSaveImage}
                disabled={isSaving}
                className="w-full text-center disabled:cursor-not-allowed"
                style={{
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'transparent',
                  color: '#e8eaf0',
                  borderRadius: 14,
                  padding: 15,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {isSaving ? 'Ukládám…' : 'Uložit jako obrázek'}
              </button>
            </div>

            {/* Category breakdown */}
            {byCategory.length > 0 && (
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#e8eaf0', marginBottom: 12 }}>
                  Výdaje podle kategorie
                </h2>
                <div className="flex flex-col gap-2.5">
                  {byCategory.map((c) => (
                    <div key={c.category} className="flex items-center gap-3">
                      <span
                        className="flex-shrink-0 truncate"
                        style={{ width: 90, fontSize: 12, fontWeight: 600, color: '#e8eaf0' }}
                      >
                        {c.category}
                      </span>
                      <div
                        className="flex-1"
                        style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.max((c.amount / maxCategoryAmount) * 100, 4)}%`,
                            background: 'linear-gradient(90deg, #6c47ff, #3d9bff)',
                            borderRadius: 999,
                          }}
                        />
                      </div>
                      <span
                        className="flex-shrink-0 text-right"
                        style={{ width: 70, fontSize: 12, fontWeight: 600, color: '#8b8fa8' }}
                      >
                        {formatKc(c.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly bar chart */}
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#e8eaf0', marginBottom: 12 }}>Měsíčně</h2>
              <div className="flex items-end gap-1.5" style={{ height: 64 }}>
                {byMonth.map((amount, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-end" style={{ height: '100%' }}>
                    <div
                      style={{
                        width: '100%',
                        height: `${Math.max((amount / maxMonthAmount) * 100, 3)}%`,
                        borderRadius: '4px 4px 0 0',
                        background: 'linear-gradient(180deg, #6c47ff, #3d9bff)',
                        opacity: idx === currentMonthIndex ? 1 : 0.6,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 mt-2">
                {MONTH_LABELS.map((label) => (
                  <span key={label} className="flex-1 text-center" style={{ fontSize: 9, color: '#8b8fa8' }}>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Top subscriptions */}
            {topSubscriptions.length > 0 && (
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#e8eaf0', marginBottom: 12 }}>Největší výdaje</h2>
                <div className="flex flex-col gap-2">
                  {topSubscriptions.map((sub, idx) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-3"
                      style={{
                        background: '#13151f',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 12,
                        padding: '12px 14px',
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#5a5e72', width: 24 }}>#{idx + 1}</span>
                      <span className="flex-1 truncate" style={{ fontSize: 14, fontWeight: 600, color: '#e8eaf0' }}>
                        {sub.name}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#e8eaf0' }}>{formatKc(sub.annual)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
