export default function BankExpiryBanner({
  warning,
}: {
  warning: { expired: boolean; daysLeft: number }
}) {
  const alreadyExpired = warning.daysLeft <= 0

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3.5">
      <span className="text-lg">⚠️</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-orange-300">
          {alreadyExpired
            ? 'Přístup k bance vypršel. Klikněte pro obnovení.'
            : `Přístup k vaší bance vyprší za ${warning.daysLeft} ${warning.daysLeft === 1 ? 'den' : warning.daysLeft < 5 ? 'dny' : 'dní'}. Obnovte připojení kliknutím zde.`}
        </p>
      </div>
      <a
        href="/api/bank/connect"
        className="shrink-0 rounded-full border border-orange-400/40 bg-orange-500/20 px-3 py-1.5 text-[11px] font-bold text-orange-200 hover:bg-orange-500/30"
      >
        Obnovit připojení
      </a>
    </div>
  )
}
