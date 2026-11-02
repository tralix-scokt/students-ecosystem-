-- ============================================================================
-- E-LEARNING ECOSYSTEM (Powered by TRALIX AI) — Step 11 Production Audit Hardening
-- Migration: 20261102000006_production_audit_hardening.sql
-- Safe, additive, non-destructive security, quota-concurrency, timer, and
-- data-purge completeness fixes identified during the Final Production Audit.
-- ============================================================================

-- 1. Revoke anonymous/PUBLIC execute permissions on Step 5 routines for
--    uniform defense-in-depth parity with Step 6–10 routines.
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.record_student_lesson_activity(uuid, boolean, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_student_lesson_activity(uuid, boolean, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.parse_student_numeric_answer(text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.parse_student_numeric_answer(text, text[]) TO authenticated;

REVOKE ALL ON FUNCTION public.submit_student_exercise_attempt(uuid, jsonb, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_student_exercise_attempt(uuid, jsonb, integer) TO authenticated;

-- 2. Atomic Per-Student AI Quota Reservation & Finalization RPCs
--    Serializes concurrent requests per student via pg_advisory_xact_lock so
--    parallel HTTP bursts cannot bypass daily_request_limit_per_student.
CREATE OR REPLACE FUNCTION public.reserve_student_ai_quota_slot(
  p_feature text,
  p_provider text DEFAULT 'openai',
  p_model text DEFAULT 'gpt-4o-mini'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_settings public.ai_system_settings%ROWTYPE;
  v_daily_limit integer := 60;
  v_max_tokens integer := 1100;
  v_default_provider text := 'openai';
  v_default_model text := 'gpt-4o-mini';
  v_fallback_model text := 'openai/gpt-4o-mini';
  v_used_today integer := 0;
  v_feature text;
  v_log_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  v_feature := CASE
    WHEN p_feature IN ('tutor', 'exam_generation', 'exam_explanation', 'exam_written_feedback', 'revision_plan')
    THEN p_feature
    ELSE 'tutor'
  END;

  -- Per-student transaction-scoped advisory lock prevents concurrent quota bypass
  PERFORM pg_advisory_xact_lock(hashtextextended('ai_quota:' || v_uid::text, 0));

  -- Clean up any stale abandoned in-flight reservations older than 2 minutes
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
$$;

CREATE OR REPLACE FUNCTION public.finalize_student_ai_quota_slot(
  p_log_id uuid,
  p_status text,
  p_provider text,
  p_model text,
  p_prompt_tokens integer DEFAULT 0,
  p_completion_tokens integer DEFAULT 0,
  p_total_tokens integer DEFAULT 0,
  p_latency_ms integer DEFAULT 0,
  p_error_code text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_final_status text;
BEGIN
  IF v_uid IS NULL OR p_log_id IS NULL THEN
    RETURN;
  END IF;

  v_final_status := CASE
    WHEN p_status IN ('success', 'error', 'rate_limited') THEN p_status
    ELSE 'error'
  END;

  -- Only transitions rows currently marked IN_FLIGHT_RESERVATION so finalized
  -- success rows can never be downgraded by a client to refund quota.
  UPDATE public.ai_usage_logs
  SET status = v_final_status,
      provider = COALESCE(NULLIF(btrim(p_provider), ''), provider),
      model = COALESCE(NULLIF(btrim(p_model), ''), model),
      prompt_tokens = GREATEST(0, COALESCE(p_prompt_tokens, 0)),
      completion_tokens = GREATEST(0, COALESCE(p_completion_tokens, 0)),
      total_tokens = GREATEST(0, COALESCE(p_total_tokens, 0)),
      latency_ms = GREATEST(0, COALESCE(p_latency_ms, 0)),
      error_code = CASE
        WHEN v_final_status = 'success' THEN NULL
        ELSE left(COALESCE(NULLIF(btrim(p_error_code), ''), 'AI_PROVIDER_ERROR'), 160)
      END
  WHERE id = p_log_id
    AND user_id = v_uid
    AND error_code = 'IN_FLIGHT_RESERVATION';
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_student_ai_quota_slot(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_student_ai_quota_slot(text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.finalize_student_ai_quota_slot(uuid, text, text, text, integer, integer, integer, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_student_ai_quota_slot(uuid, text, text, text, integer, integer, integer, integer, text) TO authenticated;

-- 3. Complete Self-Service Student Learning Record Purge
--    Adds student_assessment_results, student_tutor_preferences, and
--    student_notification_preferences so no residual assessment scores or
--    study preferences persist after a student purges their study data.
--    Retains non-content ai_usage_logs to prevent daily quota-reset abuse,
--    and retains auth.users / profiles / student_academic_profiles unless a
--    full account deletion is executed.
CREATE OR REPLACE FUNCTION public.purge_own_student_learning_records()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  DELETE FROM public.ai_tutor_conversations WHERE user_id = v_uid;
  DELETE FROM public.student_tutor_preferences WHERE user_id = v_uid;
  DELETE FROM public.student_notes WHERE user_id = v_uid;
  DELETE FROM public.student_planner_tasks WHERE user_id = v_uid;
  DELETE FROM public.student_timetable_entries WHERE user_id = v_uid;
  DELETE FROM public.student_assignments WHERE user_id = v_uid;
  DELETE FROM public.student_study_sessions WHERE user_id = v_uid;
  DELETE FROM public.student_exam_attempts WHERE user_id = v_uid;
  DELETE FROM public.student_exam_topic_performance WHERE user_id = v_uid;
  DELETE FROM public.student_assessment_results WHERE user_id = v_uid;
  DELETE FROM public.student_lesson_bookmarks WHERE user_id = v_uid;
  DELETE FROM public.student_lesson_progress WHERE user_id = v_uid;
  DELETE FROM public.student_course_progress WHERE user_id = v_uid;
  DELETE FROM public.student_exercise_attempts WHERE user_id = v_uid;
  DELETE FROM public.student_notifications WHERE user_id = v_uid;
  DELETE FROM public.student_notification_preferences WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'purged', true,
    'tablesCleared', 16,
    'timestamp', timezone('utc', now())
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purge_own_student_learning_records() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purge_own_student_learning_records() TO authenticated;

-- 4. Server-Anchored Elapsed Time Verification in submit_student_exam_attempt
CREATE OR REPLACE FUNCTION public.submit_student_exam_attempt(
  p_attempt_id uuid,
  p_answers jsonb,
  p_time_spent_seconds integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_att public.student_exam_attempts%ROWTYPE;
  v_q jsonb;
  v_q_key text;
  v_q_type text;
  v_q_topic text;
  v_q_prompt text;
  v_q_points integer;
  v_student_ans text;
  v_norm_ans text;
  v_ak public.exam_question_answer_keys%ROWTYPE;
  v_ai_key jsonb;
  v_correct_opt text;
  v_correct_bool boolean;
  v_short_arr text[];
  v_explanation text;
  v_is_correct boolean;
  v_status text;
  v_earned integer;
  v_correct_display text;
  v_total_earned integer := 0;
  v_total_possible integer := 0;
  v_correct_count integer := 0;
  v_gradable_count integer := 0;
  v_score numeric(5,2) := NULL;
  v_topic_stats jsonb := '[]'::jsonb;
  v_weak_topics text[] := '{}'::text[];
  v_recommendations jsonb := '[]'::jsonb;
  v_server_elapsed integer := 0;
  v_recorded_seconds integer := 0;
  v_rec record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT * INTO v_att
  FROM public.student_exam_attempts
  WHERE id = p_attempt_id AND user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exam attempt not found.';
  END IF;

  IF v_att.status = 'submitted' THEN
    RAISE EXCEPTION 'Exam attempt has already been submitted.';
  END IF;

  v_server_elapsed := GREATEST(
    0,
    FLOOR(EXTRACT(EPOCH FROM (timezone('utc', now()) - v_att.started_at)))::integer
  );
  v_recorded_seconds := LEAST(
    86400,
    GREATEST(COALESCE(p_time_spent_seconds, 0), v_server_elapsed)
  );

  DELETE FROM public.student_exam_responses WHERE attempt_id = v_att.id;

  FOR v_q IN SELECT * FROM jsonb_array_elements(v_att.questions_payload)
  LOOP
    v_q_key := v_q ->> 'key';
    v_q_type := v_q ->> 'questionType';
    v_q_topic := COALESCE(v_q ->> 'topic', v_att.subject);
    v_q_prompt := COALESCE(v_q ->> 'prompt', '');
    v_q_points := COALESCE((v_q ->> 'points')::integer, 1);
    v_student_ans := btrim(COALESCE(p_answers ->> v_q_key, ''));
    v_norm_ans := lower(regexp_replace(v_student_ans, '\s+', ' ', 'g'));

    v_correct_opt := NULL;
    v_correct_bool := NULL;
    v_short_arr := '{}'::text[];
    v_explanation := '';

    IF v_att.practice_source = 'curated_bank' THEN
      SELECT * INTO v_ak
      FROM public.exam_question_answer_keys
      WHERE question_id = v_q_key::uuid;

      IF FOUND THEN
        v_correct_opt := v_ak.correct_option_key;
        v_correct_bool := v_ak.correct_boolean;
        v_short_arr := v_ak.accepted_short_answers;
        v_explanation := v_ak.explanation;
      END IF;
    ELSE
      SELECT item INTO v_ai_key
      FROM jsonb_array_elements(COALESCE(v_att.ai_answer_keys_internal, '[]'::jsonb)) item
      WHERE item ->> 'key' = v_q_key
      LIMIT 1;

      IF v_ai_key IS NOT NULL THEN
        v_correct_opt := v_ai_key ->> 'correctOptionKey';
        v_correct_bool := CASE WHEN v_ai_key ? 'correctBoolean' AND v_ai_key ->> 'correctBoolean' IS NOT NULL THEN (v_ai_key ->> 'correctBoolean')::boolean ELSE NULL END;
        SELECT COALESCE(array_agg(val), '{}'::text[]) INTO v_short_arr
        FROM jsonb_array_elements_text(COALESCE(v_ai_key -> 'acceptedShortAnswers', '[]'::jsonb)) val;
        v_explanation := COALESCE(v_ai_key ->> 'explanation', '');
      END IF;
    END IF;

    IF v_q_type = 'written_response' THEN
      v_status := CASE WHEN v_student_ans = '' THEN 'unanswered' ELSE 'written_recorded' END;
      v_is_correct := NULL;
      v_earned := 0;
      v_correct_display := 'Self-review / AI-assisted feedback (not officially examiner-marked)';
    ELSE
      v_gradable_count := v_gradable_count + 1;
      v_total_possible := v_total_possible + v_q_points;

      IF v_q_type = 'multiple_choice' THEN
        v_correct_display := 'Option ' || COALESCE(upper(v_correct_opt), '');
        v_is_correct := (v_student_ans <> '' AND upper(v_student_ans) = upper(COALESCE(v_correct_opt, '')));
      ELSIF v_q_type = 'true_false' THEN
        v_correct_display := CASE WHEN v_correct_bool THEN 'True' ELSE 'False' END;
        v_is_correct := (
          (v_norm_ans = 'true' AND v_correct_bool = true)
          OR (v_norm_ans = 'false' AND v_correct_bool = false)
        );
      ELSE
        v_correct_display := COALESCE(v_short_arr[1], '');
        v_is_correct := EXISTS (
          SELECT 1 FROM unnest(v_short_arr) acc
          WHERE lower(regexp_replace(btrim(acc), '\s+', ' ', 'g')) = v_norm_ans
        );
      END IF;

      IF v_student_ans = '' THEN
        v_status := 'unanswered';
        v_is_correct := false;
        v_earned := 0;
      ELSIF v_is_correct THEN
        v_status := 'correct';
        v_earned := v_q_points;
        v_correct_count := v_correct_count + 1;
        v_total_earned := v_total_earned + v_q_points;
      ELSE
        v_status := 'incorrect';
        v_earned := 0;
      END IF;

      INSERT INTO public.student_exam_topic_performance (
        user_id, exam_category_code, subject, topic, questions_attempted, questions_correct, accuracy_percent, last_practiced_at
      ) VALUES (
        v_uid,
        v_att.exam_category_code,
        v_att.subject,
        v_q_topic,
        1,
        CASE WHEN v_is_correct THEN 1 ELSE 0 END,
        CASE WHEN v_is_correct THEN 100.00 ELSE 0.00 END,
        timezone('utc', now())
      )
      ON CONFLICT (user_id, exam_category_code, subject, topic) DO UPDATE SET
        questions_attempted = public.student_exam_topic_performance.questions_attempted + 1,
        questions_correct = public.student_exam_topic_performance.questions_correct + (CASE WHEN v_is_correct THEN 1 ELSE 0 END),
        accuracy_percent = ROUND(
          ((public.student_exam_topic_performance.questions_correct + (CASE WHEN v_is_correct THEN 1 ELSE 0 END))::numeric
          / (public.student_exam_topic_performance.questions_attempted + 1)::numeric) * 100,
          2
        ),
        last_practiced_at = timezone('utc', now());
    END IF;

    INSERT INTO public.student_exam_responses (
      attempt_id, user_id, question_key, question_order, question_type, topic, prompt,
      student_answer, status, is_correct, is_officially_marked, earned_points, possible_points,
      correct_answer_display, explanation
    ) VALUES (
      v_att.id, v_uid, v_q_key, COALESCE((v_q ->> 'order')::integer, 1), v_q_type, v_q_topic, v_q_prompt,
      v_student_ans, v_status, v_is_correct,
      CASE WHEN v_q_type = 'written_response' THEN false ELSE true END,
      v_earned, CASE WHEN v_q_type = 'written_response' THEN 0 ELSE v_q_points END,
      v_correct_display, v_explanation
    );
  END LOOP;

  IF v_total_possible > 0 THEN
    v_score := ROUND((v_total_earned::numeric / v_total_possible::numeric) * 100, 2);
  END IF;

  FOR v_rec IN
    SELECT
      r.topic,
      COUNT(*) FILTER (WHERE r.question_type <> 'written_response') AS total_q,
      COUNT(*) FILTER (WHERE r.is_correct = true) AS correct_q
    FROM public.student_exam_responses r
    WHERE r.attempt_id = v_att.id
    GROUP BY r.topic
  LOOP
    IF v_rec.total_q > 0 THEN
      v_topic_stats := v_topic_stats || jsonb_build_array(
        jsonb_build_object(
          'topic', v_rec.topic,
          'correct', v_rec.correct_q,
          'total', v_rec.total_q,
          'accuracyPercent', ROUND((v_rec.correct_q::numeric / v_rec.total_q::numeric) * 100, 1)
        )
      );
      IF (v_rec.correct_q::numeric / v_rec.total_q::numeric) < 0.70 THEN
        v_weak_topics := array_append(v_weak_topics, v_rec.topic);
      END IF;
    END IF;
  END LOOP;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'courseSlug', c.slug,
        'courseTitle', c.title,
        'lessonSlug', l.slug,
        'lessonTitle', l.title,
        'subject', c.subject
      )
    ),
    '[]'::jsonb
  ) INTO v_recommendations
  FROM (
    SELECT lc.slug, lc.title, lc.subject, ll.slug AS l_slug, ll.title AS l_title
    FROM public.learning_courses lc
    JOIN public.learning_lessons ll ON ll.course_id = lc.id AND ll.is_published = true
    WHERE lc.is_published = true
      AND lc.publication_status = 'published'
      AND lower(lc.subject) = lower(v_att.subject)
    ORDER BY ll.lesson_order ASC
    LIMIT 3
  ) sub(slug, title, subject, l_slug, l_title)
  CROSS JOIN LATERAL (SELECT sub.slug, sub.title, sub.subject) c
  CROSS JOIN LATERAL (SELECT sub.l_slug AS slug, sub.l_title AS title) l;

  UPDATE public.student_exam_attempts
  SET status = 'submitted',
      earned_points = v_total_earned,
      possible_points = v_total_possible,
      correct_count = v_correct_count,
      gradable_count = v_gradable_count,
      score_percent = v_score,
      time_spent_seconds = v_recorded_seconds,
      topic_breakdown = v_topic_stats,
      weak_topics = v_weak_topics,
      revision_recommendations = v_recommendations,
      submitted_at = timezone('utc', now())
  WHERE id = v_att.id;

  IF v_score IS NOT NULL THEN
    INSERT INTO public.student_assessment_results (
      user_id, title, subject, score_percent, recorded_at
    ) VALUES (
      v_uid, v_att.exam_name, v_att.subject, v_score, timezone('utc', now())
    );
  END IF;

  IF COALESCE(
    (SELECT exam_updates FROM public.student_notification_preferences WHERE user_id = v_uid),
    true
  ) AND v_score IS NOT NULL THEN
    INSERT INTO public.student_notifications (
      user_id, title, body, category, action_url, source_key
    ) VALUES (
      v_uid,
      'Practice Exam Completed: ' || v_att.exam_name,
      'You scored ' || v_score::text || '% (' || v_correct_count::text || '/' || v_gradable_count::text || ' objective questions). Review topic analytics in Exam Preparation.',
      'exam',
      '/dashboard/exams',
      'exam-attempt:' || v_att.id::text
    ) ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'attemptId', v_att.id,
    'scorePercent', v_score,
    'earnedPoints', v_total_earned,
    'possiblePoints', v_total_possible,
    'correctCount', v_correct_count,
    'gradableCount', v_gradable_count,
    'topicBreakdown', v_topic_stats,
    'weakTopics', v_weak_topics,
    'revisionRecommendations', v_recommendations
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_student_exam_attempt(uuid, jsonb, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_student_exam_attempt(uuid, jsonb, integer) TO authenticated;
