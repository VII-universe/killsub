import { createAdminClient } from './supabase/admin'

export async function logCronRun(
  cronName: string,
  status: 'success' | 'error',
  message: string,
  usersAffected = 0
): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('cron_logs').insert({ cron_name: cronName, status, message, users_affected: usersAffected })
  } catch {
    // Logging must never break the cron's actual job — best-effort only.
  }
}
