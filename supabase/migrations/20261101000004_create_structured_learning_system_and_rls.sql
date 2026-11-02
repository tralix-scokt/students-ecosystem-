-- ============================================================================
-- E-LEARNING ECOSYSTEM (Powered by TRALIX AI) — Step 5 Structured Learning System
-- Migration: 20261101000004_create_structured_learning_system_and_rls.sql
-- ============================================================================
-- Implements:
--   1. Curricula, Education Levels, and Personalized Subjects catalog
--   2. Content Sources & Verification Records (Verified, AI-Generated, Third-Party)
--      with strict SQL check constraints preventing AI content from ever being
--      marked as officially verified.
--   3. Extended Courses, Course Topics, Lessons, and Rich Learning Materials
--   4. Exercises, Questions, Public Answer Options, and Protected Answer Keys
--   5. Student Lesson Progress, Bookmarks, Exercise Attempts, and Course Resume
--   6. Forced Row Level Security (RLS), Admin-only authoring policies, and
--      SECURITY DEFINER deterministic evaluation & progress RPCs.
--   7. Concise, properly attributed sample starter content (3 starter courses).

-- ----------------------------------------------------------------------------
-- 0. Administrative Role Verification Helper
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- ----------------------------------------------------------------------------
-- 1. Curricula, Education Levels, and Subjects
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learning_curricula (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (char_length(btrim(code)) BETWEEN 2 AND 80),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 180),
  academic_category text NOT NULL CHECK (
    academic_category IN ('secondary', 'university', 'polytechnic', 'all')
  ),
  country text NULL,
  description text NULL CHECK (
    description IS NULL OR char_length(btrim(description)) <= 500
  ),
  sort_order integer NOT NULL DEFAULT 100,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.learning_education_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (char_length(btrim(code)) BETWEEN 2 AND 60),
  label text NOT NULL CHECK (char_length(btrim(label)) BETWEEN 2 AND 100),
  academic_category text NOT NULL CHECK (
    academic_category IN ('secondary', 'university', 'polytechnic')
  ),
  secondary_stage text NULL CHECK (
    secondary_stage IS NULL OR secondary_stage IN ('junior', 'senior')
  ),
  qualification_type text NULL,
  sort_order integer NOT NULL DEFAULT 100,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.learning_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (char_length(btrim(slug)) BETWEEN 2 AND 120),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 140),
  learning_category text NOT NULL CHECK (
    learning_category IN (
      'Mathematics',
      'English Language',
      'Physics',
      'Chemistry',
      'Biology',
      'Computer Studies',
      'Economics',
      'Government',
      'Literature',
      'Technical and vocational subjects',
      'Departmental & Advanced Studies'
    )
  ),
  description text NULL CHECK (
    description IS NULL OR char_length(btrim(description)) <= 500
  ),
  academic_categories text[] NOT NULL DEFAULT '{}',
  education_levels text[] NOT NULL DEFAULT '{}',
  curriculum_codes text[] NOT NULL DEFAULT '{}',
  waec_neco_relevant boolean NOT NULL DEFAULT false,
  faculty_keywords text[] NOT NULL DEFAULT '{}',
  department_keywords text[] NOT NULL DEFAULT '{}',
  qualification_keywords text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 100,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS learning_subjects_published_idx
  ON public.learning_subjects (is_published, sort_order);

-- ----------------------------------------------------------------------------
-- 2. Content Sources & Verification Records (Section 6 Quality Architecture)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learning_content_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (char_length(btrim(slug)) BETWEEN 2 AND 120),
  source_name text NOT NULL CHECK (char_length(btrim(source_name)) BETWEEN 2 AND 200),
  source_url_or_reference text NULL CHECK (
    source_url_or_reference IS NULL OR char_length(btrim(source_url_or_reference)) <= 500
  ),
  author_or_publisher text NOT NULL CHECK (
    char_length(btrim(author_or_publisher)) BETWEEN 2 AND 200
  ),
  content_classification text NOT NULL CHECK (
    content_classification IN ('verified', 'ai_generated', 'imported_third_party')
  ),
  license_or_permission text NOT NULL CHECK (
    char_length(btrim(license_or_permission)) BETWEEN 2 AND 350
  ),
  attribution_text text NULL CHECK (
    attribution_text IS NULL OR char_length(btrim(attribution_text)) <= 600
  ),
  is_approved_source boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.learning_content_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (char_length(btrim(code)) BETWEEN 2 AND 120),
  source_id uuid NOT NULL REFERENCES public.learning_content_sources(id) ON DELETE CASCADE,
  content_classification text NOT NULL CHECK (
    content_classification IN ('verified', 'ai_generated', 'imported_third_party')
  ),
  verification_status text NOT NULL CHECK (
    verification_status IN (
      'draft',
      'pending_review',
      'verified',
      'unverified_ai',
      'attributed_third_party',
      'rejected'
    )
  ),
  approved_for_publication boolean NOT NULL DEFAULT false,
  reviewer_name text NULL CHECK (
    reviewer_name IS NULL OR char_length(btrim(reviewer_name)) BETWEEN 2 AND 160
  ),
  reviewer_user_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz NULL,
  review_notes text NULL CHECK (
    review_notes IS NULL OR char_length(btrim(review_notes)) <= 600
  ),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  -- CRITICAL RULE: AI-generated material can NEVER be labeled as officially verified
  CONSTRAINT chk_ai_content_never_verified CHECK (
    NOT (content_classification = 'ai_generated' AND verification_status = 'verified')
  ),
  -- Verified educational content requires an identifiable reviewer and review timestamp
  CONSTRAINT chk_verified_requires_identifiable_reviewer CHECK (
    verification_status <> 'verified'
    OR (
      content_classification = 'verified'
      AND reviewer_name IS NOT NULL
      AND reviewed_at IS NOT NULL
    )
  ),
  -- Rejected or draft records cannot be approved for student publication
  CONSTRAINT chk_publication_approval_consistency CHECK (
    NOT (approved_for_publication = true AND verification_status IN ('draft', 'rejected'))
  )
);

-- ----------------------------------------------------------------------------
-- 3. Extend public.learning_courses + Create Topics, Lessons & Materials
-- ----------------------------------------------------------------------------
ALTER TABLE public.learning_courses
  ADD COLUMN IF NOT EXISTS subject_id uuid NULL REFERENCES public.learning_subjects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description text NULL,
  ADD COLUMN IF NOT EXISTS education_level text NULL,
  ADD COLUMN IF NOT EXISTS curriculum text NULL,
  ADD COLUMN IF NOT EXISTS curriculum_id uuid NULL REFERENCES public.learning_curricula(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS thumbnail_url text NULL,
  ADD COLUMN IF NOT EXISTS instructor_name text NULL,
  ADD COLUMN IF NOT EXISTS learning_objectives text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes integer NULL CHECK (
    estimated_duration_minutes IS NULL OR (estimated_duration_minutes > 0 AND estimated_duration_minutes <= 6000)
  ),
  ADD COLUMN IF NOT EXISTS difficulty text NULL CHECK (
    difficulty IS NULL OR difficulty IN ('foundational', 'intermediate', 'advanced')
  ),
  ADD COLUMN IF NOT EXISTS publication_status text NOT NULL DEFAULT 'draft' CHECK (
    publication_status IN ('draft', 'in_review', 'published', 'archived')
  ),
  ADD COLUMN IF NOT EXISTS source_id uuid NULL REFERENCES public.learning_content_sources(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS verification_id uuid NULL REFERENCES public.learning_content_verifications(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS learning_courses_subject_id_idx
  ON public.learning_courses (subject_id);

CREATE INDEX IF NOT EXISTS learning_courses_level_curriculum_idx
  ON public.learning_courses (academic_category, education_level);

CREATE TABLE IF NOT EXISTS public.learning_course_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  slug text NOT NULL CHECK (char_length(btrim(slug)) BETWEEN 2 AND 140),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 200),
  description text NULL CHECK (
    description IS NULL OR char_length(btrim(description)) <= 500
  ),
  topic_order integer NOT NULL CHECK (topic_order >= 1),
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT learning_course_topics_course_slug_unique UNIQUE (course_id, slug),
  CONSTRAINT learning_course_topics_course_order_unique UNIQUE (course_id, topic_order)
);

CREATE INDEX IF NOT EXISTS learning_course_topics_course_idx
  ON public.learning_course_topics (course_id, topic_order);

CREATE TABLE IF NOT EXISTS public.learning_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.learning_course_topics(id) ON DELETE CASCADE,
  slug text NOT NULL CHECK (char_length(btrim(slug)) BETWEEN 2 AND 140),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 200),
  lesson_order integer NOT NULL CHECK (lesson_order >= 1),
  introduction text NOT NULL CHECK (char_length(btrim(introduction)) >= 10),
  learning_objectives text[] NOT NULL DEFAULT '{}',
  summary text NULL,
  key_points text[] NOT NULL DEFAULT '{}',
  estimated_reading_minutes integer NULL CHECK (
    estimated_reading_minutes IS NULL OR (estimated_reading_minutes > 0 AND estimated_reading_minutes <= 240)
  ),
  source_id uuid NOT NULL REFERENCES public.learning_content_sources(id) ON DELETE RESTRICT,
  verification_id uuid NOT NULL REFERENCES public.learning_content_verifications(id) ON DELETE RESTRICT,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT learning_lessons_course_slug_unique UNIQUE (course_id, slug),
  CONSTRAINT learning_lessons_topic_order_unique UNIQUE (topic_id, lesson_order)
);

CREATE INDEX IF NOT EXISTS learning_lessons_course_topic_idx
  ON public.learning_lessons (course_id, topic_id, lesson_order);

CREATE TABLE IF NOT EXISTS public.learning_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.learning_lessons(id) ON DELETE CASCADE,
  material_order integer NOT NULL CHECK (material_order >= 1),
  block_type text NOT NULL CHECK (
    block_type IN (
      'explanation',
      'subheading',
      'definition',
      'worked_example',
      'formula',
      'table',
      'diagram'
    )
  ),
  heading text NULL,
  body text NULL,
  definition_term text NULL,
  formula_expression text NULL,
  formula_notes text NULL,
  example_steps jsonb NULL,
  example_conclusion text NULL,
  table_caption text NULL,
  table_headers text[] NULL,
  table_rows jsonb NULL,
  diagram_key text NULL,
  image_url text NULL,
  media_alt text NULL,
  media_caption text NULL,
  source_id uuid NOT NULL REFERENCES public.learning_content_sources(id) ON DELETE RESTRICT,
  verification_id uuid NOT NULL REFERENCES public.learning_content_verifications(id) ON DELETE RESTRICT,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT learning_materials_lesson_order_unique UNIQUE (lesson_id, material_order)
);

CREATE INDEX IF NOT EXISTS learning_materials_lesson_idx
  ON public.learning_materials (lesson_id, material_order);

-- ----------------------------------------------------------------------------
-- 4. Exercises, Questions, Public Answer Options, and Protected Answer Keys
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learning_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.learning_lessons(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 200),
  instructions text NULL,
  exercise_order integer NOT NULL DEFAULT 1 CHECK (exercise_order >= 1),
  allow_retries boolean NOT NULL DEFAULT true,
  source_id uuid NOT NULL REFERENCES public.learning_content_sources(id) ON DELETE RESTRICT,
  verification_id uuid NOT NULL REFERENCES public.learning_content_verifications(id) ON DELETE RESTRICT,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS learning_exercises_lesson_idx
  ON public.learning_exercises (lesson_id, exercise_order);

