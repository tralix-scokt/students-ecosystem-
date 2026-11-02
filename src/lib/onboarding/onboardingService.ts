import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  buildDatabaseUpsertPayload,
  sanitizeOnboardingFormState,
  validateOnboardingByMode,
} from "@/lib/validation/onboardingValidation";
import type { UserProfile } from "@/types/auth";
import type {
  OnboardingFormState,
  OnboardingSaveMode,
  OnboardingSaveResult,
  StudentAcademicProfile,
} from "@/types/onboarding";

const ACADEMIC_PROFILE_COLUMNS =
  "user_id, academic_category, country, state_region, institution_name, institution_type, secondary_category, faculty, department, course_or_program, qualification_type, academic_level, curriculum, selected_subjects, learning_goals, explanation_preference, current_step, onboarding_completed, completed_at, created_at, updated_at";

interface ServerOnboardingResponse {
  ok: boolean;
  status?: OnboardingSaveResult["status"];
  message?: string;
  profile?: StudentAcademicProfile | null;
  fieldErrors?: Record<string, string>;
  retryAfterSeconds?: number;
  delegateToBrowser?: boolean;
  mode?: OnboardingSaveMode;
  sanitizedState?: OnboardingFormState;
}

export interface LearnerOnboardingBundle {
  authenticated: boolean;
  emailVerified: boolean;
  userId?: string;
  email?: string;
  userProfile: UserProfile | null;
  academicProfile: StudentAcademicProfile | null;
  errorMessage?: string;
}

export async function fetchLearnerOnboardingBundle(): Promise<LearnerOnboardingBundle> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return {
      authenticated: false,
      emailVerified: false,
      userProfile: null,
      academicProfile: null,
      errorMessage:
        "Supabase environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured.",
    };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return {
      authenticated: false,
      emailVerified: false,
      userProfile: null,
      academicProfile: null,
    };
  }

  const user = userData.user;
  const emailVerified = Boolean(user.email_confirmed_at);
  if (!emailVerified) {
    return {
      authenticated: true,
      emailVerified: false,
      userId: user.id,
      email: user.email,
      userProfile: null,
      academicProfile: null,
    };
  }

  const { data: baseProfile } = await supabase
    .from("profiles")
    .select("id, full_name, email, country, role, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  let academicProfile: StudentAcademicProfile | null = null;
  let needsBrowserFetch = true;

  try {
    const res = await fetch("/api/onboarding", {
      method: "GET",
      cache: "no-store",
    });
    const json = (await res.json()) as ServerOnboardingResponse;
    if (json.ok && !json.delegateToBrowser) {
      academicProfile = json.profile ?? null;
      needsBrowserFetch = false;
    }
  } catch {
    needsBrowserFetch = true;
  }

  if (needsBrowserFetch) {
    const { data: academicRow, error: academicError } = await supabase
      .from("student_academic_profiles")
      .select(ACADEMIC_PROFILE_COLUMNS)
      .eq("user_id", user.id)
      .maybeSingle();

    if (academicError) {
      return {
        authenticated: true,
        emailVerified: true,
        userId: user.id,
        email: user.email,
        userProfile: (baseProfile as UserProfile | null) ?? null,
        academicProfile: null,
        errorMessage:
          "Unable to load your saved academic onboarding record from Supabase.",
      };
    }

    academicProfile = (academicRow as StudentAcademicProfile | null) ?? null;
  }

  return {
    authenticated: true,
    emailVerified: true,
    userId: user.id,
    email: user.email,
    userProfile: (baseProfile as UserProfile | null) ?? null,
    academicProfile,
  };
}

export async function saveLearnerOnboarding(
  formState: OnboardingFormState,
  mode: OnboardingSaveMode
): Promise<OnboardingSaveResult> {
  const sanitizedLocal = sanitizeOnboardingFormState(formState);
  const localErrors = validateOnboardingByMode(sanitizedLocal, mode);
  if (Object.keys(localErrors).length > 0) {
    return {
      ok: false,
      status: "validation-error",
      message: "Please resolve the highlighted academic fields before continuing.",
      fieldErrors: localErrors,
    };
  }

  let serverData: ServerOnboardingResponse;
  try {
    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, data: sanitizedLocal }),
    });
    serverData = (await response.json()) as ServerOnboardingResponse;
  } catch {
    return {
      ok: false,
      status: "error",
      message: "Unable to reach the onboarding validation server. Please try again.",
    };
  }

  if (!serverData.ok) {
    return {
      ok: false,
      status: serverData.status ?? "error",
      message:
        serverData.message ?? "Could not validate or save your onboarding progress.",
      fieldErrors: serverData.fieldErrors,
      retryAfterSeconds: serverData.retryAfterSeconds,
    };
  }

  if (!serverData.delegateToBrowser && serverData.profile) {
    return {
      ok: true,
      status: "saved",
      message: serverData.message ?? "Onboarding progress saved.",
      profile: serverData.profile,
    };
  }

  // Server validated & sanitized; execute real RLS-protected PostgreSQL upsert via @supabase/ssr
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      status: "error",
      message: "Supabase client is not configured.",
    };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return {
      ok: false,
      status: "unauthorized",
      message: "Your session has expired. Please sign in again.",
    };
  }

  const effectiveState = serverData.sanitizedState ?? sanitizedLocal;
  const effectiveMode = serverData.mode ?? mode;
  const dbPayload = buildDatabaseUpsertPayload(
    userData.user.id,
    effectiveState,
    effectiveMode
  );

  const { data: savedRow, error: upsertError } = await supabase
    .from("student_academic_profiles")
    .upsert(dbPayload, { onConflict: "user_id" })
    .select(ACADEMIC_PROFILE_COLUMNS)
    .single();

  if (upsertError || !savedRow) {
    return {
      ok: false,
      status: "error",
      message:
        "Could not persist your academic onboarding profile to Supabase. Please check your entries and try again.",
    };
  }

  if (effectiveState.country) {
    await supabase
      .from("profiles")
      .update({ country: effectiveState.country })
      .eq("id", userData.user.id);
  }

  return {
    ok: true,
    status: "saved",
    message:
      effectiveMode === "complete"
        ? "Academic onboarding completed and personalized."
        : "Onboarding progress saved.",
    profile: savedRow as StudentAcademicProfile,
  };
}

export async function resolveBrowserOnboardingDestination(
  userId: string,
  requestedNext?: string | null
): Promise<string> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return "/onboarding";

  const { data } = await supabase
    .from("student_academic_profiles")
    .select("onboarding_completed")
    .eq("user_id", userId)
    .maybeSingle();

  const isComplete = Boolean(data?.onboarding_completed);
  if (!isComplete) {
    return "/onboarding";
  }

  if (
    requestedNext &&
    requestedNext.startsWith("/") &&
    !requestedNext.startsWith("//") &&
    requestedNext !== "/onboarding"
  ) {
    return requestedNext;
  }

  return "/dashboard";
}
