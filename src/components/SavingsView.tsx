'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Subscription } from './SubscriptionList'
import {
  QuizAnswers,
  QUIZ_STORAGE_KEY,
  SavingsRecommendation,
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

// Purely presentational classification, derived from the existing id/savings fields —
// does not touch the recommendation logic or data in utils/savingsRecommendations.ts.
function getAccentColor(rec: SavingsRecommendation): string {
  if (rec.id.startsWith('overlap-')) return '#ef4444' // red — overlap / wasted spend
  if (rec.savings !== null) return '#f59e0b' // yellow — alternative recommendation
  return '#22c55e' // green — informational tip
}

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
    <div className="space-y-7">
      {/* Banner with animated gradient blobs, matching the dashboard hero card */}
      <div
        className="relative overflow-hidden flex items-center gap-3"
        style={{
          background: 'rgba(108,71,255,0.1)',
          border: '1px solid rgba(108,71,255,0.25)',
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div
          className="animate-hero-drift-1 pointer-events-none absolute rounded-full"
          style={{ width: 160, height: 160, top: -70, left: -50, background: 'radial-gradient(circle, #6c47ff, transparent 70%)', opacity: 0.15, filter: 'blur(40px)' }}
        />
        <div
          className="animate-hero-drift-2 pointer-events-none absolute rounded-full"
          style={{ width: 140, height: 140, top: -50, right: -30, background: 'radial-gradient(circle, #3d9bff, transparent 70%)', opacity: 0.15, filter: 'blur(40px)' }}
        />
        <span className="relative text-xl flex-shrink-0">✨</span>
        <p className="relative text-sm font-semibold text-white">Odpověz na 4 otázky — najdeme kde ušetříš</p>
      </div>

      {QUESTIONS.map((q) => (
        <div key={q.key}>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#e8eaf0', marginBottom: 12 }}>{q.question}</p>
          <div className="grid grid-cols-1 gap-2">
            {q.options.map((option) => {
              const selected = draft[q.key] === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, [q.key]: option }))}
                  className={`quiz-option flex items-center justify-between text-left text-xs font-semibold ${selected ? 'quiz-option-selected' : ''}`}
                  style={{
                    background: selected ? 'rgba(108,71,255,0.12)' : '#1a1d27',
                    border: `1px solid ${selected ? '#6c47ff' : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: selected ? '0 0 0 1px rgba(108,71,255,0.3)' : 'none',
                    borderRadius: 14,
                    padding: '16px 20px',
                    color: '#e8eaf0',
                  }}
                >
                  <span>{option}</span>
                  {selected && (
                    <span
                      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                      style={{ background: '#6c47ff' }}
                    >
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
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
        className="savings-submit-btn w-full text-white disabled:cursor-not-allowed active:scale-[0.98] transition-all"
        style={{
          background: 'linear-gradient(135deg, #6c47ff, #3d9bff)',
          borderRadius: 14,
          padding: 16,
          fontSize: 15,
          fontWeight: 700,
          opacity: allAnswered ? 1 : 0.4,
        }}
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
            <h1 className="text-gradient-hero text-sm font-black tracking-tight" style={{ fontWeight: 800 }}>
              Ušetřit více
            </h1>
            <p className="text-[11px] text-white/50">Najdeme kde platíš zbytečně</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5 space-y-5">
        {showQuiz ? (
          <Quiz initialAnswers={answers || {}} onComplete={handleComplete} />
        ) : (
          <>
            {/* Summary banner */}
            {totalSavings > 0 ? (
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(108,71,255,0.2) 0%, rgba(61,155,255,0.1) 100%)',
                  border: '1px solid rgba(108,71,255,0.3)',
                  borderRadius: 20,
                  padding: 28,
                }}
              >
                <p style={{ fontSize: 13, color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Mohl bys ušetřit
                </p>
                <p className="text-gradient-stat" style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.2 }}>
                  {totalSavings.toLocaleString('cs-CZ')} Kč
                </p>
                <p style={{ fontSize: 13, color: '#8b8fa8' }}>
                  měsíčně · {(totalSavings * 12).toLocaleString('cs-CZ')} Kč ročně
                </p>
              </div>
            ) : (
              <div
                className="text-center"
                style={{
                  background: 'rgba(34,197,94,0.15)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: 20,
                  padding: 28,
                }}
              >
                <div style={{ fontSize: 48, lineHeight: 1 }}>✅</div>
                <p className="mt-3 text-base font-bold text-white">Tvá předplatná vypadají optimálně</p>
                <p className="mt-1 text-xs" style={{ color: '#8b8fa8' }}>
                  Přidej více předplatných pro přesnější analýzu
                </p>
              </div>
            )}

            {/* Recommendation cards */}
            {recommendations.length > 0 && (
              <div>
                {recommendations.map((rec, idx) => (
                  <div
                    key={rec.id}
                    className="savings-card-in relative overflow-hidden"
                    style={{
                      background: '#1a1d27',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 20,
                      padding: '24px 24px 24px 28px',
                      marginBottom: 12,
                      animationDelay: `${idx * 80}ms`,
                    }}
                  >
                    <div
                      className="absolute left-0 top-0"
                      style={{ width: 3, height: '100%', borderRadius: 2, background: getAccentColor(rec) }}
                    />

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span style={{ fontSize: 28, lineHeight: 1 }} className="flex-shrink-0">{rec.emoji}</span>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{rec.title}</h3>
                      </div>

                      {rec.savings !== null && (
                        <span
                          className="flex-shrink-0 font-semibold"
                          style={
                            rec.savings > 0
                              ? {
                                  background: 'rgba(34,197,94,0.12)',
                                  color: '#22c55e',
                                  border: '1px solid rgba(34,197,94,0.25)',
                                  borderRadius: 100,
                                  padding: '4px 12px',
                                  fontSize: 12,
                                }
                              : {
                                  background: 'rgba(108,71,255,0.12)',
                                  color: '#a78bfa',
                                  border: '1px solid rgba(108,71,255,0.3)',
                                  borderRadius: 100,
                                  padding: '4px 12px',
                                  fontSize: 12,
                                }
                          }
                        >
                          {rec.savings > 0 ? `~${rec.savings} Kč/měs` : rec.badge || 'Lepší volba'}
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: 14, color: '#8b8fa8', lineHeight: 1.6, marginTop: 8 }}>
                      {rec.description}
                    </p>

                    <a
                      href={rec.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-semibold"
                      style={{
                        marginTop: 14,
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'transparent',
                        color: '#e8eaf0',
                        borderRadius: 8,
                        padding: '8px 16px',
                        fontSize: 13,
                      }}
                    >
                      <span>Zjistit více</span>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </a>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-center pt-2">
              <button
                onClick={() => setIsEditing(true)}
                className="font-semibold"
                style={{ color: '#8b8fa8', fontSize: 12, background: 'transparent' }}
              >
                ← Upravit odpovědi
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
