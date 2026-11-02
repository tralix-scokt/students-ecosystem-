-- ============================================================================
-- E-LEARNING ECOSYSTEM (Powered by TRALIX AI) — Steps 6–10 Complete Schema
-- Migration: 20261101000005_create_steps_6_to_9_ecosystem_schema_and_rls.sql
-- ============================================================================
-- Safely adds and extends tables, forced RLS policies, deterministic RPCs,
-- audit logs, and truthful starter exam catalog across:
--   Step 6: AI Tutor & Provider-Independent AI Governance
--   Step 7: AI Exam Preparation & Deterministic Exam Engine
--   Step 8: Academic Management (Planner, Timetable, Assignments, Study Timer)
--   Step 9: My Notes, Real Event Notifications & Protected Admin Portal
--   Step 10: Account Data Deletion & Operational Telemetry
-- ============================================================================

-- 0. Allow admins to view profiles for account management & allow non-student roles
-- to update their own full_name/country without bypassing role immutability trigger.
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
CREATE POLICY "profiles_select_admin"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- ============================================================================
-- STEP 6: AI TUTOR, CONVERSATIONS, MESSAGES, PREFERENCES & USAGE LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_system_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ai_enabled boolean NOT NULL DEFAULT true,
  default_provider text NOT NULL DEFAULT 'openai' CHECK (
    default_provider IN ('openai', 'openrouter')
  ),
  default_model text NOT NULL DEFAULT 'gpt-4o-mini' CHECK (
    char_length(btrim(default_model)) BETWEEN 2 AND 120
  ),
  fallback_model text NOT NULL DEFAULT 'openai/gpt-4o-mini' CHECK (
    char_length(btrim(fallback_model)) BETWEEN 2 AND 120
  ),
  daily_request_limit_per_student integer NOT NULL DEFAULT 60 CHECK (
    daily_request_limit_per_student BETWEEN 1 AND 1000
  ),
  max_tokens_per_response integer NOT NULL DEFAULT 1100 CHECK (
    max_tokens_per_response BETWEEN 128 AND 4096
  ),
  updated_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

INSERT INTO public.ai_system_settings (
  id, ai_enabled, default_provider, default_model, fallback_model, daily_request_limit_per_student, max_tokens_per_response
) VALUES (
  1, true, 'openai', 'gpt-4o-mini', 'openai/gpt-4o-mini', 60, 1100
) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.student_tutor_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  preferred_mode text NOT NULL DEFAULT 'explain_topic' CHECK (
    preferred_mode IN (
      'explain_topic',
      'solve_step_by_step',
      'practice_questions',
      'simplify_concept',
      'revision_assistant',
      'study_coach'
    )
  ),
  explanation_style text NOT NULL DEFAULT 'step_by_step' CHECK (
    explanation_style IN ('concise', 'standard', 'step_by_step', 'exam_focused')
  ),
  preferred_subject text NULL CHECK (
    preferred_subject IS NULL OR char_length(btrim(preferred_subject)) <= 120
  ),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.ai_tutor_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 180),
  learning_mode text NOT NULL DEFAULT 'explain_topic' CHECK (
    learning_mode IN (
      'explain_topic',
      'solve_step_by_step',
      'practice_questions',
      'simplify_concept',
      'revision_assistant',
      'study_coach'
    )
  ),
  subject text NULL CHECK (
    subject IS NULL OR char_length(btrim(subject)) <= 120
  ),
  course_slug text NULL CHECK (
    course_slug IS NULL OR char_length(btrim(course_slug)) <= 140
  ),
  lesson_slug text NULL CHECK (
    lesson_slug IS NULL OR char_length(btrim(lesson_slug)) <= 140
  ),
  message_count integer NOT NULL DEFAULT 0 CHECK (message_count >= 0),
  last_message_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS ai_tutor_conversations_user_recent_idx
  ON public.ai_tutor_conversations (user_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_tutor_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_tutor_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 24000),
  learning_mode text NOT NULL DEFAULT 'explain_topic' CHECK (
    learning_mode IN (
      'explain_topic',
      'solve_step_by_step',
      'practice_questions',
      'simplify_concept',
      'revision_assistant',
      'study_coach'
    )
  ),
  provider text NULL CHECK (provider IS NULL OR char_length(btrim(provider)) <= 60),
  model text NULL CHECK (model IS NULL OR char_length(btrim(model)) <= 120),
  is_ai_generated boolean NOT NULL DEFAULT false,
  is_verified_educational_material boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_assistant_ai_never_verified CHECK (
    (role = 'user' AND is_ai_generated = false AND is_verified_educational_material = false)
    OR (role = 'assistant' AND is_ai_generated = true AND is_verified_educational_material = false)
  )
);

CREATE INDEX IF NOT EXISTS ai_tutor_messages_conv_created_idx
  ON public.ai_tutor_messages (conversation_id, created_at ASC);

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature text NOT NULL CHECK (
    feature IN (
      'tutor',
      'exam_generation',
      'exam_explanation',
      'exam_written_feedback',
      'revision_plan'
    )
  ),
  provider text NOT NULL CHECK (char_length(btrim(provider)) BETWEEN 2 AND 60),
  model text NOT NULL CHECK (char_length(btrim(model)) BETWEEN 2 AND 120),
  prompt_tokens integer NOT NULL DEFAULT 0 CHECK (prompt_tokens >= 0),
  completion_tokens integer NOT NULL DEFAULT 0 CHECK (completion_tokens >= 0),
  total_tokens integer NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
  status text NOT NULL CHECK (status IN ('success', 'rate_limited', 'error')),
  latency_ms integer NULL CHECK (latency_ms IS NULL OR latency_ms >= 0),
  error_code text NULL CHECK (error_code IS NULL OR char_length(error_code) <= 160),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS ai_usage_logs_user_created_idx
  ON public.ai_usage_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_usage_logs_created_idx
  ON public.ai_usage_logs (created_at DESC);

-- ============================================================================
-- STEP 7: AI EXAM PREPARATION & DETERMINISTIC EXAM BANK
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.exam_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (
    code IN (
      'WAEC',
      'NECO',
      'JAMB_UTME',
      'SCHOOL_GENERAL',
      'UNIVERSITY_SEMESTER',
      'POLYTECHNIC_DIPLOMA'
    )
  ),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 160),
  short_label text NOT NULL CHECK (char_length(btrim(short_label)) BETWEEN 2 AND 60),
  academic_category text NOT NULL CHECK (
    academic_category IN ('secondary', 'university', 'polytechnic', 'all')
  ),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 4 AND 600),
  disclaimer_text text NOT NULL CHECK (char_length(btrim(disclaimer_text)) BETWEEN 10 AND 600),
  default_duration_minutes integer NOT NULL DEFAULT 30 CHECK (
    default_duration_minutes BETWEEN 5 AND 240
  ),
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.exam_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_category_id uuid NOT NULL REFERENCES public.exam_categories(id) ON DELETE CASCADE,
  subject_name text NOT NULL CHECK (char_length(btrim(subject_name)) BETWEEN 2 AND 120),
  subject_slug text NOT NULL CHECK (char_length(btrim(subject_slug)) BETWEEN 2 AND 120),
  available_topics text[] NOT NULL DEFAULT '{}'::text[],
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT exam_subjects_unique_per_cat UNIQUE (exam_category_id, subject_slug)
);

