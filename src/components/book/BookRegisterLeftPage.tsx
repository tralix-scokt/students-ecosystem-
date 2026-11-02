"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { COUNTRIES } from "@/data/countries";
import { BOOK_COPY } from "@/data/ecosystemContent";
import { registerLearner } from "@/lib/auth/authService";
import {
  evaluatePasswordRequirements,
  validateRegistrationInput,
} from "@/lib/validation/authValidation";
import type { AuthActionResult } from "@/types/auth";

interface BookRegisterLeftPageProps {
  isInteractive: boolean;
  nameInputRef?: React.RefObject<HTMLInputElement | null>;
  onNavigateLogin: () => void;
  onVerificationRequired: (registeredEmail: string) => void;
}

export function BookRegisterLeftPage({
  isInteractive,
  nameInputRef,
  onNavigateLogin,
  onVerificationRequired,
}: BookRegisterLeftPageProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AuthActionResult | null>(null);

  const fieldErrors = result?.fieldErrors ?? {};
  const pwCheck = evaluatePasswordRequirements(password);

  const clearErrorOnEdit = () => {
    if (result) setResult(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isInteractive || isSubmitting) return;

    const clientErrors = validateRegistrationInput({
      fullName,
      email,
      password,
      confirmPassword,
      country,
      acceptTerms,
    });
    if (Object.keys(clientErrors).length > 0) {
      setResult({
        status: "validation-error",
        title: "Review Registration Details",
        message: "Please resolve the highlighted validation errors.",
        fieldErrors: clientErrors,
      });
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await registerLearner({
        fullName,
        email,
        password,
        confirmPassword,
        country,
        acceptTerms,
      });

      if (response.status === "verification-required") {
        onVerificationRequired(response.email ?? email.trim().toLowerCase());
        return;
      }

      if (response.status === "success") {
        router.push(response.redirectTo || "/onboarding");
        router.refresh();
        return;
      }

      setResult(response);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-aura-300">
            {BOOK_COPY.registerLeft.chapter}
          </span>
          <span className="font-serif text-xs italic text-slate-400">
            Folio III
          </span>
        </div>

        <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-white sm:text-[26px]">
          {BOOK_COPY.registerLeft.heading}
        </h2>
        <p className="mt-1 text-sm text-slate-300">
          {BOOK_COPY.registerLeft.supportingText}
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-3">
          {/* Full Name */}
          <div>
            <label
              htmlFor="register-fullname"
              className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300"
            >
              Full name
            </label>
            <div className="relative mt-1">
              <User
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                ref={nameInputRef}
                id="register-fullname"
                name="fullName"
                type="text"
                autoComplete="name"
                disabled={!isInteractive}
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  clearErrorOnEdit();
                }}
                placeholder="Adaeze Okafor"
                aria-invalid={Boolean(fieldErrors.fullName)}
                className={`block min-h-[42px] w-full rounded-xl border bg-obsidian-950/80 py-2 pl-10 pr-4 text-base text-white placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 sm:text-sm ${
                  fieldErrors.fullName
                    ? "border-rose-400/70 focus:border-rose-400 focus:ring-rose-400/30"
                    : "border-slate-700/80 hover:border-slate-600 focus:border-electric-400 focus:ring-electric-400/30"
                }`}
              />
            </div>
            {fieldErrors.fullName && (
              <p
                role="alert"
                className="mt-1 flex items-center gap-1 text-xs text-rose-300"
              >
                <AlertCircle
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{fieldErrors.fullName}</span>
              </p>
            )}
          </div>

          {/* Email + Country Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="register-email"
                className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300"
              >
                Email address
              </label>
              <div className="relative mt-1">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  disabled={!isInteractive}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearErrorOnEdit();
                  }}
                  placeholder="learner@edu.org"
                  aria-invalid={Boolean(fieldErrors.email)}
                  className={`block min-h-[42px] w-full rounded-xl border bg-obsidian-950/80 py-2 pl-9 pr-3 text-base text-white placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 sm:text-sm ${
                    fieldErrors.email
                      ? "border-rose-400/70 focus:border-rose-400 focus:ring-rose-400/30"
                      : "border-slate-700/80 hover:border-slate-600 focus:border-electric-400 focus:ring-electric-400/30"
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p role="alert" className="mt-1 text-xs text-rose-300">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="register-country"
                className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300"
              >
                Country
              </label>
              <div className="relative mt-1">
                <Globe
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <select
                  id="register-country"
                  name="country"
                  autoComplete="country-name"
                  disabled={!isInteractive}
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    clearErrorOnEdit();
                  }}
                  aria-invalid={Boolean(fieldErrors.country)}
                  className={`block min-h-[42px] w-full rounded-xl border bg-obsidian-950/85 py-2 pl-9 pr-3 text-base transition-colors focus:outline-none focus:ring-2 sm:text-sm ${
                    country ? "text-white" : "text-slate-400"
                  } ${
                    fieldErrors.country
                      ? "border-rose-400/70 focus:border-rose-400 focus:ring-rose-400/30"
                      : "border-slate-700/80 hover:border-slate-600 focus:border-electric-400 focus:ring-electric-400/30"
                  }`}
                >
                  <option value="">Select country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c} className="bg-obsidian-950 text-white">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              {fieldErrors.country && (
                <p role="alert" className="mt-1 text-xs text-rose-300">
                  {fieldErrors.country}
                </p>
              )}
            </div>
          </div>

          {/* Password + Confirm Password */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="register-password"
                className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300"
              >
                Password
              </label>
              <div className="relative mt-1">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  disabled={!isInteractive}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearErrorOnEdit();
                  }}
                  placeholder="Strong password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  className={`block min-h-[42px] w-full rounded-xl border bg-obsidian-950/80 py-2 pl-9 pr-10 text-base text-white placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 sm:text-sm ${
                    fieldErrors.password
                      ? "border-rose-400/70 focus:border-rose-400 focus:ring-rose-400/30"
                      : "border-slate-700/80 hover:border-slate-600 focus:border-electric-400 focus:ring-electric-400/30"
                  }`}
                />
                <button
                  type="button"
                  disabled={!isInteractive}
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword
                      ? "Hide registration password"
                      : "Show registration password"
                  }
                  aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400"
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p role="alert" className="mt-1 text-xs text-rose-300">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="register-confirm-password"
                className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300"
              >
                Confirm password
              </label>
              <div className="relative mt-1">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  disabled={!isInteractive}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearErrorOnEdit();
                  }}
                  placeholder="Repeat password"
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  className={`block min-h-[42px] w-full rounded-xl border bg-obsidian-950/80 py-2 pl-9 pr-10 text-base text-white placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 sm:text-sm ${
                    fieldErrors.confirmPassword
                      ? "border-rose-400/70 focus:border-rose-400 focus:ring-rose-400/30"
                      : "border-slate-700/80 hover:border-slate-600 focus:border-electric-400 focus:ring-electric-400/30"
                  }`}
                />
                <button
                  type="button"
                  disabled={!isInteractive}
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={
                    showConfirmPassword
                      ? "Hide password confirmation"
                      : "Show password confirmation"
                  }
                  aria-pressed={showConfirmPassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p role="alert" className="mt-1 text-xs text-rose-300">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          {/* Live Password Security Requirements Meter */}
          <div className="rounded-xl border border-slate-800/85 bg-obsidian-950/55 p-2.5">
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((segment) => (
                <div
                  key={segment}
                  className={`h-1 rounded-full transition-colors ${
                    pwCheck.score >= segment
                      ? pwCheck.score <= 2
                        ? "bg-aura-400"
                        : "bg-electric-400"
                      : "bg-slate-800"
                  }`}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
              {[
                { ok: pwCheck.minLength, label: "8+ chars" },
                { ok: pwCheck.hasUppercase, label: "Uppercase" },
                { ok: pwCheck.hasLowercase, label: "Lowercase" },
                { ok: pwCheck.hasNumber, label: "Number" },
                { ok: pwCheck.hasSpecial, label: "Symbol" },
              ].map((item) => (
                <span
                  key={item.label}
                  className={`inline-flex items-center gap-1 ${
                    item.ok ? "text-electric-300" : "text-slate-500"
                  }`}
                >
                  <Check className="h-3 w-3" aria-hidden="true" />
                  <span>{item.label}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Terms of Service & Privacy Policy Acceptance */}
          <div>
            <label
              htmlFor="register-accept-terms"
              className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-slate-300 select-none"
            >
              <input
                id="register-accept-terms"
                name="acceptTerms"
                type="checkbox"
                disabled={!isInteractive}
                checked={acceptTerms}
                onChange={(e) => {
                  setAcceptTerms(e.target.checked);
                  clearErrorOnEdit();
                }}
                aria-invalid={Boolean(fieldErrors.acceptTerms)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-600 bg-obsidian-950 accent-[#00E5FF] focus:ring-2 focus:ring-electric-400"
              />
              <span>
                I agree to the{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-electric-300 underline hover:text-electric-400"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-electric-300 underline hover:text-electric-400"
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            {fieldErrors.acceptTerms && (
              <p role="alert" className="mt-1 text-xs text-rose-300">
                {fieldErrors.acceptTerms}
              </p>
            )}
          </div>

          {/* Server / Auth Error Banner */}
          {result && result.status !== "validation-error" && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-xl border border-rose-400/45 bg-rose-950/35 p-3 text-xs leading-relaxed text-rose-100"
            >
              <div className="flex items-start gap-2">
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-rose-400"
                  aria-hidden="true"
                />
                <div>
                  {result.title && (
                    <p className="font-display font-semibold text-rose-200">
                      {result.title}
                    </p>
                  )}
                  <p className="mt-0.5">{result.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Create Account Submit Button */}
          <button
            type="submit"
            disabled={!isInteractive || isSubmitting}
            className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-electric-400/70 bg-gradient-to-r from-aura-500 via-electric-500 to-electric-400 px-5 py-2.5 text-sm font-bold tracking-wide text-obsidian-950 shadow-cyan-glow transition-all duration-300 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-300 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-950 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? (
              <>
                <Loader2
                  className="h-4 w-4 animate-spin text-obsidian-950"
                  aria-hidden="true"
                />
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>
      </div>

      {/* Link Back to Sign In */}
      <div className="mt-4 border-t border-slate-800/80 pt-3">
        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
          <span className="text-xs text-slate-400">
            Already have an account?
          </span>
          <button
            type="button"
            disabled={!isInteractive}
            onClick={onNavigateLogin}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-electric-400/40 bg-electric-400/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-electric-300 transition-colors hover:border-electric-300 hover:bg-electric-400/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to Sign In</span>
          </button>
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
          <span>E-LEARNING ECOSYSTEM</span>
          <span className="font-serif italic">03</span>
        </div>
      </div>
    </div>
  );
}
