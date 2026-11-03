"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, Layers } from "lucide-react";
import type {
  AcademicProgressMetrics,
  SubjectLearningProgressItem,
} from "@/types/dashboard";

interface AcademicProgressSectionProps {
  metrics: AcademicProgressMetrics;
  subjectLearningProgress?: SubjectLearningProgressItem[];
}

export function AcademicProgressSection({
  metrics,
  subjectLearningProgress = [],
}: AcademicProgressSectionProps) {
  return (
    <section
      aria-labelledby="academic-progress-heading"
      className="futuristic-hud-panel rounded-3xl border border-white/[0.08] p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-electric-400/30 bg-electric-400/10 text-electric-300">
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="academic-progress-heading"
              className="font-display text-base font-bold text-white sm:text-lg"
            >
              Academic &amp; Learning Progress
            </h2>
            <p className="text-[11px] text-slate-400">
              Live mastery &amp; assessment telemetry
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/progress"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-obsidian-950/70 px-3 py-1.5 text-xs font-semibold text-electric-300 transition-colors hover:border-electric-400/45 hover:text-electric-400"
        >
          <span>Detailed Analytics</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {metrics.hasAnyActivity ? (
        <div className="mt-5 space-y-5">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="futuristic-tile rounded-2xl border border-white/[0.08] p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Lessons Completed
              </dt>
              <dd className="mt-1.5 flex items-center gap-2 font-display text-2xl font-bold text-white">
                <CheckCircle2
                  className="h-5 w-5 text-electric-400"
                  aria-hidden="true"
                />
                <span>{metrics.lessonsCompleted}</span>
              </dd>
            </div>

            <div className="futuristic-tile rounded-2xl border border-white/[0.08] p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Courses in Progress
              </dt>
              <dd className="mt-1.5 flex items-center gap-2 font-display text-2xl font-bold text-white">
                <Layers className="h-5 w-5 text-aura-400" aria-hidden="true" />
                <span>{metrics.coursesInProgress}</span>
              </dd>
            </div>

            <div className="futuristic-tile rounded-2xl border border-white/[0.08] p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Assessment Results
              </dt>
              <dd className="mt-1.5 font-display text-2xl font-bold text-electric-300">
                {metrics.averageAssessmentScore !== null
                  ? `${metrics.averageAssessmentScore}%`
                  : "No scores yet"}
              </dd>
              {metrics.assessmentsCount > 0 && (
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Across {metrics.assessmentsCount} recorded assessment
                  {metrics.assessmentsCount === 1 ? "" : "s"}
                </p>
              )}
            </div>
          </dl>

          {subjectLearningProgress.length > 0 && (
            <div className="futuristic-tile rounded-2xl border border-white/[0.06] p-4 sm:p-5">
              <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">
                Subject Lesson Progress
              </h3>
              <div className="mt-3 space-y-2.5">
                {subjectLearningProgress.map((sp) => (
                  <div key={sp.subject}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-white">
                        {sp.subject}
                      </span>
                      <span className="text-slate-300">
                        {sp.lessons_completed} / {sp.total_lessons} lessons (
                        {sp.progress_percent}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {metrics.subjectPerformance.length > 0 && (
            <div className="futuristic-tile rounded-2xl border border-white/[0.06] p-4 sm:p-5">
              <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">
                Subject Performance
              </h3>
              <div className="mt-4 space-y-3">
                {metrics.subjectPerformance.map((item) => (
                  <div key={item.subject}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-white">
                        {item.subject}
                      </span>
                      <span className="font-semibold text-electric-300">
                        {item.average_score}% ({item.assessments_count}{" "}
                        {item.assessments_count === 1 ? "test" : "tests"})
                      </span>
                    </div>
                    <svg
                      viewBox="0 0 100 6"
                      preserveAspectRatio="none"
                      className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-obsidian-900"
                      role="img"
                      aria-label={`${item.subject} average performance ${item.average_score}%`}
                    >
                      <rect
                        x="0"
                        y="0"
                        width={Math.min(100, Math.max(0, item.average_score))}
                        height="6"
                        rx="3"
                        fill="#00E5FF"
                      />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="futuristic-tile mt-5 rounded-2xl border border-white/[0.08] p-5">
          <p className="font-display text-sm font-bold text-white sm:text-base">
            No Learning Activity Recorded Yet
          </p>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-400">
            Live mastery analytics, completed lesson counts, and subject
            performance charts activate automatically after your first lesson or
            practice test.
          </p>
        </div>
      )}
    </section>
  );
}