CREATE TABLE IF NOT EXISTS public.learning_exercise_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES public.learning_exercises(id) ON DELETE CASCADE,
  question_order integer NOT NULL CHECK (question_order >= 1),
  question_type text NOT NULL CHECK (
    question_type IN (
      'multiple_choice',
      'true_false',
      'short_answer',
      'numerical',
      'written_response'
    )
  ),
  prompt text NOT NULL CHECK (char_length(btrim(prompt)) >= 4),
  helper_text text NULL,
  unit_label text NULL,
  points integer NOT NULL DEFAULT 1 CHECK (points >= 0 AND points <= 20),
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT learning_exercise_questions_order_unique UNIQUE (exercise_id, question_order)
);

CREATE INDEX IF NOT EXISTS learning_exercise_questions_exercise_idx
  ON public.learning_exercise_questions (exercise_id, question_order);

-- Public options table intentionally omits correctness flags so client reads cannot leak keys
CREATE TABLE IF NOT EXISTS public.learning_question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.learning_exercise_questions(id) ON DELETE CASCADE,
  option_key text NOT NULL CHECK (char_length(btrim(option_key)) BETWEEN 1 AND 20),
  option_text text NOT NULL CHECK (char_length(btrim(option_text)) >= 1),
  option_order integer NOT NULL CHECK (option_order >= 1),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT learning_question_options_key_unique UNIQUE (question_id, option_key)
);

CREATE INDEX IF NOT EXISTS learning_question_options_question_idx
  ON public.learning_question_options (question_id, option_order);

