"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  BookOpen,
  Bot,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Megaphone,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
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
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type AdminSection =
  | "overview"
  | "users"
  | "curriculum"
  | "exams"
  | "announcements"
  | "ai_governance";

export function AdminPortalClient() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [section, setSection] = useState<AdminSection>("overview");
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const [overview, setOverview] = useState<PlatformOverviewStats | null>(null);
  const [users, setUsers] = useState<AdminProfileRow[]>([]);
  const [courses, setCourses] = useState<AdminCourseRow[]>([]);
  const [examCats, setExamCats] = useState<
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
  const [systemHealth, setSystemHealth] = useState<Record<
    string,
    unknown
  > | null>(null);

  // Forms: New Course (with Provenance)
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseSubject, setNewCourseSubject] = useState("Physics");
  const [newCourseCategory, setNewCourseCategory] = useState("secondary");
  const [newCourseClassification, setNewCourseClassification] = useState<
    "verified" | "ai_generated" | "imported_third_party"
  >("verified");
  const [newCourseSourceOrg, setNewCourseSourceOrg] = useState(
    "TRALIX Academic Editorial Board"
  );
  const [newCourseLicense, setNewCourseLicense] = useState("CC BY 4.0");

  // Forms: New Exam Question
  const [newEqCatId, setNewEqCatId] = useState("");
  const [newEqSubject, setNewEqSubject] = useState("Physics");
  const [newEqTopic, setNewEqTopic] = useState("Scalars & Vectors");
  const [newEqPrompt, setNewEqPrompt] = useState("");
  const [newEqOptA, setNewEqOptA] = useState("");
  const [newEqOptB, setNewEqOptB] = useState("");
  const [newEqOptC, setNewEqOptC] = useState("");
  const [newEqOptD, setNewEqOptD] = useState("");
  const [newEqCorrectKey, setNewEqCorrectKey] = useState("A");
  const [newEqExplanation, setNewEqExplanation] = useState("");

  // Forms: Announcement
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [annTarget, setAnnTarget] = useState("all");

  const reloadAdmin = useCallback(async () => {
    const res = await fetchAdminDashboardPayload();
    if (res.status === "unauthenticated") {
      routerRef.current.replace("/login?next=/admin");
      return;
    }
    if (res.status !== "ready") {
      setForbidden(true);
      setLoading(false);
      return;
    }

    setOverview(res.overview);
    setUsers(res.users);
    setCourses(res.courses);
    setExamCats(res.examCategories);
    if (res.examCategories[0] && !newEqCatId) {
      setNewEqCatId(res.examCategories[0].id);
    }
    setExamQuestions(res.examQuestions);
    setAnnouncements(res.announcements);
    setAiSettings(res.aiSettings);
    setAiLogs(res.aiUsageLogs);
    setAuditLogs(res.auditLogs);
    setSystemHealth(res.systemHealth);
    setLoading(false);
  }, [newEqCatId]);

  useEffect(() => {
    reloadAdmin();
  }, [reloadAdmin]);

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

  // 2. Create Draft Course with Provenance Metadata
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
        publication_status:
          newCourseClassification === "verified" ? "approved" : "draft",
        is_published: false,
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
    setStatusBanner("Course created in review queue with provenance metadata.");
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

  // 4. Add Curated Exam Question + Options + Answer Key
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
      { question_id: qRow.id, option_key: "A", option_text: newEqOptA, option_order: 1 },
      { question_id: qRow.id, option_key: "B", option_text: newEqOptB, option_order: 2 },
      { question_id: qRow.id, option_key: "C", option_text: newEqOptC, option_order: 3 },
      { question_id: qRow.id, option_key: "D", option_text: newEqOptD, option_order: 4 },
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
    await supabase
      .from("exam_questions")
      .update({ is_published: !q.isPublished })
      .eq("id", q.id);
    await reloadAdmin();
  };

  // 5. Publish / Toggle Platform Announcement
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
      summary: `Updated AI governance (enabled=${aiSettings.aiEnabled}, dailyLimit=${aiSettings.dailyRequestLimitPerStudent})`,
    });

    setStatusBanner("AI system limits and provider routing updated.");
    await reloadAdmin();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian-950 text-slate-200">
        <Loader2 className="mr-2.5 h-5 w-5 animate-spin text-electric-400" />
        <span>Verifying Administrator Authorization...</span>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian-950 p-6">
        <div className="max-w-md rounded-3xl border border-red-400/30 bg-obsidian-900 p-8 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-red-400" />
          <h1 className="mt-4 text-xl font-bold text-white">
            Administrator Access Required
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            This portal is restricted to verified platform administrators
            enforced via server-side guards and PostgreSQL Row Level Security.
          </p>
          <Link
            href="/dashboard"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-electric-500 px-4 py-2.5 text-xs font-bold text-obsidian-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Student Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian-950 text-slate-100">
      {/* Separate Dedicated Admin Top Bar */}
      <header className="border-b border-white/10 bg-obsidian-900/95 px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BrandLogo size="sm" />
            <span className="rounded-full border border-electric-400/40 bg-electric-500/15 px-3 py-1 text-xs font-bold text-electric-300">
              ADMIN GOVERNANCE PORTAL
            </span>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-obsidian-950 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-electric-400/50"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-electric-400" />
            Switch to Learner View
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-8">
        {/* Section Switcher */}
        <nav
          aria-label="Admin Portal Sections"
          className="flex flex-wrap gap-2"
        >
          {(
            [
              { id: "overview", label: "Overview & Health", icon: Activity },
              { id: "users", label: "Student & Role Access", icon: Users },
              {
                id: "curriculum",
                label: "Courses & Provenance",
                icon: BookOpen,
              },
              { id: "exams", label: "Exam Question Bank", icon: GraduationCap },
              {
                id: "announcements",
                label: "Announcements",
                icon: Megaphone,
              },
              {
                id: "ai_governance",
                label: "AI Quotas & Audit Logs",
                icon: Bot,
              },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSection(tab.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                  section === tab.id
                    ? "bg-electric-500 text-obsidian-950"
                    : "border border-white/10 bg-obsidian-900 text-slate-300 hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {statusBanner && (
          <div className="flex items-center gap-2 rounded-xl border border-electric-400/30 bg-electric-500/10 p-3.5 text-xs text-electric-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{statusBanner}</span>
          </div>
        )}

        {/* 1. OVERVIEW & SYSTEM HEALTH */}
        {section === "overview" && overview && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              {[
                { label: "Total Registered Users", value: overview.totalUsers },
                {
                  label: "Onboarded Learners",
                  value: overview.onboardedStudents,
                },
                { label: "Published Courses", value: overview.publishedCourses },
                { label: "Draft / Review Courses", value: overview.draftCourses },
                { label: "Published Lessons", value: overview.publishedLessons },
                {
                  label: "Published Exam Questions",
                  value: overview.publishedExamQuestions,
                },
                {
                  label: "Submitted Exam Attempts",
                  value: overview.submittedExamAttempts,
                },
                {
                  label: "AI Requests (24h / Total)",
                  value: `${overview.aiRequests24h} / ${overview.aiRequestsTotal}`,
                },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-4"
                >
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    {m.label}
                  </p>
                  <p className="mt-1.5 text-2xl font-bold text-white">
                    {m.value}
                  </p>
                </div>
              ))}
            </div>

            {systemHealth && (
              <section className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-5">
                <h2 className="text-sm font-bold text-white">
                  System Health & Server Environment Status
                </h2>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                  {Object.entries(systemHealth)
                    .filter(([k]) => k !== "checkedAt")
                    .map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-obsidian-950 p-3"
                      >
                        <span className="text-slate-300">{k}</span>
                        <span
                          className={`font-bold ${
                            v ? "text-emerald-300" : "text-amber-300"
                          }`}
                        >
                          {v ? "Configured" : "Optional / Pending"}
                        </span>
                      </div>
                    ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* 2. USER & ROLE MANAGEMENT */}
        {section === "users" && (
          <section className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-5">
            <h2 className="text-base font-bold text-white">
              Learner, Educator & Admin Accounts ({users.length})
            </h2>
            <div className="mt-4 space-y-2.5">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-obsidian-950/80 p-3.5 text-xs"
                >
                  <div>
                    <p className="font-semibold text-white">{u.fullName}</p>
                    <p className="text-slate-400">
                      {u.email} • {u.country}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor={`role-${u.id}`} className="sr-only">
                      Role for {u.email}
                    </label>
                    <select
                      id={`role-${u.id}`}
                      value={u.role}
                      onChange={(e) =>
                        handleRoleChange(
                          u.id,
                          e.target.value as "student" | "educator" | "admin"
                        )
                      }
                      className="rounded-lg border border-white/15 bg-obsidian-900 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      <option value="student">student</option>
                      <option value="educator">educator</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3. CURRICULUM & PROVENANCE GOVERNANCE */}
        {section === "curriculum" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <form
              onSubmit={handleCreateCourse}
              className="space-y-3 rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 lg:col-span-5"
            >
              <h2 className="text-base font-bold text-white">
                Register Course & Content Provenance
              </h2>
              <input
                required
                value={newCourseTitle}
                onChange={(e) => setNewCourseTitle(e.target.value)}
                placeholder="Course title..."
                className="w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
              />
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  required
                  value={newCourseSubject}
                  onChange={(e) => setNewCourseSubject(e.target.value)}
                  placeholder="Subject"
                  className="rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                />
                <select
                  value={newCourseCategory}
                  onChange={(e) => setNewCourseCategory(e.target.value)}
                  className="rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                >
                  <option value="secondary">secondary</option>
                  <option value="university">university</option>
                  <option value="polytechnic">polytechnic</option>
                  <option value="all">all</option>
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
                  Verified Educational Content (Admin Approved)
                </option>
                <option value="imported_third_party">
                  Imported Third-Party OER Content
                </option>
                <option value="ai_generated">
                  AI-Generated Draft Content (Unverified)
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
                  placeholder="License (e.g. CC BY 4.0)"
                  className="rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-electric-500 py-2.5 text-xs font-bold text-obsidian-950"
              >
                <Plus className="h-4 w-4" />
                Save Course with Provenance
              </button>
            </form>

            <section className="space-y-3 rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 lg:col-span-7">
              <h2 className="text-base font-bold text-white">
                Course Publication & Verification Queue
              </h2>
              {courses.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-obsidian-950/80 p-3.5 text-xs"
                >
                  <div>
                    <p className="font-semibold text-white">{c.title}</p>
                    <p className="text-slate-400">
                      {c.subject} • {c.academicCategory} • Provenance:{" "}
                      <strong className="text-electric-300">
                        {c.contentClassification}
                      </strong>{" "}
                      • {c.totalLessons} lessons
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleCoursePublish(c)}
                    className={`rounded-lg px-3 py-1.5 font-bold ${
                      c.isPublished
                        ? "bg-amber-500/20 text-amber-200"
                        : "bg-emerald-500/20 text-emerald-200"
                    }`}
                  >
                    {c.isPublished ? "Unpublish" : "Approve & Publish"}
                  </button>
                </div>
              ))}
            </section>
          </div>
        )}

        {/* 4. EXAM QUESTION BANK */}
        {section === "exams" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <form
              onSubmit={handleCreateExamQuestion}
              className="space-y-3 rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 lg:col-span-5"
            >
              <h2 className="text-base font-bold text-white">
                Add Curated Practice Question & Answer Key
              </h2>
              <select
                value={newEqCatId}
                onChange={(e) => setNewEqCatId(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
              >
                {examCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.shortLabel} ({c.code})
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  required
                  value={newEqSubject}
                  onChange={(e) => setNewEqSubject(e.target.value)}
                  placeholder="Subject"
                  className="rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                />
                <input
                  required
                  value={newEqTopic}
                  onChange={(e) => setNewEqTopic(e.target.value)}
                  placeholder="Topic"
                  className="rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                />
              </div>
              <textarea
                required
                rows={3}
                value={newEqPrompt}
                onChange={(e) => setNewEqPrompt(e.target.value)}
                placeholder="Question prompt..."
                className="w-full rounded-xl border border-white/15 bg-obsidian-950 p-3 text-xs text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  value={newEqOptA}
                  onChange={(e) => setNewEqOptA(e.target.value)}
                  placeholder="Option A"
                  className="rounded-lg border border-white/15 bg-obsidian-950 px-2.5 py-1.5 text-xs text-white"
                />
                <input
                  required
                  value={newEqOptB}
                  onChange={(e) => setNewEqOptB(e.target.value)}
                  placeholder="Option B"
                  className="rounded-lg border border-white/15 bg-obsidian-950 px-2.5 py-1.5 text-xs text-white"
                />
                <input
                  required
                  value={newEqOptC}
                  onChange={(e) => setNewEqOptC(e.target.value)}
                  placeholder="Option C"
                  className="rounded-lg border border-white/15 bg-obsidian-950 px-2.5 py-1.5 text-xs text-white"
                />
                <input
                  required
                  value={newEqOptD}
                  onChange={(e) => setNewEqOptD(e.target.value)}
                  placeholder="Option D"
                  className="rounded-lg border border-white/15 bg-obsidian-950 px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <select
                  value={newEqCorrectKey}
                  onChange={(e) => setNewEqCorrectKey(e.target.value)}
                  className="rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                >
                  <option value="A">Correct: Option A</option>
                  <option value="B">Correct: Option B</option>
                  <option value="C">Correct: Option C</option>
                  <option value="D">Correct: Option D</option>
                </select>
                <input
                  required
                  value={newEqExplanation}
                  onChange={(e) => setNewEqExplanation(e.target.value)}
                  placeholder="Answer explanation..."
                  className="rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-electric-500 py-2.5 text-xs font-bold text-obsidian-950"
              >
                Publish Question & Protected Key
              </button>
            </form>

            <section className="space-y-2.5 rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 lg:col-span-7">
              <h2 className="text-base font-bold text-white">
                Exam Questions ({examQuestions.length})
              </h2>
              {examQuestions.map((q) => (
                <div
                  key={q.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-obsidian-950/80 p-3.5 text-xs"
                >
                  <div>
                    <p className="font-medium text-white">{q.prompt}</p>
                    <p className="mt-1 text-slate-400">
                      {q.subject} • {q.topic} • Origin: {q.originType}
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
            </section>
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
                Published Announcements
              </h2>
              {announcements.length === 0 ? (
                <p className="py-6 text-xs text-slate-400">
                  No platform announcements published yet.
                </p>
              ) : (
                announcements.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-xl border border-white/10 bg-obsidian-950/80 p-3.5 text-xs"
                  >
                    <p className="font-semibold text-white">{a.title}</p>
                    <p className="mt-1 text-slate-300">{a.body}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Audience: {a.targetCategory} •{" "}
                      {new Date(a.createdAt).toLocaleDateString()}
                    </p>
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
                  AI Provider Routing & Daily Student Quotas
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
                  <div className="max-h-[280px] space-y-2 overflow-y-auto">
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
                            {log.latencyMs ?? 0}ms
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
                <div className="mt-3 space-y-2">
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
      </main>
    </div>
  );
}
