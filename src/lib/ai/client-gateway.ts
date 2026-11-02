import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export interface AiGatewayResponse {
  ok: boolean;
  error?: string;
  conversationId?: string;
  reply?: string;
  content?: string;
  suggestedQuestions?: string[];
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
 * 1. Calls Next.js `/api/ai/gateway` for server-side validation, rate-limiting,
 *    and provider completion.
 * 2. When container outbound HTTPS is restricted (e.g., sandbox preview),
 *    seamlessly invokes the live Supabase Edge Function `ai-gateway` using the
 *    learner's authenticated JWT so zero AI API keys ever touch client code.
 */
export async function invokeAiGateway(
  payload: Record<string, unknown>
): Promise<AiGatewayResponse> {
  try {
    const res = await fetch("/api/ai/gateway", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = (await res.json()) as AiGatewayResponse & {
      transportFallback?: boolean;
    };

    if (!json.transportFallback) {
      return json;
    }
  } catch {
    // Proceed to authenticated Supabase Edge Function gateway
  }

  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      error: "Supabase client is not configured.",
    };
  }

  const { data, error } = await supabase.functions.invoke("ai-gateway", {
    body: payload,
  });

  if (error) {
    return {
      ok: false,
      error:
        error.message ||
        "The AI study service is temporarily unreachable. Please retry in a moment.",
    };
  }

  return (data as AiGatewayResponse) || {
    ok: false,
    error: "Empty response from AI gateway.",
  };
}
