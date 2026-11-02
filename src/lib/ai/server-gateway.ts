import "server-only";

export interface ServerAiCompletionParams {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  maxTokens: number;
  temperature?: number;
  preferredProvider?: "openai" | "openrouter";
  defaultModel?: string;
  fallbackModel?: string;
  jsonMode?: boolean;
}

export interface ServerAiCompletionResult {
  content: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export function getConfiguredAiProvidersStatus(): {
  hasOpenAi: boolean;
  hasOpenRouter: boolean;
  hasOpenRouterFallback: boolean;
  anyConfigured: boolean;
} {
  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY?.trim());
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  const hasOpenRouterFallback = Boolean(
    process.env.OPENROUTER_API_KEY_FALLBACK?.trim()
  );
  return {
    hasOpenAi,
    hasOpenRouter,
    hasOpenRouterFallback,
    anyConfigured: hasOpenAi || hasOpenRouter || hasOpenRouterFallback,
  };
}

export async function runServerProviderCompletion(
  params: ServerAiCompletionParams
): Promise<ServerAiCompletionResult> {
  const openAiKey = process.env.OPENAI_API_KEY?.trim() || "";
  const openRouterPrimary = process.env.OPENROUTER_API_KEY?.trim() || "";
  const openRouterFallback =
    process.env.OPENROUTER_API_KEY_FALLBACK?.trim() || "";

  const defaultModel =
    params.defaultModel || process.env.AI_DEFAULT_MODEL || "gpt-4o-mini";
  const fallbackModel =
    params.fallbackModel ||
    process.env.AI_FALLBACK_MODEL ||
    process.env.OPENROUTER_DEFAULT_MODEL ||
    "openai/gpt-4o-mini";
  const boundedMaxTokens = Math.min(Math.max(Number(params.maxTokens || 1100), 128), 2048);

  type Candidate = {
    provider: string;
    url: string;
    apiKey: string;
    model: string;
    extraHeaders?: Record<string, string>;
  };

  const candidates: Candidate[] = [];
  const addOpenAi = () => {
    if (openAiKey) {
      candidates.push({
        provider: "openai",
        url: "https://api.openai.com/v1/chat/completions",
        apiKey: openAiKey,
        model: defaultModel.includes("/") ? "gpt-4o-mini" : defaultModel,
      });
    }
  };
  const addOpenRouter = () => {
    if (openRouterPrimary) {
      candidates.push({
        provider: "openrouter",
        url: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: openRouterPrimary,
        model: fallbackModel,
        extraHeaders: {
          "HTTP-Referer": "https://elearning.tralix.ai",
          "X-Title": "E-LEARNING ECOSYSTEM",
        },
      });
    }
    if (openRouterFallback && openRouterFallback !== openRouterPrimary) {
      candidates.push({
        provider: "openrouter-fallback",
        url: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: openRouterFallback,
        model: fallbackModel,
        extraHeaders: {
          "HTTP-Referer": "https://elearning.tralix.ai",
          "X-Title": "E-LEARNING ECOSYSTEM",
        },
      });
    }
  };

  if (params.preferredProvider === "openrouter") {
    addOpenRouter();
    addOpenAi();
  } else {
    addOpenAi();
    addOpenRouter();
  }

  if (candidates.length === 0) {
    throw new Error("AI_PROVIDER_NOT_CONFIGURED");
  }

  let sawTransportFailure = false;
  let lastError = "ALL_PROVIDERS_FAILED";

  for (const cand of candidates) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const bodyPayload: Record<string, unknown> = {
        model: cand.model,
        messages: params.messages,
        max_tokens: boundedMaxTokens,
        temperature: params.temperature ?? 0.4,
      };
      if (params.jsonMode) {
        bodyPayload.response_format = { type: "json_object" };
      }

      const resp = await fetch(cand.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cand.apiKey}`,
          "Content-Type": "application/json",
          ...(cand.extraHeaders || {}),
        },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!resp.ok) {
        lastError = `${cand.provider}_HTTP_${resp.status}`;
        continue;
      }

      const json = await resp.json();
      const content = String(json?.choices?.[0]?.message?.content || "").trim();
      if (!content) {
        lastError = `${cand.provider}_EMPTY`;
        continue;
      }

      return {
        content,
        provider: cand.provider,
        model: String(json?.model || cand.model),
        promptTokens: Number(json?.usage?.prompt_tokens || 0),
        completionTokens: Number(json?.usage?.completion_tokens || 0),
        totalTokens: Number(json?.usage?.total_tokens || 0),
      };
    } catch (err) {
      sawTransportFailure = true;
      lastError =
        err instanceof Error ? `${cand.provider}:${err.message}` : String(err);
    }
  }

  if (sawTransportFailure) {
    throw new Error(`NETWORK_TRANSPORT:${lastError}`);
  }
  throw new Error(lastError);
}
