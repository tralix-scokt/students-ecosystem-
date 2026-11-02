import { NextResponse } from "next/server";
import { queryCourseDetail } from "@/lib/learning/queryLearning";
import {
  getSupabasePublicConfig,
  isNetworkTransportError,
} from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,120}$/;

export async function GET(
  _request: Request,
  context: { params: Promise<{ courseSlug: string }> }
) {
  const { courseSlug } = await context.params;
  if (!SLUG_RE.test(courseSlug)) {
    return NextResponse.json(
      { ok: false, error: "Invalid course identifier." },
      { status: 400 }
    );
  }

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
      });
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const payload = await queryCourseDetail(
      supabase,
      user.id,
      user.email ?? "",
      courseSlug
    );

    if (!payload) {
      return NextResponse.json(
        { ok: false, error: "Course not found or not published." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ok: true, data: payload },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (err) {
    if (isNetworkTransportError(err)) {
      return NextResponse.json({
        ok: true,
        delegateToBrowser: true,
      });
    }

    return NextResponse.json(
      { ok: false, error: "Unable to load course details right now." },
      { status: 500 }
    );
  }
}
