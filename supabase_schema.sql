-- Killsub VII - Supabase Schema
-- Spusťte tento kód v Supabase: Dashboard -> SQL Editor -> New query -> Run
-- Tento soubor odráží aktuální stav schématu (subscriptions + notifikace).

-- 1. Vytvoření tabulky pro předplatná
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CZK',
    billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- 'monthly' | 'yearly'
    next_payment_date DATE,
    category TEXT NOT NULL DEFAULT 'Ostatní'
        CHECK (category IN ('Zábava','Produktivita','AI nástroje','Úložiště','Bezpečnost','Zdraví','Finance','Ostatní')),
    last_used_at DATE, -- ručně zadané datum posledního použití, ovlivňuje zdravotní skóre
    health_score INTEGER CHECK (health_score IS NULL OR (health_score BETWEEN 1 AND 100)),
    health_score_manual BOOLEAN NOT NULL DEFAULT false, -- true = skóre zadal uživatel ručně, jinak se počítá automaticky
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Povolení Row Level Security (RLS)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Bezpečnostní politiky pro uživatele (každý má přístup jen ke svým datům)
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view their own subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can insert their own subscriptions"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can update their own subscriptions"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can delete their own subscriptions"
ON public.subscriptions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 4. Výkonnostní index
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions (user_id);

-- 5. Nastavení e-mailových notifikací (per uživatel)
CREATE TABLE IF NOT EXISTS public.notification_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  days_before INTEGER NOT NULL DEFAULT 3 CHECK (days_before IN (3, 7, 14)),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notification settings" ON public.notification_settings;
CREATE POLICY "Users can view their own notification settings"
ON public.notification_settings FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own notification settings" ON public.notification_settings;
CREATE POLICY "Users can insert their own notification settings"
ON public.notification_settings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notification settings" ON public.notification_settings;
CREATE POLICY "Users can update their own notification settings"
ON public.notification_settings FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. Log odeslaných připomínek (zapisuje pouze cron job přes service role klíč)
CREATE TABLE IF NOT EXISTS public.notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  sent_for_date DATE NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(subscription_id, sent_for_date)
);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
-- Bez veřejných politik — přístup má pouze service role (Vercel Cron Job).
