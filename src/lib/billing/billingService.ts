"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export type PaidPlanCode = "pass_7d" | "pass_30d" | "pass_90d";
export type SubscriptionPlanCode = "free" | PaidPlanCode | "admin_vip";

export interface BillingPlanSettings {
  paywallEnabled: boolean;
  freeDailyAiMessages: number;
  freeDailyPhotoSnaps: number;
  freeMaxExamQuestions: number;
  price7dNgn: number;
  price30dNgn: number;
  price90dNgn: number;
}

export interface PaymentTransactionItem {
  id: string;
  plan_code: PaidPlanCode;
  amount_ngn: number;
  currency: string;
  reference: string;
  status: "pending" | "success" | "failed" | "abandoned";
  channel: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface StudentBillingStatus {
  ok: boolean;
  isPro: boolean;
  isAdmin: boolean;
  planCode: SubscriptionPlanCode;
  planLabel: string;
  expiresAt: string | null;
  daysRemaining: number;
  gatewayReady: boolean;
  gatewayMode: "live" | "test" | "unconfigured";
  settings: BillingPlanSettings;
  usageToday: {
    aiMessagesUsed: number;
    aiPhotoSnapsUsed: number;
  };
  recentTransactions: PaymentTransactionItem[];
}

export interface PaystackPlanOption {
  code: PaidPlanCode;
  name: string;
  badge?: string;
  durationLabel: string;
  durationDays: number;
  priceNgn: number;
  dailyEquivalentNgn: number;
  tagline: string;
  highlights: string[];
}

export const DEFAULT_BILLING_SETTINGS: BillingPlanSettings = {
  paywallEnabled: true,
  freeDailyAiMessages: 6,
  freeDailyPhotoSnaps: 2,
  freeMaxExamQuestions: 10,
  price7dNgn: 2000,
  price30dNgn: 3500,
  price90dNgn: 10000,
};

export const DEFAULT_STUDENT_BILLING_STATUS: StudentBillingStatus = {
  ok: true,
  isPro: false,
  isAdmin: false,
  planCode: "free",
  planLabel: "Free Starter",
  expiresAt: null,
  daysRemaining: 0,
  gatewayReady: false,
  gatewayMode: "unconfigured",
  settings: DEFAULT_BILLING_SETTINGS,
  usageToday: {
    aiMessagesUsed: 0,
    aiPhotoSnapsUsed: 0,
  },
  recentTransactions: [],
};

export function formatNaira(amountNgn: number): string {
  return `₦${Math.round(Number(amountNgn) || 0).toLocaleString("en-NG")}`;
}

export function buildPaystackPlanCatalog(
  settings: BillingPlanSettings = DEFAULT_BILLING_SETTINGS
): PaystackPlanOption[] {
  return [
    {
      code: "pass_7d",
      name: "7-Day Cram Pass",
      durationLabel: "7 Days Full Access",
      durationDays: 7,
      priceNgn: settings.price7dNgn,
      dailyEquivalentNgn: Math.round(settings.price7dNgn / 7),
      tagline: "Built for test week, mid-semesters & urgent revision sprints.",
      highlights: [
        "Unlimited 24/7 TRALIX AI Tutor & Whiteboard Diagrams",
        "Unlimited Snap-and-Solve AI Photo Homework Vision",
        "Full-length JAMB, WAEC, NECO & University CBT Mocks (up to 60 items)",
        "Unlock all Course Chapters, Quizzes & AI Exam Corrections",
      ],
    },
    {
      code: "pass_30d",
      name: "Monthly Pro",
      badge: "MOST POPULAR",
      durationLabel: "30 Days Full Access",
      durationDays: 30,
      priceNgn: settings.price30dNgn,
      dailyEquivalentNgn: Math.round(settings.price30dNgn / 30),
      tagline: "Best everyday value — just ~₦117/day for complete mastery.",
      highlights: [
        "Everything in 7-Day Cram Pass for 30 full days",
        "Unlimited AI Photo Vision + Live Current-Facts Grounding",
        "Unlimited Past-Paper CBT Simulations (1978–Present)",
        "Personalized 5-Day AI Revision Plans & Weak-Topic Coaching",
      ],
    },
    {
      code: "pass_90d",
      name: "90-Day Exam Season Pass",
      badge: "BEST SEASON VALUE",
      durationLabel: "90 Days Full Access",
      durationDays: 90,
      priceNgn: settings.price90dNgn,
      dailyEquivalentNgn: Math.round(settings.price90dNgn / 90),
      tagline: "Save ₦500 vs 3 monthly passes — covers your entire UTME / WASSCE / Semester!",
      highlights: [
        "90 uninterrupted days of unlimited TRALIX Pro access",
        "Full JAMB UTME, WAEC, NECO & University Semester prep",
        "Unlimited AI Tutor, Photo Vision, Diagrams & Course Modules",
        "One single Paystack payment (Card, Transfer, USSD, OPay/PalmPay)",
      ],
    },
  ];
}

const BILLING_REFRESH_EVENT = "tralix:billing-updated";

export function notifyBillingStatusUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(BILLING_REFRESH_EVENT));
  }
}

