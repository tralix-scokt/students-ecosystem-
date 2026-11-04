"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Crown,
  Loader2,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { PaystackPricingPlansSection } from "@/components/billing/PaystackUpgradeModal";
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import {
  formatNaira,
  useStudentSubscription,
  verifyPaystackPayment,
} from "@/lib/billing/billingService";
import { useStudentDashboardData } from "@/lib/dashboard/useStudentDashboardData";

export function UpgradePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, isRetrying, data, errorMessage, retry } =
    useStudentDashboardData();
  const { billing, refresh: refreshBilling } = useStudentSubscription();

  const [verifyingRef, setVerifyingRef] = useState<string | null>(null);
  const [verifyBanner, setVerifyBanner] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const autoVerifiedRef = useRef<string | null>(null);

  const callbackRef =
    searchParams.get("reference") || searchParams.get("trxref") || "";

  useEffect(() => {
    if (!callbackRef || autoVerifiedRef.current === callbackRef) return;
    autoVerifiedRef.current = callbackRef;
    setVerifyingRef(callbackRef);
    setVerifyBanner(null);

    verifyPaystackPayment(callbackRef)
      .then(async (res) => {
        if (res.ok && res.verified) {
          await refreshBilling();
          setVerifyBanner({
            tone: "success",
            text: `Payment verified (${callbackRef})! ${res.planLabel || "TRALIX Pro"} is now active${res.expiresAt ? ` until ${new Date(res.expiresAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}` : ""}.`,
          });
          router.replace("/dashboard/upgrade");
        } else {
          setVerifyBanner({
            tone: "error",
            text:
              res.error ||
              "We could not confirm this Paystack reference yet. If you paid by bank transfer, click Verify next to your reference below in a moment.",
          });
        }
      })
      .finally(() => {
        setVerifyingRef(null);
      });
  }, [callbackRef, refreshBilling, router]);

  const handleReverifyRow = async (reference: string) => {
    setVerifyingRef(reference);
    setVerifyBanner(null);
    try {
      const res = await verifyPaystackPayment(reference);
      if (res.ok && res.verified) {
        await refreshBilling();
        setVerifyBanner({
          tone: "success",
          text: `Payment ${reference} confirmed! ${res.planLabel || "TRALIX Pro"} is now active.`,
        });
      } else {
        setVerifyBanner({
          tone: "error",
          text: res.error || "Payment has not settled on Paystack yet.",
        });
      }
    } finally {
      setVerifyingRef(null);
    }
  };

  if (status === "loading") {
    return <DashboardSkeleton />;
  }

  if (status === "error" || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian-950 p-4">
        <DashboardErrorState
          message={errorMessage || "Unable to load subscription workspace."}
          isRetrying={isRetrying}
          onRetry={retry}
        />
      </div>
    );
  }

  const freeAiRemaining = Math.max(
    0,
    billing.settings.freeDailyAiMessages - billing.usageToday.aiMessagesUsed
  );
  const freePhotosRemaining = Math.max(
    0,
    billing.settings.freeDailyPhotoSnaps - billing.usageToday.aiPhotoSnapsUsed
  );

  return (
    <DashboardShell
      userProfile={data.userProfile}
      academicProfile={data.academicProfile}
      fallbackEmail={data.email}
      unreadNotificationCount={data.unreadNotificationCount}
      publishedCourses={data.publishedCourses}
      ongoingCourses={data.ongoingCourses}
    >
      <div className="mx-auto max-w-6xl space-y-6 pb-10">
        {/* Hero Header */}
        <section className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-slate-900/95 via-[#09162e] to-slate-950 p-6 sm:p-7 shadow-xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-cyan-200">
                <Crown className="h-3.5 w-3.5 text-amber-300" />
                TRALIX Pro • Paystack Naira Passes
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Study Without Daily Limits. Ace Your Exams.
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Choose a flexible Naira pass that matches your study calendar —{" "}
                <strong>{formatNaira(billing.settings.price7dNgn)}</strong> for 7
                days,{" "}
                <strong>{formatNaira(billing.settings.price30dNgn)}</strong>{" "}
                monthly, or{" "}
                <strong>{formatNaira(billing.settings.price90dNgn)}</strong> for
                90 days of uninterrupted JAMB, WAEC, NECO &amp; university mastery.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950/75 px-4 py-3.5 min-w-[230px]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Your Current Plan
              </p>
              <div className="mt-1 flex items-center gap-2">
                {billing.isPro ? (
                  <Crown className="h-4 w-4 text-amber-300" />
                ) : (
                  <Zap className="h-4 w-4 text-cyan-300" />
                )}
                <span className="text-sm font-bold text-white">
                  {billing.planLabel}
                </span>
              </div>
              {billing.isPro ? (
                <p className="mt-1 text-xs text-emerald-300">
                  {billing.isAdmin
                    ? "Unlimited Admin Access"
                    : billing.expiresAt
                      ? `${billing.daysRemaining} day${billing.daysRemaining === 1 ? "" : "s"} remaining (until ${new Date(billing.expiresAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })})`
                      : "Unlimited Pro Access Active"}
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-300">
                  Today remaining: <strong>{freeAiRemaining}</strong> AI msgs •{" "}
                  <strong>{freePhotosRemaining}</strong> Photo Snaps
                </p>
              )}
            </div>
          </div>

          {verifyingRef && (
            <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-cyan-400/35 bg-cyan-500/15 px-4 py-3 text-xs font-medium text-cyan-100">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              Verifying Paystack payment reference{" "}
              <code className="font-mono">{verifyingRef}</code>...
            </div>
          )}

          {verifyBanner && (
            <div
              role="status"
              className={`mt-4 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-xs font-medium ${
                verifyBanner.tone === "success"
                  ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                  : "border-amber-400/40 bg-amber-500/15 text-amber-100"
              }`}
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{verifyBanner.text}</span>
            </div>
          )}
        </section>

        {/* 3-Tier Paystack Plans */}
        <section aria-label="Paystack Subscription Plans">
          <PaystackPricingPlansSection
            settings={billing.settings}
            isPro={billing.isPro}
            isAdmin={billing.isAdmin}
            currentPlanLabel={billing.planLabel}
            expiresAt={billing.expiresAt}
            onVerifiedSuccess={() => {
              refreshBilling();
            }}
          />
        </section>

        {/* Free Starter vs TRALIX Pro Comparison */}
        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            <h2 className="text-base font-bold text-white">
              Free Starter vs. TRALIX Pro — What You Unlock
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="py-2.5 pr-4 font-semibold">Study Feature</th>
                  <th className="py-2.5 px-4 font-semibold">
                    Free Starter (₦0)
                  </th>
                  <th className="py-2.5 pl-4 font-semibold text-cyan-300">
                    TRALIX Pro (7d / 30d / 90d)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                <tr>
                  <td className="py-2.5 pr-4 font-medium">
                    24/7 TRALIX AI Classroom Tutor &amp; Diagrams
                  </td>
                  <td className="py-2.5 px-4 text-slate-400">
                    {billing.settings.freeDailyAiMessages} messages / day
                  </td>
                  <td className="py-2.5 pl-4 font-semibold text-emerald-300">
                    Unlimited daily tutoring &amp; whiteboard diagrams
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium">
                    Snap-and-Solve AI Photo Homework Vision
                  </td>
                  <td className="py-2.5 px-4 text-slate-400">
                    {billing.settings.freeDailyPhotoSnaps} photo snaps / day
                  </td>
                  <td className="py-2.5 pl-4 font-semibold text-emerald-300">
                    Unlimited photo homework &amp; diagram vision
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium">
                    JAMB, WAEC, NECO &amp; University CBT Simulator
                  </td>
                  <td className="py-2.5 px-4 text-slate-400">
                    Quick drills up to {billing.settings.freeMaxExamQuestions}{" "}
                    questions
                  </td>
                  <td className="py-2.5 pl-4 font-semibold text-emerald-300">
                    Full-length timed CBT mocks (up to 60 items) + Past Papers
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium">
                    Post-Exam AI Corrections &amp; 5-Day Revision Plan
                  </td>
                  <td className="py-2.5 px-4 text-slate-400">
                    Standard answer key only
                  </td>
                  <td className="py-2.5 pl-4 font-semibold text-emerald-300">
                    Full teacher step-by-step walkthroughs + AI 5-Day Plan
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium">
                    Structured Course Lessons &amp; Mastery Quizzes
                  </td>
                  <td className="py-2.5 px-4 text-slate-400">
                    Lesson 1 preview in every course
                  </td>
                  <td className="py-2.5 pl-4 font-semibold text-emerald-300">
                    Every chapter, lesson, worked example &amp; course quiz
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium">
                    Study Planner, Timetable, Notes &amp; Pomodoro Timer
                  </td>
                  <td className="py-2.5 px-4 text-emerald-300">
                    100% Free Forever
                  </td>
                  <td className="py-2.5 pl-4 font-semibold text-emerald-300">
                    Included
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Payment Receipts & Verification Ledger */}
        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-cyan-300" />
              <h2 className="text-base font-bold text-white">
                Your Paystack Receipts &amp; Transactions
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Verified server-side with Paystack
            </div>
          </div>

          {billing.recentTransactions.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">
              No Paystack transactions recorded on your account yet. Select a
              pass above whenever you are ready to unlock unlimited study.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 px-3">Pass</th>
                    <th className="py-2 px-3">Amount</th>
                    <th className="py-2 px-3">Reference</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 pl-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {billing.recentTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="py-2.5 pr-3 text-slate-400">
                        {new Date(tx.created_at).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-medium">
                        {tx.plan_code === "pass_7d"
                          ? "7-Day Cram Pass"
                          : tx.plan_code === "pass_30d"
                            ? "Monthly Pro (30d)"
                            : "90-Day Season Pass"}
                      </td>
                      <td className="py-2.5 px-3 font-semibold">
                        {formatNaira(tx.amount_ngn)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                        {tx.reference}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            tx.status === "success"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : tx.status === "pending"
                                ? "bg-amber-500/20 text-amber-200"
                                : "bg-rose-500/20 text-rose-300"
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        {tx.status === "pending" ? (
                          <button
                            type="button"
                            disabled={verifyingRef === tx.reference}
                            onClick={() => handleReverifyRow(tx.reference)}
                            className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/35 bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-50"
                          >
                            {verifyingRef === tx.reference ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                            Verify
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
