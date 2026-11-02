import { NextResponse } from "next/server";
import { mapExerciseAttemptRow } from "@/lib/learning/queryLearning";
import {
  checkRateLimit,
  extractClientIdentifier,
} from "@/lib/security/rateLimiter";
import {
  getSupabasePublicConfig,
  isNetworkTransportError,
} from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const rate = checkRateLimit(
    "exam-submit",
    extractClientIdentifier(request.headers)
  );
  if (!rate.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Too many exercise submissions. Please wait ${rate.retryAfterSeconds}s.`,
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }
  let body: {
    exerciseId?: unknown;
    answers?: unknown;
    timeSpentSeconds?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request payload." },
      { status: 400 }
    );
  }

  const exerciseId =
    typeof body.exerciseId === "string" ? body.exerciseId.trim() : "";
  if (!UUID_RE.test(exerciseId)) {
    return NextResponse.json(
      { ok: false, error: "Valid exercise identifier is required." },
      { status: 400 }
    );
  }

  if (
    !body.answers ||
    typeof body.answers !== "object" ||
    Array.isArray(body.answers)
  ) {
    return NextResponse.json(
      { ok: false, error: "Answers object is required." },
      { status: 400 }
    );
  }

  const sanitizedAnswers: Record<string, string> = {};
  for (const [k, v] of Object.entries(body.answers as Record<string, unknown>)) {
    if (UUID_RE.test(k) && typeof v === "string") {
      sanitizedAnswers[k] = v.slice(0, 4000);
    }
  }

  const rawSeconds = Number(body.timeSpentSeconds ?? 0);
  const timeSpentSeconds =
    Number.isFinite(rawSeconds) && rawSeconds > 0
      ? Math.min(7200, Math.floor(rawSeconds))
      : null;

  if (!getSupabasePublicConfig()) {
    return NextResponse.json(
      { ok: false, error: "Supabase environment variables are not configured." },
      { status: 503 }
    );
  }

  const supabase = await createServerSupabaseClient({ timeoutMs: 3000 });
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase client could not be initialized." },
      { status: 503 }
    );
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError && isNetworkTransportError(authError)) {
      return NextResponse.json({
        ok: true,
        delegateToBrowser: true,
        sanitized: { exerciseId, answers: sanitizedAnswers, timeSpentSeconds },
      });
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const { data, error } = await supabase.rpc(
      "submit_student_exercise_attempt",
      {
        p_exercise_id: exerciseId,
        p_answers: sanitizedAnswers,
        p_time_spent_seconds: timeSpentSeconds,
      }
    );

    if (error) {
      if (isNetworkTransportError(error)) {
        return NextResponse.json({
          ok: true,
          delegateToBrowser: true,
          sanitized: { exerciseId, answers: sanitizedAnswers, timeSpentSeconds },
        });
      }
      return NextResponse.json(
        { ok: false, error: "Unable to submit exercise attempt." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      attempt: mapExerciseAttemptRow((data ?? {}) as Record<string, unknown>),
    });
  } catch (err) {
    if (isNetworkTransportError(err)) {
      return NextResponse.json({
        ok: true,
        delegateToBrowser: true,
        sanitized: { exerciseId, answers: sanitizedAnswers, timeSpentSeconds },
      });
    }
    return NextResponse.json(
      { ok: false, error: "Unable to submit exercise attempt." },
      { status: 500 }
    );
  }
}