export async function invokePaystackBillingApi<
  T = Record<string, unknown>,
>(payload: Record<string, unknown>): Promise<T> {
  const supabase = createBrowserSupabaseClient();
  let accessToken = "";

  if (supabase?.auth && typeof supabase.auth.getSession === "function") {
    try {
      const { data } = await supabase.auth.getSession();
      accessToken = data?.session?.access_token || "";
    } catch {
      accessToken = "";
    }
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const res = await fetch("/api/billing/paystack", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const json = (await res.json()) as T & { transportFallback?: boolean };
    if (!json?.transportFallback) {
      return json;
    }
  } catch {
    // Proceed to direct Supabase Edge Function invocation fallback
  }

  if (
    supabase?.functions &&
    typeof supabase.functions.invoke === "function" &&
    accessToken
  ) {
    try {
      const { data, error } = await supabase.functions.invoke(
        "paystack-billing",
        {
          body: payload,
        }
      );
      if (error) {
        const errWithCtx = error as unknown as {
          message?: string;
          context?: { json?: () => Promise<Record<string, unknown>> };
        };
        if (errWithCtx?.context && typeof errWithCtx.context.json === "function") {
          const parsed = await errWithCtx.context.json().catch(() => null);
          if (parsed) return parsed as T;
        }
        return {
          ok: false,
          error: errWithCtx?.message || "Billing service request failed.",
        } as unknown as T;
      }
      if (data && typeof data === "object") {
        return data as T;
      }
    } catch {
      // Fall through
    }
  }

  return {
    ok: false,
    error: "Billing service is temporarily unreachable.",
  } as unknown as T;
}

export async function fetchStudentBillingStatus(): Promise<StudentBillingStatus> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase?.auth || typeof supabase.auth.getSession !== "function") {
    return DEFAULT_STUDENT_BILLING_STATUS;
  }

  try {
    const { data } = await supabase.auth.getSession();
    if (!data?.session?.access_token) {
      return DEFAULT_STUDENT_BILLING_STATUS;
    }
  } catch {
    return DEFAULT_STUDENT_BILLING_STATUS;
  }

  const res = await invokePaystackBillingApi<Partial<StudentBillingStatus>>({
    action: "status",
  });

  if (!res?.ok) {
    return DEFAULT_STUDENT_BILLING_STATUS;
  }

  return {
    ok: true,
    isPro: Boolean(res.isPro),
    isAdmin: Boolean(res.isAdmin),
    planCode: (res.planCode as SubscriptionPlanCode) || "free",
    planLabel: res.planLabel || "Free Starter",
    expiresAt: res.expiresAt ?? null,
    daysRemaining: Number(res.daysRemaining || 0),
    gatewayReady: Boolean(res.gatewayReady),
    gatewayMode: res.gatewayMode || "unconfigured",
    settings: {
      ...DEFAULT_BILLING_SETTINGS,
      ...(res.settings || {}),
    },
    usageToday: {
      aiMessagesUsed: Number(res.usageToday?.aiMessagesUsed || 0),
      aiPhotoSnapsUsed: Number(res.usageToday?.aiPhotoSnapsUsed || 0),
    },
    recentTransactions: Array.isArray(res.recentTransactions)
      ? res.recentTransactions
      : [],
  };
}

