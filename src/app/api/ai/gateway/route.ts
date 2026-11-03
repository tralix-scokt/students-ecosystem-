import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isValidTutorImageDataUrl } from "@/lib/ai/imageAttachment";
import {
  detectTimeSensitiveIntent,
  fetchLiveCurrentContext,
} from "@/lib/ai/liveSearchGrounding";
import {
  evaluateStudentPromptSafety,
  TUTOR_LEARNING_MODES,
  type TutorExplanationStyle,
  type TutorLearningMode,
  type TutorVisualAidPreference,
} from "@/lib/ai/types";
import { buildMasterTeacherSystemPrompt } from "@/lib/ai/visualTeaching";
import {
  extractAiJsonPayload,
  runServerProviderCompletion,
  type AiMessageContentPart,
} from "@/lib/ai/server-gateway";
import {
  checkRateLimit,
  extractClientIdentifier,
} from "@/lib/security/rateLimiter";
import {
  createBoundedFetch,
  getSupabasePublicConfig,
  isNetworkTransportError,
} from "@/lib/supabase/config";
import {
  createServerSupabaseClient,
  getServerAuthenticatedUser,
} from "@/lib/supabase/server";

export const maxDuration = 60;

const SAFETY_GUARD = `You are the TRALIX AI Academic Tutor inside E-LEARNING ECOSYSTEM.
1. Age-appropriate & safe for secondary (including minors aged 11–18), university, and polytechnic students. Refuse harmful, violent, explicit, self-harm, or dishonest live-exam cheating requests.
2. Never claim official WAEC, NECO, or JAMB endorsement or fabricate copyrighted past questions.
3. Encourage genuine conceptual understanding with clear headings, worked steps, and plain-text formulas.`;

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

