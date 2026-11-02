export const NEUTRAL_RECOVERY_MESSAGE =
  "If an account is registered with that email address, we have sent a password reset link. Please check your inbox and spam folder.";

export function sanitizeNextPath(rawNext: string | null): string {
  if (!rawNext) return "/onboarding";
  const trimmed = rawNext.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\")
  ) {
    return "/onboarding";
  }
  return trimmed;
}

export function mapAuthErrorMessage(
  rawMessage: string | undefined,
  context: "login" | "register" | "reset" | "resend"
): {
  isUnverifiedEmail?: boolean;
  isDuplicateEmail?: boolean;
  isRateLimited?: boolean;
  message: string;
} {
  const msg = (rawMessage ?? "").toLowerCase();

  if (
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("for security purposes, you can only request this")
  ) {
    return {
      isRateLimited: true,
      message:
        "Too many authentication requests in a short period. Please wait a moment and try again.",
    };
  }

  if (context === "login") {
    if (msg.includes("email not confirmed")) {
      return {
        isUnverifiedEmail: true,
        message:
          "Your email address has not been verified yet. Please open the verification link sent to your inbox before signing in.",
      };
    }

    if (
      msg.includes("invalid login credentials") ||
      msg.includes("invalid email or password") ||
      msg.includes("user not found")
    ) {
      return {
        message:
          "Invalid email address or password. Please check your credentials and try again.",
      };
    }
  }

  if (context === "register") {
    if (
      msg.includes("already registered") ||
      msg.includes("already been registered") ||
      msg.includes("already exists") ||
      msg.includes("duplicate")
    ) {
      return {
        isDuplicateEmail: true,
        message:
          "An account with this email address already exists. Please sign in or use Forgot password.",
      };
    }

    if (msg.includes("password")) {
      return {
        message:
          "Password does not meet security requirements. Use at least 8 characters with uppercase, lowercase, a number, and a symbol.",
      };
    }
  }

  if (context === "reset") {
    if (
      msg.includes("same password") ||
      msg.includes("different from the old password")
    ) {
      return {
        message:
          "Your new password must be different from your previous password.",
      };
    }
    if (
      msg.includes("auth session missing") ||
      msg.includes("jwt expired") ||
      msg.includes("invalid claim")
    ) {
      return {
        message:
          "Your password reset link has expired or is no longer active. Please request a new reset link.",
      };
    }
  }

  return {
    message:
      "We could not complete your request right now. Please check your connection and try again.",
  };
}
