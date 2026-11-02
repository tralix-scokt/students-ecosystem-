import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  REMEMBER_COOKIE_NAME,
} from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createServerSupabaseClient({ timeoutMs: 2500 });
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // Proceed to clear local session cookies regardless of network reachability
    }
  }

  const cookieStore = await cookies();
  for (const cookie of cookieStore.getAll()) {
    if (
      cookie.name.startsWith("sb-") ||
      cookie.name === REMEMBER_COOKIE_NAME
    ) {
      cookieStore.set(cookie.name, "", {
        path: "/",
        maxAge: 0,
      });
    }
  }

  return NextResponse.json(
    { status: "success", redirectTo: "/login" },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
