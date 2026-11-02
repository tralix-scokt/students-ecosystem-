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
      className="rounded-2xl border border-white/[0.08] rim-border-card p-6 sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <BarChart3
            className="h-5 w-5 text-electric-400"
            aria-hidden="true"
          />
          <h2
            id="academic-progress-heading"
            className="font-display text-lg font-bold text-white"
          >
            Academic &amp; Learning Progress
          </h2>
        </div>

        <Link
          href="/dashboard/progress"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-electric-300 hover:text-electric-400"
        >
          <span>Detailed Analytics</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {metrics.hasAnyActivity ? (
        <div className="mt-5 space-y-6">
          {/* Real KPI Summary Cards */}
          <dl className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800/90 bg-obsidian-950/80 p-4">
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

            <div className="rounded-2xl border border-slate-800/90 bg-obsidian-950/80 p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Courses in Progress
              </dt>
              <dd className="mt-1.5 flex items-center gap-2 font-display text-2xl font-bold text-white">
                <Layers className="h-5 w-5 text-aura-400" aria-hidden="true" />
                <span>{metrics.coursesInProgress}</span>
              </dd>
            </div>

            <div className="rounded-2xl border border-slate-800/90 bg-obsidian-950/80 p-4">
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

          {/* Subject Course Completion Progress */}
          {subjectLearningProgress.length > 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-obsidian-950/75 p-4 sm:p-5">
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

          {/* Responsive Subject Performance Chart (Rendered ONLY when real assessment data exists) */}
          {metrics.subjectPerformance.length > 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-obsidian-950/75 p-4 sm:p-5">
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
        <div className="mt-5 rounded-2xl border border-dashed border-slate-800 bg-obsidian-950/65 p-6 text-center">
          <p className="font-display text-base font-bold text-white">
            No Learning Activity Recorded Yet
          </p>
          <p className="mx-auto mt-1.5 max-w-lg text-xs leading-relaxed text-slate-400 sm:text-sm">
            Real metrics for lessons completed, courses in progress, assessment
            results, and subject performance charts will appear here as soon as
            you complete your first lesson or assessment.
          </p>
        </div>
      )}
    </section>
  );
}
