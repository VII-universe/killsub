import type { Metadata } from 'next'
import { getContent, SITE_URL } from '@/components/marketing/content'
import Nav from '@/components/marketing/Nav'
import Hero from '@/components/marketing/Hero'
import JourneyScene from '@/components/marketing/JourneyScene'
import KillSection from '@/components/marketing/KillSection'
import { Stats, Timeline, HowItWorks, Overview, Wrapped, Security, Closing, Footer } from '@/components/marketing/Sections'

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
      <JourneyScene cards={c.cards} lang="cs" sceneLabel={c.hero.a11y.scene} timeline={c.timeline} wrapped={c.wrapped.card} />
      <Nav c={c} lang="cs" />
      <Hero c={c} lang="cs" />
      <Stats c={c} />
      <Timeline c={c} lang="cs" />
      <HowItWorks c={c} lang="cs" />
      <KillSection c={c} lang="cs" />
      <Overview c={c} lang="cs" />
      <Wrapped c={c} />
      <Security c={c} />
      <Closing c={c} lang="cs" />
      <Footer c={c} lang="cs" />
    </main>
  )
}
