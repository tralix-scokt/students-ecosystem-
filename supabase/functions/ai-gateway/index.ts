// Supabase Edge Function: ai-gateway
// Provider-independent server-side AI gateway for E-LEARNING ECOSYSTEM (Powered by TRALIX AI)
// Never exposes OPENAI_API_KEY or OPENROUTER_API_KEY to clients.

import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_MODES = new Set([
  "explain_topic",
  "solve_step_by_step",
  "practice_questions",
  "simplify_concept",
  "revision_assistant",
  "study_coach",
]);

const UNSAFE_PATTERNS = [
  /\b(how\s+to\s+(make|build|construct|assemble)\s+(?:a\s+|an\s+|the\s+)?(bomb|explosive|weapon))\b/i,
  /\b(commit\s+suicide|suicide\s+methods?|suicidal|kill\s+myself|end\s+my\s+life|self[- ]harm\s+methods?)\b/i,
  /\b(explicit\s+sexual|pornograph)/i,
  /\b(hack\s+into|steal\s+passwords|bypass\s+live\s+exam\s+proctoring)\b/i,
  /\b(ignore\s+(all\s+)?(previous|prior|system)\s+(safety\s+)?instructions)\b/i,
];

function evaluatePromptSafety(input: string): { safe: boolean; reason?: string } {
  const trimmed = input.trim();
  if (trimmed.length < 2) {
    return {
      safe: false,
      reason: "Please enter at least 2 characters for your question.",
    };
  }
  if (trimmed.length > 4000) {
    return {
      safe: false,
      reason: "Your message exceeds the 4,000-character limit. Please shorten it.",
    };
  }
  for (const pat of UNSAFE_PATTERNS) {
    if (pat.test(trimmed)) {
      return {
        safe: false,
        reason:
          "TRALIX AI Tutor only supports safe, age-appropriate educational questions and academic study.",
      };
    }
  }
  return { safe: true };
}

const MODE_INSTRUCTIONS: Record<string, string> = {
  explain_topic:
    "Mode: EXPLAIN A TOPIC. Teach like a warm classroom teacher: everyday intuition first, step-by-step principles/formulas, a labeled diagram/picture when helpful, one worked example, and a quick check question.",
  solve_step_by_step:
    "Mode: SOLVE A PROBLEM STEP BY STEP. Break the solution into numbered whiteboard steps, explain every formula/unit in plain words, sketch a diagram when helpful, and highlight common exam traps.",
  practice_questions:
    "Mode: PRACTICE QUESTIONS. Generate 3 progressive practice questions (Easy, Medium, Challenging) tailored to the student's level, followed by clear step-by-step teacher solutions.",
  simplify_concept:
    "Mode: SIMPLIFY DIFFICULT CONCEPTS. Answer basic or complex questions in simple everyday language and relatable analogies first, with visual aids when helpful, then connect back to formal terms.",
  revision_assistant:
    "Mode: REVISION ASSISTANT. Summarize high-yield points, visual comparison charts, memory anchors, key formulas, and rapid self-test checkpoints.",
  study_coach:
    "Mode: STUDY COACH. Help the learner organize realistic study blocks, overcome procrastination, prioritize weak topics, and build sustainable exam habits.",
};

function isValidImageDataUrl(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (trimmed.length < 32 || trimmed.length > 5_600_000) return false;
  return /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(
    trimmed
  );
}

const TIME_SENSITIVE_CUE =
  /\b(current|currently|latest|today|now|present|recent|recently|update|updated|newest|2024|2025|2026|2027|president|prime\s+minister|governor|minister|secretary[- ]general|ceo|monarch|king|pope|population|gdp|exchange\s+rate|price\s+of|who\s+is\s+the|who\s+won|winner\s+of|champion|world\s+cup|olympics|nobel|election|version\s+of|release|news|happened|right\s+now)\b/i;

