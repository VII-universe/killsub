export interface CatalogItem {
  name: string
  category: string
  defaultAmount: number
  currency: string
  billing_cycle: 'monthly' | 'yearly'
  icon: string // emoji
}

export const SUBSCRIPTION_CATALOG: CatalogItem[] = [
  { name: 'Netflix', category: 'Streaming', defaultAmount: 329, currency: 'CZK', billing_cycle: 'monthly', icon: '🎬' },
  { name: 'Spotify', category: 'Hudba', defaultAmount: 159, currency: 'CZK', billing_cycle: 'monthly', icon: '🎵' },
  { name: 'YouTube Premium', category: 'Streaming', defaultAmount: 179, currency: 'CZK', billing_cycle: 'monthly', icon: '▶️' },
  { name: 'Disney+', category: 'Streaming', defaultAmount: 199, currency: 'CZK', billing_cycle: 'monthly', icon: '✨' },
  { name: 'Adobe Creative Cloud', category: 'Design', defaultAmount: 1399, currency: 'CZK', billing_cycle: 'monthly', icon: '🎨' },
  { name: 'Microsoft 365', category: 'Produktivita', defaultAmount: 99, currency: 'CZK', billing_cycle: 'monthly', icon: '💼' },
  { name: 'Apple TV+', category: 'Streaming', defaultAmount: 199, currency: 'CZK', billing_cycle: 'monthly', icon: '🍎' },
  { name: 'Apple Music', category: 'Hudba', defaultAmount: 199, currency: 'CZK', billing_cycle: 'monthly', icon: '🎶' },
  { name: 'iCloud+', category: 'Cloud', defaultAmount: 49, currency: 'CZK', billing_cycle: 'monthly', icon: '☁️' },
  { name: 'Google One', category: 'Cloud', defaultAmount: 59, currency: 'CZK', billing_cycle: 'monthly', icon: '🔵' },
  { name: 'Dropbox', category: 'Cloud', defaultAmount: 399, currency: 'CZK', billing_cycle: 'monthly', icon: '📦' },
  { name: 'ChatGPT Plus', category: 'AI', defaultAmount: 499, currency: 'CZK', billing_cycle: 'monthly', icon: '🤖' },
  { name: 'Claude Pro', category: 'AI', defaultAmount: 499, currency: 'CZK', billing_cycle: 'monthly', icon: '🧠' },
  { name: 'Midjourney', category: 'AI', defaultAmount: 299, currency: 'CZK', billing_cycle: 'monthly', icon: '🖼️' },
  { name: 'GitHub Copilot', category: 'Vývoj', defaultAmount: 229, currency: 'CZK', billing_cycle: 'monthly', icon: '💻' },
  { name: 'Notion', category: 'Produktivita', defaultAmount: 199, currency: 'CZK', billing_cycle: 'monthly', icon: '📝' },
  { name: 'Figma', category: 'Design', defaultAmount: 299, currency: 'CZK', billing_cycle: 'monthly', icon: '🎯' },
  { name: 'Duolingo Plus', category: 'Vzdělání', defaultAmount: 199, currency: 'CZK', billing_cycle: 'monthly', icon: '🦜' },
  { name: 'HBO Max', category: 'Streaming', defaultAmount: 199, currency: 'CZK', billing_cycle: 'monthly', icon: '📺' },
  { name: 'Deezer', category: 'Hudba', defaultAmount: 149, currency: 'CZK', billing_cycle: 'monthly', icon: '🎧' },
]