CREATE TABLE IF NOT EXISTS public.exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_category_id uuid NOT NULL REFERENCES public.exam_categories(id) ON DELETE CASCADE,
  subject text NOT NULL CHECK (char_length(btrim(subject)) BETWEEN 2 AND 120),
  topic text NOT NULL CHECK (char_length(btrim(topic)) BETWEEN 2 AND 160),
  difficulty text NOT NULL DEFAULT 'medium' CHECK (
    difficulty IN ('easy', 'medium', 'hard')
  ),
  question_type text NOT NULL CHECK (
    question_type IN ('multiple_choice', 'true_false', 'short_answer', 'written_response')
  ),
  prompt text NOT NULL CHECK (char_length(btrim(prompt)) BETWEEN 4 AND 4000),
  points integer NOT NULL DEFAULT 1 CHECK (points BETWEEN 0 AND 20),
  origin_type text NOT NULL DEFAULT 'curated_practice' CHECK (
    origin_type IN (
      'curated_practice',
      'ai_generated_practice',
      'authorized_past_question'
    )
  ),
  source_id uuid NULL REFERENCES public.learning_content_sources(id) ON DELETE SET NULL,
  verification_id uuid NULL REFERENCES public.learning_content_verifications(id) ON DELETE SET NULL,
  recommended_course_slug text NULL,
  recommended_lesson_slug text NULL,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_authorized_past_requires_verification CHECK (
    origin_type <> 'authorized_past_question'
    OR (source_id IS NOT NULL AND verification_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS exam_questions_lookup_idx
  ON public.exam_questions (exam_category_id, lower(subject), is_published);

CREATE TABLE IF NOT EXISTS public.exam_question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.exam_questions(id) ON DELETE CASCADE,
  option_key text NOT NULL CHECK (char_length(btrim(option_key)) BETWEEN 1 AND 8),
  option_text text NOT NULL CHECK (char_length(btrim(option_text)) BETWEEN 1 AND 1200),
  option_order integer NOT NULL DEFAULT 1 CHECK (option_order >= 1),
  CONSTRAINT exam_question_options_unique UNIQUE (question_id, option_key)
);

CREATE TABLE IF NOT EXISTS public.exam_question_answer_keys (
  question_id uuid PRIMARY KEY REFERENCES public.exam_questions(id) ON DELETE CASCADE,
  correct_option_key text NULL,
  correct_boolean boolean NULL,
  accepted_short_answers text[] NOT NULL DEFAULT '{}'::text[],
  explanation text NOT NULL CHECK (char_length(btrim(explanation)) BETWEEN 2 AND 4000),
  rubric_points text[] NOT NULL DEFAULT '{}'::text[],
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.student_exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exam_category_code text NOT NULL,
  exam_name text NOT NULL CHECK (char_length(btrim(exam_name)) BETWEEN 2 AND 200),
  subject text NOT NULL CHECK (char_length(btrim(subject)) BETWEEN 2 AND 120),
  selected_topics text[] NOT NULL DEFAULT '{}'::text[],
  difficulty text NOT NULL DEFAULT 'mixed' CHECK (
    difficulty IN ('mixed', 'easy', 'medium', 'hard')
  ),
  question_count integer NOT NULL CHECK (question_count BETWEEN 1 AND 60),
  is_timed boolean NOT NULL DEFAULT true,
  time_limit_minutes integer NULL CHECK (
    time_limit_minutes IS NULL OR (time_limit_minutes BETWEEN 1 AND 240)
  ),
  practice_source text NOT NULL DEFAULT 'curated_bank' CHECK (
    practice_source IN ('curated_bank', 'ai_generated')
  ),
  questions_payload jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_answer_keys_internal jsonb NULL,
  status text NOT NULL DEFAULT 'in_progress' CHECK (
    status IN ('in_progress', 'submitted')
  ),
  earned_points integer NOT NULL DEFAULT 0,
  possible_points integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  gradable_count integer NOT NULL DEFAULT 0,
  score_percent numeric(5,2) NULL CHECK (
    score_percent IS NULL OR (score_percent >= 0 AND score_percent <= 100)
  ),
  time_spent_seconds integer NULL CHECK (
    time_spent_seconds IS NULL OR time_spent_seconds >= 0
  ),
  topic_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  weak_topics text[] NOT NULL DEFAULT '{}'::text[],
  revision_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_revision_plan text NULL,
  started_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  submitted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS student_exam_attempts_user_recent_idx
  ON public.student_exam_attempts (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.student_exam_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.student_exam_attempts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  question_order integer NOT NULL DEFAULT 1,
  question_type text NOT NULL CHECK (
    question_type IN ('multiple_choice', 'true_false', 'short_answer', 'written_response')
  ),
  topic text NOT NULL,
  prompt text NOT NULL,
  student_answer text NOT NULL DEFAULT '',
  status text NOT NULL CHECK (
    status IN ('correct', 'incorrect', 'written_recorded', 'unanswered')
  ),
  is_correct boolean NULL,
  is_officially_marked boolean NOT NULL DEFAULT false,
  earned_points integer NOT NULL DEFAULT 0,
  possible_points integer NOT NULL DEFAULT 0,
  correct_answer_display text NOT NULL DEFAULT '',
  explanation text NOT NULL DEFAULT '',
  ai_written_feedback text NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_written_exam_not_officially_marked CHECK (
    question_type <> 'written_response' OR is_officially_marked = false
  )
);

CREATE INDEX IF NOT EXISTS student_exam_responses_attempt_idx
  ON public.student_exam_responses (attempt_id, question_order ASC);

CREATE TABLE IF NOT EXISTS public.student_exam_topic_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exam_category_code text NOT NULL,
  subject text NOT NULL,
  topic text NOT NULL,
  questions_attempted integer NOT NULL DEFAULT 0 CHECK (questions_attempted >= 0),
  questions_correct integer NOT NULL DEFAULT 0 CHECK (questions_correct >= 0),
  accuracy_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (
    accuracy_percent >= 0 AND accuracy_percent <= 100
  ),
  last_practiced_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT student_exam_topic_perf_unique UNIQUE (user_id, exam_category_code, subject, topic)
);

-- ============================================================================
-- STEP 8: ACADEMIC MANAGEMENT SYSTEM (PLANNER, TIMETABLE, EXTENDED ASSIGNMENTS & STUDY SESSIONS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.student_planner_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 200),
  description text NULL CHECK (description IS NULL OR char_length(description) <= 1500),
  subject text NOT NULL CHECK (char_length(btrim(subject)) BETWEEN 2 AND 120),
  scheduled_date date NOT NULL,
  scheduled_time time NULL,
  duration_minutes integer NULL CHECK (
    duration_minutes IS NULL OR (duration_minutes BETWEEN 5 AND 720)
  ),
  priority text NOT NULL DEFAULT 'medium' CHECK (
    priority IN ('low', 'medium', 'high')
  ),
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS student_planner_tasks_user_date_idx
  ON public.student_planner_tasks (user_id, scheduled_date ASC);

CREATE TABLE IF NOT EXISTS public.student_timetable_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject text NOT NULL CHECK (char_length(btrim(subject)) BETWEEN 2 AND 120),
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  location text NULL CHECK (location IS NULL OR char_length(location) <= 140),
  instructor_or_notes text NULL CHECK (
    instructor_or_notes IS NULL OR char_length(instructor_or_notes) <= 240
  ),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_timetable_end_after_start CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS student_timetable_user_day_idx
  ON public.student_timetable_entries (user_id, day_of_week, start_time);

ALTER TABLE public.student_assignments
  ADD COLUMN IF NOT EXISTS description text NULL CHECK (
    description IS NULL OR char_length(description) <= 2000
  ),
  ADD COLUMN IF NOT EXISTS completed_at timestamptz NULL;

ALTER TABLE public.student_study_sessions
  ADD COLUMN IF NOT EXISTS started_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS ended_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS actual_duration_minutes integer NULL CHECK (
    actual_duration_minutes IS NULL OR (actual_duration_minutes >= 0 AND actual_duration_minutes <= 720)
  ),
  ADD COLUMN IF NOT EXISTS notes text NULL CHECK (
    notes IS NULL OR char_length(notes) <= 1000
  );

-- ============================================================================
-- STEP 9: MY NOTES, NOTIFICATIONS & ADMIN GOVERNANCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.student_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  description text NULL CHECK (description IS NULL OR char_length(description) <= 400),
  content text NOT NULL CHECK (char_length(content) <= 40000),
  subject text NOT NULL DEFAULT 'General' CHECK (char_length(btrim(subject)) BETWEEN 1 AND 120),
  tags text[] NOT NULL DEFAULT '{}'::text[],
  is_pinned boolean NOT NULL DEFAULT false,
  is_bookmarked boolean NOT NULL DEFAULT false,
  source_course_slug text NULL,
  source_lesson_slug text NULL,
  source_lesson_title text NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS student_notes_user_updated_idx
  ON public.student_notes (user_id, is_pinned DESC, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.student_notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  assignment_reminders boolean NOT NULL DEFAULT true,
  upcoming_deadlines boolean NOT NULL DEFAULT true,
  study_reminders boolean NOT NULL DEFAULT true,
  learning_updates boolean NOT NULL DEFAULT true,
  exam_updates boolean NOT NULL DEFAULT true,
  platform_announcements boolean NOT NULL DEFAULT true,
  email_notifications_enabled boolean NOT NULL DEFAULT false,
  push_notifications_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.platform_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 180),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 3 AND 1000),
  target_category text NOT NULL DEFAULT 'all' CHECK (
    target_category IN ('all', 'secondary', 'university', 'polytechnic')
  ),
  action_url text NULL CHECK (
    action_url IS NULL OR (left(action_url, 1) = '/' AND left(action_url, 2) <> '//')
  ),
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Extend student_notifications with idempotent source_key & 'announcement' category
ALTER TABLE public.student_notifications
  ADD COLUMN IF NOT EXISTS source_key text NULL;