export async function initializePaystackCheckout(params: {
  planCode: PaidPlanCode;
  callbackUrl?: string;
}): Promise<{
  ok: boolean;
  code?: string;
  error?: string;
  authorizationUrl?: string;
  accessCode?: string;
  reference?: string;
  amountNgn?: number;
  planLabel?: string;
}> {
  const defaultCallback =
    typeof window !== "undefined"
      ? `${window.location.origin}/dashboard/upgrade`
      : "https://students-ecosystem.vercel.app/dashboard/upgrade";

  return invokePaystackBillingApi({
    action: "initialize",
    planCode: params.planCode,
    callbackUrl: params.callbackUrl || defaultCallback,
  });
}

export async function verifyPaystackPayment(reference: string): Promise<{
  ok: boolean;
  verified?: boolean;
  isPro?: boolean;
  planCode?: PaidPlanCode;
  planLabel?: string;
  expiresAt?: string;
  paymentStatus?: string;
  error?: string;
}> {
  const res = await invokePaystackBillingApi<{
    ok: boolean;
    verified?: boolean;
    isPro?: boolean;
    planCode?: PaidPlanCode;
    planLabel?: string;
    expiresAt?: string;
    paymentStatus?: string;
    error?: string;
  }>({
    action: "verify",
    reference,
  });

  if (res?.ok && res?.verified) {
    notifyBillingStatusUpdated();
  }
  return res;
}

export interface AdminBillingOverview {
  ok: boolean;
  error?: string;
  gateway?: {
    configured: boolean;
    mode: "live" | "test" | "unconfigured";
    source: "env" | "vault" | "none";
    maskedKey: string;
    webhookUrl: string;
  };
  settings?: BillingPlanSettings;
  metrics?: {
    totalRevenueNgn: number;
    revenue30dNgn: number;
    successfulPaymentsCount: number;
    activeProSubscribersCount: number;
  };
  activeSubscriptions?: Array<{
    id: string;
    user_id: string;
    plan_code: string;
    status: string;
    starts_at: string;
    expires_at: string;
    source: string;
    last_payment_reference: string | null;
  }>;
  recentTransactions?: Array<{
    id: string;
    user_id: string;
    email: string;
    plan_code: string;
    amount_ngn: number;
    currency: string;
    reference: string;
    status: string;
    channel: string | null;
    paid_at: string | null;
    created_at: string;
  }>;
}

export async function fetchAdminBillingOverview(): Promise<AdminBillingOverview> {
  return invokePaystackBillingApi<AdminBillingOverview>({
    action: "admin_overview",
  });
}

export async function saveAdminBillingConfig(params: {
  secretKey?: string;
  paywallEnabled: boolean;
  price7dNgn: number;
  price30dNgn: number;
  price90dNgn: number;
  freeDailyAiMessages: number;
  freeDailyPhotoSnaps: number;
  freeMaxExamQuestions: number;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await invokePaystackBillingApi<{ ok: boolean; error?: string }>({
    action: "admin_save_config",
    ...params,
  });
  if (res.ok) {
    notifyBillingStatusUpdated();
  }
  return res;
}

export async function adminGrantOrRevokePass(params: {
  targetUserId: string;
  planCode: PaidPlanCode | "revoke";
}): Promise<{ ok: boolean; expiresAt?: string; error?: string }> {
  const res = await invokePaystackBillingApi<{
    ok: boolean;
    expiresAt?: string;
    error?: string;
  }>({
    action: "admin_grant_pass",
    ...params,
  });
  if (res.ok) {
    notifyBillingStatusUpdated();
  }
  return res;
}

export function useStudentSubscription() {
  const [billing, setBilling] = useState<StudentBillingStatus>(
    DEFAULT_STUDENT_BILLING_STATUS
  );
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    const next = await fetchStudentBillingStatus();
    setBilling(next);
    setLoading(false);
    return next;
  }, []);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase?.auth || typeof supabase.auth.getSession !== "function") {
      return;
    }

    let active = true;
    fetchStudentBillingStatus().then((next) => {
      if (active) {
        setBilling(next);
        setLoading(false);
      }
    });

    const onUpdated = () => {
      fetchStudentBillingStatus().then((next) => {
        if (active) setBilling(next);
      });
    };

    if (typeof window !== "undefined") {
      window.addEventListener(BILLING_REFRESH_EVENT, onUpdated);
    }
    return () => {
      active = false;
      if (typeof window !== "undefined") {
        window.removeEventListener(BILLING_REFRESH_EVENT, onUpdated);
      }
    };
  }, []);

  return {
    billing,
    loading,
    refresh,
  };
}
