import cs from '../../../content/cs.json'
import en from '../../../content/en.json'

export type Lang = 'cs' | 'en'
export type Content = typeof cs
export type CardData = { name: string; price: number; cycle: string; day: number }

const DICT: Record<Lang, Content> = { cs, en: en as Content }

export function getContent(lang: Lang): Content {
  return DICT[lang]
}

export const SITE_URL = 'https://killsub.vercel.app'
