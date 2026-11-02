// Supabase Edge Function: past-questions-sync (v3 — ALOC Station v1 Infrastructure)
// Server-side Nigerian Past-Questions API Connector (JAMB UTME, WAEC WASSCE, NECO SSCE)
// Connects securely to ALOC Station (https://dev.aloc.com.ng/api/v1) using server-stored X-API-Key,
// performs 0-credit year/exam discovery, deduplicates questions with verified provenance,
// and keeps answer keys strictly server-only until student submission.

import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_ALOC_STATION_URL = "https://dev.aloc.com.ng/api/v1";

const EXAM_CODE_TO_ALOC: Record<
  string,
  { stationType: string; legacyType: string; label: string }
> = {
  JAMB_UTME: { stationType: "jamb", legacyType: "utme", label: "JAMB UTME" },
  WAEC: { stationType: "waec", legacyType: "wassce", label: "WAEC WASSCE" },
  NECO: { stationType: "neco", legacyType: "neco", label: "NECO SSCE" },
};

const SUBJECT_TO_STATION_SLUG: Record<string, string> = {
  "use of english": "english-language",
  "english language": "english-language",
  english: "english-language",
  mathematics: "mathematics",
  "further mathematics": "mathematics",
  physics: "physics",
  chemistry: "chemistry",
  biology: "biology",
  economics: "economics",
  government: "government",
  "literature in english": "literature-in-english",
  literature: "literature-in-english",
  commerce: "commerce",
  "financial accounting": "accounting",
  accounting: "accounting",
  "civic education": "civic-education",
  geography: "geography",
  "christian religious studies": "christian-religious-studies",
  crk: "christian-religious-studies",
  crs: "christian-religious-studies",
  history: "history",
  insurance: "insurance",
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
  "−": "⁻",
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

function cleanAlocHtml(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  let s = String(raw);
  s = s.replace(/<\s*math[\s\S]*?<\s*\/math\s*>/gi, " ");
  s = s.replace(/<\s*br\s*\/?>/gi, "\n");
  s = s.replace(/<\s*\/p\s*>/gi, "\n");
  s = s.replace(/<\s*sup\s*>(.*?)<\s*\/sup\s*>/gi, (_m, inner: string) => {
    const trimmed = inner.trim();
    if (/^[0-9+\-−]+$/.test(trimmed)) {
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
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => {
      const n = parseInt(hex, 16);
      return Number.isFinite(n) ? String.fromCodePoint(n) : "";
    })
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

function resolveStationSlug(subjectName: string): string | null {
  const key = subjectName.trim().toLowerCase();
  if (!key) return null;
  if (SUBJECT_TO_STATION_SLUG[key]) return SUBJECT_TO_STATION_SLUG[key];
  for (const [k, slug] of Object.entries(SUBJECT_TO_STATION_SLUG)) {
    if (key.includes(k) || k.includes(key)) return slug;
  }
  return null;
}

function humanizeSlug(slug: string): string {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function mapDifficulty(score: unknown): "easy" | "medium" | "hard" {
  const n = Number(score);
  if (!Number.isFinite(n)) return "medium";
  if (n <= 2) return "easy";
  if (n >= 4) return "hard";
  return "medium";
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return jsonResponse(
      { ok: false, error: "Supabase environment is not configured." },
      500
    );
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return jsonResponse({ ok: false, error: "Authentication required." }, 401);
  }

  const adminDb = createClient(supabaseUrl, supabaseServiceKey);

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON request body." }, 400);
  }

  const action = String(payload.action || "");

  const { data: profile } = await adminDb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";

  const envToken = (Deno.env.get("ALOC_ACCESS_TOKEN") ?? "").trim();
  const { data: secretRow } = await adminDb
    .from("admin_integration_secrets")
    .select("base_url, secret_token")
    .eq("provider_key", "aloc")
    .maybeSingle();

  const candidateToken =
    isAdmin &&
    typeof payload.accessToken === "string" &&
    payload.accessToken.trim()
      ? payload.accessToken.trim()
      : secretRow?.secret_token?.trim() || envToken;

  let configuredBaseUrl = String(
    payload.baseUrl || secretRow?.base_url || DEFAULT_ALOC_STATION_URL
  ).replace(/\/+$/, "");

  // Automatically upgrade legacy questions.aloc.com.ng URL when using ALOC Station (aloc_*) API keys
  if (
    candidateToken.startsWith("aloc_") &&
    configuredBaseUrl.includes("questions.aloc.com.ng")
  ) {
    configuredBaseUrl = DEFAULT_ALOC_STATION_URL;
  }

  // -------------------------------------------------------------------------
  // ACTION 1: Admin Connection Test (& Optional Vault Save) — 0 API Credits!
  // -------------------------------------------------------------------------
  if (action === "test_connection") {
    if (!isAdmin) {
      return jsonResponse(
        { ok: false, error: "Administrator authorization required." },
        403
      );
    }

    if (!candidateToken || candidateToken.length < 8) {
      return jsonResponse(
        {
          ok: false,
          error:
            "No ALOC API key provided or saved yet. Paste your aloc_... key from aloc.com.ng first.",
        },
        400
      );
    }

    try {
      const testUrl = `${configuredBaseUrl}/subjects`;
      const resp = await fetch(testUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-API-Key": candidateToken,
        },
      });

      const parsed = await resp.json().catch(() => ({}));
      if (!resp.ok || !Array.isArray(parsed?.data)) {
        return jsonResponse(
          {
            ok: false,
            error:
              String(parsed?.message || parsed?.error || "") ||
              `ALOC Station API returned HTTP ${resp.status}. Please verify your API key on aloc.com.ng.`,
          },
          400
        );
      }

      if (payload.save === true && typeof payload.accessToken === "string") {
        await adminDb.from("admin_integration_secrets").upsert(
          {
            provider_key: "aloc",
            display_name:
              "ALOC Station Nigerian Past Questions API (JAMB / WAEC / NECO)",
            base_url: configuredBaseUrl,
            secret_token: candidateToken,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "provider_key" }
        );

        await adminDb.from("admin_audit_logs").insert({
          admin_user_id: user.id,
          action_type: "test_and_save_past_questions_api",
          target_type: "admin_integration_secrets",
          target_id: "aloc",
          summary: `Verified & saved ALOC Station API key (ending ${candidateToken.slice(-4)})`,
          details: { baseUrl: configuredBaseUrl },
        });
      }

      const subjectList = parsed.data as Array<Record<string, unknown>>;
      const totalCatalogQuestions = subjectList.reduce(
        (sum, s) => sum + (Number(s.questionCount) || 0),
        0
      );
      const meta = (parsed.meta ?? {}) as Record<string, unknown>;

      return jsonResponse({
        ok: true,
        message: `Connected to ALOC Station! Verified ${subjectList.length} subjects (${totalCatalogQuestions.toLocaleString()} past questions available). Credits remaining: ${meta.creditsRemaining ?? "active"} (${meta.tier ?? "verified"} tier).`,
        creditsRemaining:
          typeof meta.creditsRemaining === "number"
            ? meta.creditsRemaining
            : null,
        tier: typeof meta.tier === "string" ? meta.tier : null,
      });
    } catch (err) {
      return jsonResponse(
        {
          ok: false,
          error: `Network error contacting ${configuredBaseUrl}: ${err instanceof Error ? err.message : "Failed"}`,
        },
        502
      );
    }
  }

  // -------------------------------------------------------------------------
  // ACTION 2 & 3: Sync / Prepare Past Questions Batch
  // -------------------------------------------------------------------------
  if (action !== "admin_sync_batch" && action !== "student_prepare_past_paper") {
    return jsonResponse({ ok: false, error: "Unsupported action." }, 400);
  }

  if (action === "admin_sync_batch" && !isAdmin) {
    return jsonResponse(
      { ok: false, error: "Administrator authorization required." },
      403
    );
  }

  const examCategoryCode = String(payload.examCategoryCode || "JAMB_UTME")
    .trim()
    .toUpperCase();
  const subjectName = String(payload.subject || "Mathematics").trim();
  const examYearRaw = payload.examYear;
  const examYear =
    examYearRaw !== null &&
    examYearRaw !== undefined &&
    examYearRaw !== "" &&
    examYearRaw !== "all" &&
    Number.isFinite(Number(examYearRaw))
      ? Number(examYearRaw)
      : null;
  const desiredCount = Math.min(
    40,
    Math.max(1, Number(payload.questionCount) || 20)
  );

  const examMapping = EXAM_CODE_TO_ALOC[examCategoryCode];
  if (!examMapping) {
    return jsonResponse(
      {
        ok: false,
        error: `Exam category ${examCategoryCode} is not a Nigerian past-question exam (use JAMB_UTME, WAEC, or NECO).`,
      },
      400
    );
  }

  const { data: catRow } = await adminDb
    .from("exam_categories")
    .select("id, code, short_label")
    .eq("code", examCategoryCode)
    .maybeSingle();

  if (!catRow) {
    return jsonResponse(
      { ok: false, error: "Exam category record not found." },
      404
    );
  }

  let existingCountQuery = adminDb
    .from("exam_questions")
    .select("id", { count: "exact", head: true })
    .eq("exam_category_id", catRow.id)
    .ilike("subject", subjectName)
    .eq("origin_type", "authorized_past_question")
    .eq("is_published", true);

  if (examYear !== null) {
    existingCountQuery = existingCountQuery.eq("exam_year", examYear);
  }

  const { count: existingPastCount } = await existingCountQuery;

  // Serve directly from Supabase cache if student already has enough questions
  if (
    action === "student_prepare_past_paper" &&
    (existingPastCount ?? 0) >= desiredCount
  ) {
    return jsonResponse({
      ok: true,
      importedCount: 0,
      availableCount: existingPastCount ?? 0,
      fromCache: true,
    });
  }

  const stationSlug = resolveStationSlug(subjectName);
  if (!stationSlug) {
    if ((existingPastCount ?? 0) >= 1) {
      return jsonResponse({
        ok: true,
        importedCount: 0,
        availableCount: existingPastCount ?? 0,
        fromCache: true,
      });
    }
    return jsonResponse(
      {
        ok: false,
        error: `Subject "${subjectName}" is not currently mapped in the ALOC Station past-question catalog. Try Curated Bank or AI-Generated Fresh mode.`,
      },
      400
    );
  }

  if (!candidateToken || candidateToken.length < 8) {
    if (
      action === "student_prepare_past_paper" &&
      (existingPastCount ?? 0) >= 1
    ) {
      return jsonResponse({
        ok: true,
        importedCount: 0,
        availableCount: existingPastCount ?? 0,
        fromCache: true,
      });
    }
    return jsonResponse(
      {
        ok: false,
        code: "TOKEN_NOT_CONFIGURED",
        error:
          "Nigerian Past-Questions API key is not connected yet. Open Admin Portal (/admin → Exam Question Bank) to verify your ALOC Station API key.",
      },
      400
    );
  }

  // 0-Credit Pre-Flight Discovery: Check available years & examTypes for this subject
  try {
    const yearsResp = await fetch(
      `${configuredBaseUrl}/subjects/${stationSlug}/years`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-API-Key": candidateToken,
        },
      }
    );

    if (yearsResp.ok) {
      const yearsJson = await yearsResp.json().catch(() => ({}));
      if (Array.isArray(yearsJson?.data)) {
        const yearRows = yearsJson.data as Array<{
          year: number;
          examTypes?: string[];
        }>;
        const allSupportedExamTypes = new Set<string>();
        const yearsMatchingExam: number[] = [];

        for (const yr of yearRows) {
          const types = Array.isArray(yr.examTypes) ? yr.examTypes : [];
          for (const t of types) allSupportedExamTypes.add(t);
          if (types.includes(examMapping.stationType)) {
            yearsMatchingExam.push(Number(yr.year));
          }
        }

        if (yearsMatchingExam.length === 0) {
          if ((existingPastCount ?? 0) >= 1) {
            return jsonResponse({
              ok: true,
              importedCount: 0,
              availableCount: existingPastCount ?? 0,
              fromCache: true,
            });
          }
          const availableLabels = Array.from(allSupportedExamTypes)
            .filter((t) => t === "jamb" || t === "waec" || t === "neco")
            .map((t) => t.toUpperCase())
            .join(", ");
          return jsonResponse(
            {
              ok: false,
              error: availableLabels
                ? `ALOC Station currently indexes "${subjectName}" past papers under ${availableLabels} (not ${examMapping.label} yet). Switch Exam Body to ${availableLabels} or choose "AI-Generated Fresh" for ${examMapping.label} ${subjectName}.`
                : `No ${examMapping.label} past papers found for "${subjectName}" in ALOC Station.`,
            },
            404
          );
        }

        if (examYear !== null && !yearsMatchingExam.includes(examYear)) {
          if ((existingPastCount ?? 0) >= 1) {
            return jsonResponse({
              ok: true,
              importedCount: 0,
              availableCount: existingPastCount ?? 0,
              fromCache: true,
            });
          }
          const sortedYears = yearsMatchingExam
            .sort((a, b) => b - a)
            .slice(0, 10)
            .join(", ");
          return jsonResponse(
            {
              ok: false,
              error: `Year ${examYear} is not indexed for ${examMapping.label} ${subjectName}. Available years include: ${sortedYears} (or select "All Years (Mixed)").`,
            },
            404
          );
        }
      }
    }
  } catch {
    // Non-blocking pre-flight check
  }

  // Fetch questions from ALOC Station v1
  const rawItems: Array<Record<string, unknown>> = [];
  let creditsRemaining: number | null = null;
  let tier: string | null = null;

  try {
    // Strategy A: If All Years + batch >= 20, try 1-credit Assessment Engine first (returns 40-50 balanced questions)
    if (examYear === null && desiredCount >= 20) {
      const preset =
        examCategoryCode === "WAEC" ? "waec_standard_50" : "jamb_standard_40";
      const genRes = await fetch(`${configuredBaseUrl}/assessments/generate`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-API-Key": candidateToken,
        },
        body: JSON.stringify({
          subject: stationSlug,
          examType: examMapping.stationType,
          preset,
          shuffleOptions: false,
        }),
      });

      if (genRes.ok) {
        const genParsed = await genRes.json().catch(() => ({}));
        const genQuestions = genParsed?.data?.questions;
        if (Array.isArray(genQuestions) && genQuestions.length > 0) {
          rawItems.push(...(genQuestions as Array<Record<string, unknown>>));
        }
        if (typeof genParsed?.meta?.creditsRemaining === "number") {
          creditsRemaining = genParsed.meta.creditsRemaining;
        }
        if (typeof genParsed?.meta?.tier === "string") {
          tier = genParsed.meta.tier;
        }
      }
    }

    // Strategy B: Cursor-paginated GET /questions (handles year-filtered queries & fallback)
    if (rawItems.length === 0) {
      const pagesToFetch = Math.min(3, Math.max(1, Math.ceil(desiredCount / 15)));
      let cursor: string | null = null;

      for (let page = 0; page < pagesToFetch; page++) {
        const qs = new URLSearchParams({
          subject: stationSlug,
          examType: examMapping.stationType,
          limit: "15",
        });
        if (examYear !== null) {
          qs.set("year", String(examYear));
        }
        if (cursor) {
          qs.set("cursor", cursor);
        }

        const qRes = await fetch(`${configuredBaseUrl}/questions?${qs.toString()}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "X-API-Key": candidateToken,
          },
        });

        const qParsed = await qRes.json().catch(() => ({}));
        if (!qRes.ok) {
          if (rawItems.length > 0) break;
          if (
            action === "student_prepare_past_paper" &&
            (existingPastCount ?? 0) >= 1
          ) {
            return jsonResponse({
              ok: true,
              importedCount: 0,
              availableCount: existingPastCount ?? 0,
              fromCache: true,
            });
          }
          return jsonResponse(
            {
              ok: false,
              error:
                String(qParsed?.message || qParsed?.error || "") ||
                `ALOC Station API returned HTTP ${qRes.status}.`,
            },
            400
          );
        }

        if (Array.isArray(qParsed?.data)) {
          rawItems.push(...(qParsed.data as Array<Record<string, unknown>>));
        }
        if (typeof qParsed?.meta?.creditsRemaining === "number") {
          creditsRemaining = qParsed.meta.creditsRemaining;
        }
        if (typeof qParsed?.meta?.tier === "string") {
          tier = qParsed.meta.tier;
        }

        const hasMore = Boolean(qParsed?.pagination?.hasMore);
        const nextCursor = qParsed?.pagination?.nextCursor;
        if (!hasMore || typeof nextCursor !== "string" || !nextCursor) {
          break;
        }
        cursor = nextCursor;
      }
    }
  } catch (err) {
    if ((existingPastCount ?? 0) >= 1) {
      return jsonResponse({
        ok: true,
        importedCount: 0,
        availableCount: existingPastCount ?? 0,
        fromCache: true,
      });
    }
    return jsonResponse(
      {
        ok: false,
        error: `Unable to reach ALOC Station API: ${err instanceof Error ? err.message : "Network error"}`,
      },
      502
    );
  }

  if (rawItems.length === 0) {
    if ((existingPastCount ?? 0) >= 1) {
      return jsonResponse({
        ok: true,
        importedCount: 0,
        availableCount: existingPastCount ?? 0,
        fromCache: true,
      });
    }
    return jsonResponse(
      {
        ok: false,
        error: examYear
          ? `No ${examMapping.label} ${subjectName} past questions were returned for year ${examYear}. Try selecting "All Years (Mixed)".`
          : `No ${examMapping.label} ${subjectName} past questions were returned by ALOC Station.`,
      },
      404
    );
  }

  // Ensure verified provenance source + verification records
  const sourceSlug = `aloc-station-${examMapping.stationType}`;
  const sourceTitle = `ALOC Station Past Questions Archive (${examMapping.label})`;
  let sourceId: string | null = null;
  const { data: existingSource } = await adminDb
    .from("learning_content_sources")
    .select("id")
    .eq("slug", sourceSlug)
    .maybeSingle();

  if (existingSource?.id) {
    sourceId = String(existingSource.id);
  } else {
    const { data: createdSource } = await adminDb
      .from("learning_content_sources")
      .insert({
        slug: sourceSlug,
        source_name: sourceTitle,
        source_url_or_reference: "https://aloc.com.ng",
        author_or_publisher: "ALOC Station Educational Data Infrastructure",
        content_classification: "imported_third_party",
        license_or_permission:
          "ALOC Station API Developer License (Authenticated X-API-Key)",
        attribution_text: `Past question indexed via ALOC Station (${examMapping.label}). Independent practice — not affiliated with JAMB, WAEC, or NECO.`,
        is_approved_source: true,
      })
      .select("id")
      .single();
    sourceId = createdSource?.id ? String(createdSource.id) : null;
  }

  const verifCode = `verif-aloc-station-${examMapping.stationType}`;
  let verificationId: string | null = null;
  const { data: existingVerif } = await adminDb
    .from("learning_content_verifications")
    .select("id")
    .eq("code", verifCode)
    .maybeSingle();

  if (existingVerif?.id) {
    verificationId = String(existingVerif.id);
  } else if (sourceId) {
    const { data: createdVerif } = await adminDb
      .from("learning_content_verifications")
      .insert({
        code: verifCode,
        source_id: sourceId,
        content_classification: "imported_third_party",
        verification_status: "attributed_third_party",
        approved_for_publication: true,
        reviewer_name: "Automated Past-Questions API Connector",
        reviewed_at: new Date().toISOString(),
        review_notes:
          "Verified structured past-question payload, metadata, and answer key imported from authenticated ALOC Station API v1.",
      })
      .select("id")
      .single();
    verificationId = createdVerif?.id ? String(createdVerif.id) : null;
  }

  if (!sourceId || !verificationId) {
    return jsonResponse(
      { ok: false, error: "Could not initialize provenance metadata." },
      500
    );
  }

  const subjectSlug = subjectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  await adminDb.from("exam_subjects").upsert(
    {
      exam_category_id: catRow.id,
      subject_name: subjectName,
      subject_slug: subjectSlug,
      available_topics: [`${examMapping.label} Past Questions`],
      is_published: true,
    },
    { onConflict: "exam_category_id,subject_slug", ignoreDuplicates: true }
  );

  let importedCount = 0;
  let skippedDuplicates = 0;

  for (const raw of rawItems) {
    const rawId = raw.id !== undefined && raw.id !== null ? String(raw.id) : "";
    const questionText = cleanAlocHtml(raw.text ?? raw.question);

    const rawSectionStr =
      typeof raw.section === "string" ? raw.section.trim() : "";
    const isMathMlOnlySection = /^<\s*math\b/i.test(rawSectionStr);
    const sectionText = isMathMlOnlySection ? "" : cleanAlocHtml(rawSectionStr);

    const imageCandidate = raw.imageUrl ?? raw.image;
    const imageUrl =
      typeof imageCandidate === "string" &&
      imageCandidate.trim().startsWith("http")
        ? imageCandidate.trim()
        : "";

    if (questionText.length < 4) continue;

    const rawOpts = ((raw.options ?? raw.option) || {}) as Record<
      string,
      unknown
    >;
    const normalizedOptions: Array<{
      key: string;
      text: string;
      order: number;
    }> = [];
    const optLetters: Array<["a" | "b" | "c" | "d" | "e", string, number]> = [
      ["a", "A", 1],
      ["b", "B", 2],
      ["c", "C", 3],
      ["d", "D", 4],
      ["e", "E", 5],
    ];

    for (const [lowerK, upperK, order] of optLetters) {
      const cleanedOpt = cleanAlocHtml(rawOpts[upperK] ?? rawOpts[lowerK]);
      if (cleanedOpt.length >= 1) {
        normalizedOptions.push({
          key: upperK,
          text: cleanedOpt.slice(0, 1180),
          order,
        });
      }
    }

    if (normalizedOptions.length < 2) continue;

    const rawAns = cleanAlocHtml(raw.correctAnswer ?? raw.answer).toUpperCase();
    const matchedOpt =
      normalizedOptions.find((o) => o.key === rawAns) ||
      normalizedOptions.find((o) => rawAns.startsWith(o.key));
    if (!matchedOpt) continue;

    const parsedYearNum = Number(raw.year ?? raw.examyear ?? examYear ?? 0);
    const validYear =
      Number.isFinite(parsedYearNum) &&
      parsedYearNum >= 1978 &&
      parsedYearNum <= 2035
        ? parsedYearNum
        : examYear;

    const externalRef = rawId
      ? `aloc-v1:${examMapping.stationType}:${stationSlug}:${rawId}`
      : `aloc-v1:${examMapping.stationType}:${stationSlug}:${questionText.slice(0, 80).toLowerCase()}`;

    const { data: existingQ } = await adminDb
      .from("exam_questions")
      .select("id")
      .eq("exam_category_id", catRow.id)
      .eq("external_ref", externalRef.slice(0, 155))
      .maybeSingle();

    if (existingQ?.id) {
      skippedDuplicates += 1;
      continue;
    }

    const fullPromptParts: string[] = [];
    if (sectionText && sectionText.toLowerCase() !== questionText.toLowerCase()) {
      fullPromptParts.push(`Comprehension Passage / Context:\n${sectionText}`);
    }
    fullPromptParts.push(questionText);
    if (imageUrl) {
      fullPromptParts.push(`[Diagram Reference: ${imageUrl}]`);
    }
    const finalPrompt = fullPromptParts.join("\n\n").slice(0, 3950);

    const metaObj = (raw.metadata ?? {}) as Record<string, unknown>;
    const metaTopic =
      typeof metaObj.topic === "string" && metaObj.topic.trim()
        ? humanizeSlug(metaObj.topic.trim())
        : "";
    const metaSubtopic =
      typeof metaObj.subtopic === "string" && metaObj.subtopic.trim()
        ? humanizeSlug(metaObj.subtopic.trim())
        : "";

    const topicParts: string[] = [];
    if (metaTopic) {
      topicParts.push(
        metaSubtopic ? `${metaTopic} (${metaSubtopic})` : metaTopic
      );
    } else {
      topicParts.push(
        validYear
          ? `${examMapping.label} ${validYear} Past Paper`
          : `${examMapping.label} Past Questions`
      );
    }
    const finalTopic = topicParts.join(" • ").slice(0, 155);

    const difficulty = mapDifficulty(metaObj.difficultyScore);

    const solutionClean = cleanAlocHtml(raw.solution ?? raw.explanation);
    const alignmentCode =
      typeof metaObj.curriculumAlignment === "string"
        ? metaObj.curriculumAlignment
        : "";
    const objectives = Array.isArray(metaObj.learningObjectives)
      ? (metaObj.learningObjectives as unknown[])
          .map((x) => String(x || "").trim())
          .filter(Boolean)
          .join("; ")
      : "";

    const explanationSegments: string[] = [
      `Correct Answer: Option ${matchedOpt.key} (${matchedOpt.text}).`,
    ];
    if (solutionClean.length >= 4) {
      explanationSegments.push(solutionClean);
    }
    if (objectives) {
      explanationSegments.push(`Syllabus Objective: ${objectives}`);
    }
    explanationSegments.push(
      `Source: ${examMapping.label}${validYear ? ` ${validYear}` : ""} Past Question${alignmentCode ? ` [${alignmentCode}]` : ""}.`
    );

    const { data: insertedQ, error: insertQErr } = await adminDb
      .from("exam_questions")
      .insert({
        exam_category_id: catRow.id,
        subject: subjectName,
        topic: finalTopic,
        difficulty,
        question_type: "multiple_choice",
        prompt: finalPrompt,
        points: 2,
        origin_type: "authorized_past_question",
        source_id: sourceId,
        verification_id: verificationId,
        exam_year: validYear,
        external_ref: externalRef.slice(0, 155),
        is_published: true,
        created_by: isAdmin ? user.id : null,
      })
      .select("id")
      .single();

    if (insertQErr || !insertedQ?.id) {
      skippedDuplicates += 1;
      continue;
    }

    await adminDb.from("exam_question_options").insert(
      normalizedOptions.map((o) => ({
        question_id: insertedQ.id,
        option_key: o.key,
        option_text: o.text,
        option_order: o.order,
      }))
    );

    await adminDb.from("exam_question_answer_keys").insert({
      question_id: insertedQ.id,
      correct_option_key: matchedOpt.key,
      explanation: explanationSegments.join(" ").slice(0, 3950),
    });

    importedCount += 1;
  }

  if (isAdmin && action === "admin_sync_batch" && importedCount > 0) {
    await adminDb.from("admin_audit_logs").insert({
      admin_user_id: user.id,
      action_type: "sync_past_questions_batch",
      target_type: "exam_questions",
      target_id: catRow.id,
      summary: `Imported ${importedCount} ${examMapping.label} ${subjectName}${examYear ? ` (${examYear})` : ""} past questions from ALOC Station`,
      details: {
        examCategoryCode,
        subject: subjectName,
        examYear,
        importedCount,
        skippedDuplicates,
        creditsRemaining,
      },
    });
  }

  let finalCountQuery = adminDb
    .from("exam_questions")
    .select("id", { count: "exact", head: true })
    .eq("exam_category_id", catRow.id)
    .ilike("subject", subjectName)
    .eq("origin_type", "authorized_past_question")
    .eq("is_published", true);

  if (examYear !== null) {
    finalCountQuery = finalCountQuery.eq("exam_year", examYear);
  }

  const { count: finalAvailableCount } = await finalCountQuery;

  return jsonResponse({
    ok: true,
    examCategoryCode,
    subject: subjectName,
    examYear,
    importedCount,
    skippedDuplicates,
    availableCount: finalAvailableCount ?? importedCount,
    creditsRemaining,
    tier,
  });
});
