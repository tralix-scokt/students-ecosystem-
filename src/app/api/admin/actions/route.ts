import { NextResponse } from "next/server";
import { getConfiguredAiProvidersStatus } from "@/lib/ai/server-gateway";
import {
  checkRateLimit,
  extractClientIdentifier,
} from "@/lib/security/rateLimiter";
import {
  getSupabasePublicConfig,
  isNetworkTransportError,
} from "@/lib/supabase/config";
import {
  createServerSupabaseClient,
  getServerAuthenticatedUser,
} from "@/lib/supabase/server";

export async function GET(request: Request) {
  const clientId = extractClientIdentifier(request.headers);
  const rate = checkRateLimit("admin-mutation", clientId);
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: "Rate limit exceeded." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  const { user, isEmailVerified } = await getServerAuthenticatedUser();
  if (!user || !isEmailVerified) {
    return NextResponse.json(
      { ok: false, error: "Authentication required." },
      { status: 401 }
    );
  }

  const supabase = await createServerSupabaseClient({ timeoutMs: 2500 });
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase client unavailable." },
      { status: 503 }
    );
  }

  // Strictly fail-closed: never return server diagnostic booleans unless
  // profiles.role === "admin" is positively verified on the server.
  try {
    const { data: prof, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      if (isNetworkTransportError(error)) {
        return NextResponse.json(
          { ok: false, error: "Admin verification temporarily unreachable." },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { ok: false, error: "Forbidden: Administrator role required." },
        { status: 403 }
      );
    }

    if (!prof || prof.role !== "admin") {
      return NextResponse.json(
        { ok: false, error: "Forbidden: Administrator role required." },
        { status: 403 }
      );
    }
  } catch (err) {
    if (isNetworkTransportError(err)) {
      return NextResponse.json(
        { ok: false, error: "Admin verification temporarily unreachable." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "Forbidden." },
      { status: 403 }
    );
  }

  const aiProviders = getConfiguredAiProvidersStatus();
  const hasSmtp = Boolean(
    process.env.SMTP_HOST?.trim() || process.env.RESEND_API_KEY?.trim()
  );
  const hasWebPush = Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim()
  );

  return NextResponse.json(
    {
      ok: true,
      health: {
        supabasePublicConfigured: Boolean(getSupabasePublicConfig()),
        aiOpenAiConfigured: aiProviders.hasOpenAi,
        aiOpenRouterConfigured: aiProviders.hasOpenRouter,
        aiFallbackConfigured: aiProviders.hasOpenRouterFallback,
        smtpEmailConfigured: hasSmtp,
        webPushConfigured: hasWebPush,
        checkedAt: new Date().toISOString(),
      },
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function POST(request: Request) {
  const clientId = extractClientIdentifier(request.headers);
  const rate = checkRateLimit("admin-mutation", clientId);
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: "Rate limit exceeded." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  const { user, isEmailVerified } = await getServerAuthenticatedUser();
  if (!user || !isEmailVerified) {
    return NextResponse.json(
      { ok: false, error: "Authentication required." },
      { status: 401 }
    );
  }

  const supabase = await createServerSupabaseClient({ timeoutMs: 3000 });
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase client unavailable." },
      { status: 503 }
    );
  }

  try {
    const { data: prof, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (error && isNetworkTransportError(error)) {
      return NextResponse.json({ ok: true, delegateToBrowserRls: true });
    }
    if (error || !prof || prof.role !== "admin") {
      return NextResponse.json(
        { ok: false, error: "Forbidden: Administrator role required." },
        { status: 403 }
      );
    }

    return NextResponse.json({ ok: true, authorizedAdmin: true });
  } catch (err) {
    if (isNetworkTransportError(err)) {
      return NextResponse.json({ ok: true, delegateToBrowserRls: true });
    }
    return NextResponse.json(
      { ok: false, error: "Authorization check failed." },
      { status: 403 }
    );
  }
}
