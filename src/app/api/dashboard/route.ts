import { NextResponse } from "next/server";
import { queryStudentDashboardData } from "@/lib/dashboard/queryDashboard";
import {
  getSupabasePublicConfig,
  isNetworkTransportError,
} from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  if (!getSupabasePublicConfig()) {
    return NextResponse.json(
      {
        ok: false,
        status: "unconfigured",
        message:
          "Supabase environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured.",
      },
      { status: 503 }
    );
  }

  const supabase = await createServerSupabaseClient({ timeoutMs: 3000 });
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message: "Supabase client could not be initialized.",
      },
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
          message: "Please sign in to access your student dashboard.",
        },
        { status: 401 }
      );
    }

    if (!authData.user.email_confirmed_at) {
      return NextResponse.json(
        {
          ok: false,
          status: "unverified-email",
          email: authData.user.email,
          message: "Please verify your email address first.",
        },
        { status: 403 }
      );
    }

    const payload = await queryStudentDashboardData(
      supabase,
      authData.user.id,
      authData.user.email ?? ""
    );

    return NextResponse.json(
      { ok: true, payload },
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
        message:
          "Unable to load your dashboard records right now. Please try again.",
      },
      { status: 500 }
    );
  }
}
