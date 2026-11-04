-- Enforce Free Starter <=10 Question Limit vs TRALIX Pro Full-Length CBT Mocks in Postgres

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
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_cat record;
  v_billing public.billing_plan_settings%ROWTYPE;
  v_is_admin boolean := false;
  v_has_active_sub boolean := false;
  v_is_pro boolean := false;
  v_free_max_q integer := 10;
  v_count integer := LEAST(GREATEST(COALESCE(p_question_count, 5), 1), 60);
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

  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_uid AND p.role = 'admin'
  ) INTO v_is_admin;

  SELECT * INTO v_billing
  FROM public.billing_plan_settings
  WHERE id = 1;

  IF FOUND THEN
    v_free_max_q := COALESCE(v_billing.free_max_exam_questions, 10);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.student_subscriptions s
    WHERE s.user_id = v_uid
      AND s.status = 'active'
      AND s.expires_at > timezone('utc', now())
  ) INTO v_has_active_sub;

  v_is_pro := v_is_admin OR (NOT COALESCE(v_billing.paywall_enabled, true)) OR v_has_active_sub;

  IF NOT v_is_pro AND v_count > v_free_max_q THEN
    RAISE EXCEPTION 'PAYWALL_REQUIRED: Full-length CBT mocks (% questions) require TRALIX Pro. Free Starter includes drills up to % questions.', v_count, v_free_max_q;
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
$function$;
