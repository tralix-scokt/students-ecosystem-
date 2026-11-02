import "server-only";

export type AiMessageContentPart =
  | { type: "text"; text: string }
  | {
      type: "image_url";
      image_url: { url: string; detail?: "auto" | "low" | "high" };
    };

export interface AiChatMessage {
  role: "system" | "user" | "assistant";
  content: string | AiMessageContentPart[];
}

export interface AiCompletionResult {
  content: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  webCitations?: Array<{ title: string; url: string }>;
}

export function getConfiguredAiProvidersStatus(): {
  hasOpenAi: boolean;
  hasOpenRouter: boolean;
  hasOpenRouterFallback: boolean;
} {
  return {
    hasOpenAi: Boolean((process.env.OPENAI_API_KEY || "").trim()),
    hasOpenRouter: Boolean((process.env.OPENROUTER_API_KEY || "").trim()),
    hasOpenRouterFallback: Boolean(
      (process.env.OPENROUTER_API_KEY_FALLBACK || "").trim()
    ),
  };
}

interface ProviderCandidate {
  provider: string;
  url: string;
  apiKey: string;
  model: string;
  extraHeaders?: Record<string, string>;
  extraBody?: Record<string, unknown>;
}

/**
 * Server-only AI provider execution chain.
 * API keys are read strictly from process.env on the server and NEVER serialized to client bundles.
 * Supports text, multimodal vision (`image_url` data URLs on gpt-4o-mini), and optional OpenRouter live web search.
 */
export async function runServerProviderCompletion(params: {
  messages: AiChatMessage[];
  maxTokens?: number;
  temperature?: number;
  preferredProvider?: string;
  defaultModel?: string;
  fallbackModel?: string;
  jsonMode?: boolean;
  preferLiveWebSearch?: boolean;
}): Promise<AiCompletionResult> {
  const openAiKey = (process.env.OPENAI_API_KEY || "").trim();
  const openRouterPrimary = (process.env.OPENROUTER_API_KEY || "").trim();
  const openRouterFallback = (
    process.env.OPENROUTER_API_KEY_FALLBACK || ""
  ).trim();

  const boundedTokens = Math.min(
    Math.max(Math.round(params.maxTokens || 1600), 128),
    2048
  );
  const temperature =
    typeof params.temperature === "number" ? params.temperature : 0.35;
  const preferredProvider =
    params.preferredProvider || process.env.AI_PRIMARY_PROVIDER || "openai";
  const defaultModel =
    params.defaultModel || process.env.AI_DEFAULT_MODEL || "gpt-4o-mini";
  const fallbackModel =
    params.fallbackModel ||
    process.env.AI_FALLBACK_MODEL ||
    "openai/gpt-4o-mini";

  const candidates: ProviderCandidate[] = [];

  const pushOpenRouterLiveWeb = () => {
    if (!params.preferLiveWebSearch || params.jsonMode) return;
    if (openRouterPrimary) {
      candidates.push({
        provider: "openrouter-live-web",
        url: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: openRouterPrimary,
        model: fallbackModel,
        extraHeaders: {
          "HTTP-Referer": "https://students-ecosystem.vercel.app",
          "X-Title": "Students Ecosystem",
        },
        extraBody: {
          plugins: [{ id: "web", max_results: 4 }],
        },
      });
    }
  };

  const pushOpenAi = () => {
    if (openAiKey) {
      candidates.push({
        provider: "openai",
        url: "https://api.openai.com/v1/chat/completions",
        apiKey: openAiKey,
        model: defaultModel.includes("/") ? "gpt-4o-mini" : defaultModel,
      });
    }
  };

  const pushOpenRouter = () => {
    if (openRouterPrimary) {
      candidates.push({
        provider: "openrouter",
        url: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: openRouterPrimary,
        model: fallbackModel,
        extraHeaders: {
          "HTTP-Referer": "https://students-ecosystem.vercel.app",
          "X-Title": "Students Ecosystem",
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
          "HTTP-Referer": "https://students-ecosystem.vercel.app",
          "X-Title": "Students Ecosystem",
        },
      });
    }
  };

  pushOpenRouterLiveWeb();

  if (preferredProvider === "openrouter") {
    pushOpenRouter();
    pushOpenAi();
  } else {
    pushOpenAi();
    pushOpenRouter();
  }

  if (candidates.length === 0) {
    throw new Error("AI_PROVIDER_NOT_CONFIGURED");
  }

  let lastError = "ALL_PROVIDERS_FAILED";
  let sawTransportFailure = false;
  let sawHttpFailure = false;

  for (const cand of candidates) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 28000);
      const bodyPayload: Record<string, unknown> = {
        model: cand.model,
        messages: params.messages,
        max_tokens: boundedTokens,
        temperature,
        ...(cand.extraBody || {}),
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
      clearTimeout(timeout);

      if (!resp.ok) {
        sawHttpFailure = true;
        lastError = `${cand.provider}_HTTP_${resp.status}`;
        continue;
      }

      const data = await resp.json();
      const messageObj = data?.choices?.[0]?.message;
      const content = String(messageObj?.content ?? "").trim();
      if (!content) {
        sawHttpFailure = true;
        lastError = `${cand.provider}_EMPTY_RESPONSE`;
        continue;
      }

      const webCitations: Array<{ title: string; url: string }> = [];
      const annotations = Array.isArray(messageObj?.annotations)
        ? messageObj.annotations
        : [];
      for (const ann of annotations) {
        const cite = ann?.url_citation || ann;
        const url = String(cite?.url || "").trim();
        const title = String(cite?.title || url).trim();
        if (
          url.startsWith("http") &&
          !webCitations.some((w) => w.url === url)
        ) {
          webCitations.push({ title: title.slice(0, 90), url });
        }
      }

      return {
        content,
        provider: cand.provider,
        model: String(data?.model || cand.model),
        promptTokens: Number(data?.usage?.prompt_tokens || 0),
        completionTokens: Number(data?.usage?.completion_tokens || 0),
        totalTokens: Number(data?.usage?.total_tokens || 0),
        webCitations,
      };
    } catch (err) {
      sawTransportFailure = true;
      lastError =
        err instanceof Error ? `${cand.provider}:${err.message}` : String(err);
    }
  }

  if (sawTransportFailure && !sawHttpFailure) {
    throw new Error(`NETWORK_TRANSPORT:${lastError}`);
  }
  throw new Error(lastError);
}
