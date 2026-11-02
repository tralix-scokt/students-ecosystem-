"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Sparkles, Target } from "lucide-react";
import { ContentProvenanceBadge } from "@/components/learning/ContentProvenanceBadge";
import { formatCategoryLabel } from "@/data/onboardingOptions";
import { getPersonalizedSubjectsForProfile } from "@/lib/learning/personalization";
import type { PublishedLearningCourse } from "@/types/dashboard";
import type { LearningSubjectRecord } from "@/types/learning";
import type { StudentAcademicProfile } from "@/types/onboarding";

interface RecommendedLearningSectionProps {
  academicProfile: StudentAcademicProfile | null;
  publishedCourses: PublishedLearningCourse[];
  catalogSubjects?: LearningSubjectRecord[];
}

export function RecommendedLearningSection({
  academicProfile,
  publishedCourses,
  catalogSubjects = [],
}: RecommendedLearningSectionProps) {
  const category = academicProfile?.academic_category ?? null;
  const subjects = academicProfile?.selected_subjects ?? [];
  const goals = academicProfile?.learning_goals ?? [];

  const personalizedSubjects =
    catalogSubjects.length > 0
      ? getPersonalizedSubjectsForProfile(catalogSubjects, academicProfile)
          .slice(0, 6)
          .map((m) => m.subject)
      : [];

  // Filter published catalog courses relevant to the student's academic category and selected subjects
  const matchingPublishedCourses = publishedCourses.filter((course) => {
    const categoryMatches =
      !category ||
      course.academic_category === "all" ||
      course.academic_category === category;
    if (!categoryMatches) return false;

    if (subjects.length === 0) return true;
    return subjects.some(
      (sub) =>
        sub.toLowerCase() === course.subject.toLowerCase() ||
        course.title.toLowerCase().includes(sub.toLowerCase())
    );
  });

  const displayedCourses =
    matchingPublishedCourses.length > 0
      ? matchingPublishedCourses.slice(0, 6)
      : publishedCourses
          .filter(
            (c) =>
              !category ||
              c.academic_category === "all" ||
              c.academic_category === category
          )
          .slice(0, 6);

  return (
    <section
      aria-labelledby="recommended-learning-heading"
      className="rounded-2xl border border-white/[0.08] rim-border-card p-6 sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Sparkles
            className="h-5 w-5 text-electric-400"
            aria-hidden="true"
          />
          <h2
            id="recommended-learning-heading"
            className="font-display text-lg font-bold text-white"
          >
            Recommended Learning &amp; Subjects
          </h2>
        </div>

        <span className="rounded-full border border-slate-800 bg-obsidian-950/80 px-3 py-1 text-[11px] font-semibold text-slate-300">
          {formatCategoryLabel(category)}
        </span>
      </div>

      {/* Personalized Context Strip Based on Saved Goals */}
      {goals.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1 font-semibold text-aura-300">
            <Target className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Aligned with your goals:</span>
          </span>
          {goals.slice(0, 3).map((goal) => (
            <span
              key={goal}
              className="rounded-md border border-aura-400/25 bg-aura-500/10 px-2 py-0.5 text-[11px] text-slate-200"
            >
              {goal}
            </span>
          ))}
        </div>
      )}

      {displayedCourses.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayedCourses.map((course) => (
            <article
              key={course.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-obsidian-950/80 p-5 transition-colors hover:border-electric-400/45"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-block rounded-md border border-electric-400/30 bg-electric-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-electric-300">
                    {course.subject}
                  </span>
                  {course.content_classification ? (
                    <ContentProvenanceBadge
                      classification={course.content_classification}
                      compact
                    />
                  ) : null}
                </div>
                <h3 className="mt-2.5 font-display text-base font-bold text-white">
                  {course.title}
                </h3>
                {course.summary && (
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-400">
                    {course.summary}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-2">
                <Link
                  href={`/dashboard/learn/courses/${encodeURIComponent(course.slug)}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-electric-300 hover:text-electric-400"
                >
                  <span>Open Course</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-800 bg-obsidian-950/65 p-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-white">
                No Published Courses Available Yet
              </h3>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-400 sm:text-sm">
                Once learning materials are published to the platform catalog,
                courses and topics tailored to your{" "}
                <strong className="text-slate-200">
                  {formatCategoryLabel(category)}
                </strong>{" "}
                profile will be recommended here automatically.
              </p>
            </div>

            <Link
              href="/dashboard/learn"
              className="inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-xl border border-slate-700 bg-obsidian-900 px-4 py-2 text-xs font-semibold text-electric-300 transition-colors hover:border-electric-400/50 hover:text-white"
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              <span>Learning Library</span>
            </Link>
          </div>

          {subjects.length > 0 && (
            <div className="mt-4 border-t border-white/[0.06] pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Your Prioritized Subject Tracks
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {subjects.map((sub) => (
                  <span
                    key={sub}
                    className="rounded-lg border border-electric-400/30 bg-electric-400/10 px-3 py-1 text-xs font-medium text-electric-200"
                  >
                    {sub}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommended Subjects Directory Strip */}
      {personalizedSubjects.length > 0 ? (
        <div className="mt-5 border-t border-white/[0.06] pt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Recommended Subjects for Your Pathway
            </p>
            <Link
              href="/dashboard/learn"
              className="text-xs font-semibold text-electric-300 hover:underline"
            >
              Browse All Subjects
            </Link>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {personalizedSubjects.map((sub) => (
              <Link
                key={sub.id}
                href={`/dashboard/learn?subject=${encodeURIComponent(sub.slug)}`}
                className="rounded-xl border border-white/10 bg-obsidian-950/85 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-electric-400/45 hover:text-electric-300"
              >
                {sub.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
