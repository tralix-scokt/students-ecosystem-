import { invokeAiGateway } from "@/lib/ai/client-gateway";
import { invokePastQuestionsConnector } from "@/lib/exams/pastQuestionsClient";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export interface ExamCategoryRecord {
  id: string;
  code: string;
  name: string;
  shortLabel: string;
  academicCategory: string;
  description: string;
  disclaimerText: string;
  defaultDurationMinutes: number;
}

export interface ExamSubjectRecord {
  id: string;
  examCategoryId: string;
  subjectName: string;
  subjectSlug: string;
  availableTopics: string[];
}

export interface ActiveExamQuestion {
  key: string;
  order: number;
  questionType:
    | "multiple_choice"
    | "true_false"
    | "short_answer"
    | "written_response";
  topic: string;
  difficulty: string;
  prompt: string;
  points: number;
  originType: string;
  examYear?: number | null;
  recommendedCourseSlug?: string | null;
  recommendedLessonSlug?: string | null;
  options: Array<{ key: string; text: string }>;
}

export interface ActiveExamAttempt {
  id: string;
  examCategoryCode: string;
  examName: string;
  subject: string;
  difficulty: string;
  questionCount: number;
  isTimed: boolean;
  timeLimitMinutes: number | null;
  practiceSource: "curated_bank" | "ai_generated";
  questions: ActiveExamQuestion[];
  status: "in_progress" | "submitted";
  startedAt: string;
}

export interface SubmittedExamResponseItem {
  id: string;
  questionKey: string;
  questionOrder: number;
  questionType: string;
  topic: string;
  prompt: string;
  studentAnswer: string;
  status: "correct" | "incorrect" | "written_recorded" | "unanswered";
  isCorrect: boolean | null;
  isOfficiallyMarked: boolean;
  earnedPoints: number;
  possiblePoints: number;
  correctAnswerDisplay: string;
  explanation: string;
  aiWrittenFeedback: string | null;
}

export interface ExamAttemptHistoryItem {
  id: string;
  examCategoryCode: string;
  examName: string;
  subject: string;
  practiceSource: "curated_bank" | "ai_generated";
  questionCount: number;
  scorePercent: number | null;
  correctCount: number;
  gradableCount: number;
  weakTopics: string[];
  topicBreakdown: Array<{
    topic: string;
    correct: number;
    total: number;
    accuracyPercent: number;
  }>;
  revisionRecommendations: Array<{
    courseSlug: string;
    courseTitle: string;
    lessonSlug: string;
    lessonTitle: string;
    subject: string;
  }>;
  aiRevisionPlan: string | null;
  timeSpentSeconds: number | null;
  submittedAt: string | null;
}

export interface TopicPerformanceItem {
  subject: string;
  examCategoryCode: string;
  topic: string;
  questionsAttempted: number;
  questionsCorrect: number;
  accuracyPercent: number;
}

export interface PastQuestionsAvailability {
  apiConfigured: boolean;
  pastCounts: Record<string, number>;
}

