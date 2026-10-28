import Link from 'next/link'
import Image from 'next/image'
import type { Content, Lang } from './content'
import { ScoreFrame, CalendarFrame } from './AppFrame'

function Lines({ text }: { text: string }) {
  return <>{text.split('\n').map((l, i) => <span className="mk-line" key={i}><span className="mk-line-in" style={{ ['--i' as string]: i }}>{l}</span></span>)}</>
}

function Card({ name, price, day, lang, tone }: { name: string; price: number; day: number; lang: Lang; tone?: 'kill' }) {
  const locale = lang === 'en' ? 'en-GB' : 'cs-CZ'
  return (
    <div className="mk-dcard" data-tone={tone}>
      <span className="mk-dcard-name">{name}</span>
      <span className="mk-dcard-mark" aria-hidden="true" />
      <span className="mk-dcard-price mono">{price.toLocaleString(locale)} Kč</span>
      <span className="mk-dcard-meta mono upper">{lang === 'en' ? `monthly · renews on day ${day}` : `měsíčně · obnoví se ${day}. den`}</span>
    </div>
  )
}

export function Stats({ c }: { c: Content }) {
  return (
    <section className="mk-stats" aria-label={c.stats.eyebrow}>
      <p className="mk-eyebrow mono upper">{c.stats.eyebrow}</p>
      <ol className="mk-stats-row">
        {c.stats.items.map((s) => (
          <li key={s.value}>
            <p className="mk-stat-value"><span>{s.value}</span><span className="mk-stat-unit mono">{s.unit}</span></p>
            <p className="mk-stat-label">{s.label}</p>
            <p className="mk-stat-source mono">{s.source}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function Timeline({ c, lang }: { c: Content; lang: Lang }) {
  const t = c.timeline
  const days = Array.from({ length: 30 }, (_, i) => i + 1)
  const renewals: Record<number, { name: string; price: number }> = {}
  for (const card of c.cards) if (card.day <= 30) renewals[card.day] = { name: card.name, price: card.price }
  const CHARGE = 12
  return (
    <section className="mk-timeline" aria-labelledby="mk-timeline-h">
      <div className="mk-timeline-head">
        <p className="mk-eyebrow mono upper">{t.eyebrow}</p>
        <h2 id="mk-timeline-h" className="mk-h2"><Lines text={t.headline} /></h2>
        <p className="mk-sub">{t.sub}</p>
      </div>
      <div className="mk-month" role="img" aria-label={`${t.monthLabel}: ${t.push.title}. ${t.push.body}`}>
        <div className="mk-month-bar">
          {days.map((d) => {
            const r = renewals[d]
            const state = d === CHARGE ? 'charge' : d === CHARGE - 7 ? 'warn7' : d === CHARGE - 1 ? 'warn1' : undefined
            return (
              <div key={d} className="mk-day" data-state={state} data-has={!!r}>
                <span className="mk-day-n mono">{d}</span>
                {r && <span className="mk-day-card" title={`${r.name} · ${r.price} Kč`}><span className="mk-day-card-name">{r.name}</span></span>}
                {state === 'charge' && <span className="mk-day-tag mono upper">{t.legend[2]}</span>}
              </div>
            )
          })}
        </div>
        <div className="mk-push" style={{ ['--day' as string]: CHARGE - 7 }}>
          <span className="mk-push-app"><span className="mk-push-icon" aria-hidden="true" />{t.push.app}<span className="mk-push-when mono">{t.push.when}</span></span>
          <span className="mk-push-title">{t.push.title}</span>
          <span className="mk-push-body">{t.push.body}</span>
        </div>
        <div className="mk-push mk-push-second" style={{ ['--day' as string]: CHARGE - 1 }}>
          <span className="mk-push-app"><span className="mk-push-icon" aria-hidden="true" />{t.pushDay.app}<span className="mk-push-when mono">{t.pushDay.when}</span></span>
          <span className="mk-push-title">{t.pushDay.title}</span>
          <span className="mk-push-body">{t.pushDay.body}</span>
        </div>
      </div>
      <ul className="mk-legend mono">
        {t.legend.map((l, i) => <li key={l} data-i={i}>{l}</li>)}
      </ul>
      <p className="mk-sr-only">{lang === 'en' ? 'Sample month.' : 'Ukázkový měsíc.'}</p>
    </section>
  )
}

export function HowItWorks({ c, lang }: { c: Content; lang: Lang }) {
  const h = c.how
  return (
    <section className="mk-how" aria-labelledby="mk-how-h">
      <div className="mk-how-head">
        <p className="mk-eyebrow mono upper">{h.eyebrow}</p>
        <h2 id="mk-how-h" className="mk-h2"><Lines text={h.headline} /></h2>
      </div>
      <ol className="mk-steps">
        <li className="mk-step">
          <div className="mk-step-text">
            <span className="mk-step-n mono">{h.steps[0].n}</span>
            <h3 className="mk-h3">{h.steps[0].title}</h3>
            <p>{h.steps[0].body}</p>
            <p className="mk-step-ui mono">{h.steps[0].ui}</p>
          </div>
          <div className="mk-step-ui-box mk-phone">
            <Image src="/marketing/try-390.png" alt={lang === 'en' ? 'The add-subscription form at /try' : 'Formulář pro přidání předplatného na /try'} width={390} height={580} sizes="(max-width: 900px) 70vw, 300px" loading="eager" />
          </div>
        </li>
        <li className="mk-step">
          <div className="mk-step-text">
            <span className="mk-step-n mono">{h.steps[1].n}</span>
            <h3 className="mk-h3">{h.steps[1].title}</h3>
            <p>{h.steps[1].body}</p>
            <p className="mk-step-ui mono">{h.steps[1].ui}</p>
          </div>
          <div className="mk-step-ui-box">
            <div className="mk-push mk-push-static">
              <span className="mk-push-app"><span className="mk-push-icon" aria-hidden="true" />{c.timeline.push.app}<span className="mk-push-when mono">{c.timeline.push.when}</span></span>
              <span className="mk-push-title">{c.timeline.push.title}</span>
              <span className="mk-push-body">{c.timeline.push.body}</span>
            </div>
            <div className="mk-push mk-push-static mk-push-dim">
              <span className="mk-push-app"><span className="mk-push-icon" aria-hidden="true" />{c.timeline.pushDay.app}<span className="mk-push-when mono">{c.timeline.pushDay.when}</span></span>
              <span className="mk-push-title">{c.timeline.pushDay.title}</span>
              <span className="mk-push-body">{c.timeline.pushDay.body}</span>
            </div>
          </div>
        </li>
        <li className="mk-step">
          <div className="mk-step-text">
            <span className="mk-step-n mono">{h.steps[2].n}</span>
            <h3 className="mk-h3">{h.steps[2].title}</h3>
            <p>{h.steps[2].body}</p>
            <p className="mk-step-ui mono">{h.steps[2].ui}</p>
          </div>
          <div className="mk-step-ui-box mk-quiz-box">
            <div className="mk-quiz">
              <span className="mono upper mk-quiz-step">{h.quiz.step}</span>
              <span className="mk-quiz-q">{h.quiz.question}</span>
              <ul>{h.quiz.options.map((o, i) => <li key={o} data-on={i === 3}>{o}</li>)}</ul>
            </div>
            <ScoreFrame />
          </div>
        </li>
      </ol>
    </section>
  )
}

export function Overview({ c, lang }: { c: Content; lang: Lang }) {
  const o = c.overview
  return (
    <section className="mk-overview" aria-labelledby="mk-overview-h">
      <div className="mk-overview-head">
        <p className="mk-eyebrow mono upper">{o.eyebrow}</p>
        <h2 id="mk-overview-h" className="mk-h2"><Lines text={o.headline} /></h2>
        <p className="mk-sub">{o.sub}</p>
      </div>
      <div className="mk-overview-grid">
        <div className="mk-column" aria-label={o.columnLabel}>
          <p className="mk-column-label mono">{o.columnLabel}</p>
          <div className="mk-column-stack">
            {c.cards.slice(0, 8).map((card, i) => (
              <div className="mk-column-item" key={card.name} style={{ ['--i' as string]: i }}>
                <Card name={card.name} price={card.price} day={card.day} lang={lang} />
              </div>
            ))}
          </div>
        </div>
        <CalendarFrame />
      </div>
    </section>
  )
}

export function Wrapped({ c }: { c: Content }) {
  const w = c.wrapped
  return (
    <section className="mk-wrapped" aria-labelledby="mk-wrapped-h">
      <div className="mk-wrapped-grid">
        <div className="mk-wrapped-card" role="img" aria-label={`Killsub Wrapped ${w.card.year}: ${w.card.total} ${w.card.totalLabel}`}>
          <span className="mk-wrapped-year mono upper">Killsub Wrapped · {w.card.year}</span>
          <span className="mk-wrapped-total">{w.card.total}</span>
          <span className="mk-wrapped-total-label mono">{w.card.totalLabel}</span>
          <dl className="mk-wrapped-facts">
            <div><dt className="mono upper">{w.card.topLabel}</dt><dd>{w.card.top}</dd></div>
            <div><dt className="mono upper">{w.card.catLabel}</dt><dd>{w.card.cat}</dd></div>
            <div><dt className="mono upper">{w.card.savedLabel}</dt><dd className="mk-save">{w.card.saved}</dd></div>
            <div><dt className="mono upper">{w.card.monthsLabel}</dt><dd>{w.card.months}</dd></div>
          </dl>
          <span className="mk-dcard-mark mk-wrapped-mark" aria-hidden="true" />
        </div>
        <div className="mk-wrapped-copy">
          <p className="mk-eyebrow mono upper">{w.eyebrow}</p>
          <h2 id="mk-wrapped-h" className="mk-h2"><Lines text={w.headline} /></h2>
          <p className="mk-sub">{w.sub}</p>
        </div>
      </div>
    </section>
  )
}

export function Security({ c }: { c: Content }) {
  const s = c.security
  return (
    <section className="mk-security" aria-labelledby="mk-security-h">
      <p className="mk-eyebrow mono upper">{s.eyebrow}</p>
      <h2 id="mk-security-h" className="mk-h2 mk-h2-wide"><Lines text={s.headline} /></h2>
      <dl className="mk-facts">
        {s.facts.map((f, i) => (
          <div key={f.title} className="mk-fact">
            <dt><span className="mono mk-fact-n">0{i + 1}</span>{f.title}</dt>
            <dd>{f.body}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function Closing({ c, lang }: { c: Content; lang: Lang }) {
  const x = c.closing
  const last = c.cards[0]
  return (
    <section className="mk-closing" aria-labelledby="mk-closing-h">
      <div className="mk-closing-drain" aria-hidden="true">
        <div className="mk-closing-card"><Card name={last.name} price={last.price} day={last.day} lang={lang} /></div>
      </div>
      <p className="mk-eyebrow mono upper">{x.eyebrow}</p>
      <h2 id="mk-closing-h" className="mk-h1 mk-closing-h"><Lines text={x.headline} /></h2>
      <p className="mk-sub">{x.sub}</p>
      <div className="mk-ctas">
        <Link href="/register" className="mk-btn mk-btn-primary">{x.cta}</Link>
        <Link href="/try" className="mk-btn mk-btn-ghost">{x.ctaSecondary} <span className="arr" aria-hidden="true">→</span></Link>
      </div>
      <p className="mk-fine mono">{x.fine}</p>
    </section>
  )
}

export function Footer({ c, lang }: { c: Content; lang: Lang }) {
  const f = c.footer
  return (
    <footer className="mk-footer">
      <div className="mk-footer-brand">
        <span className="mk-nav-logo">{f.brand}</span>
        <span className="mk-footer-tag">{f.tagline}</span>
      </div>
      <nav className="mk-footer-links" aria-label={lang === 'en' ? 'Footer' : 'Patička'}>
        {f.links.map((l) => <Link key={l.href} href={l.href} className="mk-nav-link">{l.label}</Link>)}
        <Link href={f.langHref} className="mk-nav-link" hrefLang={lang === 'en' ? 'cs' : 'en'} lang={lang === 'en' ? 'cs' : 'en'}>{f.lang}</Link>
      </nav>
      <p className="mk-footer-copy mono">{f.copyright}</p>
    </footer>
  )
}
