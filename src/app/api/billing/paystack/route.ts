import { NextResponse } from "next/server";
import {
  createBoundedFetch,
  getSupabasePublicConfig,
  isNetworkTransportError,
} from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const pubCfg = getSupabasePublicConfig();
  if (!pubCfg) {
    return NextResponse.json(
      { ok: false, error: "Supabase environment is not configured." },
      { status: 503 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  let authHeader = request.headers.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    const supabase = await createServerSupabaseClient({ timeoutMs: 3500 });
    if (supabase) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) {
          authHeader = `Bearer ${data.session.access_token}`;
        }
      } catch {
        // Fall through
      }
    }
  }

  if (!authHeader) {
    return NextResponse.json(
      { ok: false, error: "Authentication required." },
      { status: 401 }
    );
  }

  try {
    const boundedFetch = createBoundedFetch(12000);
    const upstream = await boundedFetch(
      `${pubCfg.url}/functions/v1/paystack-billing`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: pubCfg.anonKey,
          Authorization: authHeader,
        },
        body: JSON.stringify(body),
      }
    );

    const json = (await upstream.json().catch(() => ({
      ok: false,
      error: "Invalid billing gateway response.",
    }))) as Record<string, unknown>;

    return NextResponse.json(json, {
      status: upstream.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    if (isNetworkTransportError(err)) {
      return NextResponse.json({ ok: false, transportFallback: true });
    }
    return NextResponse.json(
      {
        ok: false,
        error:
          "Unable to reach the Paystack billing service right now. Please retry shortly.",
      },
      { status: 502 }
    );
  }
}
