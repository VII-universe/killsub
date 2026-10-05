export default function BankConnectButton({ hasExisting }: { hasExisting?: boolean }) {
  return (
    <a
      href="/api/bank/connect"
      className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-left text-sm text-white/80 hover:bg-white/10"
    >
      <span className="text-lg">🏦</span>
      <div>
        <p className="font-medium text-white">{hasExisting ? 'Přidat další banku' : 'Propojit banku'}</p>
        <p className="text-xs text-white/50">
          {hasExisting
            ? 'Propoj další bankovní účet stejným způsobem'
            : 'Automaticky najdi předplatná v bankovních transakcích'}
        </p>
      </div>
    </a>
  )
}
