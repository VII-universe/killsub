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

-- 7. Profily uživatelů — plán (Free/Pro), Stripe napojení, referral program
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_expires_at TIMESTAMPTZ,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by TEXT REFERENCES public.user_profiles(referral_code),
  referral_reward_granted BOOLEAN NOT NULL DEFAULT false, -- zabraňuje opakovanému přiznání odměny referrerovi
  is_public BOOLEAN NOT NULL DEFAULT false, -- zveřejnění anonymního přehledu na /u/[referral_code]
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS user_profiles_referral_code_idx ON public.user_profiles (referral_code);
CREATE INDEX IF NOT EXISTS user_profiles_stripe_customer_id_idx ON public.user_profiles (stripe_customer_id);

-- Generuje unikátní 8znakový referral kód (bez matoucích znaků 0/O, 1/I).
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE referral_code = code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN code;
END;
$$;

-- Automaticky založí user_profiles řádek pro každého nového uživatele (heslo i Google OAuth).
-- referred_by se převezme z raw_user_meta_data.ref (nastaveno při e-mail/heslo registraci);
-- pro OAuth se referred_by doplňuje dodatečně v /auth/callback.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_code TEXT;
  ref_is_valid BOOLEAN := false;
BEGIN
  ref_code := NEW.raw_user_meta_data->>'ref';

  IF ref_code IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE referral_code = ref_code) INTO ref_is_valid;
  END IF;

  INSERT INTO public.user_profiles (user_id, referral_code, referred_by)
  VALUES (
    NEW.id,
    public.generate_referral_code(),
    CASE WHEN ref_is_valid THEN ref_code ELSE NULL END
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- handle_new_user je pouze trigger funkce — nesmí jít volat přímo přes PostgREST RPC.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile"
ON public.user_profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile"
ON public.user_profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Column-level zámek: i když RLS politika pokrývá celý řádek, sloupcová oprávnění
-- zajišťují, že přihlášený uživatel může přes API měnit pouze is_public —
-- nikdy plan/stripe_customer_id/stripe_subscription_id/plan_expires_at (ty mění jen webhook přes service role).
REVOKE UPDATE ON public.user_profiles FROM authenticated;
GRANT UPDATE (is_public) ON public.user_profiles TO authenticated;

-- 8. Import token pro přeposílání faktur e-mailem (import-<token>@killsub.app)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS import_token TEXT UNIQUE
  DEFAULT encode(gen_random_bytes(12), 'hex');

CREATE INDEX IF NOT EXISTS user_profiles_import_token_idx
  ON public.user_profiles (import_token);
