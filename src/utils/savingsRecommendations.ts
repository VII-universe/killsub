import { Subscription } from '@/components/SubscriptionList'

export type StreamingFrequency = 'daily' | 'weekly' | 'monthly' | 'rarely'
export type HouseholdSize = 'solo' | 'couple' | 'family' | 'shared'
export type AiUseCase = 'writing' | 'coding' | 'images' | 'data' | 'research' | 'none'
export type MusicHabit = 'solo' | 'shared' | 'car' | 'free'
export type GamingHabit = 'regular' | 'mobile' | 'casual' | 'none'
export type UtilizationLevel = 'high' | 'medium' | 'low'

export interface QuizAnswers {
  streamingFrequency: StreamingFrequency
  householdSize?: HouseholdSize
  aiUseCases: AiUseCase[]
  musicHabits: MusicHabit
  gaming: GamingHabit
  utilizationMap: Record<string, UtilizationLevel>
}

export const QUIZ_STORAGE_KEY = 'ks_quiz_answers'
export const REMINDER_KEY_PREFIX = 'ks_reminder_'

// Narrows unknown localStorage content to the current QuizAnswers shape.
// Older, pre-rebuild quiz data ({q1,q2,q3,q4}) fails this check and is
// treated as "no answers yet" rather than crashing the view.
export function isQuizAnswers(value: unknown): value is QuizAnswers {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.streamingFrequency === 'string' &&
    Array.isArray(v.aiUseCases) &&
    typeof v.musicHabits === 'string' &&
    typeof v.gaming === 'string' &&
    typeof v.utilizationMap === 'object' &&
    v.utilizationMap !== null
  )
}

export type RecommendationType = 'cancel' | 'downgrade' | 'merge' | 'tip'

export interface SavingsRecommendation {
  id: string
  type: RecommendationType
  emoji: string
  title: string
  description: string
  action?: string // bold, specific action line shown above the buttons
  savings: number | null // Kč/měs equivalent; null = informational card, no numeric saving
  badge?: string
  url: string
  subscriptionId?: string
}

function monthlyAmount(sub: Subscription): number {
  const amt = Number(sub.amount) || 0
  return sub.billing_cycle === 'yearly' ? amt / 12 : amt
}

function nameIncludes(sub: Subscription, ...keywords: string[]): boolean {
  const lower = sub.name.toLowerCase()
  return keywords.some((k) => lower.includes(k))
}

function find(subscriptions: Subscription[], ...keywords: string[]): Subscription | undefined {
  return subscriptions.find((s) => nameIncludes(s, ...keywords))
}

function findAll(subscriptions: Subscription[], ...keywords: string[]): Subscription[] {
  return subscriptions.filter((s) => nameIncludes(s, ...keywords))
}

const STREAMING_KEYWORDS = ['netflix', 'disney', 'hbo', 'max', 'apple tv', 'prime video', 'hulu', 'voyo', 'skyshowtime']
const MUSIC_KEYWORDS = ['spotify', 'apple music', 'tidal', 'deezer', 'youtube music']
const AI_KEYWORDS = ['chatgpt', 'chat gpt', 'openai', 'claude', 'anthropic', 'gemini', 'copilot']
const CLOUD_KEYWORDS = ['icloud', 'google one', 'dropbox', 'onedrive']

function isStreaming(sub: Subscription): boolean {
  return sub.category?.toLowerCase() === 'streaming' || nameIncludes(sub, ...STREAMING_KEYWORDS)
}

export function hasStreamingSubscription(subscriptions: Subscription[]): boolean {
  return subscriptions.some(isStreaming)
}

