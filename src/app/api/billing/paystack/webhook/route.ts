import { NextResponse } from "next/server";
import {
  createBoundedFetch,
  getSupabasePublicConfig,
} from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

/**
 * Branded Paystack Webhook Endpoint:
 * POST https://students-ecosystem.vercel.app/api/billing/paystack/webhook
 *
 * Preserves the exact raw request body and `x-paystack-signature` HMAC-SHA512 header,
 * forwarding directly to the `paystack-billing` Edge Function for cryptographic
 * signature verification and idempotent subscription fulfillment.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("x-paystack-signature") || "";
  if (!signature) {
    return NextResponse.json(
      { ok: false, error: "Missing x-paystack-signature header." },
      { status: 401 }
    );
  }

  const pubCfg = getSupabasePublicConfig();
  if (!pubCfg) {
    return NextResponse.json(
      { ok: false, error: "Supabase configuration missing." },
      { status: 503 }
    );
  }

  const rawBody = await request.text();

  try {
    const boundedFetch = createBoundedFetch(12000);
    const upstream = await boundedFetch(
      `${pubCfg.url}/functions/v1/paystack-billing`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: pubCfg.anonKey,
          "x-paystack-signature": signature,
        },
        body: rawBody,
      }
    );

    const json = (await upstream.json().catch(() => ({
      ok: upstream.ok,
    }))) as Record<string, unknown>;

    return NextResponse.json(json, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Webhook upstream unreachable." },
      { status: 502 }
    );
  }
}
