import Link from 'next/link'
import type { Metadata } from 'next'
import styles from './landing.module.css'
import Taxameter from './components/Taxameter'

export const metadata: Metadata = {
  title: 'Killsub — Přestaň platit za předplatná, která nepoužíváš',
  description: 'Killsub tě upozorní dřív, než tě předplatné strhne. Průměrná úspora 420 Kč měsíčně.',
}

const MARQUEE_ITEMS = [
  { name: 'Netflix',               color: '#e50914' },
  { name: 'Spotify',               color: '#1db954' },
  { name: 'Disney+',               color: '#00a8e0' },
  { name: 'ChatGPT Plus',          color: '#6c47ff' },
  { name: 'Adobe Creative Cloud',  color: '#ff6b35' },
  { name: 'Microsoft 365',         color: '#107c10' },
  { name: 'Google One',            color: '#f4b400' },
  { name: 'Claude Pro',            color: '#3d9bff' },
  { name: 'Apple One',             color: '#fa4616' },
  { name: 'Canva Pro',             color: '#ec4899' },
  { name: 'Duolingo Plus',         color: '#552bcc' },
  { name: 'Dropbox Plus',          color: '#0061fe' },
]

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.blobPink} />
      <div className={styles.blobPurple} />

      <nav className={styles.nav}>
        <Link href="/" className={styles.navLogo}>
          <div className={styles.navMark}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M7 1L9 5.5H14L10 8.5L11.5 13L7 10.2L2.5 13L4 8.5L0 5.5H5L7 1Z" fill="white"/>
            </svg>
          </div>
          Killsub
        </Link>
        <Link href="/login" className={styles.navLogin}>Přihlásit se</Link>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.taxameterRow}>
            <span className={styles.taxameterLabel}>Letos jsi zbytečně zaplatil</span>
            <Taxameter />
            <span className={styles.taxameterCurr}>Kč</span>
          </div>
          <h1 className={styles.heroH1}>
            za předplatná,<br />která nepoužíváš.
          </h1>
          <p className={styles.heroSub}>
            Killsub sleduje co platíš, upozorní tě před každým prodloužením a ukáže ti kde přeplácíš.
          </p>
        </div>
        <div className={styles.heroBottom}>
          <Link href="/register" className={styles.btnStart}>
            Začít zdarma <span className={styles.arrow}>→</span>
          </Link>
          <div className={styles.heroNote}>
            Průměrná úspora po prvním měsíci: <strong>420 Kč</strong>
          </div>
          <div className={styles.socialProof}>
            <div className={styles.socialAvs}>
              <div className={styles.socialAv} style={{ background: '#2a2d3e', border: '1.5px solid rgba(255,255,255,0.15)' }}>J</div>
              <div className={styles.socialAv} style={{ background: '#FF3B3B' }}>M</div>
              <div className={styles.socialAv} style={{ background: '#00C67A' }}>P</div>
              <div className={styles.socialAv} style={{ background: '#3d9bff' }}>K</div>
            </div>
            <span className={styles.socialText}><strong>240 lidí</strong> to už ví.<br />Ty ještě ne.</span>
          </div>
        </div>
      </section>

      <div className={styles.marqueeWrap}>
        <div className={styles.marqueeTrack}>
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className={styles.marqueeItem}>
              <span className={styles.marqueeDot} style={{ background: item.color }} />
              {item.name}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.problemStrip}>
        <div className={styles.psCell}>
          <div className={`${styles.psNum} ${styles.red}`}>38 %</div>
          <div className={styles.psLabel}>předplatných se nepoužívá,<br />přesto se platí</div>
        </div>
        <div className={styles.psCell}>
          <div className={styles.psNum}>4,2×</div>
          <div className={styles.psLabel}>průměrný počet předplatných<br />na jednoho Čecha</div>
        </div>
        <div className={styles.psCell}>
          <div className={`${styles.psNum} ${styles.red}`}>1 800</div>
          <div className={styles.psLabel}>Kč průměrný měsíční výdaj<br />za předplatná</div>
        </div>
        <div className={styles.psCell}>
          <div className={styles.psNum}>420</div>
          <div className={styles.psLabel}>Kč průměrná úspora<br />po prvním měsíci s Killsub</div>
        </div>
      </div>

      <section className={styles.how}>
        <div className={styles.howHeader}>
          <div className={styles.howTag}>Jak to funguje</div>
          <h2 className={styles.howH2}>Tři minuty.<br />Plný přehled.</h2>
        </div>
        <div className={styles.steps}>
          {[
            { n: '1', title: 'Přidej svá předplatná', body: 'Za 30 sekund zadáš název, cenu a datum prodloužení. Killsub si to pamatuje místo tebe.' },
            { n: '2', title: 'Dostávej upozornění předem', body: '7 dní a 1 den před každým prodloužením dostaneš push notifikaci. Máš čas zrušit nebo pokračovat — ne jen zaplatit.' },
            { n: '3', title: 'Nech AI analyzovat kde přeplácíš', body: 'Odpověz na 6 otázek. Killsub porovná tvé zvyky s předplatnými a řekne ti co zrušit, co zlevnit, kde platíš dvakrát za totéž.' },
          ].map((step) => (
            <div key={step.n} className={styles.step}>
              <div className={styles.stepCircle}>{step.n}</div>
              <div className={styles.stepBody}>
                <div className={styles.stepTitle}>{step.title}</div>
                <p>{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.previewSection}>
        <div className={styles.previewTag}>Přehled</div>
        <h2 className={styles.previewH2}>Vše na jednom místě</h2>
        <div className={styles.appWidget}>
          <div className={styles.widgetHeader}>
            <span className={styles.widgetTitle}>Moje předplatná</span>
            <span className={styles.widgetTotal}>Celkem <strong>1 535 Kč</strong>/měs</span>
          </div>
          <div>
            {[
              { color: '#e50914', name: 'Netflix Standard',  price: '259 Kč', days: 'za 3 dny',  soon: true },
              { color: '#1db954', name: 'Spotify Premium',   price: '169 Kč', days: 'za 12 dní', soon: false },
              { color: '#6c47ff', name: 'ChatGPT Plus',      price: '479 Kč', days: 'za 18 dní', soon: false },
              { color: '#3d9bff', name: 'Claude Pro',        price: '479 Kč', days: 'za 22 dní', soon: false },
              { color: '#107c10', name: 'Microsoft 365',     price: '149 Kč', days: 'za 28 dní', soon: false },
            ].map((sub) => (
              <div key={sub.name} className={styles.wsub}>
                <div className={styles.wsubColor} style={{ background: sub.color }} />
                <span className={styles.wsubName}>{sub.name}</span>
                <span className={styles.wsubPrice}>{sub.price}</span>
                <span className={`${styles.wsubDays} ${sub.soon ? styles.soon : styles.ok}`}>{sub.days}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.features}>
        <div className={styles.featuresHeader}>
          <div className={styles.featuresTag}>Co umí Killsub</div>
          <h2 className={styles.featuresH2}>Žádné surprise platby.<br />Nikdy víc.</h2>
        </div>
        <div className={styles.featList}>
          {[
            { glyph: '🔔', title: 'Push notifikace 7 dní předem', desc: 'Upozorníme tě na mobilu i PC. Ne až po strhnutí platby — předem, kdy ještě máš čas.', pill: '✓ Mobil + PC + web' },
            { glyph: '🤖', title: 'AI poradce: Ušetřit více', desc: '6 otázek a AI ti řekne: co zrušit, co zlevnit, kde platíš dvakrát za totéž. Konkrétní kroky, ne obecné rady.', pill: '✓ Průměrná úspora 420 Kč/měs' },
            { glyph: '📊', title: 'Jedno číslo, plný přehled', desc: 'Přidáš předplatné jednou. Pak vždy víš přesně kolik tě měsíčně stojí a co se kdy prodlužuje.', pill: null },
            { glyph: '🎁', title: 'Killsub Wrapped', desc: 'Každý rok vizuální souhrn: kolik jsi utratil, kde jsi ušetřil, co tě stálo nejvíc. Sdílej jako Spotify Wrapped.', pill: '✓ Sdílitelná karta' },
          ].map((feat) => (
            <div key={feat.title} className={styles.feat}>
              <div className={styles.featGlyph}>{feat.glyph}</div>
              <div>
                <div className={styles.featTitle}>{feat.title}</div>
                <div className={styles.featDesc}>{feat.desc}</div>
                {feat.pill && <span className={styles.featPill}>{feat.pill}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.proof}>
        <div className={styles.proofTag}>Uživatelé</div>
        <h2 className={styles.proofH2}>Co se stalo, když<br />lidé viděli svá čísla.</h2>
        <div className={styles.testimonials}>
          {[
            { quote: '"Platil jsem za Netflix i Disney+ — a díval se jen na Netflix. Killsub mi to ukázal za dvě minuty."', avBg: '#0A0C14', avLetter: 'M', name: 'Martin K.', role: 'vývojář, Praha', saving: '−259 Kč/měs' },
            { quote: '"Měla jsem tři AI nástroje. Dva se překrývaly. Teď platím za jeden a dělám stejnou práci."', avBg: '#FF3B3B', avLetter: 'P', name: 'Petra N.', role: 'freelancerka, Brno', saving: '−490 Kč/měs' },
            { quote: '"Zapomněl jsem zrušit tři trialsy. Killsub mě upozornil týden předem. Ušetřil jsem 900 Kč první měsíc."', avBg: '#00C67A', avLetter: 'T', name: 'Tomáš R.', role: 'student, Ostrava', saving: '−900 Kč/měs' },
          ].map((t) => (
            <div key={t.name} className={styles.tcard}>
              <p className={styles.tQuote}>{t.quote}</p>
              <div className={styles.tMeta}>
                <div className={styles.tAuthor}>
                  <div className={styles.tAv} style={{ background: t.avBg }}>{t.avLetter}</div>
                  <div>
                    <div className={styles.tName}>{t.name}</div>
                    <div className={styles.tRole}>{t.role}</div>
                  </div>
                </div>
                <div className={styles.tSaving}>{t.saving}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.cta}>
        <div className={styles.ctaPre}>Začni hned — je to zadarmo</div>
        <h2 className={styles.ctaH2}>Kolik platíš<br />za zbytečnosti?</h2>
        <div className={styles.ctaSaving} id="cta-counter">0&nbsp;Kč</div>
        <div className={styles.ctaSavingNote}>tolik odteklo průměrnému Čechovi letos za předplatná, která nepoužívá</div>
        <Link href="/register" className={styles.btnCta}>Zjistit to</Link>
        <div className={styles.ctaFine}>Zdarma · Žádná kreditní karta · 30 sekund</div>
      </section>

      <footer className={styles.footer}>
        <span className={styles.footerBrand}>Killsub</span>
        <div className={styles.footerLinks}>
          <Link href="/privacy">Soukromí</Link>
          <Link href="/terms">Podmínky</Link>
          <span style={{ color: 'var(--ink3)' }}>© 2025 · Česko 🇨🇿</span>
        </div>
      </footer>
    </div>
  )
}
