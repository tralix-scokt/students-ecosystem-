-- ============================================================================
-- E-LEARNING ECOSYSTEM (Powered by TRALIX AI) — Step 3 Student Onboarding Schema
-- Migration: 20261101000002_create_student_academic_profiles_and_rls.sql
-- ============================================================================

-- 1. Create public.student_academic_profiles linked 1:1 with public.profiles / auth.users
CREATE TABLE IF NOT EXISTS public.student_academic_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  academic_category text NULL CHECK (
    academic_category IS NULL OR academic_category IN ('secondary', 'university', 'polytechnic')
  ),
  country text NULL CHECK (
    country IS NULL OR char_length(btrim(country)) BETWEEN 2 AND 100
  ),
  state_region text NULL CHECK (
    state_region IS NULL OR char_length(btrim(state_region)) BETWEEN 2 AND 120
  ),
  institution_name text NULL CHECK (
    institution_name IS NULL OR char_length(btrim(institution_name)) <= 200
  ),
  institution_type text NULL CHECK (
    institution_type IS NULL OR char_length(btrim(institution_type)) <= 120
  ),
  secondary_category text NULL CHECK (
    secondary_category IS NULL OR secondary_category IN ('junior', 'senior')
  ),
  faculty text NULL CHECK (
    faculty IS NULL OR char_length(btrim(faculty)) <= 160
  ),
  department text NULL CHECK (
    department IS NULL OR char_length(btrim(department)) <= 160
  ),
  course_or_program text NULL CHECK (
    course_or_program IS NULL OR char_length(btrim(course_or_program)) <= 200
  ),
  qualification_type text NULL CHECK (
    qualification_type IS NULL OR qualification_type IN (
      'ND',
      'HND',
      'Technical College Certificate',
      'Vocational / Technical Program',
      'Other'
    )
  ),
  academic_level text NULL CHECK (
    academic_level IS NULL OR char_length(btrim(academic_level)) <= 80
  ),
  curriculum text NULL CHECK (
    curriculum IS NULL OR char_length(btrim(curriculum)) <= 160
  ),
  selected_subjects text[] NOT NULL DEFAULT '{}'::text[] CHECK (
    cardinality(selected_subjects) <= 30
  ),
  learning_goals text[] NOT NULL DEFAULT '{}'::text[] CHECK (
    cardinality(learning_goals) <= 10
  ),
  explanation_preference text NULL CHECK (
    explanation_preference IS NULL OR explanation_preference IN ('simple', 'standard', 'advanced')
  ),
  current_step smallint NOT NULL DEFAULT 1 CHECK (
    current_step BETWEEN 1 AND 4
  ),
  onboarding_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),

  -- Enforce pathway-complete academic integrity whenever onboarding_completed = true
  CONSTRAINT student_academic_profiles_completion_integrity CHECK (
    NOT onboarding_completed OR (
      academic_category IS NOT NULL
      AND country IS NOT NULL AND char_length(btrim(country)) >= 2
      AND state_region IS NOT NULL AND char_length(btrim(state_region)) >= 2
      AND academic_level IS NOT NULL AND char_length(btrim(academic_level)) >= 1
      AND cardinality(learning_goals) >= 1
      AND explanation_preference IS NOT NULL
      AND (
        (
          academic_category = 'secondary'
          AND secondary_category IN ('junior', 'senior')
          AND (
            (secondary_category = 'junior' AND academic_level IN ('JSS 1', 'JSS 2', 'JSS 3'))
            OR (secondary_category = 'senior' AND academic_level IN ('SS 1', 'SS 2', 'SS 3'))
          )
          AND curriculum IS NOT NULL AND char_length(btrim(curriculum)) >= 2
          AND cardinality(selected_subjects) >= 1
        )
        OR (
          academic_category = 'university'
          AND institution_name IS NOT NULL AND char_length(btrim(institution_name)) >= 2
          AND faculty IS NOT NULL AND char_length(btrim(faculty)) >= 2
          AND department IS NOT NULL AND char_length(btrim(department)) >= 2
          AND course_or_program IS NOT NULL AND char_length(btrim(course_or_program)) >= 2
          AND academic_level IN ('100', '200', '300', '400', '500', '600', 'Other')
        )
        OR (
          academic_category = 'polytechnic'
          AND institution_name IS NOT NULL AND char_length(btrim(institution_name)) >= 2
          AND institution_type IS NOT NULL AND char_length(btrim(institution_type)) >= 2
          AND department IS NOT NULL AND char_length(btrim(department)) >= 2
          AND course_or_program IS NOT NULL AND char_length(btrim(course_or_program)) >= 2
          AND qualification_type IS NOT NULL
          AND (qualification_type <> 'ND' OR academic_level IN ('ND 1', 'ND 2'))
          AND (qualification_type <> 'HND' OR academic_level IN ('HND 1', 'HND 2'))
        )
      )
    )
  )
);

