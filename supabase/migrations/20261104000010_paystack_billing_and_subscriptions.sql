-- Paystack Subscriptions, Plan Pricing & Transaction Ledger with Forced RLS

CREATE TABLE IF NOT EXISTS public.billing_plan_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  paywall_enabled boolean NOT NULL DEFAULT true,
  free_daily_ai_messages integer NOT NULL DEFAULT 6 CHECK (free_daily_ai_messages >= 0 AND free_daily_ai_messages <= 200),
  free_daily_photo_snaps integer NOT NULL DEFAULT 2 CHECK (free_daily_photo_snaps >= 0 AND free_daily_photo_snaps <= 50),
  free_max_exam_questions integer NOT NULL DEFAULT 10 CHECK (free_max_exam_questions >= 1 AND free_max_exam_questions <= 100),
  price_7d_ngn integer NOT NULL DEFAULT 2000 CHECK (price_7d_ngn >= 100),
  price_30d_ngn integer NOT NULL DEFAULT 3500 CHECK (price_30d_ngn >= 100),
  price_90d_ngn integer NOT NULL DEFAULT 10000 CHECK (price_90d_ngn >= 100),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.billing_plan_settings (
  id, paywall_enabled, free_daily_ai_messages, free_daily_photo_snaps, free_max_exam_questions,
  price_7d_ngn, price_30d_ngn, price_90d_ngn
)
VALUES (1, true, 6, 2, 10, 2000, 3500, 10000)
ON CONFLICT (id) DO UPDATE SET
  price_7d_ngn = 2000,
  price_30d_ngn = 3500,
  price_90d_ngn = 10000,
  updated_at = now();

ALTER TABLE public.billing_plan_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_plan_settings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_read_billing_plan_settings" ON public.billing_plan_settings;
CREATE POLICY "allow_read_billing_plan_settings"
  ON public.billing_plan_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "allow_admin_update_billing_plan_settings" ON public.billing_plan_settings;
CREATE POLICY "allow_admin_update_billing_plan_settings"
  ON public.billing_plan_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE TABLE IF NOT EXISTS public.student_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_code text NOT NULL CHECK (plan_code IN ('free', 'pass_7d', 'pass_30d', 'pass_90d', 'admin_vip')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'canceled')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  source text NOT NULL DEFAULT 'paystack' CHECK (source IN ('paystack', 'admin_grant')),
  last_payment_reference text,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_subscriptions_user_expires
  ON public.student_subscriptions(user_id, status, expires_at DESC);

ALTER TABLE public.student_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subscriptions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_read_own_or_admin_read_all_subscriptions" ON public.student_subscriptions;
CREATE POLICY "students_read_own_or_admin_read_all_subscriptions"
  ON public.student_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  plan_code text NOT NULL CHECK (plan_code IN ('pass_7d', 'pass_30d', 'pass_90d')),
  amount_ngn integer NOT NULL CHECK (amount_ngn > 0),
  amount_kobo bigint NOT NULL CHECK (amount_kobo > 0),
  currency text NOT NULL DEFAULT 'NGN',
  provider text NOT NULL DEFAULT 'paystack',
  reference text NOT NULL UNIQUE,
  access_code text,
  authorization_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'abandoned')),
  channel text,
  paid_at timestamptz,
  verified_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_created
  ON public.payment_transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status_created
  ON public.payment_transactions(status, created_at DESC);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_read_own_or_admin_read_all_transactions" ON public.payment_transactions;
CREATE POLICY "students_read_own_or_admin_read_all_transactions"
  ON public.payment_transactions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
