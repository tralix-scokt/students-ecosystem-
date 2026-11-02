"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  PlayCircle,
} from "lucide-react";
import type {
  OngoingCourseItem,
  RecentLessonActivityItem,
} from "@/types/dashboard";

interface ContinueLearningSectionProps {
  ongoingCourses: OngoingCourseItem[];
  recentLessons?: RecentLessonActivityItem[];
}

export function ContinueLearningSection({
  ongoingCourses,
  recentLessons = [],
}: ContinueLearningSectionProps) {
  return (
    <section
      aria-labelledby="continue-learning-heading"
      className="rounded-2xl border border-white/[0.08] rim-border-card p-6 sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <PlayCircle
            className="h-5 w-5 text-electric-400"
            aria-hidden="true"
          />
          <h2
            id="continue-learning-heading"
            className="font-display text-lg font-bold text-white"
          >
            Continue Learning
          </h2>
        </div>

        <Link
          href="/dashboard/learn"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-electric-300 transition-colors hover:text-electric-400"
        >
          <span>View Learning Library</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {ongoingCourses.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {ongoingCourses.map((course) => {
            const pct = course.progress_percent;
            const resumeHref = course.last_lesson_slug
              ? `/dashboard/learn/courses/${encodeURIComponent(
                  course.course_slug
                )}/lessons/${encodeURIComponent(course.last_lesson_slug)}`
              : `/dashboard/learn/courses/${encodeURIComponent(
                  course.course_slug
                )}`;

            return (
              <article
                key={course.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-obsidian-950/80 p-5 transition-colors hover:border-electric-400/45"
              >
                <div>
                  <span className="inline-block rounded-md border border-electric-400/30 bg-electric-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-electric-300">
                    {course.subject}
                  </span>
                  <h3 className="mt-2.5 font-display text-base font-bold text-white">
                    {course.course_title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    {course.topic_or_lesson
                      ? `Last lesson: ${course.topic_or_lesson}`
                      : "Ready to resume"}
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  {pct !== null && (
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                          {course.lessons_completed} / {course.total_lessons}{" "}
                          lessons
                        </span>
                        <span className="font-semibold text-electric-300">
                          {Math.round(pct)}%
                        </span>
                      </div>
                      <div
                        className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-obsidian-900"
                        role="progressbar"
                        aria-valuenow={Math.round(pct)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${course.course_title} progress`}
                      >
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-electric-400 to-aura-500"
                          style={{ width: `${Math.round(pct)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <Link
                    href={resumeHref}
                    className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-electric-400/60 bg-electric-400/12 px-4 py-2 text-xs font-bold text-electric-300 transition-colors hover:bg-electric-400 hover:text-obsidian-950"
                  >
                    <span>Continue Learning</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-800 bg-obsidian-950/65 p-6 text-center sm:p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-electric-400/35 bg-electric-400/10 text-electric-300">
            <Compass className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-4 font-display text-base font-bold text-white">
            No Ongoing Courses Yet
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-400 sm:text-sm">
            You haven&apos;t started any courses yet. Explore learning materials
            aligned with your academic profile to begin tracking real lesson
            progress here.
          </p>
          <div className="mt-5">
            <Link
              href="/dashboard/learn"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-electric-400/65 bg-gradient-to-r from-electric-400 via-electric-500 to-aura-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-obsidian-950 shadow-cyan-glow transition-all hover:brightness-110"
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              <span>Explore Learning Materials</span>
            </Link>
          </div>
        </div>
      )}

      {/* Recent Lessons Quick Strip */}
      {recentLessons.length > 0 ? (
        <div className="mt-5 border-t border-white/[0.06] pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Recent Lessons
          </h3>
          <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {recentLessons.slice(0, 3).map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/learn/courses/${encodeURIComponent(
                  item.course_slug
                )}/lessons/${encodeURIComponent(item.lesson_slug)}`}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-obsidian-950/75 px-3.5 py-2.5 text-xs transition-colors hover:border-electric-400/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">
                    {item.lesson_title}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">
                    {item.subject} • {item.course_title}
                  </p>
                </div>
                {item.is_completed ? (
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-emerald-400"
                    aria-label="Completed"
                  />
                ) : (
                  <ArrowRight
                    className="h-3.5 w-3.5 shrink-0 text-electric-300"
                    aria-hidden="true"
                  />
                )}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
