import {
  createBrowserSupabaseClient,
  setBrowserRememberPreference,
} from "@/lib/supabase/client";
import { mapAuthErrorMessage } from "@/lib/auth/errorMessages";
import { clearAllOfflineNotesCaches } from "@/lib/notes/notesService";
import {
  normalizeEmail,
  validateForgotPasswordInput,
  validateLoginInput,
  validateProfileUpdateInput,
  validateRegistrationInput,
  validateResetPasswordInput,
} from "@/lib/validation/authValidation";
import type {
  AuthActionResult,
  LoginFormValues,
  PasswordRecoveryValues,
  ProfileUpdateValues,
  RegisterFormValues,
  ResetPasswordValues,
  UserProfile,
} from "@/types/auth";

const NEUTRAL_RECOVERY_TEXT =
  "If an account is registered with that email address, we have sent a password reset link. Please check your inbox and spam folder.";

interface ServerAuthPayload extends Partial<AuthActionResult> {
  delegateToBrowser?: boolean;
  sanitized?: {
    fullName?: string;
    email?: string;
    country?: string;
    rememberMe?: boolean;
  };
  emailRedirectTo?: string;
  redirectTo?: string;
}

export async function registerLearner(
  values: RegisterFormValues
): Promise<AuthActionResult> {
  const clientFieldErrors = validateRegistrationInput(values);
  if (Object.keys(clientFieldErrors).length > 0) {
    return {
      status: "validation-error",
      title: "Review Registration Details",
      message: "Please resolve the highlighted validation errors.",
      fieldErrors: clientFieldErrors,
    };
  }

  let serverData: ServerAuthPayload;
  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    serverData = (await response.json()) as ServerAuthPayload;
  } catch {
    return {
      status: "auth-error",
      title: "Network Error",
      message: "Unable to reach the registration server. Please try again.",
    };
  }

  if (!serverData.delegateToBrowser) {
    return {
      status: serverData.status ?? "auth-error",
      title: serverData.title,
      message: serverData.message ?? "Registration could not be completed.",
      email: serverData.email,
      redirectTo: serverData.redirectTo,
      retryAfterSeconds: serverData.retryAfterSeconds,
      fieldErrors: serverData.fieldErrors,
    };
  }

  // Server validated & rate-limited; complete via @supabase/ssr browser client
  const supabase = createBrowserSupabaseClient(true);
  if (!supabase) {
    return {
      status: "unconfigured",
      title: "Supabase Configuration Required",
      message:
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured.",
    };
  }

  const sanitizedEmail =
    serverData.sanitized?.email ?? normalizeEmail(values.email);
  const sanitizedFullName =
    serverData.sanitized?.fullName ?? values.fullName.trim();
  const sanitizedCountry =
    serverData.sanitized?.country ?? values.country.trim();
  const emailRedirectTo =
    serverData.emailRedirectTo ??
    `${window.location.origin}/auth/callback?next=/onboarding`;

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
    const mapped = mapAuthErrorMessage(error.message, "register");
    if (mapped.isDuplicateEmail) {
      return {
        status: "validation-error",
        title: "Email Already Registered",
        message: mapped.message,
        fieldErrors: { email: mapped.message },
      };
    }
    return {
      status: mapped.isRateLimited ? "rate-limited" : "auth-error",
      title: "Registration Could Not Complete",
      message: mapped.message,
    };
  }

  if (
    data.user &&
    Array.isArray(data.user.identities) &&
    data.user.identities.length === 0
  ) {
    const dupMsg =
      "An account with this email address already exists. Please sign in or use Forgot password.";
    return {
      status: "validation-error",
      title: "Email Already Registered",
      message: dupMsg,
      fieldErrors: { email: dupMsg },
    };
  }

  if (!data.session || !data.user?.email_confirmed_at) {
    if (data.session) {
      await supabase.auth.signOut();
    }
    return {
      status: "verification-required",
      title: "Verify Your Email Address",
      email: sanitizedEmail,
      message:
        "Your learner account has been created. Please check your inbox and open the verification link to activate access.",
    };
  }

  return {
    status: "success",
    title: "Account Created",
    email: sanitizedEmail,
    redirectTo: "/onboarding",
    message: "Registration complete. Redirecting to onboarding...",
  };
}

