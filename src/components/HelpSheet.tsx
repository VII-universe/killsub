'use client'

const SECTIONS = [
  {
    icon: '🏠',
    title: 'Domů',
    body: 'Přehled útrat, health score, kategorie, trendy.',
  },
  {
    icon: '📋',
    title: 'Předplatná',
    body: 'Správa, filtrování, přidání z katalogu nebo ručně.',
  },
  {
    icon: '🤖',
    title: 'AI Sken',
    body: 'Nahraj CSV/PDF výpis z banky, AI detekuje předplatná automaticky.',
  },
  {
    icon: '💡',
    title: 'Zdraví předplatného',
    body: 'Skóre 0–100 podle frekvence použití a ceny.',
  },
  {
    icon: '🎯',
    title: 'Cleanse Challenge',
    body: '30denní výzva pro zrušení zbytečných předplatných.',
  },
  {
    icon: '🎁',
    title: 'Referral',
    body: 'Pozvi přítele, získej měsíc Pro zdarma.',
  },
  {
    icon: '🎊',
    title: 'Wrapped',
    body: 'Roční přehled útrat na /wrapped.',
  },
  {
    icon: '⚡',
    title: 'Pro plán',
    body: 'Neomezená předplatná, AI sken, notifikace, pokročilé grafy.',
  },
]

export default function HelpSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col border-l border-white/10 bg-[#0b0518] p-6 shadow-2xl animate-in slide-in-from-right duration-200 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-white">Jak Killsub funguje</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/60 hover:text-white border border-white/10"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="flex items-center gap-2 text-sm font-black text-[var(--accent-primary)]">
                <span>{section.icon}</span>
                <span>{section.title}</span>
              </h3>
              <p className="mt-1 text-xs text-white/70 leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
