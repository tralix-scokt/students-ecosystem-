-- Enforce Free Starter vs TRALIX Pro AI & Photo Vision Quotas Atomically in Postgres

ALTER TABLE public.ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_feature_check;

ALTER TABLE public.ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_feature_check
  CHECK (feature = ANY (ARRAY[
    'tutor'::text,
    'tutor_photo'::text,
    'exam_generation'::text,
    'exam_explanation'::text,
    'exam_written_feedback'::text,
    'revision_plan'::text
  ]));

DROP FUNCTION IF EXISTS public.reserve_student_ai_quota_slot(text, text, text);
DROP FUNCTION IF EXISTS public.reserve_student_ai_quota_slot(text, text, text, boolean);

CREATE OR REPLACE FUNCTION public.reserve_student_ai_quota_slot(
  p_feature text,
  p_provider text DEFAULT 'openai'::text,
  p_model text DEFAULT 'gpt-4o-mini'::text,
  p_has_image boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_settings public.ai_system_settings%ROWTYPE;
  v_billing public.billing_plan_settings%ROWTYPE;
  v_is_admin boolean := false;
  v_has_active_sub boolean := false;
  v_is_pro boolean := false;
  v_daily_limit integer := 60;
  v_free_msg_limit integer := 6;
  v_free_photo_limit integer := 2;
  v_max_tokens integer := 1100;
  v_default_provider text := 'openai';
  v_default_model text := 'gpt-4o-mini';
  v_fallback_model text := 'openai/gpt-4o-mini';
  v_used_today integer := 0;
  v_photo_used_today integer := 0;
  v_feature text;
  v_log_id uuid;
  v_utc_day_start timestamptz := date_trunc('day', timezone('utc', now()));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  v_feature := CASE
    WHEN p_has_image AND p_feature = 'tutor' THEN 'tutor_photo'
    WHEN p_feature IN ('tutor', 'tutor_photo', 'exam_generation', 'exam_explanation', 'exam_written_feedback', 'revision_plan')
    THEN p_feature
    ELSE 'tutor'
  END;

  PERFORM pg_advisory_xact_lock(hashtextextended('ai_quota:' || v_uid::text, 0));

  UPDATE public.ai_usage_logs
  SET status = 'error',
      error_code = 'STALE_IN_FLIGHT_TIMEOUT'
  WHERE user_id = v_uid
    AND status = 'success'
    AND error_code = 'IN_FLIGHT_RESERVATION'
    AND created_at < (timezone('utc', now()) - interval '2 minutes');

  SELECT * INTO v_settings
  FROM public.ai_system_settings
  WHERE id = 1;

  IF FOUND THEN
    IF v_settings.ai_enabled = false THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'paused'
      );
    END IF;
    v_daily_limit := COALESCE(v_settings.daily_request_limit_per_student, 60);
    v_max_tokens := LEAST(GREATEST(COALESCE(v_settings.max_tokens_per_response, 1100), 128), 2048);
    v_default_provider := COALESCE(v_settings.default_provider, 'openai');
    v_default_model := COALESCE(v_settings.default_model, 'gpt-4o-mini');
    v_fallback_model := COALESCE(v_settings.fallback_model, 'openai/gpt-4o-mini');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_uid AND p.role = 'admin'
  ) INTO v_is_admin;

  SELECT * INTO v_billing
  FROM public.billing_plan_settings
  WHERE id = 1;

  IF FOUND THEN
    v_free_msg_limit := COALESCE(v_billing.free_daily_ai_messages, 6);
    v_free_photo_limit := COALESCE(v_billing.free_daily_photo_snaps, 2);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.student_subscriptions s
    WHERE s.user_id = v_uid
      AND s.status = 'active'
      AND s.expires_at > timezone('utc', now())
  ) INTO v_has_active_sub;

  v_is_pro := v_is_admin OR (NOT COALESCE(v_billing.paywall_enabled, true)) OR v_has_active_sub;

  IF NOT v_is_pro THEN
    IF v_feature IN ('exam_explanation', 'revision_plan', 'exam_generation') THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'paywall_required',
        'paywallFeature', v_feature,
        'isPro', false,
        'message', 'AI Exam Correction Walkthroughs, Custom AI Mock Generation, and 5-Day Revision Plans require TRALIX Pro (₦2,000 for 7 days, ₦3,500/month, or ₦10,000 for 90 days).'
      );
    END IF;

    IF v_feature = 'tutor_photo' THEN
      SELECT COUNT(*)::integer INTO v_photo_used_today
      FROM public.ai_usage_logs
      WHERE user_id = v_uid
        AND feature = 'tutor_photo'
        AND status = 'success'
        AND created_at >= v_utc_day_start;

      IF v_photo_used_today >= v_free_photo_limit THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'reason', 'paywall_required',
          'paywallFeature', 'photo_snap',
          'isPro', false,
          'dailyLimit', v_free_photo_limit,
          'usedToday', v_photo_used_today,
          'message', format('You have used all %s free AI Photo Snaps for today. Upgrade to TRALIX Pro (₦2,000 for 7 days or ₦3,500/month) for unlimited Snap-and-Solve Vision!', v_free_photo_limit)
        );
      END IF;
    END IF;

    SELECT COUNT(*)::integer INTO v_used_today
    FROM public.ai_usage_logs
    WHERE user_id = v_uid
      AND status = 'success'
      AND created_at >= v_utc_day_start;

    IF v_used_today >= v_free_msg_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'paywall_required',
        'paywallFeature', 'daily_ai_messages',
        'isPro', false,
        'dailyLimit', v_free_msg_limit,
        'usedToday', v_used_today,
        'message', format('You have used all %s free AI Tutor messages for today. Unlock unlimited 24/7 AI Tutoring with a 7-Day Cram Pass (₦2,000), Monthly Pro (₦3,500), or 90-Day Season Pass (₦10,000)!', v_free_msg_limit)
      );
    END IF;

    v_daily_limit := v_free_msg_limit;
  ELSE
    SELECT COUNT(*)::integer INTO v_used_today
    FROM public.ai_usage_logs
    WHERE user_id = v_uid
      AND status = 'success'
      AND created_at >= (timezone('utc', now()) - interval '24 hours');

    IF v_used_today >= v_daily_limit THEN
      INSERT INTO public.ai_usage_logs (
        user_id, feature, provider, model, status, latency_ms, error_code
      ) VALUES (
        v_uid,
        v_feature,
        COALESCE(NULLIF(btrim(p_provider), ''), v_default_provider),
        COALESCE(NULLIF(btrim(p_model), ''), v_default_model),
        'rate_limited',
        0,
        'DAILY_QUOTA_REACHED'
      );

      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'quota_exceeded',
        'dailyLimit', v_daily_limit,
        'usedToday', v_used_today
      );
    END IF;
  END IF;

  INSERT INTO public.ai_usage_logs (
    user_id,
    feature,
    provider,
    model,
    prompt_tokens,
    completion_tokens,
    total_tokens,
    status,
    error_code
  ) VALUES (
    v_uid,
    v_feature,
    COALESCE(NULLIF(btrim(p_provider), ''), v_default_provider),
    COALESCE(NULLIF(btrim(p_model), ''), v_default_model),
    0,
    0,
    0,
    'success',
    'IN_FLIGHT_RESERVATION'
  )
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'isPro', v_is_pro,
    'logId', v_log_id,
    'dailyLimit', v_daily_limit,
    'usedToday', v_used_today + 1,
    'remainingAfter', GREATEST(0, v_daily_limit - (v_used_today + 1)),
    'maxTokens', v_max_tokens,
    'preferredProvider', v_default_provider,
    'defaultModel', v_default_model,
    'fallbackModel', v_fallback_model
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.reserve_student_ai_quota_slot(text, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_student_ai_quota_slot(text, text, text, boolean) TO authenticated, service_role;
