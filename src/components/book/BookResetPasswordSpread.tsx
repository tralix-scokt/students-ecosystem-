"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
} from "lucide-react";
import { BookEducationQuotePage } from "@/components/book/BookEducationQuotePage";
import { BOOK_COPY } from "@/data/ecosystemContent";
import { completePasswordReset } from "@/lib/auth/authService";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { evaluatePasswordRequirements } from "@/lib/validation/authValidation";
import type { AuthActionResult } from "@/types/auth";

export function BookResetPasswordSpread() {
  const [sessionState, setSessionState] = useState<
    "checking" | "ready" | "missing"
  >("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AuthActionResult | null>(null);

  const pwCheck = evaluatePasswordRequirements(password);
  const fieldErrors = result?.fieldErrors ?? {};

  useEffect(() => {
    let mounted = true;
    const supabase = createBrowserSupabaseClient();

    if (!supabase) {
      setSessionState("missing");
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setSessionState("ready");
      }
    });

    async function inspectRecoverySession() {
      if (!supabase) return;
      if (
        typeof window !== "undefined" &&
        window.location.hash.includes("access_token=")
      ) {
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error && mounted) {
            window.history.replaceState(null, "", window.location.pathname);
            setSessionState("ready");
            return;
          }
        }
      }

      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && mounted) {
            window.history.replaceState(null, "", window.location.pathname);
            setSessionState("ready");
            return;
          }
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSessionState(data.session ? "ready" : "missing");
    }

    inspectRecoverySession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || sessionState !== "ready") return;

    setIsSubmitting(true);
    setResult(null);
    try {
      const response = await completePasswordReset({
        password,
        confirmPassword,
      });
      setResult(response);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-x-clip bg-[#020510]">
      <div
        className="pointer-events-none fixed inset-0 ecosystem-grid-bg"
        aria-hidden="true"
      />
      <div
        className="ambient-glow-cyan pointer-events-none fixed left-1/2 top-1/3 h-[540px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-80"
        aria-hidden="true"
      />

      <header className="relative z-40 border-b border-white/[0.06] bg-obsidian-950/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/login"
            className="inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-slate-800 bg-obsidian-900/90 px-3.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-electric-400/50 hover:text-electric-300"
          >
            <ArrowLeft
              className="h-3.5 w-3.5 text-electric-400"
              aria-hidden="true"
            />
            <span>Return to Login</span>
          </Link>
          <span className="text-xs font-semibold text-slate-300">
            Students Ecosystem
          </span>
        </div>
      </header>

      <main
        id="main-content"
        className="relative z-10 flex flex-1 flex-col items-center justify-center px-3 py-8 xs:px-5 sm:px-6 sm:py-12"
      >
        <div className="w-full max-w-[1040px]">
          <div className="relative rounded-[22px] border border-electric-400/35 hardcover-surface p-2.5 sm:p-4 shadow-book-open">
            <div
              aria-hidden="true"
              className="paper-fore-edge-vertical pointer-events-none absolute inset-y-4 left-1.5 hidden w-2.5 rounded-l-sm book:block"
            />
            <div
              aria-hidden="true"
              className="paper-fore-edge-vertical pointer-events-none absolute inset-y-4 right-1.5 w-2.5 rounded-r-sm"
            />
            <div
              aria-hidden="true"
              className="paper-fore-edge-horizontal pointer-events-none absolute bottom-1.5 inset-x-5 h-2.5 rounded-b-sm"
            />

            <div className="relative grid grid-cols-1 book:grid-cols-2 book:min-h-[580px]">
              {/* LEFT PAGE: Educational Quote */}
              <section
                aria-label="Open book left page"
                className="book-interior-page-left relative z-10 flex flex-col justify-between rounded-t-2xl border border-slate-800/90 p-5 xs:p-6 sm:p-8 book:rounded-l-2xl book:rounded-tr-none book:pl-10 book:pr-9"
              >
                <BookEducationQuotePage mode="recovery" />
              </section>

              {/* CENTER SPINE CREASE */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-1/2 z-20 hidden w-9 -translate-x-1/2 items-center justify-center book:flex"
              >
                <div className="h-full w-full bg-gradient-to-r from-transparent via-[#01040c] to-transparent" />
                <div className="absolute inset-y-2 w-[2px] bg-gradient-to-b from-electric-400/50 via-fuchsia-400/60 to-electric-400/50" />
              </div>

              {/* RIGHT PAGE: Set & Confirm New Password */}
              <section
                aria-label="Set new password page"
                className="book-interior-page-right relative z-10 flex flex-col justify-between rounded-b-2xl border border-slate-800/90 p-5 xs:p-6 sm:p-8 book:rounded-r-2xl book:rounded-bl-none book:pl-9 book:pr-10"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <span className="font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-electric-400">
                      {BOOK_COPY.resetPasswordLeft.chapter}
                    </span>
                    <span className="font-serif text-xs italic text-slate-400">
                      Page II
                    </span>
                  </div>

                  <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    {BOOK_COPY.resetPasswordLeft.heading}
                  </h1>
                  <p className="mt-1.5 text-sm text-slate-300">
                    {BOOK_COPY.resetPasswordLeft.supportingText}
                  </p>

                  {sessionState === "checking" && (
                    <div className="mt-10 flex flex-col items-center justify-center py-8 text-center">
                      <Loader2
                        className="h-8 w-8 animate-spin text-electric-400"
                        aria-hidden="true"
                      />
                      <p className="mt-3 text-sm text-slate-300">
                        Validating your password reset link...
                      </p>
                    </div>
                  )}

                  {sessionState === "missing" && result?.status !== "success" && (
                    <div
                      role="alert"
                      className="mt-6 space-y-4 rounded-2xl border border-amber-400/40 bg-obsidian-950/85 p-5 text-xs leading-relaxed text-slate-200"
                    >
                      <div className="flex items-start gap-2.5">
                        <KeyRound
                          className="mt-0.5 h-5 w-5 shrink-0 text-amber-300"
                          aria-hidden="true"
                        />
                        <div>
                          <p className="font-display text-sm font-semibold text-amber-200">
                            Active Recovery Link Required
                          </p>
                          <p className="mt-1 text-slate-300">
                            This page requires an active password recovery link
                            from your email. Request a new password reset email
                            to set a new password.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 pt-1">
                        <Link
                          href="/forgot-password"
                          className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-electric-400/60 bg-gradient-to-r from-electric-400 to-aura-500 px-4 py-2 text-xs font-bold text-obsidian-950 shadow-cyan-glow"
                        >
                          <span>Request Reset Link</span>
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                        <Link
                          href="/login"
                          className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-700 bg-obsidian-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-electric-400/50"
                        >
                          Return to Login
                        </Link>
                      </div>
                    </div>
                  )}

                  {result?.status === "success" && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="mt-6 space-y-5 rounded-2xl border border-electric-400/40 bg-obsidian-950/90 p-5"
                    >
                      <div className="flex items-start gap-3">
                        <CheckCircle2
                          className="mt-0.5 h-6 w-6 shrink-0 text-electric-400"
                          aria-hidden="true"
                        />
                        <div>
                          <h2 className="font-display text-base font-bold text-white">
                            {result.title ?? "Password Updated Successfully"}
                          </h2>
                          <p className="mt-1 text-xs leading-relaxed text-slate-300">
                            {result.message}
                          </p>
                        </div>
                      </div>
                      <Link
                        href="/login"
                        className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-electric-400/70 bg-gradient-to-r from-electric-400 via-electric-500 to-aura-500 px-5 py-2.5 text-sm font-bold text-obsidian-950 shadow-cyan-glow"
                      >
                        <span>Sign In With New Password</span>
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </div>
                  )}

                  {sessionState === "ready" && result?.status !== "success" && (
                    <form
                      onSubmit={handleSubmit}
                      noValidate
                      className="mt-6 space-y-4"
                    >
                      <div>
                        <label
                          htmlFor="reset-new-password"
                          className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300"
                        >
                          New password
                        </label>
                        <div className="relative mt-1.5">
                          <Lock
                            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                            aria-hidden="true"
                          />
                          <input
                            id="reset-new-password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              if (result) setResult(null);
                            }}
                            placeholder="Enter strong new password"
                            aria-invalid={Boolean(fieldErrors.password)}
                            className={`block min-h-[46px] w-full rounded-xl border bg-obsidian-950/80 py-2.5 pl-10 pr-20 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 sm:text-sm ${
                              fieldErrors.password
                                ? "border-rose-400/70 focus:border-rose-400 focus:ring-rose-400/30"
                                : "border-slate-700/80 focus:border-electric-400 focus:ring-electric-400/30"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            aria-label={
                              showPassword
                                ? "Hide new password"
                                : "Show new password"
                            }
                            aria-pressed={showPassword}
                            className="absolute right-2 top-1/2 inline-flex min-h-[34px] -translate-y-1/2 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-slate-300 hover:bg-obsidian-800 hover:text-electric-300"
                          >
                            {showPassword ? (
                              <>
                                <EyeOff
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                <span>Hide</span>
                              </>
                            ) : (
                              <>
                                <Eye
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                <span>Show</span>
                              </>
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
                          htmlFor="reset-confirm-password"
                          className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300"
                        >
                          Confirm new password
                        </label>
                        <div className="relative mt-1.5">
                          <Lock
                            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                            aria-hidden="true"
                          />
                          <input
                            id="reset-confirm-password"
                            name="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => {
                              setConfirmPassword(e.target.value);
                              if (result) setResult(null);
                            }}
                            placeholder="Repeat new password"
                            aria-invalid={Boolean(fieldErrors.confirmPassword)}
                            className={`block min-h-[46px] w-full rounded-xl border bg-obsidian-950/80 py-2.5 pl-10 pr-20 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 sm:text-sm ${
                              fieldErrors.confirmPassword
                                ? "border-rose-400/70 focus:border-rose-400 focus:ring-rose-400/30"
                                : "border-slate-700/80 focus:border-electric-400 focus:ring-electric-400/30"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword((prev) => !prev)
                            }
                            aria-label={
                              showConfirmPassword
                                ? "Hide password confirmation"
                                : "Show password confirmation"
                            }
                            aria-pressed={showConfirmPassword}
                            className="absolute right-2 top-1/2 inline-flex min-h-[34px] -translate-y-1/2 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-slate-300 hover:bg-obsidian-800 hover:text-electric-300"
                          >
                            {showConfirmPassword ? (
                              <>
                                <EyeOff
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                <span>Hide</span>
                              </>
                            ) : (
                              <>
                                <Eye
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                <span>Show</span>
                              </>
                            )}
                          </button>
                        </div>
                        {fieldErrors.confirmPassword && (
                          <p role="alert" className="mt-1 text-xs text-rose-300">
                            {fieldErrors.confirmPassword}
                          </p>
                        )}
                      </div>

                      <div className="rounded-xl border border-slate-800/85 bg-obsidian-950/55 p-3">
                        <div className="grid grid-cols-4 gap-1.5">
                          {[1, 2, 3, 4].map((seg) => (
                            <div
                              key={seg}
                              className={`h-1 rounded-full ${
                                pwCheck.score >= seg
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

                      {result && result.status !== "validation-error" && (
                        <div
                          role="alert"
                          className="rounded-xl border border-rose-400/45 bg-rose-950/35 p-3 text-xs text-rose-100"
                        >
                          <div className="flex items-start gap-2">
                            <AlertCircle
                              className="mt-0.5 h-4 w-4 shrink-0 text-rose-400"
                              aria-hidden="true"
                            />
                            <span>{result.message}</span>
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-electric-400/70 bg-gradient-to-r from-electric-400 via-electric-500 to-aura-500 px-5 py-3 text-sm font-bold text-obsidian-950 shadow-cyan-glow transition-all hover:brightness-110 disabled:opacity-70"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2
                              className="h-4 w-4 animate-spin text-obsidian-950"
                              aria-hidden="true"
                            />
                            <span>Updating Password...</span>
                          </>
                        ) : (
                          <span>Update Password</span>
                        )}
                      </button>
                    </form>
                  )}
                </div>

                <div className="mt-6 border-t border-slate-800/80 pt-4">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <Link
                      href="/login"
                      className="font-medium text-electric-300 hover:underline"
                    >
                      &larr; Return to Login
                    </Link>
                    <span className="font-serif italic">02</span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
