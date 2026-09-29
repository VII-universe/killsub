'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { addSubscription, updateSubscription, SubscriptionState } from '@/app/actions/subscriptions'
import { Subscription } from './SubscriptionList'
import { CATEGORIES, suggestCategory } from '@/utils/categories'
import { markAiUsed } from '@/utils/badges'
import { getLogoUrl } from '@/utils/serviceLogos'
import ServiceLogo from './ServiceLogo'

const QUICK_SUGGESTIONS = [
  { name: 'Netflix', amount: '259', currency: 'CZK', cycle: 'monthly' },
  { name: 'Spotify', amount: '169', currency: 'CZK', cycle: 'monthly' },
  { name: 'ChatGPT Plus', amount: '20', currency: 'USD', cycle: 'monthly' },
  { name: 'iCloud+', amount: '79', currency: 'CZK', cycle: 'monthly' },
  { name: 'YouTube Premium', amount: '179', currency: 'CZK', cycle: 'monthly' },
  { name: 'Claude Pro', amount: '20', currency: 'USD', cycle: 'monthly' },
]

export default function AddSubscriptionForm({
  onClose,
  subscription,
  startInAiMode,
  onLimitReached,
  isPro = true,
  onAiLocked,
}: {
  onClose?: () => void
  subscription?: Subscription
  startInAiMode?: boolean
  onLimitReached?: () => void
  isPro?: boolean
  onAiLocked?: () => void
}) {
  const isEditing = !!subscription
  const formRef = useRef<HTMLFormElement>(null)
  const boundUpdateAction = subscription
    ? updateSubscription.bind(null, subscription.id)
    : null
  const [state, formAction, isPending] = useActionState<SubscriptionState | null, FormData>(
    isEditing ? (boundUpdateAction as typeof addSubscription) : addSubscription,
    null
  )

  const today = new Date().toISOString().split('T')[0]

  // Form input state
  const [name, setName] = useState(subscription?.name || '')
  const [amount, setAmount] = useState(subscription ? String(subscription.amount) : '')
  const [currency, setCurrency] = useState(subscription?.currency || 'CZK')
  const [billingCycle, setBillingCycle] = useState(subscription?.billing_cycle || 'monthly')
  const [nextPaymentDate, setNextPaymentDate] = useState(subscription?.next_payment_date || today)
  const [category, setCategory] = useState(subscription?.category || suggestCategory(subscription?.name || ''))
  const [logoUrl, setLogoUrl] = useState(subscription?.logo_url || '')
  const [lastUsedAt, setLastUsedAt] = useState(subscription?.last_used_at || '')
  const [manualScore, setManualScore] = useState(!!subscription?.health_score_manual)
  const [scoreValue, setScoreValue] = useState(
    subscription?.health_score ? String(subscription.health_score) : '80'
  )

  // AI Import State
  const [importText, setImportText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiSuccess, setAiSuccess] = useState<string | null>(null)
  const [isAiOpen, setIsAiOpen] = useState(!!startInAiMode)

  // Surface the Free-plan limit as an upgrade prompt instead of an inline error.
  useEffect(() => {
    if (state?.limitReached && onLimitReached) {
      onLimitReached()
    }
  }, [state, onLimitReached])

  // Reset form on success
  useEffect(() => {
    if (state?.success) {
      if (!isEditing) {
        setName('')
        setAmount('')
        setCurrency('CZK')
        setBillingCycle('monthly')
        setNextPaymentDate(today)
        setCategory('Ostatní')
        setLogoUrl('')
        setLastUsedAt('')
        setManualScore(false)
        setScoreValue('80')
      }
      setImportText('')
      setAiSuccess(null)
      setAiError(null)
      setIsAiOpen(false)
      if (onClose) {
        setTimeout(onClose, 800)
      }
    }
  }, [state, today, onClose, isEditing])

  const handleAnalyzeAI = async () => {
    if (!importText.trim()) {
      setAiError('Vložte prosím text faktury, potvrzení nebo e-mailu.')
      return
    }

    setIsAnalyzing(true)
    setAiError(null)
    setAiSuccess(null)

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: importText }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Extrakce se nezdařila.')
      }

      if (data.name) {
        setName(data.name)
        setCategory(suggestCategory(data.name))
      }
      if (data.amount !== undefined && data.amount !== null && data.amount > 0) {
        setAmount(String(data.amount))
      }
      if (data.currency) setCurrency(data.currency)
      if (data.billing_cycle) setBillingCycle(data.billing_cycle)
      if (data.next_payment_date) {
        setNextPaymentDate(data.next_payment_date)
      } else {
        setNextPaymentDate(today)
      }

      setAiSuccess('Předplatné bylo extrahováno a pole vyplněna!')
      markAiUsed()
    } catch (err: any) {
      setAiError(err.message || 'Nastala chyba při analýze textu.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const applyQuickSuggestion = (item: typeof QUICK_SUGGESTIONS[0]) => {
    setName(item.name)
    setAmount(item.amount)
    setCurrency(item.currency)
    setBillingCycle(item.cycle)
    setCategory(suggestCategory(item.name))
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-[#140c29]/95 to-[#0b0518]/95 p-5 shadow-2xl backdrop-blur-2xl transition-all">
      {/* Top accent line */}
      <div className="absolute inset-x-0 top-0 h-1 bg-[var(--accent-gradient)]" />

      {/* Header with Close option for mobile modal */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[var(--accent-primary)]/20 to-purple-500/20 border border-[var(--accent-primary)]/40 text-[var(--accent-primary)]">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
              {isEditing ? 'Upravit předplatné' : 'Přidat předplatné'}
            </h3>
            <p className="text-[11px] text-white/60">
              {isEditing ? 'Aktualizujte parametry předplatného' : 'Zadejte parametry nebo využijte AI'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Toggle Button */}
          <button
            type="button"
            onClick={() => {
              if (!isPro) {
                onAiLocked?.()
                return
              }
              setIsAiOpen(!isAiOpen)
            }}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
              isAiOpen
                ? 'bg-[var(--accent-primary)] text-white shadow-md shadow-[var(--accent-primary)]/30'
                : 'border border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
            }`}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L14.4 7.6L20 10L14.4 12.4L12 18L9.6 12.4L4 10L9.6 7.6L12 2Z" />
            </svg>
            {!isPro && <span className="text-[9px]">🔒</span>}
            <span>AI Import</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/60 hover:text-white border border-white/10"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Quick Suggestions Chips (Mobile horizontal scroll) */}
      <div className="mt-4">
        <p className="text-[10px] uppercase tracking-wider font-extrabold text-white/50 mb-2">Rychlé předvolby</p>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {QUICK_SUGGESTIONS.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => applyQuickSuggestion(item)}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white/80 whitespace-nowrap transition-all hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 hover:text-white active:scale-95"
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      {/* AI Extraction Drawer */}
      {isAiOpen && (
        <div className="mt-4 rounded-2xl border border-[var(--border-strong)] bg-gradient-to-b from-purple-950/40 to-black/60 p-4 space-y-3 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-black text-pink-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
              </span>
              Gemini 1.5 Flash Sken
            </span>
            <span className="text-[10px] font-mono font-bold text-pink-300 bg-pink-500/20 px-2 py-0.5 rounded-full">
              AUTO FILL
            </span>
          </div>

          <textarea
            rows={3}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Zkopírujte sem potvrzovací e-mail, text faktury nebo zprávu o platbě..."
            className="w-full rounded-xl border border-white/15 bg-black/60 p-3 text-xs text-white placeholder-white/40 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 transition-all"
          />

          {aiError && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/50 p-2.5 text-xs font-medium text-rose-300 flex items-center gap-2">
              <svg className="h-4 w-4 text-rose-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{aiError}</span>
            </div>
          )}

          {aiSuccess && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/50 p-2.5 text-xs font-medium text-emerald-300 flex items-center gap-2">
              <svg className="h-4 w-4 text-emerald-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{aiSuccess}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleAnalyzeAI}
            disabled={isAnalyzing || !importText.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 py-2.5 px-4 text-xs font-black text-white shadow-lg shadow-pink-500/30 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Analyzuji fakturu pomocí AI...</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4 text-pink-200" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L14.4 7.6L20 10L14.4 12.4L12 18L9.6 12.4L4 10L9.6 7.6L12 2Z" />
                </svg>
                <span>Analyzovat a vyplnit formulář</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Form Status Messages */}
      {state?.error && !state?.limitReached && (
        <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-950/50 p-3 text-xs font-semibold text-rose-300 flex items-center gap-2">
          <svg className="h-4 w-4 text-rose-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{state.error}</span>
        </div>
      )}

      {state?.success && state?.message && (
        <div className="mt-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/50 p-3 text-xs font-semibold text-emerald-300 flex items-center gap-2">
          <svg className="h-4 w-4 text-emerald-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{state.message}</span>
        </div>
      )}

      {/* Main Inputs */}
      <form ref={formRef} action={formAction} className="mt-4 space-y-4">
        <div>
          <label htmlFor="name" className="block text-xs font-bold text-white/90">
            Název služby
          </label>
          <div className="mt-1.5 flex items-center gap-3">
            {name.trim() && <ServiceLogo name={name} size={44} customLogoUrl={logoUrl || null} />}
            <input
              id="name"
              name="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="např. Netflix, Spotify, iCloud"
              className="flex-1 min-w-0 block w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs font-bold text-white placeholder-white/30 focus:border-[var(--accent-primary)] focus:bg-black/60 focus:outline-none transition-all"
            />
          </div>

          {name.trim() && !getLogoUrl(name) && (
            <div className="mt-2.5">
              <label htmlFor="logo_url" className="block text-[11px] font-bold text-white/60">
                Vlastní URL loga <span className="font-normal text-white/40">(nepovinné)</span>
              </label>
              <input
                id="logo_url"
                name="logo_url"
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1 block w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-white placeholder-white/30 focus:border-[var(--accent-primary)] focus:bg-black/60 focus:outline-none transition-all"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="amount" className="block text-xs font-bold text-white/90">
              Částka
            </label>
            <div className="relative mt-1.5">
              <input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="259"
                className="block w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 pr-14 text-xs font-black font-mono text-white placeholder-white/30 focus:border-[var(--accent-primary)] focus:bg-black/60 focus:outline-none transition-all"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                <select
                  name="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="rounded-lg border-0 bg-transparent py-1 pl-1 pr-2 text-xs font-black font-mono text-[var(--accent-primary)] focus:ring-0 cursor-pointer"
                >
                  <option value="CZK" className="bg-slate-900 text-white">CZK</option>
                  <option value="EUR" className="bg-slate-900 text-white">EUR</option>
                  <option value="USD" className="bg-slate-900 text-white">USD</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="billing_cycle" className="block text-xs font-bold text-white/90">
              Frekvence
            </label>
            <select
              id="billing_cycle"
              name="billing_cycle"
              value={billingCycle}
              onChange={(e) => setBillingCycle(e.target.value)}
              className="mt-1.5 block w-full rounded-2xl border border-white/10 bg-black/40 px-3.5 py-3 text-xs font-bold text-white focus:border-[var(--accent-primary)] focus:bg-black/60 focus:outline-none transition-all cursor-pointer"
            >
              <option value="monthly" className="bg-slate-900 text-white">Měsíčně</option>
              <option value="yearly" className="bg-slate-900 text-white">Ročně</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="next_payment_date" className="block text-xs font-bold text-white/90">
              Datum příští platby
            </label>
            <input
              id="next_payment_date"
              name="next_payment_date"
              type="date"
              value={nextPaymentDate}
              onChange={(e) => setNextPaymentDate(e.target.value)}
              className="mt-1.5 block w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs font-bold font-mono text-white placeholder-white/30 focus:border-[var(--accent-primary)] focus:bg-black/60 focus:outline-none transition-all"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-xs font-bold text-white/90">
              Kategorie
            </label>
            <select
              id="category"
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1.5 block w-full rounded-2xl border border-white/10 bg-black/40 px-3.5 py-3 text-xs font-bold text-white focus:border-[var(--accent-primary)] focus:bg-black/60 focus:outline-none transition-all cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-slate-900 text-white">
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="last_used_at" className="block text-xs font-bold text-white/90">
            Naposledy použito <span className="font-normal text-white/40">(nepovinné)</span>
          </label>
          <input
            id="last_used_at"
            name="last_used_at"
            type="date"
            value={lastUsedAt}
            max={today}
            onChange={(e) => setLastUsedAt(e.target.value)}
            className="mt-1.5 block w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs font-bold font-mono text-white placeholder-white/30 focus:border-[var(--accent-primary)] focus:bg-black/60 focus:outline-none transition-all"
          />
          <p className="mt-1 text-[10px] text-white/40">
            Ovlivňuje zdravotní skóre — pokud službu dlouho nepoužíváte, skóre postupně klesá.
          </p>
        </div>

        {/* Manual health score override */}
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3.5">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              name="health_score_manual"
              checked={manualScore}
              onChange={(e) => setManualScore(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-black/40 accent-[var(--accent-primary)]"
            />
            <span className="text-xs font-bold text-white/90">Nastavit zdravotní skóre ručně</span>
          </label>
          {manualScore && (
            <div className="mt-3">
              <input
                type="range"
                name="health_score"
                min={1}
                max={100}
                value={scoreValue}
                onChange={(e) => setScoreValue(e.target.value)}
                className="w-full accent-[var(--accent-primary)]"
              />
              <div className="mt-1 text-center text-xs font-mono font-black text-white">{scoreValue}/100</div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl theme-accent-btn py-3.5 px-4 text-xs font-black tracking-wide shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Ukládám do Killsub...</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>{isEditing ? 'Uložit změny' : 'Uložit předplatné'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  )
}