ALTER TABLE public.student_notifications
  DROP CONSTRAINT IF EXISTS student_notifications_category_check;

ALTER TABLE public.student_notifications
  ADD CONSTRAINT student_notifications_category_check CHECK (
    category IN ('system', 'learning', 'exam', 'planner', 'assignment', 'announcement')
  );

CREATE UNIQUE INDEX IF NOT EXISTS student_notifications_user_source_key_idx
  ON public.student_notifications (user_id, source_key)
  WHERE source_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (char_length(btrim(action_type)) BETWEEN 2 AND 100),
  target_type text NOT NULL CHECK (char_length(btrim(target_type)) BETWEEN 2 AND 100),
  target_id text NULL,
  summary text NOT NULL CHECK (char_length(btrim(summary)) BETWEEN 3 AND 500),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_created_idx
  ON public.admin_audit_logs (created_at DESC);

-- ============================================================================
-- TRIGGERS FOR OWNERSHIP IMMUTABILITY & UPDATED_AT TIMESTAMPS
-- ============================================================================

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'student_tutor_preferences',
    'ai_tutor_conversations',
    'student_planner_tasks',
    'student_timetable_entries',
    'student_notes',
    'student_notification_preferences'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_owner ON public.%I;', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_owner BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_student_owned_row_audit();',
      t, t
    );
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated ON public.%I;', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_utc();',
      t, t
    );
  END LOOP;
END;
$$;

-- ============================================================================
-- ENABLE & FORCE ROW LEVEL SECURITY ACROSS ALL 19 NEW TABLES
-- ============================================================================

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'ai_system_settings',
    'student_tutor_preferences',
    'ai_tutor_conversations',
    'ai_tutor_messages',
    'ai_usage_logs',
    'exam_categories',
    'exam_subjects',
    'exam_questions',
    'exam_question_options',
    'exam_question_answer_keys',
    'student_exam_attempts',
    'student_exam_responses',
    'student_exam_topic_performance',
    'student_planner_tasks',
    'student_timetable_entries',
    'student_notes',
    'student_notification_preferences',
    'platform_announcements',
    'admin_audit_logs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated;', tbl);
  END LOOP;
END;
$$;

-- 1. AI System Settings: readable by authenticated, editable by platform admins only
GRANT SELECT ON public.ai_system_settings TO authenticated;
GRANT INSERT, UPDATE ON public.ai_system_settings TO authenticated;

DROP POLICY IF EXISTS "ai_settings_select" ON public.ai_system_settings;
CREATE POLICY "ai_settings_select"
  ON public.ai_system_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ai_settings_admin_write" ON public.ai_system_settings;
CREATE POLICY "ai_settings_admin_write"
  ON public.ai_system_settings FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- 2. Student-owned AI Tutor tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_tutor_preferences TO authenticated;
DROP POLICY IF EXISTS "tutor_prefs_own_all" ON public.student_tutor_preferences;
CREATE POLICY "tutor_prefs_own_all"
  ON public.student_tutor_preferences FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_tutor_conversations TO authenticated;
DROP POLICY IF EXISTS "tutor_conversations_own_all" ON public.ai_tutor_conversations;
CREATE POLICY "tutor_conversations_own_all"
  ON public.ai_tutor_conversations FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, DELETE ON public.ai_tutor_messages TO authenticated;
