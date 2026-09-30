'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Subscription } from './SubscriptionList'
import {
  QuizAnswers,
  QUIZ_STORAGE_KEY,
  getSavingsRecommendations,
  getTotalMonthlySavings,
} from '@/utils/savingsRecommendations'

interface Question {
  key: keyof QuizAnswers
  question: string
  options: string[]
}

const QUESTIONS: Question[] = [
  {
    key: 'q1',
    question: 'Kolik lidí u tebe doma sleduje filmy a seriály?',
    options: ['Jen já', '2 osoby', '3 a více'],
  },
  {
    key: 'q2',
    question: 'K čemu hlavně používáš AI nástroje?',
    options: ['Psaní a texty', 'Kód a programování', 'Obrázky a grafika', 'Nepoužívám AI'],
  },
  {
    key: 'q3',
    question: 'Posloucháš hudbu sám nebo s rodinou?',
    options: ['Sám', 'S partnerem nebo rodinou'],
  },
  {
    key: 'q4',
    question: 'Hraješ videohry?',
    options: ['Ano, pravidelně', 'Občas', 'Ne'],
  },
]

function loadStoredAnswers(): QuizAnswers | null {
  try {
    const raw = localStorage.getItem(QUIZ_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed.q1 && parsed.q2 && parsed.q3 && parsed.q4) return parsed
    return null
  } catch {
    return null
  }
}

function Quiz({
  initialAnswers,
  onComplete,
}: {
  initialAnswers: Partial<QuizAnswers>
  onComplete: (answers: QuizAnswers) => void
}) {
  const [draft, setDraft] = useState<Partial<QuizAnswers>>(initialAnswers)

  const allAnswered = QUESTIONS.every((q) => !!draft[q.key])

  return (
    <div className="space-y-5">
      <div
        className="flex items-center gap-3"
        style={{
          background: 'rgba(108,71,255,0.1)',
          border: '1px solid rgba(108,71,255,0.25)',
          borderRadius: 12,
          padding: 16,
        }}
      >
        <span className="text-xl">✨</span>
        <p className="text-xs font-bold text-white">Odpověz na 4 otázky — najdeme kde ušetříš</p>
      </div>

      {QUESTIONS.map((q) => (
        <div key={q.key}>
          <p className="text-xs font-bold text-white/90 mb-2">{q.question}</p>
          <div className="grid grid-cols-1 gap-2">
            {q.options.map((option) => {
              const selected = draft[q.key] === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, [q.key]: option }))}
                  className="text-left text-xs font-semibold transition-all"
                  style={{
                    background: selected ? 'rgba(108,71,255,0.12)' : '#1a1d27',
                    border: `1px solid ${selected ? '#6c47ff' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 10,
                    padding: '12px 16px',
                    color: '#e8eaf0',
                  }}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <button
        type="button"
        disabled={!allAnswered}
        onClick={() => onComplete(draft as QuizAnswers)}
        className="w-full rounded-2xl py-3.5 text-sm font-black text-white disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
        style={{ background: 'linear-gradient(135deg, #6c47ff, #3d9bff)' }}
      >
        Zobrazit doporučení
      </button>
    </div>
  )
}

export default function SavingsView({ subscriptions }: { subscriptions: Subscription[] }) {
  const [answers, setAnswers] = useState<QuizAnswers | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setAnswers(loadStoredAnswers())
    setLoaded(true)
  }, [])

  const handleComplete = (next: QuizAnswers) => {
    try {
      localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore storage failures — the session still works, just won't persist
    }
    setAnswers(next)
    setIsEditing(false)
  }

  if (!loaded) return null

  const showQuiz = !answers || isEditing
  const recommendations = answers ? getSavingsRecommendations(subscriptions, answers) : []
  const totalSavings = getTotalMonthlySavings(recommendations)

  return (
    <div className="min-h-screen flex flex-col text-white pb-24">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-2xl px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link
            href="/dashboard"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white">Ušetřit více</h1>
            <p className="text-[11px] text-white/50">Najdeme kde platíš zbytečně</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5 space-y-5">
        {showQuiz ? (
          <Quiz initialAnswers={answers || {}} onComplete={handleComplete} />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div />
              <button
                onClick={() => setIsEditing(true)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white/70 hover:bg-white/10"
              >
                Upravit odpovědi
              </button>
            </div>

            {/* Summary banner */}
            <div
              className="rounded-2xl p-5"
              style={{ background: 'linear-gradient(160deg, #1a1020, #0f1117)', border: '1px solid rgba(108,71,255,0.25)' }}
            >
              {totalSavings > 0 ? (
                <>
                  <p className="text-xs font-bold text-white/60">Mohl bys ušetřit až</p>
                  <p className="mt-1 text-3xl font-black" style={{ color: '#6c47ff' }}>
                    {totalSavings.toLocaleString('cs-CZ')} Kč<span className="text-sm text-white/50">/měs</span>
                  </p>
                </>
              ) : (
                <p className="text-sm font-bold text-white">Tvá předplatná vypadají optimálně 👍</p>
              )}
            </div>

            {/* Recommendation cards */}
            {recommendations.length > 0 ? (
              <div className="space-y-3">
                {recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    style={{
                      background: '#1a1d27',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 16,
                      padding: 20,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">{rec.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-black text-white">{rec.title}</h3>
                          {rec.badge && (
                            <span
                              className="text-[10px] font-black px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(108,71,255,0.15)', color: '#a78bfa' }}
                            >
                              {rec.badge}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-white/60 leading-relaxed">{rec.description}</p>

                        <div className="mt-3 flex items-center gap-2.5 flex-wrap">
                          {rec.savings !== null && (
                            <span
                              className="font-bold"
                              style={{
                                background: 'rgba(34,197,94,0.12)',
                                color: '#22c55e',
                                border: '1px solid rgba(34,197,94,0.25)',
                                borderRadius: 100,
                                padding: '3px 10px',
                                fontSize: 12,
                              }}
                            >
                              {rec.savings > 0 ? `Úspora ~${rec.savings} Kč/měs` : 'Stejná cena'}
                            </span>
                          )}
                          <a
                            href={rec.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold"
                            style={{
                              border: '1px solid rgba(255,255,255,0.15)',
                              background: 'transparent',
                              color: '#e8eaf0',
                              borderRadius: 8,
                              padding: '8px 16px',
                              fontSize: 13,
                            }}
                          >
                            Zjistit více
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-sm font-bold text-white">Tvá předplatná vypadají optimálně.</p>
                <p className="mt-1 text-xs text-white/50">
                  Přidej více předplatných pro přesnější analýzu.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
