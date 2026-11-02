import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { PastQuestionsApiAdminStatus } from "@/lib/exams/pastQuestionsClient";

export interface PlatformOverviewStats {
  totalUsers: number;
  studentUsers: number;
  educatorUsers: number;
  adminUsers: number;
  onboardedStudents: number;
  publishedCourses: number;
  draftCourses: number;
  publishedSubjects: number;
  publishedLessons: number;
  publishedExamQuestions: number;
  submittedExamAttempts: number;
  aiRequestsTotal: number;
  aiRequests24h: number;
  aiErrors24h: number;
  publishedAnnouncements: number;
}

export interface AdminProfileRow {
  id: string;
  fullName: string;
  email: string;
  country: string;
  role: "student" | "educator" | "admin";
  createdAt: string;
}

export interface AdminCourseRow {
  id: string;
  slug: string;
  title: string;
  subject: string;
  academicCategory: string;
  contentClassification: "verified" | "ai_generated" | "imported_third_party";
  publicationStatus: "draft" | "approved" | "published" | "archived";
  isPublished: boolean;
  totalLessons: number;
}

export interface AdminExamQuestionRow {
  id: string;
  examCategoryId: string;
  subject: string;
  topic: string;
  difficulty: string;
  questionType: string;
  originType: string;
  examYear: number | null;
  prompt: string;
  isPublished: boolean;
}

export interface AdminAnnouncementRow {
  id: string;
  title: string;
  body: string;
  targetCategory: string;
  isPublished: boolean;
  createdAt: string;
}

export interface AdminAiSettings {
  aiEnabled: boolean;
  defaultProvider: "openai" | "openrouter";
  defaultModel: string;
  fallbackModel: string;
  dailyRequestLimitPerStudent: number;
  maxTokensPerResponse: number;
}

export interface AdminUsageLogRow {
  id: string;
  feature: string;
  provider: string;
  model: string;
  totalTokens: number;
  status: string;
  latencyMs: number | null;
  errorCode: string | null;
  createdAt: string;
}

export interface AdminAuditLogRow {
  id: string;
  actionType: string;
  targetType: string;
  summary: string;
  createdAt: string;
}

export async function verifyServerAdminGate(): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ check: true }),
    });
    if (res.status === 401 || res.status === 403) return false;
    return res.ok;
  } catch {
    return true;
  }
}

export async function logAdminAuditAction(params: {
  actionType: string;
  targetType: string;
  targetId?: string;
  summary: string;
  details?: Record<string, unknown>;
}) {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("admin_audit_logs").insert({
    admin_user_id: user.id,
    action_type: params.actionType,
    target_type: params.targetType,
    target_id: params.targetId || null,
    summary: params.summary,
    details: params.details || {},
  });
}

export async function fetchAdminDashboardPayload(): Promise<
  | { status: "forbidden" | "unauthenticated" }
  | {
      status: "ready";
      adminIdentity: { fullName: string; email: string };
      overview: PlatformOverviewStats;
      users: AdminProfileRow[];
      courses: AdminCourseRow[];
      examCategories: Array<{ id: string; code: string; shortLabel: string }>;
      examQuestions: AdminExamQuestionRow[];
      announcements: AdminAnnouncementRow[];
      aiSettings: AdminAiSettings;
      aiUsageLogs: AdminUsageLogRow[];
      auditLogs: AdminAuditLogRow[];
      systemHealth: Record<string, unknown> | null;
      pastQuestionsApi?: PastQuestionsApiAdminStatus;
    }
> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { status: "unauthenticated" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "unauthenticated" };

  const { data: ownProfile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (!ownProfile || ownProfile.role !== "admin") {
    return { status: "forbidden" };
  }

  const serverOk = await verifyServerAdminGate();
  if (!serverOk) return { status: "forbidden" };

  const [
    ovRes,
    uRes,
    cRes,
    ecRes,
    eqRes,
    annRes,
    aiSetRes,
    aiLogRes,
    auditRes,
    healthHttp,
    pqApiRes,
  ] = await Promise.all([
    supabase.rpc("admin_get_platform_overview"),
    supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("learning_courses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("exam_categories")
      .select("id, code, short_label")
      .order("sort_order", { ascending: true })
      .limit(20),
    supabase
      .from("exam_questions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("platform_announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(40),
    supabase.from("ai_system_settings").select("*").eq("id", 1).maybeSingle(),
    supabase
      .from("ai_usage_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("admin_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(40),
    fetch("/api/admin/actions")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
    Promise.resolve(supabase.rpc("admin_get_past_questions_api_status")).catch(
      () => ({ data: null })
    ),
  ]);

  if (ovRes.error) {
    return { status: "forbidden" };
  }

  return {
    status: "ready",
    adminIdentity: {
      fullName: String(ownProfile.full_name || "Platform Admin"),
      email: String(ownProfile.email || user.email || ""),
    },
    overview: ovRes.data as PlatformOverviewStats,
    users: (uRes.data || []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      fullName: String(r.full_name),
      email: String(r.email),
      country: String(r.country),
      role: (r.role as AdminProfileRow["role"]) || "student",
      createdAt: String(r.created_at),
    })),
    courses: (cRes.data || []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      slug: String(r.slug),
      title: String(r.title),
      subject: String(r.subject),
      academicCategory: String(r.academic_category),
      contentClassification:
        (r.content_classification as AdminCourseRow["contentClassification"]) ||
        "verified",
      publicationStatus:
        (r.publication_status as AdminCourseRow["publicationStatus"]) ||
        "draft",
      isPublished: Boolean(r.is_published),
      totalLessons: Number(r.total_lessons || 0),
    })),
    examCategories: (ecRes.data || []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      code: String(r.code),
      shortLabel: String(r.short_label),
    })),
    examQuestions: (eqRes.data || []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      examCategoryId: String(r.exam_category_id),
      subject: String(r.subject),
      topic: String(r.topic),
      difficulty: String(r.difficulty),
      questionType: String(r.question_type),
      originType: String(r.origin_type),
      examYear:
        r.exam_year !== null && r.exam_year !== undefined
          ? Number(r.exam_year)
          : null,
      prompt: String(r.prompt),
      isPublished: Boolean(r.is_published),
    })),
    announcements: (annRes.data || []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      title: String(r.title),
      body: String(r.body),
      targetCategory: String(r.target_category),
      isPublished: Boolean(r.is_published),
      createdAt: String(r.created_at),
    })),
    aiSettings: {
      aiEnabled: aiSetRes.data?.ai_enabled !== false,
      defaultProvider:
        aiSetRes.data?.default_provider === "openrouter"
          ? "openrouter"
          : "openai",
      defaultModel: String(aiSetRes.data?.default_model || "gpt-4o-mini"),
      fallbackModel: String(
        aiSetRes.data?.fallback_model || "openai/gpt-4o-mini"
      ),
      dailyRequestLimitPerStudent: Number(
        aiSetRes.data?.daily_request_limit_per_student || 60
      ),
      maxTokensPerResponse: Number(
        aiSetRes.data?.max_tokens_per_response || 1100
      ),
    },
    aiUsageLogs: (aiLogRes.data || []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      feature: String(r.feature),
      provider: String(r.provider),
      model: String(r.model),
      totalTokens: Number(r.total_tokens || 0),
      status: String(r.status),
      latencyMs: r.latency_ms !== null ? Number(r.latency_ms) : null,
      errorCode: r.error_code ? String(r.error_code) : null,
      createdAt: String(r.created_at),
    })),
    auditLogs: (auditRes.data || []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      actionType: String(r.action_type),
      targetType: String(r.target_type),
      summary: String(r.summary),
      createdAt: String(r.created_at),
    })),
    systemHealth: healthHttp?.health || null,
    pastQuestionsApi: (() => {
      const raw = (pqApiRes?.data ?? null) as Record<string, unknown> | null;
      if (!raw) return undefined;
      const counts = (raw.pastQuestionCounts ?? {}) as Record<string, unknown>;
      const waec = Number(raw.waecPastCount ?? counts.WAEC ?? 0) || 0;
      const neco = Number(raw.necoPastCount ?? counts.NECO ?? 0) || 0;
      const jamb = Number(raw.jambPastCount ?? counts.JAMB_UTME ?? 0) || 0;
      return {
        configured: Boolean(raw.configured),
        provider: String(raw.provider ?? raw.providerKey ?? "aloc"),
        baseUrl: String(raw.baseUrl || "https://dev.aloc.com.ng/api/v1"),
        maskedToken:
          typeof raw.maskedToken === "string" ? raw.maskedToken : null,
        updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
        waecPastCount: waec,
        necoPastCount: neco,
        jambPastCount: jamb,
        totalPastQuestions:
          Number(raw.totalPastQuestions ?? waec + neco + jamb) || 0,
      } satisfies PastQuestionsApiAdminStatus;
    })(),
  };
}
