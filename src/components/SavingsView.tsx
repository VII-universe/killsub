'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Subscription } from './SubscriptionList'
import {
  AiUseCase,
  GamingHabit,
  HouseholdSize,
  MusicHabit,
  QUIZ_STORAGE_KEY,
  QuizAnswers,
  RecommendationType,
  SavingsRecommendation,
  StreamingFrequency,
  UtilizationLevel,
  getEfficiencyScore,
  getSavingsRecommendations,
  getTotalMonthlySavings,
  hasStreamingSubscription,
  isQuizAnswers,
} from '@/utils/savingsRecommendations'
import {
  cacheReminderLocally,
  clearReminderCacheLocally,
  createReminder,
  isReminderCachedLocally,
} from '@/utils/reminders'

type Phase = 'quiz' | 'analysis' | 'results'
type StepId = 'streaming' | 'household' | 'ai' | 'music' | 'gaming' | 'utilization'

const STREAMING_OPTIONS: { value: StreamingFrequency; label: string }[] = [
  { value: 'daily', label: '📺 Každý den nebo skoro' },
  { value: 'weekly', label: '📅 Několikrát týdně' },
  { value: 'monthly', label: '🗓️ Pár dní v měsíci' },
  { value: 'rarely', label: '😴 Skoro vůbec' },
]

const HOUSEHOLD_OPTIONS: { value: HouseholdSize; label: string }[] = [
  { value: 'solo', label: '🧍 Používám sám' },
  { value: 'couple', label: '👫 S partnerem (2 osoby)' },
  { value: 'family', label: '👨‍👩‍👧 S rodinou (3+ osob)' },
  { value: 'shared', label: '🔗 Sdílím s přáteli mimo domácnost' },
]

const AI_OPTIONS: { value: AiUseCase; label: string }[] = [
  { value: 'writing', label: '✍️ Psaní textů a e-mailů' },
  { value: 'coding', label: '💻 Programování a kód' },
  { value: 'images', label: '🎨 Tvorba obrázků' },
  { value: 'data', label: '📊 Analýza dat a dokumentů' },
  { value: 'research', label: '💬 Obecné dotazy a research' },
  { value: 'none', label: '🚫 AI nepoužívám' },
]

const MUSIC_OPTIONS: { value: MusicHabit; label: string }[] = [
  { value: 'solo', label: '🎧 Sám, přes sluchátka nebo reproduktor' },
  { value: 'shared', label: '👨‍👩‍👧 V domácnosti spolu s ostatními' },
  { value: 'car', label: '🚗 Hlavně v autě' },
  { value: 'free', label: '📻 Neplatím za hudbu (YouTube / rádio)' },
]

const GAMING_OPTIONS: { value: GamingHabit; label: string }[] = [
  { value: 'regular', label: '🎮 Ano, pravidelně (PC nebo konzole)' },
  { value: 'mobile', label: '📱 Jen mobilní hry' },
  { value: 'casual', label: '🕹️ Občas, ale nejsem hráč' },
  { value: 'none', label: '❌ Vůbec ne' },
]

const UTILIZATION_OPTIONS: { value: UtilizationLevel; label: string }[] = [
  { value: 'high', label: '🔥 Využívám hodně' },
  { value: 'medium', label: '😐 Tak napůl' },
  { value: 'low', label: '💤 Skoro vůbec' },
]

