"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  Download,
  Globe,
  Loader2,
  LogOut,
  Megaphone,
  Moon,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Users,
} from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { signOutLearner } from "@/lib/auth/authService";
import {
  applyEcosystemTheme,
  getStoredEcosystemTheme,
  type EcosystemTheme,
} from "@/lib/theme/themePreference";
import {
  fetchAdminDashboardPayload,
  logAdminAuditAction,
  type AdminAiSettings,
  type AdminAnnouncementRow,
  type AdminAuditLogRow,
  type AdminCourseRow,
  type AdminExamQuestionRow,
  type AdminProfileRow,
  type AdminUsageLogRow,
  type PlatformOverviewStats,
} from "@/lib/admin/adminService";
import {
  invokePastQuestionsConnector,
  NIGERIAN_CORE_SUBJECTS,
  PAST_QUESTION_YEARS,
  type PastQuestionsApiAdminStatus,
} from "@/lib/exams/pastQuestionsClient";

import { AdminGrowthMarketingPanel } from "@/components/admin/AdminGrowthMarketingPanel";

type AdminSection =
  | "overview"
  | "users"
  | "courses"
  | "exams"
  | "announcements"
  | "ai_governance"
  | "growth_marketing";

const THEME_MODES: Array<{
  id: EcosystemTheme;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    id: "default",
    label: "Default",
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
  {
    id: "dark",
    label: "Dark",
    icon: <Moon className="h-3.5 w-3.5" />,
  },
  {
    id: "light",
    label: "Light",
    icon: <Sun className="h-3.5 w-3.5" />,
  },
];

