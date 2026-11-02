import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export const NIGERIAN_PAST_QUESTION_EXAM_CODES = new Set([
  "WAEC",
  "NECO",
  "JAMB_UTME",
]);

export const NIGERIAN_CORE_SUBJECTS = [
  "Use of English",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Economics",
  "Government",
  "Literature in English",
  "Commerce",
  "Financial Accounting",
  "Civic Education",
  "Geography",
  "Christian Religious Studies",
  "Islamic Studies",
] as const;

export const PAST_QUESTION_YEARS: number[] = Array.from(
  { length: 24 },
  (_, idx) => 2024 - idx
);

const SUBJECT_TO_ALOC_SLUG: Record<string, string> = {
  "use of english": "english",
  "english language": "english",
  english: "english",
  mathematics: "mathematics",
  "further mathematics": "mathematics",
  physics: "physics",
  chemistry: "chemistry",
  biology: "biology",
  economics: "economics",
  government: "government",
  "literature in english": "englishlit",
  literature: "englishlit",
  commerce: "commerce",
  "financial accounting": "accounting",
  accounting: "accounting",
  "civic education": "civiledu",
  geography: "geography",
  "christian religious studies": "crk",
  crk: "crk",
  crs: "crk",
  "islamic studies": "irk",
  irk: "irk",
  irs: "irk",
  history: "history",
  insurance: "insurance",
  "current affairs": "currentaffairs",
};

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
};

const SUBSCRIPT_DIGITS: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
};

export function resolveAlocSubjectSlug(subjectName: string): string | null {
  const key = subjectName.trim().toLowerCase();
  if (!key) return null;
  if (SUBJECT_TO_ALOC_SLUG[key]) return SUBJECT_TO_ALOC_SLUG[key];
  for (const [k, slug] of Object.entries(SUBJECT_TO_ALOC_SLUG)) {
    if (key.includes(k) || k.includes(key)) return slug;
  }
  return null;
}

export function cleanAlocQuestionHtml(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  let s = String(raw);
  s = s.replace(/<\s*br\s*\/?>/gi, "\n");
  s = s.replace(/<\s*\/p\s*>/gi, "\n");
  s = s.replace(/<\s*sup\s*>(.*?)<\s*\/sup\s*>/gi, (_m, inner: string) => {
    const trimmed = inner.trim();
    if (/^[0-9+-]+$/.test(trimmed)) {
      return trimmed
        .split("")
        .map((c) => SUPERSCRIPT_DIGITS[c] || c)
        .join("");
    }
    return `^(${trimmed})`;
  });
  s = s.replace(/<\s*sub\s*>(.*?)<\s*\/sub\s*>/gi, (_m, inner: string) => {
    const trimmed = inner.trim();
    if (/^[0-9]+$/.test(trimmed)) {
      return trimmed
        .split("")
        .map((c) => SUBSCRIPT_DIGITS[c] || c)
        .join("");
    }
    return `_${trimmed}`;
  });
  s = s.replace(/<\/?(?:i|b|em|strong|u|span|font|small)\b[^>]*>/gi, "");
  s = s.replace(/<[^>]+>/g, " ");
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&deg;/gi, "°")
    .replace(/&times;/gi, "×")
    .replace(/&divide;/gi, "÷")
    .replace(/&plusmn;/gi, "±")
    .replace(/&le;/gi, "≤")
    .replace(/&ge;/gi, "≥")
    .replace(/&ne;/gi, "≠")
    .replace(/&rarr;/gi, "→")
    .replace(/&#(\d+);/g, (_m, code) => {
      const n = Number(code);
      return Number.isFinite(n) ? String.fromCodePoint(n) : "";
    });
  return s
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

export interface PastQuestionsApiAdminStatus {
  configured: boolean;
  provider: string;
  baseUrl: string;
  maskedToken: string | null;
  updatedAt: string | null;
  waecPastCount: number;
  necoPastCount: number;
  jambPastCount: number;
  totalPastQuestions: number;
}

export interface PastQuestionsConnectorResponse {
  ok: boolean;
  code?: string;
  error?: string;
  message?: string;
  importedCount?: number;
  skippedDuplicates?: number;
  availableCount?: number;
  fromCache?: boolean;
  sampleExamYear?: string | number | null;
  sampleExamType?: string | null;
}

export async function invokePastQuestionsConnector(
  payload: Record<string, unknown>
): Promise<PastQuestionsConnectorResponse> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return { ok: false, error: "Supabase client is not configured." };
  }

  try {
    const { data, error } = await supabase.functions.invoke(
      "past-questions-sync",
      {
        body: payload,
      }
    );

    if (error) {
      let detailedMessage = error.message || "Past-Questions API request failed.";
      try {
        const ctx = (error as unknown as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          const errJson = await ctx.json();
          if (errJson?.error) {
            detailedMessage = String(errJson.error);
          }
          if (errJson?.code) {
            return {
              ok: false,
              code: String(errJson.code),
              error: detailedMessage,
            };
          }
        }
      } catch {
        // Fallback to standard error message
      }
      return { ok: false, error: detailedMessage };
    }

    if (data && typeof data === "object") {
      return data as PastQuestionsConnectorResponse;
    }

    return { ok: false, error: "Unexpected response from Past-Questions connector." };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Network error contacting Past-Questions connector.",
    };
  }
}
