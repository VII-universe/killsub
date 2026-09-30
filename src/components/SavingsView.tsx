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
      {/* Banner with animated gradient blobs + spinning sparkle icon */}
      <div
        className="save-quiz-banner flex items-center gap-3"
        style={{
          background: 'rgba(108,71,255,0.1)',
          border: '1px solid rgba(108,71,255,0.25)',
          borderRadius: 16,
          padding: 16,
        }}
      >
        <div
          className="save-banner-icon relative flex flex-shrink-0 items-center justify-center"
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'rgba(108,71,255,0.2)',
            border: '1px solid rgba(108,71,255,0.35)',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="save-sparkle-grad" x1="0" y1="0" x2="24" y2="24">
                <stop offset="0%" stopColor="#6c47ff" />
                <stop offset="100%" stopColor="#3d9bff" />
              </linearGradient>
            </defs>
            <path
              d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2z"
              fill="url(#save-sparkle-grad)"
            />
            <path d="M19 14l0.8 2.3L22 17l-2.2 0.7L19 20l-0.8-2.3L16 17l2.2-0.7L19 14z" fill="rgba(255,255,255,0.6)" />
          </svg>
        </div>
        <div className="relative flex flex-col gap-0.5">
          <strong style={{ fontSize: 15, fontWeight: 700, color: '#e8eaf0' }}>Odpověz na 4 otázky</strong>
          <span style={{ fontSize: 13, color: '#8b8fa8', lineHeight: 1.5 }}>
            Najdeme kde platíš zbytečně a co by ti ušetřilo peníze.
          </span>
        </div>
      </div>

      {QUESTIONS.map((q) => (
        <div key={q.key}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#e8eaf0', marginBottom: 10 }}>{q.question}</p>
          <div className="flex flex-col gap-2">
            {q.options.map((option) => {
              const selected = draft[q.key] === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, [q.key]: option }))}
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
                  <span>{option}</span>
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
            })}
          </div>
        </div>
      ))}

      <button
        type="button"
        disabled={!allAnswered}
        onClick={() => onComplete(draft as QuizAnswers)}
        className="save-cta-btn w-full text-white disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
        style={{
          background: 'linear-gradient(135deg, #6c47ff, #3d9bff)',
          borderRadius: 14,
          padding: 16,
          fontSize: 15,
          fontWeight: 700,
          opacity: allAnswered ? 1 : 0.4,
          boxShadow: allAnswered ? '0 4px 24px rgba(108,71,255,0.4)' : 'none',
        }}
      >
        Zobrazit doporučení →
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
        {showQuiz ? (
          <Quiz initialAnswers={answers || {}} onComplete={handleComplete} />
        ) : (
          <>
            {/* Summary banner */}
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
                <p
                  className="relative"
                  style={{ fontSize: 11, fontWeight: 600, color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                >
                  Mohl bys ušetřit až
                </p>
                <p
                  className="text-gradient-stat relative"
                  style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}
                >
                  {totalSavings.toLocaleString('cs-CZ')} Kč
                </p>
                <p className="relative" style={{ fontSize: 13, color: '#8b8fa8' }}>
                  měsíčně · {(totalSavings * 12).toLocaleString('cs-CZ')} Kč ročně
                </p>
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
              </div>
            )}

            {/* Recommendation cards */}
            {recommendations.length > 0 && (
              <div>
                {recommendations.map((rec, idx) => (
                  <div
                    key={rec.id}
                    className="save-rec-card relative overflow-hidden"
                    style={{
                      background: '#1a1d27',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 18,
                      padding: '20px 20px 20px 24px',
                      marginBottom: 10,
                      animationDelay: `${idx * 80}ms`,
                    }}
                  >
                    <div
                      className="absolute left-0 top-0"
                      style={{ width: 4, height: '100%', borderRadius: '2px 0 0 2px', background: getAccentColor(rec) }}
                    />

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span style={{ fontSize: 22, lineHeight: 1 }} className="flex-shrink-0">{rec.emoji}</span>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e8eaf0' }}>{rec.title}</h3>
                      </div>

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

                    <p style={{ fontSize: 13, color: '#8b8fa8', lineHeight: 1.6, marginTop: 6, paddingLeft: 32 }}>
                      {rec.description}
                    </p>

                    <a
                      href={rec.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="save-rec-btn inline-flex items-center"
                      style={{
                        marginTop: 12,
                        marginLeft: 32,
                        border: '1px solid rgba(255,255,255,0.14)',
                        background: 'transparent',
                        color: '#e8eaf0',
                        borderRadius: 9,
                        padding: '8px 14px',
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      {rec.savings !== null && rec.savings > 0 ? 'Porovnat obsah →' : 'Zjistit více →'}
                    </a>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setIsEditing(true)}
              className="save-edit-btn block w-full text-center transition-colors"
              style={{ color: '#5a5e72', fontSize: 13, padding: 14, background: 'transparent' }}
            >
              ← Upravit odpovědi
            </button>
          </>
        )}
      </main>
    </div>
  )
}