CREATE INDEX IF NOT EXISTS student_academic_profiles_category_idx
  ON public.student_academic_profiles (academic_category);

CREATE INDEX IF NOT EXISTS student_academic_profiles_completed_idx
  ON public.student_academic_profiles (onboarding_completed);

COMMENT ON TABLE public.student_academic_profiles IS
  'Personalized student academic onboarding profiles (Secondary, University, Polytechnic/Technical) secured by RLS.';

-- 2. Trigger function: sanitize strings, protect immutable ownership/audit fields, maintain timestamps
CREATE OR REPLACE FUNCTION public.enforce_student_academic_profile_audit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND current_user IN ('authenticated', 'anon') THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Modification of academic profile user_id is not permitted.';
    END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Modification of created_at timestamp is not permitted.';
    END IF;
  END IF;

  NEW.country := NULLIF(btrim(COALESCE(NEW.country, '')), '');
  NEW.state_region := NULLIF(btrim(COALESCE(NEW.state_region, '')), '');
  NEW.institution_name := NULLIF(btrim(COALESCE(NEW.institution_name, '')), '');
  NEW.institution_type := NULLIF(btrim(COALESCE(NEW.institution_type, '')), '');
  NEW.faculty := NULLIF(btrim(COALESCE(NEW.faculty, '')), '');
  NEW.department := NULLIF(btrim(COALESCE(NEW.department, '')), '');
  NEW.course_or_program := NULLIF(btrim(COALESCE(NEW.course_or_program, '')), '');
  NEW.academic_level := NULLIF(btrim(COALESCE(NEW.academic_level, '')), '');
  NEW.curriculum := NULLIF(btrim(COALESCE(NEW.curriculum, '')), '');

  IF TG_OP = 'INSERT' THEN
    NEW.created_at := COALESCE(NEW.created_at, timezone('utc', now()));
  END IF;

  NEW.updated_at := timezone('utc', now());

  IF NEW.onboarding_completed THEN
    IF TG_OP = 'UPDATE' AND OLD.completed_at IS NOT NULL THEN
      NEW.completed_at := OLD.completed_at;
    ELSE
      NEW.completed_at := COALESCE(NEW.completed_at, timezone('utc', now()));
    END IF;
  ELSE
    NEW.completed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_student_academic_profiles_audit ON public.student_academic_profiles;
CREATE TRIGGER trg_student_academic_profiles_audit
  BEFORE INSERT OR UPDATE ON public.student_academic_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_student_academic_profile_audit();

-- 3. Enable & Force Row Level Security + Least-Privilege Grants
ALTER TABLE public.student_academic_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_academic_profiles FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.student_academic_profiles FROM PUBLIC;
REVOKE ALL ON public.student_academic_profiles FROM anon;
REVOKE ALL ON public.student_academic_profiles FROM authenticated;

GRANT SELECT, INSERT, UPDATE ON public.student_academic_profiles TO authenticated;

DROP POLICY IF EXISTS "academic_profiles_select_own" ON public.student_academic_profiles;
CREATE POLICY "academic_profiles_select_own"
  ON public.student_academic_profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "academic_profiles_insert_own" ON public.student_academic_profiles;
CREATE POLICY "academic_profiles_insert_own"
  ON public.student_academic_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "academic_profiles_update_own" ON public.student_academic_profiles;
CREATE POLICY "academic_profiles_update_own"
  ON public.student_academic_profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