DROP POLICY IF EXISTS "tutor_messages_own_all" ON public.ai_tutor_messages;
CREATE POLICY "tutor_messages_own_all"
  ON public.ai_tutor_messages FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT ON public.ai_usage_logs TO authenticated;
DROP POLICY IF EXISTS "ai_usage_select_own_or_admin" ON public.ai_usage_logs;
CREATE POLICY "ai_usage_select_own_or_admin"
  ON public.ai_usage_logs FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR public.is_platform_admin());

DROP POLICY IF EXISTS "ai_usage_insert_own" ON public.ai_usage_logs;
CREATE POLICY "ai_usage_insert_own"
  ON public.ai_usage_logs FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 3. Exam Catalog & Admin-Protected Answer Keys
GRANT SELECT ON public.exam_categories, public.exam_subjects, public.exam_questions, public.exam_question_options TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.exam_categories, public.exam_subjects, public.exam_questions, public.exam_question_options, public.exam_question_answer_keys TO authenticated;
GRANT SELECT ON public.exam_question_answer_keys TO authenticated;

DROP POLICY IF EXISTS "exam_categories_select" ON public.exam_categories;
CREATE POLICY "exam_categories_select"
  ON public.exam_categories FOR SELECT TO authenticated
  USING (is_published = true OR public.is_platform_admin());
DROP POLICY IF EXISTS "exam_categories_admin" ON public.exam_categories;
CREATE POLICY "exam_categories_admin"
  ON public.exam_categories FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "exam_subjects_select" ON public.exam_subjects;
CREATE POLICY "exam_subjects_select"
  ON public.exam_subjects FOR SELECT TO authenticated
  USING (is_published = true OR public.is_platform_admin());
DROP POLICY IF EXISTS "exam_subjects_admin" ON public.exam_subjects;
CREATE POLICY "exam_subjects_admin"
  ON public.exam_subjects FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "exam_questions_select" ON public.exam_questions;
CREATE POLICY "exam_questions_select"
  ON public.exam_questions FOR SELECT TO authenticated
  USING (is_published = true OR public.is_platform_admin());
DROP POLICY IF EXISTS "exam_questions_admin" ON public.exam_questions;
CREATE POLICY "exam_questions_admin"
  ON public.exam_questions FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "exam_options_select" ON public.exam_question_options;
CREATE POLICY "exam_options_select"
  ON public.exam_question_options FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exam_questions eq
      WHERE eq.id = question_id AND (eq.is_published = true OR public.is_platform_admin())
    )
  );
DROP POLICY IF EXISTS "exam_options_admin" ON public.exam_question_options;
CREATE POLICY "exam_options_admin"
  ON public.exam_question_options FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- Strict protection: students NEVER read exam_question_answer_keys directly!
DROP POLICY IF EXISTS "exam_answer_keys_admin_only" ON public.exam_question_answer_keys;
CREATE POLICY "exam_answer_keys_admin_only"
  ON public.exam_question_answer_keys FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- 4. Student Exam Attempts, Responses & Topic Performance
-- Note: column-level SELECT grant on student_exam_attempts hides ai_answer_keys_internal from raw client reads!
GRANT SELECT (
  id, user_id, exam_category_code, exam_name, subject, selected_topics, difficulty,
  question_count, is_timed, time_limit_minutes, practice_source, questions_payload,
  status, earned_points, possible_points, correct_count, gradable_count, score_percent,
  time_spent_seconds, topic_breakdown, weak_topics, revision_recommendations,
  ai_revision_plan, started_at, submitted_at, created_at
) ON public.student_exam_attempts TO authenticated;
GRANT UPDATE (ai_revision_plan) ON public.student_exam_attempts TO authenticated;

DROP POLICY IF EXISTS "exam_attempts_own_select" ON public.student_exam_attempts;
CREATE POLICY "exam_attempts_own_select"
  ON public.student_exam_attempts FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR public.is_platform_admin());

DROP POLICY IF EXISTS "exam_attempts_own_update" ON public.student_exam_attempts;
CREATE POLICY "exam_attempts_own_update"
  ON public.student_exam_attempts FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT ON public.student_exam_responses TO authenticated;
GRANT UPDATE (ai_written_feedback) ON public.student_exam_responses TO authenticated;
DROP POLICY IF EXISTS "exam_responses_own_select" ON public.student_exam_responses;
CREATE POLICY "exam_responses_own_select"
  ON public.student_exam_responses FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "exam_responses_own_update" ON public.student_exam_responses;
CREATE POLICY "exam_responses_own_update"
  ON public.student_exam_responses FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT ON public.student_exam_topic_performance TO authenticated;
DROP POLICY IF EXISTS "exam_topic_perf_own_select" ON public.student_exam_topic_performance;
CREATE POLICY "exam_topic_perf_own_select"
  ON public.student_exam_topic_performance FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- 5. Step 8 Planner & Timetable (Strict Per-Student Ownership)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_planner_tasks TO authenticated;
DROP POLICY IF EXISTS "planner_tasks_own_all" ON public.student_planner_tasks;
CREATE POLICY "planner_tasks_own_all"
  ON public.student_planner_tasks FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_timetable_entries TO authenticated;
DROP POLICY IF EXISTS "timetable_entries_own_all" ON public.student_timetable_entries;
CREATE POLICY "timetable_entries_own_all"
  ON public.student_timetable_entries FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 6. Step 9 Private Notes, Notifications, Preferences, Announcements & Admin Audit Logs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_notes TO authenticated;
DROP POLICY IF EXISTS "student_notes_own_all" ON public.student_notes;
CREATE POLICY "student_notes_own_all"
  ON public.student_notes FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE ON public.student_notification_preferences TO authenticated;
DROP POLICY IF EXISTS "notif_prefs_own_all" ON public.student_notification_preferences;
CREATE POLICY "notif_prefs_own_all"
  ON public.student_notification_preferences FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Allow students to DELETE their own notifications and INSERT real event notifications
GRANT DELETE, INSERT ON public.student_notifications TO authenticated;
DROP POLICY IF EXISTS "notifications_own_delete" ON public.student_notifications;
CREATE POLICY "notifications_own_delete"
  ON public.student_notifications FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "notifications_own_insert" ON public.student_notifications;
CREATE POLICY "notifications_own_insert"
  ON public.student_notifications FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_announcements TO authenticated;
DROP POLICY IF EXISTS "announcements_select" ON public.platform_announcements;
CREATE POLICY "announcements_select"
  ON public.platform_announcements FOR SELECT TO authenticated
  USING (is_published = true OR public.is_platform_admin());
DROP POLICY IF EXISTS "announcements_admin_write" ON public.platform_announcements;
CREATE POLICY "announcements_admin_write"
  ON public.platform_announcements FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

