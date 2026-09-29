import { Subscription } from '@/components/SubscriptionList'
import { computeHealthScore } from './health'
import { getCleanseState } from './cleanse'

export const AI_USED_KEY = 'killsub-ai-used'
export const STREAK_KEY = 'killsub-streak'

export interface StreakState {
  count: number
  lastOpenDate: string // YYYY-MM-DD
}

const DAY_MS = 1000 * 60 * 60 * 24

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

/** Increments the daily-open streak, resetting it if a day was skipped. Call once per dashboard mount. */
export function updateStreak(): StreakState {
  const today = todayStr()
  let state: StreakState = { count: 0, lastOpenDate: '' }

  try {
    const raw = localStorage.getItem(STREAK_KEY)
    if (raw) state = JSON.parse(raw)
  } catch {
    // corrupted/unavailable storage — start fresh
  }

  if (state.lastOpenDate === today) {
    return state
  }

  const daysSinceLastOpen = state.lastOpenDate
    ? Math.round((new Date(today).getTime() - new Date(state.lastOpenDate).getTime()) / DAY_MS)
    : null

  const nextCount = daysSinceLastOpen === 1 ? state.count + 1 : 1
  const next: StreakState = { count: nextCount, lastOpenDate: today }

  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(next))
  } catch {
    // ignore write failures (private browsing etc.)
  }

  return next
}

export function getStreak(): StreakState {
  try {
    const raw = localStorage.getItem(STREAK_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return { count: 0, lastOpenDate: '' }
}

export function markAiUsed() {
  try {
    localStorage.setItem(AI_USED_KEY, 'true')
  } catch {
    // ignore
  }
}

export function hasUsedAi(): boolean {
  try {
    return localStorage.getItem(AI_USED_KEY) === 'true'
  } catch {
    return false
  }
}

export interface Badge {
  id: string
  icon: string
  name: string
  description: string
  isEarned: (subscriptions: Subscription[]) => boolean
}

export const BADGES: Badge[] = [
  {
    id: 'first-step',
    icon: '💀',
    name: 'První krok',
    description: 'Přidejte své první předplatné.',
    isEarned: (subs) => subs.length >= 1,
  },
  {
    id: 'on-the-trail',
    icon: '🔥',
    name: 'Na stopě',
    description: 'Sledujte 5 a více předplatných najednou.',
    isEarned: (subs) => subs.length >= 5,
  },
  {
    id: 'ai-master',
    icon: '🧠',
    name: 'AI Master',
    description: 'Použijte Gemini AI import k naskenování faktury.',
    isEarned: () => hasUsedAi(),
  },
  {
    id: 'saver',
    icon: '💰',
    name: 'Šetřil',
    description: 'Mějte předplatné se zdravotním skóre pod 30 déle než 7 dní — je čas ho zrušit.',
    isEarned: (subs) => {
      const now = Date.now()
      return subs.some((s) => {
        if (!s.created_at) return false
        const score = computeHealthScore(s)
        const ageDays = (now - new Date(s.created_at).getTime()) / DAY_MS
        return score < 30 && ageDays > 7
      })
    },
  },
  {
    id: 'clean-shield',
    icon: '🏆',
    name: 'Čistý štít',
    description: 'Udržujte všechna předplatná se zdravotním skóre nad 70.',
    isEarned: (subs) => subs.length > 0 && subs.every((s) => computeHealthScore(s) > 70),
  },
  {
    id: 'loyal',
    icon: '📅',
    name: 'Věrný',
    description: 'Otevřete Killsub 3 dny po sobě.',
    isEarned: () => getStreak().count >= 3,
  },
  {
    id: 'cleanse-master',
    icon: '🧹',
    name: 'Cleanse Master',
    description: 'Zrušte alespoň jedno předplatné během 30denní výzvy.',
    isEarned: () => getCleanseState().cancelled.length >= 1,
  },
]
