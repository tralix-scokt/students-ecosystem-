import { NextResponse } from "next/server";
import {
  checkRateLimit,
  extractClientIdentifier,
} from "@/lib/security/rateLimiter";
import { validateResetPasswordInput } from "@/lib/validation/authValidation";
import {
  isNetworkTransportError,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapAuthErrorMessage } from "@/lib/auth/errorMessages";

export async function POST(request: Request) {
  const clientId = extractClientIdentifier(request.headers);
  const rate = checkRateLimit("reset-password", clientId);

  if (!rate.allowed) {
    return NextResponse.json(
      {
        status: "rate-limited",
        title: "Too Many Attempts",
        message: `Please wait ${rate.retryAfterSeconds} seconds before trying again.`,
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

  const values = {
    password: String(body.password ?? ""),
    confirmPassword: String(body.confirmPassword ?? ""),
  };

  const fieldErrors = validateResetPasswordInput(values);
  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      {
        status: "validation-error",
        title: "Check New Password",
        message: "Please resolve the highlighted password requirements.",
        fieldErrors,
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        status: "unconfigured",
        message:
          "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured.",
      },
      { status: 503 }
    );
  }

  const supabase = await createServerSupabaseClient({ timeoutMs: 3000 });
  if (!supabase) {
    return NextResponse.json(
      { status: "unconfigured", message: "Supabase client unavailable." },
      { status: 503 }
    );
  }

  try {
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      if (isNetworkTransportError(error)) {
        return NextResponse.json(
          { delegateToBrowser: true },
          { status: 200, headers: { "Cache-Control": "no-store" } }
        );
      }

      const mapped = mapAuthErrorMessage(error.message, "reset");
      return NextResponse.json(
        {
          status: mapped.isRateLimited ? "rate-limited" : "auth-error",
          title: "Could Not Update Password",
          message: mapped.message,
        },
        {
          status: mapped.isRateLimited ? 429 : 400,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    // Sign out recovery session so user signs in cleanly with their new password
    await supabase.auth.signOut();

    return NextResponse.json(
      {
        status: "success",
        title: "Password Updated Successfully",
        redirectTo: "/login",
        message:
          "Your password has been updated securely. You can now sign in with your new password.",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    if (isNetworkTransportError(err)) {
      return NextResponse.json(
        { delegateToBrowser: true },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      {
        status: "auth-error",
        message: "Unable to update password right now. Please try again.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