export function AdminPortalClient() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  const [gateState, setGateState] = useState<
    "loading" | "forbidden" | "ready"
  >("loading");
  const [section, setSection] = useState<AdminSection>("overview");
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [themeMode, setThemeMode] = useState<EcosystemTheme>("default");
  const [lastSyncedAt, setLastSyncedAt] = useState<string>("");

  const [adminIdentity, setAdminIdentity] = useState<{
    fullName: string;
    email: string;
  }>({ fullName: "Platform Admin", email: "" });
  const [overview, setOverview] = useState<PlatformOverviewStats | null>(null);
  const [users, setUsers] = useState<AdminProfileRow[]>([]);
  const [courses, setCourses] = useState<AdminCourseRow[]>([]);
  const [examCategories, setExamCategories] = useState<
    Array<{ id: string; code: string; shortLabel: string }>
  >([]);
  const [examQuestions, setExamQuestions] = useState<AdminExamQuestionRow[]>(
    []
  );
  const [announcements, setAnnouncements] = useState<AdminAnnouncementRow[]>(
    []
  );
  const [aiSettings, setAiSettings] = useState<AdminAiSettings>({
    aiEnabled: true,
    defaultProvider: "openai",
    defaultModel: "gpt-4o-mini",
    fallbackModel: "openai/gpt-4o-mini",
    dailyRequestLimitPerStudent: 60,
    maxTokensPerResponse: 1100,
  });
  const [aiLogs, setAiLogs] = useState<AdminUsageLogRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogRow[]>([]);
  const [systemHealth, setSystemHealth] =
    useState<Record<string, unknown> | null>(null);
  const [pastQuestionsApi, setPastQuestionsApi] =
    useState<PastQuestionsApiAdminStatus>({
      configured: false,
      provider: "aloc",
      baseUrl: "https://dev.aloc.com.ng/api/v1",
      maskedToken: null,
      updatedAt: null,
      waecPastCount: 0,
      necoPastCount: 0,
      jambPastCount: 0,
      totalPastQuestions: 0,
    });

  // Nigerian Past-Questions API (ALOC) Connector state
  const [alocTokenInput, setAlocTokenInput] = useState("");
  const [savingAlocToken, setSavingAlocToken] = useState(false);
  const [syncExamCode, setSyncExamCode] = useState<
    "JAMB_UTME" | "WAEC" | "NECO"
  >("JAMB_UTME");
  const [syncSubject, setSyncSubject] = useState<string>("Mathematics");
  const [syncYear, setSyncYear] = useState<string>("all");
  const [syncingPastBatch, setSyncingPastBatch] = useState(false);

  // Search & Filter states
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<
    "all" | "student" | "educator" | "admin"
  >("all");
  const [courseSearch, setCourseSearch] = useState("");
  const [examSearch, setExamSearch] = useState("");

  // Course creation state (matches live learning_courses + provenance schema)
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseSubject, setNewCourseSubject] = useState("Mathematics");
  const [newCourseCategory, setNewCourseCategory] = useState<
    "secondary" | "university" | "polytechnic"
  >("secondary");
  const [newCourseClassification, setNewCourseClassification] = useState<
    "verified" | "ai_generated" | "imported_third_party"
  >("verified");
  const [newCourseSourceOrg, setNewCourseSourceOrg] = useState(
    "Platform Curriculum Editorial Team"
  );
  const [newCourseLicense, setNewCourseLicense] = useState(
    "Platform Authored Original"
  );
  const [coursePublishNow, setCoursePublishNow] = useState(true);

  // Exam question creation state (matches live exam_questions + options + answer_keys schema)
  const [newEqCatId, setNewEqCatId] = useState("");
  const [newEqSubject, setNewEqSubject] = useState("Mathematics");
  const [newEqTopic, setNewEqTopic] = useState("Algebraic Expressions");
  const [newEqPrompt, setNewEqPrompt] = useState("");
  const [newEqOptA, setNewEqOptA] = useState("");
  const [newEqOptB, setNewEqOptB] = useState("");
  const [newEqOptC, setNewEqOptC] = useState("");
  const [newEqOptD, setNewEqOptD] = useState("");
  const [newEqCorrectKey, setNewEqCorrectKey] = useState<
    "A" | "B" | "C" | "D"
  >("A");
  const [newEqExplanation, setNewEqExplanation] = useState("");

  // Announcement state
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [annTarget, setAnnTarget] = useState("all");

  useEffect(() => {
    setThemeMode(getStoredEcosystemTheme());
  }, []);

  const reloadAdmin = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    }
    try {
      const res = await fetchAdminDashboardPayload();
      if (res.status !== "ready") {
        if (res.status === "unauthenticated") {
          routerRef.current.replace("/login?next=/admin");
          return;
        }
        setGateState("forbidden");
        return;
      }

      setAdminIdentity(res.adminIdentity);
      setOverview(res.overview);
      setUsers(res.users);
      setCourses(res.courses);
      setExamCategories(res.examCategories);
      if (res.examCategories.length > 0) {
        const defaultCatId = res.examCategories[0].id;
        setNewEqCatId((prev) => prev || defaultCatId);
      }
      setExamQuestions(res.examQuestions);
      setAnnouncements(res.announcements);
      setAiSettings(res.aiSettings);
      setAiLogs(res.aiUsageLogs);
      setAuditLogs(res.auditLogs);
      setSystemHealth(res.systemHealth);
      if (res.pastQuestionsApi) {
        setPastQuestionsApi(res.pastQuestionsApi);
      }
      setLastSyncedAt(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setGateState("ready");
      if (isManualRefresh) {
        setStatusBanner("Live telemetry & governance state refreshed.");
      }
    } finally {
      if (isManualRefresh) {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    reloadAdmin(false);
  }, [reloadAdmin]);

  const handleSelectTheme = (nextTheme: EcosystemTheme) => {
    applyEcosystemTheme(nextTheme);
    setThemeMode(nextTheme);
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    await signOutLearner();
    router.replace("/login");
  };

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      if (userRoleFilter !== "all" && u.role !== userRoleFilter) return false;
      if (!q) return true;
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.country.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    });
  }, [users, userSearch, userRoleFilter]);

  const filteredCourses = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        c.academicCategory.toLowerCase().includes(q)
    );
  }, [courses, courseSearch]);

  const filteredExamQuestions = useMemo(() => {
    const q = examSearch.trim().toLowerCase();
    if (!q) return examQuestions;
    return examQuestions.filter(
      (item) =>
        item.subject.toLowerCase().includes(q) ||
        item.topic.toLowerCase().includes(q) ||
        item.prompt.toLowerCase().includes(q)
    );
  }, [examQuestions, examSearch]);

  const handleExportUsersCsv = () => {
    const header = ["Full Name", "Email", "Country", "Role", "Joined Date"];
    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const rows = filteredUsers.map((u) => [
      escapeCsv(u.fullName),
      escapeCsv(u.email),
      escapeCsv(u.country),
      escapeCsv(u.role),
      escapeCsv(new Date(u.createdAt).toISOString()),
    ]);
    const csvContent = [header.join(","), ...rows.map((r) => r.join(","))].join(
      "\n"
    );
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `students-ecosystem-users-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatusBanner(`Exported ${filteredUsers.length} user records to CSV.`);
  };

  // 1. Update User Role (Server RPC + Audit Log)
  const handleRoleChange = async (
    targetUserId: string,
    newRole: "student" | "educator" | "admin"
  ) => {
    setStatusBanner(null);
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.rpc("admin_update_user_role", {
      p_target_user_id: targetUserId,
      p_new_role: newRole,
    });
    if (error) {
      setStatusBanner(`Role update denied: ${error.message}`);
      return;
    }
    setStatusBanner("User role updated and recorded in admin audit log.");
    await reloadAdmin();
  };

  // 2. Create Course with Provenance Metadata
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle.trim()) return;
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const slug = `${newCourseTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")}-${Date.now().toString().slice(-4)}`;

    const { data: srcRow, error: srcErr } = await supabase
      .from("learning_content_sources")
      .insert({
        source_title: `${newCourseTitle.trim()} Source Reference`,
        source_organization: newCourseSourceOrg.trim(),
        license_name: newCourseLicense.trim(),
        usage_rights_summary: `Admin registered ${newCourseClassification} curriculum source.`,
        attribution_text: `${newCourseSourceOrg.trim()} (${newCourseLicense.trim()})`,
      })
      .select("id")
      .single();

    if (srcErr || !srcRow) {
      setStatusBanner(`Failed to register content source: ${srcErr?.message}`);
      return;
    }

    let verifId: string | null = null;
    if (newCourseClassification === "verified") {
      const { data: vRow } = await supabase
        .from("learning_content_verifications")
        .insert({
          verification_status: "verified",
          reviewer_id: user.id,
          reviewer_display_role: "Platform Curriculum Administrator",
          review_notes: "Verified via Admin Curriculum Governance Portal.",
          verified_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      verifId = vRow?.id || null;
    }

    const canPublishImmediately =
      coursePublishNow && newCourseClassification === "verified";

    const { data: cRow, error: cErr } = await supabase
      .from("learning_courses")
      .insert({
        slug,
        title: newCourseTitle.trim(),
        subject: newCourseSubject.trim(),
        academic_category: newCourseCategory,
        content_classification: newCourseClassification,
        source_id: srcRow.id,
        verification_id: verifId,
        publication_status: canPublishImmediately
          ? "published"
          : newCourseClassification === "verified"
            ? "approved"
            : "draft",
        is_published: canPublishImmediately,
      })
      .select("id")
      .single();

    if (cErr) {
      setStatusBanner(`Course creation failed: ${cErr.message}`);
      return;
    }

    await logAdminAuditAction({
      actionType: "create_course",
      targetType: "learning_course",
      targetId: String(cRow?.id || slug),
      summary: `Created ${newCourseClassification} course "${newCourseTitle.trim()}"`,
    });

    setNewCourseTitle("");
    setStatusBanner("Course registered with full provenance metadata.");
    await reloadAdmin();
  };

  // 3. Publish / Unpublish Course
  const handleToggleCoursePublish = async (course: AdminCourseRow) => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    const nextPublish = !course.isPublished;
    const { error } = await supabase
      .from("learning_courses")
      .update({
        is_published: nextPublish,
        publication_status: nextPublish ? "published" : "draft",
      })
      .eq("id", course.id);

    if (error) {
      setStatusBanner(
        `Publication guard rejected change: ${error.message} (Verified content requires approved verification record).`
      );
      return;
    }

    await logAdminAuditAction({
      actionType: nextPublish ? "publish_course" : "unpublish_course",
      targetType: "learning_course",
      targetId: course.id,
      summary: `${nextPublish ? "Published" : "Unpublished"} course "${course.title}"`,
    });

    setStatusBanner(
      `Course "${course.title}" is now ${nextPublish ? "published" : "unpublished"}.`
    );
    await reloadAdmin();
  };

  const handleSaveAndTestAlocToken = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = alocTokenInput.trim();
    if (trimmed.length < 8) {
      setStatusBanner(
        "Please paste your ALOC Station API key (aloc_...) from aloc.com.ng first."
      );
      return;
    }
    setSavingAlocToken(true);
    setStatusBanner(null);
    try {
      const testRes = await invokePastQuestionsConnector({
        action: "test_connection",
        accessToken: trimmed,
        save: true,
      });

      if (testRes.ok) {
        setAlocTokenInput("");
        setStatusBanner(
          testRes.message ||
            "ALOC Station Past-Questions API key verified & saved securely on server."
        );
        await reloadAdmin();
        return;
      }

      const supabase = createBrowserSupabaseClient();
      if (supabase) {
        await supabase.rpc("admin_save_past_questions_api_config", {
          p_access_token: trimmed,
        });
        await reloadAdmin();
      }
      setStatusBanner(
        `Saved key to server vault, though live test reported: ${testRes.error || "Check API key validity on aloc.com.ng."}`
      );
    } finally {
      setSavingAlocToken(false);
    }
  };

  const handleSyncPastQuestionsBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncingPastBatch(true);
    setStatusBanner(null);
    try {
      const res = await invokePastQuestionsConnector({
        action: "admin_sync_batch",
        examCategoryCode: syncExamCode,
        subject: syncSubject,
        examYear: syncYear === "all" ? null : Number(syncYear),
        questionCount: 40,
      });

      if (!res.ok) {
        setStatusBanner(
          res.error || "Could not import past questions from ALOC API."
        );
        return;
      }

      setStatusBanner(
        `Imported ${res.importedCount ?? 0} new ${syncExamCode} ${syncSubject}${syncYear !== "all" ? ` (${syncYear})` : ""} past questions (${res.skippedDuplicates ?? 0} duplicates skipped • ${res.availableCount ?? 0} ready in CBT bank).`
      );
      await reloadAdmin();
    } finally {
      setSyncingPastBatch(false);
    }
  };

  // 4. Add Curated Exam Question + Options + Protected Answer Key
  const handleCreateExamQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEqPrompt.trim() || !newEqCatId) return;
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: qRow, error: qErr } = await supabase
      .from("exam_questions")
      .insert({
        exam_category_id: newEqCatId,
        subject: newEqSubject.trim(),
        topic: newEqTopic.trim(),
        difficulty: "medium",
        question_type: "multiple_choice",
        prompt: newEqPrompt.trim(),
        points: 2,
        origin_type: "curated_practice",
        is_published: true,
        created_by: user?.id || null,
      })
      .select("id")
      .single();

    if (qErr || !qRow) {
      setStatusBanner(`Could not save exam question: ${qErr?.message}`);
      return;
    }

    await supabase.from("exam_question_options").insert([
      {
        question_id: qRow.id,
        option_key: "A",
        option_text: newEqOptA,
        option_order: 1,
      },
      {
        question_id: qRow.id,
        option_key: "B",
        option_text: newEqOptB,
        option_order: 2,
      },
      {
        question_id: qRow.id,
        option_key: "C",
        option_text: newEqOptC,
        option_order: 3,
      },
      {
        question_id: qRow.id,
        option_key: "D",
        option_text: newEqOptD,
        option_order: 4,
      },
    ]);

    await supabase.from("exam_question_answer_keys").insert({
      question_id: qRow.id,
      correct_option_key: newEqCorrectKey,
      explanation: newEqExplanation.trim() || "Verified practice answer key.",
    });

    await logAdminAuditAction({
      actionType: "create_exam_question",
      targetType: "exam_question",
      targetId: String(qRow.id),
      summary: `Published curated practice question in ${newEqSubject} (${newEqTopic})`,
    });

    setNewEqPrompt("");
    setNewEqOptA("");
    setNewEqOptB("");
    setNewEqOptC("");
    setNewEqOptD("");
    setNewEqExplanation("");
    setStatusBanner("Practice question & protected answer key published.");
    await reloadAdmin();
  };

  const handleToggleExamQuestionPublish = async (q: AdminExamQuestionRow) => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const nextPub = !q.isPublished;
    await supabase
      .from("exam_questions")
      .update({ is_published: nextPub })
      .eq("id", q.id);
    await logAdminAuditAction({
      actionType: "toggle_exam_question",
      targetType: "exam_question",
      targetId: q.id,
      summary: `${nextPub ? "Published" : "Unpublished"} question in ${q.subject}`,
    });
    await reloadAdmin();
  };

  // 5. Publish / Toggle / Delete Platform Announcement
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annBody.trim()) return;
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: row, error } = await supabase
      .from("platform_announcements")
      .insert({
        title: annTitle.trim(),
        body: annBody.trim(),
        target_category: annTarget,
        is_published: true,
        published_at: new Date().toISOString(),
        created_by: user?.id || null,
      })
      .select("id")
      .single();

    if (error) {
      setStatusBanner(`Announcement error: ${error.message}`);
      return;
    }

    await logAdminAuditAction({
      actionType: "publish_announcement",
      targetType: "platform_announcement",
      targetId: String(row?.id || ""),
      summary: `Published announcement "${annTitle.trim()}" for ${annTarget}`,
    });

    setAnnTitle("");
    setAnnBody("");
    setStatusBanner("Platform announcement published to learners.");
    await reloadAdmin();
  };

  const handleToggleAnnouncementPublished = async (
    ann: AdminAnnouncementRow
  ) => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const nextPub = !ann.isPublished;
    const { error } = await supabase
      .from("platform_announcements")
      .update({ is_published: nextPub })
      .eq("id", ann.id);
    if (!error) {
      await logAdminAuditAction({
        actionType: "toggle_announcement",
        targetType: "platform_announcement",
        targetId: ann.id,
        summary: `${nextPub ? "Activated" : "Hidden"} announcement "${ann.title}"`,
      });
      setStatusBanner(
        `Announcement "${ann.title}" is now ${nextPub ? "Live" : "Hidden"}.`
      );
      await reloadAdmin();
    }
  };

  const handleDeleteAnnouncement = async (ann: AdminAnnouncementRow) => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase
      .from("platform_announcements")
      .delete()
      .eq("id", ann.id);
    if (!error) {
      await logAdminAuditAction({
        actionType: "delete_announcement",
        targetType: "platform_announcement",
        targetId: ann.id,
        summary: `Deleted announcement "${ann.title}"`,
      });
      setStatusBanner(`Deleted announcement "${ann.title}".`);
      await reloadAdmin();
    }
  };

  // 6. Save AI Governance & Quota Settings
  const handleSaveAiSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("ai_system_settings")
      .update({
        ai_enabled: aiSettings.aiEnabled,
        default_provider: aiSettings.defaultProvider,
        default_model: aiSettings.defaultModel,
        fallback_model: aiSettings.fallbackModel,
        daily_request_limit_per_student:
          aiSettings.dailyRequestLimitPerStudent,
        max_tokens_per_response: aiSettings.maxTokensPerResponse,
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) {
      setStatusBanner(`Failed to save AI settings: ${error.message}`);
      return;
    }

    await logAdminAuditAction({
      actionType: "update_ai_settings",
      targetType: "ai_system_settings",
      targetId: "1",
      summary: `Updated AI governance (${aiSettings.defaultProvider}/${aiSettings.defaultModel}, limit ${aiSettings.dailyRequestLimitPerStudent}/day)`,
    });
    setStatusBanner("AI system settings & per-student daily quota updated.");
    await reloadAdmin();
  };

  if (gateState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian-950 text-slate-300">
        <Loader2 className="mr-2.5 h-5 w-5 animate-spin text-electric-400" />
        Verifying platform administrator authorization...
      </div>
    );
  }

  if (gateState === "forbidden") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian-950 p-6">
        <div className="max-w-md rounded-2xl border border-red-400/30 bg-obsidian-900/90 p-7 text-center shadow-glass-card">
          <ShieldAlert className="mx-auto h-10 w-10 text-red-400" />
          <h1 className="mt-3 font-display text-lg font-bold text-white">
            Administrator Access Required
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            This portal is protected by Supabase Row Level Security and
            role-based access guards (`profiles.role = &apos;admin&apos;`).
            Learner and educator accounts cannot access platform governance
            controls.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-xl bg-electric-500 px-4 py-2.5 text-xs font-bold text-obsidian-950"
            >
              Return to Student Dashboard
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-obsidian-950 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:border-red-400/40 hover:text-red-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalRoleUsers = Math.max(
    1,
    (overview?.studentUsers ?? 0) +
      (overview?.educatorUsers ?? 0) +
      (overview?.adminUsers ?? 0)
  );

  return (
    <div className="relative min-h-screen bg-obsidian-950 text-slate-100">
      {/* Zero-blur ambient glow isolated inside fixed wrapper for mobile WebKit GPU safety */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="ambient-glow-cyan -top-36 left-1/4 h-[380px] w-[520px] opacity-60" />
        <div className="ambient-glow-indigo bottom-0 right-1/4 h-[340px] w-[460px] opacity-45" />
      </div>

      {/* Top Executive Admin Bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-obsidian-950/95 px-4 py-3.5 sm:px-6 lg:bg-obsidian-900/90 lg:backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="theme-preserve-dark flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-electric-400/45 bg-[#020614] p-0.5 shadow-cyan-glow">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/logo-icon-192.png"
                  alt="E-Learning Ecosystem"
                  className="h-full w-full object-contain"
                />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-base font-bold text-white sm:text-lg">
                    Admin Governance Command Center
                  </h1>
                  <span className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    Live RLS Verified
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Signed in as{" "}
                  <span className="font-semibold text-electric-300">
                    {adminIdentity.fullName}
                  </span>
                  {adminIdentity.email ? ` (${adminIdentity.email})` : ""}
                  {lastSyncedAt ? ` • Synced ${lastSyncedAt}` : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 3-Mode Theme Switcher */}
            <div
              role="group"
              aria-label="Admin theme selector"
              className="inline-flex items-center rounded-xl border border-white/10 bg-obsidian-950/90 p-1"
            >
              {THEME_MODES.map((m) => {
                const active = themeMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectTheme(m.id)}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                      active
                        ? "bg-electric-500/20 text-electric-300"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {m.icon}
                    <span className="hidden sm:inline">{m.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={isRefreshing}
              onClick={() => reloadAdmin(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-obsidian-900 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-electric-400/45 hover:text-white disabled:opacity-60"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-electric-400 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              <span>Refresh</span>
            </button>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-electric-400/35 bg-electric-500/15 px-3.5 py-2 text-xs font-semibold text-electric-300 transition hover:bg-electric-500/25"
            >
              <span>Learner View</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>

            <button
              type="button"
              disabled={isSigningOut}
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-obsidian-900 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-red-400/45 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-60"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{isSigningOut ? "Signing Out..." : "Sign Out"}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {statusBanner && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-200">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              {statusBanner}
            </span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-slate-300 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Section Navigation Tabs */}
        <nav
          aria-label="Admin sections"
          className="flex flex-wrap gap-2 border-b border-white/10 pb-3"
        >
          {(
            [
              {
                id: "overview",
                label: "Overview & Health",
                icon: <Activity className="h-3.5 w-3.5" />,
              },
              {
                id: "users",
                label: `Student & Role Access (${users.length})`,
                icon: <Users className="h-3.5 w-3.5" />,
              },
              {
                id: "courses",
                label: `Courses & Provenance (${courses.length})`,
                icon: <BookOpen className="h-3.5 w-3.5" />,
              },
              {
                id: "exams",
                label: `Exam Question Bank (${examQuestions.length})`,
                icon: <ClipboardCheck className="h-3.5 w-3.5" />,
              },
              {
                id: "announcements",
                label: `Announcements (${announcements.length})`,
                icon: <Megaphone className="h-3.5 w-3.5" />,
              },
              {
                id: "ai_governance",
                label: "AI Quotas & Audit Logs",
                icon: <Cpu className="h-3.5 w-3.5" />,
              },
              {
                id: "growth_marketing",
                label: "Google SEO & Growth",
                icon: <Globe className="h-3.5 w-3.5" />,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                section === tab.id
                  ? "border border-electric-400/50 bg-electric-500/15 text-electric-300 shadow-cyan-glow"
                  : "border border-white/10 bg-obsidian-900/70 text-slate-300 hover:text-white"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* 1. OVERVIEW & SYSTEM HEALTH */}
        {section === "overview" && overview && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              {[
                {
                  label: "Total Registered Users",
                  value: overview.totalUsers,
                  accent: "text-white",
                },
                {
                  label: "Onboarded Learners",
                  value: overview.onboardedStudents,
                  accent: "text-electric-300",
                },
                {
                  label: "Published / Draft Courses",
                  value: `${overview.publishedCourses} / ${overview.draftCourses}`,
                  accent: "text-emerald-300",
                },
                {
                  label: "Submitted Mock Exams",
                  value: overview.submittedExamAttempts,
                  accent: "text-white",
                },
                {
                  label: "AI Requests (24h)",
                  value: overview.aiRequests24h,
                  accent: "text-electric-300",
                },
                {
                  label: "Total AI Requests",
                  value: overview.aiRequestsTotal.toLocaleString(),
                  accent: "text-white",
                },
                {
                  label: "Published Exam Questions",
                  value: overview.publishedExamQuestions,
                  accent: "text-emerald-300",
                },
                {
                  label: "Published Announcements",
                  value: overview.publishedAnnouncements,
                  accent: "text-white",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-4 shadow-glass-card"
                >
                  <p className="text-[11px] font-medium text-slate-400">
                    {stat.label}
                  </p>
                  <p
                    className={`mt-1.5 font-display text-2xl font-bold ${stat.accent}`}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Executive Quick Actions + User Role Breakdown */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 lg:col-span-7">
                <h2 className="text-sm font-bold text-white">
                  Executive Quick Actions
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Direct shortcuts to high-impact governance operations across
                  the Student&apos;s Ecosystem.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {[
                    {
                      title: "Manage Users & Roles",
                      desc: `${overview.studentUsers} students • ${overview.educatorUsers} educators • ${overview.adminUsers} admins`,
                      target: "users" as AdminSection,
                    },
                    {
                      title: "Publish New Curriculum Course",
                      desc: `${overview.publishedSubjects} subjects • ${overview.publishedLessons} published lessons`,
                      target: "courses" as AdminSection,
                    },
                    {
                      title: "Add Practice Exam Item",
                      desc: "Create CBT questions with RLS-protected answer keys",
                      target: "exams" as AdminSection,
                    },
                    {
                      title: "Broadcast Student Alert",
                      desc: "Deliver real-time announcements to Notification feeds",
                      target: "announcements" as AdminSection,
                    },
                  ].map((item) => (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => setSection(item.target)}
                      className="flex flex-col items-start rounded-xl border border-white/10 bg-obsidian-950/85 p-3.5 text-left transition hover:border-electric-400/45 hover:bg-electric-500/10"
                    >
                      <span className="text-xs font-bold text-electric-300">
                        {item.title}
                      </span>
                      <span className="mt-1 text-[11px] text-slate-400">
                        {item.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 lg:col-span-5">
                <h2 className="text-sm font-bold text-white">
                  Platform Account Breakdown
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Live distribution across Student, Educator, and Admin roles.
                </p>

                <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-obsidian-950">
                  <div
                    style={{
                      width: `${Math.round(
                        (overview.studentUsers / totalRoleUsers) * 100
                      )}%`,
                    }}
                    className="bg-electric-400"
                    title={`Students: ${overview.studentUsers}`}
                  />
                  <div
                    style={{
                      width: `${Math.round(
                        (overview.educatorUsers / totalRoleUsers) * 100
                      )}%`,
                    }}
                    className="bg-aura-500"
                    title={`Educators: ${overview.educatorUsers}`}
                  />
                  <div
                    style={{
                      width: `${Math.max(
                        6,
                        Math.round(
                          (overview.adminUsers / totalRoleUsers) * 100
                        )
                      )}%`,
                    }}
                    className="bg-emerald-400"
                    title={`Admins: ${overview.adminUsers}`}
                  />
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-obsidian-950/80 px-3 py-2">
                    <span className="text-slate-300">Students</span>
                    <span className="font-bold text-electric-300">
                      {overview.studentUsers}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-obsidian-950/80 px-3 py-2">
                    <span className="text-slate-300">Educators</span>
                    <span className="font-bold text-purple-300">
                      {overview.educatorUsers}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-obsidian-950/80 px-3 py-2">
                    <span className="text-slate-300">Platform Admins</span>
                    <span className="font-bold text-emerald-300">
                      {overview.adminUsers}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-5">
              <h2 className="text-sm font-bold text-white">
                Production Environment &amp; Service Readiness
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Real-time verification confirming Supabase PostgreSQL
                connectivity, server-only AI provider routing, and forced Row
                Level Security across all 42 tables.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-obsidian-950/80 p-3.5 text-xs">
                  <span className="text-slate-400">Health Status</span>
                  <p className="mt-1 font-bold uppercase text-emerald-400">
                    {String(systemHealth?.status ?? "healthy")}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-obsidian-950/80 p-3.5 text-xs">
                  <span className="text-slate-400">Primary AI Engine</span>
                  <p className="mt-1 font-bold text-white">
                    {aiSettings.aiEnabled
                      ? `${aiSettings.defaultProvider.toUpperCase()} (${aiSettings.defaultModel})`
                      : "Paused by Admin"}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-obsidian-950/80 p-3.5 text-xs">
                  <span className="text-slate-400">AI Error Count (24h)</span>
                  <p className="mt-1 font-bold text-emerald-300">
                    {overview.aiErrors24h} errors • RLS Protected
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. STUDENT & ROLE ACCESS */}
        {section === "users" && (
          <section className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-white">
                  Registered Learners, Educators &amp; Administrators
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Role changes execute via the audited{" "}
                  <code>admin_update_user_role</code> PostgreSQL RPC.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportUsersCsv}
                className="inline-flex items-center gap-1.5 self-start rounded-xl border border-electric-400/35 bg-electric-500/15 px-3.5 py-2 text-xs font-semibold text-electric-300 transition hover:bg-electric-500/25"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV ({filteredUsers.length})
              </button>
            </div>

            {/* Search & Role Filters */}
            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users by name, email, or country..."
                  className="w-full rounded-xl border border-white/15 bg-obsidian-950 py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(["all", "student", "educator", "admin"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setUserRoleFilter(r)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition ${
                      userRoleFilter === r
                        ? "border border-electric-400/45 bg-electric-500/20 text-electric-300"
                        : "border border-white/10 bg-obsidian-950 text-slate-400 hover:text-white"
                    }`}
                  >
                    {r === "all" ? `All (${users.length})` : `${r}s`}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 text-slate-400">
                  <tr>
                    <th className="py-2.5 pr-4">Name</th>
                    <th className="py-2.5 pr-4">Email</th>
                    <th className="py-2.5 pr-4">Country</th>
                    <th className="py-2.5 pr-4">Joined</th>
                    <th className="py-2.5 pr-4">Current Role</th>
                    <th className="py-2.5">Change Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-6 text-center text-slate-400"
                      >
                        No accounts match your current search/filter.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td className="py-3 pr-4 font-semibold text-white">
                          {u.fullName}
                        </td>
                        <td className="py-3 pr-4 text-slate-300">{u.email}</td>
                        <td className="py-3 pr-4 text-slate-400">
                          {u.country}
                        </td>
                        <td className="py-3 pr-4 text-slate-400">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                              u.role === "admin"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : u.role === "educator"
                                  ? "bg-purple-500/20 text-purple-300"
                                  : "bg-electric-500/15 text-electric-300"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3">
                          <select
                            aria-label={`Role for ${u.email}`}
                            value={u.role}
                            onChange={(e) =>
                              handleRoleChange(
                                u.id,
                                e.target.value as
                                  | "student"
                                  | "educator"
                                  | "admin"
                              )
                            }
                            className="rounded-lg border border-white/15 bg-obsidian-950 px-2.5 py-1 text-xs text-white"
                          >
                            <option value="student">student</option>
                            <option value="educator">educator</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 3. COURSES & CONTENT PROVENANCE */}
        {section === "courses" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <form
              onSubmit={handleCreateCourse}
              className="space-y-3.5 rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 lg:col-span-5"
            >
              <h2 className="text-base font-bold text-white">
                Register Course with Provenance
              </h2>
              <input
                required
                value={newCourseTitle}
                onChange={(e) => setNewCourseTitle(e.target.value)}
                placeholder="Course title (e.g., Organic Chemistry I)"
                className="w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
              />
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  required
                  value={newCourseSubject}
                  onChange={(e) => setNewCourseSubject(e.target.value)}
                  placeholder="Subject (e.g., Chemistry)"
                  className="rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                />
                <select
                  value={newCourseCategory}
                  onChange={(e) =>
                    setNewCourseCategory(
                      e.target.value as
                        | "secondary"
                        | "university"
                        | "polytechnic"
                    )
                  }
                  className="rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                >
                  <option value="secondary">Secondary</option>
                  <option value="university">University</option>
                  <option value="polytechnic">Polytechnic</option>
                </select>
              </div>
              <select
                value={newCourseClassification}
                onChange={(e) =>
                  setNewCourseClassification(
                    e.target.value as
                      | "verified"
                      | "ai_generated"
                      | "imported_third_party"
                  )
                }
                className="w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
              >
                <option value="verified">
                  Classification: Verified Curriculum Authored
                </option>
                <option value="imported_third_party">
                  Classification: Partner / Licensed Open Educational Resource
                </option>
                <option value="ai_generated">
                  Classification: AI-Assisted Study Draft
                </option>
              </select>
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  required
                  value={newCourseSourceOrg}
                  onChange={(e) => setNewCourseSourceOrg(e.target.value)}
                  placeholder="Source Organization"
                  className="rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                />
                <input
                  required
                  value={newCourseLicense}
                  onChange={(e) => setNewCourseLicense(e.target.value)}
                  placeholder="License / Attribution"
                  className="rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={coursePublishNow}
                  onChange={(e) => setCoursePublishNow(e.target.checked)}
                />
                Publish immediately if classification is Verified
              </label>
              <button
                type="submit"
                className="w-full rounded-xl bg-electric-500 py-2.5 text-xs font-bold text-obsidian-950"
              >
                Create Audited Course
              </button>
            </form>

            <section className="space-y-3 rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 lg:col-span-7">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-bold text-white">
                  Course Approval &amp; Provenance Registry (
                  {filteredCourses.length})
                </h2>
                <input
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  placeholder="Filter courses..."
                  className="rounded-xl border border-white/15 bg-obsidian-950 px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div className="max-h-[460px] space-y-2.5 overflow-y-auto pr-1">
                {filteredCourses.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-obsidian-950/80 p-3.5 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-white">
                        {c.subject} — {c.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {c.academicCategory} • {c.totalLessons} lessons •
                        Provenance: {c.contentClassification} • Status:{" "}
                        {c.publicationStatus}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleCoursePublish(c)}
                      className={`rounded-lg px-3 py-1.5 font-semibold ${
                        c.isPublished
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-amber-500/20 text-amber-200"
                      }`}
                    >
                      {c.isPublished
                        ? "Published (Unpublish)"
                        : "Approve & Publish"}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* 4. EXAM QUESTION BANK */}
        {section === "exams" && (
          <div className="space-y-6">
            {/* NIGERIAN PAST-QUESTIONS API CONNECTOR (JAMB / WAEC / NECO) */}
            <section className="rounded-2xl border border-electric-400/35 bg-obsidian-900/90 p-5 shadow-glass-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-white">
                      Nigerian Past-Questions API Connector (JAMB UTME • WAEC • NECO)
                    </h2>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        pastQuestionsApi.configured
                          ? "border border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
                          : "border border-amber-400/40 bg-amber-500/15 text-amber-200"
                      }`}
                    >
                      {pastQuestionsApi.configured
                        ? `Connected (${pastQuestionsApi.maskedToken || "Active"})`
                        : "Awaiting ALOC Station Key"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    Connects your CBT Exam Center to{" "}
                    <a
                      href="https://aloc.com.ng"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-electric-300 underline hover:text-electric-200"
                    >
                      ALOC Station (aloc.com.ng)
                    </a>{" "}
                    (13,800+ curriculum-aligned JAMB, WAEC &amp; NECO past
                    questions across 1988–2026). Your API key is locked inside a
                    forced-RLS server vault and never sent to browsers.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <div className="rounded-xl border border-white/10 bg-obsidian-950/85 px-3 py-1.5">
                    <span className="text-slate-400">JAMB: </span>
                    <span className="font-bold text-electric-300">
                      {pastQuestionsApi.jambPastCount}
                    </span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-obsidian-950/85 px-3 py-1.5">
                    <span className="text-slate-400">WAEC: </span>
                    <span className="font-bold text-emerald-300">
                      {pastQuestionsApi.waecPastCount}
                    </span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-obsidian-950/85 px-3 py-1.5">
                    <span className="text-slate-400">NECO: </span>
                    <span className="font-bold text-purple-300">
                      {pastQuestionsApi.necoPastCount}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
                {/* Step 1: Save & Verify Token */}
                <form
                  onSubmit={handleSaveAndTestAlocToken}
                  className="space-y-2.5 rounded-xl border border-white/10 bg-obsidian-950/85 p-4 lg:col-span-5"
                >
                  <p className="text-xs font-bold text-white">
                    1. Connect or Rotate ALOC Station API Key
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Manage your API key at{" "}
                    <a
                      href="https://aloc.com.ng"
                      target="_blank"
                      rel="noreferrer"
                      className="text-electric-300 underline"
                    >
                      aloc.com.ng
                    </a>
                    , copy your <code>aloc_...</code> key, and paste it here:
                  </p>
                  <input
                    type="password"
                    value={alocTokenInput}
                    onChange={(e) => setAlocTokenInput(e.target.value)}
                    placeholder={
                      pastQuestionsApi.configured
                        ? `Connected (${pastQuestionsApi.maskedToken}) — paste new key to rotate`
                        : "Paste ALOC Station API key (aloc_xxxxxxxx)..."
                    }
                    className="w-full rounded-xl border border-white/15 bg-obsidian-900 px-3 py-2 text-xs text-white placeholder:text-slate-500"
                  />
                  <button
                    type="submit"
                    disabled={savingAlocToken}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-electric-500 py-2.5 text-xs font-bold text-obsidian-950 disabled:opacity-60"
                  >
                    {savingAlocToken ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Verifying with ALOC API...
                      </>
                    ) : (
                      "Verify & Save API Token"
                    )}
                  </button>
                </form>

                {/* Step 2: One-Click Batch Pull by Exam, Subject & Year */}
                <form
                  onSubmit={handleSyncPastQuestionsBatch}
                  className="space-y-2.5 rounded-xl border border-white/10 bg-obsidian-950/85 p-4 lg:col-span-7"
                >
                  <p className="text-xs font-bold text-white">
                    2. One-Click Import Real Past Questions by Exam, Subject &amp; Year
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Pulls up to 40 real past questions + answer keys per batch
                    into your permanent Supabase CBT bank (students can also
                    stream live on demand in <code>/dashboard/exams</code>).
                  </p>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <select
                      aria-label="Past question exam body"
                      value={syncExamCode}
                      onChange={(e) =>
                        setSyncExamCode(
                          e.target.value as "JAMB_UTME" | "WAEC" | "NECO"
                        )
                      }
                      className="rounded-xl border border-white/15 bg-obsidian-900 px-3 py-2 text-xs text-white"
                    >
                      <option value="JAMB_UTME">JAMB UTME</option>
                      <option value="WAEC">WAEC (WASSCE)</option>
                      <option value="NECO">NECO (SSCE)</option>
                    </select>

                    <select
                      aria-label="Past question subject"
                      value={syncSubject}
                      onChange={(e) => setSyncSubject(e.target.value)}
                      className="rounded-xl border border-white/15 bg-obsidian-900 px-3 py-2 text-xs text-white"
                    >
                      {NIGERIAN_CORE_SUBJECTS.map((subj) => (
                        <option key={subj} value={subj}>
                          {subj}
                        </option>
                      ))}
                    </select>

                    <select
                      aria-label="Past question year"
                      value={syncYear}
                      onChange={(e) => setSyncYear(e.target.value)}
                      className="rounded-xl border border-white/15 bg-obsidian-900 px-3 py-2 text-xs text-white"
                    >
                      <option value="all">All Years (Mixed)</option>
                      {PAST_QUESTION_YEARS.map((yr) => (
                        <option key={yr} value={String(yr)}>
                          Year {yr}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={syncingPastBatch}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-electric-400/45 bg-electric-500/20 py-2.5 text-xs font-bold text-electric-200 transition hover:bg-electric-500/30 disabled:opacity-60"
                  >
                    {syncingPastBatch ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Importing Past Questions &amp; Protected Keys...
                      </>
                    ) : (
                      `Pull ${syncExamCode === "JAMB_UTME" ? "JAMB" : syncExamCode} ${syncSubject} Past Questions`
                    )}
                  </button>
                </form>
              </div>
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <form
              onSubmit={handleCreateExamQuestion}
              className="space-y-3 rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 lg:col-span-5"
            >
              <h2 className="text-base font-bold text-white">
                Add Curated Practice Question
              </h2>
              <p className="text-[11px] text-slate-400">
                Answer keys are stored exclusively in{" "}
                <code>exam_question_answer_keys</code> (inaccessible to client
                queries; graded server-side via PostgreSQL RPC).
              </p>
              <select
                value={newEqCatId}
                onChange={(e) => setNewEqCatId(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
              >
                {examCategories.map((ec) => (
                  <option key={ec.id} value={ec.id}>
                    {ec.shortLabel} ({ec.code})
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  required
                  value={newEqSubject}
                  onChange={(e) => setNewEqSubject(e.target.value)}
                  placeholder="Subject (e.g., Physics)"
                  className="rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                />
                <input
                  required
                  value={newEqTopic}
                  onChange={(e) => setNewEqTopic(e.target.value)}
                  placeholder="Topic (e.g., Optics)"
                  className="rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                />
              </div>
              <textarea
                required
                rows={3}
                value={newEqPrompt}
                onChange={(e) => setNewEqPrompt(e.target.value)}
                placeholder="Question stem..."
                className="w-full rounded-xl border border-white/15 bg-obsidian-950 p-3 text-xs text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  value={newEqOptA}
                  onChange={(e) => setNewEqOptA(e.target.value)}
                  placeholder="Option A"
                  className="rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                />
                <input
                  required
                  value={newEqOptB}
                  onChange={(e) => setNewEqOptB(e.target.value)}
                  placeholder="Option B"
                  className="rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                />
                <input
                  required
                  value={newEqOptC}
                  onChange={(e) => setNewEqOptC(e.target.value)}
                  placeholder="Option C"
                  className="rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                />
                <input
                  required
                  value={newEqOptD}
                  onChange={(e) => setNewEqOptD(e.target.value)}
                  placeholder="Option D"
                  className="rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                />
              </div>
              <select
                value={newEqCorrectKey}
                onChange={(e) =>
                  setNewEqCorrectKey(e.target.value as "A" | "B" | "C" | "D")
                }
                className="w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
              >
                <option value="A">Correct Answer: Option A</option>
                <option value="B">Correct Answer: Option B</option>
                <option value="C">Correct Answer: Option C</option>
                <option value="D">Correct Answer: Option D</option>
              </select>
              <textarea
                rows={2}
                value={newEqExplanation}
                onChange={(e) => setNewEqExplanation(e.target.value)}
                placeholder="Worked post-submission explanation..."
                className="w-full rounded-xl border border-white/15 bg-obsidian-950 p-2.5 text-xs text-white"
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-electric-500 py-2.5 text-xs font-bold text-obsidian-950"
              >
                Publish Question &amp; Protected Key
              </button>
            </form>

            <section className="space-y-3 rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 lg:col-span-7">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-bold text-white">
                  Question Bank ({filteredExamQuestions.length})
                </h2>
                <input
                  value={examSearch}
                  onChange={(e) => setExamSearch(e.target.value)}
                  placeholder="Search subject, topic, or stem..."
                  className="rounded-xl border border-white/15 bg-obsidian-950 px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div className="max-h-[500px] space-y-2.5 overflow-y-auto pr-1">
                {filteredExamQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-obsidian-950/80 p-3.5 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-white">
                        {q.subject} • {q.topic} ({q.difficulty})
                        {q.examYear ? (
                          <span className="ml-2 rounded-full border border-electric-400/35 bg-electric-500/15 px-2 py-0.5 text-[10px] font-bold text-electric-300">
                            {q.examYear}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 line-clamp-2 text-slate-300">
                        {q.prompt}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Origin: {q.originType}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleExamQuestionPublish(q)}
                      className={`shrink-0 rounded-lg px-2.5 py-1 font-semibold ${
                        q.isPublished
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-white/10 text-slate-300"
                      }`}
                    >
                      {q.isPublished ? "Published" : "Draft"}
                    </button>
                  </div>
                ))}
              </div>
            </section>
            </div>
          </div>
        )}

        {/* 5. PLATFORM ANNOUNCEMENTS */}
        {section === "announcements" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <form
              onSubmit={handleCreateAnnouncement}
              className="space-y-3 rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 lg:col-span-5"
            >
              <h2 className="text-base font-bold text-white">
                Publish Platform Announcement
              </h2>
              <input
                required
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="Announcement title..."
                className="w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
              />
              <textarea
                required
                rows={4}
                value={annBody}
                onChange={(e) => setAnnBody(e.target.value)}
                placeholder="Announcement message delivered to student Notification feeds..."
                className="w-full rounded-xl border border-white/15 bg-obsidian-950 p-3 text-xs text-white"
              />
              <select
                value={annTarget}
                onChange={(e) => setAnnTarget(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
              >
                <option value="all">All Academic Pathways</option>
                <option value="secondary">Secondary Students Only</option>
                <option value="university">University Students Only</option>
                <option value="polytechnic">Polytechnic Students Only</option>
              </select>
              <button
                type="submit"
                className="w-full rounded-xl bg-electric-500 py-2.5 text-xs font-bold text-obsidian-950"
              >
                Publish Announcement
              </button>
            </form>

            <section className="space-y-2.5 rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 lg:col-span-7">
              <h2 className="text-base font-bold text-white">
                Published Announcements ({announcements.length})
              </h2>
              {announcements.length === 0 ? (
                <p className="py-6 text-xs text-slate-400">
                  No platform announcements published yet.
                </p>
              ) : (
                announcements.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/10 bg-obsidian-950/80 p-3.5 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{a.title}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            a.isPublished
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-slate-500/20 text-slate-400"
                          }`}
                        >
                          {a.isPublished ? "Live" : "Hidden"}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-300">{a.body}</p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Audience: {a.targetCategory} •{" "}
                        {new Date(a.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleAnnouncementPublished(a)}
                        className="rounded-lg border border-white/15 bg-obsidian-900 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:border-electric-400/40"
                      >
                        {a.isPublished ? "Hide" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAnnouncement(a)}
                        aria-label={`Delete announcement ${a.title}`}
                        className="rounded-lg border border-white/15 bg-obsidian-900 p-1.5 text-slate-400 hover:border-red-400/40 hover:text-red-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </section>
          </div>
        )}

        {/* 6. AI USAGE QUOTAS, LOGS & ADMIN AUDIT TRAIL */}
        {section === "ai_governance" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <form
                onSubmit={handleSaveAiSettings}
                className="space-y-3 rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 lg:col-span-5"
              >
                <h2 className="text-base font-bold text-white">
                  AI Provider Routing &amp; Daily Student Quotas
                </h2>
                <label className="flex items-center justify-between rounded-xl border border-white/10 bg-obsidian-950 p-3 text-xs">
                  <span>Enable AI Services Globally</span>
                  <input
                    type="checkbox"
                    checked={aiSettings.aiEnabled}
                    onChange={(e) =>
                      setAiSettings((s) => ({
                        ...s,
                        aiEnabled: e.target.checked,
                      }))
                    }
                  />
                </label>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400">
                      Primary Provider
                    </label>
                    <select
                      value={aiSettings.defaultProvider}
                      onChange={(e) =>
                        setAiSettings((s) => ({
                          ...s,
                          defaultProvider: e.target.value as
                            | "openai"
                            | "openrouter",
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                    >
                      <option value="openai">OpenAI (Primary)</option>
                      <option value="openrouter">OpenRouter (Primary)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400">
                      Daily Student Quota
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={aiSettings.dailyRequestLimitPerStudent}
                      onChange={(e) =>
                        setAiSettings((s) => ({
                          ...s,
                          dailyRequestLimitPerStudent: Number(e.target.value),
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400">
                      Default Model
                    </label>
                    <input
                      value={aiSettings.defaultModel}
                      onChange={(e) =>
                        setAiSettings((s) => ({
                          ...s,
                          defaultModel: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400">
                      Failover Model
                    </label>
                    <input
                      value={aiSettings.fallbackModel}
                      onChange={(e) =>
                        setAiSettings((s) => ({
                          ...s,
                          fallbackModel: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400">
                    Max Tokens per AI Response
                  </label>
                  <input
                    type="number"
                    min={200}
                    max={4000}
                    value={aiSettings.maxTokensPerResponse}
                    onChange={(e) =>
                      setAiSettings((s) => ({
                        ...s,
                        maxTokensPerResponse: Number(e.target.value),
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-electric-500 py-2.5 text-xs font-bold text-obsidian-950"
                >
                  Save AI Governance Settings
                </button>
              </form>

              <section className="space-y-3 rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 lg:col-span-7">
                <h2 className="text-base font-bold text-white">
                  Recent AI Operational Telemetry ({aiLogs.length})
                </h2>
                {aiLogs.length === 0 ? (
                  <p className="py-6 text-xs text-slate-400">
                    No AI usage logs recorded yet.
                  </p>
                ) : (
                  <div className="max-h-[320px] space-y-2 overflow-y-auto">
                    {aiLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-obsidian-950 p-3 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-white">
                            {log.feature} • {log.provider} ({log.model})
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Tokens: {log.totalTokens} • Latency:{" "}
                            {log.latencyMs ?? 0}ms •{" "}
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            log.status === "success"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-red-500/20 text-red-300"
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <section className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-5">
              <h2 className="text-base font-bold text-white">
                Immutable Administrator Audit Log ({auditLogs.length})
              </h2>
              {auditLogs.length === 0 ? (
                <p className="mt-2 text-xs text-slate-400">
                  Admin actions will appear here automatically.
                </p>
              ) : (
                <div className="mt-3 max-h-[260px] space-y-2 overflow-y-auto">
                  {auditLogs.map((al) => (
                    <div
                      key={al.id}
                      className="flex flex-wrap items-center justify-between rounded-xl border border-white/10 bg-obsidian-950 p-3 text-xs"
                    >
                      <span className="font-medium text-white">
                        [{al.actionType}] {al.summary}
                      </span>
                      <span className="text-slate-400">
                        {new Date(al.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* 7. GOOGLE SEO & VIRAL GROWTH COMMAND CENTER */}
        {section === "growth_marketing" && <AdminGrowthMarketingPanel />}
      </main>
    </div>
  );
}