export async function fetchExamPrepBootstrap(): Promise<{
  categories: ExamCategoryRecord[];
  subjects: ExamSubjectRecord[];
  attempts: ExamAttemptHistoryItem[];
  topicPerformance: TopicPerformanceItem[];
  pastQuestionsAvailability?: PastQuestionsAvailability;
}> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return {
      categories: [],
      subjects: [],
      attempts: [],
      topicPerformance: [],
    };
  }

  const [catRes, subjRes, attRes, perfRes, pqAvailRes] = await Promise.all([
    supabase
      .from("exam_categories")
      .select("*")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .limit(20),
    supabase
      .from("exam_subjects")
      .select("*")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .limit(100),
    supabase
      .from("student_exam_attempts")
      .select(
        "id, exam_category_code, exam_name, subject, practice_source, question_count, score_percent, correct_count, gradable_count, weak_topics, topic_breakdown, revision_recommendations, ai_revision_plan, time_spent_seconds, submitted_at"
      )
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false })
      .limit(20),
    supabase
      .from("student_exam_topic_performance")
      .select("*")
      .order("accuracy_percent", { ascending: true })
      .limit(30),
    Promise.resolve(
      supabase.rpc("get_past_questions_public_availability")
    ).catch(() => ({ data: null })),
  ]);

  const categories: ExamCategoryRecord[] = (catRes.data || []).map(
    (r: Record<string, unknown>) => ({
      id: String(r.id),
      code: String(r.code),
      name: String(r.name),
      shortLabel: String(r.short_label),
      academicCategory: String(r.academic_category),
      description: String(r.description),
      disclaimerText: String(r.disclaimer_text),
      defaultDurationMinutes: Number(r.default_duration_minutes || 30),
    })
  );

  const subjects: ExamSubjectRecord[] = (subjRes.data || []).map(
    (r: Record<string, unknown>) => ({
      id: String(r.id),
      examCategoryId: String(r.exam_category_id),
      subjectName: String(r.subject_name),
      subjectSlug: String(r.subject_slug),
      availableTopics: Array.isArray(r.available_topics)
        ? r.available_topics.map(String)
        : [],
    })
  );

  const attempts: ExamAttemptHistoryItem[] = (attRes.data || []).map(
    (r: Record<string, unknown>) => ({
      id: String(r.id),
      examCategoryCode: String(r.exam_category_code),
      examName: String(r.exam_name),
      subject: String(r.subject),
      practiceSource:
        r.practice_source === "ai_generated" ? "ai_generated" : "curated_bank",
      questionCount: Number(r.question_count || 0),
      scorePercent:
        r.score_percent !== null && r.score_percent !== undefined
          ? Number(r.score_percent)
          : null,
      correctCount: Number(r.correct_count || 0),
      gradableCount: Number(r.gradable_count || 0),
      weakTopics: Array.isArray(r.weak_topics) ? r.weak_topics.map(String) : [],
      topicBreakdown: Array.isArray(r.topic_breakdown)
        ? (r.topic_breakdown as ExamAttemptHistoryItem["topicBreakdown"])
        : [],
      revisionRecommendations: Array.isArray(r.revision_recommendations)
        ? (r.revision_recommendations as ExamAttemptHistoryItem["revisionRecommendations"])
        : [],
      aiRevisionPlan: r.ai_revision_plan ? String(r.ai_revision_plan) : null,
      timeSpentSeconds:
        r.time_spent_seconds !== null ? Number(r.time_spent_seconds) : null,
      submittedAt: r.submitted_at ? String(r.submitted_at) : null,
    })
  );

  const topicPerformance: TopicPerformanceItem[] = (perfRes.data || []).map(
    (r: Record<string, unknown>) => ({
      subject: String(r.subject),
      examCategoryCode: String(r.exam_category_code),
      topic: String(r.topic),
      questionsAttempted: Number(r.questions_attempted || 0),
      questionsCorrect: Number(r.questions_correct || 0),
      accuracyPercent: Number(r.accuracy_percent || 0),
    })
  );

  return {
    categories,
    subjects,
    attempts,
    topicPerformance,
    pastQuestionsAvailability:
      pqAvailRes && pqAvailRes.data
        ? (pqAvailRes.data as PastQuestionsAvailability)
        : undefined,
  };
}

