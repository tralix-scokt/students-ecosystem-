/**
 * Live Web & Encyclopedic Grounding Engine for Up-To-Date AI Answers.
 * Retrieves verified live snippets from Wikipedia REST/MediaWiki APIs and
 * DuckDuckGo Instant Answers with strict bounded timeouts so the AI Tutor
 * answers current-events, officeholders, modern tech/science, and general
 * questions with accurate up-to-date facts.
 */

export interface LiveGroundedSource {
  title: string;
  url: string;
  snippet: string;
}

export interface LiveGroundingResult {
  usedLiveContext: boolean;
  isTimeSensitiveQuery: boolean;
  contextBlock: string;
  sources: LiveGroundedSource[];
}

const PURE_CONVERSATIONAL_OR_MATH_RE =
  /^(hi|hello|hey|good\s+(morning|afternoon|evening)|thanks|thank\s+you|ok|okay|[\d\s+\-*/^()=.%?]+)$/i;

const TIME_SENSITIVE_INTENT_RE =
  /\b(current|currently|latest|today|now|recent|recently|new|newest|update|updated|who\s+is\s+the|president|prime\s+minister|governor|minister|ceo|monarch|king|pope|champion|winner|world\s+cup|olympics|2024|2025|2026|2027|election|population|gdp|capital|price|version|release|news|happened)\b/i;

export function detectTimeSensitiveIntent(prompt: string): boolean {
  return TIME_SENSITIVE_INTENT_RE.test(prompt || "");
}

export function extractSearchQueryKeywords(rawPrompt: string): string {
  const cleaned = rawPrompt
    .replace(/```[\s\S]*?```/g, " ")
    .replace(
      /^(please\s+)?(can\s+you\s+|could\s+you\s+)?(tell\s+me\s+|explain\s+|what\s+is\s+the\s+|what\s+are\s+the\s+|who\s+is\s+the\s+|who\s+are\s+the\s+|give\s+me\s+)/i,
      ""
    )
    .replace(/[?!."'`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.slice(0, 140) || rawPrompt.trim().slice(0, 140);
}

async function fetchWithBoundedTimeout(
  url: string,
  timeoutMs = 3000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "StudentsEcosystemTutor/1.0 (Educational Grounding)",
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function queryWikipediaLiveExtracts(
  searchQuery: string
): Promise<LiveGroundedSource[]> {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    searchQuery
  )}&srlimit=3&utf8=1&format=json&origin=*`;

  const searchRes = await fetchWithBoundedTimeout(searchUrl, 2800);
  if (!searchRes.ok) return [];
  const searchJson = await searchRes.json();
  const hits: Array<{ pageid: number; title: string; snippet?: string }> =
    searchJson?.query?.search || [];
  if (hits.length === 0) return [];

  const pageIds = hits
    .slice(0, 3)
    .map((h) => h.pageid)
    .join("|");

  const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&exchars=850&pageids=${encodeURIComponent(
    pageIds
  )}&format=json&origin=*`;

  const extractRes = await fetchWithBoundedTimeout(extractUrl, 2800);
  if (!extractRes.ok) return [];
  const extractJson = await extractRes.json();
  const pages = extractJson?.query?.pages || {};

  const results: LiveGroundedSource[] = [];
  for (const hit of hits.slice(0, 3)) {
    const page = pages[String(hit.pageid)];
    const extract = String(page?.extract || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!extract) continue;
    const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(
      hit.title.replace(/\s+/g, "_")
    )}`;
    results.push({
      title: hit.title,
      url: wikiUrl,
      snippet: extract.slice(0, 750),
    });
  }
  return results;
}

async function queryDuckDuckGoInstant(
  searchQuery: string
): Promise<LiveGroundedSource[]> {
  const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(
    searchQuery
  )}&format=json&no_html=1&skip_disambig=1`;

  const res = await fetchWithBoundedTimeout(ddgUrl, 2500);
  if (!res.ok) return [];
  const json = await res.json();

  const out: LiveGroundedSource[] = [];
  const answer = String(json?.Answer || "").trim();
  const abstractText = String(json?.AbstractText || "").trim();
  const abstractUrl = String(json?.AbstractURL || "").trim();
  const heading = String(json?.Heading || searchQuery).trim();

  if (answer) {
    out.push({
      title: `${heading} — Instant Fact`,
      url: abstractUrl || "https://duckduckgo.com",
      snippet: answer.slice(0, 500),
    });
  }
  if (abstractText) {
    out.push({
      title: heading,
      url: abstractUrl || "https://duckduckgo.com",
      snippet: abstractText.slice(0, 650),
    });
  }
  return out;
}

export async function fetchLiveCurrentContext(
  rawPrompt: string
): Promise<LiveGroundingResult> {
  const trimmed = (rawPrompt || "").trim();
  const isTimeSensitive = detectTimeSensitiveIntent(trimmed);

  if (
    trimmed.length < 4 ||
    PURE_CONVERSATIONAL_OR_MATH_RE.test(trimmed)
  ) {
    return {
      usedLiveContext: false,
      isTimeSensitiveQuery: false,
      contextBlock: "",
      sources: [],
    };
  }

  const searchQuery = extractSearchQueryKeywords(trimmed);
  if (searchQuery.length < 3) {
    return {
      usedLiveContext: false,
      isTimeSensitiveQuery: isTimeSensitive,
      contextBlock: "",
      sources: [],
    };
  }

  const [wikiSettled, ddgSettled] = await Promise.allSettled([
    queryWikipediaLiveExtracts(searchQuery),
    queryDuckDuckGoInstant(searchQuery),
  ]);

  const combined: LiveGroundedSource[] = [];
  const seenUrls = new Set<string>();

  const pushUnique = (items: LiveGroundedSource[]) => {
    for (const item of items) {
      if (!item.snippet || seenUrls.has(item.url)) continue;
      seenUrls.add(item.url);
      combined.push(item);
      if (combined.length >= 4) break;
    }
  };

  if (ddgSettled.status === "fulfilled") pushUnique(ddgSettled.value);
  if (wikiSettled.status === "fulfilled") pushUnique(wikiSettled.value);

  if (combined.length === 0) {
    return {
      usedLiveContext: false,
      isTimeSensitiveQuery: isTimeSensitive,
      contextBlock: "",
      sources: [],
    };
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const formattedSnippets = combined
    .map(
      (src, idx) =>
        `[Live Source ${idx + 1}: ${src.title} (${src.url})]\n${src.snippet}`
    )
    .join("\n\n");

  const contextBlock = `LIVE UP-TO-DATE REFERENCE DATA (Retrieved ${todayIso}):
Use the verified up-to-date facts below whenever relevant to ensure your answer reflects current real-world reality rather than outdated training cutoffs. Synthesize naturally in your own clear teacher voice:

${formattedSnippets}`;

  return {
    usedLiveContext: true,
    isTimeSensitiveQuery: isTimeSensitive,
    contextBlock,
    sources: combined,
  };
}