GRANT SELECT, INSERT ON public.admin_audit_logs TO authenticated;
DROP POLICY IF EXISTS "admin_audit_logs_admin_only" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_admin_only"
  ON public.admin_audit_logs FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ============================================================================
-- DETERMINISTIC SECURITY DEFINER RPCS (EXAMS, NOTIFICATIONS, ADMIN & PRIVACY)
-- ============================================================================

-- A. Start Curated or AI-Generated Practice Exam Attempt
CREATE OR REPLACE FUNCTION public.start_student_exam_attempt(
  p_exam_category_code text,
  p_subject text,
  p_topics text[],
  p_difficulty text,
  p_question_count integer,
  p_is_timed boolean,
  p_time_limit_minutes integer,
  p_ai_questions jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cat record;
  v_count integer := LEAST(GREATEST(COALESCE(p_question_count, 5), 1), 40);
  v_diff text := COALESCE(NULLIF(btrim(p_difficulty), ''), 'mixed');
  v_questions jsonb := '[]'::jsonb;
  v_ai_keys jsonb := NULL;
  v_source text := 'curated_bank';
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
          p_topics IS NULL
          OR array_length(p_topics, 1) IS NULL
          OR eq.topic = ANY(p_topics)
        )
      ORDER BY eq.created_at ASC
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
    v_cat.short_label || ' ' || btrim(p_subject) || ' Practice',
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

-- B. Deterministic Exam Attempt Submission & Weak-Topic Analysis
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
  v_rec record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT * INTO v_att
  FROM public.student_exam_attempts
  WHERE id = p_attempt_id AND user_id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exam attempt not found.';
  END IF;

  IF v_att.status = 'submitted' THEN
    RAISE EXCEPTION 'Exam attempt has already been submitted.';
  END IF;

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

      -- Upsert topic performance telemetry
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

  -- Aggregate topic breakdown & weak topics (< 70%)
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

  -- Match weak topics or subject to real published lessons for revision recommendations
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
      time_spent_seconds = GREATEST(0, COALESCE(p_time_spent_seconds, 0)),
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

  -- Create real exam update notification if enabled
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

-- C. Sync Real Event Notifications (Deadlines & Published Admin Announcements)
CREATE OR REPLACE FUNCTION public.sync_student_event_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_prefs public.student_notification_preferences%ROWTYPE;
  v_cat text;
  v_inserted integer := 0;
  v_row record;
BEGIN
  IF v_uid IS NULL THEN
    RETURN 0;
  END IF;

  INSERT INTO public.student_notification_preferences (user_id)
  VALUES (v_uid)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_prefs FROM public.student_notification_preferences WHERE user_id = v_uid;
  SELECT academic_category INTO v_cat FROM public.student_academic_profiles WHERE user_id = v_uid;

  -- 1. Real upcoming / overdue assignment deadline reminders (due within 48h or overdue)
  IF v_prefs.assignment_reminders OR v_prefs.upcoming_deadlines THEN
    FOR v_row IN
      SELECT id, title, subject, due_at
      FROM public.student_assignments
      WHERE user_id = v_uid
        AND status <> 'completed'
        AND due_at <= (timezone('utc', now()) + interval '48 hours')
    LOOP
      INSERT INTO public.student_notifications (
        user_id, title, body, category, action_url, source_key
      ) VALUES (
        v_uid,
        CASE
          WHEN v_row.due_at < timezone('utc', now()) THEN 'Assignment Overdue: ' || left(v_row.title, 120)
          ELSE 'Upcoming Assignment Deadline: ' || left(v_row.title, 120)
        END,
        v_row.subject || ' assignment due ' || to_char(v_row.due_at AT TIME ZONE 'UTC', 'Mon DD, YYYY HH24:MI UTC') || '.',
        'assignment',
        '/dashboard/planner',
        'assignment-due:' || v_row.id::text
      ) ON CONFLICT DO NOTHING;
      IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    END LOOP;
  END IF;

  -- 2. Published Admin Platform Announcements
  IF v_prefs.platform_announcements THEN
    FOR v_row IN
      SELECT id, title, body, action_url
      FROM public.platform_announcements
      WHERE is_published = true
        AND (target_category = 'all' OR target_category = COALESCE(v_cat, 'all'))
    LOOP
      INSERT INTO public.student_notifications (
        user_id, title, body, category, action_url, source_key
      ) VALUES (
        v_uid,
        v_row.title,
        v_row.body,
        'announcement',
        COALESCE(v_row.action_url, '/dashboard'),
        'announcement:' || v_row.id::text
      ) ON CONFLICT DO NOTHING;
      IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    END LOOP;
  END IF;

  RETURN v_inserted;
END;
$$;

-- D. Admin Role Management with Audit Log & Sole-Admin Protection
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  p_target_user_id uuid,
  p_new_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_old_role text;
  v_admin_count integer;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden: Administrator role required.';
  END IF;

  IF p_new_role NOT IN ('student', 'educator', 'admin') THEN
    RAISE EXCEPTION 'Invalid role specified.';
  END IF;

  SELECT role INTO v_old_role FROM public.profiles WHERE id = p_target_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user profile not found.';
  END IF;

  IF v_old_role = 'admin' AND p_new_role <> 'admin' THEN
    SELECT COUNT(*) INTO v_admin_count FROM public.profiles WHERE role = 'admin';
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot remove administrator privileges from the last remaining platform admin.';
    END IF;
  END IF;

  UPDATE public.profiles
  SET role = p_new_role,
      updated_at = timezone('utc', now())
  WHERE id = p_target_user_id;

  INSERT INTO public.admin_audit_logs (
    admin_user_id, action_type, target_type, target_id, summary, details
  ) VALUES (
    v_admin_id,
    'update_user_role',
    'profile',
    p_target_user_id::text,
    'Updated user role from ' || v_old_role || ' to ' || p_new_role,
    jsonb_build_object('previousRole', v_old_role, 'newRole', p_new_role)
  );

  RETURN jsonb_build_object('userId', p_target_user_id, 'role', p_new_role);
END;
$$;