export function getSavingsRecommendations(
  subscriptions: Subscription[],
  answers: QuizAnswers | null
): SavingsRecommendation[] {
  const recs: SavingsRecommendation[] = []
  const consumedIds = new Set<string>()

  // ---- CANCEL — subscriptions the user flagged as barely used ----
  if (answers) {
    for (const sub of subscriptions) {
      if (answers.utilizationMap[sub.id] === 'low') {
        const price = Math.round(monthlyAmount(sub))
        recs.push({
          id: `cancel-${sub.id}`,
          type: 'cancel',
          emoji: '🚫',
          title: `${sub.name} — platíš, ale nevyužíváš`,
          description: 'Sám jsi označil, že tohle předplatné skoro nepoužíváš.',
          action: `Zruš ${sub.name} a ušetři ${price} Kč/měs`,
          savings: price,
          url: '#',
          subscriptionId: sub.id,
        })
        consumedIds.add(sub.id)
      }
    }

    // Music habit says "neplatím za hudbu" but a paid music sub exists
    const musicSub = find(subscriptions, ...MUSIC_KEYWORDS)
    if (musicSub && answers.musicHabits === 'free' && !consumedIds.has(musicSub.id)) {
      const price = Math.round(monthlyAmount(musicSub))
      recs.push({
        id: `cancel-music-${musicSub.id}`,
        type: 'cancel',
        emoji: '🎧',
        title: `Neplatíš za hudbu, ale máš ${musicSub.name}`,
        description: 'Řekl jsi, že za hudbu neplatíš (YouTube / rádio) — zvaž, jestli toto předplatné vůbec potřebuješ.',
        action: `Zruš ${musicSub.name} a ušetři ${price} Kč/měs`,
        savings: price,
        url: '#',
        subscriptionId: musicSub.id,
      })
      consumedIds.add(musicSub.id)
    }
  }

  // ---- DOWNGRADE ----
  if (answers) {
    // Solo streaming — individual/basic tier likely cheaper than shared/standard
    if (answers.householdSize === 'solo') {
      for (const sub of subscriptions) {
        if (isStreaming(sub) && !consumedIds.has(sub.id) && !nameIncludes(sub, 'basic', 'individ', 'mobile')) {
          const price = monthlyAmount(sub)
          const estSavings = Math.round(price * 0.3)
          if (estSavings > 0) {
            recs.push({
              id: `downgrade-solo-${sub.id}`,
              type: 'downgrade',
              emoji: '⬇️',
              title: `${sub.name} — sleduješ sám, zvaž nižší tarif`,
              description: 'Používáš to jen sám — základní/individuální tarif stačí a je levnější.',
              action: `Přejdi na nižší tarif ${sub.name} — ušetříš až ${estSavings} Kč/měs`,
              savings: estSavings,
              url: '#',
              subscriptionId: sub.id,
            })
          }
        }
      }
    }

    // AI subscription used for exactly one use case → a cheaper/free tier may suffice
    const realUseCases = answers.aiUseCases.filter((c) => c !== 'none')
    if (realUseCases.length === 1) {
      const aiSub = find(subscriptions, ...AI_KEYWORDS)
      if (aiSub && !consumedIds.has(aiSub.id)) {
        const estSavings = Math.round(monthlyAmount(aiSub) * 0.5)
        recs.push({
          id: `downgrade-ai-${aiSub.id}`,
          type: 'downgrade',
          emoji: '⬇️',
          title: `${aiSub.name} — na jeden účel možná stačí míň`,
          description: 'Používáš AI jen na jednu věc — bezplatná nebo levnější varianta může stačit.',
          action: `Zkus nižší tarif ${aiSub.name} — ušetříš až ${estSavings} Kč/měs`,
          savings: estSavings,
          url: '#',
          subscriptionId: aiSub.id,
        })
      }
    }
  }

  // ---- MERGE — overlapping services ----
  const netflix = find(subscriptions, 'netflix')
  const disneyOrAppleTv = find(subscriptions, 'disney', 'apple tv')
  if (netflix && disneyOrAppleTv) {
    const cheaper = Math.min(monthlyAmount(netflix), monthlyAmount(disneyOrAppleTv))
    recs.push({
      id: 'merge-streaming-pair',
      type: 'merge',
      emoji: '🔄',
      title: 'Platíš za dvě streamovací služby — stačí jedna?',
      description: `Máš ${netflix.name} i ${disneyOrAppleTv.name}. Zvaž, jestli obě opravdu sleduješ.`,
      action: `Střídej ${netflix.name} a ${disneyOrAppleTv.name} — zruš jeden, za měsíc prohoď`,
      savings: Math.round(cheaper),
      url: '#',
    })
    consumedIds.add(netflix.id)
    consumedIds.add(disneyOrAppleTv.id)
  } else if (answers && (answers.streamingFrequency === 'monthly' || answers.streamingFrequency === 'rarely')) {
    const streamingSubs = subscriptions.filter((s) => isStreaming(s) && !consumedIds.has(s.id))
    if (streamingSubs.length >= 2) {
      const [a, b] = streamingSubs
      const cheaper = Math.min(monthlyAmount(a), monthlyAmount(b))
      recs.push({
        id: `merge-streaming-${a.id}-${b.id}`,
        type: 'merge',
        emoji: '🔄',
        title: `${a.name} a ${b.name} — nepotřebuješ oba najednou`,
        description: 'Sleduješ je jen pár dní v měsíci nebo míň — stačí mít aktivní jeden a střídat.',
        action: `Střídej ${a.name} a ${b.name} — zruš jeden, za měsíc prohoď`,
        savings: Math.round(cheaper),
        url: '#',
      })
      consumedIds.add(a.id)
      consumedIds.add(b.id)
    }
  }

  const aiTools = findAll(subscriptions, ...AI_KEYWORDS)
  if (aiTools.length >= 2) {
    const cheapest = Math.min(...aiTools.map(monthlyAmount))
    recs.push({
      id: 'merge-ai',
      type: 'merge',
      emoji: '🤖',
      title: 'Platíš za více AI asistentů — většinou stačí jeden',
      description: `Máš ${aiTools.map((s) => s.name).join(' a ')}. Zkus zůstat jen u jednoho.`,
      action: `Zruš jeden z AI asistentů — ušetříš ${Math.round(cheapest)} Kč/měs`,
      savings: Math.round(cheapest),
      url: '#',
    })
  }

  const adobe = find(subscriptions, 'adobe')
  const figmaOrCanva = find(subscriptions, 'figma', 'canva')
  if (adobe && figmaOrCanva) {
    const cheaper = Math.min(monthlyAmount(adobe), monthlyAmount(figmaOrCanva))
    recs.push({
      id: 'merge-design',
      type: 'merge',
      emoji: '🎨',
      title: `Adobe + ${figmaOrCanva.name} — překrývají se funkce`,
      description: `Máš ${adobe.name} i ${figmaOrCanva.name}. Obě zvládají podobné věci.`,
      action: `Zruš jedno z nich — ušetříš ${Math.round(cheaper)} Kč/měs`,
      savings: Math.round(cheaper),
      url: '#',
    })
  }

  // ---- TIPS — informational, usually savings: null ----
  if (answers) {
    const writing = answers.aiUseCases.includes('writing')
    if (writing) {
      const chatgpt = find(subscriptions, 'chatgpt', 'chat gpt', 'openai')
      if (chatgpt) {
        recs.push({
          id: 'tip-writing-claude',
          type: 'tip',
          emoji: '✍️',
          title: 'Pro psaní textů je Claude výrazně lepší za stejnou cenu',
          description: 'Zkus Claude — na dlouhé texty a psaní si vede o dost lépe.',
          savings: 0,
          badge: 'Lepší volba',
          url: 'https://claude.ai',
        })
      }
    }

    if (answers.aiUseCases.includes('images')) {
      const hasImageAi = findAll(subscriptions, 'midjourney', 'firefly').length > 0
      if (!hasImageAi) {
        recs.push({
          id: 'tip-image-ai',
          type: 'tip',
          emoji: '🖼️',
          title: 'Pro AI obrázky zkus Midjourney nebo Adobe Firefly',
          description: 'Specializované nástroje na generování obrázků zvládnou víc než obecné AI chaty.',
          savings: null,
          url: 'https://www.midjourney.com',
        })
      }
    }

    if (answers.gaming === 'regular') {
      const hasGamingSub = findAll(subscriptions, 'game pass', 'xbox', 'playstation plus', 'ps plus').length > 0
      if (!hasGamingSub) {
        recs.push({
          id: 'tip-game-pass',
          type: 'tip',
          emoji: '🎮',
          title: 'Game Pass dá přístup ke stovkám her za ~299 Kč/měs',
          description: 'Pokud hraješ pravidelně, může se vyplatit víc než nákup jednotlivých her.',
          savings: null,
          url: 'https://www.xbox.com/cs-CZ/xbox-game-pass',
        })
      }
    }

    const spotify = find(subscriptions, 'spotify')
    if (
      spotify &&
      !nameIncludes(spotify, 'family') &&
      (answers.householdSize === 'couple' || answers.householdSize === 'family' || answers.householdSize === 'shared')
    ) {
      recs.push({
        id: 'tip-spotify-family',
        type: 'tip',
        emoji: '🎵',
        title: 'Spotify Family je levnější pro víc lidí',
        description: 'Family plán vyjde levněji než víc individuálních účtů v jedné domácnosti.',
        savings: 80,
        url: 'https://www.spotify.com/cz/family/',
      })
    }

    if (findAll(subscriptions, ...CLOUD_KEYWORDS).length === 0 && subscriptions.length > 0) {
      recs.push({
        id: 'tip-cloud-bundle',
        type: 'tip',
        emoji: '☁️',
        title: 'Zvaž sloučit úložiště fotek a souborů do jednoho tarifu',
        description: 'Sdílený cloudový tarif (iCloud / Google One) bývá levnější než víc samostatných úložišť.',
        savings: null,
        url: 'https://one.google.com',
      })
    }
  }

  const priority: Record<RecommendationType, number> = { cancel: 0, downgrade: 1, merge: 2, tip: 3 }
  return recs.sort((a, b) => priority[a.type] - priority[b.type] || (b.savings ?? 0) - (a.savings ?? 0))
}

export function getTotalMonthlySavings(recommendations: SavingsRecommendation[]): number {
  return recommendations.reduce((sum, r) => sum + (r.savings || 0), 0)
}

export function getEfficiencyScore(subscriptions: Subscription[], answers: QuizAnswers | null): number | null {
  if (!answers || subscriptions.length === 0) return null
  const rated = subscriptions.filter((s) => answers.utilizationMap[s.id])
  if (rated.length === 0) return null
  const utilized = rated.filter((s) => answers.utilizationMap[s.id] !== 'low').length
  return Math.round((utilized / rated.length) * 100)
}

export function setReminder(recId: string): void {
  try {
    const remindAt = Date.now() + 30 * 24 * 60 * 60 * 1000
    localStorage.setItem(`${REMINDER_KEY_PREFIX}${recId}`, String(remindAt))
  } catch {
    // ignore storage failures
  }
}

export function hasReminder(recId: string): boolean {
  try {
    return localStorage.getItem(`${REMINDER_KEY_PREFIX}${recId}`) !== null
  } catch {
    return false
  }
}
