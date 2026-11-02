import { NextResponse } from "next/server";
import {
  checkRateLimit,
  extractClientIdentifier,
} from "@/lib/security/rateLimiter";
import {
  getSupabasePublicConfig,
  isNetworkTransportError,
} from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  buildDatabaseUpsertPayload,
  sanitizeOnboardingFormState,
  validateOnboardingByMode,
} from "@/lib/validation/onboardingValidation";
import type {
  OnboardingSaveMode,
  OnboardingSaveRequest,
  StudentAcademicProfile,
} from "@/types/onboarding";

const VALID_SAVE_MODES: readonly OnboardingSaveMode[] = [
  "draft",
  "step-1",
  "step-2",
  "step-3",
  "complete",
];

const ACADEMIC_PROFILE_COLUMNS =
  "user_id, academic_category, country, state_region, institution_name, institution_type, secondary_category, faculty, department, course_or_program, qualification_type, academic_level, curriculum, selected_subjects, learning_goals, explanation_preference, current_step, onboarding_completed, completed_at, created_at, updated_at";

export async function GET() {
  if (!getSupabasePublicConfig()) {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message:
          "Supabase environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.",
      },
      { status: 503 }
    );
  }

  const supabase = await createServerSupabaseClient({ timeoutMs: 3000 });
  if (!supabase) {
    return NextResponse.json(
      { ok: false, status: "error", message: "Supabase client unavailable." },
      { status: 503 }
    );
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError && isNetworkTransportError(authError)) {
      return NextResponse.json({ ok: true, delegateToBrowser: true });
    }

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          ok: false,
          status: "unauthorized",
          message: "Please sign in to access academic onboarding.",
        },
        { status: 401 }
      );
    }

    if (!authData.user.email_confirmed_at) {
      return NextResponse.json(
        {
          ok: false,
          status: "unauthorized",
          message: "Please verify your email address first.",
        },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("student_academic_profiles")
      .select(ACADEMIC_PROFILE_COLUMNS)
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (error) {
      if (isNetworkTransportError(error)) {
        return NextResponse.json({ ok: true, delegateToBrowser: true });
      }
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Could not load your academic onboarding profile.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        status: "saved",
        profile: (data as StudentAcademicProfile | null) ?? null,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (err) {
    if (isNetworkTransportError(err)) {
      return NextResponse.json({ ok: true, delegateToBrowser: true });
    }
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message: "Unexpected error loading academic onboarding profile.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const clientId = extractClientIdentifier(request.headers);
  const rate = checkRateLimit("onboarding-save", clientId);

  if (!rate.allowed) {
    return NextResponse.json(
      {
        ok: false,
        status: "rate-limited",
        retryAfterSeconds: rate.retryAfterSeconds,
        message: `Too many save requests. Please wait ${rate.retryAfterSeconds} seconds.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      }
    );
  }

  let body: Partial<OnboardingSaveRequest>;
  try {
    body = (await request.json()) as Partial<OnboardingSaveRequest>;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "validation-error",
        message: "Invalid onboarding request payload.",
      },
      { status: 400 }
    );
  }

  const mode: OnboardingSaveMode = VALID_SAVE_MODES.includes(
    body.mode as OnboardingSaveMode
  )
    ? (body.mode as OnboardingSaveMode)
    : "draft";

  // 1. Strict Server-Side Sanitization & Validation
  const sanitizedState = sanitizeOnboardingFormState(body.data);
  const fieldErrors = validateOnboardingByMode(sanitizedState, mode);

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      {
        ok: false,
        status: "validation-error",
        message: "Please resolve the highlighted academic fields before continuing.",
        fieldErrors,
      },
      { status: 400 }
    );
  }

  if (!getSupabasePublicConfig()) {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message:
          "Supabase environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.",
      },
      { status: 503 }
    );
  }

  const supabase = await createServerSupabaseClient({ timeoutMs: 3000 });
  if (!supabase) {
    return NextResponse.json(
      { ok: false, status: "error", message: "Supabase client unavailable." },
      { status: 503 }
    );
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError && isNetworkTransportError(authError)) {
      return NextResponse.json({
        ok: true,
        delegateToBrowser: true,
        mode,
        sanitizedState,
      });
    }

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          ok: false,
          status: "unauthorized",
          message: "Your session has expired. Please sign in again.",
        },
        { status: 401 }
      );
    }

    if (!authData.user.email_confirmed_at) {
      return NextResponse.json(
        {
          ok: false,
          status: "unauthorized",
          message: "Please verify your email address before saving onboarding data.",
        },
        { status: 403 }
      );
    }

    const dbPayload = buildDatabaseUpsertPayload(
      authData.user.id,
      sanitizedState,
      mode
    );

    const { data: savedProfile, error: upsertError } = await supabase
      .from("student_academic_profiles")
      .upsert(dbPayload, { onConflict: "user_id" })
      .select(ACADEMIC_PROFILE_COLUMNS)
      .single();

    if (upsertError) {
      if (isNetworkTransportError(upsertError)) {
        return NextResponse.json({
          ok: true,
          delegateToBrowser: true,
          mode,
          sanitizedState,
        });
      }
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message:
            "Unable to save your academic onboarding details. Please check your entries and try again.",
        },
        { status: 400 }
      );
    }

    // Keep base profile country synchronized under RLS when updated
    if (sanitizedState.country) {
      await supabase
        .from("profiles")
        .update({ country: sanitizedState.country })
        .eq("id", authData.user.id);
    }

    return NextResponse.json(
      {
        ok: true,
        status: "saved",
        message:
          mode === "complete"
            ? "Academic onboarding completed and personalized."
            : "Onboarding progress saved.",
        profile: savedProfile as StudentAcademicProfile,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (err) {
    if (isNetworkTransportError(err)) {
      return NextResponse.json({
        ok: true,
        delegateToBrowser: true,
        mode,
        sanitizedState,
      });
    }
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message: "An unexpected error occurred while saving your progress.",
      },
      { status: 500 }
    );
  }
}
