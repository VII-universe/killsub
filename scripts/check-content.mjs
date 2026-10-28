// Build gate for landing copy. Fails the build when content/*.json contains an
// unresolved TODO( marker, a banned word, or a sentence longer than 12 words.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const DIR = join(process.cwd(), 'content')
const BANNED = {
  cs: ['revoluční', 'chytrý', 'chytré', 'chytrá', 'jednoduše', 'inteligentní'],
  en: ['revolutionary', 'smart', 'simply', 'intelligent'],
}
const MAX_WORDS = 12
const errors = []

function walk(value, path, lang) {
  if (typeof value === 'string') {
    if (path.endsWith('$comment')) return
    if (/TODO\(/.test(value)) errors.push(`${lang} ${path}: unresolved TODO`)
    const lower = value.toLowerCase()
    for (const w of BANNED[lang] ?? []) {
      if (new RegExp(`(^|[^\\p{L}])${w}([^\\p{L}]|$)`, 'u').test(lower)) errors.push(`${lang} ${path}: banned word "${w}"`)
    }
    for (const sentence of value.split(/[.!?]+\s+|[.!?]$/).filter(Boolean)) {
      const words = sentence.trim().split(/\s+/).filter(Boolean)
      if (words.length > MAX_WORDS) errors.push(`${lang} ${path}: ${words.length} words in "${sentence.trim()}"`)
    }
    return
  }
  if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`, lang))
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) walk(v, path ? `${path}.${k}` : k, lang)
}

for (const file of readdirSync(DIR).filter((f) => f.endsWith('.json'))) {
  const lang = file.replace('.json', '')
  walk(JSON.parse(readFileSync(join(DIR, file), 'utf8')), '', lang)
}

if (errors.length) {
  console.error('content check failed:\n  ' + errors.join('\n  '))
  process.exit(1)
}
console.log('content check ok')