export async function POST(request: Request) {
  const clientId = extractClientIdentifier(request.headers);
  const rate = checkRateLimit("ai-gateway", clientId);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Too many AI requests in a short window. Please wait ${rate.retryAfterSeconds}s and try again.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

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
    return NextResponse.json(
      { ok: false, error: "Unsupported AI gateway action." },
      { status: 400 }
    );
  }

  if (action === "tutor_chat") {
    const rawMessage = String(body?.message || "").trim();
    const rawImage = body?.imageDataUrl ? String(body.imageDataUrl).trim() : "";

    if (rawImage && !isValidTutorImageDataUrl(rawImage)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Attached photo format is invalid or exceeds the 4 MB upload limit. Please upload a PNG, JPG, or WEBP image.",
        },
        { status: 400 }
      );
    }

    const effectiveCheckPrompt =
      rawMessage ||
      (rawImage
        ? "Please carefully analyze this photo and explain or solve what is shown step by step."
        : "");
    const safety = evaluateStudentPromptSafety(effectiveCheckPrompt);
    if (!safety.safe) {
      return NextResponse.json(
        { ok: false, error: safety.reason || "Invalid academic prompt." },
        { status: 400 }
      );
    }
  } else if (
    action === "written_answer_feedback" ||
    action === "explain_exam_answer"
  ) {
    const combinedInput = `${String(body?.questionPrompt || "")} ${String(body?.studentAnswer || "")}`.trim();
    if (combinedInput.length >= 2) {
      const safety = evaluateStudentPromptSafety(combinedInput.slice(0, 3900));
      if (!safety.safe) {
        return NextResponse.json(
          { ok: false, error: safety.reason || "Invalid academic prompt." },
          { status: 400 }
        );
      }
    }
  }

  const rawAuthHeader = request.headers.get("authorization") || "";
  let user: User | null = null;
  let isEmailVerified = false;
  let supabase: SupabaseClient | null = null;

  if (rawAuthHeader.toLowerCase().startsWith("bearer ")) {
    const pubCfg = getSupabasePublicConfig();
    if (pubCfg) {
      const bearerClient = createClient(pubCfg.url, pubCfg.anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          headers: { Authorization: rawAuthHeader },
          fetch: createBoundedFetch(3500),
        },
      });
      try {
        const { data: bearerAuth, error: bearerErr } =
          await bearerClient.auth.getUser();
        if (bearerErr && isNetworkTransportError(bearerErr)) {
          return NextResponse.json({ ok: false, transportFallback: true });
        }
        if (!bearerErr && bearerAuth?.user) {
          user = bearerAuth.user;
          isEmailVerified = Boolean(bearerAuth.user.email_confirmed_at);
          supabase = bearerClient;
        }
      } catch (err) {
        if (isNetworkTransportError(err)) {
          return NextResponse.json({ ok: false, transportFallback: true });
        }
      }
    }
  }

  if (!user) {
    const cookieAuth = await getServerAuthenticatedUser();
    user = cookieAuth.user;
    isEmailVerified = cookieAuth.isEmailVerified;
  }

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Authentication required." },
      { status: 401 }
    );
  }
  if (!isEmailVerified) {
    return NextResponse.json(
      {
        ok: false,
        error: "Please verify your email address before using AI study features.",
      },
      { status: 403 }
    );
  }

  if (!supabase) {
    supabase = await createServerSupabaseClient({ timeoutMs: 3500 });
  }
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase environment is not configured." },
      { status: 503 }
    );
  }

  const featureName = resolveFeatureName(action);
  const startedAt = Date.now();
  let reservedLogId: string | null = null;
  let preferredProvider: "openai" | "openrouter" = "openai";
  let defaultModel = "gpt-4o-mini";

  try {
    const { data: quotaReservation, error: reserveErr } = await supabase.rpc(
      "reserve_student_ai_quota_slot",
      {
        p_feature: featureName,
        p_provider: "openai",
        p_model: "gpt-4o-mini",
      }
    );

    if (reserveErr) {
      if (isNetworkTransportError(reserveErr)) {
        return NextResponse.json({ ok: false, transportFallback: true });
      }
      return NextResponse.json(
        { ok: false, error: "Unable to verify AI request quota right now." },
        { status: 503 }
      );
    }

    const quota = (quotaReservation || {}) as Record<string, unknown>;
    if (!quota.allowed) {
      if (quota.reason === "paused") {
        return NextResponse.json(
          {
            ok: false,
            error:
              "AI services are temporarily paused by platform administration. Your saved notes, lessons, and curated exam banks remain available.",
          },
          { status: 503 }
        );
      }

      const dailyLimit = Number(quota.dailyLimit || 60);
      return NextResponse.json(
        {
          ok: false,
          error: `Daily AI request limit (${dailyLimit} per 24h) reached. Continue with curated lessons or practice banks and return later.`,
        },
        { status: 429 }
      );
    }

    reservedLogId = quota.logId ? String(quota.logId) : null;
    const maxTokens = Math.min(
      Math.max(Number(quota.maxTokens || 1100), 128),
      2048
    );
    preferredProvider =
      quota.preferredProvider === "openrouter" ? "openrouter" : "openai";
    defaultModel = String(quota.defaultModel || "gpt-4o-mini");
    const fallbackModel = String(quota.fallbackModel || "openai/gpt-4o-mini");
    const remainingAfter = Number(quota.remainingAfter ?? 0);

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

    if (action === "tutor_chat") {
      const rawUserText = String(body.message || "").trim();
      const imageDataUrl =
        body.imageDataUrl && isValidTutorImageDataUrl(String(body.imageDataUrl))
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

      const modeId = String(
        body.learningMode || "explain_topic"
      ) as TutorLearningMode;
      const modeMeta =
        TUTOR_LEARNING_MODES.find((m) => m.id === modeId) ||
        TUTOR_LEARNING_MODES[0];
      const subject = String(body.subject || "").trim().slice(0, 120) || null;
      const explanationStyle = String(
        body.explanationStyle || "step_by_step"
      ).slice(0, 40) as TutorExplanationStyle;
      const rawVisual = String(body.visualPreference || "auto").toLowerCase();
      const visualPreference: TutorVisualAidPreference =
        rawVisual === "always" || rawVisual === "none" ? rawVisual : "auto";
      let conversationId = body.conversationId
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
        if (prevRows) {
          historyMessages = [...prevRows].reverse().map((r) => ({
            role: r.role === "assistant" ? "assistant" : "user",
            content: String(r.content),
          }));
        }
      } else {
        const titleSeed = rawUserText || (imageDataUrl ? "Photo Study Analysis" : userPrompt);
        const autoTitle =
          titleSeed.length > 64
            ? `${titleSeed.slice(0, 61).trim()}...`
            : titleSeed;
        const { data: createdConv } = await supabase
          .from("ai_tutor_conversations")
          .insert({
            user_id: user.id,
            title: autoTitle || "Academic Study Session",
            learning_mode: modeMeta.id,
            subject,
            course_slug: body.courseSlug
              ? String(body.courseSlug).slice(0, 140)
              : null,
            lesson_slug: body.lessonSlug
              ? String(body.lessonSlug).slice(0, 140)
              : null,
            message_count: 0,
          })
          .select("id")
          .single();
        if (createdConv?.id) {
          conversationId = createdConv.id;
        }
      }

      const createdNewConv = !body.conversationId && Boolean(conversationId);

      // Live current-knowledge retrieval so the AI provides up-to-date answers to any question
      const isTimeSensitive = detectTimeSensitiveIntent(rawUserText || userPrompt);
      const liveGrounding = rawUserText
        ? await fetchLiveCurrentContext(rawUserText)
        : {
            contextBlock: "",
            sources: [],
            usedLiveSearch: false,
            isTimeSensitive: false,
          };

      const teacherSystemPrompt = buildMasterTeacherSystemPrompt({
        academicContext,
        subject,
        learningMode: modeMeta.id,
        modeLabel: modeMeta.label,
        modeDescription: modeMeta.description,
        explanationStyle,
        visualPreference,
        hasImageAttachment: Boolean(imageDataUrl),
        liveGroundedContext: liveGrounding.contextBlock,
      });

      const userTurnContent: string | AiMessageContentPart[] = imageDataUrl
        ? [
            { type: "text", text: userPrompt },
            {
              type: "image_url",
              image_url: { url: imageDataUrl, detail: "high" },
            },
          ]
        : userPrompt;

      let completion;
      try {
        completion = await runServerProviderCompletion({
          messages: [
            {
              role: "system",
              content: teacherSystemPrompt,
            },
            ...historyMessages,
            { role: "user", content: userTurnContent },
          ],
          maxTokens: Math.min(Math.max(maxTokens, 1500), 2048),
          preferredProvider,
          defaultModel,
          fallbackModel,
          preferLiveWebSearch: isTimeSensitive && !imageDataUrl,
        });
      } catch (providerErr) {
        if (createdNewConv && conversationId) {
          await supabase
            .from("ai_tutor_conversations")
            .delete()
            .eq("id", conversationId)
            .eq("user_id", user.id)
            .eq("message_count", 0);
        }
        throw providerErr;
      }

      if (conversationId) {
        await supabase.from("ai_tutor_messages").insert([
          {
            conversation_id: conversationId,
            user_id: user.id,
            role: "user",
            content: storedUserMessageContent,
            learning_mode: modeMeta.id,
            is_ai_generated: false,
            is_verified_educational_material: false,
          },
          {
            conversation_id: conversationId,
            user_id: user.id,
            role: "assistant",
            content: completion.content,
            learning_mode: modeMeta.id,
            provider: completion.provider,
            model: completion.model,
            is_ai_generated: true,
            is_verified_educational_material: false,
          },
        ]);

        const { count: exactMsgCount } = await supabase
          .from("ai_tutor_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conversationId)
          .eq("user_id", user.id);

        await supabase
          .from("ai_tutor_conversations")
          .update({
            learning_mode: modeMeta.id,
            subject,
            message_count: exactMsgCount ?? historyMessages.length + 2,
            last_message_at: new Date().toISOString(),
          })
          .eq("id", conversationId)
          .eq("user_id", user.id);
      }

      if (reservedLogId) {
        await supabase.rpc("finalize_student_ai_quota_slot", {
          p_log_id: reservedLogId,
          p_status: "success",
          p_provider: completion.provider,
          p_model: completion.model,
          p_prompt_tokens: completion.promptTokens,
          p_completion_tokens: completion.completionTokens,
          p_total_tokens: completion.totalTokens,
          p_latency_ms: Date.now() - startedAt,
          p_error_code: null,
        });
      }

      const followUps: string[] = [];
      const followMatch = completion.content.match(
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
        ...(completion.webCitations || []),
        ...liveGrounding.sources.map((s) => ({ title: s.title, url: s.url })),
      ]) {
        if (
          src.url &&
          !mergedSources.some((existing) => existing.url === src.url)
        ) {
          mergedSources.push(src);
        }
        if (mergedSources.length >= 4) break;
      }

      return NextResponse.json({
        ok: true,
        conversationId,
        reply: completion.content,
        suggestedQuestions: followUps,
        liveSources: mergedSources,
        usedLiveWeb:
          mergedSources.length > 0 || completion.provider === "openrouter-live-web",
        provider: completion.provider,
        model: completion.model,
        isAiGenerated: true,
        isVerifiedEducationalMaterial: false,
        remainingDailyQuota: remainingAfter,
      });
    }

    if (action === "generate_exam_questions") {
      const examCategory = String(body.examCategory || "WAEC").slice(0, 40);
      const subject = String(body.subject || "Physics").slice(0, 80);
      const topics = Array.isArray(body.topics)
        ? body.topics
            .slice(0, 5)
            .map((t) => String(t).slice(0, 80))
            .join(", ")
        : "";
      const difficulty = String(body.difficulty || "medium").slice(0, 20);
      const count = Math.min(Math.max(Number(body.questionCount || 5), 2), 10);

      const completion = await runServerProviderCompletion({
        messages: [
          { role: "system", content: `${SAFETY_GUARD}\n${academicContext}` },
          {
            role: "user",
            content: `Create ${count} ORIGINAL AI-generated practice questions for ${examCategory}-style study in "${subject}"${topics ? ` on topics: ${topics}` : ""} at "${difficulty}" difficulty. Never claim they are official past papers. Return JSON: {"questions":[{"questionType":"multiple_choice","topic":"...","difficulty":"medium","prompt":"...","points":2,"options":[{"key":"A","text":"..."},{"key":"B","text":"..."},{"key":"C","text":"..."},{"key":"D","text":"..."}],"correctOptionKey":"B","explanation":"..."}]}`,
          },
        ],
        maxTokens: Math.min(Math.max(maxTokens, 900), 2048),
        preferredProvider,
        defaultModel,
        fallbackModel,
        jsonMode: true,
      });

      const parsed = extractAiJsonPayload(completion.content);
      if (reservedLogId) {
        await supabase.rpc("finalize_student_ai_quota_slot", {
          p_log_id: reservedLogId,
          p_status: "success",
          p_provider: completion.provider,
          p_model: completion.model,
          p_prompt_tokens: completion.promptTokens,
          p_completion_tokens: completion.completionTokens,
          p_total_tokens: completion.totalTokens,
          p_latency_ms: Date.now() - startedAt,
          p_error_code: null,
        });
      }

      return NextResponse.json({
        ok: true,
        questions: Array.isArray(parsed?.questions) ? parsed.questions : [],
        originType: "ai_generated_practice",
        isAiGenerated: true,
        isVerifiedEducationalMaterial: false,
        provider: completion.provider,
        model: completion.model,
      });
    }

    const prompt =
      action === "written_answer_feedback"
        ? `Provide constructive AI-assisted study feedback on this written practice answer. Begin with "Advisory Study Feedback (Not Official Examiner Marking):"\nQuestion: ${String(body.questionPrompt || "").slice(0, 1200)}\nStudent Answer: ${String(body.studentAnswer || "").slice(0, 2500)}`
        : action === "explain_exam_answer"
          ? `Explain clearly why the student's answer was incorrect and derive the right answer.\nQuestion: ${String(body.questionPrompt || "").slice(0, 1200)}\nStudent Answer: ${String(body.studentAnswer || "").slice(0, 400)}\nCorrect Answer: ${String(body.correctAnswer || "").slice(0, 400)}`
          : `Create an actionable 5-day AI revision plan for ${String(body.examName || "Practice Exam").slice(0, 120)} (${String(body.subject || "").slice(0, 80)}), score ${String(body.scorePercent ?? "").slice(0, 10)}%, weak topics: ${Array.isArray(body.weakTopics) ? body.weakTopics.slice(0, 10).join(", ") : "general review"}.`;

    const completion = await runServerProviderCompletion({
      messages: [
        { role: "system", content: `${SAFETY_GUARD}\n${academicContext}` },
        { role: "user", content: prompt },
      ],
      maxTokens,
      preferredProvider,
      defaultModel,
      fallbackModel,
    });

    if (action === "revision_plan" && body.attemptId) {
      await supabase
        .from("student_exam_attempts")
        .update({ ai_revision_plan: completion.content })
        .eq("id", String(body.attemptId))
        .eq("user_id", user.id);
    }

    if (action === "written_answer_feedback" && body.responseId) {
      await supabase
        .from("student_exam_responses")
        .update({ ai_written_feedback: completion.content })
        .eq("id", String(body.responseId))
        .eq("user_id", user.id);
    }

    if (reservedLogId) {
      await supabase.rpc("finalize_student_ai_quota_slot", {
        p_log_id: reservedLogId,
        p_status: "success",
        p_provider: completion.provider,
        p_model: completion.model,
        p_prompt_tokens: completion.promptTokens,
        p_completion_tokens: completion.completionTokens,
        p_total_tokens: completion.totalTokens,
        p_latency_ms: Date.now() - startedAt,
        p_error_code: null,
      });
    }

    return NextResponse.json({
      ok: true,
      content: completion.content,
      isAiGenerated: true,
      isVerifiedEducationalMaterial: false,
      isOfficialExaminerMarking: false,
      provider: completion.provider,
      model: completion.model,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    if (reservedLogId) {
      try {
        await supabase.rpc("finalize_student_ai_quota_slot", {
          p_log_id: reservedLogId,
          p_status: "error",
          p_provider: preferredProvider,
          p_model: defaultModel,
          p_prompt_tokens: 0,
          p_completion_tokens: 0,
          p_total_tokens: 0,
          p_latency_ms: Date.now() - startedAt,
          p_error_code: msg.slice(0, 120),
        });
      } catch {
        // Ignore secondary logging transport error
      }
    }

    if (msg.startsWith("NETWORK_TRANSPORT:") || isNetworkTransportError(err)) {
      return NextResponse.json({ ok: false, transportFallback: true });
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "The AI study service is momentarily unavailable. Your study data is safe—please try again shortly.",
      },
      { status: 503 }
    );
  }
}
