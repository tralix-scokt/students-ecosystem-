"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Check,
  CreditCard,
  Crown,
  ExternalLink,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import {
  buildPaystackPlanCatalog,
  DEFAULT_BILLING_SETTINGS,
  formatNaira,
  initializePaystackCheckout,
  type BillingPlanSettings,
  type PaidPlanCode,
  verifyPaystackPayment,
} from "@/lib/billing/billingService";

interface PaystackPricingGridProps {
  settings?: BillingPlanSettings;
  isPro?: boolean;
  isAdmin?: boolean;
  currentPlanLabel?: string;
  expiresAt?: string | null;
  callbackPath?: string;
  onVerifiedSuccess?: (info: { planLabel: string; expiresAt: string }) => void;
}

export function PaystackPricingPlansSection({
  settings = DEFAULT_BILLING_SETTINGS,
  isPro = false,
  isAdmin = false,
  currentPlanLabel,
  expiresAt,
  callbackPath = "/dashboard/upgrade",
  onVerifiedSuccess,
}: PaystackPricingGridProps) {
  const plans = buildPaystackPlanCatalog(settings);
  const [selectedPlan, setSelectedPlan] = useState<PaidPlanCode>("pass_30d");
  const [initializingPlan, setInitializingPlan] =
    useState<PaidPlanCode | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<{
    reference: string;
    authorizationUrl: string;
    planLabel: string;
    amountNgn: number;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [gatewaySetupNotice, setGatewaySetupNotice] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const handleCheckout = async (planCode: PaidPlanCode) => {
    setSelectedPlan(planCode);
    setErrorMsg(null);
    setGatewaySetupNotice(false);
    setSuccessBanner(null);
    setInitializingPlan(planCode);

    try {
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : "https://students-ecosystem.vercel.app";
      const callbackUrl = `${origin}${callbackPath.startsWith("/") ? callbackPath : `/${callbackPath}`}`;

      const res = await initializePaystackCheckout({
        planCode,
        callbackUrl,
      });

      if (!res.ok || !res.authorizationUrl || !res.reference) {
        if (res.code === "GATEWAY_NOT_CONFIGURED") {
          setGatewaySetupNotice(true);
        }
        setErrorMsg(
          res.error ||
            "Could not start Paystack checkout right now. Please try again."
        );
        return;
      }

      const isEmbeddedIframe =
        typeof window !== "undefined" && window.self !== window.top;

      if (isEmbeddedIframe) {
        setPendingCheckout({
          reference: res.reference,
          authorizationUrl: res.authorizationUrl,
          planLabel: res.planLabel || "TRALIX Pro",
          amountNgn: Number(res.amountNgn || 0),
        });
        window.open(res.authorizationUrl, "_blank", "noopener,noreferrer");
      } else {
        window.location.assign(res.authorizationUrl);
      }
    } finally {
      setInitializingPlan(null);
    }
  };

  const handleManualVerify = async () => {
    if (!pendingCheckout) return;
    setVerifying(true);
    setErrorMsg(null);
    try {
      const res = await verifyPaystackPayment(pendingCheckout.reference);
      if (!res.ok || !res.verified) {
        setErrorMsg(
          res.error ||
            "Payment not confirmed yet. Complete checkout in the Paystack tab, then click Verify Payment."
        );
        return;
      }
      const label = res.planLabel || pendingCheckout.planLabel;
      const exp = res.expiresAt || new Date().toISOString();
      setSuccessBanner(
        `${label} activated! Full TRALIX Pro access unlocked until ${new Date(
          exp
        ).toLocaleDateString("en-NG", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}.`
      );
      setPendingCheckout(null);
      onVerifiedSuccess?.({ planLabel: label, expiresAt: exp });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-5">
      {isPro && currentPlanLabel && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-emerald-300 shrink-0" />
            <span>
              Active Plan: <strong>{currentPlanLabel}</strong>
              {expiresAt
                ? ` • Valid until ${new Date(expiresAt).toLocaleDateString(
                    "en-NG",
                    { day: "numeric", month: "short", year: "numeric" }
                  )}`
                : ""}
            </span>
          </div>
          <span className="text-[11px] text-emerald-200/90">
            Early renewal stacks extra days onto your current expiry date
          </span>
        </div>
      )}

      {successBanner && (
        <div
          role="status"
          className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-100"
        >
          {successBanner}
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-xs text-amber-100 space-y-2"
        >
          <p>{errorMsg}</p>
          {gatewaySetupNotice && isAdmin && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/40 bg-amber-400/15 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-400/25"
            >
              Open Admin Portal (/admin) to Paste Paystack Secret Key
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}

      {pendingCheckout && (
        <div className="rounded-xl border border-cyan-400/35 bg-cyan-500/10 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-200">
                Paystack Checkout Opened ({formatNaira(pendingCheckout.amountNgn)})
              </p>
              <p className="text-xs text-slate-300 mt-0.5">
                Complete your payment for <strong>{pendingCheckout.planLabel}</strong>{" "}
                (Ref: <code className="text-cyan-200">{pendingCheckout.reference}</code>),
                then click Verify below to unlock Pro immediately.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={pendingCheckout.authorizationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
              >
                Re-open Paystack
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                onClick={handleManualVerify}
                disabled={verifying}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-60"
              >
                {verifying ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                I&apos;ve Paid — Verify Now
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const isFeatured = plan.code === "pass_30d";
          const isSelected = selectedPlan === plan.code;
          const isBusy = initializingPlan === plan.code;

          return (
            <div
              key={plan.code}
              onClick={() => setSelectedPlan(plan.code)}
              className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all cursor-pointer ${
                isFeatured
                  ? "border-cyan-400/55 bg-gradient-to-b from-cyan-500/[0.14] via-blue-600/[0.08] to-slate-950/85 shadow-[0_14px_38px_rgba(6,182,212,0.16)]"
                  : isSelected
                    ? "border-blue-400/45 bg-slate-900/80"
                    : "border-white/10 bg-slate-900/55 hover:border-white/20"
              }`}
            >
              {plan.badge && (
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      isFeatured
                        ? "border border-cyan-300/45 bg-cyan-400/20 text-cyan-100"
                        : "border border-violet-300/40 bg-violet-500/20 text-violet-100"
                    }`}
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    {plan.badge}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">
                    ~{formatNaira(plan.dailyEquivalentNgn)}/day
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-base font-bold text-white">{plan.name}</h3>
                  {!plan.badge && (
                    <span className="text-[11px] text-slate-400">
                      ~{formatNaira(plan.dailyEquivalentNgn)}/day
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs font-medium text-cyan-300/90">
                  {plan.durationLabel}
                </p>

                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold tracking-tight text-white">
                    {formatNaira(plan.priceNgn)}
                  </span>
                  <span className="text-xs text-slate-400">
                    one-time • no auto-debit trap
                  </span>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  {plan.tagline}
                </p>

                <ul className="mt-4 space-y-2 border-t border-white/10 pt-3.5">
                  {plan.highlights.map((feat) => (
                    <li
                      key={feat}
                      className="flex items-start gap-2 text-xs text-slate-200"
                    >
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                disabled={initializingPlan !== null}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCheckout(plan.code);
                }}
                className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold transition-all disabled:opacity-60 ${
                  isFeatured
                    ? "bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 text-slate-950 shadow-lg shadow-cyan-500/20 hover:brightness-110"
                    : "border border-cyan-400/35 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25"
                }`}
              >
                {isBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting to Paystack...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    {isPro
                      ? `Extend +${plan.durationDays} Days (${formatNaira(plan.priceNgn)})`
                      : `Pay ${formatNaira(plan.priceNgn)} with Paystack`}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-[11px] text-slate-300">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>
            Secured by <strong className="text-white">Paystack</strong> (PCI-DSS
            Level 1) • Instant activation on verification
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
          <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5">
            Card (Verve / Visa / Mastercard)
          </span>
          <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5">
            Bank Transfer
          </span>
          <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5">
            USSD
          </span>
          <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5">
            OPay / PalmPay / QR
          </span>
        </div>
      </div>
    </div>
  );
}

interface PaystackUpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reasonTitle?: string;
  reasonDescription?: string;
  settings?: BillingPlanSettings;
  isPro?: boolean;
  isAdmin?: boolean;
  onUpgraded?: () => void;
}

export function PaystackUpgradeModal({
  open,
  onClose,
  reasonTitle = "Unlock Unlimited TRALIX Pro Access",
  reasonDescription = "Upgrade instantly with Paystack to unlock unlimited 24/7 AI Tutoring, Snap-and-Solve Photo Vision, full-length JAMB/WAEC/NECO CBT simulations, and every course chapter.",
  settings = DEFAULT_BILLING_SETTINGS,
  isPro = false,
  isAdmin = false,
  onUpgraded,
}: PaystackUpgradeModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-5 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={reasonTitle}
    >
      <div className="relative my-auto w-full max-w-4xl rounded-2xl border border-cyan-400/25 bg-[#071022] p-5 sm:p-7 shadow-[0_24px_80px_rgba(0,0,0,0.75)] max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-500/15 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-200">
              <Zap className="h-3 w-3 text-amber-300" />
              TRALIX Pro Study Pass
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
              <Lock className="h-4 w-4 text-cyan-300 shrink-0" />
              {reasonTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {reasonDescription}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close upgrade modal"
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5">
          <PaystackPricingPlansSection
            settings={settings}
            isPro={isPro}
            isAdmin={isAdmin}
            onVerifiedSuccess={() => {
              onUpgraded?.();
            }}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>
            Free Starter resets daily ({settings.freeDailyAiMessages} AI messages
            + {settings.freeDailyPhotoSnaps} Photo Snaps/day + Lesson 1 &amp;{" "}
            {settings.freeMaxExamQuestions}-question drills free).
          </span>
          <Link
            href="/dashboard/upgrade"
            onClick={onClose}
            className="font-semibold text-cyan-300 hover:text-cyan-200 underline underline-offset-4"
          >
            View Full Plan Comparison &amp; Payment Receipts →
          </Link>
        </div>
      </div>
    </div>
  );
}
