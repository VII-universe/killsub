import type { Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
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

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`mk ${sans.variable} ${mono.variable}`}>
      <style>{`body{background:#0A0A0C!important;color:#ECE9E2}`}</style>
      <Motion />
      <Cursor />
      {children}
    </div>
  )
}