-- E. Admin Platform Overview Telemetry
CREATE OR REPLACE FUNCTION public.admin_get_platform_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden: Administrator role required.';
  END IF;

  RETURN jsonb_build_object(
    'totalUsers', (SELECT COUNT(*) FROM public.profiles),
    'studentUsers', (SELECT COUNT(*) FROM public.profiles WHERE role = 'student'),
    'educatorUsers', (SELECT COUNT(*) FROM public.profiles WHERE role = 'educator'),
    'adminUsers', (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin'),
    'onboardedStudents', (SELECT COUNT(*) FROM public.student_academic_profiles WHERE onboarding_completed = true),
    'publishedCourses', (SELECT COUNT(*) FROM public.learning_courses WHERE is_published = true),
    'draftCourses', (SELECT COUNT(*) FROM public.learning_courses WHERE is_published = false),
    'publishedSubjects', (SELECT COUNT(*) FROM public.learning_subjects WHERE is_published = true),
    'publishedLessons', (SELECT COUNT(*) FROM public.learning_lessons WHERE is_published = true),
    'publishedExamQuestions', (SELECT COUNT(*) FROM public.exam_questions WHERE is_published = true),
    'submittedExamAttempts', (SELECT COUNT(*) FROM public.student_exam_attempts WHERE status = 'submitted'),
    'aiRequestsTotal', (SELECT COUNT(*) FROM public.ai_usage_logs),
    'aiRequests24h', (SELECT COUNT(*) FROM public.ai_usage_logs WHERE created_at >= timezone('utc', now()) - interval '24 hours'),
    'aiErrors24h', (SELECT COUNT(*) FROM public.ai_usage_logs WHERE status = 'error' AND created_at >= timezone('utc', now()) - interval '24 hours'),
    'publishedAnnouncements', (SELECT COUNT(*) FROM public.platform_announcements WHERE is_published = true)
  );
END;
$$;

-- F. Student Self-Service Personal Data Purge (Step 10B NDPA / GDPR Data Retention Control)
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
  DELETE FROM public.student_notes WHERE user_id = v_uid;
  DELETE FROM public.student_planner_tasks WHERE user_id = v_uid;
  DELETE FROM public.student_timetable_entries WHERE user_id = v_uid;
  DELETE FROM public.student_assignments WHERE user_id = v_uid;
  DELETE FROM public.student_study_sessions WHERE user_id = v_uid;
  DELETE FROM public.student_exam_attempts WHERE user_id = v_uid;
  DELETE FROM public.student_exam_topic_performance WHERE user_id = v_uid;
  DELETE FROM public.student_lesson_bookmarks WHERE user_id = v_uid;
  DELETE FROM public.student_lesson_progress WHERE user_id = v_uid;
  DELETE FROM public.student_course_progress WHERE user_id = v_uid;
  DELETE FROM public.student_exercise_attempts WHERE user_id = v_uid;
  DELETE FROM public.student_notifications WHERE user_id = v_uid;

  RETURN jsonb_build_object('purged', true, 'timestamp', timezone('utc', now()));
END;
$$;

REVOKE ALL ON FUNCTION public.start_student_exam_attempt(text, text, text[], text, integer, boolean, integer, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_student_exam_attempt(text, text, text[], text, integer, boolean, integer, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.submit_student_exam_attempt(uuid, jsonb, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_student_exam_attempt(uuid, jsonb, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.sync_student_event_notifications() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_student_event_notifications() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_update_user_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_get_platform_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_platform_overview() TO authenticated;

REVOKE ALL ON FUNCTION public.purge_own_student_learning_records() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purge_own_student_learning_records() TO authenticated;

-- ============================================================================
-- SEED EXAM CATEGORIES, EXAM SUBJECTS & TRUTHFULLY ATTRIBUTED PRACTICE QUESTIONS
-- ============================================================================

INSERT INTO public.exam_categories (
  id, code, name, short_label, academic_category, description, disclaimer_text, default_duration_minutes, is_published, sort_order
) VALUES
  (
    '91111111-1111-4111-8111-111111111101',
    'WAEC',
    'West African Senior School Certificate Practice (WASSCE Style)',
    'WAEC Practice',
    'secondary',
    'Structured senior secondary practice aligned with West African secondary science, mathematics, and humanities topics.',
    'Independent preparation resource. E-LEARNING ECOSYSTEM is not affiliated with or endorsed by WAEC, and questions are original/OER-adapted practice items rather than copyrighted past papers.',
    30,
    true,
    1
  ),
  (
    '91111111-1111-4111-8111-111111111102',
    'NECO',
    'National Examinations Council Senior Secondary Practice (SSCE Style)',
    'NECO Practice',
    'secondary',
    'Targeted topic mastery and timed objective/short-answer practice for Nigerian senior secondary learners.',
    'Independent preparation resource. E-LEARNING ECOSYSTEM is not affiliated with or endorsed by NECO, and questions are original/OER-adapted practice items.',
    30,
    true,
    2
  ),
  (
    '91111111-1111-4111-8111-111111111103',
    'JAMB_UTME',
    'Unified Tertiary Matriculation Practice (UTME CBT Style)',
    'JAMB UTME Practice',
    'secondary',
    'Speed-and-accuracy computer-based objective practice across core matriculation subjects.',
    'Independent CBT practice simulation. E-LEARNING ECOSYSTEM is not affiliated with or endorsed by JAMB, and questions are original/OER-adapted practice items.',
    25,
    true,
    3
  ),
  (
    '91111111-1111-4111-8111-111111111104',
    'SCHOOL_GENERAL',
    'General Secondary School Continuous Assessment & Term Exams',
    'School Exams',
    'secondary',
    'General junior and senior secondary school termly test and revision practice.',
    'General curriculum practice resource tailored to classroom revision.',
    25,
    true,
    4
  ),
  (
    '91111111-1111-4111-8111-111111111105',
    'UNIVERSITY_SEMESTER',
    'University Continuous Assessment & Semester Examination Prep',
    'University Exams',
    'university',
    'Undergraduate foundational examination practice covering computing, sciences, and analytical problem solving.',
    'General undergraduate academic practice; always consult your faculty course outline.',
    35,
    true,
    5
  ),
  (
    '91111111-1111-4111-8111-111111111106',
    'POLYTECHNIC_DIPLOMA',
    'Polytechnic & Technical Diploma Assessment Practice (ND / HND)',
    'Polytechnic Exams',
    'polytechnic',
    'Technical theory and applied calculation practice for National Diploma and Higher National Diploma learners.',
    'General technical education practice resource aligned with foundational engineering and applied topics.',
    35,
    true,
    6
  )
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.exam_subjects (exam_category_id, subject_name, subject_slug, available_topics, sort_order) VALUES
  ('91111111-1111-4111-8111-111111111101', 'Physics', 'physics', ARRAY['Scalars & Vectors', 'Kinematics & Uniform Acceleration', 'Ohm''s Law & DC Circuits'], 1),
  ('91111111-1111-4111-8111-111111111101', 'Mathematics', 'mathematics', ARRAY['Linear Equations & Algebra', 'Indices & Logarithms', 'Mensuration & Geometry'], 2),
  ('91111111-1111-4111-8111-111111111102', 'Physics', 'physics', ARRAY['Scalars & Vectors', 'Kinematics & Uniform Acceleration'], 1),
  ('91111111-1111-4111-8111-111111111102', 'Mathematics', 'mathematics', ARRAY['Linear Equations & Algebra', 'Indices & Logarithms'], 2),
  ('91111111-1111-4111-8111-111111111103', 'Physics', 'physics', ARRAY['Scalars & Vectors', 'Kinematics & Uniform Acceleration', 'Ohm''s Law & DC Circuits'], 1),
  ('91111111-1111-4111-8111-111111111103', 'Mathematics', 'mathematics', ARRAY['Linear Equations & Algebra', 'Indices & Logarithms'], 2),
  ('91111111-1111-4111-8111-111111111104', 'Mathematics', 'mathematics', ARRAY['Linear Equations & Algebra', 'Fractions & Ratios'], 1),
  ('91111111-1111-4111-8111-111111111104', 'Physics', 'physics', ARRAY['Scalars & Vectors'], 2),
  ('91111111-1111-4111-8111-111111111105', 'Computer Studies', 'computer-studies', ARRAY['Algorithmic Properties', 'Big-O Time Complexity', 'Searching & Sorting'], 1),
  ('91111111-1111-4111-8111-111111111106', 'Electrical & Technical Engineering', 'electrical-and-technical-engineering', ARRAY['Ohm''s Law & DC Circuits', 'Electrical Power & Energy'], 1)
ON CONFLICT (exam_category_id, subject_slug) DO NOTHING;

-- Curated Practice Questions (linked to Step 5 CC BY 4.0 / original sources)
INSERT INTO public.exam_questions (
  id, exam_category_id, subject, topic, difficulty, question_type, prompt, points,
  origin_type, source_id, verification_id, recommended_course_slug, recommended_lesson_slug, is_published
) VALUES
  -- WAEC Physics (4 questions)
  (
    '92222222-2222-4222-8222-222222222201',
    '91111111-1111-4111-8111-111111111101',
    'Physics',
    'Scalars & Vectors',
    'easy',
    'multiple_choice',
    'A student walks 6 m due East and then 8 m due North. What is the magnitude of the student''s resultant displacement from the starting point?',
    2,
    'curated_practice',
    '11111111-1111-4111-8111-111111111101',
    '22222222-2222-4222-8222-222222222201',
    'foundations-of-motion-and-vectors',
    'scalars-and-vectors',
    true
  ),
  (
    '92222222-2222-4222-8222-222222222202',
    '91111111-1111-4111-8111-111111111101',
    'Physics',
    'Scalars & Vectors',
    'easy',
    'true_false',
    'Kinetic energy is a vector quantity because a moving object travels in a specific direction.',
    1,
    'curated_practice',
    '11111111-1111-4111-8111-111111111101',
    '22222222-2222-4222-8222-222222222201',
    'foundations-of-motion-and-vectors',
    'scalars-and-vectors',
    true
  ),
  (
    '92222222-2222-4222-8222-222222222203',
    '91111111-1111-4111-8111-111111111101',
    'Physics',
    'Kinematics & Uniform Acceleration',
    'medium',
    'multiple_choice',
    'A car accelerates uniformly from 5 m/s to 25 m/s in 4 seconds along a straight road. What is its acceleration?',
    2,
    'curated_practice',
    '11111111-1111-4111-8111-111111111101',
    '22222222-2222-4222-8222-222222222201',
    'foundations-of-motion-and-vectors',
    'speed-velocity-and-acceleration',
    true
  ),
  (
    '92222222-2222-4222-8222-222222222204',
    '91111111-1111-4111-8111-111111111101',
    'Physics',
    'Ohm''s Law & DC Circuits',
    'medium',
    'short_answer',
    'State the SI unit of electrical resistance (word only, singular).',
    1,
    'curated_practice',
    '11111111-1111-4111-8111-111111111102',
    '22222222-2222-4222-8222-222222222202',
    'dc-circuit-fundamentals-ohms-law',
    'ohms-law-and-resistive-circuits',
    true
  ),
  -- JAMB UTME Physics (2 questions)
  (
    '92222222-2222-4222-8222-222222222205',
    '91111111-1111-4111-8111-111111111103',
    'Physics',
    'Kinematics & Uniform Acceleration',
    'medium',
    'multiple_choice',
    'A body starts from rest and moves with a uniform acceleration of 4 m/s^2 for 5 s. Calculate the distance covered.',
    2,
    'curated_practice',
    '11111111-1111-4111-8111-111111111101',
    '22222222-2222-4222-8222-222222222201',
    'foundations-of-motion-and-vectors',
    'speed-velocity-and-acceleration',
    true
  ),
  (
    '92222222-2222-4222-8222-222222222206',
    '91111111-1111-4111-8111-111111111103',
    'Physics',
    'Scalars & Vectors',
    'easy',
    'multiple_choice',
    'Which of the following pairs consists ONLY of vector quantities?',
    2,
    'curated_practice',
    '11111111-1111-4111-8111-111111111101',
    '22222222-2222-4222-8222-222222222201',
    'foundations-of-motion-and-vectors',
    'scalars-and-vectors',
    true
  ),
  -- WAEC Mathematics (2 questions)
  (
    '92222222-2222-4222-8222-222222222207',
    '91111111-1111-4111-8111-111111111101',
    'Mathematics',
    'Linear Equations & Algebra',
    'easy',
    'multiple_choice',
    'Solve for x in the linear equation: 3(2x - 4) = 18.',
    2,
    'curated_practice',
    '11111111-1111-4111-8111-111111111103',
    '22222222-2222-4222-8222-222222222203',
    NULL,
    NULL,
    true
  ),
  (
    '92222222-2222-4222-8222-222222222208',
    '91111111-1111-4111-8111-111111111101',
    'Mathematics',
    'Indices & Logarithms',
    'medium',
    'multiple_choice',
    'Evaluate log_2(32).',
    2,
    'curated_practice',
    '11111111-1111-4111-8111-111111111103',
    '22222222-2222-4222-8222-222222222203',
    NULL,
    NULL,
    true
  ),
  -- University Computer Studies (2 questions)
  (
    '92222222-2222-4222-8222-222222222209',
    '91111111-1111-4111-8111-111111111105',
    'Computer Studies',
    'Big-O Time Complexity',
    'medium',
    'multiple_choice',
    'What is the worst-case time complexity of binary search on a sorted array of n elements?',
    2,
    'curated_practice',
    '11111111-1111-4111-8111-111111111103',
    '22222222-2222-4222-8222-222222222203',
    'intro-to-algorithms-and-complexity',
    'big-o-time-complexity',
    true
  ),
  (
    '92222222-2222-4222-8222-222222222210',
    '91111111-1111-4111-8111-111111111105',
    'Computer Studies',
    'Algorithmic Properties',
    'easy',
    'true_false',
    'Finiteness requires that a valid algorithm must terminate after a finite number of steps for every valid input.',
    1,
    'curated_practice',
    '11111111-1111-4111-8111-111111111103',
    '22222222-2222-4222-8222-222222222203',
    'intro-to-algorithms-and-complexity',
    'what-makes-an-algorithm',
    true
  ),
  -- Polytechnic Electrical Engineering (2 questions)
  (
    '92222222-2222-4222-8222-222222222211',
    '91111111-1111-4111-8111-111111111106',
    'Electrical & Technical Engineering',
    'Ohm''s Law & DC Circuits',
    'easy',
    'multiple_choice',
    'A 24 V DC supply is connected across a 12 ohm resistor. What current flows through the resistor?',
    2,
    'curated_practice',
    '11111111-1111-4111-8111-111111111102',
    '22222222-2222-4222-8222-222222222202',
    'dc-circuit-fundamentals-ohms-law',
    'ohms-law-and-resistive-circuits',
    true
  ),
  (
    '92222222-2222-4222-8222-222222222212',
    '91111111-1111-4111-8111-111111111106',
    'Electrical & Technical Engineering',
    'Electrical Power & Energy',
    'medium',
    'multiple_choice',
    'Calculate the power dissipated by a 10 ohm resistor carrying a steady DC current of 3 A.',
    2,
    'curated_practice',
    '11111111-1111-4111-8111-111111111102',
    '22222222-2222-4222-8222-222222222202',
    'dc-circuit-fundamentals-ohms-law',
    'ohms-law-and-resistive-circuits',
    true
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.exam_question_options (question_id, option_key, option_text, option_order) VALUES
  ('92222222-2222-4222-8222-222222222201', 'A', '14 m', 1),
  ('92222222-2222-4222-8222-222222222201', 'B', '10 m', 2),
  ('92222222-2222-4222-8222-222222222201', 'C', '2 m', 3),
  ('92222222-2222-4222-8222-222222222201', 'D', '48 m', 4),

  ('92222222-2222-4222-8222-222222222203', 'A', '5.0 m/s^2', 1),
  ('92222222-2222-4222-8222-222222222203', 'B', '6.25 m/s^2', 2),
  ('92222222-2222-4222-8222-222222222203', 'C', '7.5 m/s^2', 3),
  ('92222222-2222-4222-8222-222222222203', 'D', '20.0 m/s^2', 4),

  ('92222222-2222-4222-8222-222222222205', 'A', '20 m', 1),
  ('92222222-2222-4222-8222-222222222205', 'B', '50 m', 2),
  ('92222222-2222-4222-8222-222222222205', 'C', '100 m', 3),
  ('92222222-2222-4222-8222-222222222205', 'D', '10 m', 4),

  ('92222222-2222-4222-8222-222222222206', 'A', 'Speed and Mass', 1),
  ('92222222-2222-4222-8222-222222222206', 'B', 'Distance and Work', 2),
  ('92222222-2222-4222-8222-222222222206', 'C', 'Velocity and Force', 3),
  ('92222222-2222-4222-8222-222222222206', 'D', 'Temperature and Power', 4),

  ('92222222-2222-4222-8222-222222222207', 'A', '3', 1),
  ('92222222-2222-4222-8222-222222222207', 'B', '5', 2),
  ('92222222-2222-4222-8222-222222222207', 'C', '6', 3),
  ('92222222-2222-4222-8222-222222222207', 'D', '7', 4),

  ('92222222-2222-4222-8222-222222222208', 'A', '4', 1),
  ('92222222-2222-4222-8222-222222222208', 'B', '5', 2),
  ('92222222-2222-4222-8222-222222222208', 'C', '6', 3),
  ('92222222-2222-4222-8222-222222222208', 'D', '16', 4),

  ('92222222-2222-4222-8222-222222222209', 'A', 'O(1)', 1),
  ('92222222-2222-4222-8222-222222222209', 'B', 'O(log n)', 2),
  ('92222222-2222-4222-8222-222222222209', 'C', 'O(n)', 3),
  ('92222222-2222-4222-8222-222222222209', 'D', 'O(n^2)', 4),

  ('92222222-2222-4222-8222-222222222211', 'A', '0.5 A', 1),
  ('92222222-2222-4222-8222-222222222211', 'B', '2.0 A', 2),
  ('92222222-2222-4222-8222-222222222211', 'C', '12.0 A', 3),
  ('92222222-2222-4222-8222-222222222211', 'D', '288 A', 4),

  ('92222222-2222-4222-8222-222222222212', 'A', '30 W', 1),
  ('92222222-2222-4222-8222-222222222212', 'B', '60 W', 2),
  ('92222222-2222-4222-8222-222222222212', 'C', '90 W', 3),
  ('92222222-2222-4222-8222-222222222212', 'D', '300 W', 4)
ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO public.exam_question_answer_keys (
  question_id, correct_option_key, correct_boolean, accepted_short_answers, explanation
) VALUES
  ('92222222-2222-4222-8222-222222222201', 'B', NULL, '{}', 'Using Pythagoras'' theorem for perpendicular displacements: |d| = sqrt(6^2 + 8^2) = sqrt(36 + 64) = sqrt(100) = 10 m.'),
  ('92222222-2222-4222-8222-222222222202', NULL, false, '{}', 'Kinetic energy (1/2 mv^2) depends on speed squared and has magnitude only, making it a scalar quantity.'),
  ('92222222-2222-4222-8222-222222222203', 'A', NULL, '{}', 'Acceleration a = (v - u) / t = (25 - 5) / 4 = 20 / 4 = 5.0 m/s^2.'),
  ('92222222-2222-4222-8222-222222222204', NULL, NULL, ARRAY['ohm', 'ohms'], 'Electrical resistance R = V / I is measured in ohms (symbol Ω) in the SI system.'),
  ('92222222-2222-4222-8222-222222222205', 'B', NULL, '{}', 'From s = ut + 1/2 at^2 with u = 0: s = 0 + 0.5 * 4 * 5^2 = 2 * 25 = 50 m.'),
  ('92222222-2222-4222-8222-222222222206', 'C', NULL, '{}', 'Both velocity and force possess magnitude and direction, so both are vectors.'),
  ('92222222-2222-4222-8222-222222222207', 'B', NULL, '{}', 'Divide both sides by 3: 2x - 4 = 6 -> 2x = 10 -> x = 5.'),
  ('92222222-2222-4222-8222-222222222208', 'B', NULL, '{}', 'Since 2^5 = 32, log base 2 of 32 equals 5.'),
  ('92222222-2222-4222-8222-222222222209', 'B', NULL, '{}', 'Binary search halves the remaining search interval on every comparison, yielding O(log n) worst-case time.'),
  ('92222222-2222-4222-8222-222222222210', NULL, true, '{}', 'Finiteness guarantees termination after a finite number of steps rather than looping indefinitely.'),
  ('92222222-2222-4222-8222-222222222211', 'B', NULL, '{}', 'By Ohm''s Law, I = V / R = 24 V / 12 Ω = 2.0 A.'),
  ('92222222-2222-4222-8222-222222222212', 'C', NULL, '{}', 'Electrical power P = I^2 * R = (3^2) * 10 = 9 * 10 = 90 W.')
ON CONFLICT (question_id) DO NOTHING;
