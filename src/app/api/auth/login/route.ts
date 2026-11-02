import { NextResponse } from "next/server";
import {
  checkRateLimit,
  extractClientIdentifier,
} from "@/lib/security/rateLimiter";
import {
  normalizeEmail,
  validateLoginInput,
} from "@/lib/validation/authValidation";
import {
  isNetworkTransportError,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapAuthErrorMessage } from "@/lib/auth/errorMessages";

export async function POST(request: Request) {
  const clientId = extractClientIdentifier(request.headers);
  const rate = checkRateLimit("login", clientId);

  if (!rate.allowed) {
    return NextResponse.json(
      {
        status: "rate-limited",
        title: "Too Many Sign-In Attempts",
        message: `Too many sign-in attempts. Please wait ${rate.retryAfterSeconds} seconds before trying again.`,
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
      {
        status: "validation-error",
        message: "Invalid request payload.",
      },
      { status: 400 }
    );
  }

  const values = {
    email: String(body.email ?? ""),
    password: String(body.password ?? ""),
    rememberMe: Boolean(body.rememberMe),
  };

  const fieldErrors = validateLoginInput(values);
  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      {
        status: "validation-error",
        title: "Check Your Details",
        message: "Please resolve the highlighted fields before signing in.",
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

  const sanitizedEmail = normalizeEmail(values.email);
  const supabase = await createServerSupabaseClient({
    rememberMe: values.rememberMe,
    timeoutMs: 3000,
  });

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
    const { data, error } = await supabase.auth.signInWithPassword({
      email: sanitizedEmail,
      password: values.password,
    });

    if (error) {
      if (isNetworkTransportError(error)) {
        return NextResponse.json(
          {
            delegateToBrowser: true,
            sanitized: {
              email: sanitizedEmail,
              rememberMe: values.rememberMe,
            },
          },
          { status: 200, headers: { "Cache-Control": "no-store" } }
        );
      }

      const mapped = mapAuthErrorMessage(error.message, "login");
      if (mapped.isUnverifiedEmail) {
        return NextResponse.json(
          {
            status: "unverified-email",
            title: "Email Verification Required",
            email: sanitizedEmail,
            message: mapped.message,
          },
          { status: 403, headers: { "Cache-Control": "no-store" } }
        );
      }

      return NextResponse.json(
        {
          status: mapped.isRateLimited ? "rate-limited" : "auth-error",
          title: mapped.isRateLimited
            ? "Too Many Attempts"
            : "Sign-In Unsuccessful",
          message: mapped.message,
        },
        {
          status: mapped.isRateLimited ? 429 : 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    // Block unverified users from accessing protected student areas
    if (!data.user?.email_confirmed_at) {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          status: "unverified-email",
          title: "Email Verification Required",
          email: sanitizedEmail,
          message:
            "Please verify your email address using the link sent to your inbox before accessing protected student areas.",
        },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    let redirectTo = "/onboarding";
    let isAdmin = false;
    try {
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profileRow?.role === "admin") {
        isAdmin = true;
      }
    } catch {
      // Fallback safely to academic profile check
    }

    if (isAdmin) {
      redirectTo = "/admin";
    } else {
      try {
        const { data: academicRow } = await supabase
          .from("student_academic_profiles")
          .select("onboarding_completed")
          .eq("user_id", data.user.id)
          .maybeSingle();
        if (academicRow?.onboarding_completed) {
          redirectTo = "/dashboard";
        }
      } catch {
        // Defaults safely to /onboarding which checks completion state as well
      }
    }

    return NextResponse.json(
      {
        status: "success",
        title: "Signed In",
        email: sanitizedEmail,
        redirectTo,
        message: "Signed in successfully. Preparing your learning environment...",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    if (isNetworkTransportError(err)) {
      return NextResponse.json(
        {
          delegateToBrowser: true,
          sanitized: {
            email: sanitizedEmail,
            rememberMe: values.rememberMe,
          },
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      {
        status: "auth-error",
        message: "Unable to sign in right now. Please try again shortly.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
