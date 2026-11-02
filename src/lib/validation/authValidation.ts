import { isValidCountry } from "@/data/countries";
import type {
  LoginFormValues,
  PasswordRecoveryValues,
  PasswordRequirementCheck,
  ProfileUpdateValues,
  RegisterFormValues,
  ResetPasswordValues,
} from "@/types/auth";

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const FULL_NAME_REGEX = /^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]{1,119}$/u;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function evaluatePasswordRequirements(
  password: string
): PasswordRequirementCheck {
  const minLength = password.length >= 8 && password.length <= 128;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const allMet =
    minLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  if (!password) {
    return {
      minLength: false,
      hasUppercase: false,
      hasLowercase: false,
      hasNumber: false,
      hasSpecial: false,
      allMet: false,
      score: 0,
      label: "Enter a strong password",
    };
  }

  const passedCount = [
    minLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial,
  ].filter(Boolean).length;

  let score: 1 | 2 | 3 | 4 = 1;
  if (allMet && password.length >= 12) {
    score = 4;
  } else if (allMet) {
    score = 3;
  } else if (passedCount >= 3) {
    score = 2;
  }

  const labels: Record<1 | 2 | 3 | 4, string> = {
    1: "Weak — add uppercase, lowercase, number, and symbol (8+ chars)",
    2: "Almost ready — complete all password security requirements",
    3: "Strong — meets all security requirements",
    4: "Excellent — high-strength passphrase",
  };

  return {
    minLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial,
    allMet,
    score,
    label: labels[score],
  };
}

export function validateEmailFormat(email: string): string | null {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return "Please enter your email address.";
  }
  if (normalized.length > 254 || !EMAIL_REGEX.test(normalized)) {
    return "Please enter a valid email address.";
  }
  return null;
}

export function validateStrongPassword(password: string): string | null {
  if (!password) {
    return "Please enter a password.";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (password.length > 128) {
    return "Password must be 128 characters or fewer.";
  }
  const reqs = evaluatePasswordRequirements(password);
  if (!reqs.hasUppercase) {
    return "Password must include at least one uppercase letter.";
  }
  if (!reqs.hasLowercase) {
    return "Password must include at least one lowercase letter.";
  }
  if (!reqs.hasNumber) {
    return "Password must include at least one number.";
  }
  if (!reqs.hasSpecial) {
    return "Password must include at least one special character (e.g. !@#$%).";
  }
  return null;
}

export function validateRegistrationInput(
  values: Partial<RegisterFormValues>
): Record<string, string> {
  const errors: Record<string, string> = {};
  const fullName = (values.fullName ?? "").trim().replace(/\s+/g, " ");
  const email = normalizeEmail(values.email ?? "");
  const password = values.password ?? "";
  const confirmPassword = values.confirmPassword ?? "";
  const country = (values.country ?? "").trim();
  const acceptTerms = Boolean(values.acceptTerms);

  if (!fullName) {
    errors.fullName = "Please enter your full name.";
  } else if (fullName.length < 2 || fullName.length > 120) {
    errors.fullName = "Full name must be between 2 and 120 characters.";
  } else if (!FULL_NAME_REGEX.test(fullName)) {
    errors.fullName =
      "Full name may only contain letters, spaces, hyphens, or apostrophes.";
  }

  const emailError = validateEmailFormat(email);
  if (emailError) {
    errors.email = emailError;
  }

  if (!country) {
    errors.country = "Please select your country.";
  } else if (!isValidCountry(country)) {
    errors.country = "Please select a valid country from the list.";
  }

  const passwordError = validateStrongPassword(password);
  if (passwordError) {
    errors.password = passwordError;
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (!acceptTerms) {
    errors.acceptTerms =
      "You must accept the Terms of Service and Privacy Policy to register.";
  }

  return errors;
}

export function validateLoginInput(
  values: Partial<LoginFormValues>
): Record<string, string> {
  const errors: Record<string, string> = {};
  const emailError = validateEmailFormat(values.email ?? "");
  if (emailError) {
    errors.email = emailError;
  }

  const password = values.password ?? "";
  if (!password) {
    errors.password = "Please enter your password.";
  } else if (password.length > 128) {
    errors.password = "Invalid password length.";
  }

  return errors;
}

export function validateForgotPasswordInput(
  values: Partial<PasswordRecoveryValues>
): Record<string, string> {
  const errors: Record<string, string> = {};
  const emailError = validateEmailFormat(values.email ?? "");
  if (emailError) {
    errors.email = emailError;
  }
  return errors;
}

export function validateResetPasswordInput(
  values: Partial<ResetPasswordValues>
): Record<string, string> {
  const errors: Record<string, string> = {};
  const password = values.password ?? "";
  const confirmPassword = values.confirmPassword ?? "";

  const passwordError = validateStrongPassword(password);
  if (passwordError) {
    errors.password = passwordError;
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Please confirm your new password.";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export function validateProfileUpdateInput(
  values: Partial<ProfileUpdateValues>
): Record<string, string> {
  const errors: Record<string, string> = {};
  const fullName = (values.fullName ?? "").trim().replace(/\s+/g, " ");
  const country = (values.country ?? "").trim();

  if (!fullName || fullName.length < 2 || fullName.length > 120) {
    errors.fullName = "Full name must be between 2 and 120 characters.";
  } else if (!FULL_NAME_REGEX.test(fullName)) {
    errors.fullName =
      "Full name may only contain letters, spaces, hyphens, or apostrophes.";
  }

  if (!country || !isValidCountry(country)) {
    errors.country = "Please select a valid country.";
  }

  return errors;
}
