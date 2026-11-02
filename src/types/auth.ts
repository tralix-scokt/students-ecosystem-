export type BookSpreadMode = "login" | "register" | "recovery" | "verify-email";

export interface LoginFormValues {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterFormValues {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  country: string;
  acceptTerms: boolean;
}

export interface PasswordRecoveryValues {
  email: string;
}

export interface ResetPasswordValues {
  password: string;
  confirmPassword: string;
}

export interface ProfileUpdateValues {
  fullName: string;
  country: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  country: string;
  role: "student" | "educator" | "admin";
  created_at: string;
  updated_at: string;
}

export interface PasswordRequirementCheck {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  allMet: boolean;
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
}

export type AuthResultStatus =
  | "success"
  | "verification-required"
  | "unverified-email"
  | "validation-error"
  | "rate-limited"
  | "unconfigured"
  | "auth-error";

export interface AuthActionResult {
  status: AuthResultStatus;
  title?: string;
  message: string;
  email?: string;
  redirectTo?: string;
  retryAfterSeconds?: number;
  fieldErrors?: Record<string, string>;
}
