// Supabase Edge Function: paystack-billing (v1)
// Server-side Paystack Payment Gateway, Subscription Entitlements, Signed HMAC-SHA512 Webhook,
// and Admin Billing Vault for E-Learning Ecosystem — Powered by TRALIX AI.

import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-paystack-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PAYSTACK_API_BASE = "https://api.paystack.co";

type PaidPlanCode = "pass_7d" | "pass_30d" | "pass_90d";

const PLAN_METADATA: Record<
  PaidPlanCode,
  { label: string; durationDays: number; priceColumn: string; defaultNgn: number }
> = {
  pass_7d: {
    label: "7-Day Cram Pass",
    durationDays: 7,
    priceColumn: "price_7d_ngn",
    defaultNgn: 2000,
  },
  pass_30d: {
    label: "Monthly Pro (30 Days)",
    durationDays: 30,
    priceColumn: "price_30d_ngn",
    defaultNgn: 3500,
  },
  pass_90d: {
    label: "90-Day Exam Season Pass",
    durationDays: 90,
    priceColumn: "price_90d_ngn",
    defaultNgn: 10000,
  },
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function getPlanLabel(planCode: string | null | undefined): string {
  if (planCode === "pass_7d") return PLAN_METADATA.pass_7d.label;
  if (planCode === "pass_30d") return PLAN_METADATA.pass_30d.label;
  if (planCode === "pass_90d") return PLAN_METADATA.pass_90d.label;
  if (planCode === "admin_vip") return "Complimentary VIP Pass";
  return "Free Starter";
}

function maskSecretKey(secret: string): string {
  const clean = secret.trim();
  if (!clean) return "";
  if (clean.length <= 12) return "••••••••";
  return `${clean.slice(0, 8)}••••••••${clean.slice(-4)}`;
}

async function resolvePaystackSecretKey(
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<{ secretKey: string; source: "env" | "vault" | "none"; mode: "live" | "test" | "unconfigured" }> {
  const envKey = (Deno.env.get("PAYSTACK_SECRET_KEY") || "").trim();
  if (envKey.startsWith("sk_live_") || envKey.startsWith("sk_test_")) {
    return {
      secretKey: envKey,
      source: "env",
      mode: envKey.startsWith("sk_live_") ? "live" : "test",
    };
  }

  const { data } = await supabaseAdmin
    .from("admin_integration_secrets")
    .select("secret_token")
    .eq("provider_key", "paystack")
    .maybeSingle();

  const vaultKey = String(data?.secret_token || "").trim();
  if (vaultKey.startsWith("sk_live_") || vaultKey.startsWith("sk_test_")) {
    return {
      secretKey: vaultKey,
      source: "vault",
      mode: vaultKey.startsWith("sk_live_") ? "live" : "test",
    };
  }

  return { secretKey: "", source: "none", mode: "unconfigured" };
}

async function computeHmacSha512Hex(secret: string, rawBody: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(rawBody)
  );
  return Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const cleanA = a.trim().toLowerCase();
  const cleanB = b.trim().toLowerCase();
  if (!cleanA || cleanA.length !== cleanB.length) return false;
  let diff = 0;
  for (let i = 0; i < cleanA.length; i += 1) {
    diff |= cleanA.charCodeAt(i) ^ cleanB.charCodeAt(i);
  }
  return diff === 0;
}

async function fulfillVerifiedPayment(params: {
  supabaseAdmin: ReturnType<typeof createClient>;
  reference: string;
  paidAmountKobo: number;
  currency: string;
  channel: string | null;
  paidAtIso: string | null;
}) {
  const { supabaseAdmin, reference, paidAmountKobo, currency, channel, paidAtIso } =
    params;

  const { data: txRow, error: txErr } = await supabaseAdmin
    .from("payment_transactions")
    .select("*")
    .eq("reference", reference)
    .maybeSingle();

  if (txErr || !txRow) {
    return { ok: false as const, error: "Transaction reference not found." };
  }

  const planCode = String(txRow.plan_code) as PaidPlanCode;
  const planMeta = PLAN_METADATA[planCode];
  if (!planMeta) {
    return { ok: false as const, error: "Invalid plan code on transaction." };
  }

  if (String(currency).toUpperCase() !== "NGN") {
    return { ok: false as const, error: "Invalid transaction currency." };
  }

  if (Number(paidAmountKobo) < Number(txRow.amount_kobo)) {
    return {
      ok: false as const,
      error: "Paid amount is lower than required plan price.",
    };
  }

  // Idempotent: if already fulfilled, return current subscription without double-adding days
  if (txRow.status === "success") {
    const { data: existingSub } = await supabaseAdmin
      .from("student_subscriptions")
      .select("*")
      .eq("user_id", txRow.user_id)
      .maybeSingle();

    return {
      ok: true as const,
      alreadyFulfilled: true,
      userId: String(txRow.user_id),
      planCode,
      planLabel: planMeta.label,
      expiresAt: existingSub?.expires_at || new Date().toISOString(),
    };
  }

  const now = new Date();
  const { data: currentSub } = await supabaseAdmin
    .from("student_subscriptions")
    .select("*")
    .eq("user_id", txRow.user_id)
    .maybeSingle();

  let baseDate = now;
  if (
    currentSub &&
    currentSub.status === "active" &&
    currentSub.expires_at &&
    new Date(String(currentSub.expires_at)).getTime() > now.getTime()
  ) {
    baseDate = new Date(String(currentSub.expires_at));
  }

  const nextExpiresAt = new Date(
    baseDate.getTime() + planMeta.durationDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error: updateTxErr } = await supabaseAdmin
    .from("payment_transactions")
    .update({
      status: "success",
      channel: channel || "paystack",
      paid_at: paidAtIso || now.toISOString(),
      verified_at: now.toISOString(),
    })
    .eq("id", txRow.id)
    .neq("status", "success");

  if (updateTxErr) {
    return { ok: false as const, error: "Failed to record verified payment." };
  }

  await supabaseAdmin.from("student_subscriptions").upsert(
    {
      user_id: txRow.user_id,
      plan_code: planCode,
      status: "active",
      starts_at:
        currentSub &&
        currentSub.status === "active" &&
        new Date(String(currentSub.expires_at)).getTime() > now.getTime()
          ? currentSub.starts_at
          : now.toISOString(),
      expires_at: nextExpiresAt,
      source: "paystack",
      last_payment_reference: reference,
      updated_at: now.toISOString(),
    },
    { onConflict: "user_id" }
  );

  await supabaseAdmin.from("student_notifications").insert({
    user_id: txRow.user_id,
    title: `TRALIX Pro Activated — ${planMeta.label}`,
    body: `Your payment of ₦${Number(txRow.amount_ngn).toLocaleString()} (${reference}) was verified. Unlimited AI Photo Tutor, full-length CBT mocks, and all course chapters are active until ${new Date(nextExpiresAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}.`,
    category: "system",
    action_url: "/dashboard/upgrade",
    is_read: false,
  });

  return {
    ok: true as const,
    alreadyFulfilled: false,
    userId: String(txRow.user_id),
    planCode,
    planLabel: planMeta.label,
    expiresAt: nextExpiresAt,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      { ok: false, error: "Server configuration missing." },
      500
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const paystackSignature = req.headers.get("x-paystack-signature");

  // 1. Signed Paystack Webhook Path (HMAC-SHA512)
  if (paystackSignature) {
    const rawBody = await req.text();
    const keyInfo = await resolvePaystackSecretKey(supabaseAdmin);
    if (!keyInfo.secretKey) {
      return jsonResponse({ ok: false, error: "Gateway not configured." }, 503);
    }

    const expectedSig = await computeHmacSha512Hex(keyInfo.secretKey, rawBody);
    if (!timingSafeEqualHex(expectedSig, paystackSignature)) {
      return jsonResponse({ ok: false, error: "Invalid webhook signature." }, 401);
    }

    let eventPayload: Record<string, unknown> = {};
    try {
      eventPayload = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ ok: false, error: "Malformed JSON." }, 400);
    }

    if (eventPayload.event === "charge.success") {
      const data = (eventPayload.data || {}) as Record<string, unknown>;
      const reference = String(data.reference || "").trim();
      if (reference) {
        await fulfillVerifiedPayment({
          supabaseAdmin,
          reference,
          paidAmountKobo: Number(data.amount || 0),
          currency: String(data.currency || "NGN"),
          channel: data.channel ? String(data.channel) : null,
          paidAtIso: data.paid_at ? String(data.paid_at) : null,
        });
      }
    }

    return jsonResponse({ ok: true, received: true });
  }

  // 2. Authenticated Student / Admin API Path
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return jsonResponse({ ok: false, error: "Authentication required." }, 401);
  }

  const {
    data: { user },
    error: authErr,
  } = await supabaseAdmin.auth.getUser(token);

  if (authErr || !user) {
    return jsonResponse({ ok: false, error: "Invalid or expired session." }, 401);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON payload." }, 400);
  }

  const action = String(body.action || "status");

  const [{ data: profileRow }, { data: planSettingsRow }, keyInfo] =
    await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("role, full_name, email")
        .eq("id", user.id)
        .maybeSingle(),
      supabaseAdmin
        .from("billing_plan_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle(),
      resolvePaystackSecretKey(supabaseAdmin),
    ]);

  const isAdmin = profileRow?.role === "admin";
  const settings = {
    paywallEnabled:
      planSettingsRow?.paywall_enabled !== undefined
        ? Boolean(planSettingsRow.paywall_enabled)
        : true,
    freeDailyAiMessages: Number(planSettingsRow?.free_daily_ai_messages ?? 6),
    freeDailyPhotoSnaps: Number(planSettingsRow?.free_daily_photo_snaps ?? 2),
    freeMaxExamQuestions: Number(planSettingsRow?.free_max_exam_questions ?? 10),
    price7dNgn: Number(planSettingsRow?.price_7d_ngn ?? 2000),
    price30dNgn: Number(planSettingsRow?.price_30d_ngn ?? 3500),
    price90dNgn: Number(planSettingsRow?.price_90d_ngn ?? 10000),
  };

  if (action === "status") {
    const startOfTodayIso = new Date(
      new Date().toISOString().slice(0, 10) + "T00:00:00.000Z"
    ).toISOString();

    const [
      { data: subRow },
      { count: aiUsedToday },
      { count: photoUsedToday },
      { data: txRows },
    ] = await Promise.all([
      supabaseAdmin
        .from("student_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabaseAdmin
        .from("ai_usage_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "success")
        .gte("created_at", startOfTodayIso),
      supabaseAdmin
        .from("ai_usage_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("feature", "tutor_photo")
        .eq("status", "success")
        .gte("created_at", startOfTodayIso),
      supabaseAdmin
        .from("payment_transactions")
        .select(
          "id, plan_code, amount_ngn, currency, reference, status, channel, paid_at, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const nowMs = Date.now();
    const subExpiresMs = subRow?.expires_at
      ? new Date(String(subRow.expires_at)).getTime()
      : 0;
    const hasActiveSub =
      Boolean(subRow) && subRow?.status === "active" && subExpiresMs > nowMs;

    const effectiveIsPro = isAdmin || !settings.paywallEnabled || hasActiveSub;
    const daysRemaining = hasActiveSub
      ? Math.max(1, Math.ceil((subExpiresMs - nowMs) / (24 * 60 * 60 * 1000)))
      : 0;

    return jsonResponse({
      ok: true,
      isPro: effectiveIsPro,
      isAdmin,
      planCode: isAdmin
        ? "admin_vip"
        : hasActiveSub
          ? String(subRow.plan_code)
          : "free",
      planLabel: isAdmin
        ? "Administrator Unlimited"
        : hasActiveSub
          ? getPlanLabel(String(subRow.plan_code))
          : "Free Starter",
      expiresAt: hasActiveSub ? String(subRow.expires_at) : null,
      daysRemaining,
      gatewayReady: Boolean(keyInfo.secretKey),
      gatewayMode: keyInfo.mode,
      settings,
      usageToday: {
        aiMessagesUsed: Number(aiUsedToday || 0),
        aiPhotoSnapsUsed: Number(photoUsedToday || 0),
      },
      recentTransactions: txRows || [],
    });
  }

  if (action === "initialize") {
    const planCode = String(body.planCode || "") as PaidPlanCode;
    if (!PLAN_METADATA[planCode]) {
      return jsonResponse(
        { ok: false, error: "Please select a valid subscription plan." },
        400
      );
    }

    if (!keyInfo.secretKey) {
      return jsonResponse(
        {
          ok: false,
          code: "GATEWAY_NOT_CONFIGURED",
          error:
            "Paystack checkout is being finalized by the administrator. Please try again shortly.",
        },
        503
      );
    }

    const amountNgn =
      planCode === "pass_7d"
        ? settings.price7dNgn
        : planCode === "pass_30d"
          ? settings.price30dNgn
          : settings.price90dNgn;
    const amountKobo = amountNgn * 100;

    const email = (user.email || profileRow?.email || "").trim();
    if (!email) {
      return jsonResponse(
        { ok: false, error: "A verified account email is required for Paystack receipts." },
        400
      );
    }

    const randHex = Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const reference = `TRALIX_${Date.now()}_${randHex}`;

    const rawCallbackUrl = String(body.callbackUrl || "").trim();
    const safeCallbackUrl =
      rawCallbackUrl.startsWith("https://") || rawCallbackUrl.startsWith("http://")
        ? rawCallbackUrl
        : "https://students-ecosystem.vercel.app/dashboard/upgrade";

    const initRes = await fetch(`${PAYSTACK_API_BASE}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${keyInfo.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountKobo,
        currency: "NGN",
        reference,
        callback_url: safeCallbackUrl,
        channels: [
          "card",
          "bank",
          "ussd",
          "qr",
          "mobile_money",
          "bank_transfer",
        ],
        metadata: {
          user_id: user.id,
          plan_code: planCode,
          plan_label: PLAN_METADATA[planCode].label,
          duration_days: PLAN_METADATA[planCode].durationDays,
          custom_fields: [
            {
              display_name: "Student",
              variable_name: "student_name",
              value: profileRow?.full_name || email,
            },
            {
              display_name: "Pass",
              variable_name: "pass_label",
              value: PLAN_METADATA[planCode].label,
            },
          ],
        },
      }),
    });

    const initJson = (await initRes.json().catch(() => ({}))) as {
      status?: boolean;
      message?: string;
      data?: {
        authorization_url?: string;
        access_code?: string;
        reference?: string;
      };
    };

    if (
      !initRes.ok ||
      !initJson.status ||
      !initJson.data?.authorization_url
    ) {
      return jsonResponse(
        {
          ok: false,
          error:
            initJson.message ||
            "Unable to initialize Paystack checkout right now. Please retry.",
        },
        502
      );
    }

    await supabaseAdmin.from("payment_transactions").insert({
      user_id: user.id,
      email,
      plan_code: planCode,
      amount_ngn: amountNgn,
      amount_kobo: amountKobo,
      currency: "NGN",
      provider: "paystack",
      reference,
      access_code: initJson.data.access_code || null,
      authorization_url: initJson.data.authorization_url,
      status: "pending",
      metadata: {
        planLabel: PLAN_METADATA[planCode].label,
        durationDays: PLAN_METADATA[planCode].durationDays,
      },
    });

    return jsonResponse({
      ok: true,
      authorizationUrl: initJson.data.authorization_url,
      accessCode: initJson.data.access_code || "",
      reference,
      amountNgn,
      planLabel: PLAN_METADATA[planCode].label,
    });
  }

  if (action === "verify") {
    const reference = String(body.reference || "").trim();
    if (!reference) {
      return jsonResponse(
        { ok: false, error: "Payment reference is required." },
        400
      );
    }

    const { data: txRow } = await supabaseAdmin
      .from("payment_transactions")
      .select("user_id, status")
      .eq("reference", reference)
      .maybeSingle();

    if (!txRow) {
      return jsonResponse(
        { ok: false, error: "Payment reference was not found." },
        404
      );
    }

    if (String(txRow.user_id) !== user.id && !isAdmin) {
      return jsonResponse(
        { ok: false, error: "Forbidden: You cannot verify another student's payment." },
        403
      );
    }

    if (!keyInfo.secretKey) {
      return jsonResponse(
        { ok: false, error: "Paystack secret key is not configured." },
        503
      );
    }

    const verifyRes = await fetch(
      `${PAYSTACK_API_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${keyInfo.secretKey}`,
        },
      }
    );

    const verifyJson = (await verifyRes.json().catch(() => ({}))) as {
      status?: boolean;
      message?: string;
      data?: {
        status?: string;
        amount?: number;
        currency?: string;
        channel?: string;
        paid_at?: string;
      };
    };

    if (!verifyRes.ok || !verifyJson.status || !verifyJson.data) {
      return jsonResponse(
        {
          ok: false,
          error:
            verifyJson.message ||
            "Unable to verify payment status with Paystack yet.",
        },
        502
      );
    }

    const paystackTxStatus = String(verifyJson.data.status || "").toLowerCase();
    if (paystackTxStatus !== "success") {
      if (paystackTxStatus === "failed" || paystackTxStatus === "abandoned") {
        await supabaseAdmin
          .from("payment_transactions")
          .update({ status: paystackTxStatus })
          .eq("reference", reference)
          .eq("status", "pending");
      }
      return jsonResponse({
        ok: false,
        verified: false,
        paymentStatus: paystackTxStatus || "pending",
        error:
          paystackTxStatus === "ongoing" || paystackTxStatus === "pending"
            ? "Paystack is still awaiting confirmation for this transfer/payment. Click Verify again in a moment."
            : `Payment was not completed (status: ${paystackTxStatus || "incomplete"}).`,
      });
    }

    const fulfilled = await fulfillVerifiedPayment({
      supabaseAdmin,
      reference,
      paidAmountKobo: Number(verifyJson.data.amount || 0),
      currency: String(verifyJson.data.currency || "NGN"),
      channel: verifyJson.data.channel || null,
      paidAtIso: verifyJson.data.paid_at || null,
    });

    if (!fulfilled.ok) {
      return jsonResponse({ ok: false, error: fulfilled.error }, 400);
    }

    return jsonResponse({
      ok: true,
      verified: true,
      isPro: true,
      planCode: fulfilled.planCode,
      planLabel: fulfilled.planLabel,
      expiresAt: fulfilled.expiresAt,
    });
  }

  // 3. Admin-Only Billing Actions
  if (!isAdmin) {
    return jsonResponse(
      { ok: false, error: "Forbidden: Administrator privileges required." },
      403
    );
  }

  if (action === "admin_overview") {
    const thirtyDaysAgoIso = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();
    const nowIso = new Date().toISOString();

    const [{ data: paidRows }, { data: recentTxs }, { data: activeSubs }] =
      await Promise.all([
        supabaseAdmin
          .from("payment_transactions")
          .select("amount_ngn, paid_at, created_at")
          .eq("status", "success"),
        supabaseAdmin
          .from("payment_transactions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(30),
        supabaseAdmin
          .from("student_subscriptions")
          .select("*")
          .eq("status", "active")
          .gt("expires_at", nowIso)
          .order("expires_at", { ascending: false })
          .limit(50),
      ]);

    const totalRevenueNgn = (paidRows || []).reduce(
      (sum, r) => sum + Number(r.amount_ngn || 0),
      0
    );
    const revenue30dNgn = (paidRows || [])
      .filter((r) => String(r.paid_at || r.created_at || "") >= thirtyDaysAgoIso)
      .reduce((sum, r) => sum + Number(r.amount_ngn || 0), 0);

    return jsonResponse({
      ok: true,
      gateway: {
        configured: Boolean(keyInfo.secretKey),
        mode: keyInfo.mode,
        source: keyInfo.source,
        maskedKey: keyInfo.secretKey ? maskSecretKey(keyInfo.secretKey) : "",
        webhookUrl: `${supabaseUrl}/functions/v1/paystack-billing`,
      },
      settings,
      metrics: {
        totalRevenueNgn,
        revenue30dNgn,
        successfulPaymentsCount: (paidRows || []).length,
        activeProSubscribersCount: (activeSubs || []).length,
      },
      activeSubscriptions: activeSubs || [],
      recentTransactions: recentTxs || [],
    });
  }

  if (action === "admin_save_config") {
    const rawSecret = typeof body.secretKey === "string" ? body.secretKey.trim() : "";
    if (rawSecret) {
      if (!rawSecret.startsWith("sk_live_") && !rawSecret.startsWith("sk_test_")) {
        return jsonResponse(
          {
            ok: false,
            error:
              "Paystack Secret Key must begin with sk_live_ or sk_test_.",
          },
          400
        );
      }

      await supabaseAdmin.from("admin_integration_secrets").upsert(
        {
          provider_key: "paystack",
          display_name: "Paystack Payment Gateway",
          base_url: PAYSTACK_API_BASE,
          secret_token: rawSecret,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "provider_key" }
      );
    }

    const nextSettings = {
      paywall_enabled:
        body.paywallEnabled !== undefined
          ? Boolean(body.paywallEnabled)
          : settings.paywallEnabled,
      price_7d_ngn: Math.max(
        100,
        Number(body.price7dNgn ?? settings.price7dNgn) || 2000
      ),
      price_30d_ngn: Math.max(
        100,
        Number(body.price30dNgn ?? settings.price30dNgn) || 3500
      ),
      price_90d_ngn: Math.max(
        100,
        Number(body.price90dNgn ?? settings.price90dNgn) || 10000
      ),
      free_daily_ai_messages: Math.min(
        200,
        Math.max(
          0,
          Number(body.freeDailyAiMessages ?? settings.freeDailyAiMessages)
        )
      ),
      free_daily_photo_snaps: Math.min(
        50,
        Math.max(
          0,
          Number(body.freeDailyPhotoSnaps ?? settings.freeDailyPhotoSnaps)
        )
      ),
      free_max_exam_questions: Math.min(
        100,
        Math.max(
          1,
          Number(body.freeMaxExamQuestions ?? settings.freeMaxExamQuestions)
        )
      ),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    const { error: saveErr } = await supabaseAdmin
      .from("billing_plan_settings")
      .update(nextSettings)
      .eq("id", 1);

    if (saveErr) {
      return jsonResponse(
        { ok: false, error: "Failed to update billing configuration." },
        500
      );
    }

    await supabaseAdmin.from("admin_audit_logs").insert({
      admin_user_id: user.id,
      action_type: "update_paystack_billing_config",
      target_type: "billing_plan_settings",
      target_id: "1",
      summary: `Updated Paystack & pricing (7d: ₦${nextSettings.price_7d_ngn}, 30d: ₦${nextSettings.price_30d_ngn}, 90d: ₦${nextSettings.price_90d_ngn}, paywall: ${nextSettings.paywall_enabled ? "enabled" : "paused"})${rawSecret ? " + rotated Paystack secret key" : ""}`,
      details: {
        paywallEnabled: nextSettings.paywall_enabled,
        price7dNgn: nextSettings.price_7d_ngn,
        price30dNgn: nextSettings.price_30d_ngn,
        price90dNgn: nextSettings.price_90d_ngn,
        secretRotated: Boolean(rawSecret),
      },
    });

    return jsonResponse({ ok: true });
  }

  if (action === "admin_grant_pass") {
    const targetUserId = String(body.targetUserId || "").trim();
    const grantPlan = String(body.planCode || "pass_30d");
    if (!targetUserId) {
      return jsonResponse(
        { ok: false, error: "Target user ID is required." },
        400
      );
    }

    if (grantPlan === "revoke") {
      await supabaseAdmin
        .from("student_subscriptions")
        .update({
          status: "canceled",
          expires_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", targetUserId);

      await supabaseAdmin.from("admin_audit_logs").insert({
        admin_user_id: user.id,
        action_type: "revoke_student_subscription",
        target_type: "student_subscriptions",
        target_id: targetUserId,
        summary: `Revoked active Pro pass for user ${targetUserId}`,
        details: { targetUserId },
      });

      return jsonResponse({ ok: true });
    }

    const days =
      grantPlan === "pass_7d" ? 7 : grantPlan === "pass_90d" ? 90 : 30;
    const expiresAt = new Date(
      Date.now() + days * 24 * 60 * 60 * 1000
    ).toISOString();

    const normalizedPlan =
      grantPlan === "pass_7d" ||
      grantPlan === "pass_30d" ||
      grantPlan === "pass_90d"
        ? grantPlan
        : "admin_vip";

    await supabaseAdmin.from("student_subscriptions").upsert(
      {
        user_id: targetUserId,
        plan_code: normalizedPlan,
        status: "active",
        starts_at: new Date().toISOString(),
        expires_at: expiresAt,
        source: "admin_grant",
        granted_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    await supabaseAdmin.from("student_notifications").insert({
      user_id: targetUserId,
      title: `TRALIX Pro Access Granted (${days} Days)`,
      body: `An administrator granted your account ${days}-day TRALIX Pro access! Enjoy unlimited AI Photo Tutor, CBT mocks, and full courses.`,
      category: "system",
      action_url: "/dashboard/upgrade",
      is_read: false,
    });

    await supabaseAdmin.from("admin_audit_logs").insert({
      admin_user_id: user.id,
      action_type: "grant_student_subscription",
      target_type: "student_subscriptions",
      target_id: targetUserId,
      summary: `Granted ${days}-day TRALIX Pro pass (${normalizedPlan}) to user ${targetUserId}`,
      details: { targetUserId, planCode: normalizedPlan, days, expiresAt },
    });

    return jsonResponse({ ok: true, expiresAt });
  }

  return jsonResponse({ ok: false, error: `Unknown action: ${action}` }, 400);
});
