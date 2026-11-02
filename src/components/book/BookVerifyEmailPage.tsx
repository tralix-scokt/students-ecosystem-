"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MailCheck,
  RefreshCw,
} from "lucide-react";
import { BOOK_COPY } from "@/data/ecosystemContent";
import { resendVerificationEmail } from "@/lib/auth/authService";

interface BookVerifyEmailPageProps {
  isInteractive: boolean;
  email: string;
  onNavigateLogin: () => void;
}

export function BookVerifyEmailPage({
  isInteractive,
  email,
  onNavigateLogin,
}: BookVerifyEmailPageProps) {
  const [targetEmail, setTargetEmail] = useState(email);
  const [isResending, setIsResending] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const handleResend = async () => {
    if (!isInteractive || isResending) return;
    if (!targetEmail.trim()) {
      setFeedback({
        kind: "error",
        text: "Please enter the email address you registered with.",
      });
      return;
    }

    setIsResending(true);
    setFeedback(null);
    try {
      const response = await resendVerificationEmail(targetEmail);
      if (response.status === "success") {
        setFeedback({ kind: "success", text: response.message });
      } else {
        setFeedback({ kind: "error", text: response.message });
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-electric-400">
            {BOOK_COPY.verifyEmailLeft.chapter}
          </span>
          <span className="font-serif text-xs italic text-slate-400">
            Folio IIIB
          </span>
        </div>

        <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-electric-400/40 bg-electric-400/10 text-electric-400 shadow-cyan-glow">
          <MailCheck className="h-6 w-6" aria-hidden="true" />
        </div>

        <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {BOOK_COPY.verifyEmailLeft.heading}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
          {BOOK_COPY.verifyEmailLeft.supportingText}
        </p>

        <div className="mt-5 rounded-2xl border border-electric-400/30 bg-obsidian-950/80 p-4 text-xs leading-relaxed text-slate-200">
          <p>
            We dispatched a verification link to{" "}
            <strong className="font-semibold text-electric-300">
              {email || "your registered email address"}
            </strong>
            .
          </p>
          <p className="mt-2 text-slate-300">
            Open the message and click{" "}
            <span className="font-medium text-white">
              Confirm email address
            </span>{" "}
            to verify ownership. Unverified accounts cannot access protected
            student areas.
          </p>
        </div>

        {!email && (
          <div className="mt-4">
            <label
              htmlFor="verify-resend-email"
              className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300"
            >
              Registered email address
            </label>
            <input
              id="verify-resend-email"
              type="email"
              disabled={!isInteractive}
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              placeholder="learner@university.edu"
              className="mt-1.5 block min-h-[44px] w-full rounded-xl border border-slate-700/80 bg-obsidian-950/80 px-3.5 py-2 text-base text-white placeholder:text-slate-500 focus:border-electric-400 focus:outline-none focus:ring-2 focus:ring-electric-400/30 sm:text-sm"
            />
          </div>
        )}

        {feedback && (
          <div
            role={feedback.kind === "error" ? "alert" : "status"}
            aria-live="polite"
            className={`mt-4 flex items-start gap-2.5 rounded-xl border p-3 text-xs leading-relaxed ${
              feedback.kind === "success"
                ? "border-electric-400/35 bg-electric-400/10 text-slate-100"
                : "border-rose-400/45 bg-rose-950/40 text-rose-200"
            }`}
          >
            {feedback.kind === "success" ? (
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-electric-400"
                aria-hidden="true"
              />
            ) : (
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-rose-400"
                aria-hidden="true"
              />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        <div className="mt-5">
          <button
            type="button"
            disabled={!isInteractive || isResending}
            onClick={handleResend}
            className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-electric-400/50 bg-obsidian-900/90 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-electric-300 transition-colors hover:border-electric-300 hover:bg-electric-400/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 disabled:opacity-65"
          >
            {isResending ? (
              <>
                <Loader2
                  className="h-4 w-4 animate-spin text-electric-400"
                  aria-hidden="true"
                />
                <span>Sending Verification Email...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Resend Verification Email</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-6 border-t border-slate-800/80 pt-4">
        <button
          type="button"
          disabled={!isInteractive}
          onClick={onNavigateLogin}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-700 bg-obsidian-950/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-200 transition-colors hover:border-electric-400/50 hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Return to Sign In</span>
        </button>

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
          <span>E-LEARNING ECOSYSTEM</span>
          <span className="font-serif italic">03B</span>
        </div>
      </div>
    </div>
  );
}
