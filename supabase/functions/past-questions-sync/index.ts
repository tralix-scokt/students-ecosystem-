// Supabase Edge Function: past-questions-sync
// Server-side Nigerian Past-Questions API Connector (JAMB UTME, WAEC WASSCE, NECO SSCE)
// Connects securely to ALOC (questions.aloc.com.ng/api/v2) using server-stored AccessToken,
// deduplicates questions with verified provenance, and keeps answer keys strictly server-only.

import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_ALOC_BASE_URL = "https://questions.aloc.com.ng/api/v2";

const EXAM_CODE_TO_ALOC_TYPE: Record<
  string,
  { alocType: string; label: string }
> = {
  JAMB_UTME: { alocType: "utme", label: "JAMB UTME" },
  WAEC: { alocType: "wassce", label: "WAEC WASSCE" },
  NECO: { alocType: "neco", label: "NECO SSCE" },
};

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

function cleanAlocHtml(raw: unknown): string {
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

function resolveAlocSubjectSlug(subjectName: string): string | null {
  const key = subjectName.trim().toLowerCase();
  if (SUBJECT_TO_ALOC_SLUG[key]) return SUBJECT_TO_ALOC_SLUG[key];
  for (const [k, slug] of Object.entries(SUBJECT_TO_ALOC_SLUG)) {
    if (key.includes(k) || k.includes(key)) return slug;
  }
  return null;
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

  // Resolve user role
  const { data: profile } = await adminDb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";

  // Read stored or env ALOC credentials
  const envToken = (Deno.env.get("ALOC_ACCESS_TOKEN") ?? "").trim();
  const { data: secretRow } = await adminDb
    .from("admin_integration_secrets")
    .select("base_url, secret_token")
    .eq("provider_key", "aloc")
    .maybeSingle();

  const configuredBaseUrl = String(
    payload.baseUrl || secretRow?.base_url || DEFAULT_ALOC_BASE_URL
  ).replace(/\/+$/, "");

  const candidateToken =
    isAdmin && typeof payload.accessToken === "string" && payload.accessToken.trim()
      ? payload.accessToken.trim()
      : secretRow?.secret_token?.trim() || envToken;

  // ACTION 1: Admin test & optional save connection
  if (action === "test_connection") {
    if (!isAdmin) {
      return jsonResponse(
        { ok: false, error: "Administrator authorization required." },
        403
      );
    }

    if (!candidateToken || candidateToken.length < 6) {
      return jsonResponse(
        {
          ok: false,
          error:
            "No ALOC AccessToken provided or saved yet. Paste your token from questions.aloc.com.ng first.",
        },
        400
      );
    }

    try {
      const testUrl = `${configuredBaseUrl}/q?subject=mathematics`;
      const resp = await fetch(testUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          AccessToken: candidateToken,
        },
      });

      const bodyText = await resp.text();
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(bodyText);
      } catch {
        // non-json response
      }

      if (!resp.ok || (!parsed.data && parsed.status !== 200)) {
        return jsonResponse(
          {
            ok: false,
            error:
              String(parsed.error || parsed.message || "") ||
              `ALOC API returned HTTP ${resp.status}. Please verify your AccessToken on questions.aloc.com.ng.`,
          },
          400
        );
      }

      if (payload.save === true && typeof payload.accessToken === "string") {
        await adminDb.from("admin_integration_secrets").upsert(
          {
            provider_key: "aloc",
            display_name: "ALOC Nigerian Past Questions API (JAMB / WAEC / NECO)",
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
          summary: `Verified & saved ALOC Past-Questions API token (ending ${candidateToken.slice(-4)})`,
          details: { baseUrl: configuredBaseUrl },
        });
      }

      const sampleData = parsed.data as Record<string, unknown> | undefined;
      return jsonResponse({
        ok: true,
        message:
          "Connected! Live response verified from ALOC Nigerian Past-Questions API.",
        sampleExamYear: sampleData?.examyear ?? null,
        sampleExamType: sampleData?.examtype ?? null,
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

  // ACTION 2 & 3: Admin Bulk Sync OR Student Live Past-Paper Preparation
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

  const examMapping = EXAM_CODE_TO_ALOC_TYPE[examCategoryCode];
  if (!examMapping) {
    return jsonResponse(
      {
        ok: false,
        error: `Exam category ${examCategoryCode} is not a Nigerian past-question exam (use JAMB_UTME, WAEC, or NECO).`,
      },
      400
    );
  }

  const alocSlug = resolveAlocSubjectSlug(subjectName);
  if (!alocSlug) {
    return jsonResponse(
      {
        ok: false,
        error: `Subject "${subjectName}" does not map to a supported past-question archive slug.`,
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

  // Check how many published past questions already exist in DB for this filter
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

  // For students: if DB already has enough cached past questions and no token is configured, let them start immediately from cache!
  if (!candidateToken || candidateToken.length < 6) {
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
          "Nigerian Past-Questions API token is not connected yet. Open Admin Portal (/admin → Exam Question Bank) and paste your ALOC AccessToken from questions.aloc.com.ng.",
      },
      400
    );
  }

  // If student requested a past paper and we already have >= desiredCount cached for that exact exam/subject/year, serve fast while keeping cache warm
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

  // Build ALOC v2 request URL
  const qs = new URLSearchParams({
    subject: alocSlug,
    type: examMapping.alocType,
  });
  if (examYear !== null) {
    qs.set("year", String(examYear));
  }

  let rawItems: Array<Record<string, unknown>> = [];
  try {
    const apiRes = await fetch(`${configuredBaseUrl}/m?${qs.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        AccessToken: candidateToken,
      },
    });

    const parsed = await apiRes.json().catch(() => ({}));
    if (!apiRes.ok) {
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
            String(parsed?.error || parsed?.message || "") ||
            `Past-Questions API returned HTTP ${apiRes.status}.`,
        },
        400
      );
    }

    if (Array.isArray(parsed?.data)) {
      rawItems = parsed.data as Array<Record<string, unknown>>;
    } else if (parsed?.data && typeof parsed.data === "object") {
      rawItems = [parsed.data as Record<string, unknown>];
    }
  } catch (err) {
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
        error: `Unable to reach Past-Questions API: ${err instanceof Error ? err.message : "Network error"}`,
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
          ? `No ${examMapping.label} ${subjectName} past questions were returned by the archive for year ${examYear}. Try selecting "All Years (Mixed)".`
          : `No ${examMapping.label} ${subjectName} past questions were returned by the archive.`,
      },
      404
    );
  }

  // Ensure verified provenance source + verification records exist for authorized_past_question
  const sourceTitle = `ALOC Nigerian Past Questions Archive (${examMapping.label})`;
  let sourceId: string | null = null;
  const { data: existingSource } = await adminDb
    .from("learning_content_sources")
    .select("id")
    .eq("source_title", sourceTitle)
    .maybeSingle();

  if (existingSource?.id) {
    sourceId = String(existingSource.id);
  } else {
    const { data: createdSource } = await adminDb
      .from("learning_content_sources")
      .insert({
        source_title: sourceTitle,
        source_organization: "ALOC Past Questions Archive (questions.aloc.com.ng)",
        source_url: "https://questions.aloc.com.ng",
        license_name: "API Developer Access License",
        usage_rights_summary: `Indexed ${examMapping.label} past examination practice questions retrieved via authenticated ALOC API v2.`,
        attribution_text: `Past question indexed via ALOC (${examMapping.label}). Independent practice — not affiliated with JAMB, WAEC, or NECO.`,
      })
      .select("id")
      .single();
    sourceId = createdSource?.id ? String(createdSource.id) : null;
  }

  let verificationId: string | null = null;
  const { data: existingVerif } = await adminDb
    .from("learning_content_verifications")
    .select("id")
    .eq("reviewer_display_role", "Automated Past-Questions API Connector")
    .maybeSingle();

  if (existingVerif?.id) {
    verificationId = String(existingVerif.id);
  } else {
    const { data: createdVerif } = await adminDb
      .from("learning_content_verifications")
      .insert({
        verification_status: "verified",
        reviewer_display_role: "Automated Past-Questions API Connector",
        review_notes:
          "Verified structured past-question payload and answer key imported from authenticated ALOC API v2.",
        verified_at: new Date().toISOString(),
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

  // Ensure subject exists in exam_subjects for this category
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
    const questionText = cleanAlocHtml(raw.question);
    const sectionText = cleanAlocHtml(raw.section);
    const imageUrl =
      typeof raw.image === "string" && raw.image.trim().startsWith("http")
        ? raw.image.trim()
        : "";

    if (questionText.length < 4) continue;

    const rawOpts = (raw.option ?? {}) as Record<string, unknown>;
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
      const cleanedOpt = cleanAlocHtml(rawOpts[lowerK] ?? rawOpts[upperK]);
      if (cleanedOpt.length >= 1) {
        normalizedOptions.push({
          key: upperK,
          text: cleanedOpt.slice(0, 1180),
          order,
        });
      }
    }

    if (normalizedOptions.length < 2) continue;

    const rawAns = cleanAlocHtml(raw.answer).toUpperCase();
    const matchedOpt =
      normalizedOptions.find((o) => o.key === rawAns) ||
      normalizedOptions.find((o) => rawAns.startsWith(o.key));
    if (!matchedOpt) continue;

    const parsedYearNum = Number(raw.examyear ?? examYear ?? 0);
    const validYear =
      Number.isFinite(parsedYearNum) &&
      parsedYearNum >= 1978 &&
      parsedYearNum <= 2035
        ? parsedYearNum
        : examYear;

    const externalRef = rawId
      ? `aloc:${examMapping.alocType}:${alocSlug}:${rawId}`
      : `aloc:${examMapping.alocType}:${alocSlug}:${questionText.slice(0, 80).toLowerCase()}`;

    // Skip if already imported
    const { data: existingQ } = await adminDb
      .from("exam_questions")
      .select("id")
      .eq("exam_category_id", catRow.id)
      .eq("external_ref", externalRef)
      .maybeSingle();

    if (existingQ?.id) {
      skippedDuplicates += 1;
      continue;
    }

    const fullPromptParts: string[] = [];
    if (sectionText && sectionText.toLowerCase() !== questionText.toLowerCase()) {
      fullPromptParts.push(`Instruction / Passage: ${sectionText}`);
    }
    fullPromptParts.push(questionText);
    if (imageUrl) {
      fullPromptParts.push(`[Diagram Reference: ${imageUrl}]`);
    }
    const finalPrompt = fullPromptParts.join("\n\n").slice(0, 3950);

    const topicLabel = validYear
      ? `${examMapping.label} ${validYear} Past Paper`
      : `${examMapping.label} Past Questions`;

    const solutionClean = cleanAlocHtml(raw.solution);
    const finalExplanation =
      solutionClean.length >= 4
        ? `${solutionClean} (Source: ${examMapping.label}${validYear ? ` ${validYear}` : ""} Past Question)`
        : `Correct option: ${matchedOpt.key} (${matchedOpt.text}). Indexed from ${examMapping.label}${validYear ? ` ${validYear}` : ""} past paper archive.`;

    const { data: insertedQ, error: insertQErr } = await adminDb
      .from("exam_questions")
      .insert({
        exam_category_id: catRow.id,
        subject: subjectName,
        topic: topicLabel.slice(0, 155),
        difficulty: "medium",
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
      explanation: finalExplanation.slice(0, 3950),
    });

    importedCount += 1;
  }

  if (isAdmin && action === "admin_sync_batch" && importedCount > 0) {
    await adminDb.from("admin_audit_logs").insert({
      admin_user_id: user.id,
      action_type: "sync_past_questions_batch",
      target_type: "exam_questions",
      target_id: catRow.id,
      summary: `Imported ${importedCount} ${examMapping.label} ${subjectName}${examYear ? ` (${examYear})` : ""} past questions from ALOC API`,
      details: {
        examCategoryCode,
        subject: subjectName,
        examYear,
        importedCount,
        skippedDuplicates,
      },
    });
  }

  // Recount total available for this selection
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
  });
});
