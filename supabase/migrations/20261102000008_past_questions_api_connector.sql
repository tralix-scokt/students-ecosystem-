-- ============================================================================
-- Migration: 20261102000008_past_questions_api_connector.sql
-- Purpose:
--   1. Add exam_year & external_ref deduplication to public.exam_questions
--   2. Create forced-RLS server vault public.admin_integration_secrets
--   3. Create audited admin RPCs to configure & inspect Nigerian Past-Questions API (ALOC)
--   4. Expand public.exam_subjects with all 14 core Nigerian subjects across WAEC, NECO, JAMB_UTME
--   5. Upgrade public.start_student_exam_attempt with backward-compatible origin & year filters
-- ============================================================================

ALTER TABLE public.exam_questions
  ADD COLUMN IF NOT EXISTS exam_year integer
    CHECK (exam_year IS NULL OR (exam_year >= 1978 AND exam_year <= 2035)),
  ADD COLUMN IF NOT EXISTS external_ref text
    CHECK (external_ref IS NULL OR char_length(btrim(external_ref)) <= 160);

CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_questions_external_ref
  ON public.exam_questions (exam_category_id, external_ref)
  WHERE external_ref IS NOT NULL;

-- Server-only integration secret vault (zero client SELECT/WRITE policies)
CREATE TABLE IF NOT EXISTS public.admin_integration_secrets (
  provider_key text PRIMARY KEY CHECK (char_length(btrim(provider_key)) BETWEEN 2 AND 64),
  display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 2 AND 120),
  base_url text NOT NULL DEFAULT 'https://questions.aloc.com.ng/api/v2'
    CHECK (base_url ~* '^https://'),
  secret_token text NOT NULL CHECK (char_length(btrim(secret_token)) BETWEEN 4 AND 512),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.admin_integration_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_integration_secrets FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_all_client_access_integration_secrets" ON public.admin_integration_secrets;
CREATE POLICY "deny_all_client_access_integration_secrets"
  ON public.admin_integration_secrets
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Admin RPC: inspect Past-Questions API status (never returns raw token)
CREATE OR REPLACE FUNCTION public.admin_get_past_questions_api_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_row public.admin_integration_secrets%ROWTYPE;
  v_has_row boolean := false;
  v_masked text := NULL;
  v_waec integer := 0;
  v_neco integer := 0;
  v_jamb integer := 0;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Administrator authorization required.';
  END IF;

  SELECT * INTO v_row
  FROM public.admin_integration_secrets
  WHERE provider_key = 'aloc';

  IF FOUND AND char_length(btrim(v_row.secret_token)) >= 4 THEN
    v_has_row := true;
    v_masked := '••••••••' || right(btrim(v_row.secret_token), 4);
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE ec.code = 'WAEC'),
    COUNT(*) FILTER (WHERE ec.code = 'NECO'),
    COUNT(*) FILTER (WHERE ec.code = 'JAMB_UTME')
  INTO v_waec, v_neco, v_jamb
  FROM public.exam_questions eq
  JOIN public.exam_categories ec ON ec.id = eq.exam_category_id
  WHERE eq.origin_type = 'authorized_past_question'
    AND eq.is_published = true;

  RETURN jsonb_build_object(
    'configured', v_has_row,
    'provider', 'aloc',
    'baseUrl', COALESCE(v_row.base_url, 'https://questions.aloc.com.ng/api/v2'),
    'maskedToken', v_masked,
    'updatedAt', v_row.updated_at,
    'waecPastCount', COALESCE(v_waec, 0),
    'necoPastCount', COALESCE(v_neco, 0),
    'jambPastCount', COALESCE(v_jamb, 0),
    'totalPastQuestions', COALESCE(v_waec, 0) + COALESCE(v_neco, 0) + COALESCE(v_jamb, 0)
  );
END;
$$;