function cleanLiveSearchQuery(rawPrompt: string): string {
  return rawPrompt
    .replace(/```[\s\S]*?```/g, " ")
    .replace(
      /^(please\s+)?(can\s+you\s+|could\s+you\s+|tell\s+me\s+|explain\s+|what\s+is\s+|what\s+are\s+|who\s+is\s+|who\s+are\s+|when\s+did\s+|where\s+is\s+)/i,
      ""
    )
    .replace(/[?!."'`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

async function fetchTimeoutJson(
  url: string,
  timeoutMs = 2800
): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "StudentsEcosystem-AITutor/2.0",
      },
      signal: controller.signal,
    });
    if (!resp.ok) return null;
    return (await resp.json()) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchLiveCurrentContextEdge(rawPrompt: string): Promise<{
  contextBlock: string;
  sources: Array<{ title: string; url: string }>;
  isTimeSensitive: boolean;
}> {
  const trimmed = rawPrompt.trim();
  const isTimeSensitive = TIME_SENSITIVE_CUE.test(trimmed);
  if (trimmed.length < 4 || /^(hi|hello|hey|thanks|thank you|ok|okay)\b/i.test(trimmed)) {
    return { contextBlock: "", sources: [], isTimeSensitive: false };
  }
  const query = cleanLiveSearchQuery(trimmed);
  if (query.length < 2) {
    return { contextBlock: "", sources: [], isTimeSensitive };
  }

  const snippets: Array<{ title: string; snippet: string; url: string }> = [];
  const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    query
  )}&srlimit=3&utf8=1&format=json&origin=*`;
  const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(
    query
  )}&format=json&no_html=1&skip_disambig=1`;

  const [wikiSearch, ddgData] = await Promise.all([
    fetchTimeoutJson(wikiSearchUrl, 2600),
    fetchTimeoutJson(ddgUrl, 2400),
  ]);

  if (ddgData) {
    const absText = String(ddgData.AbstractText || "").trim();
    const absUrl = String(ddgData.AbstractURL || "").trim();
    const heading = String(ddgData.Heading || query).trim();
    if (absText.length >= 25) {
      snippets.push({
        title: heading,
        snippet: absText.slice(0, 500),
        url:
          absUrl ||
          `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      });
    }
  }

  const queryObj = (wikiSearch?.query || {}) as Record<string, unknown>;
  const hits = Array.isArray(queryObj.search) ? queryObj.search.slice(0, 3) : [];
  const titles: string[] = [];
  for (const h of hits) {
    if (h && typeof h === "object") {
      const t = String((h as Record<string, unknown>).title || "").trim();
      if (t) titles.push(t);
    }
  }

  if (titles.length > 0) {
    const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&exchars=520&redirects=1&titles=${encodeURIComponent(
      titles.slice(0, 2).join("|")
    )}&format=json&origin=*`;
    const extractJson = await fetchTimeoutJson(extractUrl, 2400);
    const pagesObj = (
      (extractJson?.query as Record<string, unknown> | undefined)?.pages || {}
    ) as Record<string, Record<string, unknown>>;
    for (const page of Object.values(pagesObj)) {
      const pageTitle = String(page?.title || "").trim();
      const extract = String(page?.extract || "")
        .replace(/\s+/g, " ")
        .trim();
      if (pageTitle && extract.length >= 30) {
        const wikiPageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(
          pageTitle.replace(/\s+/g, "_")
        )}`;
        if (!snippets.some((s) => s.url === wikiPageUrl)) {
          snippets.push({
            title: pageTitle,
            snippet: extract.slice(0, 520),
            url: wikiPageUrl,
          });
        }
      }
    }
  }

  if (snippets.length === 0) {
    return { contextBlock: "", sources: [], isTimeSensitive };
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const top = snippets.slice(0, 4);
  const lines = top.map(
    (s, i) => `[Source ${i + 1}] ${s.title} (${s.url}): ${s.snippet}`
  );
  return {
    contextBlock: `LIVE UP-TO-DATE REFERENCE DATA (Retrieved ${todayIso}):\nUse these current verified facts whenever relevant so your answer reflects the latest real-world facts rather than outdated pre-training cutoffs:\n${lines.join("\n")}`,
    sources: top.map((s) => ({ title: s.title, url: s.url })),
    isTimeSensitive,
  };
}

const SAFETY_SYSTEM_GUARD = `You are the TRALIX AI Master Classroom Teacher inside Students Ecosystem (E-LEARNING ECOSYSTEM).
CRITICAL SAFETY, HONESTY & UP-TO-DATE UNIVERSAL Q&A RULES:
1. Age-appropriate & safe: Support secondary school (including minors aged 11–18), university, and polytechnic students safely. Strictly refuse requests involving self-harm, violence, sexual content, hate speech, dangerous activities, live-exam cheating, or illegal acts.
2. Answer ANY safe question with CURRENT, UP-TO-DATE facts: Answer academic, scientific, technical, general-knowledge, and current-affairs questions accurately using today's date and any LIVE UP-TO-DATE REFERENCE DATA provided. Never present outdated officeholders or stale facts as current.
3. Academic honesty: Never claim to be an official WAEC, NECO, JAMB, or university examiner. Never fabricate copyrighted official past-paper citations.
4. Pedagogical clarity: Speak warmly like a real teacher. Answer basic questions simply and directly without unnecessary bloat, and explain full topics step-by-step with clear headings, analogies, and visual diagrams when helpful.`;

function buildTeacherPrompt(params: {
  academicContext: string;
  subject: string | null;
  mode: string;
  explanationStyle: string;
  visualPreference: string;
  hasImageAttachment?: boolean;
  liveGroundedContext?: string;
}): string {
  const todayIso = new Date().toISOString().slice(0, 10);
  const visualDirective =
    params.visualPreference === "none"
      ? "VISUAL PREFERENCE: Text-only mode selected. Do NOT output any ```tutor-diagram``` block."
      : params.visualPreference === "always"
        ? "VISUAL PREFERENCE: Visual Learner Mode ON. You MUST include exactly ONE valid ```tutor-diagram``` JSON block illustrating the core concept or problem."
        : `VISUAL PREFERENCE: Auto (Like a Real Classroom Teacher). Include ONE valid \`\`\`tutor-diagram\`\`\` JSON block WHENEVER a diagram, labeled picture, circuit, triangle/vector sketch, graph, fraction bar, process cycle, or comparison chart will help the student SEE and understand the topic faster (or whenever the student asks to draw/show/illustrate). Skip diagrams for simple greetings, 1-line factual lookups, or short conversational follow-ups.`;
  const visionDirective = params.hasImageAttachment
    ? `\nPHOTO / IMAGE VISION ANALYSIS MODE ACTIVE:\n- The student attached a photo/picture. Carefully inspect every detail in the image (printed or handwritten text, equations, diagrams, graphs, circuits, code, textbook pages, or objects).\n- Briefly state/transcribe what is shown in the picture first, then solve or explain everything in the picture step-by-step.\n`
    : "";
  const liveWebDirective = params.liveGroundedContext
    ? `\n${params.liveGroundedContext}\n`
    : "";
  return `TODAY'S REAL-WORLD DATE: ${todayIso}.\n${SAFETY_SYSTEM_GUARD}${visionDirective}${liveWebDirective}` +
    renderTeacherPromptTail(params, visualDirective);
}

function renderTeacherPromptTail(
  params: {
    academicContext: string;
    subject: string | null;
    mode: string;
    explanationStyle: string;
  },
  visualDirective: string
): string {

  return `

TEACHING STYLE:
- Speak naturally, warmly, and encouragingly ("Let's walk through this together...", "Picture this in everyday life...").
- ANSWER BASIC QUESTIONS EFFORTLESSLY: If the student asks a basic question, greeting, quick calculation, simple definition, grammar check, or short follow-up ("What is 15% of 200?", "What is a noun?", "Why does ice float?", "I didn't understand step 2"), answer directly, simply, and warmly in plain everyday English right away—do NOT overwhelm a basic question with a huge essay!
- EXPLAIN FULL TOPICS LIKE A GREAT TEACHER AT THE WHITEBOARD:
  a) Start with **Everyday Intuition / Real-World Analogy** in plain words before technical jargon.
  b) Break the lesson into clear steps using short headings (###), **bold key terms**, and plain-text/Unicode formulas (e.g., V = I × R, 3x + 5 = 20, a² + b² = c² — avoid raw LaTeX backslashes like \\( or \\[; define every symbol and SI unit).
  c) Use a \`> Teacher Tip:\` blockquote to highlight a memory trick or the #1 mistake students make in exams.
  d) End the explanation with one friendly **Quick Check** question so the student can test their understanding.

${visualDirective}
When you include a visual diagram/picture, place a fenced \`\`\`tutor-diagram\`\`\` block containing STRICT valid JSON (double quotes, no comments, no trailing commas) using ONE of these 7 schemas:
1) Process / Cycle: \`{"diagramType":"process_flow","title":"Stages of Photosynthesis","isCycle":false,"caption":"How plants make food","steps":[{"label":"1. Light Absorption","detail":"Chlorophyll traps sunlight"},{"label":"2. Water Uptake","detail":"Roots draw H2O"},{"label":"3. Glucose & O2","detail":"Forms glucose and releases O2"}],"takeaway":"Light energy becomes chemical energy."}\`
2) Labeled Picture / Anatomy (illustration: "atom"|"cell"|"plant"|"earth_layers"|"cpu_system"|"general_hub"): \`{"diagramType":"concept_anatomy","illustration":"cell","title":"Annotated Picture: Animal Cell","centerLabel":"Nucleus","caption":"Key organelles","parts":[{"name":"Cell Membrane","role":"Controls entry/exit"},{"name":"Nucleus","role":"Stores DNA"},{"name":"Mitochondria","role":"Produces ATP energy"}]}\`
3) Circuit Picture (layout: "series"|"parallel"): \`{"diagramType":"circuit_diagram","layout":"parallel","title":"Parallel DC Circuit","voltageLabel":"12 V","currentLabel":"I = 3 A","components":[{"label":"R1","value":"6 Ω"},{"label":"R2","value":"12 Ω"}]}\`
4) Right Triangle OR Force Vectors (subtype: "right_triangle"|"forces"): \`{"diagramType":"geometry_vectors","subtype":"right_triangle","title":"Right Triangle","baseLabel":"Base = 6 m","heightLabel":"Height = 8 m","hypotenuseLabel":"Hypotenuse = 10 m","angleLabel":"θ"}\` or \`{"diagramType":"geometry_vectors","subtype":"forces","title":"Forces on Block","objectLabel":"Block","vectors":[{"direction":"up","label":"Normal N","magnitude":"50 N"},{"direction":"down","label":"Weight mg","magnitude":"50 N"},{"direction":"right","label":"Pull F","magnitude":"20 N"}]}\`
5) Coordinate / Supply-Demand / Motion Graph: \`{"diagramType":"xy_graph","title":"Supply & Demand","xLabel":"Quantity","yLabel":"Price","series":[{"label":"Demand","points":[[1,90],[3,60],[5,30]]},{"label":"Supply","points":[[1,30],[3,60],[5,90]]}],"highlightPoint":{"x":3,"y":60,"label":"Equilibrium"}}\`
6) Comparison Board: \`{"diagramType":"comparison_board","title":"Scalars vs Vectors","columns":[{"heading":"Scalars","points":["Magnitude only","Mass, Speed, Time"]},{"heading":"Vectors","points":["Magnitude + direction","Velocity, Force"]}]}\`
7) Visual Fraction / Percentage Bar: \`{"diagramType":"number_fraction_bar","title":"Visualizing 3/4 (75%)","numerator":3,"denominator":4,"barLabel":"3 out of 4 equal parts = 75%"}\`

${params.academicContext}
Selected Subject Focus: ${params.subject || "General / Any Subject (including basic questions)"}.
Explanation Style Preference: ${params.explanationStyle}.
${MODE_INSTRUCTIONS[params.mode] || MODE_INSTRUCTIONS.explain_topic}
At the very end of your response, include a final section titled "Suggested Follow-up Questions:" with 3 concise bullet-point questions the student can ask next.`;
}

type MessageContentPart =
  | { type: "text"; text: string }
  | {
      type: "image_url";
      image_url: { url: string; detail?: "auto" | "low" | "high" };
    };

interface ProviderResult {
  content: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  webCitations?: Array<{ title: string; url: string }>;
}

const FREE_VISION_MODELS = [
  "openrouter/free",
  "dots-studio/dots-3-note-preview:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3.5-super-vl:free",
  "thinkingmachines/inkling-small:free",
];

const FREE_TEXT_MODELS = [
  "openrouter/free",
  "cohere/north-mini-code:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3.5-lightning:free",
  "thinkingmachines/inkling-small:free",
];

function extractJsonPayload(raw: string): Record<string, unknown> {
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

function normalizeMessagesForModel(
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string | MessageContentPart[];
  }>,
  model: string,
  isFreeOrGemma: boolean
): Array<{
  role: "system" | "user" | "assistant";
  content: string | MessageContentPart[];
}> {
  const cleaned = messages.map((m) => {
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

  // Merge leading system prompt into first user turn for Gemma / free-router compatibility
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
      const mergedUser = Array.isArray(target.content)
        ? {
            role: "user" as const,
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
            role: "user" as const,
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

async function callProviderChain(params: {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string | MessageContentPart[];
  }>;
  maxTokens: number;
  temperature: number;
  preferredProvider: string;
  defaultModel: string;
  fallbackModel: string;
  jsonMode?: boolean;
  preferLiveWebSearch?: boolean;
}): Promise<ProviderResult> {
  const openAiKey = Deno.env.get("OPENAI_API_KEY")?.trim() || "";
  const openRouterPrimary = Deno.env.get("OPENROUTER_API_KEY")?.trim() || "";
  const openRouterFallback =
    Deno.env.get("OPENROUTER_API_KEY_FALLBACK")?.trim() || "";
  const boundedTokens = Math.min(
    Math.max(Number(params.maxTokens || 1400), 128),
    2048
  );

  const hasImage = params.messages.some(
    (m) =>
      Array.isArray(m.content) &&
      m.content.some((part) => part.type === "image_url")
  );

  type Candidate = {
    provider: string;
    url: string;
    apiKey: string;
    model: string;
    maxTokensOverride?: number;
    isFreeModel?: boolean;
    extraHeaders?: Record<string, string>;
    extraBody?: Record<string, unknown>;
  };

  const orHeaders = {
    "HTTP-Referer": "https://students-ecosystem.vercel.app",
    "X-Title": "E-Learning Ecosystem",
  };

  const candidates: Candidate[] = [];
  const configuredFallback = params.fallbackModel || "openai/gpt-4o-mini";
  const configuredIsFree =
    configuredFallback.endsWith(":free") ||
    configuredFallback === "openrouter/free";

  if (
    params.preferLiveWebSearch &&
    !params.jsonMode &&
    openRouterPrimary &&
    !configuredIsFree
  ) {
    candidates.push({
      provider: "openrouter-live-web",
      url: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: openRouterPrimary,
      model: configuredFallback,
      maxTokensOverride: Math.min(boundedTokens, 900),
      extraHeaders: orHeaders,
      extraBody: {
        plugins: [{ id: "web", max_results: 4 }],
      },
    });
  }

  const pushOpenAi = () => {
    if (openAiKey) {
      candidates.push({
        provider: "openai",
        url: "https://api.openai.com/v1/chat/completions",
        apiKey: openAiKey,
        model: params.defaultModel.includes("/")
          ? "gpt-4o-mini"
          : params.defaultModel || "gpt-4o-mini",
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
        model: configuredFallback,
        maxTokensOverride: Math.min(boundedTokens, 900),
        extraHeaders: orHeaders,
      });
    }
    if (openRouterFallback && openRouterFallback !== openRouterPrimary) {
      candidates.push({
        provider: "openrouter-fallback",
        url: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: openRouterFallback,
        model: configuredFallback,
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

    const freeModels = hasImage ? FREE_VISION_MODELS : FREE_TEXT_MODELS;
    const orderedModels = configuredIsFree
      ? [
          configuredFallback,
          ...freeModels.filter((m) => m !== configuredFallback),
        ]
      : freeModels;

    for (let i = 0; i < orderedModels.length; i++) {
      const modelId = orderedModels[i];
      const primaryKey = orKeys[i % orKeys.length];
      candidates.push({
        provider: "openrouter-free",
        url: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: primaryKey,
        model: modelId,
        isFreeModel: true,
        extraHeaders: orHeaders,
      });
    }

    // Extra backup pass with alternate OpenRouter key on openrouter/free if 2 keys exist
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

  if (params.preferredProvider === "openrouter") {
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
        temperature: params.temperature,
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
        let detail = "";
        try {
          const errJson = await resp.json();
          detail = String(errJson?.error?.message || "").slice(0, 60);
        } catch {
          // ignore
        }
        lastError = `${cand.provider}(${cand.model})_HTTP_${resp.status}${detail ? `:${detail}` : ""}`;
        continue;
      }

      const data = await resp.json();
      const messageObj = data?.choices?.[0]?.message;
      const content = String(messageObj?.content ?? "").trim();
      if (!content) {
        lastError = `${cand.provider}(${cand.model})_EMPTY_RESPONSE`;
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
      lastError =
        err instanceof Error
          ? `${cand.provider}(${cand.model}):${err.message}`
          : String(err);
    }
  }

  throw new Error(lastError);
}

function resolveFeatureName(action: string): string {
  switch (action) {
    case "generate_exam_questions":
      return "exam_generation";
    case "explain_exam_answer":
      return "exam_explanation";
    case "written_answer_feedback":
      return "exam_written_feedback";
    case "revision_plan":
      return "revision_plan";
    default:
      return "tutor";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ ok: false, error: "Method not allowed." }),
      {
        status: 405,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  const startedAt = Date.now();
  let reservedLogId: string | null = null;
  let preferredProvider = "openai";
  let defaultModel = "gpt-4o-mini";
  // deno-lint-ignore no-explicit-any
  let supabaseRef: any = null;

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(
        JSON.stringify({ ok: false, error: "Authentication required." }),
        {
          status: 401,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    supabaseRef = supabase;

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid or expired session." }),
        {
          status: 401,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    if (!user.email_confirmed_at) {
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            "Please verify your email address before using AI study features.",
        }),
        {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json();
    const action = String(body?.action || "tutor_chat");
    if (
      ![
        "tutor_chat",
        "generate_exam_questions",
        "written_answer_feedback",
        "explain_exam_answer",
        "revision_plan",
      ].includes(action)
    ) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unsupported AI gateway action." }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Deterministic input safety validation before reserving quota or calling providers
    if (action === "tutor_chat") {
      const rawMessage = String(body?.message || "").trim();
      const rawImg = body?.imageDataUrl ? String(body.imageDataUrl).trim() : "";
      if (rawImg && !isValidImageDataUrl(rawImg)) {
        return new Response(
          JSON.stringify({
            ok: false,
            error:
              "Attached photo format is invalid or exceeds the 4 MB upload limit. Please upload a PNG, JPG, or WEBP image.",
          }),
          {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          }
        );
      }
      const effectivePrompt =
        rawMessage ||
        (rawImg
          ? "Please carefully analyze this photo and explain or solve what is shown step by step."
          : "");
      const safety = evaluatePromptSafety(effectivePrompt);
      if (!safety.safe) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: safety.reason || "Invalid academic prompt.",
          }),
          {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          }
        );
      }
    } else if (
      action === "written_answer_feedback" ||
      action === "explain_exam_answer"
    ) {
      const combined = `${String(body?.questionPrompt || "")} ${String(body?.studentAnswer || "")}`.trim();
      if (combined.length >= 2) {
        const safety = evaluatePromptSafety(combined.slice(0, 3900));
        if (!safety.safe) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: safety.reason || "Invalid academic prompt.",
            }),
            {
              status: 400,
              headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
            }
          );
        }
      }
    }

    const featureName = resolveFeatureName(action);

    // 1. Atomic serialized quota reservation (prevents parallel burst quota bypass)
    const { data: quotaRow, error: reserveErr } = await supabase.rpc(
      "reserve_student_ai_quota_slot",
      {
        p_feature: featureName,
        p_provider: "openai",
        p_model: "gpt-4o-mini",
      }
    );

    if (reserveErr || !quotaRow) {
      throw new Error("QUOTA_RESERVATION_FAILED");
    }

    if (!quotaRow.allowed) {
      if (quotaRow.reason === "paused") {
        return new Response(
          JSON.stringify({
            ok: false,
            error:
              "AI services are temporarily paused by platform administration. Your saved notes, lessons, and curated exam banks remain available.",
          }),
          {
            status: 503,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          }
        );
      }

      const dailyLimit = Number(quotaRow.dailyLimit || 60);
      return new Response(
        JSON.stringify({
          ok: false,
          error: `You have reached your daily AI request allowance (${dailyLimit} requests per 24 hours). Please continue with curated lessons or practice banks and return later.`,
        }),
        {
          status: 429,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    reservedLogId = quotaRow.logId ? String(quotaRow.logId) : null;
    const maxTokens = Math.min(
      Math.max(Number(quotaRow.maxTokens || 1600), 128),
      2048
    );
    preferredProvider = String(quotaRow.preferredProvider || "openai");
    defaultModel = String(quotaRow.defaultModel || "gpt-4o-mini");
    const fallbackModel = String(
      quotaRow.fallbackModel || "openai/gpt-4o-mini"
    );
    const remainingAfter = Number(quotaRow.remainingAfter ?? 0);

    // Load student's actual academic profile columns for authentic personalization
    const { data: acad } = await supabase
      .from("student_academic_profiles")
      .select(
        "academic_category, academic_level, curriculum, course_or_program, selected_subjects, explanation_preference"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    const academicContext = acad
      ? `Learner Pathway: ${acad.academic_category || "general"}, Level: ${acad.academic_level || "standard"}, Program/Curriculum: ${acad.curriculum || acad.course_or_program || "general"}, Subjects: ${Array.isArray(acad.selected_subjects) && acad.selected_subjects.length > 0 ? acad.selected_subjects.join(", ") : "General"}, Preferred Depth: ${acad.explanation_preference || "standard"}.`
      : "Learner Pathway: General secondary/tertiary student.";

    // ========================================================================
    // ACTION 1: CONVERSATIONAL AI TUTOR (REAL CLASSROOM TEACHER + DIAGRAMS)
    // ========================================================================
    if (action === "tutor_chat") {
      const rawUserText = String(body?.message || "").trim();
      const imageDataUrl =
        body?.imageDataUrl && isValidImageDataUrl(body.imageDataUrl)
          ? String(body.imageDataUrl).trim()
          : "";
      const userPrompt =
        rawUserText ||
        "Please carefully inspect this photo and explain or solve what is shown step by step.";
      const storedUserMessageContent = imageDataUrl
        ? rawUserText
          ? `[Photo Attached] ${rawUserText}`
          : "[Photo Attached] Analyze and explain what is in this picture."
        : userPrompt;

      const mode = VALID_MODES.has(String(body?.learningMode))
        ? String(body.learningMode)
        : "explain_topic";
      const subject = String(body?.subject || "").trim().slice(0, 120) || null;
      const explanationStyle = String(
        body?.explanationStyle || "step_by_step"
      ).slice(0, 40);
      const rawVis = String(body?.visualPreference || "auto").toLowerCase();
      const visualPreference =
        rawVis === "always" || rawVis === "none" ? rawVis : "auto";

      let conversationId = body?.conversationId
        ? String(body.conversationId)
        : "";
      let historyMessages: Array<{
        role: "user" | "assistant";
        content: string;
      }> = [];

      if (conversationId) {
        const { data: prevRows } = await supabase
          .from("ai_tutor_messages")
          .select("role, content")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (prevRows && prevRows.length > 0) {
          historyMessages = [...prevRows]
            .reverse()
            .map((r: Record<string, unknown>) => ({
              role: r.role === "assistant" ? "assistant" : "user",
              content: String(r.content),
            }));
        }
      } else {
        const titleSeed =
          rawUserText || (imageDataUrl ? "Photo Study Analysis" : userPrompt);
        const autoTitle =
          titleSeed.length > 64
            ? `${titleSeed.slice(0, 61).trim()}...`
            : titleSeed;
        const { data: createdConv, error: convErr } = await supabase
          .from("ai_tutor_conversations")
          .insert({
            user_id: user.id,
            title: autoTitle || "Academic Study Session",
            learning_mode: mode,
            subject,
            course_slug: body?.courseSlug
              ? String(body.courseSlug).slice(0, 140)
              : null,
            lesson_slug: body?.lessonSlug
              ? String(body.lessonSlug).slice(0, 140)
              : null,
            message_count: 0,
          })
          .select("id")
          .single();

        if (convErr || !createdConv) {
          throw new Error("CONVERSATION_CREATE_FAILED");
        }
        conversationId = createdConv.id;
      }

      const createdNewConv = !body?.conversationId && Boolean(conversationId);
      const liveGrounding = rawUserText
        ? await fetchLiveCurrentContextEdge(rawUserText)
        : { contextBlock: "", sources: [], isTimeSensitive: false };

      const systemMessage = buildTeacherPrompt({
        academicContext,
        subject,
        mode,
        explanationStyle,
        visualPreference,
        hasImageAttachment: Boolean(imageDataUrl),
        liveGroundedContext: liveGrounding.contextBlock,
      });

      const userTurnContent: string | MessageContentPart[] = imageDataUrl
        ? [
            { type: "text", text: userPrompt },
            {
              type: "image_url",
              image_url: { url: imageDataUrl, detail: "high" },
            },
          ]
        : userPrompt;

      let result: ProviderResult;
      try {
        result = await callProviderChain({
          messages: [
            { role: "system", content: systemMessage },
            ...historyMessages,
            { role: "user", content: userTurnContent },
          ],
          maxTokens: Math.min(Math.max(maxTokens, 1500), 2048),
          temperature: 0.4,
          preferredProvider,
          defaultModel,
          fallbackModel,
          preferLiveWebSearch: liveGrounding.isTimeSensitive && !imageDataUrl,
        });
      } catch (providerErr) {
        if (createdNewConv) {
          await supabase
            .from("ai_tutor_conversations")
            .delete()
            .eq("id", conversationId)
            .eq("user_id", user.id)
            .eq("message_count", 0);
        }
        throw providerErr;
      }

      await supabase.from("ai_tutor_messages").insert([
        {
          conversation_id: conversationId,
          user_id: user.id,
          role: "user",
          content: storedUserMessageContent,
          learning_mode: mode,
          is_ai_generated: false,
          is_verified_educational_material: false,
        },
        {
          conversation_id: conversationId,
          user_id: user.id,
          role: "assistant",
          content: result.content,
          learning_mode: mode,
          provider: result.provider,
          model: result.model,
          is_ai_generated: true,
          is_verified_educational_material: false,
        },
      ]);

      const { count: exactCount } = await supabase
        .from("ai_tutor_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);

      await supabase
        .from("ai_tutor_conversations")
        .update({
          learning_mode: mode,
          subject: subject,
          message_count: exactCount ?? historyMessages.length + 2,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", conversationId)
        .eq("user_id", user.id);

      if (reservedLogId) {
        await supabase.rpc("finalize_student_ai_quota_slot", {
          p_log_id: reservedLogId,
          p_status: "success",
          p_provider: result.provider,
          p_model: result.model,
          p_prompt_tokens: result.promptTokens,
          p_completion_tokens: result.completionTokens,
          p_total_tokens: result.totalTokens,
          p_latency_ms: Date.now() - startedAt,
          p_error_code: null,
        });
      }

      const followUps: string[] = [];
      const followMatch = result.content.match(
        /(?:\n|^)\s*(?:#{1,4}\s*|\*\*)?Suggested Follow-up Questions:?\*?\*?([\s\S]*)$/i
      );
      if (followMatch && followMatch[1]) {
        for (const line of followMatch[1].split("\n")) {
          const cleaned = line
            .replace(/^[-*•\d.)\s]+/, "")
            .replace(/^\*\*|\*\*$/g, "")
            .trim();
          if (cleaned.length >= 8 && cleaned.length <= 140) {
            followUps.push(cleaned);
          }
          if (followUps.length >= 3) break;
        }
      }

      const mergedSources: Array<{ title: string; url: string }> = [];
      for (const src of [
        ...(result.webCitations || []),
        ...liveGrounding.sources,
      ]) {
        if (src.url && !mergedSources.some((ex) => ex.url === src.url)) {
          mergedSources.push(src);
        }
        if (mergedSources.length >= 4) break;
      }

      return new Response(
        JSON.stringify({
          ok: true,
          conversationId,
          reply: result.content,
          suggestedQuestions: followUps,
          liveSources: mergedSources,
          usedLiveWeb:
            mergedSources.length > 0 || result.provider === "openrouter-live-web",
          provider: result.provider,
          model: result.model,
          isAiGenerated: true,
          isVerifiedEducationalMaterial: false,
          remainingDailyQuota: remainingAfter,
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // ========================================================================
    // ACTION 2: AI-GENERATED PRACTICE QUESTIONS
    // ========================================================================
    if (action === "generate_exam_questions") {
      const examCategory = String(body?.examCategory || "WAEC").slice(0, 40);
      const subject = String(body?.subject || "Physics").slice(0, 80);
      const topics = Array.isArray(body?.topics)
        ? body.topics
            .slice(0, 5)
            .map((t: unknown) => String(t).slice(0, 80))
            .join(", ")
        : "";
      const difficulty = String(body?.difficulty || "medium").slice(0, 20);
      const count = Math.min(Math.max(Number(body?.questionCount || 5), 2), 10);

      const prompt = `Create ${count} ORIGINAL AI-generated practice questions for ${examCategory}-style study in "${subject}"${topics ? ` focusing on topics: ${topics}` : ""} at "${difficulty}" difficulty.
IMPORTANT RULES:
- These MUST be original practice items created for study. NEVER claim they are verbatim official WAEC/NECO/JAMB past questions.
- Return STRICT JSON object matching this exact schema:
{
  "questions": [
    {
      "questionType": "multiple_choice",
      "topic": "Topic Name",
      "difficulty": "easy" | "medium" | "hard",
      "prompt": "Clear question stem",
      "points": 2,
      "options": [
        { "key": "A", "text": "Option A" },
        { "key": "B", "text": "Option B" },
        { "key": "C", "text": "Option C" },
        { "key": "D", "text": "Option D" }
      ],
      "correctOptionKey": "B",
      "explanation": "Step-by-step explanation of why Option B is correct."
    }
  ]
}`;

      const result = await callProviderChain({
        messages: [
          {
            role: "system",
            content: `${SAFETY_SYSTEM_GUARD}\n${academicContext}`,
          },
          { role: "user", content: prompt },
        ],
        maxTokens: Math.min(Math.max(maxTokens, 900), 2048),
        temperature: 0.35,
        preferredProvider,
        defaultModel,
        fallbackModel,
        jsonMode: true,
      });

      const parsed = extractJsonPayload(result.content);
      const questions = Array.isArray(parsed?.questions)
        ? parsed.questions
        : [];

      if (reservedLogId) {
        await supabase.rpc("finalize_student_ai_quota_slot", {
          p_log_id: reservedLogId,
          p_status: "success",
          p_provider: result.provider,
          p_model: result.model,
          p_prompt_tokens: result.promptTokens,
          p_completion_tokens: result.completionTokens,
          p_total_tokens: result.totalTokens,
          p_latency_ms: Date.now() - startedAt,
          p_error_code: null,
        });
      }

      return new Response(
        JSON.stringify({
          ok: true,
          questions,
          originType: "ai_generated_practice",
          isAiGenerated: true,
          isVerifiedEducationalMaterial: false,
          provider: result.provider,
          model: result.model,
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // ========================================================================
    // ACTION 3: AI EXAM WRITTEN FEEDBACK / INCORRECT ANSWER EXPLANATION / REVISION PLAN
    // ========================================================================
    let userTask = "";
    if (action === "written_answer_feedback") {
      userTask = `Provide constructive AI-assisted study feedback on this student's written practice response.
CRITICAL: Explicitly begin with "Advisory Study Feedback (Not Official Examiner Marking):" and evaluate clarity, accuracy of key concepts, missing points, and how to improve.
Question: ${String(body?.questionPrompt || "").slice(0, 1200)}
Student Written Response: ${String(body?.studentAnswer || "").slice(0, 2500)}`;
    } else if (action === "explain_exam_answer") {
      userTask = `Explain clearly like a supportive classroom teacher why the student's answer was incorrect and walk step-by-step to the correct answer.
Question: ${String(body?.questionPrompt || "").slice(0, 1200)}
Student Answer: ${String(body?.studentAnswer || "").slice(0, 400)}
Correct Answer: ${String(body?.correctAnswer || "").slice(0, 400)}`;
    } else {
      userTask = `Create a concise, actionable 5-day personalized AI revision plan based on this practice exam result:
Exam: ${String(body?.examName || "Practice Exam").slice(0, 120)}
Subject: ${String(body?.subject || "").slice(0, 80)}
Score: ${String(body?.scorePercent ?? "").slice(0, 10)}%
Weak Topics Identified: ${Array.isArray(body?.weakTopics) && body.weakTopics.length > 0 ? body.weakTopics.slice(0, 10).join(", ") : "General consolidation"}`;
    }

    const result = await callProviderChain({
      messages: [
        { role: "system", content: `${SAFETY_SYSTEM_GUARD}\n${academicContext}` },
        { role: "user", content: userTask },
      ],
      maxTokens,
      temperature: 0.35,
      preferredProvider,
      defaultModel,
      fallbackModel,
    });

    if (action === "revision_plan" && body?.attemptId) {
      await supabase
        .from("student_exam_attempts")
        .update({ ai_revision_plan: result.content })
        .eq("id", String(body.attemptId))
        .eq("user_id", user.id);
    }

    if (action === "written_answer_feedback" && body?.responseId) {
      await supabase
        .from("student_exam_responses")
        .update({ ai_written_feedback: result.content })
        .eq("id", String(body.responseId))
        .eq("user_id", user.id);
    }

    if (reservedLogId) {
      await supabase.rpc("finalize_student_ai_quota_slot", {
        p_log_id: reservedLogId,
        p_status: "success",
        p_provider: result.provider,
        p_model: result.model,
        p_prompt_tokens: result.promptTokens,
        p_completion_tokens: result.completionTokens,
        p_total_tokens: result.totalTokens,
        p_latency_ms: Date.now() - startedAt,
        p_error_code: null,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        content: result.content,
        isAiGenerated: true,
        isVerifiedEducationalMaterial: false,
        isOfficialExaminerMarking: false,
        provider: result.provider,
        model: result.model,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "AI_GATEWAY_ERROR";
    if (reservedLogId && supabaseRef) {
      try {
        await supabaseRef.rpc("finalize_student_ai_quota_slot", {
          p_log_id: reservedLogId,
          p_status: "error",
          p_provider: preferredProvider,
          p_model: defaultModel,
          p_prompt_tokens: 0,
          p_completion_tokens: 0,
          p_total_tokens: 0,
          p_latency_ms: Date.now() - startedAt,
          p_error_code: errMsg.slice(0, 120),
        });
      } catch {
        // Ignore secondary telemetry error
      }
    }

    return new Response(
      JSON.stringify({
        ok: false,
        error:
          "The AI study service is momentarily unavailable. Your study data is safe—please retry in a few moments.",
        code: errMsg.slice(0, 80),
      }),
      {
        status: 503,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});
