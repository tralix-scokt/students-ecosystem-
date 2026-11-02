import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  isNetworkTransportError,
  resolveRequestOrigin,
} from "@/lib/supabase/config";
import { sanitizeNextPath } from "@/lib/auth/errorMessages";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const errorDescription = searchParams.get("error_description");
  const safeNext = sanitizeNextPath(
    searchParams.get("next") ??
      (type === "recovery" ? "/reset-password" : "/onboarding")
  );
  const origin = resolveRequestOrigin(request.headers);

  if (errorDescription) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("authError", errorDescription);
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createServerSupabaseClient({ timeoutMs: 3000 });
  if (!supabase) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set(
      "authError",
      "Supabase authentication is not configured."
    );
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(new URL(safeNext, origin));
      }

      if (isNetworkTransportError(error)) {
        const confirmUrl = new URL("/auth/confirm", origin);
        confirmUrl.searchParams.set("code", code);
        confirmUrl.searchParams.set("next", safeNext);
        if (type) confirmUrl.searchParams.set("type", type);
        return NextResponse.redirect(confirmUrl);
      }

      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set(
        "authError",
        "Your verification or recovery link has expired or already been used."
      );
      return NextResponse.redirect(loginUrl);
    } catch (err) {
      if (isNetworkTransportError(err)) {
        const confirmUrl = new URL("/auth/confirm", origin);
        confirmUrl.searchParams.set("code", code);
        confirmUrl.searchParams.set("next", safeNext);
        if (type) confirmUrl.searchParams.set("type", type);
        return NextResponse.redirect(confirmUrl);
      }
    }
  }

  if (tokenHash && type) {
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
      if (!error) {
        return NextResponse.redirect(new URL(safeNext, origin));
      }

      if (isNetworkTransportError(error)) {
        const confirmUrl = new URL("/auth/confirm", origin);
        confirmUrl.searchParams.set("token_hash", tokenHash);
        confirmUrl.searchParams.set("type", type);
        confirmUrl.searchParams.set("next", safeNext);
        return NextResponse.redirect(confirmUrl);
      }

      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set(
        "authError",
        "Your verification or recovery link is invalid or expired."
      );
      return NextResponse.redirect(loginUrl);
    } catch (err) {
      if (isNetworkTransportError(err)) {
        const confirmUrl = new URL("/auth/confirm", origin);
        confirmUrl.searchParams.set("token_hash", tokenHash);
        confirmUrl.searchParams.set("type", type);
        confirmUrl.searchParams.set("next", safeNext);
        return NextResponse.redirect(confirmUrl);
      }
    }
  }

  // Fallback for hash-fragment callbacks (#access_token=...&type=recovery|signup)
  const confirmUrl = new URL("/auth/confirm", origin);
  confirmUrl.searchParams.set("next", safeNext);
  return NextResponse.redirect(confirmUrl);
}
