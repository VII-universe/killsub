export const CLEANSE_KEY = 'killsub-cleanse'
export const CLEANSE_DURATION_DAYS = 30

export interface CleanseState {
  active: boolean
  startDate: string | null
  cancelled: string[] // subscription ids cancelled while the challenge was active
}

const DEFAULT_STATE: CleanseState = { active: false, startDate: null, cancelled: [] }

export function getCleanseState(): CleanseState {
  try {
    const raw = localStorage.getItem(CLEANSE_KEY)
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) }
  } catch {
    // ignore corrupted/unavailable storage
  }
  return DEFAULT_STATE
}

function saveCleanseState(state: CleanseState) {
  try {
    localStorage.setItem(CLEANSE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

export function startCleanse(): CleanseState {
  const state: CleanseState = { active: true, startDate: new Date().toISOString(), cancelled: [] }
  saveCleanseState(state)
  return state
}

export function stopCleanse(): CleanseState {
  const current = getCleanseState()
  const next = { ...current, active: false }
  saveCleanseState(next)
  return next
}

export const CLEANSE_UPDATED_EVENT = 'killsub-cleanse-updated'

export function recordCleanseCancellation(subscriptionId: string): CleanseState {
  const current = getCleanseState()
  if (!current.active) return current
  const next = { ...current, cancelled: [...new Set([...current.cancelled, subscriptionId])] }
  saveCleanseState(next)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CLEANSE_UPDATED_EVENT))
  }
  return next
}

export function getCleanseDaysRemaining(state: CleanseState): number {
  if (!state.active || !state.startDate) return 0
  const elapsedDays = (Date.now() - new Date(state.startDate).getTime()) / (1000 * 60 * 60 * 24)
  return Math.max(0, Math.ceil(CLEANSE_DURATION_DAYS - elapsedDays))
}
