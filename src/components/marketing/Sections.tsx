import Link from 'next/link'
import Image from 'next/image'
import type { Content, Lang } from './content'
import { ScoreFrame, CalendarFrame } from './AppFrame'
import FlapNumber from './FlapNumber'

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
      <p className="mk-eyebrow mono upper" data-reveal="type">{c.stats.eyebrow}</p>
      <ol className="mk-stats-row" data-reveal="block" data-group>
        {c.stats.items.map((s) => (
          <li key={s.value}>
            <p className="mk-stat-value">
              {/^\d+$/.test(s.value) ? <FlapNumber value={Number(s.value)} locale="cs-CZ" label={s.value} /> : <span data-reveal="type">{s.value}</span>}
              <span className="mk-stat-unit mono" data-reveal="type">{s.unit}</span>
            </p>
            <p className="mk-stat-label" data-reveal="lines">{s.label}</p>
            <p className="mk-stat-source mono" data-reveal="type">{s.source}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function Timeline({ c, lang }: { c: Content; lang: Lang }) {
  const t = c.timeline
  return (
    <section className="mk-timeline" aria-labelledby="mk-timeline-h">
      <div className="mk-timeline-sticky">
        <div className="mk-timeline-head">
          <p className="mk-eyebrow mono upper" data-reveal="type">{t.eyebrow}</p>
          <h2 id="mk-timeline-h" className="mk-h2" data-reveal="lines"><Lines text={t.headline} /></h2>
          <p className="mk-sub" data-reveal="lines">{t.sub}</p>
        </div>
        <ul className="mk-legend mono">
          {t.legend.map((l, i) => <li key={l} data-i={i}>{l}</li>)}
        </ul>
        <p className="mk-sr-only">{lang === 'en' ? 'Sample month: cards stand on their renewal days; a notification catches each one seven days before.' : 'Ukázkový měsíc: karty stojí na dnech obnovy, notifikace každou zachytí sedm dní předem.'}</p>
      </div>
    </section>
  )
}

export function HowItWorks({ c, lang }: { c: Content; lang: Lang }) {
  const h = c.how
  return (
    <section className="mk-how" aria-labelledby="mk-how-h">
      <div className="mk-how-head">
        <p className="mk-eyebrow mono upper" data-reveal="type">{h.eyebrow}</p>
        <h2 id="mk-how-h" className="mk-h2" data-reveal="lines"><Lines text={h.headline} /></h2>
      </div>
      <ol className="mk-steps">
        <li className="mk-step" data-reveal="block">
          <div className="mk-step-text">
            <span className="mk-step-n mono">{h.steps[0].n}</span>
            <h3 className="mk-h3" data-reveal="lines">{h.steps[0].title}</h3>
            <p>{h.steps[0].body}</p>
            <p className="mk-step-ui mono">{h.steps[0].ui}</p>
          </div>
          <div className="mk-step-ui-box mk-phone" data-tilt>
            <Image src="/marketing/try-390.png" alt={lang === 'en' ? 'The add-subscription form at /try' : 'Formulář pro přidání předplatného na /try'} width={390} height={580} sizes="(max-width: 900px) 70vw, 300px" loading="eager" />
          </div>
        </li>
        <li className="mk-step" data-reveal="block">
          <div className="mk-step-text">
            <span className="mk-step-n mono">{h.steps[1].n}</span>
            <h3 className="mk-h3" data-reveal="lines">{h.steps[1].title}</h3>
            <p>{h.steps[1].body}</p>
            <p className="mk-step-ui mono">{h.steps[1].ui}</p>
          </div>
          <div className="mk-step-ui-box">
            <div className="mk-push mk-push-static" data-tilt>
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
        <li className="mk-step" data-reveal="block">
          <div className="mk-step-text">
            <span className="mk-step-n mono">{h.steps[2].n}</span>
            <h3 className="mk-h3" data-reveal="lines">{h.steps[2].title}</h3>
            <p>{h.steps[2].body}</p>
            <p className="mk-step-ui mono">{h.steps[2].ui}</p>
          </div>
          <div className="mk-step-ui-box mk-quiz-box">
            <div className="mk-quiz" data-tilt>
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
        <p className="mk-eyebrow mono upper" data-reveal="type">{o.eyebrow}</p>
        <h2 id="mk-overview-h" className="mk-h2" data-reveal="lines"><Lines text={o.headline} /></h2>
        <p className="mk-sub" data-reveal="lines">{o.sub}</p>
      </div>
      <div className="mk-overview-grid">
        <div className="mk-column" aria-label={o.columnLabel}>
          <p className="mk-column-label mono" data-reveal="type">{o.columnLabel}</p>
          <div className="mk-column-stack" aria-hidden="true" />
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
        <div className="mk-wrapped-slot" role="img" aria-label={`Killsub Wrapped ${w.card.year}: ${w.card.total} ${w.card.totalLabel}`}>
          <div className="mk-wrapped-card" data-static>
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
        </div>
        <div className="mk-wrapped-copy">
          <p className="mk-eyebrow mono upper" data-reveal="type">{w.eyebrow}</p>
          <h2 id="mk-wrapped-h" className="mk-h2" data-reveal="lines"><Lines text={w.headline} /></h2>
          <p className="mk-sub" data-reveal="lines">{w.sub}</p>
        </div>
      </div>
    </section>
  )
}

export function Security({ c }: { c: Content }) {
  const s = c.security
  return (
    <section className="mk-security" aria-labelledby="mk-security-h">
      <p className="mk-eyebrow mono upper" data-reveal="type">{s.eyebrow}</p>
      <h2 id="mk-security-h" className="mk-h2 mk-h2-wide" data-reveal="lines"><Lines text={s.headline} /></h2>
      <dl className="mk-facts" data-reveal="block" data-group>
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
  return (
    <section className="mk-closing" aria-labelledby="mk-closing-h">
      <div className="mk-closing-drain" aria-hidden="true" />
      <p className="mk-eyebrow mono upper" data-reveal="type">{x.eyebrow}</p>
      <h2 id="mk-closing-h" className="mk-h1 mk-closing-h" data-reveal="lines"><Lines text={x.headline} /></h2>
      <p className="mk-sub" data-reveal="lines">{x.sub}</p>
      <div className="mk-ctas">
        <Link href="/register" className="mk-btn mk-btn-primary">{x.cta}</Link>
        <Link href="/try" className="mk-btn mk-btn-ghost">{x.ctaSecondary} <span className="arr" aria-hidden="true">→</span></Link>
      </div>
      <p className="mk-fine mono" data-reveal="type">{x.fine}</p>
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
      <p className="mk-footer-copy mono">{f.copyright} · {f.operator}</p>
    </footer>
  )
}
