import { Subscription } from '@/components/SubscriptionList'

export interface QuizAnswers {
  q1: string // household size watching movies/shows
  q2: string // main AI use case
  q3: string // music solo/family
  q4: string // gaming frequency
}

export const QUIZ_STORAGE_KEY = 'ks_quiz_answers'

export interface SavingsRecommendation {
  id: string
  emoji: string
  title: string
  description: string
  savings: number | null // Kč/měs equivalent; null = informational card, no numeric saving
  badge?: string
  url: string
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

export function getSavingsRecommendations(
  subscriptions: Subscription[],
  answers: QuizAnswers | null
): SavingsRecommendation[] {
  const recs: SavingsRecommendation[] = []

  // ---- Overlaps (always checked, independent of the quiz) ----

  const netflix = find(subscriptions, 'netflix')
  const disneyOrAppleTv = find(subscriptions, 'disney', 'apple tv')
  if (netflix && disneyOrAppleTv) {
    const cheaper = Math.min(monthlyAmount(netflix), monthlyAmount(disneyOrAppleTv))
    recs.push({
      id: 'overlap-streaming',
      emoji: '📺',
      title: 'Platíš za dvě streamovací služby — stačí jedna?',
      description: `Máš ${netflix.name} i ${disneyOrAppleTv.name}. Zvaž, jestli obě opravdu sleduješ.`,
      savings: Math.round(cheaper),
      url: 'https://www.netflix.com',
    })
  }

  const aiTools = findAll(subscriptions, 'chatgpt', 'chat gpt', 'openai', 'claude', 'anthropic')
  if (aiTools.length >= 2) {
    const cheapest = Math.min(...aiTools.map(monthlyAmount))
    recs.push({
      id: 'overlap-ai',
      emoji: '🤖',
      title: 'Platíš za více AI asistentů — většinou stačí jeden',
      description: `Máš ${aiTools.map((s) => s.name).join(' a ')}. Zkus zůstat jen u jednoho.`,
      savings: Math.round(cheapest),
      url: 'https://claude.ai',
    })
  }

  const adobe = find(subscriptions, 'adobe')
  const figmaOrCanva = find(subscriptions, 'figma', 'canva')
  if (adobe && figmaOrCanva) {
    const cheaper = Math.min(monthlyAmount(adobe), monthlyAmount(figmaOrCanva))
    recs.push({
      id: 'overlap-design',
      emoji: '🎨',
      title: `Adobe + ${figmaOrCanva.name} — překrývají se funkce`,
      description: `Máš ${adobe.name} i ${figmaOrCanva.name}. Obě zvládají podobné věci.`,
      savings: Math.round(cheaper),
      url: 'https://www.figma.com',
    })
  }

  // ---- Quiz-based recommendations ----
  if (answers) {
    const householdOf2Plus = answers.q1 === '2 osoby' || answers.q1 === '3 a více'

    if (householdOf2Plus) {
      const spotify = find(subscriptions, 'spotify')
      if (spotify && !nameIncludes(spotify, 'family')) {
        recs.push({
          id: 'quiz-spotify-family',
          emoji: '🎵',
          title: 'Spotify Family je levnější pro 2+ lidi',
          description: 'Family plán vyjde levněji než víc individuálních účtů v jedné domácnosti.',
          savings: 80,
          url: 'https://www.spotify.com/cz/family/',
        })
      }

      if (netflix && !nameIncludes(netflix, 'family')) {
        recs.push({
          id: 'quiz-netflix-household',
          emoji: '📺',
          title: 'Netflix pro domácnost — zvaž sdílený plán',
          description: 'Pro víc lidí v domácnosti může vyjít výhodněji sdílený/rodinný plán.',
          savings: 100,
          url: 'https://www.netflix.com/cz/',
        })
      }
    }

    if (answers.q2 === 'Psaní a texty') {
      const chatgpt = find(subscriptions, 'chatgpt', 'chat gpt', 'openai')
      if (chatgpt) {
        recs.push({
          id: 'quiz-writing-claude',
          emoji: '✍️',
          title: 'Pro psaní textů je Claude výrazně lepší za stejnou cenu',
          description: 'Zkus Claude — na dlouhé texty a psaní si vede o dost lépe.',
          savings: 0,
          badge: 'Lepší volba',
          url: 'https://claude.ai',
        })
      }
    }

    if (answers.q2 === 'Obrázky a grafika') {
      const hasImageAi = findAll(subscriptions, 'midjourney', 'firefly').length > 0
      if (!hasImageAi) {
        recs.push({
          id: 'quiz-image-ai',
          emoji: '🖼️',
          title: 'Pro AI obrázky zkus Midjourney nebo Adobe Firefly',
          description: 'Specializované nástroje na generování obrázků zvládnou víc než obecné AI chaty.',
          savings: null,
          url: 'https://www.midjourney.com',
        })
      }
    }

    if (answers.q4 === 'Ano, pravidelně') {
      const hasGamingSub = findAll(subscriptions, 'game pass', 'xbox', 'playstation plus', 'ps plus').length > 0
      if (!hasGamingSub) {
        recs.push({
          id: 'quiz-game-pass',
          emoji: '🎮',
          title: 'Game Pass dá přístup ke stovkám her za ~299 Kč/měs',
          description: 'Pokud hraješ pravidelně, může se vyplatit víc než nákup jednotlivých her.',
          savings: null,
          url: 'https://www.xbox.com/cs-CZ/xbox-game-pass',
        })
      }
    }
  }

  return recs
}

export function getTotalMonthlySavings(recommendations: SavingsRecommendation[]): number {
  return recommendations.reduce((sum, r) => sum + (r.savings || 0), 0)
}
