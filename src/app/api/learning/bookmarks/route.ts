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
      { ok: false, error: "Too many requests. Please wait before retrying." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }
  let body: {
    courseId?: unknown;
    lessonId?: unknown;
    bookmarked?: unknown;
    note?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request payload." },
      { status: 400 }
    );
  }

  const courseId = typeof body.courseId === "string" ? body.courseId.trim() : "";
  const lessonId = typeof body.lessonId === "string" ? body.lessonId.trim() : "";
  if (!UUID_RE.test(courseId) || !UUID_RE.test(lessonId)) {
    return NextResponse.json(
      { ok: false, error: "Valid course and lesson identifiers are required." },
      { status: 400 }
    );
  }

  const bookmarked = Boolean(body.bookmarked);
  const note =
    typeof body.note === "string" ? body.note.trim().slice(0, 280) || null : null;

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
        sanitized: { courseId, lessonId, bookmarked, note },
      });
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    if (bookmarked) {
      const { error } = await supabase.from("student_lesson_bookmarks").upsert(
        {
          user_id: user.id,
          course_id: courseId,
          lesson_id: lessonId,
          note,
        },
        { onConflict: "user_id,lesson_id" }
      );

      if (error) {
        if (isNetworkTransportError(error)) {
          return NextResponse.json({
            ok: true,
            delegateToBrowser: true,
            sanitized: { courseId, lessonId, bookmarked, note },
          });
        }
        return NextResponse.json(
          { ok: false, error: "Unable to save bookmark." },
          { status: 500 }
        );
      }
    } else {
      const { error } = await supabase
        .from("student_lesson_bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId);

      if (error) {
        if (isNetworkTransportError(error)) {
          return NextResponse.json({
            ok: true,
            delegateToBrowser: true,
            sanitized: { courseId, lessonId, bookmarked, note },
          });
        }
        return NextResponse.json(
          { ok: false, error: "Unable to remove bookmark." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true, bookmarked });
  } catch (err) {
    if (isNetworkTransportError(err)) {
      return NextResponse.json({
        ok: true,
        delegateToBrowser: true,
        sanitized: { courseId, lessonId, bookmarked, note },
      });
    }
    return NextResponse.json(
      { ok: false, error: "Unable to update bookmark." },
      { status: 500 }
    );
  }
}
