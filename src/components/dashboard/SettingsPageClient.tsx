"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Loader2,
  LogOut,
  PenSquare,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { signOutLearner } from "@/lib/auth/authService";
import { useStudentDashboardData } from "@/lib/dashboard/useStudentDashboardData";
import { clearAllOfflineNotesCaches } from "@/lib/notes/notesService";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function SettingsPageClient() {
  const router = useRouter();
  const { status, isRetrying, data, errorMessage, retry } =
    useStudentDashboardData();
  const [signingOut, setSigningOut] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [confirmPurgeText, setConfirmPurgeText] = useState("");
  const [purgingData, setPurgingData] = useState(false);
  const [privacyFeedback, setPrivacyFeedback] = useState<string | null>(null);

  if (status === "loading") {
    return <DashboardSkeleton />;
  }

  if (status === "error" || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian-950 p-4">
        <DashboardErrorState
          message={errorMessage || "Unable to load account settings right now."}
          isRetrying={isRetrying}
          onRetry={retry}
        />
      </div>
    );
  }

  const email = data.userProfile?.email || data.email || "Verified session";
  const isAdmin = data.userProfile?.role === "admin";

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOutLearner();
    router.replace("/login");
    router.refresh();
  };

  const handleExportMyData = async () => {
    setExportingData(true);
    setPrivacyFeedback(null);

    let fullRecords: Record<string, unknown> = {};
    const supabase = createBrowserSupabaseClient();
    const userId = data.userProfile?.id;

    if (supabase && userId) {
      try {
        const [
          notesRes,
          tutorConvsRes,
          tutorMsgsRes,
          tutorPrefsRes,
          plannerRes,
          timetableRes,
          assignmentsRes,
          studySessionsRes,
          examAttemptsRes,
          examResponsesRes,
          examTopicPerfRes,
          exerciseAttemptsRes,
          assessmentsRes,
          lessonProgRes,
          bookmarksRes,
          notifsRes,
          notifPrefsRes,
        ] = await Promise.all([
          supabase.from("student_notes").select("*").eq("user_id", userId).limit(500),
          supabase.from("ai_tutor_conversations").select("*").eq("user_id", userId).limit(200),
          supabase.from("ai_tutor_messages").select("*").eq("user_id", userId).limit(1000),
          supabase.from("student_tutor_preferences").select("*").eq("user_id", userId).maybeSingle(),
          supabase.from("student_planner_tasks").select("*").eq("user_id", userId).limit(500),
          supabase.from("student_timetable_entries").select("*").eq("user_id", userId).limit(200),
          supabase.from("student_assignments").select("*").eq("user_id", userId).limit(500),
          supabase.from("student_study_sessions").select("*").eq("user_id", userId).limit(500),
          supabase
            .from("student_exam_attempts")
            .select(
              "id, exam_category_code, exam_name, subject, selected_topics, difficulty, question_count, is_timed, time_limit_minutes, practice_source, status, earned_points, possible_points, correct_count, gradable_count, score_percent, time_spent_seconds, topic_breakdown, weak_topics, ai_revision_plan, started_at, submitted_at, created_at"
            )
            .eq("user_id", userId)
            .limit(200),
          supabase.from("student_exam_responses").select("*").eq("user_id", userId).limit(2000),
          supabase.from("student_exam_topic_performance").select("*").eq("user_id", userId).limit(200),
          supabase.from("student_exercise_attempts").select("*").eq("user_id", userId).limit(500),
          supabase.from("student_assessment_results").select("*").eq("user_id", userId).limit(500),
          supabase.from("student_lesson_progress").select("*").eq("user_id", userId).limit(500),
          supabase.from("student_lesson_bookmarks").select("*").eq("user_id", userId).limit(500),
          supabase.from("student_notifications").select("*").eq("user_id", userId).limit(500),
          supabase.from("student_notification_preferences").select("*").eq("user_id", userId).maybeSingle(),
        ]);

        fullRecords = {
          personalNotes: notesRes.data || [],
          aiTutorConversations: tutorConvsRes.data || [],
          aiTutorMessages: tutorMsgsRes.data || [],
          aiTutorPreferences: tutorPrefsRes.data || null,
          plannerTasks: plannerRes.data || [],
          timetableEntries: timetableRes.data || [],
          assignments: assignmentsRes.data || [],
          studySessions: studySessionsRes.data || [],
          examAttempts: examAttemptsRes.data || [],
          examResponses: examResponsesRes.data || [],
          examTopicPerformance: examTopicPerfRes.data || [],
          lessonExerciseAttempts: exerciseAttemptsRes.data || [],
          assessmentResults: assessmentsRes.data || [],
          lessonProgress: lessonProgRes.data || [],
          lessonBookmarks: bookmarksRes.data || [],
          notifications: notifsRes.data || [],
          notificationPreferences: notifPrefsRes.data || null,
        };
      } catch {
        // Offline fallback exports currently loaded dashboard profile & progress
      }
    }

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      platform: "E-LEARNING ECOSYSTEM (Powered by TRALIX AI)",
      userProfile: data.userProfile,
      academicProfile: data.academicProfile,
      courseProgress: data.ongoingCourses,
      progressMetrics: data.progressMetrics,
      ...fullRecords,
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `elearning-personal-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportingData(false);
    setPrivacyFeedback(
      "Your complete personal profile and learning data archive (JSON) has been downloaded."
    );
  };

  const handlePurgeLearningRecords = async () => {
    if (confirmPurgeText.trim().toUpperCase() !== "DELETE MY DATA") return;
    setPurgingData(true);
    setPrivacyFeedback(null);

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setPurgingData(false);
      return;
    }

    const { error } = await supabase.rpc("purge_own_student_learning_records");
    setPurgingData(false);

    if (error) {
      setPrivacyFeedback(`Could not purge records: ${error.message}`);
      return;
    }

    clearAllOfflineNotesCaches();
    setConfirmPurgeText("");
    setPrivacyFeedback(
      "All personal notes, AI Tutor chats, planner tasks, timetable entries, assignments, study sessions, exam/exercise history, assessment scores, bookmarks, notifications, and local offline note caches have been permanently erased."
    );
    await retry();
  };

  return (
    <DashboardShell
      userProfile={data.userProfile}
      academicProfile={data.academicProfile}
      fallbackEmail={data.email}
      unreadNotificationCount={data.unreadNotificationCount}
      publishedCourses={data.publishedCourses}
      ongoingCourses={data.ongoingCourses}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-700/80 bg-obsidian-900/80 px-3.5 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-electric-400/50 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 text-electric-400" aria-hidden="true" />
            <span>Back to Dashboard</span>
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-electric-500 px-4 py-2 text-xs font-bold text-obsidian-950 hover:bg-electric-400"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Open Admin Governance Portal</span>
            </Link>
          )}
        </div>

        <section className="rounded-3xl border border-white/[0.08] hardcover-surface p-6 shadow-card-elevated sm:p-8">
          <h1 className="font-display text-2xl font-bold text-white">
            Account, Privacy &amp; Data Controls
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage your authenticated session, academic preferences, and
            personal data retention rights.
          </p>

          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-obsidian-950/75 p-5">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold text-white">
                  <ShieldCheck
                    className="h-4 w-4 text-emerald-400"
                    aria-hidden="true"
                  />
                  <span>Verified Account Session</span>
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Signed in as <strong className="text-slate-200">{email}</strong>
                </p>
              </div>
              <span className="rounded-full border border-emerald-400/35 bg-emerald-950/40 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                RLS Protected
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-obsidian-950/75 p-5">
              <div>
                <p className="text-sm font-bold text-white">
                  Academic Profile &amp; Curriculum
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Update your institution, academic level, selected subjects, or
                  learning goals without resetting your account.
                </p>
              </div>
              <Link
                href="/onboarding?review=1"
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-electric-400/60 bg-electric-400/12 px-4 py-2 text-xs font-bold text-electric-300 transition-colors hover:bg-electric-400 hover:text-obsidian-950"
              >
                <PenSquare className="h-4 w-4" aria-hidden="true" />
                <span>Edit Academic Information</span>
              </Link>
            </div>

            {/* NDPA / Child-Safety & Data Retention Controls */}
            <div className="space-y-4 rounded-2xl border border-white/[0.07] bg-obsidian-950/75 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-sm font-bold text-white">
                    <ShieldAlert className="h-4 w-4 text-electric-400" />
                    <span>
                      Data Privacy, Export &amp; Learning Record Retention
                    </span>
                  </p>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
                    Your notes, AI Tutor chats, planner tasks, and exam results
                    are isolated by PostgreSQL Row Level Security and are never
                    sold or used for behavioral advertising. Learners (and
                    parents/guardians of minors under 18) can export their
                    complete JSON data archive or permanently purge all personal
                    learning records below.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={exportingData}
                  onClick={handleExportMyData}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-white/15 bg-obsidian-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-electric-400/50 hover:text-white disabled:opacity-60"
                >
                  {exportingData ? (
                    <Loader2 className="h-4 w-4 animate-spin text-electric-400" />
                  ) : (
                    <Download className="h-4 w-4 text-electric-400" />
                  )}
                  <span>
                    {exportingData ? "Preparing Export..." : "Export My Data (JSON)"}
                  </span>
                </button>
              </div>

              {privacyFeedback && (
                <p className="rounded-xl border border-electric-400/30 bg-electric-500/10 px-3.5 py-2 text-xs text-electric-200">
                  {privacyFeedback}
                </p>
              )}

              <div className="border-t border-white/10 pt-4">
                <p className="text-xs font-semibold text-rose-200">
                  Permanent Personal Learning Data Purge (Keeps Login Account Active)
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                  Type <code>DELETE MY DATA</code> below to permanently erase
                  your AI Tutor conversations, personal notes, planner tasks,
                  timetable, assignments, study sessions, exam &amp; exercise
                  history, assessment scores, bookmarks, notifications, and
                  offline note caches. Non-content AI token quota counters and
                  your core login profile remain active; to request full{" "}
                  <Link href="/privacy" className="text-electric-300 underline">
                    account &amp; identity deletion
                  </Link>
                  , purge your learning records first and submit a verified
                  deletion request via platform administration.
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                  <input
                    type="text"
                    aria-label="Confirm data deletion"
                    value={confirmPurgeText}
                    onChange={(e) => setConfirmPurgeText(e.target.value)}
                    placeholder="Type DELETE MY DATA"
                    className="rounded-xl border border-white/15 bg-obsidian-900 px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="button"
                    disabled={
                      purgingData ||
                      confirmPurgeText.trim().toUpperCase() !== "DELETE MY DATA"
                    }
                    onClick={handlePurgeLearningRecords}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-400/50 bg-rose-950/60 px-4 py-2 text-xs font-bold text-rose-200 hover:bg-rose-900/70 disabled:opacity-40"
                  >
                    {purgingData ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    <span>Purge Personal Study Data</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rose-500/25 bg-rose-950/20 p-5">
              <div>
                <p className="text-sm font-bold text-white">Sign Out</p>
                <p className="mt-1 text-xs text-slate-400">
                  Safely end your Supabase session and clear offline note caches
                  on this device.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-rose-400/50 bg-rose-950/60 px-4 py-2 text-xs font-bold text-rose-200 transition-colors hover:bg-rose-900/70 disabled:opacity-60"
              >
                {signingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{signingOut ? "Signing out..." : "Sign Out"}</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
