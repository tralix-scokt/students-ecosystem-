import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export interface AiGatewayResponse {
  ok: boolean;
  error?: string;
  code?: string;
  conversationId?: string;
  reply?: string;
  content?: string;
  suggestedQuestions?: string[];
  liveSources?: Array<{ title: string; url: string }>;
  usedLiveWeb?: boolean;
  questions?: Array<Record<string, unknown>>;
  provider?: string;
  model?: string;
  isAiGenerated?: boolean;
  isVerifiedEducationalMaterial?: boolean;
  isOfficialExaminerMarking?: boolean;
  remainingDailyQuota?: number;
}

/**
 * Invokes the server-side AI gateway.
 * 1. Calls Next.js `/api/ai/gateway` with both session cookies and `Authorization: Bearer <jwt>`
 *    (so embedded iframes and Safari ITP work reliably) for server-side validation,
 *    rate-limiting, and provider completion.
 * 2. When container outbound HTTPS is restricted (e.g., sandbox preview) or a serverless
 *    gateway error occurs, seamlessly fails over to the live Supabase Edge Function `ai-gateway`
 *    using the learner's authenticated JWT so zero AI API keys ever touch client code.
 */
export async function invokeAiGateway(
  payload: Record<string, unknown>
): Promise<AiGatewayResponse> {
  const supabase = createBrowserSupabaseClient();
  let accessToken = "";

  if (supabase?.auth && typeof supabase.auth.getSession === "function") {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      accessToken = sessionData?.session?.access_token || "";
    } catch {
      accessToken = "";
    }
  }

  let primaryErrorResult: AiGatewayResponse | null = null;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const res = await fetch("/api/ai/gateway", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const json = (await res.json()) as AiGatewayResponse & {
      transportFallback?: boolean;
    };

    if (res.ok && json?.ok) {
      return json;
    }

    const isPausedByAdmin =
      res.status === 503 &&
      typeof json?.error === "string" &&
      json.error.toLowerCase().includes("paused");

    // Definitive client/validation/quota/admin-pause responses should return directly
    if (
      !json?.transportFallback &&
      (res.status === 400 ||
        res.status === 403 ||
        res.status === 429 ||
        isPausedByAdmin ||
        (res.status === 401 && !accessToken))
    ) {
      return json;
    }

    if (!json?.transportFallback) {
      primaryErrorResult = json;
    }
  } catch {
    // Network or non-JSON gateway failure -> proceed to Supabase Edge Function failover
  }

  if (!supabase) {
    return (
      primaryErrorResult || {
        ok: false,
        error: "Supabase client is not configured.",
      }
    );
  }

  try {
    const { data, error } = await supabase.functions.invoke("ai-gateway", {
      body: payload,
    });

    if (error) {
      let friendlyMsg = "";
      const errWithCtx = error as unknown as {
        message?: string;
        context?: { json?: () => Promise<Record<string, unknown>> };
      };
      if (errWithCtx?.context && typeof errWithCtx.context.json === "function") {
        try {
          const errBody = await errWithCtx.context.json();
          if (typeof errBody?.error === "string" && errBody.error.trim()) {
            friendlyMsg = errBody.error.trim();
          }
        } catch {
          // Ignore body parse failure
        }
      }

      return (
        (friendlyMsg ? { ok: false, error: friendlyMsg } : null) ||
        primaryErrorResult || {
          ok: false,
          error:
            errWithCtx?.message ||
            "The AI study service is temporarily unreachable. Please retry in a moment.",
        }
      );
    }

    if (data && typeof data === "object") {
      return data as AiGatewayResponse;
    }
  } catch {
    // Fall through to structured error
  }

  return (
    primaryErrorResult || {
      ok: false,
      error: "The AI study service is momentarily unavailable. Please retry in a moment.",
    }
  );
}