const TYPE_CHIP: Record<RecommendationType, { label: string; color: string; bg: string }> = {
  cancel: { label: '🚫 Zrušit', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  downgrade: { label: '⬇️ Downgradovat', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  merge: { label: '🔄 Sloučit', color: '#3d9bff', bg: 'rgba(61,155,255,0.15)' },
  tip: { label: '💡 Tip', color: '#8b6fff', bg: 'rgba(139,111,255,0.15)' },
}

const STRIPE_COLOR: Record<RecommendationType, string> = {
  cancel: '#ef4444',
  downgrade: '#f59e0b',
  merge: '#3d9bff',
  tip: '#22c55e',
}

function loadStoredAnswers(): QuizAnswers | null {
  try {
    const raw = localStorage.getItem(QUIZ_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return isQuizAnswers(parsed) ? parsed : null
  } catch {
    return null
  }
}

function monthlyAmount(sub: Subscription): number {
  const amt = Number(sub.amount) || 0
  return sub.billing_cycle === 'yearly' ? amt / 12 : amt
}

function OptionButton({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`save-option flex items-center justify-between text-left ${selected ? 'save-option-selected' : ''}`}
      style={{
        background: selected ? 'rgba(108,71,255,0.12)' : '#1a1d27',
        border: `1px solid ${selected ? '#6c47ff' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: selected ? '0 0 0 1px rgba(108,71,255,0.25)' : 'none',
        borderRadius: 12,
        padding: '14px 16px',
        color: '#e8eaf0',
        fontSize: 14,
        fontWeight: 500,
      }}
    >
      <span>{label}</span>
      <span
        className="flex flex-shrink-0 items-center justify-center rounded-full"
        style={{
          width: 22,
          height: 22,
          border: selected ? 'none' : '2px solid rgba(255,255,255,0.14)',
          background: selected ? '#6c47ff' : 'transparent',
        }}
      >
        {selected && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
    </button>
  )
}

function QuizFlow({
  subscriptions,
  initialAnswers,
  onComplete,
  onExit,
}: {
  subscriptions: Subscription[]
  initialAnswers: Partial<QuizAnswers>
  onComplete: (answers: QuizAnswers) => void
  onExit: () => void
}) {
  const steps: StepId[] = ['streaming']
  if (hasStreamingSubscription(subscriptions)) steps.push('household')
  steps.push('ai', 'music', 'gaming')
  if (subscriptions.length > 0) steps.push('utilization')

  const [stepIndex, setStepIndex] = useState(0)
  const [draft, setDraft] = useState<Partial<QuizAnswers>>({
    aiUseCases: [],
    utilizationMap: {},
    ...initialAnswers,
  })
  const [anim, setAnim] = useState<'' | 'quiz-exit' | 'quiz-enter'>('')
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
    }
  }, [])

  const isLastStep = stepIndex === steps.length - 1
  const currentStep = steps[stepIndex]

  const finalize = (finalDraft: Partial<QuizAnswers>) => {
    const complete: QuizAnswers = {
      streamingFrequency: finalDraft.streamingFrequency ?? 'rarely',
      householdSize: finalDraft.householdSize,
      aiUseCases: finalDraft.aiUseCases ?? [],
      musicHabits: finalDraft.musicHabits ?? 'free',
      gaming: finalDraft.gaming ?? 'none',
      utilizationMap: finalDraft.utilizationMap ?? {},
    }
    onComplete(complete)
  }

  const goToStep = (nextIndex: number, direction: 'forward' | 'backward') => {
    setAnim('quiz-exit')
    advanceTimer.current = setTimeout(() => {
      setStepIndex(nextIndex)
      setAnim('quiz-enter')
      advanceTimer.current = setTimeout(() => setAnim(''), 200)
    }, 200)
    void direction
  }

  const back = () => {
    if (stepIndex === 0) {
      onExit()
      return
    }
    goToStep(stepIndex - 1, 'backward')
  }

  const selectSingle = <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) => {
    const next = { ...draft, [key]: value }
    setDraft(next)
    if (!isLastStep) {
      goToStep(stepIndex + 1, 'forward')
    }
  }

  const toggleAiUseCase = (value: AiUseCase) => {
    setDraft((prev) => {
      const current = prev.aiUseCases ?? []
      if (value === 'none') {
        return { ...prev, aiUseCases: current.includes('none') ? [] : ['none'] }
      }
      const withoutNone = current.filter((c) => c !== 'none')
      if (withoutNone.includes(value)) {
        return { ...prev, aiUseCases: withoutNone.filter((c) => c !== value) }
      }
      if (withoutNone.length >= 2) return prev
      return { ...prev, aiUseCases: [...withoutNone, value] }
    })
  }

  const setUtilization = (subId: string, level: UtilizationLevel) => {
    setDraft((prev) => ({ ...prev, utilizationMap: { ...(prev.utilizationMap ?? {}), [subId]: level } }))
  }

  const continueOrFinish = () => {
    if (isLastStep) {
      finalize(draft)
    } else {
      goToStep(stepIndex + 1, 'forward')
    }
  }

  const progressPct = Math.round(((stepIndex + 1) / steps.length) * 100)

  return (
    <div>
      <div
        className="mb-1"
        style={{
          height: 3,
          borderRadius: 999,
          background: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPct}%`,
            background: 'linear-gradient(90deg, #6c47ff, #3d9bff)',
            borderRadius: 999,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
      <div className="flex items-center gap-2 pt-4 pb-1">
        <button
          type="button"
          onClick={back}
          className="flex flex-shrink-0 items-center justify-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: '#1a1d27',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#e8eaf0',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 3L5 8L10 13" />
          </svg>
        </button>
        <span style={{ fontSize: 12, color: '#5a5e72', fontWeight: 600 }}>
          Otázka {stepIndex + 1} z {steps.length}
        </span>
      </div>

      <div className={anim} style={{ paddingTop: 12 }}>
        {currentStep === 'streaming' && (
          <div className="space-y-7">
            <p style={{ fontSize: 17, fontWeight: 700, color: '#e8eaf0' }}>
              Jak často skutečně sleduješ filmy nebo seriály?
            </p>
            <div className="flex flex-col gap-2">
              {STREAMING_OPTIONS.map((opt) => (
                <OptionButton
                  key={opt.value}
                  label={opt.label}
                  selected={draft.streamingFrequency === opt.value}
                  onClick={() => selectSingle('streamingFrequency', opt.value)}
                />
              ))}
            </div>
          </div>
        )}

        {currentStep === 'household' && (
          <div className="space-y-7">
            <p style={{ fontSize: 17, fontWeight: 700, color: '#e8eaf0' }}>S kým sdílíš přístupy ke streamingu?</p>
            <div className="flex flex-col gap-2">
              {HOUSEHOLD_OPTIONS.map((opt) => (
                <OptionButton
                  key={opt.value}
                  label={opt.label}
                  selected={draft.householdSize === opt.value}
                  onClick={() => selectSingle('householdSize', opt.value)}
                />
              ))}
            </div>
          </div>
        )}

        {currentStep === 'ai' && (
          <div className="space-y-7">
            <p style={{ fontSize: 17, fontWeight: 700, color: '#e8eaf0' }}>
              K čemu využíváš AI nástroje nejčastěji?
            </p>
            <p style={{ fontSize: 12, color: '#5a5e72', marginTop: -20 }}>Vyber až 2 možnosti</p>
            <div className="flex flex-col gap-2">
              {AI_OPTIONS.map((opt) => (
                <OptionButton
                  key={opt.value}
                  label={opt.label}
                  selected={(draft.aiUseCases ?? []).includes(opt.value)}
                  onClick={() => toggleAiUseCase(opt.value)}
                />
              ))}
            </div>
            <button
              type="button"
              disabled={(draft.aiUseCases ?? []).length === 0}
              onClick={continueOrFinish}
              className="save-cta-btn w-full text-white disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
              style={{
                background: 'linear-gradient(135deg, #6c47ff, #3d9bff)',
                borderRadius: 14,
                padding: 16,
                fontSize: 15,
                fontWeight: 700,
                opacity: (draft.aiUseCases ?? []).length > 0 ? 1 : 0.4,
                boxShadow: (draft.aiUseCases ?? []).length > 0 ? '0 4px 24px rgba(108,71,255,0.4)' : 'none',
              }}
            >
              {isLastStep ? 'Analyzovat →' : 'Pokračovat →'}
            </button>
          </div>
        )}

        {currentStep === 'music' && (
          <div className="space-y-7">
            <p style={{ fontSize: 17, fontWeight: 700, color: '#e8eaf0' }}>Jak posloucháš hudbu?</p>
            <div className="flex flex-col gap-2">
              {MUSIC_OPTIONS.map((opt) => (
                <OptionButton
                  key={opt.value}
                  label={opt.label}
                  selected={draft.musicHabits === opt.value}
                  onClick={() => selectSingle('musicHabits', opt.value)}
                />
              ))}
            </div>
            {isLastStep && (
              <button
                type="button"
                disabled={!draft.musicHabits}
                onClick={continueOrFinish}
                className="save-cta-btn w-full text-white disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
                style={{
                  background: 'linear-gradient(135deg, #6c47ff, #3d9bff)',
                  borderRadius: 14,
                  padding: 16,
                  fontSize: 15,
                  fontWeight: 700,
                  opacity: draft.musicHabits ? 1 : 0.4,
                  boxShadow: draft.musicHabits ? '0 4px 24px rgba(108,71,255,0.4)' : 'none',
                }}
              >
                Analyzovat →
              </button>
            )}
          </div>
        )}

        {currentStep === 'gaming' && (
          <div className="space-y-7">
            <p style={{ fontSize: 17, fontWeight: 700, color: '#e8eaf0' }}>Hraješ hry?</p>
            <div className="flex flex-col gap-2">
              {GAMING_OPTIONS.map((opt) => (
                <OptionButton
                  key={opt.value}
                  label={opt.label}
                  selected={draft.gaming === opt.value}
                  onClick={() => selectSingle('gaming', opt.value)}
                />
              ))}
            </div>
            {isLastStep && (
              <button
                type="button"
                disabled={!draft.gaming}
                onClick={continueOrFinish}
                className="save-cta-btn w-full text-white disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
                style={{
                  background: 'linear-gradient(135deg, #6c47ff, #3d9bff)',
                  borderRadius: 14,
                  padding: 16,
                  fontSize: 15,
                  fontWeight: 700,
                  opacity: draft.gaming ? 1 : 0.4,
                  boxShadow: draft.gaming ? '0 4px 24px rgba(108,71,255,0.4)' : 'none',
                }}
              >
                Analyzovat →
              </button>
            )}
          </div>
        )}

        {currentStep === 'utilization' && (
          <div className="space-y-5">
            <p style={{ fontSize: 17, fontWeight: 700, color: '#e8eaf0' }}>
              Ohodnoť každé předplatné — jak moc ho využíváš?
            </p>
            <div
              className="flex flex-col gap-3"
              style={{ maxHeight: subscriptions.length > 5 ? 300 : undefined, overflowY: subscriptions.length > 5 ? 'auto' : undefined }}
            >
              {subscriptions.map((sub) => {
                const level = draft.utilizationMap?.[sub.id]
                return (
                  <div
                    key={sub.id}
                    style={{
                      background: '#1a1d27',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 14,
                      padding: 14,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#e8eaf0' }}>{sub.name}</span>
                      <span style={{ fontSize: 13, color: '#8b8fa8' }}>
                        {Math.round(monthlyAmount(sub)).toLocaleString('cs-CZ')} Kč
                      </span>
                    </div>
                    <div className="flex gap-1.5 mt-2.5">
                      {UTILIZATION_OPTIONS.map((opt) => {
                        const selected = level === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setUtilization(sub.id, opt.value)}
                            style={{
                              flex: 1,
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '8px 6px',
                              borderRadius: 100,
                              background: selected ? 'rgba(108,71,255,0.2)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${selected ? '#6c47ff' : 'rgba(255,255,255,0.08)'}`,
                              color: selected ? '#e8eaf0' : '#8b8fa8',
                            }}
                          >
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <button
              type="button"
              disabled={subscriptions.some((s) => !draft.utilizationMap?.[s.id])}
              onClick={continueOrFinish}
              className="save-cta-btn w-full text-white disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
              style={{
                position: 'sticky',
                bottom: 12,
                background: 'linear-gradient(135deg, #6c47ff, #3d9bff)',
                borderRadius: 14,
                padding: 16,
                fontSize: 15,
                fontWeight: 700,
                opacity: subscriptions.every((s) => draft.utilizationMap?.[s.id]) ? 1 : 0.4,
                boxShadow: subscriptions.every((s) => draft.utilizationMap?.[s.id]) ? '0 4px 24px rgba(108,71,255,0.4)' : 'none',
              }}
            >
              Analyzovat →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function AnalysisScreen({ onDone }: { onDone: () => void }) {
  const [visibleLines, setVisibleLines] = useState(0)
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    const timers = [
      setTimeout(() => setVisibleLines(1), 0),
      setTimeout(() => setVisibleLines(2), 800),
      setTimeout(() => setVisibleLines(3), 1600),
      setTimeout(() => onDoneRef.current(), 2500),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  const lines = [
    'Analyzuji tvá předplatná…',
    'Hledám překrývající se služby…',
    'Počítám potenciální úspory…',
  ]

  return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: '60vh' }}>
      <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
        <div
          className="save-quiz-banner absolute inset-0 rounded-full"
          style={{ background: 'rgba(108,71,255,0.1)' }}
        />
        <svg width="140" height="140" viewBox="0 0 140 140" className="save-banner-icon absolute">
          <circle
            cx="70"
            cy="70"
            r="60"
            fill="none"
            stroke="url(#analysis-arc-grad)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="180 196"
          />
          <defs>
            <linearGradient id="analysis-arc-grad" x1="0" y1="0" x2="140" y2="140">
              <stop offset="0%" stopColor="#6c47ff" />
              <stop offset="100%" stopColor="#3d9bff" />
            </linearGradient>
          </defs>
        </svg>
        <span style={{ fontSize: 36 }}>✨</span>
      </div>

      <div className="mt-8 flex flex-col items-center gap-2" style={{ minHeight: 84 }}>
        {lines.map((line, idx) => (
          <p
            key={line}
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: '#8b8fa8',
              opacity: idx < visibleLines ? 1 : 0,
              transform: idx < visibleLines ? 'translateY(0)' : 'translateY(6px)',
              transition: 'opacity 0.4s ease, transform 0.4s ease',
            }}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center text-center"
      style={{ minHeight: '60vh', justifyContent: 'center', padding: '0 12px' }}
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
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#8b6fff" strokeWidth={1.8}>
          <rect x="4" y="10" width="16" height="10" rx="2" />
          <path strokeLinecap="round" d="M8 10V7a4 4 0 118 0v3" />
        </svg>
      </div>
      <h2 className="mt-5" style={{ fontSize: 18, fontWeight: 700, color: '#e8eaf0' }}>
        Přidej předplatná pro analýzu
      </h2>
      <p className="mt-2" style={{ fontSize: 13, color: '#8b8fa8', lineHeight: 1.5 }}>
        Čím více předplatných zadáš, tím přesnější doporučení dostaneš.
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
  )
}

function ScorePill({ score }: { score: number }) {
  const color = score < 40 ? '#ef4444' : score < 70 ? '#f59e0b' : '#22c55e'
  const bg = score < 40 ? 'rgba(239,68,68,0.12)' : score < 70 ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)'
  return (
    <span
      className="relative inline-flex items-center"
      style={{
        marginTop: 14,
        background: bg,
        color,
        border: `1px solid ${color}40`,
        borderRadius: 100,
        padding: '6px 14px',
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      Skóre efektivity: {score} / 100
    </span>
  )
}

function RecommendationCard({
  rec,
  index,
  onReminderError,
}: {
  rec: SavingsRecommendation
  index: number
  onReminderError: () => void
}) {
  const [reminded, setReminded] = useState(() => isReminderCachedLocally(rec.id))
  const chip = TYPE_CHIP[rec.type]

  const handleRemind = async () => {
    setReminded(true)
    cacheReminderLocally(rec.id)
    const { error } = await createReminder({
      subscriptionId: rec.subscriptionId ?? null,
      recommendationType: rec.type,
      recommendationTitle: rec.title,
    })
    if (error) {
      setReminded(false)
      clearReminderCacheLocally(rec.id)
      onReminderError()
    }
  }

  return (
    <div
      className="save-rec-card relative overflow-hidden"
      style={{
        background: '#1a1d27',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 18,
        padding: '20px 20px 20px 24px',
        marginBottom: 10,
        animationDelay: `${index * 80}ms`,
      }}
    >
      <div
        className="absolute left-0 top-0"
        style={{ width: 4, height: '100%', borderRadius: '2px 0 0 2px', background: STRIPE_COLOR[rec.type] }}
      />

      <div className="flex items-center justify-between gap-2">
        <span
          style={{
            background: chip.bg,
            color: chip.color,
            borderRadius: 100,
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {chip.label}
        </span>

        {rec.savings !== null && (
          <span
            className="flex-shrink-0"
            style={
              rec.savings > 0
                ? {
                    background: 'rgba(34,197,94,0.12)',
                    color: '#22c55e',
                    borderRadius: 100,
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                  }
                : {
                    background: 'rgba(139,111,255,0.15)',
                    color: '#8b6fff',
                    borderRadius: 100,
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                  }
            }
          >
            {rec.savings > 0 ? `~${rec.savings} Kč/měs` : rec.badge || 'Tip'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mt-2.5">
        <span style={{ fontSize: 22, lineHeight: 1 }} className="flex-shrink-0">{rec.emoji}</span>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e8eaf0' }}>{rec.title}</h3>
      </div>

      <p style={{ fontSize: 13, color: '#8b8fa8', lineHeight: 1.6, marginTop: 6, paddingLeft: 32 }}>
        {rec.description}
      </p>

      {rec.action && (
        <div
          style={{
            marginTop: 10,
            marginLeft: 32,
            background: 'rgba(255,255,255,0.04)',
            borderLeft: `2px solid ${STRIPE_COLOR[rec.type]}`,
            borderRadius: '0 8px 8px 0',
            padding: '8px 12px',
          }}
        >
          <strong style={{ fontSize: 12.5, fontWeight: 700, color: '#e8eaf0', lineHeight: 1.5 }}>{rec.action}</strong>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 12, marginLeft: 32 }}>
        <Link
          href="/dashboard"
          className="save-rec-btn inline-flex items-center"
          style={{
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'transparent',
            color: '#e8eaf0',
            borderRadius: 9,
            padding: '8px 14px',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          Zobrazit předplatné
        </Link>
        <button
          type="button"
          disabled={reminded}
          onClick={handleRemind}
          className="save-rec-btn inline-flex items-center disabled:cursor-not-allowed"
          style={{
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'transparent',
            color: reminded ? '#5a5e72' : '#e8eaf0',
            borderRadius: 9,
            padding: '8px 14px',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {reminded ? 'Připomenuto ✓' : 'Připomenout za 30 dní'}
        </button>
      </div>
    </div>
  )
}

export default function SavingsView({ subscriptions }: { subscriptions: Subscription[] }) {
  const [answers, setAnswers] = useState<QuizAnswers | null>(null)
  const [phase, setPhase] = useState<Phase>('quiz')
  const [loaded, setLoaded] = useState(false)
  const [draftAnswers, setDraftAnswers] = useState<QuizAnswers | null>(null)
  const [reminderToast, setReminderToast] = useState(false)

  const showReminderErrorToast = () => {
    setReminderToast(true)
    setTimeout(() => setReminderToast(false), 2500)
  }

  useEffect(() => {
    const stored = loadStoredAnswers()
    setAnswers(stored)
    setPhase(stored ? 'results' : 'quiz')
    setLoaded(true)
  }, [])

  if (!loaded) return null

  const tooFewSubscriptions = subscriptions.length < 2

  const handleQuizComplete = (next: QuizAnswers) => {
    try {
      localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore storage failures — the session still works, just won't persist
    }
    setDraftAnswers(next)
    setPhase('analysis')
  }

  const handleAnalysisDone = () => {
    setAnswers(draftAnswers)
    setPhase('results')
  }

  const recommendations = answers ? getSavingsRecommendations(subscriptions, answers) : []
  const totalSavings = getTotalMonthlySavings(recommendations)
  const score = getEfficiencyScore(subscriptions, answers)

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
              background: '#1a1d27',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#e8eaf0',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 3L5 8L10 13" />
            </svg>
          </Link>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#e8eaf0' }}>Ušetřit více</h1>
            <p style={{ fontSize: 12, fontWeight: 500, color: '#8b6fff', marginTop: 2 }}>
              Najdeme kde platíš zbytečně
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5 space-y-5">
        {tooFewSubscriptions ? (
          <EmptyState />
        ) : phase === 'quiz' ? (
          <QuizFlow
            subscriptions={subscriptions}
            initialAnswers={answers || {}}
            onComplete={handleQuizComplete}
            onExit={() => setPhase('results')}
          />
        ) : phase === 'analysis' ? (
          <AnalysisScreen onDone={handleAnalysisDone} />
        ) : (
          <>
            {totalSavings > 0 ? (
              <div
                className="save-savings-banner"
                style={{
                  background: 'linear-gradient(135deg, rgba(108,71,255,0.2) 0%, rgba(61,155,255,0.1) 100%)',
                  border: '1px solid rgba(108,71,255,0.3)',
                  borderRadius: 20,
                  padding: 28,
                }}
              >
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Měsíční úspora
                    </p>
                    <p
                      className="text-gradient-stat"
                      style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}
                    >
                      {totalSavings.toLocaleString('cs-CZ')} Kč
                    </p>
                  </div>
                  <div className="text-right">
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Roční úspora
                    </p>
                    <p
                      style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.4, color: '#e8eaf0', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {(totalSavings * 12).toLocaleString('cs-CZ')} Kč
                    </p>
                  </div>
                </div>
                {score !== null && <ScorePill score={score} />}
              </div>
            ) : (
              <div
                className="flex flex-col items-center text-center"
                style={{
                  background: '#1a1d27',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 20,
                  padding: 28,
                }}
              >
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 56,
                    height: 56,
                    background: 'rgba(34,197,94,0.15)',
                    border: '1px solid rgba(34,197,94,0.3)',
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#22c55e" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 14l4.5 4.5L21 9" />
                  </svg>
                </div>
                <h2 className="mt-3" style={{ fontSize: 18, fontWeight: 700, color: '#e8eaf0' }}>
                  Tvá předplatná vypadají optimálně
                </h2>
                <p className="mt-1" style={{ fontSize: 13, color: '#8b8fa8', lineHeight: 1.5 }}>
                  Nepřeplácíš a nekupuješ zbytečné duplicity. Přidej více předplatných pro přesnější analýzu.
                </p>
                {score !== null && <ScorePill score={score} />}
              </div>
            )}

            {recommendations.length > 0 && (
              <div>
                {recommendations.map((rec, idx) => (
                  <RecommendationCard key={rec.id} rec={rec} index={idx} onReminderError={showReminderErrorToast} />
                ))}
              </div>
            )}

            <button
              onClick={() => setPhase('quiz')}
              className="save-edit-btn block w-full text-center transition-colors"
              style={{ color: '#5a5e72', fontSize: 13, padding: 14, background: 'transparent' }}
            >
              ← Upravit odpovědi
            </button>
          </>
        )}
      </main>

      {reminderToast && (
        <div className="fixed inset-x-0 bottom-24 z-[70] flex justify-center px-4 pointer-events-none">
          <div className="rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-5 py-2.5 text-xs font-black text-white shadow-2xl animate-in fade-in slide-in-from-bottom-4">
            Nepodařilo se uložit připomenutí
          </div>
        </div>
      )}
    </div>
  )
}
