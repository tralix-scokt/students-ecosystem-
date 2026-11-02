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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const rate = checkRateLimit(
    "learning-mutation",
    extractClientIdentifier(request.headers)
  );
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many progress updates. Please wait briefly." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }
  let body: {
    lessonId?: unknown;
    markCompleted?: unknown;
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

  const lessonId = typeof body.lessonId === "string" ? body.lessonId.trim() : "";
  if (!UUID_RE.test(lessonId)) {
    return NextResponse.json(
      { ok: false, error: "Valid lesson identifier is required." },
      { status: 400 }
    );
  }

  const markCompleted = Boolean(body.markCompleted);
  const rawSeconds = Number(body.timeSpentSeconds ?? 0);
  const timeSpentSeconds = Number.isFinite(rawSeconds)
    ? Math.max(0, Math.min(3600, Math.floor(rawSeconds)))
    : 0;

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
        sanitized: { lessonId, markCompleted, timeSpentSeconds },
      });
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const { data, error } = await supabase.rpc(
      "record_student_lesson_activity",
      {
        p_lesson_id: lessonId,
        p_mark_completed: markCompleted,
        p_time_spent_seconds: timeSpentSeconds,
      }
    );

    if (error) {
      if (isNetworkTransportError(error)) {
        return NextResponse.json({
          ok: true,
          delegateToBrowser: true,
          sanitized: { lessonId, markCompleted, timeSpentSeconds },
        });
      }
      return NextResponse.json(
        { ok: false, error: "Unable to update lesson progress." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    if (isNetworkTransportError(err)) {
      return NextResponse.json({
        ok: true,
        delegateToBrowser: true,
        sanitized: { lessonId, markCompleted, timeSpentSeconds },
      });
    }
    return NextResponse.json(
      { ok: false, error: "Unable to update lesson progress." },
      { status: 500 }
    );
  }
}