export async function signInLearner(
  values: LoginFormValues
): Promise<AuthActionResult> {
  const clientFieldErrors = validateLoginInput(values);
  if (Object.keys(clientFieldErrors).length > 0) {
    return {
      status: "validation-error",
      title: "Check Your Details",
      message: "Please resolve the highlighted fields before signing in.",
      fieldErrors: clientFieldErrors,
    };
  }

  setBrowserRememberPreference(values.rememberMe);

  let serverData: ServerAuthPayload;
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    serverData = (await response.json()) as ServerAuthPayload;
  } catch {
    return {
      status: "auth-error",
      title: "Network Error",
      message: "Unable to reach the sign-in server. Please try again.",
    };
  }

  if (!serverData.delegateToBrowser) {
    return {
      status: serverData.status ?? "auth-error",
      title: serverData.title,
      message: serverData.message ?? "Unable to sign in.",
      email: serverData.email,
      redirectTo: serverData.redirectTo,
      retryAfterSeconds: serverData.retryAfterSeconds,
      fieldErrors: serverData.fieldErrors,
    };
  }

  const supabase = createBrowserSupabaseClient(values.rememberMe);
  if (!supabase) {
    return {
      status: "unconfigured",
      title: "Supabase Configuration Required",
      message:
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured.",
    };
  }

  const sanitizedEmail =
    serverData.sanitized?.email ?? normalizeEmail(values.email);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: sanitizedEmail,
    password: values.password,
  });

  if (error) {
    const mapped = mapAuthErrorMessage(error.message, "login");
    if (mapped.isUnverifiedEmail) {
      return {
        status: "unverified-email",
        title: "Email Verification Required",
        email: sanitizedEmail,
        message: mapped.message,
      };
    }

    return {
      status: mapped.isRateLimited ? "rate-limited" : "auth-error",
      title: mapped.isRateLimited
        ? "Too Many Attempts"
        : "Sign-In Unsuccessful",
      message: mapped.message,
    };
  }

  if (!data.user?.email_confirmed_at) {
    await supabase.auth.signOut();
    return {
      status: "unverified-email",
      title: "Email Verification Required",
      email: sanitizedEmail,
      message:
        "Please verify your email address using the link sent to your inbox before accessing protected student areas.",
    };
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
      redirectTo = "/onboarding";
    }
  }

  return {
    status: "success",
    title: "Signed In",
    email: sanitizedEmail,
    redirectTo,
    message: "Signed in successfully. Preparing your learning environment...",
  };
}

