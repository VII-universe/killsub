# Audit obsahu landingu (M0) — 28. 10. 2026

Zdroje: kód v `src/`, produkční databáze Supabase (projekt `apps central vii`, agregované dotazy bez osobních dat), Vercel projekt `killsub`.

Stav databáze k 28. 10. 2026: **2 účty** (první registrace 24. 9. 2026), 19 předplatných, 5 označených jako zrušená (součet 965 Kč/měs), 0 web-push odběrů, 1 bankovní připojení (sandbox), 0 událostí `subscription_cancelled` v analytice.

## Tvrzení ze současného webu

| Tvrzení | Kde je | Ověření | Verdikt |
|---|---|---|---|
| „240 lidí to už ví“ | hero | DB: 2 účty | **TODO(Jakub)** — nepravdivé, z webu pryč |
| „Průměrná úspora 420 Kč“ (3× na stránce + meta description) | hero, stat strip, feature pill | žádný zdroj v kódu ani v DB; 2 uživatelé = žádný průměr | **TODO(Jakub)** — pryč, dokud nebude ≥ 30 uživatelů s reálným zrušením |
| „38 % předplatných se nepoužívá“ | stat strip | žádný zdroj | **TODO(Jakub)** — dodat studii (např. West Monroe 2021 / C+R Research 2022 jsou US data, ne ČR), jinak pryč |
| „4,2× průměrný počet předplatných na Čecha“ | stat strip | žádný zdroj | **TODO(Jakub)** — dodat zdroj, jinak pryč |
| „1 800 Kč průměrný měsíční výdaj“ | stat strip | žádný zdroj | **TODO(Jakub)** |
| „6 760 Kč“ / taxametr 8 208 Kč za rok | hero počítadlo | `Taxameter.tsx` má natvrdo `perYear = 8208` bez zdroje | **TODO(Jakub)** — nahrazeno živým součtem cen karet, které dopadly (viz níže) |
| Recenze Martin K., Petra N., Tomáš R. | sekce Uživatelé | žádná data v DB, 2 účty | **vymyšlené → smazat.** Sekce Recenze se nestaví, dokud nebudou skutečné (jméno + souhlas) |
| „Push notifikace 7 dní a 1 den předem“ | feature, kroky | `src/app/api/cron/send-reminders/route.ts`: push 7 d, 3 d, 1 d a v den platby; e-mail dle nastavení (Pro) | **OK** — přesně: „7, 3 a 1 den předem a v den platby“. Push text je skutečný: „⏰ {název} se obnovuje za týden — Dne {datum} ti strhnou {částka}. Chceš pokračovat?“ |
| „TrueLayer / FCA, read-only“ | sekce Bezpečnost | `src/utils/trueLayer.ts`: natvrdo **sandbox** hosty a mock banka `uk-cs-mock`; žádná produkční banka, žádná CZ banka | **neslibovat.** Bankovní import na web nepatří, dokud není produkční. Místo toho: import z CSV výpisu (`src/utils/bankImport.ts`, reálný) a z účtenky/e-mailu přes Gemini (`geminiExtract.ts`, reálný) |
| „AI poradce: 6 otázek“ | feature, krok 3 | `SavingsView.tsx`: kvíz 4–6 otázek (streaming, domácnost, AI, hudba, hry, využití). Doporučení jsou **pravidlová** (`savingsRecommendations.ts`, klíčová slova), žádný LLM | **přeformulovat:** „Poradce: až 6 otázek, pak co zrušit, zlevnit nebo sloučit“. Slovo „AI“ u poradce je **TODO(Jakub)** — buď ho nepoužívat, nebo poradce přepnout na model |
| Killsub Wrapped, sdílitelná karta | feature | `WrappedView.tsx` + `ShareWrappedButton.tsx` (export PNG přes html-to-image) | **OK** |
| „Zkusit bez registrace“ | hero CTA | `/try` → `GuestDemo.tsx`, veřejná route v `proxy.ts`, max 3 předplatná | **OK** |
| „Zdarma · Žádná kreditní karta · 30 sekund“ | závěr | registrace e-mail/Google bez karty; Stripe jen u Pro | **OK** (bez „30 sekund“, neměřeno) |
| Cleanse challenge, badges, detox, připomínky | brief | `CleanseChallenge.tsx`, `badges.ts`, `DetoxView.tsx`, `RemindersWidget.tsx` | **OK** |
| Loga a barvy značek v marquee a widgetu | marquee, přehled | pravidlo 4 | **pryč** — jen názvy jako text |

## Co nahrazuje hero číslo

Hero počítadlo nesčítá žádnou statistiku. Sčítá **měsíční ceny karet, které v animaci dopadly** (živě, od načtení stránky). Ceny karet jsou převzaté z ukázkových dat aplikace (`src/utils/demoData.ts`) a doplněné běžnými CZ cenami; pod číslem je mono popisek „Ukázková předplatná · ceny v Kč za měsíc“. Jakmile bude existovat ověřené číslo (např. medián měsíčních výdajů uživatelů Killsubu při ≥ 100 účtech), přepne se v `content/cs.json`.

## Technické nálezy mimo texty

1. `src/proxy.ts` volá `supabase.auth.getUser()` i pro `/` a `/try` → landing dnes **volá Supabase při každém requestu**. Návrh: vyjmout `/` a `/en` z matcheru proxy (změna v app kódu — **čeká na schválení**).
2. Root layout (`src/app/layout.tsx`) má `userScalable: false, maximumScale: 1` → porušuje WCAG 1.4.4. Marketingový layout to přepisuje vlastním `viewport` exportem.
3. Root layout má `themeColor #ec4899` a `data-theme="neon"`; marketingový layout nastavuje vlastní pozadí `#0A0A0C`.
4. `sitemap.ts` neobsahuje `/en` ani `/try` — doplní se v M2 (je to app soubor, drobná změna, hlásím).
5. Rozpočet: `three` 131 kB gzip; Rapier 3D 0.21 **1 169 kB gzip** (wasm), compat build 1 653 kB gzip. Limit 400 kB z bodu 5 s Rapierem nejde splnit — viz otázky v M0 reportu.
