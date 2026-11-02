import { NextResponse } from "next/server";
import { queryLearningLibrary } from "@/lib/learning/queryLearning";
import {
  getSupabasePublicConfig,
  isNetworkTransportError,
} from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
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

    const payload = await queryLearningLibrary(
      supabase,
      user.id,
      user.email ?? ""
    );

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
      { ok: false, error: "Unable to load the learning library right now." },
      { status: 500 }
    );
  }
}
