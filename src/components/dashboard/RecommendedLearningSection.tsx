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
      className="futuristic-hud-panel rounded-3xl border border-white/[0.08] p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-electric-400/30 bg-electric-400/10 text-electric-300">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </div>
          <h2
            id="recommended-learning-heading"
            className="font-display text-base font-bold text-white sm:text-lg"
          >
            Recommended Learning &amp; Subjects
          </h2>
        </div>

        <span className="rounded-full border border-white/10 bg-obsidian-950/75 px-3 py-1 text-[11px] font-semibold text-slate-300">
          {formatCategoryLabel(category)}
        </span>
      </div>

      {goals.length > 0 && (
        <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto pb-0.5 text-xs text-slate-400">
          <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-aura-300">
            <Target className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Goals:</span>
          </span>
          {goals.slice(0, 3).map((goal) => (
            <span
              key={goal}
              className="shrink-0 whitespace-nowrap rounded-full border border-aura-400/25 bg-aura-500/10 px-2.5 py-0.5 text-[11px] text-slate-200"
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
              className="futuristic-tile flex flex-col justify-between rounded-2xl border border-white/[0.08] p-5 transition-colors hover:border-electric-400/45"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-block rounded-full border border-electric-400/30 bg-electric-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-electric-300">
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
        <div className="futuristic-tile mt-5 rounded-2xl border border-white/[0.08] p-5">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-sm font-bold text-white sm:text-base">
                No Published Courses Available Yet
              </h3>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-400">
                Courses tailored to your{" "}
                <strong className="text-slate-200">
                  {formatCategoryLabel(category)}
                </strong>{" "}
                pathway appear here automatically as catalog modules are
                published.
              </p>
            </div>

            <Link
              href="/dashboard/learn"
              className="inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-obsidian-950/80 px-4 py-2 text-xs font-semibold text-electric-300 transition-colors hover:border-electric-400/50 hover:text-white"
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              <span>Learning Library</span>
            </Link>
          </div>
        </div>
      )}

      {personalizedSubjects.length > 0 ? (
        <div className="mt-5 border-t border-white/[0.06] pt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Pathway Subject Directory
            </p>
            <Link
              href="/dashboard/learn"
              className="text-xs font-semibold text-electric-300 hover:underline"
            >
              Browse All Subjects
            </Link>
          </div>
          <div className="no-scrollbar mt-2.5 flex items-center gap-2 overflow-x-auto pb-0.5">
            {personalizedSubjects.map((sub) => (
              <Link
                key={sub.id}
                href={`/dashboard/learn?subject=${encodeURIComponent(sub.slug)}`}
                className="shrink-0 whitespace-nowrap rounded-full border border-white/10 bg-obsidian-950/85 px-3.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-electric-400/45 hover:text-electric-300"
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
