"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { useStudentDashboardData } from "@/lib/dashboard/useStudentDashboardData";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { StudentNotificationRecord } from "@/types/dashboard";

interface NotificationPrefsState {
  assignment_reminders: boolean;
  upcoming_deadlines: boolean;
  study_reminders: boolean;
  learning_updates: boolean;
  exam_updates: boolean;
  platform_announcements: boolean;
}

const DEFAULT_PREFS: NotificationPrefsState = {
  assignment_reminders: true,
  upcoming_deadlines: true,
  study_reminders: true,
  learning_updates: true,
  exam_updates: true,
  platform_announcements: true,
};

export function NotificationsPageClient() {
  const {
    status,
    isRetrying,
    data,
    errorMessage,
    retry,
    markAllNotificationsRead,
    markNotificationRead,
  } = useStudentDashboardData();

  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [prefs, setPrefs] = useState<NotificationPrefsState>(DEFAULT_PREFS);
  const [prefsSavedMsg, setPrefsSavedMsg] = useState<string | null>(null);
  const [syncingEvents, setSyncingEvents] = useState(false);

  const loadPreferencesAndSync = useCallback(async () => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    try {
      await supabase.rpc("sync_student_event_notifications");
      const { data: row } = await supabase
        .from("student_notification_preferences")
        .select("*")
        .maybeSingle();

      if (row) {
        setPrefs({
          assignment_reminders: Boolean(row.assignment_reminders),
          upcoming_deadlines: Boolean(row.upcoming_deadlines),
          study_reminders: Boolean(row.study_reminders),
          learning_updates: Boolean(row.learning_updates),
          exam_updates: Boolean(row.exam_updates),
          platform_announcements: Boolean(row.platform_announcements),
        });
      }
    } catch {
      // Non-fatal in unit tests or offline
    }
  }, []);

  useEffect(() => {
    if (status === "ready") {
      loadPreferencesAndSync();
    }
  }, [status, loadPreferencesAndSync]);

  const handleDeleteNotification = async (id: string) => {
    try {
      const res = await fetch("/api/dashboard/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        delegateToBrowser?: boolean;
      };
      if (json.delegateToBrowser) {
        const supabase = createBrowserSupabaseClient();
        if (supabase) {
          await supabase.from("student_notifications").delete().eq("id", id);
        }
      }
    } catch {
      const supabase = createBrowserSupabaseClient();
      if (supabase) {
        await supabase.from("student_notifications").delete().eq("id", id);
      }
    }

    setDeletedIds((prev) => new Set(prev).add(id));
  };

  const handleTogglePref = async (key: keyof NotificationPrefsState) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setPrefsSavedMsg(null);

    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("student_notification_preferences")
      .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });

    if (!error) {
      setPrefsSavedMsg("Preferences saved.");
      setTimeout(() => setPrefsSavedMsg(null), 2000);
    }
  };

  const handleManualSync = async () => {
    setSyncingEvents(true);
    await loadPreferencesAndSync();
    await retry();
    setSyncingEvents(false);
  };

  if (status === "loading") {
    return <DashboardSkeleton />;
  }

  if (status === "error" || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian-950 p-4">
        <DashboardErrorState
          message={errorMessage || "Unable to load notifications right now."}
          isRetrying={isRetrying}
          onRetry={retry}
        />
      </div>
    );
  }

  const allNotifications = data.notifications.filter(
    (n) => !deletedIds.has(n.id)
  );
  const visibleNotifications =
    categoryFilter === "all"
      ? allNotifications
      : allNotifications.filter((n) => n.category === categoryFilter);
  const unreadCount = allNotifications.filter((n) => !n.is_read).length;

  return (
    <DashboardShell
      userProfile={data.userProfile}
      academicProfile={data.academicProfile}
      fallbackEmail={data.email}
      unreadNotificationCount={unreadCount}
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

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleManualSync}
              disabled={syncingEvents}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-white/15 bg-obsidian-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${syncingEvents ? "animate-spin" : ""}`}
              />
              <span>Sync Deadlines & Announcements</span>
            </button>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllNotificationsRead}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-electric-400/55 bg-electric-400/12 px-4 py-2 text-xs font-bold text-electric-300 transition-colors hover:bg-electric-400 hover:text-obsidian-950"
              >
                <CheckCheck className="h-4 w-4" aria-hidden="true" />
                <span>Mark All as Read</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Notification Feed */}
          <section className="rounded-3xl border border-white/[0.08] hardcover-surface p-6 shadow-card-elevated sm:p-8 lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-electric-400/40 bg-electric-400/12 text-electric-300">
                  <Bell className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold text-white">
                    Notifications
                  </h1>
                  <p className="text-xs text-slate-400 sm:text-sm">
                    Generated strictly from real assignment deadlines, exam
                    attempts, learning milestones, and admin announcements.
                  </p>
                </div>
              </div>

              {unreadCount > 0 && (
                <span className="rounded-full border border-electric-400/40 bg-electric-400/15 px-3 py-1 text-xs font-bold text-electric-300">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {/* Category Filters */}
            <div className="mt-5 flex flex-wrap gap-1.5">
              {[
                { id: "all", label: "All" },
                { id: "assignment", label: "Assignments & Deadlines" },
                { id: "exam", label: "Exam Prep" },
                { id: "learning", label: "Learning" },
                { id: "planner", label: "Study Planner" },
                { id: "announcement", label: "Announcements" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    categoryFilter === cat.id
                      ? "bg-electric-500 text-obsidian-950"
                      : "border border-white/10 bg-obsidian-950 text-slate-300 hover:text-white"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {visibleNotifications.length > 0 ? (
              <ul className="mt-5 space-y-3">
                {visibleNotifications.map((item: StudentNotificationRecord) => (
                  <li
                    key={item.id}
                    className={`rounded-2xl border p-4 transition-colors ${
                      item.is_read
                        ? "border-slate-800/80 bg-obsidian-950/60"
                        : "border-electric-400/40 bg-obsidian-900/90"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {!item.is_read && (
                            <span
                              className="h-2 w-2 rounded-full bg-electric-400"
                              aria-label="Unread"
                            />
                          )}
                          <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-electric-300">
                            {item.category}
                          </span>
                          <h2 className="text-sm font-bold text-white">
                            {item.title}
                          </h2>
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-300 sm:text-sm">
                          {item.body}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                          <span>
                            {new Date(item.created_at).toLocaleString("en-US", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                          {item.action_url && (
                            <Link
                              href={item.action_url}
                              className="inline-flex items-center gap-1 font-medium text-electric-300 hover:underline"
                            >
                              Open <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        {!item.is_read && (
                          <button
                            type="button"
                            onClick={() => markNotificationRead(item.id)}
                            className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-slate-700 bg-obsidian-950 px-2.5 py-1 text-xs font-semibold text-electric-300 hover:text-white"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Mark read</span>
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label={`Delete notification ${item.title}`}
                          onClick={() => handleDeleteNotification(item.id)}
                          className="inline-flex min-h-[34px] items-center rounded-lg border border-white/10 bg-obsidian-950 px-2.5 py-1 text-xs text-slate-400 hover:border-red-400/40 hover:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-800 bg-obsidian-950/70 p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-obsidian-900 text-slate-400">
                  <Bell className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="mt-4 font-display text-base font-bold text-white">
                  No Notifications Yet
                </h2>
                <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-400 sm:text-sm">
                  You are all caught up. Real alerts for courses, study plans,
                  exams, and assignments will appear here when triggered.
                </p>
              </div>
            )}
          </section>

          {/* Notification Preferences & External Delivery Transparency */}
          <aside className="space-y-4 rounded-3xl border border-white/[0.08] bg-obsidian-900/80 p-6 lg:col-span-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                <SlidersHorizontal className="h-4 w-4 text-electric-400" />
                <span>Notification Preferences</span>
              </h2>
              {prefsSavedMsg && (
                <span className="text-[11px] font-semibold text-emerald-300">
                  {prefsSavedMsg}
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {(
                [
                  {
                    key: "assignment_reminders",
                    label: "Assignment Reminders",
                  },
                  {
                    key: "upcoming_deadlines",
                    label: "Upcoming 48h Deadlines",
                  },
                  { key: "study_reminders", label: "Study Session Reminders" },
                  {
                    key: "learning_updates",
                    label: "Course & Lesson Updates",
                  },
                  {
                    key: "exam_updates",
                    label: "Exam Preparation Results",
                  },
                  {
                    key: "platform_announcements",
                    label: "Admin Announcements",
                  },
                ] as const
              ).map((item) => (
                <label
                  key={item.key}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-obsidian-950/70 px-3.5 py-2.5 text-xs text-slate-200"
                >
                  <span>{item.label}</span>
                  <input
                    type="checkbox"
                    checked={prefs[item.key]}
                    onChange={() => handleTogglePref(item.key)}
                    className="h-4 w-4 accent-cyan-400"
                  />
                </label>
              ))}
            </div>

            <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3.5 text-[11px] leading-relaxed text-amber-200">
              <strong>Optional Email & Web Push Setup:</strong> In-app
              notifications are active immediately. Outbound Email notifications
              and Browser Push notifications require configuring{" "}
              <code>SMTP_HOST</code> / <code>RESEND_API_KEY</code> and{" "}
              <code>NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> /{" "}
              <code>VAPID_PRIVATE_KEY</code> in production server environment
              variables.
            </div>
          </aside>
        </div>
      </div>
    </DashboardShell>
  );
}
