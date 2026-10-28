import Link from 'next/link'
import type { Content } from './content'

export default function Nav({ c, lang }: { c: Content; lang: 'cs' | 'en' }) {
  const home = lang === 'en' ? '/en' : '/'
  return (
    <nav className="mk-nav" aria-label={lang === 'en' ? 'Main' : 'Hlavní'}>
      <Link href={home} className="mk-nav-logo" aria-label="Killsub">
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <circle cx="9" cy="9" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M5.6 5.6l6.8 6.8M12.4 5.6l-6.8 6.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        Killsub
      </Link>
      <div className="mk-nav-links">
        <Link href={c.nav.langHref} className="mk-nav-link mono" hrefLang={lang === 'en' ? 'cs' : 'en'} lang={lang === 'en' ? 'cs' : 'en'}>{c.nav.lang}</Link>
        <Link href="/login" className="mk-nav-link hide-mobile">{c.nav.login}</Link>
        <Link href="/register" className="mk-nav-cta">{c.nav.start}</Link>
      </div>
    </nav>
  )
}
