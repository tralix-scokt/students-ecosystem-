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

export const FREE_VISION_MODELS = [
  "openrouter/free",
  "dots-studio/dots-3-note-preview:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3.5-super-vl:free",
  "thinkingmachines/inkling-small:free",
] as const;

export const FREE_TEXT_MODELS = [
  "openrouter/free",
  "cohere/north-mini-code:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3.5-lightning:free",
  "thinkingmachines/inkling-small:free",
] as const;

export function extractAiJsonPayload(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(
        candidate.slice(firstBrace, lastBrace + 1)
      ) as Record<string, unknown>;
    }
    throw new Error("INVALID_AI_JSON_OUTPUT");
  }
}

export function normalizeMessagesForModel(
  messages: AiChatMessage[],
  model: string,
  isFreeOrGemma: boolean
): AiChatMessage[] {
  const cleaned: AiChatMessage[] = messages.map((m) => {
    if (!Array.isArray(m.content)) return m;
    return {
      ...m,
      content: m.content.map((part) => {
        if (part.type === "image_url" && model !== "gpt-4o-mini") {
          return {
            type: "image_url" as const,
            image_url: { url: part.image_url.url },
          };
        }
        return part;
      }),
    };
  });

  if (
    isFreeOrGemma &&
    cleaned.length >= 2 &&
    cleaned[0].role === "system" &&
    typeof cleaned[0].content === "string"
  ) {
    const sysText = cleaned[0].content;
    const rest = cleaned.slice(1);
    const firstUserIdx = rest.findIndex((m) => m.role === "user");
    if (firstUserIdx !== -1) {
      const target = rest[firstUserIdx];
      const mergedUser: AiChatMessage = Array.isArray(target.content)
        ? {
            role: "user",
            content: target.content.map((part, idx) =>
              idx === 0 && part.type === "text"
                ? {
                    type: "text" as const,
                    text: `[System Instructions]\n${sysText}\n\n[Student Question]\n${part.text}`,
                  }
                : part
            ),
          }
        : {
            role: "user",
            content: `[System Instructions]\n${sysText}\n\n[Student Question]\n${target.content}`,
          };
      return [
        ...rest.slice(0, firstUserIdx),
        mergedUser,
        ...rest.slice(firstUserIdx + 1),
      ];
    }
  }

  return cleaned;
}

interface ProviderCandidate {
  provider: string;
  url: string;
  apiKey: string;
  model: string;
  maxTokensOverride?: number;
  isFreeModel?: boolean;
  extraHeaders?: Record<string, string>;
  extraBody?: Record<string, unknown>;
}

/**
 * Server-only AI provider execution chain.
 * API keys are read strictly from process.env on the server and NEVER serialized to client bundles.
 * Supports text, multimodal vision (`image_url` data URLs), OpenRouter `$0.00` `:free` model cascades,
 * and optional OpenRouter live web search.
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

  const hasImage = params.messages.some(
    (m) =>
      Array.isArray(m.content) &&
      m.content.some((part) => part.type === "image_url")
  );

  const configuredIsFree =
    fallbackModel.endsWith(":free") || fallbackModel === "openrouter/free";

  const orHeaders = {
    "HTTP-Referer": "https://students-ecosystem.vercel.app",
    "X-Title": "Students Ecosystem",
  };

  const candidates: ProviderCandidate[] = [];

  const pushOpenRouterLiveWeb = () => {
    if (!params.preferLiveWebSearch || params.jsonMode || configuredIsFree) {
      return;
    }
    if (openRouterPrimary) {
      candidates.push({
        provider: "openrouter-live-web",
        url: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: openRouterPrimary,
        model: fallbackModel,
        maxTokensOverride: Math.min(boundedTokens, 900),
        extraHeaders: orHeaders,
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

  const pushOpenRouterPaid = () => {
    if (configuredIsFree) return;
    if (openRouterPrimary) {
      candidates.push({
        provider: "openrouter",
        url: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: openRouterPrimary,
        model: fallbackModel,
        maxTokensOverride: Math.min(boundedTokens, 900),
        extraHeaders: orHeaders,
      });
    }
    if (openRouterFallback && openRouterFallback !== openRouterPrimary) {
      candidates.push({
        provider: "openrouter-fallback",
        url: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: openRouterFallback,
        model: fallbackModel,
        maxTokensOverride: Math.min(boundedTokens, 900),
        extraHeaders: orHeaders,
      });
    }
  };

  const pushOpenRouterFreeCascade = () => {
    const orKeys = [openRouterPrimary, openRouterFallback].filter(
      (k, idx, arr) => Boolean(k) && arr.indexOf(k) === idx
    );
    if (orKeys.length === 0) return;

    const basePool: readonly string[] = hasImage
      ? FREE_VISION_MODELS
      : FREE_TEXT_MODELS;
    const orderedModels = configuredIsFree
      ? [fallbackModel, ...basePool.filter((m) => m !== fallbackModel)]
      : [...basePool];

    for (let i = 0; i < orderedModels.length; i += 1) {
      const modelId = orderedModels[i];
      const apiKey = orKeys[i % orKeys.length];
      candidates.push({
        provider: "openrouter-free",
        url: "https://openrouter.ai/api/v1/chat/completions",
        apiKey,
        model: modelId,
        isFreeModel: true,
        extraHeaders: orHeaders,
      });
    }

    if (orKeys.length > 1) {
      candidates.push({
        provider: "openrouter-free-backup",
        url: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: orKeys[1],
        model: "openrouter/free",
        isFreeModel: true,
        extraHeaders: orHeaders,
      });
    }
  };

  pushOpenRouterLiveWeb();

  if (preferredProvider === "openrouter") {
    if (configuredIsFree) {
      pushOpenRouterFreeCascade();
      pushOpenAi();
    } else {
      pushOpenRouterPaid();
      pushOpenAi();
      pushOpenRouterFreeCascade();
    }
  } else {
    pushOpenAi();
    pushOpenRouterPaid();
    pushOpenRouterFreeCascade();
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
      const timeout = setTimeout(
        () => controller.abort(),
        cand.isFreeModel ? 24000 : 18000
      );
      const isGemmaOrFree =
        Boolean(cand.isFreeModel) ||
        cand.model.startsWith("google/gemma") ||
        cand.model === "openrouter/free";

      const preparedMessages = normalizeMessagesForModel(
        params.messages,
        cand.model,
        isGemmaOrFree
      );

      const bodyPayload: Record<string, unknown> = {
        model: cand.model,
        messages: preparedMessages,
        max_tokens: cand.maxTokensOverride || boundedTokens,
        temperature,
        ...(cand.extraBody || {}),
      };
      if (params.jsonMode && !cand.isFreeModel) {
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
