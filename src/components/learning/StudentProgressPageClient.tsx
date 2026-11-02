"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bookmark,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Layers,
  PlayCircle,
} from "lucide-react";
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { useStudentDashboardData } from "@/lib/dashboard/useStudentDashboardData";

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0m";
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

export function StudentProgressPageClient() {
  const { status, isRetrying, data, errorMessage, retry } =
    useStudentDashboardData();

  if (status === "loading") {
    return <DashboardSkeleton />;
  }

  if (status === "error" || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian-950 p-4">
        <DashboardErrorState
          message={
            errorMessage || "Unable to load your learning progress right now."
          }
          isRetrying={isRetrying}
          onRetry={retry}
        />
      </div>
    );
  }

  const metrics = data.progressMetrics;
  const allCourses = data.allCourseProgress ?? data.ongoingCourses;
  const recentLessons = data.recentLessons ?? [];
  const completedLessons = recentLessons.filter((l) => l.is_completed);
  const subjectProgress = data.subjectLearningProgress ?? [];
  const bookmarks = data.bookmarkedLessons ?? [];

  return (
    <DashboardShell
      userProfile={data.userProfile}
      academicProfile={data.academicProfile}
      fallbackEmail={data.email}
      unreadNotificationCount={data.unreadNotificationCount}
      publishedCourses={data.publishedCourses}
      ongoingCourses={data.ongoingCourses}
    >
      <div className="space-y-7">
        {/* Header */}
        <section
          aria-labelledby="progress-page-heading"
          className="rounded-3xl border border-white/[0.08] bg-obsidian-900/85 p-6 sm:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-electric-300">
                <BarChart3 className="h-4 w-4" aria-hidden="true" />
                <span>Verified Learning Telemetry</span>
              </div>
              <h1
                id="progress-page-heading"
                className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl"
              >
                My Learning Progress
              </h1>
              <p className="mt-1.5 text-sm text-slate-300">
                Real-time record of your courses, subject mastery, completed
                lesson history, exercise scores, and measured study time.
              </p>
            </div>

            <Link
              href="/dashboard/learn"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-electric-400 to-electric-500 px-4 py-2.5 text-xs font-semibold text-obsidian-950 shadow-cyan-glow"
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              <span>Open Learning Library</span>
            </Link>
          </div>

          {/* Real KPI Grid */}
          <dl className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-2xl border border-white/10 bg-obsidian-950/80 p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Lessons Started
              </dt>
              <dd className="mt-1.5 font-display text-2xl font-bold text-white">
                {metrics.lessonsStarted ?? recentLessons.length}
              </dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-obsidian-950/80 p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Lessons Completed
              </dt>
              <dd className="mt-1.5 font-display text-2xl font-bold text-emerald-300">
                {metrics.lessonsCompleted}
              </dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-obsidian-950/80 p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Courses Active
              </dt>
              <dd className="mt-1.5 font-display text-2xl font-bold text-electric-300">
                {metrics.coursesInProgress}
              </dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-obsidian-950/80 p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Courses Completed
              </dt>
              <dd className="mt-1.5 font-display text-2xl font-bold text-white">
                {metrics.coursesCompleted ?? 0}
              </dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-obsidian-950/80 p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Exercises Attempted
              </dt>
              <dd className="mt-1.5 font-display text-2xl font-bold text-aura-300">
                {metrics.exercisesAttempted ?? metrics.assessmentsCount}
              </dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-obsidian-950/80 p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Time Spent
              </dt>
              <dd className="mt-1.5 font-display text-2xl font-bold text-white">
                {formatDuration(metrics.totalTimeSpentSeconds ?? 0)}
              </dd>
            </div>
          </dl>
        </section>

        {/* Course Progress & Subject Progress */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Course Progress */}
          <section
            aria-labelledby="course-progress-heading"
            className="rounded-2xl border border-white/[0.08] bg-obsidian-900/85 p-6 lg:col-span-7"
          >
            <div className="flex items-center gap-2">
              <Layers
                className="h-4 w-4 text-electric-300"
                aria-hidden="true"
              />
              <h2
                id="course-progress-heading"
                className="font-display text-lg font-bold text-white"
              >
                Course Progress
              </h2>
            </div>

            {allCourses.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-slate-800 bg-obsidian-950/70 p-5 text-xs text-slate-400">
                You have not started any courses yet. Open a published course in
                the Learning Library to track completion progress here.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {allCourses.map((c) => {
                  const pct =
                    c.progress_percent !== null &&
                    c.progress_percent !== undefined
                      ? Math.round(c.progress_percent)
                      : 0;
                  const targetHref = c.last_lesson_slug
                    ? `/dashboard/learn/courses/${c.course_slug}/lessons/${c.last_lesson_slug}`
                    : `/dashboard/learn/courses/${c.course_slug}`;

                  return (
                    <div
                      key={c.id}
                      className="rounded-xl border border-white/10 bg-obsidian-950/85 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-semibold text-electric-300">
                            {c.subject}
                          </span>
                          <h3 className="mt-0.5 text-sm font-bold text-white">
                            {c.course_title}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {c.lessons_completed} of {c.total_lessons} lessons
                            completed
                            {c.total_time_spent_seconds
                              ? ` • ${formatDuration(c.total_time_spent_seconds)}`
                              : ""}
                          </p>
                        </div>

                        <Link
                          href={targetHref}
                          className="inline-flex items-center gap-1 rounded-lg border border-electric-400/40 bg-electric-400/10 px-3 py-1.5 text-xs font-semibold text-electric-300 hover:bg-electric-400/20"
                        >
                          <span>
                            {c.completed_at ? "Review" : "Continue"}
                          </span>
                          <ArrowRight
                            className="h-3 w-3"
                            aria-hidden="true"
                          />
                        </Link>
                      </div>

                      <div className="mt-3">
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>Completion</span>
                          <span className="font-semibold text-electric-300">
                            {pct}%
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-obsidian-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-electric-400 to-aura-400"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Subject Progress */}
          <section
            aria-labelledby="subject-progress-heading"
            className="rounded-2xl border border-white/[0.08] bg-obsidian-900/85 p-6 lg:col-span-5"
          >
            <h2
              id="subject-progress-heading"
              className="font-display text-lg font-bold text-white"
            >
              Subject Progress
            </h2>

            {subjectProgress.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-slate-800 bg-obsidian-950/70 p-5 text-xs text-slate-400">
                Subject-level lesson completion and study time will appear here
                as soon as you start studying a subject.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {subjectProgress.map((sp) => (
                  <div
                    key={sp.subject}
                    className="rounded-xl border border-white/10 bg-obsidian-950/85 p-4"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">
                        {sp.subject}
                      </span>
                      <span className="font-semibold text-electric-300">
                        {sp.progress_percent}%
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {sp.lessons_completed} / {sp.total_lessons} lessons •{" "}
                      {formatDuration(sp.time_spent_seconds)} studied
                    </p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-obsidian-800">
                      <div
                        className="h-full rounded-full bg-electric-400"
                        style={{ width: `${sp.progress_percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Completed Lesson History & Recent Learning Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section
            aria-labelledby="completed-lessons-heading"
            className="rounded-2xl border border-white/[0.08] bg-obsidian-900/85 p-6"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2
                className="h-4 w-4 text-emerald-400"
                aria-hidden="true"
              />
              <h2
                id="completed-lessons-heading"
                className="font-display text-lg font-bold text-white"
              >
                Completed Lesson History
              </h2>
            </div>

            {completedLessons.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-slate-800 bg-obsidian-950/70 p-5 text-xs text-slate-400">
                Lessons you mark as completed will be recorded here with
                timestamps and study durations.
              </p>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {completedLessons.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/dashboard/learn/courses/${item.course_slug}/lessons/${item.lesson_slug}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-obsidian-950/85 p-3.5 hover:border-emerald-400/40"
                    >
                      <div>
                        <p className="text-[11px] font-semibold text-emerald-300">
                          {item.subject} • {item.course_title}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-white">
                          {item.lesson_title}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-slate-400">
                        {formatDuration(item.time_spent_seconds)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            aria-labelledby="recent-activity-heading"
            className="rounded-2xl border border-white/[0.08] bg-obsidian-900/85 p-6"
          >
            <div className="flex items-center gap-2">
              <Clock
                className="h-4 w-4 text-electric-300"
                aria-hidden="true"
              />
              <h2
                id="recent-activity-heading"
                className="font-display text-lg font-bold text-white"
              >
                Recent Learning Activity &amp; Exercises
              </h2>
            </div>

            {recentLessons.length === 0 &&
            metrics.recentAssessments.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-slate-800 bg-obsidian-950/70 p-5 text-xs text-slate-400">
                Your recent lesson visits and exercise scores will appear here
                automatically as you study.
              </p>
            ) : (
              <div className="mt-4 space-y-2.5">
                {recentLessons.slice(0, 5).map((item) => (
                  <Link
                    key={`act-${item.id}`}
                    href={`/dashboard/learn/courses/${item.course_slug}/lessons/${item.lesson_slug}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-obsidian-950/85 p-3.5 hover:border-electric-400/40"
                  >
                    <div className="flex items-center gap-2.5">
                      {item.is_completed ? (
                        <CheckCircle2
                          className="h-4 w-4 shrink-0 text-emerald-400"
                          aria-hidden="true"
                        />
                      ) : (
                        <PlayCircle
                          className="h-4 w-4 shrink-0 text-electric-300"
                          aria-hidden="true"
                        />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {item.lesson_title}
                        </p>
                        <p className="text-xs text-slate-400">
                          {item.course_title} •{" "}
                          {item.is_completed ? "Completed" : "In progress"}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}

                {metrics.recentAssessments.slice(0, 5).map((ass) => (
                  <div
                    key={ass.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-obsidian-950/85 p-3.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <ClipboardCheck
                        className="h-4 w-4 shrink-0 text-aura-300"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {ass.title}
                        </p>
                        <p className="text-xs text-slate-400">{ass.subject}</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-electric-400/35 bg-electric-400/10 px-2.5 py-0.5 text-xs font-bold text-electric-300">
                      {ass.score_percent}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Bookmarked Lessons */}
        {bookmarks.length > 0 ? (
          <section
            aria-labelledby="progress-bookmarks-heading"
            className="rounded-2xl border border-white/[0.08] bg-obsidian-900/85 p-6"
          >
            <div className="flex items-center gap-2">
              <Bookmark
                className="h-4 w-4 text-amber-300"
                aria-hidden="true"
              />
              <h2
                id="progress-bookmarks-heading"
                className="font-display text-lg font-bold text-white"
              >
                Bookmarked Lessons ({bookmarks.length})
              </h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {bookmarks.map((b) => (
                <Link
                  key={b.id}
                  href={`/dashboard/learn/courses/${b.course_slug}/lessons/${b.lesson_slug}`}
                  className="rounded-xl border border-white/10 bg-obsidian-950/85 p-4 hover:border-electric-400/40"
                >
                  <p className="text-[11px] font-semibold text-electric-300">
                    {b.subject} • {b.course_title}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {b.lesson_title}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </DashboardShell>
  );
}
