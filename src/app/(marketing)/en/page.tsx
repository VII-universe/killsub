import type { Metadata } from 'next'
import { getContent, SITE_URL } from '@/components/marketing/content'
import Nav from '@/components/marketing/Nav'
import Hero from '@/components/marketing/Hero'
import KillSection from '@/components/marketing/KillSection'
import { Stats, Timeline, HowItWorks, Overview, Wrapped, Security, Closing, Footer } from '@/components/marketing/Sections'

const c = getContent('en')

export const metadata: Metadata = {
  title: c.meta.title,
  description: c.meta.description,
  alternates: { canonical: `${SITE_URL}/en`, languages: { cs: SITE_URL, en: `${SITE_URL}/en`, 'x-default': SITE_URL } },
  openGraph: { title: c.meta.title, description: c.meta.description, url: `${SITE_URL}/en`, siteName: 'Killsub', locale: 'en_GB', type: 'website' },
}

export default function HomeEn() {
  return (
    <main lang="en">
      <Nav c={c} lang="en" />
      <Hero c={c} lang="en" />
      <Stats c={c} />
      <Timeline c={c} lang="en" />
      <HowItWorks c={c} lang="en" />
      <KillSection c={c} lang="en" />
      <Overview c={c} lang="en" />
      <Wrapped c={c} />
      <Security c={c} />
      <Closing c={c} lang="en" />
      <Footer c={c} lang="en" />
    </main>
  )
}
