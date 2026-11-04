"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Check,
  Copy,
  CreditCard,
  Crown,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { AdminProfileRow } from "@/lib/admin/adminService";
import {
  adminGrantOrRevokePass,
  DEFAULT_BILLING_SETTINGS,
  fetchAdminBillingOverview,
  formatNaira,
  saveAdminBillingConfig,
  type AdminBillingOverview,
  type PaidPlanCode,
} from "@/lib/billing/billingService";

interface AdminPaystackBillingPanelProps {
  users: AdminProfileRow[];
  onStatusMessage?: (msg: string) => void;
}

export function AdminPaystackBillingPanel({
  users,
  onStatusMessage,
}: AdminPaystackBillingPanelProps) {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AdminBillingOverview | null>(null);
  const [saving, setSaving] = useState(false);
  const [granting, setGranting] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [localMsg, setLocalMsg] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  // Editable form state
  const [secretKeyInput, setSecretKeyInput] = useState("");
  const [paywallEnabled, setPaywallEnabled] = useState(true);
  const [price7dNgn, setPrice7dNgn] = useState(2000);
  const [price30dNgn, setPrice30dNgn] = useState(3500);
  const [price90dNgn, setPrice90dNgn] = useState(10000);
  const [freeDailyAiMessages, setFreeDailyAiMessages] = useState(6);
  const [freeDailyPhotoSnaps, setFreeDailyPhotoSnaps] = useState(2);
  const [freeMaxExamQuestions, setFreeMaxExamQuestions] = useState(10);

  // VIP Grant form state
  const [selectedUserId, setSelectedUserId] = useState("");
  const [grantPlanCode, setGrantPlanCode] = useState<PaidPlanCode | "revoke">(
    "pass_30d"
  );

  const loadBillingOverview = useCallback(async () => {
    setLoading(true);
    const res = await fetchAdminBillingOverview();
    setOverview(res);
    if (res.ok && res.settings) {
      setPaywallEnabled(res.settings.paywallEnabled);
      setPrice7dNgn(res.settings.price7dNgn);
      setPrice30dNgn(res.settings.price30dNgn);
      setPrice90dNgn(res.settings.price90dNgn);
      setFreeDailyAiMessages(res.settings.freeDailyAiMessages);
      setFreeDailyPhotoSnaps(res.settings.freeDailyPhotoSnaps);
      setFreeMaxExamQuestions(res.settings.freeMaxExamQuestions);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadBillingOverview();
  }, [loadBillingOverview]);

  useEffect(() => {
    if (!selectedUserId && users.length > 0) {
      const firstStudent =
        users.find((u) => u.role !== "admin") || users[0];
      if (firstStudent) setSelectedUserId(firstStudent.id);
    }
  }, [users, selectedUserId]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setLocalMsg(null);
    try {
      const res = await saveAdminBillingConfig({
        secretKey: secretKeyInput.trim() || undefined,
        paywallEnabled,
        price7dNgn,
        price30dNgn,
        price90dNgn,
        freeDailyAiMessages,
        freeDailyPhotoSnaps,
        freeMaxExamQuestions,
      });

      if (!res.ok) {
        setLocalMsg({
          tone: "error",
          text: res.error || "Could not save Paystack configuration.",
        });
        return;
      }

      setSecretKeyInput("");
      const msg =
        "Paystack server vault, Naira pass prices, and Free Starter quotas saved.";
      setLocalMsg({ tone: "success", text: msg });
      onStatusMessage?.(msg);
      await loadBillingOverview();
    } finally {
      setSaving(false);
    }
  };

  const handleGrantPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setGranting(true);
    setLocalMsg(null);
    try {
      const res = await adminGrantOrRevokePass({
        targetUserId: selectedUserId,
        planCode: grantPlanCode,
      });
      if (!res.ok) {
        setLocalMsg({
          tone: "error",
          text: res.error || "Unable to update student subscription.",
        });
        return;
      }
      const targetUser = users.find((u) => u.id === selectedUserId);
      const msg =
        grantPlanCode === "revoke"
          ? `Revoked Pro pass for ${targetUser?.email || selectedUserId}.`
          : `Granted ${grantPlanCode === "pass_7d" ? "7-Day" : grantPlanCode === "pass_90d" ? "90-Day" : "30-Day"} TRALIX Pro pass to ${targetUser?.email || selectedUserId}.`;
      setLocalMsg({ tone: "success", text: msg });
      onStatusMessage?.(msg);
      await loadBillingOverview();
    } finally {
      setGranting(false);
    }
  };

  const primaryWebhookUrl =
    "https://students-ecosystem.vercel.app/api/billing/paystack/webhook";

  const copyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(primaryWebhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2200);
    } catch {
      // Ignore clipboard failure
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-obsidian-900/80 p-10 text-xs text-slate-300">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-electric-400" />
        Loading Paystack gateway status, Naira pass pricing &amp; transaction ledger...
      </div>
    );
  }

  const metrics = overview?.metrics || {
    totalRevenueNgn: 0,
    revenue30dNgn: 0,
    successfulPaymentsCount: 0,
    activeProSubscribersCount: 0,
  };
  const gateway = overview?.gateway;

  return (
    <div className="space-y-6">
      {localMsg && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-xs font-medium ${
            localMsg.tone === "success"
              ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
              : "border-rose-400/40 bg-rose-500/15 text-rose-100"
          }`}
        >
          {localMsg.text}
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Verified Revenue (All-Time)
          </p>
          <p className="mt-1.5 text-2xl font-extrabold text-white">
            {formatNaira(metrics.totalRevenueNgn)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {metrics.successfulPaymentsCount} verified Paystack payment
            {metrics.successfulPaymentsCount === 1 ? "" : "s"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Last 30 Days Revenue
          </p>
          <p className="mt-1.5 text-2xl font-extrabold text-emerald-300">
            {formatNaira(metrics.revenue30dNgn)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Settled in NGN via Paystack
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Active TRALIX Pro Learners
          </p>
          <p className="mt-1.5 text-2xl font-extrabold text-cyan-300">
            {metrics.activeProSubscribersCount}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Unexpired 7d / 30d / 90d passes
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Paystack Gateway Status
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                gateway?.configured
                  ? gateway.mode === "live"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-cyan-500/20 text-cyan-200"
                  : "bg-amber-500/20 text-amber-200"
              }`}
            >
              {gateway?.configured
                ? `Connected (${gateway.mode.toUpperCase()})`
                : "Awaiting Secret Key"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-mono truncate">
            {gateway?.maskedKey || "Paste sk_live_... or sk_test_... below"}
          </p>
        </div>
      </div>

      {/* Paystack Key Vault + Pricing Configuration Form */}
      <form
        onSubmit={handleSaveConfig}
        className="rounded-2xl border border-cyan-400/25 bg-obsidian-900/85 p-5 sm:p-6 space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <CreditCard className="h-4 w-4 text-cyan-300" />
              Paystack Secret Key Vault &amp; Naira Pricing Controls
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Your Paystack Secret Key is stored strictly inside the encrypted
              server-only vault (`service_role` RLS) — never exposed to browsers.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadBillingOverview()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-obsidian-950 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5 text-cyan-300" />
            Refresh Ledger
          </button>
        </div>

        {/* Secret Key + Webhook URL */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label
              htmlFor="paystack-secret-input"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-200"
            >
              <KeyRound className="h-3.5 w-3.5 text-amber-300" />
              Paystack Secret Key (`sk_live_...` or `sk_test_...`)
            </label>
            <input
              id="paystack-secret-input"
              type="password"
              autoComplete="off"
              value={secretKeyInput}
              onChange={(e) => setSecretKeyInput(e.target.value)}
              placeholder={
                gateway?.configured
                  ? `Active in ${gateway.source}: ${gateway.maskedKey} (leave blank to keep)`
                  : "Paste your Paystack Secret Key (sk_live_... or sk_test_...)"
              }
              className="mt-1.5 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Get this from{" "}
              <strong className="text-slate-200">
                Paystack Dashboard → Settings → API Keys &amp; Webhooks
              </strong>
              .
            </p>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Paystack Signed Webhook URL (HMAC-SHA512 Verified)
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={primaryWebhookUrl}
                aria-label="Paystack Webhook URL"
                className="w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2.5 text-xs font-mono text-cyan-200"
              />
              <button
                type="button"
                onClick={copyWebhook}
                className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-cyan-400/35 bg-cyan-500/15 px-3 py-2.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/25"
              >
                {copiedWebhook ? (
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copiedWebhook ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Paste into Paystack Live/Test Webhook URL so bank transfers fulfill
              even if a student closes their tab.
            </p>
          </div>
        </div>

        {/* Tier Prices (NGN) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="price-7d-ngn"
              className="block text-xs font-semibold text-slate-300"
            >
              7-Day Cram Pass Price (₦ NGN)
            </label>
            <input
              id="price-7d-ngn"
              type="number"
              min={100}
              step={100}
              value={price7dNgn}
              onChange={(e) =>
                setPrice7dNgn(
                  Math.max(100, Number(e.target.value) || DEFAULT_BILLING_SETTINGS.price7dNgn)
                )
              }
              className="mt-1.5 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3.5 py-2 text-sm font-bold text-white"
            />
          </div>

          <div>
            <label
              htmlFor="price-30d-ngn"
              className="block text-xs font-semibold text-cyan-300"
            >
              Monthly Pro (30 Days) Price (₦ NGN)
            </label>
            <input
              id="price-30d-ngn"
              type="number"
              min={100}
              step={100}
              value={price30dNgn}
              onChange={(e) =>
                setPrice30dNgn(
                  Math.max(100, Number(e.target.value) || DEFAULT_BILLING_SETTINGS.price30dNgn)
                )
              }
              className="mt-1.5 w-full rounded-xl border border-cyan-400/35 bg-obsidian-950 px-3.5 py-2 text-sm font-bold text-white"
            />
          </div>

          <div>
            <label
              htmlFor="price-90d-ngn"
              className="block text-xs font-semibold text-slate-300"
            >
              90-Day Exam Season Pass Price (₦ NGN)
            </label>
            <input
              id="price-90d-ngn"
              type="number"
              min={100}
              step={100}
              value={price90dNgn}
              onChange={(e) =>
                setPrice90dNgn(
                  Math.max(100, Number(e.target.value) || DEFAULT_BILLING_SETTINGS.price90dNgn)
                )
              }
              className="mt-1.5 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3.5 py-2 text-sm font-bold text-white"
            />
          </div>
        </div>

        {/* Free Starter Quotas + Master Paywall Toggle */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label
              htmlFor="free-ai-msg-limit"
              className="block text-xs font-semibold text-slate-300"
            >
              Free AI Messages / Day
            </label>
            <input
              id="free-ai-msg-limit"
              type="number"
              min={0}
              max={200}
              value={freeDailyAiMessages}
              onChange={(e) => setFreeDailyAiMessages(Number(e.target.value))}
              className="mt-1.5 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label
              htmlFor="free-photo-limit"
              className="block text-xs font-semibold text-slate-300"
            >
              Free Photo Snaps / Day
            </label>
            <input
              id="free-photo-limit"
              type="number"
              min={0}
              max={50}
              value={freeDailyPhotoSnaps}
              onChange={(e) => setFreeDailyPhotoSnaps(Number(e.target.value))}
              className="mt-1.5 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label
              htmlFor="free-cbt-max-q"
              className="block text-xs font-semibold text-slate-300"
            >
              Free Max CBT Questions
            </label>
            <input
              id="free-cbt-max-q"
              type="number"
              min={1}
              max={100}
              value={freeMaxExamQuestions}
              onChange={(e) => setFreeMaxExamQuestions(Number(e.target.value))}
              className="mt-1.5 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={() => setPaywallEnabled((v) => !v)}
              className={`w-full rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                paywallEnabled
                  ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                  : "border-amber-400/40 bg-amber-500/15 text-amber-200"
              }`}
            >
              {paywallEnabled
                ? "Paywall Active (Enforced)"
                : "Paywall Paused (Open Promo)"}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-cyan-glow hover:brightness-110 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save Paystack Key, Prices &amp; Quotas
          </button>
        </div>
      </form>

      {/* Complimentary VIP / Scholarship Pass Grant */}
      <form
        onSubmit={handleGrantPass}
        className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 sm:p-6 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-amber-300" />
          <h3 className="text-sm font-bold text-white">
            Grant or Revoke Complimentary TRALIX Pro Pass (Scholarships / Support)
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select
            aria-label="Select student for Pro pass"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2.5 text-xs text-white"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName || "Learner"} ({u.email}) — {u.role}
              </option>
            ))}
          </select>

          <select
            aria-label="Select pass duration or revoke"
            value={grantPlanCode}
            onChange={(e) =>
              setGrantPlanCode(e.target.value as PaidPlanCode | "revoke")
            }
            className="rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2.5 text-xs text-white"
          >
            <option value="pass_7d">Grant 7-Day Cram Pass</option>
            <option value="pass_30d">Grant 30-Day Monthly Pro</option>
            <option value="pass_90d">Grant 90-Day Exam Season Pass</option>
            <option value="revoke">Revoke Active Pro Pass</option>
          </select>

          <button
            type="submit"
            disabled={granting || !selectedUserId}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-2.5 text-xs font-bold text-amber-100 hover:bg-amber-500/25 disabled:opacity-50"
          >
            {granting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Users className="h-3.5 w-3.5" />
            )}
            Apply Student Pass Action
          </button>
        </div>
      </form>

      {/* Recent Paystack Transactions Ledger */}
      <section className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 sm:p-6">
        <h3 className="text-sm font-bold text-white mb-3">
          Recent Paystack Transactions ({overview?.recentTransactions?.length || 0})
        </h3>
        {!overview?.recentTransactions ||
        overview.recentTransactions.length === 0 ? (
          <p className="text-xs text-slate-400">
            No payment transactions recorded yet. Real student Paystack
            checkouts and verified settlements appear here automatically.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 px-3">Student Email</th>
                  <th className="py-2 px-3">Plan</th>
                  <th className="py-2 px-3">Amount</th>
                  <th className="py-2 px-3">Reference</th>
                  <th className="py-2 pl-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {overview.recentTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="py-2 pr-3 text-slate-400">
                      {new Date(tx.created_at).toLocaleString("en-NG")}
                    </td>
                    <td className="py-2 px-3">{tx.email}</td>
                    <td className="py-2 px-3 font-medium">{tx.plan_code}</td>
                    <td className="py-2 px-3 font-bold">
                      {formatNaira(tx.amount_ngn)}
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px]">
                      {tx.reference}
                    </td>
                    <td className="py-2 pl-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