-- Protected answer key configurations (NEVER directly selectable by non-admin learners)
CREATE TABLE IF NOT EXISTS public.learning_question_answer_keys (
  question_id uuid PRIMARY KEY REFERENCES public.learning_exercise_questions(id) ON DELETE CASCADE,
  evaluation_method text NOT NULL CHECK (
    evaluation_method IN (
      'exact_option',
      'accepted_text',
      'numeric_tolerance',
      'written_self_check'
    )
  ),
  correct_option_key text NULL,
  accepted_texts text[] NOT NULL DEFAULT '{}',
  case_sensitive boolean NOT NULL DEFAULT false,
  numeric_value numeric NULL,
  numeric_tolerance numeric NOT NULL DEFAULT 0 CHECK (numeric_tolerance >= 0),
  accepted_units text[] NOT NULL DEFAULT '{}',
  correct_answer_display text NOT NULL,
  explanation text NOT NULL CHECK (char_length(btrim(explanation)) >= 4),
  rubric_guidance text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- ----------------------------------------------------------------------------
-- 5. Student Progress, Lesson Completions, Exercise Attempts, and Bookmarks
-- ----------------------------------------------------------------------------
ALTER TABLE public.student_course_progress
  ADD COLUMN IF NOT EXISTS last_lesson_id uuid NULL REFERENCES public.learning_lessons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_lesson_slug text NULL,
  ADD COLUMN IF NOT EXISTS lessons_started integer NOT NULL DEFAULT 0 CHECK (lessons_started >= 0),
  ADD COLUMN IF NOT EXISTS total_time_spent_seconds integer NOT NULL DEFAULT 0 CHECK (total_time_spent_seconds >= 0);

CREATE TABLE IF NOT EXISTS public.student_lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.learning_course_topics(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.learning_lessons(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress' CHECK (
    status IN ('in_progress', 'completed')
  ),
  is_completed boolean NOT NULL DEFAULT false,
  time_spent_seconds integer NOT NULL DEFAULT 0 CHECK (time_spent_seconds >= 0),
  started_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  last_accessed_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT student_lesson_progress_user_lesson_unique UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS student_lesson_progress_user_recent_idx
  ON public.student_lesson_progress (user_id, last_accessed_at DESC);

CREATE INDEX IF NOT EXISTS student_lesson_progress_user_course_idx
  ON public.student_lesson_progress (user_id, course_id);

CREATE TABLE IF NOT EXISTS public.student_exercise_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.learning_lessons(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.learning_exercises(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL CHECK (attempt_number >= 1),
  submitted_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  evaluation_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  gradable_questions_count integer NOT NULL DEFAULT 0 CHECK (gradable_questions_count >= 0),
  correct_answers_count integer NOT NULL DEFAULT 0 CHECK (correct_answers_count >= 0),
  written_responses_count integer NOT NULL DEFAULT 0 CHECK (written_responses_count >= 0),
  earned_points integer NOT NULL DEFAULT 0 CHECK (earned_points >= 0),
  possible_points integer NOT NULL DEFAULT 0 CHECK (possible_points >= 0),
  score_percent numeric(5,2) NULL CHECK (
    score_percent IS NULL OR (score_percent >= 0 AND score_percent <= 100)
  ),
  time_spent_seconds integer NULL CHECK (
    time_spent_seconds IS NULL OR time_spent_seconds >= 0
  ),
  submitted_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS student_exercise_attempts_user_exercise_idx
  ON public.student_exercise_attempts (user_id, exercise_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS student_exercise_attempts_user_recent_idx
  ON public.student_exercise_attempts (user_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS public.student_lesson_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.learning_lessons(id) ON DELETE CASCADE,
  note text NULL CHECK (note IS NULL OR char_length(btrim(note)) <= 280),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT student_lesson_bookmarks_user_lesson_unique UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS student_lesson_bookmarks_user_created_idx
  ON public.student_lesson_bookmarks (user_id, created_at DESC);

-- Audit & Timestamp Triggers on New Tables
DROP TRIGGER IF EXISTS trg_lesson_progress_owner ON public.student_lesson_progress;
CREATE TRIGGER trg_lesson_progress_owner
  BEFORE UPDATE ON public.student_lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.enforce_student_owned_row_audit();

DROP TRIGGER IF EXISTS trg_lesson_progress_updated ON public.student_lesson_progress;
CREATE TRIGGER trg_lesson_progress_updated
  BEFORE UPDATE ON public.student_lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_utc();

DROP TRIGGER IF EXISTS trg_exercise_attempts_owner ON public.student_exercise_attempts;
CREATE TRIGGER trg_exercise_attempts_owner
  BEFORE UPDATE ON public.student_exercise_attempts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_student_owned_row_audit();

DROP TRIGGER IF EXISTS trg_lesson_bookmarks_owner ON public.student_lesson_bookmarks;
CREATE TRIGGER trg_lesson_bookmarks_owner
  BEFORE UPDATE ON public.student_lesson_bookmarks
  FOR EACH ROW EXECUTE FUNCTION public.enforce_student_owned_row_audit();

-- ----------------------------------------------------------------------------
-- 6. Enable & Force Row Level Security + Strict Least-Privilege Policies
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'learning_curricula',
    'learning_education_levels',
    'learning_subjects',
    'learning_content_sources',
    'learning_content_verifications',
    'learning_course_topics',
    'learning_lessons',
    'learning_materials',
    'learning_exercises',
    'learning_exercise_questions',
    'learning_question_options',
    'learning_question_answer_keys',
    'student_lesson_progress',
    'student_exercise_attempts',
    'student_lesson_bookmarks'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated;', t);
  END LOOP;
END;
$$;

-- Catalog Read Grants for Authenticated Users (Answer keys excluded!)
GRANT SELECT ON
  public.learning_curricula,
  public.learning_education_levels,
  public.learning_subjects,
  public.learning_content_sources,
  public.learning_content_verifications,
  public.learning_course_topics,
  public.learning_lessons,
  public.learning_materials,
  public.learning_exercises,
  public.learning_exercise_questions,
  public.learning_question_options
TO authenticated;

-- Admin CRUD Grants on Catalog & Answer Key Tables (Enforced by RLS is_platform_admin())
GRANT INSERT, UPDATE, DELETE ON
  public.learning_curricula,
  public.learning_education_levels,
  public.learning_subjects,
  public.learning_content_sources,
  public.learning_content_verifications,
  public.learning_courses,
  public.learning_course_topics,
  public.learning_lessons,
  public.learning_materials,
  public.learning_exercises,
  public.learning_exercise_questions,
  public.learning_question_options
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_question_answer_keys TO authenticated;

-- Catalog RLS Policies: Students read ONLY approved published rows; Admins manage all
DROP POLICY IF EXISTS "curricula_read_published" ON public.learning_curricula;
CREATE POLICY "curricula_read_published" ON public.learning_curricula
  FOR SELECT TO authenticated
  USING (is_published = true OR public.is_platform_admin());

DROP POLICY IF EXISTS "curricula_admin_write" ON public.learning_curricula;
CREATE POLICY "curricula_admin_write" ON public.learning_curricula
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "education_levels_read_published" ON public.learning_education_levels;
CREATE POLICY "education_levels_read_published" ON public.learning_education_levels
  FOR SELECT TO authenticated
  USING (is_published = true OR public.is_platform_admin());

DROP POLICY IF EXISTS "education_levels_admin_write" ON public.learning_education_levels;
CREATE POLICY "education_levels_admin_write" ON public.learning_education_levels
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "subjects_read_published" ON public.learning_subjects;
CREATE POLICY "subjects_read_published" ON public.learning_subjects
  FOR SELECT TO authenticated
  USING (is_published = true OR public.is_platform_admin());

DROP POLICY IF EXISTS "subjects_admin_write" ON public.learning_subjects;
CREATE POLICY "subjects_admin_write" ON public.learning_subjects
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "sources_read_approved" ON public.learning_content_sources;
CREATE POLICY "sources_read_approved" ON public.learning_content_sources
  FOR SELECT TO authenticated
  USING (is_approved_source = true OR public.is_platform_admin());

DROP POLICY IF EXISTS "sources_admin_write" ON public.learning_content_sources;
CREATE POLICY "sources_admin_write" ON public.learning_content_sources
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "verifications_read_approved" ON public.learning_content_verifications;
CREATE POLICY "verifications_read_approved" ON public.learning_content_verifications
  FOR SELECT TO authenticated
  USING (approved_for_publication = true OR public.is_platform_admin());

DROP POLICY IF EXISTS "verifications_admin_write" ON public.learning_content_verifications;
CREATE POLICY "verifications_admin_write" ON public.learning_content_verifications
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Update learning_courses policies to enforce approved verification + admin authoring
DROP POLICY IF EXISTS "learning_courses_select_published" ON public.learning_courses;
CREATE POLICY "learning_courses_select_published" ON public.learning_courses
  FOR SELECT TO authenticated
  USING (
    (
      is_published = true
      AND publication_status = 'published'
      AND (
        verification_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.learning_content_verifications v
          WHERE v.id = learning_courses.verification_id
            AND v.approved_for_publication = true
        )
      )
    )
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "learning_courses_admin_write" ON public.learning_courses;
CREATE POLICY "learning_courses_admin_write" ON public.learning_courses
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "course_topics_read_published" ON public.learning_course_topics;
CREATE POLICY "course_topics_read_published" ON public.learning_course_topics
  FOR SELECT TO authenticated
  USING (
    (
      is_published = true
      AND EXISTS (
        SELECT 1 FROM public.learning_courses c
        WHERE c.id = learning_course_topics.course_id
          AND c.is_published = true
          AND c.publication_status = 'published'
      )
    )
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "course_topics_admin_write" ON public.learning_course_topics;
CREATE POLICY "course_topics_admin_write" ON public.learning_course_topics
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "lessons_read_published" ON public.learning_lessons;
CREATE POLICY "lessons_read_published" ON public.learning_lessons
  FOR SELECT TO authenticated
  USING (
    (
      is_published = true
      AND EXISTS (
        SELECT 1 FROM public.learning_courses c
        WHERE c.id = learning_lessons.course_id
          AND c.is_published = true
          AND c.publication_status = 'published'
      )
      AND EXISTS (
        SELECT 1 FROM public.learning_content_verifications v
        WHERE v.id = learning_lessons.verification_id
          AND v.approved_for_publication = true
      )
    )
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "lessons_admin_write" ON public.learning_lessons;
CREATE POLICY "lessons_admin_write" ON public.learning_lessons
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "materials_read_published" ON public.learning_materials;
CREATE POLICY "materials_read_published" ON public.learning_materials
  FOR SELECT TO authenticated
  USING (
    (
      is_published = true
      AND EXISTS (
        SELECT 1 FROM public.learning_lessons l
        JOIN public.learning_courses c ON c.id = l.course_id
        WHERE l.id = learning_materials.lesson_id
          AND l.is_published = true
          AND c.is_published = true
          AND c.publication_status = 'published'
      )
      AND EXISTS (
        SELECT 1 FROM public.learning_content_verifications v
        WHERE v.id = learning_materials.verification_id
          AND v.approved_for_publication = true
      )
    )
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "materials_admin_write" ON public.learning_materials;
CREATE POLICY "materials_admin_write" ON public.learning_materials
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "exercises_read_published" ON public.learning_exercises;
CREATE POLICY "exercises_read_published" ON public.learning_exercises
  FOR SELECT TO authenticated
  USING (
    (
      is_published = true
      AND EXISTS (
        SELECT 1 FROM public.learning_lessons l
        JOIN public.learning_courses c ON c.id = l.course_id
        WHERE l.id = learning_exercises.lesson_id
          AND l.is_published = true
          AND c.is_published = true
          AND c.publication_status = 'published'
      )
      AND EXISTS (
        SELECT 1 FROM public.learning_content_verifications v
        WHERE v.id = learning_exercises.verification_id
          AND v.approved_for_publication = true
      )
    )
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "exercises_admin_write" ON public.learning_exercises;
CREATE POLICY "exercises_admin_write" ON public.learning_exercises
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "exercise_questions_read_published" ON public.learning_exercise_questions;
CREATE POLICY "exercise_questions_read_published" ON public.learning_exercise_questions
  FOR SELECT TO authenticated
  USING (
    (
      is_published = true
      AND EXISTS (
        SELECT 1 FROM public.learning_exercises e
        JOIN public.learning_lessons l ON l.id = e.lesson_id
        JOIN public.learning_courses c ON c.id = l.course_id
        WHERE e.id = learning_exercise_questions.exercise_id
          AND e.is_published = true
          AND l.is_published = true
          AND c.is_published = true
          AND c.publication_status = 'published'
      )
    )
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "exercise_questions_admin_write" ON public.learning_exercise_questions;
CREATE POLICY "exercise_questions_admin_write" ON public.learning_exercise_questions
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "question_options_read_published" ON public.learning_question_options;
CREATE POLICY "question_options_read_published" ON public.learning_question_options
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_exercise_questions q
      JOIN public.learning_exercises e ON e.id = q.exercise_id
      JOIN public.learning_lessons l ON l.id = e.lesson_id
      JOIN public.learning_courses c ON c.id = l.course_id
      WHERE q.id = learning_question_options.question_id
        AND q.is_published = true
        AND e.is_published = true
        AND l.is_published = true
        AND c.is_published = true
        AND c.publication_status = 'published'
    )
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "question_options_admin_write" ON public.learning_question_options;
CREATE POLICY "question_options_admin_write" ON public.learning_question_options
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Answer keys: strictly admin-only! Students NEVER read raw answer keys directly
DROP POLICY IF EXISTS "answer_keys_admin_only" ON public.learning_question_answer_keys;
CREATE POLICY "answer_keys_admin_only" ON public.learning_question_answer_keys
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Private Student Activity Tables: strictly own-row access
GRANT SELECT, INSERT, UPDATE ON public.student_lesson_progress TO authenticated;
DROP POLICY IF EXISTS "lesson_progress_own_select" ON public.student_lesson_progress;
CREATE POLICY "lesson_progress_own_select" ON public.student_lesson_progress
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "lesson_progress_own_insert" ON public.student_lesson_progress;
CREATE POLICY "lesson_progress_own_insert" ON public.student_lesson_progress
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "lesson_progress_own_update" ON public.student_lesson_progress;
CREATE POLICY "lesson_progress_own_update" ON public.student_lesson_progress
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Exercise attempts: students can read their own attempts; inserts occur only via verified RPC
GRANT SELECT ON public.student_exercise_attempts TO authenticated;
DROP POLICY IF EXISTS "exercise_attempts_own_select" ON public.student_exercise_attempts;
CREATE POLICY "exercise_attempts_own_select" ON public.student_exercise_attempts
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Bookmarks: students manage only their own bookmarks
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_lesson_bookmarks TO authenticated;
DROP POLICY IF EXISTS "lesson_bookmarks_own_all" ON public.student_lesson_bookmarks;
CREATE POLICY "lesson_bookmarks_own_all" ON public.student_lesson_bookmarks
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- 7. Deterministic Lesson Progress & Exercise Evaluation RPCs
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_student_lesson_activity(
  p_lesson_id uuid,
  p_mark_completed boolean DEFAULT false,
  p_time_spent_seconds integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_lesson record;
  v_delta_seconds integer;
  v_now timestamptz := timezone('utc', now());
  v_total_published_lessons integer := 0;
  v_lessons_started integer := 0;
  v_lessons_completed integer := 0;
  v_total_time_seconds integer := 0;
  v_progress_pct numeric(5,2) := 0;
  v_course_completed_at timestamptz := NULL;
  v_lesson_row public.student_lesson_progress;
  v_course_row public.student_course_progress;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to record lesson progress.';
  END IF;

  SELECT
    l.id,
    l.slug,
    l.title,
    l.topic_id,
    l.course_id
  INTO v_lesson
  FROM public.learning_lessons l
  JOIN public.learning_course_topics t ON t.id = l.topic_id
  JOIN public.learning_courses c ON c.id = l.course_id
  WHERE l.id = p_lesson_id
    AND l.is_published = true
    AND t.is_published = true
    AND c.is_published = true
    AND c.publication_status = 'published';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lesson not found or not available for publication.';
  END IF;

  v_delta_seconds := LEAST(GREATEST(COALESCE(p_time_spent_seconds, 0), 0), 3600);

  INSERT INTO public.student_lesson_progress (
    user_id,
    course_id,
    topic_id,
    lesson_id,
    status,
    is_completed,
    time_spent_seconds,
    started_at,
    last_accessed_at,
    completed_at
  )
  VALUES (
    v_user_id,
    v_lesson.course_id,
    v_lesson.topic_id,
    v_lesson.id,
    CASE WHEN p_mark_completed THEN 'completed' ELSE 'in_progress' END,
    COALESCE(p_mark_completed, false),
    v_delta_seconds,
    v_now,
    v_now,
    CASE WHEN p_mark_completed THEN v_now ELSE NULL END
  )
  ON CONFLICT (user_id, lesson_id) DO UPDATE
    SET status = CASE
          WHEN public.student_lesson_progress.is_completed OR EXCLUDED.is_completed
          THEN 'completed'
          ELSE 'in_progress'
        END,
        is_completed = (public.student_lesson_progress.is_completed OR EXCLUDED.is_completed),
        time_spent_seconds = public.student_lesson_progress.time_spent_seconds + v_delta_seconds,
        last_accessed_at = v_now,
        completed_at = COALESCE(
          public.student_lesson_progress.completed_at,
          CASE WHEN EXCLUDED.is_completed THEN v_now ELSE NULL END
        ),
        updated_at = v_now
  RETURNING * INTO v_lesson_row;

  SELECT COUNT(*)::integer
  INTO v_total_published_lessons
  FROM public.learning_lessons l
  JOIN public.learning_course_topics t ON t.id = l.topic_id
  WHERE l.course_id = v_lesson.course_id
    AND l.is_published = true
    AND t.is_published = true;

  SELECT
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE is_completed = true)::integer,
    COALESCE(SUM(time_spent_seconds), 0)::integer
  INTO v_lessons_started, v_lessons_completed, v_total_time_seconds
  FROM public.student_lesson_progress
  WHERE user_id = v_user_id
    AND course_id = v_lesson.course_id;

  IF v_total_published_lessons > 0 THEN
    v_progress_pct := LEAST(
      100,
      ROUND((v_lessons_completed::numeric / v_total_published_lessons::numeric) * 100, 2)
    );
    IF v_lessons_completed >= v_total_published_lessons THEN
      v_course_completed_at := v_now;
    END IF;
  END IF;

  INSERT INTO public.student_course_progress (
    user_id,
    course_id,
    last_lesson_id,
    last_lesson_slug,
    current_lesson_title,
    lessons_started,
    lessons_completed,
    total_lessons,
    progress_percent,
    total_time_spent_seconds,
    last_accessed_at,
    completed_at
  )
  VALUES (
    v_user_id,
    v_lesson.course_id,
    v_lesson.id,
    v_lesson.slug,
    v_lesson.title,
    v_lessons_started,
    v_lessons_completed,
    v_total_published_lessons,
    v_progress_pct,
    v_total_time_seconds,
    v_now,
    v_course_completed_at
  )
  ON CONFLICT (user_id, course_id) DO UPDATE
    SET last_lesson_id = v_lesson.id,
        last_lesson_slug = v_lesson.slug,
        current_lesson_title = v_lesson.title,
        lessons_started = v_lessons_started,
        lessons_completed = v_lessons_completed,
        total_lessons = v_total_published_lessons,
        progress_percent = v_progress_pct,
        total_time_spent_seconds = v_total_time_seconds,
        last_accessed_at = v_now,
        completed_at = COALESCE(
          public.student_course_progress.completed_at,
          v_course_completed_at
        ),
        updated_at = v_now
  RETURNING * INTO v_course_row;

  RETURN jsonb_build_object(
    'lessonProgress', to_jsonb(v_lesson_row),
    'courseProgress', to_jsonb(v_course_row)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_student_lesson_activity(uuid, boolean, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_student_lesson_activity(uuid, boolean, integer) TO authenticated;

-- Helper for parsing numerical student answers (supports decimals, commas, scientific notation, simple fractions, and unit stripping)
CREATE OR REPLACE FUNCTION public.parse_student_numeric_answer(
  p_raw text,
  p_accepted_units text[] DEFAULT '{}'
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_clean text;
  v_unit text;
  v_num text;
  v_den text;
  v_den_val numeric;
BEGIN
  IF p_raw IS NULL THEN
    RETURN NULL;
  END IF;

  v_clean := btrim(replace(p_raw, ',', ''));
  IF v_clean = '' THEN
    RETURN NULL;
  END IF;

  -- Strip any configured accepted unit suffix (case-insensitive)
  IF p_accepted_units IS NOT NULL THEN
    FOREACH v_unit IN ARRAY p_accepted_units
    LOOP
      IF v_unit IS NOT NULL AND char_length(btrim(v_unit)) > 0 THEN
        IF lower(right(v_clean, char_length(btrim(v_unit)))) = lower(btrim(v_unit)) THEN
          v_clean := btrim(left(v_clean, char_length(v_clean) - char_length(btrim(v_unit))));
          EXIT;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- Support simple rational fraction input like "3/2" or "-5/4"
  IF v_clean ~ '^[+-]?[0-9]+(\.[0-9]+)?\s*/\s*[+-]?[0-9]+(\.[0-9]+)?$' THEN
    v_num := btrim(split_part(v_clean, '/', 1));
    v_den := btrim(split_part(v_clean, '/', 2));
    v_den_val := v_den::numeric;
    IF v_den_val = 0 THEN
      RETURN NULL;
    END IF;
    RETURN (v_num::numeric) / v_den_val;
  END IF;

  -- Standard integer, decimal, or scientific notation
  IF v_clean ~ '^[+-]?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+-]?[0-9]+)?$' THEN
    RETURN v_clean::numeric;
  END IF;

  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.parse_student_numeric_answer(text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.parse_student_numeric_answer(text, text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_student_exercise_attempt(
  p_exercise_id uuid,
  p_answers jsonb,
  p_time_spent_seconds integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_exercise record;
  v_existing_attempts integer := 0;
  v_q record;
  v_raw_answer text;
  v_norm_answer text;
  v_candidate text;
  v_parsed_num numeric;
  v_is_correct boolean;
  v_eval_status text;
  v_gradable_count integer := 0;
  v_correct_count integer := 0;
  v_written_count integer := 0;
  v_earned_points integer := 0;
  v_possible_points integer := 0;
  v_score_pct numeric(5,2) := NULL;
  v_breakdown jsonb := '[]'::jsonb;
  v_attempt_row public.student_exercise_attempts;
  v_bounded_time integer := NULL;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to submit exercise answers.';
  END IF;

  IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'object' THEN
    RAISE EXCEPTION 'Submitted answers must be a valid JSON object keyed by question ID.';
  END IF;

  SELECT
    e.id,
    e.title,
    e.allow_retries,
    e.lesson_id,
    e.course_id,
    c.subject
  INTO v_exercise
  FROM public.learning_exercises e
  JOIN public.learning_lessons l ON l.id = e.lesson_id
  JOIN public.learning_courses c ON c.id = e.course_id
  WHERE e.id = p_exercise_id
    AND e.is_published = true
    AND l.is_published = true
    AND c.is_published = true
    AND c.publication_status = 'published';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exercise not found or not available.';
  END IF;

  SELECT COUNT(*)::integer
  INTO v_existing_attempts
  FROM public.student_exercise_attempts
  WHERE user_id = v_user_id
    AND exercise_id = p_exercise_id;

  IF v_existing_attempts > 0 AND NOT v_exercise.allow_retries THEN
    RAISE EXCEPTION 'Retries are not enabled for this exercise.';
  END IF;

  IF p_time_spent_seconds IS NOT NULL THEN
    v_bounded_time := LEAST(GREATEST(p_time_spent_seconds, 0), 7200);
  END IF;

  FOR v_q IN
    SELECT
      q.id AS question_id,
      q.question_order,
      q.question_type,
      q.prompt,
      q.points,
      k.evaluation_method,
      k.correct_option_key,
      k.accepted_texts,
      k.case_sensitive,
      k.numeric_value,
      k.numeric_tolerance,
      k.accepted_units,
      k.correct_answer_display,
      k.explanation,
      k.rubric_guidance
    FROM public.learning_exercise_questions q
    JOIN public.learning_question_answer_keys k ON k.question_id = q.id
    WHERE q.exercise_id = p_exercise_id
      AND q.is_published = true
    ORDER BY q.question_order ASC
  LOOP
    v_raw_answer := COALESCE(btrim(p_answers ->> (v_q.question_id::text)), '');
    v_is_correct := false;
    v_eval_status := 'incorrect';

    IF v_q.question_type = 'written_response' THEN
      v_written_count := v_written_count + 1;
      IF char_length(v_raw_answer) > 0 THEN
        v_eval_status := 'written_recorded';
      ELSE
        v_eval_status := 'unanswered';
      END IF;
    ELSE
      v_gradable_count := v_gradable_count + 1;
      v_possible_points := v_possible_points + v_q.points;

      IF char_length(v_raw_answer) = 0 THEN
        v_eval_status := 'unanswered';
      ELSIF v_q.question_type IN ('multiple_choice', 'true_false') THEN
        IF lower(v_raw_answer) = lower(COALESCE(v_q.correct_option_key, '')) THEN
          v_is_correct := true;
        END IF;
      ELSIF v_q.question_type = 'short_answer' THEN
        v_norm_answer := regexp_replace(v_raw_answer, '\s+', ' ', 'g');
        FOREACH v_candidate IN ARRAY v_q.accepted_texts
        LOOP
          IF v_q.case_sensitive THEN
            IF v_norm_answer = regexp_replace(btrim(v_candidate), '\s+', ' ', 'g') THEN
              v_is_correct := true;
              EXIT;
            END IF;
          ELSE
            IF lower(v_norm_answer) = lower(regexp_replace(btrim(v_candidate), '\s+', ' ', 'g')) THEN
              v_is_correct := true;
              EXIT;
            END IF;
          END IF;
        END LOOP;
      ELSIF v_q.question_type = 'numerical' THEN
        v_parsed_num := public.parse_student_numeric_answer(v_raw_answer, v_q.accepted_units);
        IF v_parsed_num IS NOT NULL AND v_q.numeric_value IS NOT NULL THEN
          IF abs(v_parsed_num - v_q.numeric_value) <= COALESCE(v_q.numeric_tolerance, 0) THEN
            v_is_correct := true;
          END IF;
        END IF;
      END IF;

      IF v_is_correct THEN
        v_eval_status := 'correct';
        v_correct_count := v_correct_count + 1;
        v_earned_points := v_earned_points + v_q.points;
      END IF;
    END IF;

    v_breakdown := v_breakdown || jsonb_build_array(
      jsonb_build_object(
        'questionId', v_q.question_id,
        'questionOrder', v_q.question_order,
        'questionType', v_q.question_type,
        'studentAnswer', v_raw_answer,
        'status', v_eval_status,
        'isCorrect', CASE WHEN v_q.question_type = 'written_response' THEN NULL ELSE v_is_correct END,
        'isOfficiallyMarked', CASE WHEN v_q.question_type = 'written_response' THEN false ELSE true END,
        'earnedPoints', CASE WHEN v_q.question_type = 'written_response' THEN 0 WHEN v_is_correct THEN v_q.points ELSE 0 END,
        'possiblePoints', CASE WHEN v_q.question_type = 'written_response' THEN 0 ELSE v_q.points END,
        'correctAnswerDisplay', v_q.correct_answer_display,
        'explanation', v_q.explanation,
        'rubricGuidance', v_q.rubric_guidance
      )
    );
  END LOOP;

  IF v_possible_points > 0 THEN
    v_score_pct := ROUND((v_earned_points::numeric / v_possible_points::numeric) * 100, 2);
  END IF;

  INSERT INTO public.student_exercise_attempts (
    user_id,
    course_id,
    lesson_id,
    exercise_id,
    attempt_number,
    submitted_answers,
    evaluation_breakdown,
    gradable_questions_count,
    correct_answers_count,
    written_responses_count,
    earned_points,
    possible_points,
    score_percent,
    time_spent_seconds
  )
  VALUES (
    v_user_id,
    v_exercise.course_id,
    v_exercise.lesson_id,
    v_exercise.id,
    v_existing_attempts + 1,
    p_answers,
    v_breakdown,
    v_gradable_count,
    v_correct_count,
    v_written_count,
    v_earned_points,
    v_possible_points,
    v_score_pct,
    v_bounded_time
  )
  RETURNING * INTO v_attempt_row;

  -- Record gradable assessment score into student_assessment_results so Dashboard Progress updates automatically
  IF v_score_pct IS NOT NULL THEN
    INSERT INTO public.student_assessment_results (
      user_id,
      title,
      subject,
      score_percent,
      recorded_at
    )
    VALUES (
      v_user_id,
      v_exercise.title,
      v_exercise.subject,
      v_score_pct,
      timezone('utc', now())
    );
  END IF;

  -- Ensure lesson activity is recorded when submitting its practice exercise
  PERFORM public.record_student_lesson_activity(v_exercise.lesson_id, false, 0);

  RETURN to_jsonb(v_attempt_row);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_student_exercise_attempt(uuid, jsonb, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_student_exercise_attempt(uuid, jsonb, integer) TO authenticated;

-- ----------------------------------------------------------------------------
-- 8. Seed Reference Curricula, Education Levels, Personalized Subjects, and
--    3 Properly Attributed Sample Starter Courses (Zero Fictional Padding)
-- ----------------------------------------------------------------------------

-- 8A. Curricula
INSERT INTO public.learning_curricula (code, name, academic_category, country, description, sort_order, is_published)
VALUES
  (
    'ng-sss-curriculum',
    'Nigerian Senior Secondary Syllabus (SS 1–SS 3 • WAEC & NECO Subject Alignment)',
    'secondary',
    'Nigeria',
    'Senior secondary subject alignment for Nigerian SS 1–SS 3 learners. Independent study alignment; not affiliated with WAEC or NECO.',
    10,
    true
  ),
  (
    'ng-jss-curriculum',
    'Nigerian Junior Secondary Basic Education Syllabus (JSS 1–JSS 3)',
    'secondary',
    'Nigeria',
    'Foundational junior secondary subjects for JSS 1–JSS 3 learners.',
    20,
    true
  ),
  (
    'intl-secondary',
    'International Secondary Curriculum (IGCSE / IB / High School)',
    'secondary',
    NULL,
    'General international secondary school subject framework.',
    30,
    true
  ),
  (
    'university-undergraduate',
    'University Undergraduate Core & Departmental Studies',
    'university',
    NULL,
    'Undergraduate degree coursework across 100–500+ academic levels.',
    40,
    true
  ),
  (
    'polytechnic-technical',
    'Polytechnic, Monotechnic & Technical Diploma Studies (ND / HND / Vocational)',
    'polytechnic',
    NULL,
    'Practical and theoretical modules for ND, HND, and technical college learners.',
    50,
    true
  )
ON CONFLICT (code) DO NOTHING;

-- 8B. Education Levels
INSERT INTO public.learning_education_levels (code, label, academic_category, secondary_stage, qualification_type, sort_order, is_published)
VALUES
  ('JSS 1', 'JSS 1', 'secondary', 'junior', NULL, 10, true),
  ('JSS 2', 'JSS 2', 'secondary', 'junior', NULL, 11, true),
  ('JSS 3', 'JSS 3', 'secondary', 'junior', NULL, 12, true),
  ('SS 1', 'SS 1', 'secondary', 'senior', NULL, 20, true),
  ('SS 2', 'SS 2', 'secondary', 'senior', NULL, 21, true),
  ('SS 3', 'SS 3', 'secondary', 'senior', NULL, 22, true),
  ('100', '100 Level', 'university', NULL, NULL, 30, true),
  ('200', '200 Level', 'university', NULL, NULL, 31, true),
  ('300', '300 Level', 'university', NULL, NULL, 32, true),
  ('400', '400 Level', 'university', NULL, NULL, 33, true),
  ('500', '500 Level', 'university', NULL, NULL, 34, true),
  ('ND 1', 'ND 1', 'polytechnic', NULL, 'ND', 40, true),
  ('ND 2', 'ND 2', 'polytechnic', NULL, 'ND', 41, true),
  ('HND 1', 'HND 1', 'polytechnic', NULL, 'HND', 42, true),
  ('HND 2', 'HND 2', 'polytechnic', NULL, 'HND', 43, true),
  ('Vocational / Technical', 'Vocational / Technical Program', 'polytechnic', NULL, 'Vocational / Technical Program', 44, true)
ON CONFLICT (code) DO NOTHING;

-- 8C. Personalized Subjects Catalog (Filtered per Academic Category, Level & Curriculum)
INSERT INTO public.learning_subjects (
  slug, name, learning_category, description,
  academic_categories, education_levels, curriculum_codes,
  waec_neco_relevant, faculty_keywords, department_keywords, qualification_keywords, sort_order
)
VALUES
  (
    'mathematics',
    'Mathematics',
    'Mathematics',
    'Number systems, algebra, geometry, trigonometry, and quantitative problem solving.',
    ARRAY['secondary', 'university', 'polytechnic'],
    ARRAY['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3', '100', '200', 'ND 1', 'ND 2'],
    ARRAY['ng-sss-curriculum', 'ng-jss-curriculum', 'intl-secondary', 'university-undergraduate', 'polytechnic-technical'],
    true,
    ARRAY['science', 'engineering', 'computing', 'technology'],
    ARRAY['mathematics', 'statistics', 'engineering', 'computer'],
    ARRAY['ND', 'HND'],
    10
  ),
  (
    'english-language',
    'English Language',
    'English Language',
    'Comprehension, grammar, academic writing, lexis and structure, and oral English.',
    ARRAY['secondary', 'university', 'polytechnic'],
    ARRAY['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3', '100', 'ND 1'],
    ARRAY['ng-sss-curriculum', 'ng-jss-curriculum', 'intl-secondary', 'university-undergraduate', 'polytechnic-technical'],
    true,
    ARRAY['arts', 'humanities', 'general'],
    ARRAY['english', 'communication', 'general studies'],
    ARRAY['ND', 'HND', 'Vocational / Technical Program'],
    15
  ),
  (
    'physics',
    'Physics',
    'Physics',
    'Mechanics, waves, optics, thermal physics, electricity, and modern physical principles.',
    ARRAY['secondary', 'university', 'polytechnic'],
    ARRAY['SS 1', 'SS 2', 'SS 3', '100', '200', 'ND 1', 'ND 2'],
    ARRAY['ng-sss-curriculum', 'intl-secondary', 'university-undergraduate', 'polytechnic-technical'],
    true,
    ARRAY['science', 'engineering', 'physical'],
    ARRAY['physics', 'mechanical', 'electrical', 'civil', 'petroleum'],
    ARRAY['ND', 'HND'],
    20
  ),
  (
    'basic-science-and-technology',
    'Basic Science & Technology',
    'Technical and vocational subjects',
    'Integrated foundational science, measurement, energy, and introductory workshop technology for Junior Secondary learners.',
    ARRAY['secondary'],
    ARRAY['JSS 1', 'JSS 2', 'JSS 3'],
    ARRAY['ng-jss-curriculum'],
    false,
    ARRAY[]::text[],
    ARRAY[]::text[],
    ARRAY[]::text[],
    22
  ),
  (
    'chemistry',
    'Chemistry',
    'Chemistry',
    'Atomic structure, chemical bonding, stoichiometry, energetics, and organic chemistry.',
    ARRAY['secondary', 'university', 'polytechnic'],
    ARRAY['SS 1', 'SS 2', 'SS 3', '100', '200', 'ND 1', 'ND 2'],
    ARRAY['ng-sss-curriculum', 'intl-secondary', 'university-undergraduate', 'polytechnic-technical'],
    true,
    ARRAY['science', 'engineering', 'pharmacy', 'medicine'],
    ARRAY['chemistry', 'chemical', 'biochemistry', 'science laboratory'],
    ARRAY['ND', 'HND'],
    25
  ),
  (
    'biology',
    'Biology',
    'Biology',
    'Cell organization, genetics, ecology, plant and animal physiology, and evolution.',
    ARRAY['secondary', 'university'],
    ARRAY['SS 1', 'SS 2', 'SS 3', '100', '200'],
    ARRAY['ng-sss-curriculum', 'intl-secondary', 'university-undergraduate'],
    true,
    ARRAY['science', 'life', 'medicine', 'agriculture'],
    ARRAY['biology', 'microbiology', 'zoology', 'botany', 'medicine'],
    ARRAY[]::text[],
    30
  ),
  (
    'computer-studies',
    'Computer Studies',
    'Computer Studies',
    'Computing systems, algorithms, data representation, software fundamentals, and problem solving.',
    ARRAY['secondary', 'university', 'polytechnic'],
    ARRAY['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3', '100', '200', '300', '400', 'ND 1', 'ND 2', 'HND 1', 'HND 2'],
    ARRAY['ng-sss-curriculum', 'ng-jss-curriculum', 'intl-secondary', 'university-undergraduate', 'polytechnic-technical'],
    true,
    ARRAY['computing', 'science', 'engineering', 'information'],
    ARRAY['computer', 'software', 'cyber', 'information', 'data'],
    ARRAY['ND', 'HND', 'Vocational / Technical Program'],
    35
  ),
  (
    'economics',
    'Economics',
    'Economics',
    'Microeconomics, demand and supply, national income, money and banking, and development economics.',
    ARRAY['secondary', 'university', 'polytechnic'],
    ARRAY['SS 1', 'SS 2', 'SS 3', '100', '200', '300', 'ND 1', 'ND 2'],
    ARRAY['ng-sss-curriculum', 'intl-secondary', 'university-undergraduate', 'polytechnic-technical'],
    true,
    ARRAY['social', 'management', 'business'],
    ARRAY['economics', 'banking', 'finance', 'accounting', 'business'],
    ARRAY['ND', 'HND'],
    40
  ),
  (
    'government',
    'Government',
    'Government',
    'Political institutions, constitutional development, public administration, and civic governance.',
    ARRAY['secondary', 'university'],
    ARRAY['SS 1', 'SS 2', 'SS 3', '100', '200'],
    ARRAY['ng-sss-curriculum', 'intl-secondary', 'university-undergraduate'],
    true,
    ARRAY['social', 'arts', 'law'],
    ARRAY['political', 'public administration', 'international relations', 'law'],
    ARRAY[]::text[],
    45
  ),
  (
    'literature-in-english',
    'Literature',
    'Literature',
    'Literary appreciation, prose, drama, poetry analysis, and critical interpretation.',
    ARRAY['secondary', 'university'],
    ARRAY['SS 1', 'SS 2', 'SS 3', '100', '200'],
    ARRAY['ng-sss-curriculum', 'intl-secondary', 'university-undergraduate'],
    true,
    ARRAY['arts', 'humanities'],
    ARRAY['english', 'literature', 'theatre'],
    ARRAY[]::text[],
    50
  ),
  (
    'electrical-and-technical-engineering',
    'Electrical & Technical Engineering',
    'Technical and vocational subjects',
    'DC/AC circuit analysis, electrical installation principles, instrumentation, and workshop safety.',
    ARRAY['polytechnic', 'university'],
    ARRAY['ND 1', 'ND 2', 'HND 1', 'HND 2', 'Vocational / Technical', '100', '200', '300'],
    ARRAY['polytechnic-technical', 'university-undergraduate'],
    false,
    ARRAY['engineering', 'technology', 'technical'],
    ARRAY['electrical', 'electronic', 'mechatronics', 'mechanical', 'industrial', 'petroleum', 'welding', 'solar'],
    ARRAY['ND', 'HND', 'Vocational / Technical Program', 'Technical Certificate'],
    55
  )
ON CONFLICT (slug) DO NOTHING;

-- 8D. Content Sources & Verification Records (Truthful Licensing & Classification)
INSERT INTO public.learning_content_sources (
  id, slug, source_name, source_url_or_reference, author_or_publisher,
  content_classification, license_or_permission, attribution_text, is_approved_source
)
VALUES
  (
    '11111111-1111-4111-8111-111111111101',
    'openstax-physics-cc-by-4',
    'OpenStax Physics (High School & Introductory Mechanics)',
    'https://openstax.org/details/books/physics',
    'OpenStax — Rice University (Paul Peter Urone, Roger Hinrichs)',
    'imported_third_party',
    'Creative Commons Attribution 4.0 International (CC BY 4.0)',
    'Adapted from OpenStax Physics, published by Rice University under CC BY 4.0. Access for free at https://openstax.org.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111102',
    'openstax-university-physics-vol2-cc-by-4',
    'OpenStax University Physics Volume 2 (Current & Resistance)',
    'https://openstax.org/details/books/university-physics-volume-2',
    'OpenStax — Rice University (Samuel J. Ling, Jeff Sanny, William Moebs)',
    'imported_third_party',
    'Creative Commons Attribution 4.0 International (CC BY 4.0)',
    'Adapted from OpenStax University Physics Volume 2, published by Rice University under CC BY 4.0. Access for free at https://openstax.org.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111103',
    'tralix-ai-learning-studio',
    'TRALIX AI Structured Study & Practice Generator',
    NULL,
    'TRALIX AI Learning Studio (E-LEARNING ECOSYSTEM)',
    'ai_generated',
    'Platform Original Sample Material — Permitted for Student Study',
    'Generated by TRALIX AI as structured explanatory and practice study material. Not officially verified by an external examination board.',
    true
  )
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.learning_content_verifications (
  id, code, source_id, content_classification, verification_status,
  approved_for_publication, reviewer_name, reviewed_at, review_notes
)
VALUES
  (
    '22222222-2222-4222-8222-222222222201',
    'ver-openstax-physics-oer',
    '11111111-1111-4111-8111-111111111101',
    'imported_third_party',
    'attributed_third_party',
    true,
    NULL,
    '2026-11-01T12:00:00Z',
    'Open Educational Resource licensed under CC BY 4.0 with full Rice University / OpenStax attribution.'
  ),
  (
    '22222222-2222-4222-8222-222222222202',
    'ver-openstax-circuits-oer',
    '11111111-1111-4111-8111-111111111102',
    'imported_third_party',
    'attributed_third_party',
    true,
    NULL,
    '2026-11-01T12:00:00Z',
    'Open Educational Resource licensed under CC BY 4.0 with full Rice University / OpenStax attribution.'
  ),
  (
    '22222222-2222-4222-8222-222222222203',
    'ver-tralix-ai-sample',
    '11111111-1111-4111-8111-111111111103',
    'ai_generated',
    'unverified_ai',
    true,
    NULL,
    NULL,
    'AI-generated explanations and deterministic practice items; transparently labeled as AI-generated and never represented as officially verified.'
  )
ON CONFLICT (code) DO NOTHING;

-- 8E. Concise Starter Sample Courses (1 per Academic Pathway; All Properly Sourced & Classified)

-- Course 1: Secondary School (SS 1 Physics — OpenStax CC BY 4.0 OER + TRALIX AI Practice)
INSERT INTO public.learning_courses (
  id, slug, title, subject, subject_id, academic_category, education_level,
  curriculum, curriculum_id, current_topic, summary, description,
  learning_objectives, estimated_duration_minutes, difficulty,
  total_lessons, is_published, publication_status, source_id, verification_id
)
VALUES
  (
    '33333333-3333-4333-8333-333333333301',
    'foundations-of-motion-and-vectors',
    'Foundations of Motion, Scalars & Vectors',
    'Physics',
    (SELECT id FROM public.learning_subjects WHERE slug = 'physics'),
    'secondary',
    'SS 1',
    'Nigerian Senior Secondary Syllabus (SS 1–SS 3 • WAEC & NECO Subject Alignment)',
    (SELECT id FROM public.learning_curricula WHERE code = 'ng-sss-curriculum'),
    'Physical Quantities & Scalar-Vector Distinction',
    'Distinguish scalar and vector quantities, compare distance and displacement, and solve foundational uniform acceleration problems.',
    'An introductory senior secondary Physics module covering physical quantities, scalar versus vector representation, and linear kinematics equations. Reading explanations are adapted with attribution from OpenStax Physics (CC BY 4.0), accompanied by clearly labeled AI-generated practice checks.',
    ARRAY[
      'Differentiate clearly between scalar quantities and vector quantities with SI units.',
      'Compare distance travelled with resultant displacement along straight-line paths.',
      'Calculate average velocity and uniform acceleration using kinematics formulas.'
    ],
    45,
    'foundational',
    2,
    true,
    'published',
    '11111111-1111-4111-8111-111111111101',
    '22222222-2222-4222-8222-222222222201'
  ),
  -- Course 2: University (100 Level Computer Studies — TRALIX AI Sample Module)
  (
    '33333333-3333-4333-8333-333333333302',
    'intro-to-algorithms-and-complexity',
    'Introduction to Algorithms & Problem Solving',
    'Computer Studies',
    (SELECT id FROM public.learning_subjects WHERE slug = 'computer-studies'),
    'university',
    '100',
    'University Undergraduate Core & Departmental Studies',
    (SELECT id FROM public.learning_curricula WHERE code = 'university-undergraduate'),
    'Algorithmic Thinking & Control Structures',
    'Explore finite algorithmic properties, trace linear versus binary search, and evaluate asymptotic Big-O growth rates.',
    'A concise 100-level computing starter course introducing formal properties of algorithms, search strategies on sorted arrays, and introductory asymptotic time-complexity analysis.',
    ARRAY[
      'Identify the five essential properties of a well-defined computational algorithm.',
      'Trace step counts for linear search versus binary search on ordered datasets.',
      'Classify common loop structures using Big-O asymptotic time notation.'
    ],
    40,
    'foundational',
    2,
    true,
    'published',
    '11111111-1111-4111-8111-111111111103',
    '22222222-2222-4222-8222-222222222203'
  ),
  -- Course 3: Polytechnic & Technical (ND 1 Electrical & Technical Engineering — OpenStax Vol 2 CC BY 4.0)
  (
    '33333333-3333-4333-8333-333333333303',
    'dc-circuit-fundamentals-ohms-law',
    'DC Circuit Fundamentals & Ohm’s Law',
    'Electrical & Technical Engineering',
    (SELECT id FROM public.learning_subjects WHERE slug = 'electrical-and-technical-engineering'),
    'polytechnic',
    'ND 1',
    'Polytechnic, Monotechnic & Technical Diploma Studies (ND / HND / Vocational)',
    (SELECT id FROM public.learning_curricula WHERE code = 'polytechnic-technical'),
    'Electric Current, Voltage & Resistance',
    'Analyze direct-current resistive circuits using Ohm’s Law, electrical power relationships, and safe measurement conventions.',
    'A practical foundational module for ND and technical learners covering electric charge flow, potential difference, ohmic resistance, and DC power dissipation, adapted from OpenStax University Physics Volume 2 (CC BY 4.0).',
    ARRAY[
      'Relate potential difference, current, and resistance accurately using Ohm’s Law.',
      'Compute electrical power dissipated in a resistive load.',
      'Apply correct series ammeter and parallel voltmeter connection principles.'
    ],
    35,
    'foundational',
    1,
    true,
    'published',
    '11111111-1111-4111-8111-111111111102',
    '22222222-2222-4222-8222-222222222202'
  )
ON CONFLICT (slug) DO NOTHING;

-- Topics
INSERT INTO public.learning_course_topics (id, course_id, slug, title, description, topic_order, is_published)
VALUES
  (
    '44444444-4444-4444-8444-444444444401',
    '33333333-3333-4333-8333-333333333301',
    'physical-quantities-scalars-vectors',
    'Topic 1: Physical Quantities & Scalar-Vector Distinction',
    'How Physics classifies measurable quantities by magnitude and direction.',
    1,
    true
  ),
  (
    '44444444-4444-4444-8444-444444444402',
    '33333333-3333-4333-8333-333333333301',
    'uniform-linear-motion-kinematics',
    'Topic 2: Uniform Linear Motion & Kinematics',
    'Average velocity, uniform acceleration, and equations of straight-line motion.',
    2,
    true
  ),
  (
    '44444444-4444-4444-8444-444444444403',
    '33333333-3333-4333-8333-333333333302',
    'algorithmic-thinking-search',
    'Topic 1: Algorithmic Thinking & Search Strategies',
    'Formal definition of an algorithm and logarithmic halving via binary search.',
    1,
    true
  ),
  (
    '44444444-4444-4444-8444-444444444404',
    '33333333-3333-4333-8333-333333333302',
    'measuring-time-efficiency',
    'Topic 2: Measuring Time & Space Efficiency',
    'Understanding Big-O upper bounds as input size scales.',
    2,
    true
  ),
  (
    '44444444-4444-4444-8444-444444444405',
    '33333333-3333-4333-8333-333333333303',
    'voltage-current-resistance',
    'Topic 1: Electric Current, Voltage & Resistance',
    'Ohm’s Law, resistive loads, and DC electrical power calculations.',
    1,
    true
  )
ON CONFLICT (course_id, slug) DO NOTHING;

-- Lessons
INSERT INTO public.learning_lessons (
  id, course_id, topic_id, slug, title, lesson_order,
  introduction, learning_objectives, summary, key_points,
  estimated_reading_minutes, source_id, verification_id, is_published
)
VALUES
  (
    '55555555-5555-4555-8555-555555555501',
    '33333333-3333-4333-8333-333333333301',
    '44444444-4444-4444-8444-444444444401',
    'scalars-and-vectors',
    'Scalar and Vector Quantities',
    1,
    'Every physical measurement in science expresses a magnitude and an appropriate unit, yet some quantities also require a specific spatial direction to be completely meaningful. Understanding the difference between scalars and vectors prevents sign and geometry errors throughout mechanics.',
    ARRAY[
      'Define scalar and vector quantities with everyday physical examples.',
      'Distinguish total path distance from net displacement.',
      'Compute resultant displacement along collinear paths.'
    ],
    'Scalars are completely specified by magnitude and unit alone (such as mass, time, temperature, and distance), whereas vectors require magnitude, unit, and direction (such as displacement, velocity, acceleration, and force).',
    ARRAY[
      'A scalar quantity has magnitude only and obeys ordinary arithmetic addition.',
      'A vector quantity has both magnitude and direction and obeys vector addition.',
      'Displacement depends only on initial and final positions, never on the detour taken.'
    ],
    12,
    '11111111-1111-4111-8111-111111111101',
    '22222222-2222-4222-8222-222222222201',
    true
  ),
  (
    '55555555-5555-4555-8555-555555555502',
    '33333333-3333-4333-8333-333333333301',
    '44444444-4444-4444-8444-444444444402',
    'speed-velocity-and-acceleration',
    'Speed, Velocity & Uniform Acceleration',
    1,
    'When an object changes its position over time, we describe how fast it moves using speed or velocity, and how rapidly its velocity changes using acceleration. In straight-line motion with constant acceleration, simple algebraic equations connect displacement, time, initial velocity, and final velocity.',
    ARRAY[
      'Contrast average speed (scalar) with average velocity (vector).',
      'Apply the uniform acceleration formula a = (v - u) / t accurately.',
      'Explain why changing direction at constant speed still produces acceleration.'
    ],
    'Average velocity is displacement divided by elapsed time, while acceleration measures the rate of change of velocity per unit time (m/s²). Because velocity is a vector, any change in speed or direction constitutes an acceleration.',
    ARRAY[
      'Average speed = total distance / total time (always non-negative).',
      'Average velocity = net displacement / elapsed time (carries direction).',
      'Uniform acceleration: a = (v - u) / t and s = ut + ½at².'
    ],
    15,
    '11111111-1111-4111-8111-111111111101',
    '22222222-2222-4222-8222-222222222201',
    true
  ),
  (
    '55555555-5555-4555-8555-555555555503',
    '33333333-3333-4333-8333-333333333302',
    '44444444-4444-4444-8444-444444444403',
    'what-makes-an-algorithm',
    'Algorithmic Properties & Binary Search',
    1,
    'Before writing program code in any language, computer scientists design an algorithm: a finite, unambiguous sequence of steps that transforms valid input into the desired output. Choosing the right strategy can reduce millions of comparisons to fewer than twenty-five.',
    ARRAY[
      'State the core properties of a valid algorithm (finiteness, definiteness, input, output, effectiveness).',
      'Compare sequential linear search against binary search on sorted data.',
      'Determine the maximum number of comparisons binary search requires for N sorted items.'
    ],
    'An algorithm must terminate after a finite number of unambiguous, executable steps. When data is sorted, binary search halves the remaining search interval at each comparison, achieving logarithmic step growth.',
    ARRAY[
      'Every step in an algorithm must be precisely defined (definiteness) and guaranteed to terminate (finiteness).',
      'Linear search works on unsorted arrays in up to N comparisons.',
      'Binary search requires sorted order and inspects at most floor(log₂ N) + 1 elements.'
    ],
    14,
    '11111111-1111-4111-8111-111111111103',
    '22222222-2222-4222-8222-222222222203',
    true
  ),
  (
    '55555555-5555-4555-8555-555555555504',
    '33333333-3333-4333-8333-333333333302',
    '44444444-4444-4444-8444-444444444404',
    'big-o-time-complexity',
    'Asymptotic Analysis & Big-O Notation',
    1,
    'Hardware clock speeds vary across machines, so computer scientists measure algorithm efficiency by counting how elementary operations grow as input size n increases. Big-O notation captures the dominant growth term while ignoring constant multipliers.',
    ARRAY[
      'Interpret Big-O upper-bound notation O(f(n)) for large input sizes.',
      'Simplify polynomial operation counts to their dominant Big-O class.',
      'Contrast constant O(1), linear O(n), and quadratic O(n²) loop structures.'
    ],
    'Big-O notation characterizes worst-case scalability by retaining the fastest-growing term as n approaches infinity and dropping constant coefficients.',
    ARRAY[
      'Drop lower-order terms and constant factors: 4n² + 12n + 9 simplifies to O(n²).',
      'A single loop from 1 to n performs O(n) constant-time iterations.',
      'Nested loops each running 1 to n perform O(n²) iterations.'
    ],
    12,
    '11111111-1111-4111-8111-111111111103',
    '22222222-2222-4222-8222-222222222203',
    true
  ),
  (
    '55555555-5555-4555-8555-555555555505',
    '33333333-3333-4333-8333-333333333303',
    '44444444-4444-4444-8444-444444444405',
    'ohms-law-and-resistive-circuits',
    'Ohm’s Law & Simple DC Resistive Circuits',
    1,
    'Direct-current (DC) circuits power instrumentation, solar battery banks, automotive electronics, and industrial control panels. Ohm’s Law establishes the foundational linear relationship linking voltage, current, and resistance in ohmic conductors.',
    ARRAY[
      'State Ohm’s Law (V = I × R) and identify the SI unit of each electrical quantity.',
      'Calculate unknown current, voltage, or resistance in a closed DC loop.',
      'Determine power dissipation in watts using P = V × I = I²R.'
    ],
    'For an ohmic resistor at constant temperature, the current I flowing through the component is directly proportional to the applied potential difference V and inversely proportional to resistance R.',
    ARRAY[
      'Voltage V is measured in volts (V) across two points using a parallel voltmeter.',
      'Current I is measured in amperes (A) through a branch using a series ammeter.',
      'Electrical power P = V × I = I²R = V² / R is measured in watts (W).'
    ],
    15,
    '11111111-1111-4111-8111-111111111102',
    '22222222-2222-4222-8222-222222222202',
    true
  )
ON CONFLICT (course_id, slug) DO NOTHING;

-- Learning Materials (Rich structured lesson blocks: definitions, explanations, formulas, tables, diagrams, worked examples)
INSERT INTO public.learning_materials (
  lesson_id, material_order, block_type, heading, body,
  definition_term, formula_expression, formula_notes,
  example_steps, example_conclusion,
  table_caption, table_headers, table_rows,
  diagram_key, media_alt, media_caption,
  source_id, verification_id, is_published
)
VALUES
  -- Lesson 1 Materials (Scalars & Vectors)
  (
    '55555555-5555-4555-8555-555555555501', 1, 'definition',
    'Core Definitions',
    'A scalar quantity is completely specified by its numerical magnitude and unit of measurement. A vector quantity requires numerical magnitude, unit of measurement, and a specific direction in space.',
    'Scalar vs. Vector Quantity', NULL, NULL,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    '11111111-1111-4111-8111-111111111101', '22222222-2222-4222-8222-222222222201', true
  ),
  (
    '55555555-5555-4555-8555-555555555501', 2, 'subheading',
    'Comparing Distance and Displacement',
    'Suppose a student walks 80 m due East along a school corridor and then walks 30 m due West back toward the library. The total ground covered (distance) is 80 m + 30 m = 110 m, which has no direction. However, the student’s net change in position from the starting point (displacement) is 50 m due East.',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    '11111111-1111-4111-8111-111111111101', '22222222-2222-4222-8222-222222222201', true
  ),
  (
    '55555555-5555-4555-8555-555555555501', 3, 'diagram',
    'Visualizing Distance vs. Resultant Displacement',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    'vector-displacement',
    'Vector diagram showing an 80 m East arrow, a 30 m West return arrow, and a net 50 m East displacement vector.',
    'Original platform SVG diagram illustrating collinear vector addition (Adapted concept: OpenStax Physics, CC BY 4.0).',
    '11111111-1111-4111-8111-111111111101', '22222222-2222-4222-8222-222222222201', true
  ),
  (
    '55555555-5555-4555-8555-555555555501', 4, 'table',
    'Common Scalar and Vector Quantities in Physics',
    NULL, NULL, NULL, NULL, NULL, NULL,
    'Classification of standard SI physical quantities',
    ARRAY['Physical Quantity', 'Classification', 'SI Unit', 'Direction Required?'],
    '[["Mass (m)", "Scalar", "kilogram (kg)", "No"], ["Distance (d)", "Scalar", "metre (m)", "No"], ["Displacement (s)", "Vector", "metre (m)", "Yes"], ["Speed (v)", "Scalar", "m/s", "No"], ["Velocity (v)", "Vector", "m/s", "Yes"], ["Force (F)", "Vector", "newton (N)", "Yes"]]'::jsonb,
    NULL, NULL, NULL,
    '11111111-1111-4111-8111-111111111101', '22222222-2222-4222-8222-222222222201', true
  ),
  (
    '55555555-5555-4555-8555-555555555501', 5, 'worked_example',
    'Worked Example: Right-Angle Displacement',
    'A cyclist rides 3 km due North and then turns to ride 4 km due East. Find (a) the total distance travelled and (b) the magnitude of the resultant displacement.',
    NULL, NULL, NULL,
    '["Identify the path segments: d₁ = 3 km North, d₂ = 4 km East.", "Total distance is the scalar sum of path lengths: d = 3 km + 4 km = 7 km.", "Because North and East are perpendicular (90°), apply Pythagoras’ theorem for resultant displacement magnitude: |s| = √(3² + 4²) = √(9 + 16) = √25 = 5 km."]'::jsonb,
    'Total distance = 7 km; Resultant displacement magnitude = 5 km (at bearing 053.1°).',
    NULL, NULL, NULL, NULL, NULL, NULL,
    '11111111-1111-4111-8111-111111111103', '22222222-2222-4222-8222-222222222203', true
  ),

  -- Lesson 2 Materials (Speed, Velocity & Acceleration)
  (
    '55555555-5555-4555-8555-555555555502', 1, 'explanation',
    'Rate of Change of Position and Velocity',
    'Average velocity measures net displacement per unit time. Whenever an object’s speed increases, decreases, or changes direction, its velocity vector changes and the object experiences acceleration.',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    '11111111-1111-4111-8111-111111111101', '22222222-2222-4222-8222-222222222201', true
  ),
  (
    '55555555-5555-4555-8555-555555555502', 2, 'formula',
    'Equations of Uniform Linear Acceleration',
    'For straight-line motion with constant acceleration a:',
    NULL,
    'a = (v - u) / t     and     s = u·t + ½·a·t²',
    'Where u = initial velocity (m/s), v = final velocity (m/s), a = uniform acceleration (m/s²), t = time elapsed (s), and s = displacement (m).',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    '11111111-1111-4111-8111-111111111101', '22222222-2222-4222-8222-222222222201', true
  ),
  (
    '55555555-5555-4555-8555-555555555502', 3, 'worked_example',
    'Worked Example: Accelerating Bus on a Straight Highway',
    'A transit bus starts from rest and accelerates uniformly along a straight road to reach a velocity of 20 m/s in 5 s. Calculate its acceleration and the distance covered during those 5 seconds.',
    NULL, NULL, NULL,
    '["Extract known values: initial velocity u = 0 m/s (from rest), final velocity v = 20 m/s, time t = 5 s.", "Compute acceleration: a = (v - u) / t = (20 - 0) / 5 = 4 m/s².", "Compute displacement: s = u·t + ½·a·t² = (0)(5) + 0.5 × 4 × 5² = 2 × 25 = 50 m."]'::jsonb,
    'Uniform acceleration a = 4 m/s² and displacement s = 50 m.',
    NULL, NULL, NULL, NULL, NULL, NULL,
    '11111111-1111-4111-8111-111111111103', '22222222-2222-4222-8222-222222222203', true
  ),

  -- Lesson 3 Materials (Algorithms & Binary Search)
  (
    '55555555-5555-4555-8555-555555555503', 1, 'definition',
    'Formal Definition of an Algorithm',
    'An algorithm is a finite, ordered set of unambiguous, executable instructions that accepts zero or more inputs, produces at least one output, and terminates after a finite number of steps.',
    'Algorithm', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    '11111111-1111-4111-8111-111111111103', '22222222-2222-4222-8222-222222222203', true
  ),
  (
    '55555555-5555-4555-8555-555555555503', 2, 'diagram',
    'Interval Halving in Binary Search',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    'binary-search-halving',
    'Diagram of an 8-element sorted array showing low, mid, and high pointers halving the active search space.',
    'Original platform SVG diagram illustrating binary search interval halving (TRALIX AI Learning Studio).',
    '11111111-1111-4111-8111-111111111103', '22222222-2222-4222-8222-222222222203', true
  ),
  (
    '55555555-5555-4555-8555-555555555503', 3, 'table',
    'Worst-Case Comparisons: Linear Search vs. Binary Search',
    NULL, NULL, NULL, NULL, NULL, NULL,
    'Step count scaling on sorted datasets',
    ARRAY['Dataset Size (N)', 'Linear Search Worst Case', 'Binary Search Worst Case'],
    '[["16 items", "16 comparisons", "5 comparisons"], ["1,024 items", "1,024 comparisons", "11 comparisons"], ["1,048,576 items", "1,048,576 comparisons", "21 comparisons"]]'::jsonb,
    NULL, NULL, NULL,
    '11111111-1111-4111-8111-111111111103', '22222222-2222-4222-8222-222222222203', true
  ),

  -- Lesson 4 Materials (Big-O Complexity)
  (
    '55555555-5555-4555-8555-555555555504', 1, 'formula',
    'Big-O Asymptotic Upper Bound',
    'A function T(n) belongs to O(g(n)) if there exist positive constants c and n₀ such that:',
    NULL,
    '0 ≤ T(n) ≤ c · g(n)   for all n ≥ n₀',
    'As n grows large, constant multipliers and lower-order terms become negligible compared to g(n).',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    '11111111-1111-4111-8111-111111111103', '22222222-2222-4222-8222-222222222203', true
  ),
  (
    '55555555-5555-4555-8555-555555555504', 2, 'worked_example',
    'Worked Example: Simplifying Step Counts to Big-O',
    'An array-sorting routine executes T(n) = 3n² + 15n + 40 primitive operations on an input of length n. Express its asymptotic time complexity in Big-O notation.',
    NULL, NULL, NULL,
    '["Identify the terms in T(n): 3n², 15n, and 40.", "Select the highest-order term as n → ∞: 3n² dominates 15n and 40.", "Discard the constant coefficient 3 to obtain O(n²)."]'::jsonb,
    'The routine has quadratic time complexity O(n²).',
    NULL, NULL, NULL, NULL, NULL, NULL,
    '11111111-1111-4111-8111-111111111103', '22222222-2222-4222-8222-222222222203', true
  ),

  -- Lesson 5 Materials (Ohm's Law & DC Circuits)
  (
    '55555555-5555-4555-8555-555555555505', 1, 'formula',
    'Ohm’s Law and DC Power Equations',
    'In a closed resistive DC loop:',
    NULL,
    'V = I × R     |     I = V / R     |     P = V × I = I² · R',
    'Where V = Potential Difference in volts (V), I = Current in amperes (A), R = Resistance in ohms (Ω), and P = Electrical Power in watts (W).',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    '11111111-1111-4111-8111-111111111102', '22222222-2222-4222-8222-222222222202', true
  ),
  (
    '55555555-5555-4555-8555-555555555505', 2, 'diagram',
    'Closed DC Resistive Circuit Schematic',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    'simple-dc-circuit',
    'Schematic diagram of a 12 V DC battery connected in series with an ammeter and a 6 ohm load resistor, with a voltmeter across the resistor.',
    'Original platform SVG schematic illustrating series ammeter and parallel voltmeter placement (Adapted concept: OpenStax University Physics Vol. 2, CC BY 4.0).',
    '11111111-1111-4111-8111-111111111102', '22222222-2222-4222-8222-222222222202', true
  ),
  (
    '55555555-5555-4555-8555-555555555505', 3, 'worked_example',
    'Worked Example: Workshop 12 V DC Lamp Circuit',
    'A 12 V DC battery supplies a resistive inspection lamp of resistance 6 Ω. Find the current drawn from the battery and the power dissipated by the lamp.',
    NULL, NULL, NULL,
    '["Given: supply voltage V = 12 V, load resistance R = 6 Ω.", "Apply Ohm’s Law for current: I = V / R = 12 V / 6 Ω = 2 A.", "Compute power dissipated: P = V × I = 12 V × 2 A = 24 W."]'::jsonb,
    'Circuit current I = 2 A and power dissipated P = 24 W.',
    NULL, NULL, NULL, NULL, NULL, NULL,
    '11111111-1111-4111-8111-111111111103', '22222222-2222-4222-8222-222222222203', true
  )
ON CONFLICT (lesson_id, material_order) DO NOTHING;

-- Exercises (Attached to Lessons, Explicitly Classified as TRALIX AI Practice)
INSERT INTO public.learning_exercises (
  id, course_id, lesson_id, title, instructions, exercise_order,
  allow_retries, source_id, verification_id, is_published
)
VALUES
  (
    '66666666-6666-4666-8666-666666666601',
    '33333333-3333-4333-8333-333333333301',
    '55555555-5555-4555-8555-555555555501',
    'Practice Check: Scalars, Vectors & Displacement',
    'Answer each question carefully to check your understanding of scalar and vector quantities.',
    1,
    true,
    '11111111-1111-4111-8111-111111111103',
    '22222222-2222-4222-8222-222222222203',
    true
  ),
  (
    '66666666-6666-4666-8666-666666666602',
    '33333333-3333-4333-8333-333333333301',
    '55555555-5555-4555-8555-555555555502',
    'Practice Check: Velocity & Uniform Acceleration',
    'Solve the numerical calculation and complete the conceptual written reflection.',
    1,
    true,
    '11111111-1111-4111-8111-111111111103',
    '22222222-2222-4222-8222-222222222203',
    true
  ),
  (
    '66666666-6666-4666-8666-666666666603',
    '33333333-3333-4333-8333-333333333302',
    '55555555-5555-4555-8555-555555555503',
    'Practice Check: Algorithmic Properties & Binary Search',
    'Evaluate search preconditions and step counts on sorted arrays.',
    1,
    true,
    '11111111-1111-4111-8111-111111111103',
    '22222222-2222-4222-8222-222222222203',
    true
  ),
  (
    '66666666-6666-4666-8666-666666666604',
    '33333333-3333-4333-8333-333333333302',
    '55555555-5555-4555-8555-555555555504',
    'Practice Check: Big-O Growth Rates',
    'Classify asymptotic growth and explain nested-loop scaling.',
    1,
    true,
    '11111111-1111-4111-8111-111111111103',
    '22222222-2222-4222-8222-222222222203',
    true
  ),
  (
    '66666666-6666-4666-8666-666666666605',
    '33333333-3333-4333-8333-333333333303',
    '55555555-5555-4555-8555-555555555505',
    'Practice Check: Ohm’s Law & DC Power',
    'Apply Ohm’s Law and instrument connection rules for resistive DC circuits.',
    1,
    true,
    '11111111-1111-4111-8111-111111111103',
    '22222222-2222-4222-8222-222222222203',
    true
  )
ON CONFLICT DO NOTHING;

-- Exercise Questions (Covering All 5 Types: multiple_choice, true_false, short_answer, numerical, written_response)
INSERT INTO public.learning_exercise_questions (
  id, exercise_id, question_order, question_type, prompt, helper_text, unit_label, points, is_published
)
VALUES
  -- Exercise 1 (Lesson 1: Scalars & Vectors)
  (
    '77777777-7777-4777-8777-777777777701',
    '66666666-6666-4666-8666-666666666601',
    1, 'multiple_choice',
    'Which of the following pairs contains ONLY vector quantities?',
    'Select the single best option.', NULL, 1, true
  ),
  (
    '77777777-7777-4777-8777-777777777702',
    '66666666-6666-4666-8666-666666666601',
    2, 'true_false',
    'If an athlete runs one complete 400 m lap around a closed track and finishes at the exact starting line, the magnitude of their net displacement is zero.',
    'Choose True or False.', NULL, 1, true
  ),
  (
    '77777777-7777-4777-8777-777777777703',
    '66666666-6666-4666-8666-666666666601',
    3, 'short_answer',
    'What physical term describes a quantity that has magnitude and unit only, with no spatial direction?',
    'Enter a single word or two-word term (e.g., scalar).', NULL, 1, true
  ),

  -- Exercise 2 (Lesson 2: Velocity & Acceleration — Numerical + Written Response)
  (
    '77777777-7777-4777-8777-777777777704',
    '66666666-6666-4666-8666-666666666602',
    1, 'numerical',
    'A car travelling along a straight road increases its velocity uniformly from 8 m/s to 26 m/s in 6 seconds. Calculate its acceleration in m/s².',
    'Enter a number (units like m/s^2 are also accepted).', 'm/s²', 2, true
  ),
  (
    '77777777-7777-4777-8777-777777777705',
    '66666666-6666-4666-8666-666666666602',
    2, 'written_response',
    'Explain in your own words why a vehicle moving around a circular roundabout at a steady speedometer reading of 30 km/h is still accelerating.',
    'Self-review reflection (not examiner-marked). Compare your explanation with the key concepts after submitting.', NULL, 0, true
  ),

  -- Exercise 3 (Lesson 3: Binary Search)
  (
    '77777777-7777-4777-8777-777777777706',
    '66666666-6666-4666-8666-666666666603',
    1, 'multiple_choice',
    'What mandatory precondition must an array satisfy before binary search can be applied reliably?',
    NULL, NULL, 1, true
  ),
  (
    '77777777-7777-4777-8777-777777777707',
    '66666666-6666-4666-8666-666666666603',
    2, 'numerical',
    'In the worst case, at most how many element comparisons does binary search need on a sorted array of 16 elements?',
    'Hint: floor(log₂ 16) + 1.', 'comparisons', 1, true
  ),

  -- Exercise 4 (Lesson 4: Big-O)
  (
    '77777777-7777-4777-8777-777777777708',
    '66666666-6666-4666-8666-666666666604',
    1, 'true_false',
    'In Big-O analysis, T(n) = 5n² + 100n + 500 simplifies to O(n²).',
    NULL, NULL, 1, true
  ),
  (
    '77777777-7777-4777-8777-777777777709',
    '66666666-6666-4666-8666-666666666604',
    2, 'written_response',
    'Briefly explain why an O(n log n) sorting algorithm becomes dramatically faster than an O(n²) sorting algorithm when n grows to one million records.',
    'Self-review reflection (not examiner-marked).', NULL, 0, true
  ),

  -- Exercise 5 (Lesson 5: Ohm's Law)
  (
    '77777777-7777-4777-8777-777777777710',
    '66666666-6666-4666-8666-666666666605',
    1, 'numerical',
    'A 24 V DC control bus is connected across a 12 Ω relay coil. Calculate the steady current flowing through the coil in amperes.',
    'Enter numeric value (e.g., 2 or 2 A).', 'A', 2, true
  ),
  (
    '77777777-7777-4777-8777-777777777711',
    '66666666-6666-4666-8666-666666666605',
    2, 'multiple_choice',
    'How should an ammeter and a voltmeter be connected to measure current through and voltage across a load resistor R?',
    NULL, NULL, 1, true
  )
ON CONFLICT (exercise_id, question_order) DO NOTHING;

-- Public Question Options (Zero answer leakage)
INSERT INTO public.learning_question_options (question_id, option_key, option_text, option_order)
VALUES
  ('77777777-7777-4777-8777-777777777701', 'A', 'Mass and Temperature', 1),
  ('77777777-7777-4777-8777-777777777701', 'B', 'Displacement and Velocity', 2),
  ('77777777-7777-4777-8777-777777777701', 'C', 'Distance and Force', 3),
  ('77777777-7777-4777-8777-777777777701', 'D', 'Speed and Time', 4),

  ('77777777-7777-4777-8777-777777777702', 'true', 'True', 1),
  ('77777777-7777-4777-8777-777777777702', 'false', 'False', 2),

  ('77777777-7777-4777-8777-777777777706', 'A', 'All elements must be prime integers.', 1),
  ('77777777-7777-4777-8777-777777777706', 'B', 'The array elements must be arranged in sorted order.', 2),
  ('77777777-7777-4777-8777-777777777706', 'C', 'The array length must be an exact power of ten.', 3),
  ('77777777-7777-4777-8777-777777777706', 'D', 'The target element must always appear at index 0.', 4),

  ('77777777-7777-4777-8777-777777777708', 'true', 'True', 1),
  ('77777777-7777-4777-8777-777777777708', 'false', 'False', 2),

  ('77777777-7777-4777-8777-777777777711', 'A', 'Ammeter in parallel; Voltmeter in series', 1),
  ('77777777-7777-4777-8777-777777777711', 'B', 'Both ammeter and voltmeter in series', 2),
  ('77777777-7777-4777-8777-777777777711', 'C', 'Ammeter in series; Voltmeter in parallel', 3),
  ('77777777-7777-4777-8777-777777777711', 'D', 'Both ammeter and voltmeter in parallel', 4)
ON CONFLICT (question_id, option_key) DO NOTHING;

-- Protected Answer Keys (Admin-Only Table; Evaluated Deterministically via RPC)
INSERT INTO public.learning_question_answer_keys (
  question_id, evaluation_method, correct_option_key, accepted_texts, case_sensitive,
  numeric_value, numeric_tolerance, accepted_units, correct_answer_display, explanation, rubric_guidance
)
VALUES
  (
    '77777777-7777-4777-8777-777777777701',
    'exact_option', 'B', '{}', false, NULL, 0, '{}',
    'B — Displacement and Velocity',
    'Both displacement and velocity possess magnitude and a specific spatial direction, whereas mass, temperature, distance, speed, and time are scalars.',
    '{}'
  ),
  (
    '77777777-7777-4777-8777-777777777702',
    'exact_option', 'true', '{}', false, NULL, 0, '{}',
    'True',
    'Displacement equals final position minus initial position. Returning to the exact starting point yields zero net change in position even though total distance is 400 m.',
    '{}'
  ),
  (
    '77777777-7777-4777-8777-777777777703',
    'accepted_text', NULL, ARRAY['scalar', 'scalar quantity', 'a scalar', 'a scalar quantity'], false, NULL, 0, '{}',
    'Scalar (or Scalar quantity)',
    'A scalar quantity is completely described by its magnitude and unit without direction.',
    '{}'
  ),
  (
    '77777777-7777-4777-8777-777777777704',
    'numeric_tolerance', NULL, '{}', false, 3, 0.01, ARRAY['m/s^2', 'm/s²', 'ms^-2', 'ms⁻²'],
    '3 m/s²',
    'Using a = (v - u) / t = (26 m/s - 8 m/s) / 6 s = 18 / 6 = 3 m/s².',
    '{}'
  ),
  (
    '77777777-7777-4777-8777-777777777705',
    'written_self_check', NULL, '{}', false, NULL, 0, '{}',
    'Self-Check Key Concepts (Written Practice — Not Examiner-Marked)',
    'Velocity is a vector quantity defined by both speed and direction. Moving along a circular path continuously changes the vehicle’s direction of travel, which changes its velocity vector and produces centripetal acceleration toward the center of the roundabout.',
    ARRAY[
      'States that velocity is a vector (includes both speed and direction).',
      'Notes that travelling along a curve continuously changes direction.',
      'Concludes that a change in velocity over time means non-zero acceleration.'
    ]
  ),
  (
    '77777777-7777-4777-8777-777777777706',
    'exact_option', 'B', '{}', false, NULL, 0, '{}',
    'B — The array elements must be arranged in sorted order.',
    'Binary search eliminates half of the remaining elements by comparing the target to the middle element, which is valid only when elements are sorted.',
    '{}'
  ),
  (
    '77777777-7777-4777-8777-777777777707',
    'numeric_tolerance', NULL, '{}', false, 5, 0, ARRAY['comparisons', 'steps'],
    '5 comparisons',
    'For N = 16, binary search checks midpoints of intervals of size 16 → 8 → 4 → 2 → 1, which is floor(log₂ 16) + 1 = 4 + 1 = 5 comparisons.',
    '{}'
  ),
  (
    '77777777-7777-4777-8777-777777777708',
    'exact_option', 'true', '{}', false, NULL, 0, '{}',
    'True',
    'Big-O notation retains the highest-order term (n²) and drops constant multipliers (5) and lower-order terms (100n + 500).',
    '{}'
  ),
  (
    '77777777-7777-4777-8777-777777777709',
    'written_self_check', NULL, '{}', false, NULL, 0, '{}',
    'Self-Check Key Concepts (Written Practice — Not Examiner-Marked)',
    'At n = 10⁶, n² requires roughly 10¹² operations, whereas n log₂ n requires roughly 2 × 10⁷ operations—about 50,000 times fewer steps.',
    ARRAY[
      'Compares n² (~10¹² steps) with n log₂ n (~2 × 10⁷ steps) at n = 1,000,000.',
      'Highlights that logarithmic factor log₂ n grows very slowly (~20) compared to n.'
    ]
  ),
  (
    '77777777-7777-4777-8777-777777777710',
    'numeric_tolerance', NULL, '{}', false, 2, 0.01, ARRAY['A', 'amps', 'amperes'],
    '2 A',
    'By Ohm’s Law, I = V / R = 24 V / 12 Ω = 2 A.',
    '{}'
  ),
  (
    '77777777-7777-4777-8777-777777777711',
    'exact_option', 'C', '{}', false, NULL, 0, '{}',
    'C — Ammeter in series; Voltmeter in parallel',
    'An ammeter has very low internal resistance and connects in series so the full branch current passes through it; a voltmeter has high resistance and connects in parallel across the component.',
    '{}'
  )
ON CONFLICT (question_id) DO NOTHING;
