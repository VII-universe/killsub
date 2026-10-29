import type { Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import '@/components/marketing/marketing.css'
import Motion from '@/components/marketing/Motion'
import Cursor from '@/components/marketing/Cursor'

// Marketing-only fonts: latin-ext so Czech diacritics (ě š č ř ž ů) render in
// the real face instead of a fallback. The root layout loads Geist with the
// plain latin subset only.
const sans = Geist({ variable: '--font-mk-sans', subsets: ['latin', 'latin-ext'], display: 'swap' })
const mono = Geist_Mono({ variable: '--font-mk-mono', subsets: ['latin', 'latin-ext'], display: 'swap' })

// Overrides the root layout's non-scalable viewport (WCAG 1.4.4) and its pink theme colour.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0A0A0C',
}

function sceneVersion(): string | null {
  try { return JSON.parse(readFileSync(join(process.cwd(), 'public', 'scene', 'manifest.json'), 'utf8')).v as string } catch { return null }
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const v = sceneVersion()
  return (
    <div className={`mk ${sans.variable} ${mono.variable}`}>
      <style>{`body{background:#0A0A0C!important;color:#ECE9E2}`}</style>
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(!sessionStorage.getItem('ks_pre')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.setAttribute('data-pre','1');sessionStorage.setItem('ks_pre','1')}}catch(e){}`,
        }}
      />
      <div className="mk-pre" aria-hidden="true"><div className="mk-pre-card" /></div>
      {v && <link rel="modulepreload" href={`/scene/boot.js?v=${v}`} fetchPriority="high" />}
      {v && <script type="module" async src={`/scene/boot.js?v=${v}`} />}
      <Motion />
      <Cursor />
      {children}
    </div>
  )
}
