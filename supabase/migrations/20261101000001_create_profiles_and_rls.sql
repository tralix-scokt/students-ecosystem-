-- ============================================================================
-- E-LEARNING ECOSYSTEM (Powered by TRALIX AI) — Step 2 Authentication Schema
-- Migration: 20261101000001_create_profiles_and_rls.sql
-- ============================================================================

-- 1. Create public.profiles linked 1:1 with auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 120),
  email text NOT NULL CHECK (char_length(btrim(email)) BETWEEN 3 AND 254),
  country text NOT NULL CHECK (char_length(btrim(country)) BETWEEN 2 AND 100),
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'educator', 'admin')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (lower(email));

COMMENT ON TABLE public.profiles IS 'Learner profile records linked 1:1 with Supabase Auth users.';
COMMENT ON COLUMN public.profiles.role IS 'Protected system role; immutable by client/authenticated users.';

-- 2. Trigger function: enforce immutable system columns & auto-maintain updated_at
CREATE OR REPLACE FUNCTION public.enforce_profile_security_and_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Prevent client sessions from inserting privileged roles
    IF current_user IN ('authenticated', 'anon') AND NEW.role <> 'student' THEN
      RAISE EXCEPTION 'Privilege escalation denied: cannot assign non-student role.';
    END IF;
    NEW.full_name := btrim(NEW.full_name);
    NEW.email := lower(btrim(NEW.email));
    NEW.country := btrim(NEW.country);
    NEW.created_at := COALESCE(NEW.created_at, timezone('utc', now()));
    NEW.updated_at := timezone('utc', now());
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Block client/authenticated sessions from mutating protected identity/role fields
    IF current_user IN ('authenticated', 'anon') THEN
      IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Modification of profile id is not permitted.';
      END IF;
      IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Privilege escalation denied: role cannot be modified by user.';
      END IF;
      IF NEW.email IS DISTINCT FROM OLD.email THEN
        RAISE EXCEPTION 'Direct modification of profile email is not permitted; use Auth email update.';
      END IF;
      IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'Modification of created_at timestamp is not permitted.';
      END IF;
    END IF;

    NEW.full_name := btrim(NEW.full_name);
    NEW.country := btrim(NEW.country);
    NEW.updated_at := timezone('utc', now());
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_security_and_timestamps ON public.profiles;
CREATE TRIGGER trg_profiles_security_and_timestamps
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_security_and_timestamps();

-- 3. Trigger function: securely initialize/sync profile from auth.users
CREATE OR REPLACE FUNCTION public.handle_auth_user_created_or_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_full_name text;
  v_country text;
  v_email text;
BEGIN
  v_email := lower(btrim(COALESCE(NEW.email, '')));
  v_full_name := btrim(COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));
  v_country := btrim(COALESCE(NEW.raw_user_meta_data ->> 'country', ''));

  IF char_length(v_full_name) < 2 THEN
    v_full_name := COALESCE(NULLIF(split_part(v_email, '@', 1), ''), 'Learner');
    IF char_length(v_full_name) < 2 THEN
      v_full_name := 'Learner';
    END IF;
  END IF;

  IF char_length(v_country) < 2 THEN
    v_country := 'Unspecified';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, country, role)
  VALUES (
    NEW.id,
    left(v_full_name, 120),
    v_email,
    left(v_country, 100),
    'student'
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = CASE
          WHEN public.profiles.full_name = 'Learner' AND char_length(EXCLUDED.full_name) >= 2
          THEN EXCLUDED.full_name
          ELSE public.profiles.full_name
        END,
        country = CASE
          WHEN public.profiles.country = 'Unspecified' AND char_length(EXCLUDED.country) >= 2
          THEN EXCLUDED.country
          ELSE public.profiles.country
        END,
        updated_at = timezone('utc', now());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_or_updated ON auth.users;
CREATE TRIGGER on_auth_user_created_or_updated
  AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_created_or_updated();

-- 4. Enable & Force Row Level Security + Least-Privilege Grants
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.profiles FROM PUBLIC;
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.profiles FROM authenticated;

GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (full_name, country) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id AND role = 'student');
