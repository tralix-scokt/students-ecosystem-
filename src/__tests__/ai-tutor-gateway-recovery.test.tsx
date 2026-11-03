import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invokeAiGateway } from "@/lib/ai/client-gateway";
import {
  extractAiJsonPayload,
  normalizeMessagesForModel,
  runServerProviderCompletion,
} from "@/lib/ai/server-gateway";
import { normalizeTutorMathNotation } from "@/lib/ai/visualTeaching";

vi.mock("server-only", () => ({}));

const mockBrowserGetSession = vi.fn();
const mockFunctionsInvoke = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      getSession: () => mockBrowserGetSession(),
    },
    functions: {
      invoke: (...args: unknown[]) => mockFunctionsInvoke(...args),
    },
  }),
}));

describe("AI Tutor Gateway Recovery, Zero-Cost OpenRouter Cascade & Math Normalization", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: "test-oa-server-token",
      OPENROUTER_API_KEY: "test-or-primary-token",
      OPENROUTER_API_KEY_FALLBACK: "test-or-fallback-token",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it("1. Cascades past OpenAI 429 and paid OpenRouter 402 directly to $0.00 openrouter-free models", async () => {
    const fetchMock = vi
      .fn()
      // 1) OpenAI quota exceeded (429)
      .mockResolvedValueOnce(new Response("Quota exceeded", { status: 429 }))
      // 2) Paid OpenRouter primary (402 Payment Required)
      .mockResolvedValueOnce(new Response("Insufficient credits", { status: 402 }))
      // 3) Paid OpenRouter fallback (402 Payment Required)
      .mockResolvedValueOnce(new Response("Insufficient credits", { status: 402 }))
      // 4) Free OpenRouter router succeeds!
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            model: "cohere/north-mini-code:free",
            choices: [
              {
                message: {
                  content:
                    "### Everyday Intuition\nVoltage pushes current through resistance: V = I × R.",
                },
              },
            ],
            usage: { prompt_tokens: 55, completion_tokens: 35, total_tokens: 90 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await runServerProviderCompletion({
      messages: [
        { role: "system", content: "You are a Physics teacher." },
        { role: "user", content: "Explain Ohm's Law" },
      ],
      preferredProvider: "openai",
      fallbackModel: "openai/gpt-4o-mini",
    });

    expect(result.provider).toBe("openrouter-free");
    expect(result.model).toBe("cohere/north-mini-code:free");
    expect(result.content).toContain("V = I × R");
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("2. Routes on the very first hop when preferredProvider is openrouter and fallbackModel is openrouter/free", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          model: "dots-studio/dots-3-note-preview:free",
          choices: [
            {
              message: {
                content:
                  "The photo shows the linear equation 3x + 5 = 20, so x = 5.",
              },
            },
          ],
          usage: { prompt_tokens: 80, completion_tokens: 24, total_tokens: 104 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await runServerProviderCompletion({
      messages: [
        { role: "system", content: "Inspect the attached photo." },
        {
          role: "user",
          content: [
            { type: "text", text: "Solve this photo" },
            {
              type: "image_url",
              image_url: {
                url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFElEQVR42mP8z8AARIQB46hGAA0AD/8P8W6b4w8AAAAASUVORK5CYII=",
                detail: "high",
              },
            },
          ],
        },
      ],
      preferredProvider: "openrouter",
      fallbackModel: "openrouter/free",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.provider).toBe("openrouter-free");
    expect(result.model).toBe("dots-studio/dots-3-note-preview:free");

    const sentBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(sentBody.model).toBe("openrouter/free");
    // System message merged into first user turn & image_url detail stripped for free multimodal compatibility
    expect(sentBody.messages).toHaveLength(1);
    expect(sentBody.messages[0].role).toBe("user");
    expect(sentBody.messages[0].content[1].image_url).toEqual({
      url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFElEQVR42mP8z8AARIQB46hGAA0AD/8P8W6b4w8AAAAASUVORK5CYII=",
    });
  });

  it("3. Normalizes Gemma/free messages and extracts fenced JSON payloads reliably", () => {
    const normalized = normalizeMessagesForModel(
      [
        { role: "system", content: "Follow classroom rules." },
        { role: "user", content: "What is photosynthesis?" },
      ],
      "google/gemma-4-31b-it:free",
      true
    );
    expect(normalized).toHaveLength(1);
    expect(normalized[0].role).toBe("user");
    expect(String(normalized[0].content)).toContain("Follow classroom rules.");
    expect(String(normalized[0].content)).toContain("What is photosynthesis?");

    const parsed = extractAiJsonPayload(
      'Here are your questions:\n```json\n{"questions":[{"prompt":"2 + 2 = ?","correctOptionKey":"B"}]}\n```'
    );
    expect(Array.isArray(parsed.questions)).toBe(true);
    expect((parsed.questions as Array<{ prompt: string }>)[0].prompt).toBe(
      "2 + 2 = ?"
    );
  });

  it("4. Forwards Bearer token from client-gateway and fails over cleanly to Supabase Edge Function on 503/transport errors", async () => {
    mockBrowserGetSession.mockResolvedValue({
      data: { session: { access_token: "jwt-live-learner-token" } },
    });

    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({ ok: false, error: "Temporary gateway timeout" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      )
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    mockFunctionsInvoke.mockResolvedValueOnce({
      data: {
        ok: true,
        conversationId: "conv-edge-1",
        reply: "Step-by-step explanation from Edge Function failover.",
        provider: "openrouter-free",
      },
      error: null,
    });

    const res = await invokeAiGateway({
      action: "tutor_chat",
      message: "Explain Newton's Second Law",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const reqInit = fetchMock.mock.calls[0][1] as RequestInit;
    expect((reqInit.headers as Record<string, string>).Authorization).toBe(
      "Bearer jwt-live-learner-token"
    );
    expect(mockFunctionsInvoke).toHaveBeenCalledWith("ai-gateway", {
      body: { action: "tutor_chat", message: "Explain Newton's Second Law" },
    });
    expect(res.ok).toBe(true);
    expect(res.reply).toContain("Edge Function failover");
  });

  it("5. Converts LaTeX math delimiters into clean classroom Unicode math without touching code blocks", () => {
    const raw =
      "We solve \\( 3x + 5 = 20 \\) and get:\n\\[\nx = \\frac{15}{3} = 5\n\\]\nWith resistance \\( R = 12 \\Omega \\) and area \\( r^2 \\).\n```python\nprint('\\(keep literal\\)')\n```";
    const formatted = normalizeTutorMathNotation(raw);
    expect(formatted).toContain("3x + 5 = 20");
    expect(formatted).toContain("(15)/(3) = 5");
    expect(formatted).toContain("R = 12 Ω");
    expect(formatted).toContain("r²");
    expect(formatted).not.toContain("\\( 3x");
    expect(formatted).toContain("print('\\(keep literal\\)')");
  });
});