-- Admin RPC: securely save Past-Questions API token (audited, never logs raw secret)
CREATE OR REPLACE FUNCTION public.admin_save_past_questions_api_config(
  p_access_token text,
  p_base_url text DEFAULT 'https://questions.aloc.com.ng/api/v2'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clean_token text := btrim(COALESCE(p_access_token, ''));
  v_clean_url text := regexp_replace(
    btrim(COALESCE(NULLIF(p_base_url, ''), 'https://questions.aloc.com.ng/api/v2')),
    '/+$',
    ''
  );
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Administrator authorization required.';
  END IF;

  IF char_length(v_clean_token) < 6 THEN
    RAISE EXCEPTION 'Please provide a valid ALOC AccessToken.';
  END IF;

  IF v_clean_url !~* '^https://' THEN
    RAISE EXCEPTION 'API Base URL must use HTTPS.';
  END IF;

  INSERT INTO public.admin_integration_secrets (
    provider_key,
    display_name,
    base_url,
    secret_token,
    updated_by,
    updated_at
  ) VALUES (
    'aloc',
    'ALOC Nigerian Past Questions API (JAMB / WAEC / NECO)',
    v_clean_url,
    v_clean_token,
    v_uid,
    timezone('utc', now())
  )
  ON CONFLICT (provider_key) DO UPDATE SET
    base_url = EXCLUDED.base_url,
    secret_token = EXCLUDED.secret_token,
    updated_by = v_uid,
    updated_at = timezone('utc', now());

  INSERT INTO public.admin_audit_logs (
    admin_user_id,
    action_type,
    target_type,
    target_id,
    summary,
    details
  ) VALUES (
    v_uid,
    'configure_past_questions_api',
    'admin_integration_secrets',
    'aloc',
    'Configured ALOC Nigerian Past-Questions API token (ending ' || right(v_clean_token, 4) || ')',
    jsonb_build_object('provider', 'aloc', 'baseUrl', v_clean_url)
  );

  RETURN public.admin_get_past_questions_api_status();
END;
$$;

-- Learner-safe availability RPC (returns boolean + counts only, zero secrets)
CREATE OR REPLACE FUNCTION public.get_past_questions_public_availability()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_configured boolean := false;
  v_waec integer := 0;
  v_neco integer := 0;
  v_jamb integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.admin_integration_secrets
    WHERE provider_key = 'aloc' AND char_length(btrim(secret_token)) >= 6
  ) INTO v_configured;

  SELECT
    COUNT(*) FILTER (WHERE ec.code = 'WAEC'),
    COUNT(*) FILTER (WHERE ec.code = 'NECO'),
    COUNT(*) FILTER (WHERE ec.code = 'JAMB_UTME')
  INTO v_waec, v_neco, v_jamb
  FROM public.exam_questions eq
  JOIN public.exam_categories ec ON ec.id = eq.exam_category_id
  WHERE eq.origin_type = 'authorized_past_question'
    AND eq.is_published = true;

  RETURN jsonb_build_object(
    'apiConfigured', v_configured,
    'pastCounts', jsonb_build_object(
      'WAEC', COALESCE(v_waec, 0),
      'NECO', COALESCE(v_neco, 0),
      'JAMB_UTME', COALESCE(v_jamb, 0)
    )
  );
END;
$$;

-- Register all 14 core Nigerian examination subjects across WAEC, NECO, and JAMB_UTME
WITH core_subjects(subject_name, subject_slug, topics, sort_order) AS (
  VALUES
    ('Use of English', 'use-of-english', ARRAY['Comprehension & Summary', 'Lexis & Structure', 'Oral Forms & Phonetics'], 1),
    ('Mathematics', 'mathematics', ARRAY['Number & Numeration', 'Algebraic Processes', 'Geometry & Trigonometry', 'Calculus & Statistics'], 2),
    ('Physics', 'physics', ARRAY['Mechanics & Motion', 'Waves, Sound & Optics', 'Electricity & Magnetism', 'Modern & Atomic Physics'], 3),
    ('Chemistry', 'chemistry', ARRAY['Atomic Structure & Bonding', 'Stoichiometry & States of Matter', 'Acids, Bases & Redox', 'Organic Chemistry'], 4),
    ('Biology', 'biology', ARRAY['Cell Biology & Genetics', 'Plant & Animal Physiology', 'Ecology & Evolution'], 5),
    ('Economics', 'economics', ARRAY['Demand, Supply & Elasticity', 'National Income & Money', 'Public Finance & International Trade'], 6),
    ('Government', 'government', ARRAY['Political Concepts & Constitutions', 'Nigerian Constitutional Development', 'International Organizations'], 7),
    ('Literature in English', 'literature-in-english', ARRAY['Drama & Prose Analysis', 'Poetic Devices & Appreciation', 'Unseen Prose & Poetry'], 8),
    ('Commerce', 'commerce', ARRAY['Trade & Business Units', 'Banking, Insurance & Transport', 'Marketing & Consumer Protection'], 9),
    ('Financial Accounting', 'financial-accounting', ARRAY['Double Entry & Trial Balance', 'Final Accounts & Adjustments', 'Partnership & Company Accounts'], 10),
    ('Civic Education', 'civic-education', ARRAY['Citizenship & Human Rights', 'Rule of Law & Democracy', 'Public Service & National Values'], 11),
    ('Geography', 'geography', ARRAY['Physical & Map Reading', 'Human & Regional Geography', 'Geography of Nigeria & Africa'], 12),
    ('Christian Religious Studies', 'christian-religious-studies', ARRAY['Old Testament Themes', 'Synoptic Gospels', 'Early Church & Epistles'], 13),
    ('Islamic Studies', 'islamic-studies', ARRAY['Quran & Hadith', 'Tawhid & Fiqh', 'Islamic History & Civilization'], 14)
)
INSERT INTO public.exam_subjects (
  exam_category_id,
  subject_name,
  subject_slug,
  available_topics,
  sort_order,
  is_published
)
SELECT
  ec.id,
  cs.subject_name,
  cs.subject_slug,
  cs.topics,
  cs.sort_order,
  true
