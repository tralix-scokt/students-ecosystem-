-- ============================================================================
-- Migration: 20261102000009_aloc_station_v1_upgrade.sql
-- Purpose:
--   1. Update default ALOC Past-Questions API base_url to ALOC Station v1
--      (https://dev.aloc.com.ng/api/v1) using X-API-Key authentication.
--   2. Add History & Insurance subjects for WAEC so all 15 ALOC Station
--      catalog subjects are selectable in Admin and Student CBT.
-- ============================================================================

ALTER TABLE public.admin_integration_secrets
  ALTER COLUMN base_url SET DEFAULT 'https://dev.aloc.com.ng/api/v1';

UPDATE public.admin_integration_secrets
SET
  display_name = 'ALOC Station Nigerian Past Questions API (JAMB / WAEC / NECO)',
  base_url = 'https://dev.aloc.com.ng/api/v1',
  updated_at = now()
WHERE provider_key = 'aloc';

CREATE OR REPLACE FUNCTION public.admin_get_past_questions_api_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.admin_integration_secrets%ROWTYPE;
  v_has_secret boolean := false;
  v_masked text := null;
  v_past_counts jsonb := '{}'::jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Administrator privileges required.';
  END IF;

  SELECT *
  INTO v_row
  FROM public.admin_integration_secrets
  WHERE provider_key = 'aloc';

  IF FOUND AND length(trim(v_row.secret_token)) >= 8 THEN
    v_has_secret := true;
    v_masked := left(trim(v_row.secret_token), 5) || '••••' || right(trim(v_row.secret_token), 4);
  END IF;

  SELECT COALESCE(
    jsonb_object_agg(cat_code, q_count),
    '{}'::jsonb
  )
  INTO v_past_counts
  FROM (
    SELECT c.code AS cat_code, count(q.id)::int AS q_count
    FROM public.exam_categories c
    LEFT JOIN public.exam_questions q
      ON q.exam_category_id = c.id
     AND q.origin_type = 'authorized_past_question'
     AND q.is_published = true
    WHERE c.code IN ('WAEC', 'NECO', 'JAMB_UTME')
    GROUP BY c.code
  ) t;

  RETURN jsonb_build_object(
    'providerKey', 'aloc',
    'displayName', COALESCE(v_row.display_name, 'ALOC Station Nigerian Past Questions API (JAMB / WAEC / NECO)'),
    'baseUrl', COALESCE(v_row.base_url, 'https://dev.aloc.com.ng/api/v1'),
    'configured', v_has_secret,
    'maskedToken', v_masked,
    'updatedAt', v_row.updated_at,
    'pastQuestionCounts', v_past_counts
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_past_questions_api_config(
  p_access_token text,
  p_base_url text DEFAULT 'https://dev.aloc.com.ng/api/v1'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_token text := trim(COALESCE(p_access_token, ''));
  v_clean_url text := regexp_replace(trim(COALESCE(NULLIF(trim(p_base_url), ''), 'https://dev.aloc.com.ng/api/v1')), '/+$', '');
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Administrator privileges required.';
  END IF;

  IF length(v_clean_token) < 8 THEN
    RAISE EXCEPTION 'Please provide a valid ALOC Station API key (starting with aloc_).';
  END IF;

  INSERT INTO public.admin_integration_secrets (
    provider_key,
    display_name,
    base_url,
    secret_token,
    updated_by,
    updated_at
  )
  VALUES (
    'aloc',
    'ALOC Station Nigerian Past Questions API (JAMB / WAEC / NECO)',
    v_clean_url,
    v_clean_token,
    auth.uid(),
    now()
  )
  ON CONFLICT (provider_key) DO UPDATE SET
    base_url = EXCLUDED.base_url,
    secret_token = EXCLUDED.secret_token,
    updated_by = auth.uid(),
    updated_at = now();

  INSERT INTO public.admin_audit_logs (
    admin_user_id,
    action_type,
    target_type,
    target_id,
    summary,
    details
  )
  VALUES (
    auth.uid(),
    'save_past_questions_api_config',
    'admin_integration_secrets',
    'aloc',
    'Saved ALOC Station Nigerian Past-Questions API configuration',
    jsonb_build_object(
      'baseUrl', v_clean_url,
      'tokenTail', right(v_clean_token, 4)
    )
  );

  RETURN public.admin_get_past_questions_api_status();
END;
$$;

DO $$
DECLARE
  v_waec_id uuid;
BEGIN
  SELECT id INTO v_waec_id FROM public.exam_categories WHERE code = 'WAEC';
  IF v_waec_id IS NOT NULL THEN
    INSERT INTO public.exam_subjects (exam_category_id, subject_name, subject_slug, available_topics, is_published)
    VALUES
      (v_waec_id, 'History', 'history', ARRAY['West African History', 'Colonial & Post-Independence Nigeria']::text[], true),
      (v_waec_id, 'Insurance', 'insurance', ARRAY['Principles of Insurance', 'Risk & Indemnity']::text[], true)
    ON CONFLICT (exam_category_id, subject_slug) DO NOTHING;
  END IF;
END $$;
