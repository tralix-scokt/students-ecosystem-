-- ============================================================================
-- E-LEARNING ECOSYSTEM (Powered by TRALIX AI) — Step 4 Student Dashboard Schema
-- Migration: 20261101000003_create_dashboard_supporting_tables_and_rls.sql
-- ============================================================================
-- Creates lean, normalized supporting tables for real dashboard records without
-- duplicating public.profiles or public.student_academic_profiles, and without
-- inserting any fabricated courses, progress, assignments, or notifications.

-- 1. Published Educational Catalog (read-only for authenticated learners when is_published = true)
CREATE TABLE IF NOT EXISTS public.learning_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (char_length(btrim(slug)) BETWEEN 2 AND 140),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 200),
  subject text NOT NULL CHECK (char_length(btrim(subject)) BETWEEN 2 AND 120),
  academic_category text NOT NULL CHECK (
    academic_category IN ('secondary', 'university', 'polytechnic', 'all')
  ),
  current_topic text NULL CHECK (
    current_topic IS NULL OR char_length(btrim(current_topic)) <= 200
  ),
  summary text NULL CHECK (
    summary IS NULL OR char_length(btrim(summary)) <= 600
  ),
  total_lessons integer NOT NULL DEFAULT 0 CHECK (total_lessons >= 0),
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS learning_courses_published_category_idx
  ON public.learning_courses (is_published, academic_category);

CREATE INDEX IF NOT EXISTS learning_courses_subject_idx
  ON public.learning_courses (lower(subject));

-- 2. Private Student Course Progress (Continue Learning & Academic Progress)
CREATE TABLE IF NOT EXISTS public.student_course_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  current_lesson_title text NULL CHECK (
    current_lesson_title IS NULL OR char_length(btrim(current_lesson_title)) <= 200
  ),
  lessons_completed integer NOT NULL DEFAULT 0 CHECK (lessons_completed >= 0),
  total_lessons integer NOT NULL DEFAULT 0 CHECK (
    total_lessons >= 0 AND lessons_completed <= GREATEST(total_lessons, lessons_completed)
  ),
  progress_percent numeric(5,2) NULL CHECK (
    progress_percent IS NULL OR (progress_percent >= 0 AND progress_percent <= 100)
  ),
  last_accessed_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT student_course_progress_user_course_unique UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS student_course_progress_user_recent_idx
  ON public.student_course_progress (user_id, last_accessed_at DESC);

-- 3. Private Student Study Sessions (Today's Study Plan)
CREATE TABLE IF NOT EXISTS public.student_study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 200),
  subject text NOT NULL CHECK (char_length(btrim(subject)) BETWEEN 2 AND 120),
  scheduled_date date NOT NULL,
  start_time time NULL,
  duration_minutes integer NULL CHECK (
    duration_minutes IS NULL OR (duration_minutes > 0 AND duration_minutes <= 720)
  ),
  status text NOT NULL DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'in_progress', 'completed', 'skipped')
  ),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS student_study_sessions_user_date_idx
  ON public.student_study_sessions (user_id, scheduled_date ASC);

-- 4. Private Student Assignments (Upcoming Assignments)
CREATE TABLE IF NOT EXISTS public.student_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 200),
  subject text NOT NULL CHECK (char_length(btrim(subject)) BETWEEN 2 AND 120),
  due_at timestamptz NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (
    priority IN ('low', 'medium', 'high')
  ),
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'in_progress', 'completed', 'overdue')
  ),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS student_assignments_user_due_idx
  ON public.student_assignments (user_id, due_at ASC);

-- 5. Private Student Assessment Results (Academic Progress & Subject Performance)
CREATE TABLE IF NOT EXISTS public.student_assessment_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 200),
  subject text NOT NULL CHECK (char_length(btrim(subject)) BETWEEN 2 AND 120),
  score_percent numeric(5,2) NOT NULL CHECK (
    score_percent >= 0 AND score_percent <= 100
  ),
  recorded_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS student_assessment_results_user_recorded_idx
  ON public.student_assessment_results (user_id, recorded_at DESC);

-- 6. Private Student Notifications
CREATE TABLE IF NOT EXISTS public.student_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 180),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 2 AND 1000),
  category text NOT NULL DEFAULT 'system' CHECK (
    category IN ('system', 'learning', 'exam', 'planner', 'assignment')
  ),
  action_url text NULL CHECK (
    action_url IS NULL OR (left(action_url, 1) = '/' AND left(action_url, 2) <> '//')
  ),
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS student_notifications_user_unread_idx
  ON public.student_notifications (user_id, is_read, created_at DESC);

