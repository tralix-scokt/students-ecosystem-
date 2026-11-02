import { NextResponse } from "next/server";
import {
  checkRateLimit,
  extractClientIdentifier,
} from "@/lib/security/rateLimiter";
import {
  normalizeEmail,
  validateRegistrationInput,
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
  const rate = checkRateLimit("register", clientId);

  if (!rate.allowed) {
    return NextResponse.json(
      {
        status: "rate-limited",
        title: "Too Many Registration Attempts",
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
      {
        status: "validation-error",
        message: "Invalid request payload.",
      },
      { status: 400 }
    );
  }

  const values = {
    fullName: String(body.fullName ?? ""),
    email: String(body.email ?? ""),
    password: String(body.password ?? ""),
    confirmPassword: String(body.confirmPassword ?? ""),
    country: String(body.country ?? ""),
    acceptTerms: Boolean(body.acceptTerms),
  };

  const fieldErrors = validateRegistrationInput(values);
  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      {
        status: "validation-error",
        title: "Review Registration Details",
        message: "Please resolve the highlighted validation errors.",
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
          "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured in your environment.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const sanitizedFullName = values.fullName.trim().replace(/\s+/g, " ");
  const sanitizedEmail = normalizeEmail(values.email);
  const sanitizedCountry = values.country.trim();
  const origin = resolveRequestOrigin(request.headers);
  const emailRedirectTo = `${origin}/auth/callback?next=/onboarding`;

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
    const { data, error } = await supabase.auth.signUp({
      email: sanitizedEmail,
      password: values.password,
      options: {
        emailRedirectTo,
        data: {
          full_name: sanitizedFullName,
          country: sanitizedCountry,
        },
      },
    });

    if (error) {
      if (isNetworkTransportError(error)) {
        return NextResponse.json(
          {
            delegateToBrowser: true,
            sanitized: {
              fullName: sanitizedFullName,
              email: sanitizedEmail,
              country: sanitizedCountry,
            },
            emailRedirectTo,
          },
          { status: 200, headers: { "Cache-Control": "no-store" } }
        );
      }

      const mapped = mapAuthErrorMessage(error.message, "register");
      if (mapped.isDuplicateEmail) {
        return NextResponse.json(
          {
            status: "validation-error",
            title: "Email Already Registered",
            message: mapped.message,
            fieldErrors: { email: mapped.message },
          },
          { status: 409, headers: { "Cache-Control": "no-store" } }
        );
      }

      return NextResponse.json(
        {
          status: mapped.isRateLimited ? "rate-limited" : "auth-error",
          title: "Registration Could Not Complete",
          message: mapped.message,
        },
        {
          status: mapped.isRateLimited ? 429 : 400,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    // Supabase GoTrue returns empty identities array when email already exists under enumeration protection
    if (
      data.user &&
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0
    ) {
      const dupMsg =
        "An account with this email address already exists. Please sign in or use Forgot password.";
      return NextResponse.json(
        {
          status: "validation-error",
          title: "Email Already Registered",
          message: dupMsg,
          fieldErrors: { email: dupMsg },
        },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    // If email verification is required (session is null or email_confirmed_at is null)
    if (!data.session || !data.user?.email_confirmed_at) {
      if (data.session) {
        await supabase.auth.signOut();
      }
      return NextResponse.json(
        {
          status: "verification-required",
          title: "Verify Your Email Address",
          email: sanitizedEmail,
          message:
            "Your learner account has been created. Please check your inbox and open the verification link to activate access.",
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      {
        status: "success",
        title: "Account Created",
        email: sanitizedEmail,
        redirectTo: "/onboarding",
        message: "Registration complete. Redirecting to onboarding...",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    if (isNetworkTransportError(err)) {
      return NextResponse.json(
        {
          delegateToBrowser: true,
          sanitized: {
            fullName: sanitizedFullName,
            email: sanitizedEmail,
            country: sanitizedCountry,
          },
          emailRedirectTo,
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      {
        status: "auth-error",
        message:
          "An unexpected error occurred during registration. Please try again.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