FROM public.exam_categories ec
CROSS JOIN core_subjects cs
WHERE ec.code IN ('WAEC', 'NECO', 'JAMB_UTME')
ON CONFLICT (exam_category_id, subject_slug) DO UPDATE SET
  available_topics = CASE
    WHEN array_length(public.exam_subjects.available_topics, 1) IS NULL
      OR array_length(public.exam_subjects.available_topics, 1) < 2
    THEN EXCLUDED.available_topics
    ELSE public.exam_subjects.available_topics
  END,
  is_published = true;

-- Upgrade start_student_exam_attempt with backward-compatible p_origin_filter & p_exam_year
DROP FUNCTION IF EXISTS public.start_student_exam_attempt(text, text, text[], text, integer, boolean, integer, jsonb);

CREATE OR REPLACE FUNCTION public.start_student_exam_attempt(
  p_exam_category_code text,
  p_subject text,
  p_topics text[],
  p_difficulty text,
  p_question_count integer,
  p_is_timed boolean,
  p_time_limit_minutes integer,
  p_ai_questions jsonb DEFAULT NULL::jsonb,
  p_origin_filter text DEFAULT NULL::text,
  p_exam_year integer DEFAULT NULL::integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cat record;
  v_count integer := LEAST(GREATEST(COALESCE(p_question_count, 5), 1), 40);
  v_diff text := COALESCE(NULLIF(btrim(p_difficulty), ''), 'mixed');
  v_questions jsonb := '[]'::jsonb;
  v_ai_keys jsonb := NULL;
  v_source text := 'curated_bank';
  v_exam_label text;
  v_attempt_id uuid;
  v_q record;
  v_opts jsonb;
  v_item jsonb;
  v_idx integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT * INTO v_cat
  FROM public.exam_categories
  WHERE code = p_exam_category_code AND is_published = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or unpublished examination category.';
  END IF;

  IF p_ai_questions IS NOT NULL AND jsonb_typeof(p_ai_questions) = 'array' AND jsonb_array_length(p_ai_questions) > 0 THEN
    v_source := 'ai_generated';
    v_ai_keys := '[]'::jsonb;
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_ai_questions)
    LOOP
      v_idx := v_idx + 1;
      v_questions := v_questions || jsonb_build_array(
        jsonb_build_object(
          'key', 'ai-q-' || v_idx::text,
          'order', v_idx,
          'questionType', COALESCE(v_item ->> 'questionType', 'multiple_choice'),
          'topic', COALESCE(v_item ->> 'topic', p_subject),
          'difficulty', COALESCE(v_item ->> 'difficulty', 'medium'),
          'prompt', COALESCE(v_item ->> 'prompt', ''),
          'points', COALESCE((v_item ->> 'points')::integer, 1),
          'originType', 'ai_generated_practice',
          'examYear', NULL,
          'options', COALESCE(v_item -> 'options', '[]'::jsonb)
        )
      );
      v_ai_keys := v_ai_keys || jsonb_build_array(
        jsonb_build_object(
          'key', 'ai-q-' || v_idx::text,
          'correctOptionKey', v_item ->> 'correctOptionKey',
          'correctBoolean', CASE WHEN v_item ? 'correctBoolean' THEN (v_item ->> 'correctBoolean')::boolean ELSE NULL END,
          'acceptedShortAnswers', COALESCE(v_item -> 'acceptedShortAnswers', '[]'::jsonb),
          'explanation', COALESCE(v_item ->> 'explanation', 'AI-generated practice explanation.')
        )
      );
    END LOOP;
  ELSE
    FOR v_q IN
      SELECT eq.*
      FROM public.exam_questions eq
      WHERE eq.exam_category_id = v_cat.id
        AND lower(eq.subject) = lower(btrim(p_subject))
        AND eq.is_published = true
        AND (v_diff = 'mixed' OR eq.difficulty = v_diff)
        AND (
          p_origin_filter IS NULL
          OR eq.origin_type = p_origin_filter
        )
        AND (
          p_exam_year IS NULL
          OR eq.exam_year = p_exam_year
        )
        AND (
          p_topics IS NULL
          OR array_length(p_topics, 1) IS NULL
          OR eq.topic = ANY(p_topics)
        )
      ORDER BY
        CASE WHEN p_origin_filter = 'authorized_past_question' THEN random() ELSE 0 END,
        eq.created_at ASC
      LIMIT v_count
    LOOP
      v_idx := v_idx + 1;
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'key', o.option_key,
            'text', o.option_text
          ) ORDER BY o.option_order ASC
        ),
        '[]'::jsonb
      ) INTO v_opts
      FROM public.exam_question_options o
      WHERE o.question_id = v_q.id;

      v_questions := v_questions || jsonb_build_array(
        jsonb_build_object(
          'key', v_q.id::text,
          'order', v_idx,
          'questionType', v_q.question_type,
          'topic', v_q.topic,
          'difficulty', v_q.difficulty,
          'prompt', v_q.prompt,
          'points', v_q.points,
          'originType', v_q.origin_type,
          'examYear', v_q.exam_year,
          'recommendedCourseSlug', v_q.recommended_course_slug,
          'recommendedLessonSlug', v_q.recommended_lesson_slug,
          'options', v_opts
        )
      );
    END LOOP;
  END IF;

  IF jsonb_array_length(v_questions) = 0 THEN
    RAISE EXCEPTION 'No published questions matched your filter criteria yet.';
  END IF;

  v_exam_label := v_cat.short_label || ' ' || btrim(p_subject) ||
    CASE
      WHEN p_origin_filter = 'authorized_past_question' AND p_exam_year IS NOT NULL
        THEN ' (' || p_exam_year::text || ' Past Questions)'
      WHEN p_origin_filter = 'authorized_past_question'
        THEN ' (Past Questions)'
      ELSE ' Practice'
    END;

  INSERT INTO public.student_exam_attempts (
    user_id,
    exam_category_code,
    exam_name,
    subject,
    selected_topics,
    difficulty,
    question_count,
    is_timed,
    time_limit_minutes,
    practice_source,
    questions_payload,
    ai_answer_keys_internal,
    status
  ) VALUES (
    v_uid,
    v_cat.code,
    v_exam_label,
    btrim(p_subject),
    COALESCE(p_topics, '{}'::text[]),
    v_diff,
    jsonb_array_length(v_questions),
    COALESCE(p_is_timed, true),
    CASE WHEN COALESCE(p_is_timed, true) THEN COALESCE(p_time_limit_minutes, v_cat.default_duration_minutes) ELSE NULL END,
    v_source,
    v_questions,
    v_ai_keys,
    'in_progress'
  ) RETURNING id INTO v_attempt_id;

  RETURN (
    SELECT jsonb_build_object(
      'id', a.id,
      'examCategoryCode', a.exam_category_code,
      'examName', a.exam_name,
      'subject', a.subject,
      'difficulty', a.difficulty,
      'questionCount', a.question_count,
      'isTimed', a.is_timed,
      'timeLimitMinutes', a.time_limit_minutes,
      'practiceSource', a.practice_source,
      'questions', a.questions_payload,
      'status', a.status,
      'startedAt', a.started_at
    )
    FROM public.student_exam_attempts a
    WHERE a.id = v_attempt_id
  );
END;
$$;