-- 7. Shared Timestamp & Ownership Immutability Trigger
CREATE OR REPLACE FUNCTION public.enforce_student_owned_row_audit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND current_user IN ('authenticated', 'anon') THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Modification of user_id is not permitted.';
    END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Modification of created_at is not permitted.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at_utc()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_course_progress_owner ON public.student_course_progress;
CREATE TRIGGER trg_course_progress_owner
  BEFORE UPDATE ON public.student_course_progress
  FOR EACH ROW EXECUTE FUNCTION public.enforce_student_owned_row_audit();

DROP TRIGGER IF EXISTS trg_course_progress_updated ON public.student_course_progress;
CREATE TRIGGER trg_course_progress_updated
  BEFORE UPDATE ON public.student_course_progress
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_utc();

DROP TRIGGER IF EXISTS trg_study_sessions_owner ON public.student_study_sessions;
CREATE TRIGGER trg_study_sessions_owner
  BEFORE UPDATE ON public.student_study_sessions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_student_owned_row_audit();

DROP TRIGGER IF EXISTS trg_study_sessions_updated ON public.student_study_sessions;
CREATE TRIGGER trg_study_sessions_updated
  BEFORE UPDATE ON public.student_study_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_utc();

DROP TRIGGER IF EXISTS trg_assignments_owner ON public.student_assignments;
CREATE TRIGGER trg_assignments_owner
  BEFORE UPDATE ON public.student_assignments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_student_owned_row_audit();

DROP TRIGGER IF EXISTS trg_assignments_updated ON public.student_assignments;
CREATE TRIGGER trg_assignments_updated
  BEFORE UPDATE ON public.student_assignments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_utc();

DROP TRIGGER IF EXISTS trg_assessment_results_owner ON public.student_assessment_results;
CREATE TRIGGER trg_assessment_results_owner
  BEFORE UPDATE ON public.student_assessment_results
  FOR EACH ROW EXECUTE FUNCTION public.enforce_student_owned_row_audit();

DROP TRIGGER IF EXISTS trg_notifications_owner ON public.student_notifications;
CREATE TRIGGER trg_notifications_owner
  BEFORE UPDATE ON public.student_notifications
  FOR EACH ROW EXECUTE FUNCTION public.enforce_student_owned_row_audit();

-- 8. Enable & Force Row Level Security + Least-Privilege Grants
ALTER TABLE public.learning_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_courses FORCE ROW LEVEL SECURITY;

ALTER TABLE public.student_course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_course_progress FORCE ROW LEVEL SECURITY;

ALTER TABLE public.student_study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_study_sessions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.student_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_assignments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.student_assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_assessment_results FORCE ROW LEVEL SECURITY;

ALTER TABLE public.student_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_notifications FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.learning_courses FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.student_course_progress FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.student_study_sessions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.student_assignments FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.student_assessment_results FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.student_notifications FROM PUBLIC, anon, authenticated;

-- Published educational content: read-only access to published rows for authenticated learners
GRANT SELECT ON public.learning_courses TO authenticated;

DROP POLICY IF EXISTS "learning_courses_select_published" ON public.learning_courses;
CREATE POLICY "learning_courses_select_published"
  ON public.learning_courses
  FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Private student records: strictly own-row access via auth.uid() = user_id
GRANT SELECT, INSERT, UPDATE ON public.student_course_progress TO authenticated;
DROP POLICY IF EXISTS "course_progress_own_select" ON public.student_course_progress;
CREATE POLICY "course_progress_own_select"
  ON public.student_course_progress FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "course_progress_own_insert" ON public.student_course_progress;
CREATE POLICY "course_progress_own_insert"
  ON public.student_course_progress FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "course_progress_own_update" ON public.student_course_progress;
CREATE POLICY "course_progress_own_update"
  ON public.student_course_progress FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_study_sessions TO authenticated;
DROP POLICY IF EXISTS "study_sessions_own_all" ON public.student_study_sessions;
CREATE POLICY "study_sessions_own_all"
  ON public.student_study_sessions FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_assignments TO authenticated;
DROP POLICY IF EXISTS "assignments_own_all" ON public.student_assignments;
CREATE POLICY "assignments_own_all"
  ON public.student_assignments FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT ON public.student_assessment_results TO authenticated;
DROP POLICY IF EXISTS "assessment_results_own_select" ON public.student_assessment_results;
CREATE POLICY "assessment_results_own_select"
  ON public.student_assessment_results FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

GRANT SELECT ON public.student_notifications TO authenticated;
GRANT UPDATE (is_read, read_at) ON public.student_notifications TO authenticated;
DROP POLICY IF EXISTS "notifications_own_select" ON public.student_notifications;
CREATE POLICY "notifications_own_select"
  ON public.student_notifications FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "notifications_own_update" ON public.student_notifications;
CREATE POLICY "notifications_own_update"
  ON public.student_notifications FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
