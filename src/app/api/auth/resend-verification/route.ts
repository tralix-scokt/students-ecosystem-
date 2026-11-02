import { NextResponse } from "next/server";
import {
  checkRateLimit,
  extractClientIdentifier,
} from "@/lib/security/rateLimiter";
import {
  normalizeEmail,
  validateEmailFormat,
} from "@/lib/validation/authValidation";
import {
  isNetworkTransportError,
  isSupabaseConfigured,
  resolveRequestOrigin,
} from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapAuthErrorMessage } from "@/lib/auth/errorMessages";

export async function POST(request: Request) {
  const clientId = extractClientIdentifier(request.headers);
  const rate = checkRateLimit("resend-verification", clientId);

  if (!rate.allowed) {
    return NextResponse.json(
      {
        status: "rate-limited",
        title: "Please Wait Before Resending",
        message: `You can request another verification email in ${rate.retryAfterSeconds} seconds.`,
        retryAfterSeconds: rate.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSeconds),
          "Cache-Control": "no-store",
        },
      }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { status: "validation-error", message: "Invalid request payload." },
      { status: 400 }
    );
  }

  const emailRaw = String(body.email ?? "");
  const emailError = validateEmailFormat(emailRaw);
  if (emailError) {
    return NextResponse.json(
      {
        status: "validation-error",
        message: emailError,
        fieldErrors: { email: emailError },
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        status: "unconfigured",
        message: "Supabase credentials are not configured.",
      },
      { status: 503 }
    );
  }

  const sanitizedEmail = normalizeEmail(emailRaw);
  const origin = resolveRequestOrigin(request.headers);
  const emailRedirectTo = `${origin}/auth/callback?next=/onboarding`;

  const supabase = await createServerSupabaseClient({ timeoutMs: 3000 });
  if (!supabase) {
    return NextResponse.json(
      { status: "unconfigured", message: "Supabase client unavailable." },
      { status: 503 }
    );
  }

  try {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: sanitizedEmail,
      options: { emailRedirectTo },
    });

    if (error) {
      if (isNetworkTransportError(error)) {
        return NextResponse.json(
          {
            delegateToBrowser: true,
            sanitized: { email: sanitizedEmail },
            emailRedirectTo,
          },
          { status: 200, headers: { "Cache-Control": "no-store" } }
        );
      }

      const mapped = mapAuthErrorMessage(error.message, "resend");
      if (mapped.isRateLimited) {
        return NextResponse.json(
          {
            status: "rate-limited",
            title: "Please Wait Before Resending",
            message: mapped.message,
          },
          { status: 429, headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    return NextResponse.json(
      {
        status: "success",
        title: "Verification Email Sent",
        message:
          "If an unverified account exists for that email address, a fresh verification link has been sent.",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    if (isNetworkTransportError(err)) {
      return NextResponse.json(
        {
          delegateToBrowser: true,
          sanitized: { email: sanitizedEmail },
          emailRedirectTo,
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      {
        status: "success",
        title: "Verification Email Sent",
        message:
          "If an unverified account exists for that email address, a fresh verification link has been sent.",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}
