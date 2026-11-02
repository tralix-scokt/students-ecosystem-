"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  MailWarning,
  UserPlus,
} from "lucide-react";
import { BOOK_COPY } from "@/data/ecosystemContent";
import { signInLearner } from "@/lib/auth/authService";
import type { AuthActionResult } from "@/types/auth";

interface BookLoginLeftPageProps {
  isInteractive: boolean;
  emailInputRef?: React.RefObject<HTMLInputElement | null>;
  initialAuthError?: string;
  nextPath?: string;
  onNavigateRegister: () => void;
  onNavigateRecovery: () => void;
  onNavigateVerifyEmail: (email: string) => void;
}

export function BookLoginLeftPage({
  isInteractive,
  emailInputRef,
  initialAuthError,
  nextPath = "/onboarding",
  onNavigateRegister,
  onNavigateRecovery,
  onNavigateVerifyEmail,
}: BookLoginLeftPageProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AuthActionResult | null>(
    initialAuthError
      ? {
          status: "auth-error",
          title: "Authentication Notice",
          message: initialAuthError,
        }
      : null
  );

  const fieldErrors = result?.fieldErrors ?? {};

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isInteractive || isSubmitting) return;

    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await signInLearner({ email, password, rememberMe });
      if (response.status === "success") {
        const hasExplicitCustomNext =
          nextPath &&
          nextPath !== "/onboarding" &&
          nextPath.startsWith("/") &&
          !nextPath.startsWith("//");
        const target =
          response.redirectTo === "/admin"
            ? hasExplicitCustomNext
              ? nextPath
              : "/admin"
            : response.redirectTo === "/onboarding"
              ? "/onboarding"
              : hasExplicitCustomNext
                ? nextPath
                : response.redirectTo || "/onboarding";
        router.push(target);
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
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-electric-400">
            {BOOK_COPY.loginLeft.chapter}
          </span>
          <span className="font-serif text-xs italic text-slate-400">
            Page II
          </span>
        </div>

        <h2 className="mt-5 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {BOOK_COPY.loginLeft.heading}
        </h2>
        <p className="mt-1.5 text-sm text-slate-300 sm:text-base">
          {BOOK_COPY.loginLeft.supportingText}
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          {/* Email Address */}
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300"
            >
              Email address
            </label>
            <div className="relative mt-1.5">
              <Mail
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                ref={emailInputRef}
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                disabled={!isInteractive}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (result) setResult(null);
                }}
                placeholder="learner@university.edu"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={
                  fieldErrors.email ? "login-email-error" : undefined
                }
                className={`block min-h-[46px] w-full rounded-xl border bg-obsidian-950/80 py-2.5 pl-10 pr-4 text-base text-white placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 sm:text-sm ${
                  fieldErrors.email
                    ? "border-rose-400/70 focus:border-rose-400 focus:ring-rose-400/30"
                    : "border-slate-700/80 hover:border-slate-600 focus:border-electric-400 focus:ring-electric-400/30"
                }`}
              />
            </div>
            {fieldErrors.email && (
              <p
                id="login-email-error"
                role="alert"
                className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-300"
              >
                <AlertCircle
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{fieldErrors.email}</span>
              </p>
            )}
          </div>

          {/* Password + Show/Hide Toggle */}
          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300"
            >
              Password
            </label>
            <div className="relative mt-1.5">
              <Lock
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                disabled={!isInteractive}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (result) setResult(null);
                }}
                placeholder="Enter your password"
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={
                  fieldErrors.password ? "login-password-error" : undefined
                }
                className={`block min-h-[46px] w-full rounded-xl border bg-obsidian-950/80 py-2.5 pl-10 pr-24 text-base text-white placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 sm:text-sm ${
                  fieldErrors.password
                    ? "border-rose-400/70 focus:border-rose-400 focus:ring-rose-400/30"
                    : "border-slate-700/80 hover:border-slate-600 focus:border-electric-400 focus:ring-electric-400/30"
                }`}
              />
              <button
                type="button"
                disabled={!isInteractive}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-2 top-1/2 inline-flex min-h-[34px] -translate-y-1/2 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-slate-300 transition-colors hover:bg-obsidian-800 hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400"
              >
                {showPassword ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Show</span>
                  </>
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p
                id="login-password-error"
                role="alert"
                className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-300"
              >
                <AlertCircle
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{fieldErrors.password}</span>
              </p>
            )}
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <label
              htmlFor="login-remember"
              className="inline-flex min-h-[36px] cursor-pointer items-center gap-2.5 text-sm text-slate-300 select-none"
            >
              <input
                id="login-remember"
                name="rememberMe"
                type="checkbox"
                disabled={!isInteractive}
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-obsidian-950 text-electric-400 focus:ring-2 focus:ring-electric-400 focus:ring-offset-0 accent-[#00E5FF]"
              />
              <span>Remember me</span>
            </label>

            <button
              type="button"
              disabled={!isInteractive}
              onClick={onNavigateRecovery}
              className="min-h-[36px] rounded-md px-1 text-sm font-medium text-electric-300 transition-colors hover:text-electric-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400"
            >
              Forgot password?
            </button>
          </div>

          {/* Unverified Email Notice */}
          {result?.status === "unverified-email" && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-xl border border-amber-400/45 bg-obsidian-950/90 p-3.5 text-xs leading-relaxed text-slate-200"
            >
              <div className="flex items-start gap-2.5">
                <MailWarning
                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"
                  aria-hidden="true"
                />
                <div className="space-y-2">
                  <p className="font-display font-semibold text-amber-300">
                    {result.title ?? "Email Verification Required"}
                  </p>
                  <p className="text-slate-300">{result.message}</p>
                  <button
                    type="button"
                    onClick={() =>
                      onNavigateVerifyEmail(result.email || email.trim())
                    }
                    className="inline-flex items-center gap-1.5 font-semibold text-electric-300 underline hover:text-electric-400"
                  >
                    <span>Open Email Verification &amp; Resend Options</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Invalid Credentials / Rate Limit / Configuration Error */}
          {result &&
            result.status !== "validation-error" &&
            result.status !== "unverified-email" && (
              <div
                role="alert"
                aria-live="polite"
                className="rounded-xl border border-rose-400/45 bg-rose-950/35 p-3.5 text-xs leading-relaxed text-rose-100"
              >
                <div className="flex items-start gap-2.5">
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
                    <p className="mt-0.5 text-rose-100/95">{result.message}</p>
                  </div>
                </div>
              </div>
            )}

          {/* Sign In Primary Button */}
          <button
            type="submit"
            disabled={!isInteractive || isSubmitting}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-electric-400/70 bg-gradient-to-r from-electric-400 via-electric-500 to-aura-500 px-5 py-3 text-sm font-bold tracking-wide text-obsidian-950 shadow-cyan-glow transition-all duration-300 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-300 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-950 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? (
              <>
                <Loader2
                  className="h-4 w-4 animate-spin text-obsidian-950"
                  aria-hidden="true"
                />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>
      </div>

      {/* Create an Account Entry + Page Number */}
      <div className="mt-6 border-t border-slate-800/80 pt-4">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <span className="text-xs text-slate-400">New to the ecosystem?</span>
          <button
            type="button"
            disabled={!isInteractive}
            onClick={onNavigateRegister}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-aura-400/40 bg-aura-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-aura-300 transition-all hover:border-aura-300 hover:bg-aura-500/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-aura-400"
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Create an Account</span>
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
          <span>Students Ecosystem</span>
          <span className="font-serif italic">02</span>
        </div>
      </div>
    </div>
  );
}