export async function startPracticeExamSession(params: {
  examCategoryCode: string;
  subject: string;
  topics: string[];
  difficulty: string;
  questionCount: number;
  isTimed: boolean;
  timeLimitMinutes: number;
  practiceSource: "curated_bank" | "past_questions_api" | "ai_generated";
  examYear?: number | null;
}): Promise<{ ok: true; attempt: ActiveExamAttempt } | { ok: false; error: string }> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return { ok: false, error: "Supabase client is not configured." };
  }

  if (params.practiceSource === "past_questions_api") {
    const syncRes = await invokePastQuestionsConnector({
      action: "student_prepare_past_paper",
      examCategoryCode: params.examCategoryCode,
      subject: params.subject,
      examYear: params.examYear ?? null,
      questionCount: params.questionCount,
    });

    if (!syncRes.ok) {
      return {
        ok: false,
        error:
          syncRes.error ||
          "Could not fetch past questions right now. Verify the ALOC AccessToken in Admin Portal (/admin) or switch to Curated / AI Practice.",
      };
    }

    const { data, error } = await supabase.rpc("start_student_exam_attempt", {
      p_exam_category_code: params.examCategoryCode,
      p_subject: params.subject,
      p_topics: null,
      p_difficulty: "mixed",
      p_question_count: params.questionCount,
      p_is_timed: params.isTimed,
      p_time_limit_minutes: params.timeLimitMinutes,
      p_ai_questions: null,
      p_origin_filter: "authorized_past_question",
      p_exam_year: params.examYear ?? null,
    });

    if (error || !data) {
      return {
        ok: false,
        error:
          error?.message ||
          "No past questions matched this subject/year selection. Try 'All Years (Mixed)'.",
      };
    }

    return { ok: true, attempt: data as ActiveExamAttempt };
  }

  let aiQuestions: Array<Record<string, unknown>> | null = null;
  if (params.practiceSource === "ai_generated") {
    const aiRes = await invokeAiGateway({
      action: "generate_exam_questions",
      examCategory: params.examCategoryCode,
      subject: params.subject,
      topics: params.topics,
      difficulty: params.difficulty === "mixed" ? "medium" : params.difficulty,
      questionCount: params.questionCount,
    });

    if (!aiRes.ok || !aiRes.questions || aiRes.questions.length === 0) {
      return {
        ok: false,
        error:
          aiRes.error ||
          "Could not generate AI practice questions right now. Try the Curated Practice Bank or retry shortly.",
      };
    }
    aiQuestions = aiRes.questions;
  }

  const { data, error } = await supabase.rpc("start_student_exam_attempt", {
    p_exam_category_code: params.examCategoryCode,
    p_subject: params.subject,
    p_topics: params.topics.length > 0 ? params.topics : null,
    p_difficulty: params.difficulty,
    p_question_count: params.questionCount,
    p_is_timed: params.isTimed,
    p_time_limit_minutes: params.timeLimitMinutes,
    p_ai_questions: aiQuestions,
  });

  if (error || !data) {
    return {
      ok: false,
      error:
        error?.message ||
        "No matching questions found for this selection. Try 'Mixed' difficulty or AI-Generated Practice.",
    };
  }

  return { ok: true, attempt: data as ActiveExamAttempt };
}

export async function submitPracticeExamSession(params: {
  attemptId: string;
  answers: Record<string, string>;
  timeSpentSeconds: number;
}): Promise<{
  ok: boolean;
  error?: string;
  summary?: Record<string, unknown>;
  responses?: SubmittedExamResponseItem[];
}> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return { ok: false, error: "Supabase client is not configured." };
  }

  const { data, error } = await supabase.rpc("submit_student_exam_attempt", {
    p_attempt_id: params.attemptId,
    p_answers: params.answers,
    p_time_spent_seconds: params.timeSpentSeconds,
  });

  if (error || !data) {
    return {
      ok: false,
      error: error?.message || "Failed to grade exam attempt.",
    };
  }

  const { data: respRows } = await supabase
    .from("student_exam_responses")
    .select("*")
    .eq("attempt_id", params.attemptId)
    .order("question_order", { ascending: true })
    .limit(60);

  const responses: SubmittedExamResponseItem[] = (respRows || []).map(
    (r: Record<string, unknown>) => ({
      id: String(r.id),
      questionKey: String(r.question_key),
      questionOrder: Number(r.question_order || 1),
      questionType: String(r.question_type),
      topic: String(r.topic),
      prompt: String(r.prompt),
      studentAnswer: String(r.student_answer || ""),
      status: r.status as SubmittedExamResponseItem["status"],
      isCorrect:
        r.is_correct === null || r.is_correct === undefined
          ? null
          : Boolean(r.is_correct),
      isOfficiallyMarked: Boolean(r.is_officially_marked),
      earnedPoints: Number(r.earned_points || 0),
      possiblePoints: Number(r.possible_points || 0),
      correctAnswerDisplay: String(r.correct_answer_display || ""),
      explanation: String(r.explanation || ""),
      aiWrittenFeedback: r.ai_written_feedback
        ? String(r.ai_written_feedback)
        : null,
    })
  );

  return {
    ok: true,
    summary: data as Record<string, unknown>,
    responses,
  };
}

export async function requestExamAiHelper(params: {
  action: "revision_plan" | "explain_exam_answer" | "written_answer_feedback";
  attemptId?: string;
  responseId?: string;
  examName?: string;
  subject?: string;
  scorePercent?: number | null;
  weakTopics?: string[];
  questionPrompt?: string;
  studentAnswer?: string;
  correctAnswer?: string;
}): Promise<{ ok: boolean; content?: string; error?: string }> {
  const res = await invokeAiGateway(params);
  if (!res.ok || !res.content) {
    return {
      ok: false,
      error: res.error || "Unable to generate AI guidance right now.",
    };
  }
  return { ok: true, content: res.content };
}