export async function requestPasswordReset(
  values: PasswordRecoveryValues
): Promise<AuthActionResult> {
  const fieldErrors = validateForgotPasswordInput(values);
  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "validation-error",
      title: "Valid Email Required",
      message: "Please enter a valid email address.",
      fieldErrors,
    };
  }

  let serverData: ServerAuthPayload;
  try {
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    serverData = (await response.json()) as ServerAuthPayload;
  } catch {
    return {
      status: "auth-error",
      title: "Network Error",
      message: "Unable to send recovery request right now. Please try again.",
    };
  }

  if (!serverData.delegateToBrowser) {
    return {
      status: serverData.status ?? "success",
      title: serverData.title ?? "Check Your Inbox",
      message: serverData.message ?? NEUTRAL_RECOVERY_TEXT,
      retryAfterSeconds: serverData.retryAfterSeconds,
      fieldErrors: serverData.fieldErrors,
    };
  }

  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return {
      status: "unconfigured",
      title: "Supabase Configuration Required",
      message:
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured.",
    };
  }

  const sanitizedEmail =
    serverData.sanitized?.email ?? normalizeEmail(values.email);
  const redirectTo =
    serverData.redirectTo ??
    `${window.location.origin}/auth/callback?next=/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
    redirectTo,
  });

  if (error) {
    const mapped = mapAuthErrorMessage(error.message, "reset");
    if (mapped.isRateLimited) {
      return {
        status: "rate-limited",
        title: "Too Many Requests",
        message: mapped.message,
      };
    }
    // Enumeration-safe: never reveal whether an email address is registered
  }

  return {
    status: "success",
    title: "Check Your Inbox",
    message: NEUTRAL_RECOVERY_TEXT,
  };
}

export async function completePasswordReset(
  values: ResetPasswordValues
): Promise<AuthActionResult> {
  const fieldErrors = validateResetPasswordInput(values);
  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "validation-error",
      title: "Check New Password",
      message: "Please resolve the highlighted password requirements.",
      fieldErrors,
    };
  }

  let serverData: ServerAuthPayload;
  try {
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    serverData = (await response.json()) as ServerAuthPayload;
  } catch {
    return {
      status: "auth-error",
      title: "Network Error",
      message: "Unable to reach the server. Please try again.",
    };
  }

  if (!serverData.delegateToBrowser) {
    return {
      status: serverData.status ?? "auth-error",
      title: serverData.title,
      message: serverData.message ?? "Could not update password.",
      redirectTo: serverData.redirectTo,
      retryAfterSeconds: serverData.retryAfterSeconds,
      fieldErrors: serverData.fieldErrors,
    };
  }

  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return {
      status: "unconfigured",
      title: "Supabase Configuration Required",
      message: "Supabase credentials are not configured.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: values.password,
  });

  if (error) {
    const mapped = mapAuthErrorMessage(error.message, "reset");
    return {
      status: mapped.isRateLimited ? "rate-limited" : "auth-error",
      title: "Could Not Update Password",
      message: mapped.message,
    };
  }

  await supabase.auth.signOut();
  await fetch("/api/auth/signout", { method: "POST" }).catch(() => {});

  return {
    status: "success",
    title: "Password Updated Successfully",
    redirectTo: "/login",
    message:
      "Your password has been updated securely. You can now sign in with your new password.",
  };
}

export async function resendVerificationEmail(
  email: string
): Promise<AuthActionResult> {
  let serverData: ServerAuthPayload;
  try {
    const response = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    serverData = (await response.json()) as ServerAuthPayload;
  } catch {
    return {
      status: "auth-error",
      message: "Unable to resend verification email right now.",
    };
  }

  if (!serverData.delegateToBrowser) {
    return {
      status: serverData.status ?? "success",
      title: serverData.title ?? "Verification Email Sent",
      message:
        serverData.message ??
        "If an unverified account exists for that email address, a fresh verification link has been sent.",
      retryAfterSeconds: serverData.retryAfterSeconds,
      fieldErrors: serverData.fieldErrors,
    };
  }

  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return {
      status: "unconfigured",
      message: "Supabase credentials are not configured.",
    };
  }

  const sanitizedEmail = serverData.sanitized?.email ?? normalizeEmail(email);
  const emailRedirectTo =
    serverData.emailRedirectTo ??
    `${window.location.origin}/auth/callback?next=/onboarding`;

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: sanitizedEmail,
    options: { emailRedirectTo },
  });

  if (error) {
    const mapped = mapAuthErrorMessage(error.message, "resend");
    if (mapped.isRateLimited) {
      return {
        status: "rate-limited",
        title: "Please Wait Before Resending",
        message: mapped.message,
      };
    }
  }

  return {
    status: "success",
    title: "Verification Email Sent",
    message:
      "If an unverified account exists for that email address, a fresh verification link has been sent.",
  };
}

export async function signOutLearner(): Promise<void> {
  clearAllOfflineNotesCaches();
  const supabase = createBrowserSupabaseClient();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // Continue clearing server cookies
    }
  }
  await fetch("/api/auth/signout", { method: "POST" }).catch(() => {});
}

export async function fetchAuthenticatedLearnerProfile(): Promise<{
  authenticated: boolean;
  emailVerified: boolean;
  email?: string;
  profile: UserProfile | null;
}> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return { authenticated: false, emailVerified: false, profile: null };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { authenticated: false, emailVerified: false, profile: null };
  }

  const user = userData.user;
  const emailVerified = Boolean(user.email_confirmed_at);
  if (!emailVerified) {
    return {
      authenticated: true,
      emailVerified: false,
      email: user.email,
      profile: null,
    };
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("id, full_name, email, country, role, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  return {
    authenticated: true,
    emailVerified: true,
    email: user.email,
    profile: (profileRow as UserProfile | null) ?? null,
  };
}

export async function updateAuthenticatedLearnerProfile(
  userId: string,
  values: ProfileUpdateValues
): Promise<{
  ok: boolean;
  message: string;
  profile?: UserProfile;
  fieldErrors?: Record<string, string>;
}> {
  const fieldErrors = validateProfileUpdateInput(values);
  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Please check your profile fields.",
      fieldErrors,
    };
  }

  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return { ok: false, message: "Supabase client is not configured." };
  }

  const fullName = values.fullName.trim().replace(/\s+/g, " ");
  const country = values.country.trim();

  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, country })
    .eq("id", userId)
    .select("id, full_name, email, country, role, created_at, updated_at")
    .single();

  if (error || !data) {
    return {
      ok: false,
      message: "Could not update your profile. Please try again.",
    };
  }

  return {
    ok: true,
    message: "Profile updated securely.",
    profile: data as UserProfile,
  };
}
