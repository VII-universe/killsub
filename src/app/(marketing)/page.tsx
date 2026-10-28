import type { Metadata } from 'next'
import { getContent, SITE_URL } from '@/components/marketing/content'
import Nav from '@/components/marketing/Nav'
import Hero from '@/components/marketing/Hero'

const c = getContent('cs')

export const metadata: Metadata = {
  title: c.meta.title,
  description: c.meta.description,
  alternates: { canonical: SITE_URL, languages: { cs: SITE_URL, en: `${SITE_URL}/en`, 'x-default': SITE_URL } },
  openGraph: { title: c.meta.title, description: c.meta.description, url: SITE_URL, siteName: 'Killsub', locale: 'cs_CZ', type: 'website' },
}

export default function Home() {
  return (
    <main lang="cs">
      <Nav c={c} lang="cs" />
      <Hero c={c} lang="cs" />
    </main>
  )
}
