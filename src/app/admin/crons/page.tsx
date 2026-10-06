import vercelConfig from '../../../../vercel.json'
import { getLatestCronLogs } from '@/utils/adminData'
import RunCronButton from '@/components/RunCronButton'

function cronNameFromPath(path: string): string {
  return path.replace('/api/cron/', '')
}

export default async function AdminCronsPage() {
  const logs = await getLatestCronLogs()
  const crons = vercelConfig.crons as { path: string; schedule: string }[]

  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-xl font-black">Crony</h1>

      <div className="space-y-3">
        {crons.map((cron) => {
          const name = cronNameFromPath(cron.path)
          const log = logs[name]
          return (
            <div key={cron.path} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">{name}</p>
                  <p className="font-mono text-[11px] text-white/40">
                    {cron.path} · {cron.schedule}
                  </p>
                </div>
                <RunCronButton name={name} />
              </div>

              {log ? (
                <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-2.5 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-md px-1.5 py-0.5 font-black uppercase tracking-wider ${
                        log.status === 'error'
                          ? 'bg-rose-500/15 text-rose-300'
                          : 'bg-emerald-500/15 text-emerald-300'
                      }`}
                    >
                      {log.status || '—'}
                    </span>
                    <span className="text-white/40">{new Date(log.ranAt).toLocaleString('cs-CZ')}</span>
                  </div>
                  {log.message && <p className="mt-1.5 text-white/60">{log.message}</p>}
                </div>
              ) : (
                <p className="mt-3 text-[11px] text-white/30">Zatím žádný záznam o běhu.</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
