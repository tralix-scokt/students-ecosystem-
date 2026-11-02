"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
} from "lucide-react";
import { BOOK_COPY } from "@/data/ecosystemContent";
import { requestPasswordReset } from "@/lib/auth/authService";
import type { AuthActionResult } from "@/types/auth";

interface BookRecoveryLeftPageProps {
  isInteractive: boolean;
  recoveryEmailRef?: React.RefObject<HTMLInputElement | null>;
  onNavigateLogin: () => void;
}

export function BookRecoveryLeftPage({
  isInteractive,
  recoveryEmailRef,
  onNavigateLogin,
}: BookRecoveryLeftPageProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AuthActionResult | null>(null);

  const fieldErrors = result?.fieldErrors ?? {};

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isInteractive || isSubmitting) return;

    setIsSubmitting(true);
    setResult(null);
    try {
      const response = await requestPasswordReset({ email });
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
            {BOOK_COPY.recoveryLeft.chapter}
          </span>
          <span className="font-serif text-xs italic text-slate-400">
            Folio IB
          </span>
        </div>

        <h2 className="mt-5 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {BOOK_COPY.recoveryLeft.heading}
        </h2>
        <p className="mt-1.5 text-sm text-slate-300">
          {BOOK_COPY.recoveryLeft.supportingText}
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="recovery-email"
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
                ref={recoveryEmailRef}
                id="recovery-email"
                name="email"
                type="email"
                autoComplete="email"
                disabled={!isInteractive}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (result?.status === "validation-error") setResult(null);
                }}
                placeholder="learner@university.edu"
                aria-invalid={Boolean(fieldErrors.email)}
                className={`block min-h-[46px] w-full rounded-xl border bg-obsidian-950/80 py-2.5 pl-10 pr-4 text-base text-white placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 sm:text-sm ${
                  fieldErrors.email
                    ? "border-rose-400/70 focus:border-rose-400 focus:ring-rose-400/30"
                    : "border-slate-700/80 hover:border-slate-600 focus:border-electric-400 focus:ring-electric-400/30"
                }`}
              />
            </div>
            {fieldErrors.email && (
              <p
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

          {result?.status === "success" && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-xl border border-electric-400/35 bg-obsidian-950/90 p-3.5 text-xs leading-relaxed text-slate-200"
            >
              <div className="flex items-start gap-2.5">
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-electric-400"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-display font-semibold text-electric-300">
                    {result.title ?? "Check Your Inbox"}
                  </p>
                  <p className="mt-1 text-slate-300">{result.message}</p>
                </div>
              </div>
            </div>
          )}

          {result &&
            result.status !== "success" &&
            result.status !== "validation-error" && (
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
                    <p className="mt-0.5">{result.message}</p>
                  </div>
                </div>
              </div>
            )}

          <button
            type="submit"
            disabled={!isInteractive || isSubmitting}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-electric-400/70 bg-gradient-to-r from-electric-400 via-electric-500 to-aura-500 px-5 py-3 text-sm font-bold tracking-wide text-obsidian-950 shadow-cyan-glow transition-all hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-300 disabled:opacity-70"
          >
            {isSubmitting ? (
              <>
                <Loader2
                  className="h-4 w-4 animate-spin text-obsidian-950"
                  aria-hidden="true"
                />
                <span>Sending Reset Link...</span>
              </>
            ) : (
              <span>Send Password Reset Link</span>
            )}
          </button>
        </form>
      </div>

      <div className="mt-6 border-t border-slate-800/80 pt-4">
        <button
          type="button"
          disabled={!isInteractive}
          onClick={onNavigateLogin}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-700 bg-obsidian-950/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-200 transition-colors hover:border-electric-400/50 hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to Sign In</span>
        </button>

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
          <span>E-LEARNING ECOSYSTEM</span>
          <span className="font-serif italic">01B</span>
        </div>
      </div>
    </div>
  );
}
