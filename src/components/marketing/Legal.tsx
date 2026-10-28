import Link from 'next/link'
import type { Lang } from './content'

/* DRAFT legal pages for Jakub's review. Not indexed. Bracketed items need real data. */

const CS = {
  privacy: {
    title: 'Ochrana soukromí',
    updated: 'Návrh k revizi · 28. 10. 2026',
    sections: [
      ['Kdo data zpracovává', 'Správcem osobních údajů je [název provozovatele, IČO, sídlo]. Kontakt: [e-mail].'],
      ['Co ukládáme', 'E-mail a jméno z registrace (e-mail nebo Google). Předplatná, která si zadáš: název, cenu, datum obnovy, poznámky. Nastavení notifikací a zařízení pro push. U plánu Pro údaje o platbě zpracovává Stripe, Killsub kartu nevidí.'],
      ['Proč', 'Abychom ti ukázali přehled, poslali upozornění před platbou a vedli účet. Právním základem je plnění smlouvy a oprávněný zájem na provozu služby.'],
      ['Kde', 'Databáze běží u Supabase v regionu EU (Frankfurt). E-maily odesílá Resend, hosting zajišťuje Vercel. S bankou Killsub propojený není.'],
      ['Jak dlouho', 'Po dobu existence účtu. Po smazání účtu data odstraníme do 30 dnů, s výjimkou účetních dokladů u plánu Pro.'],
      ['Tvoje práva', 'Přístup, oprava, výmaz, přenos (export CSV v aplikaci), námitka. Napiš na [e-mail]. Stížnost lze podat u Úřadu pro ochranu osobních údajů.'],
      ['Cookies', 'Používáme jen technické cookies pro přihlášení a uložení jazyka. Žádné reklamní ani sledovací.'],
    ],
  },
  terms: {
    title: 'Podmínky použití',
    updated: 'Návrh k revizi · 28. 10. 2026',
    sections: [
      ['Služba', 'Killsub je nástroj pro evidenci předplatných a upozornění před platbou. Provozuje ho [název provozovatele, IČO, sídlo].'],
      ['Účet', 'Registrace e-mailem nebo přes Google. Za obsah účtu odpovídáš ty. Účet můžeš kdykoli zrušit.'],
      ['Free a Pro', 'Free hlídá až 5 předplatných. Pro stojí 149 Kč měsíčně nebo 1 290 Kč ročně, platí se přes Stripe a lze ho kdykoli zrušit v nastavení. Zrušení platí od dalšího období.'],
      ['Co Killsub není', 'Killsub předplatná neruší za tebe a nemá přístup k tvé bance. Upozornění jsou pomůcka, ne záruka. Za platby třetím stranám neodpovídáme.'],
      ['Dostupnost', 'Službu poskytujeme tak, jak je. Můžeme ji měnit nebo ukončit s předstihem 30 dnů; data si předtím můžeš exportovat.'],
      ['Právo', 'Řídí se právem České republiky. Spotřebitelské spory řeší Česká obchodní inspekce (coi.cz).'],
    ],
  },
}

const EN = {
  privacy: {
    title: 'Privacy',
    updated: 'Draft for review · 28 Oct 2026',
    sections: [
      ['Who processes your data', 'The controller is [operator name, company ID, registered office]. Contact: [e-mail].'],
      ['What we store', 'Your e-mail and name from sign-up (e-mail or Google). The subscriptions you enter: name, price, renewal date, notes. Notification settings and push devices. On Pro, payment details are handled by Stripe; Killsub never sees your card.'],
      ['Why', 'To show your overview, send reminders before a charge and run your account. The legal bases are performance of a contract and our legitimate interest in operating the service.'],
      ['Where', 'The database runs at Supabase in the EU (Frankfurt). E-mails go out via Resend, hosting is Vercel. Killsub is not connected to your bank.'],
      ['How long', 'For as long as your account exists. After deletion, data is removed within 30 days, except accounting records for Pro.'],
      ['Your rights', 'Access, correction, erasure, portability (CSV export in the app), objection. Write to [e-mail]. You may complain to the Czech Office for Personal Data Protection.'],
      ['Cookies', 'Only technical cookies for sign-in and language. No advertising or tracking cookies.'],
    ],
  },
  terms: {
    title: 'Terms of use',
    updated: 'Draft for review · 28 Oct 2026',
    sections: [
      ['The service', 'Killsub is a tool for tracking subscriptions and getting reminders before a charge. It is operated by [operator name, company ID, registered office].'],
      ['Your account', 'Sign up with e-mail or Google. You are responsible for what you store. You can delete the account at any time.'],
      ['Free and Pro', 'Free tracks up to 5 subscriptions. Pro costs 149 Kč a month or 1,290 Kč a year, is billed through Stripe and can be cancelled in settings at any time, effective from the next period.'],
      ['What Killsub is not', 'Killsub does not cancel subscriptions for you and has no access to your bank. Reminders are a help, not a guarantee. We are not liable for payments to third parties.'],
      ['Availability', 'The service is provided as is. We may change or discontinue it with 30 days’ notice; you can export your data before that.'],
      ['Law', 'Governed by the law of the Czech Republic. Consumer disputes: Czech Trade Inspection Authority (coi.cz).'],
    ],
  },
}

export default function Legal({ lang, kind }: { lang: Lang; kind: 'privacy' | 'terms' }) {
  const d = (lang === 'en' ? EN : CS)[kind]
  return (
    <main className="mk-legal" lang={lang}>
      <p className="mk-legal-draft mono upper">{lang === 'en' ? 'Draft · not in force' : 'Návrh · zatím neplatí'}</p>
      <h1 className="mk-h2">{d.title}</h1>
      <p className="mono mk-legal-updated">{d.updated}</p>
      {d.sections.map(([h, body]) => (
        <section key={h}>
          <h2 className="mk-h3">{h}</h2>
          <p>{body}</p>
        </section>
      ))}
      <p><Link href={lang === 'en' ? '/en' : '/'} className="mk-nav-link">← Killsub</Link></p>
    </main>
  )
}
