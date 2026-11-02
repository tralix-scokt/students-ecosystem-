import { NextResponse } from "next/server";
import {
  checkRateLimit,
  extractClientIdentifier,
} from "@/lib/security/rateLimiter";
import {
  normalizeEmail,
  validateForgotPasswordInput,
} from "@/lib/validation/authValidation";
import {
  isNetworkTransportError,
  isSupabaseConfigured,
  resolveRequestOrigin,
} from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  mapAuthErrorMessage,
  NEUTRAL_RECOVERY_MESSAGE,
} from "@/lib/auth/errorMessages";

export async function POST(request: Request) {
  const clientId = extractClientIdentifier(request.headers);
  const rate = checkRateLimit("forgot-password", clientId);

  if (!rate.allowed) {
    return NextResponse.json(
      {
        status: "rate-limited",
        title: "Too Many Recovery Requests",
        message: `Please wait ${rate.retryAfterSeconds} seconds before requesting another password reset email.`,
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
  const fieldErrors = validateForgotPasswordInput({ email: emailRaw });
  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      {
        status: "validation-error",
        title: "Valid Email Required",
        message: "Please enter a valid email address.",
        fieldErrors,
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        status: "unconfigured",
        title: "Supabase Configuration Required",
        message:
          "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const sanitizedEmail = normalizeEmail(emailRaw);
  const origin = resolveRequestOrigin(request.headers);
  const redirectTo = `${origin}/auth/callback?next=/reset-password`;

  const supabase = await createServerSupabaseClient({ timeoutMs: 3000 });
  if (!supabase) {
    return NextResponse.json(
      {
        status: "unconfigured",
        message: "Supabase client could not be initialized.",
      },
      { status: 503 }
    );
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      sanitizedEmail,
      { redirectTo }
    );

    if (error) {
      if (isNetworkTransportError(error)) {
        return NextResponse.json(
          {
            delegateToBrowser: true,
            sanitized: { email: sanitizedEmail },
            redirectTo,
          },
          { status: 200, headers: { "Cache-Control": "no-store" } }
        );
      }

      const mapped = mapAuthErrorMessage(error.message, "reset");
      if (mapped.isRateLimited) {
        return NextResponse.json(
          {
            status: "rate-limited",
            title: "Too Many Requests",
            message: mapped.message,
          },
          { status: 429, headers: { "Cache-Control": "no-store" } }
        );
      }

      // Enumeration-safe: never reveal whether the email exists or does not exist
    }

    return NextResponse.json(
      {
        status: "success",
        title: "Check Your Inbox",
        message: NEUTRAL_RECOVERY_MESSAGE,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    if (isNetworkTransportError(err)) {
      return NextResponse.json(
        {
          delegateToBrowser: true,
          sanitized: { email: sanitizedEmail },
          redirectTo,
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      {
        status: "success",
        title: "Check Your Inbox",
        message: NEUTRAL_RECOVERY_MESSAGE,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}
