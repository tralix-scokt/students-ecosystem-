"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  Clock,
  Compass,
  Filter,
  GraduationCap,
  Layers,
  Loader2,
  RotateCcw,
  Search,
  Sparkles,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ContentProvenanceBadge } from "@/components/learning/ContentProvenanceBadge";
import { formatCategoryLabel } from "@/data/onboardingOptions";
import { fetchLearningLibrary } from "@/lib/learning/learningService";
import {
  filterLibraryCatalog,
  LEARNING_CATEGORY_LABELS,
  type LibraryFilterState,
} from "@/lib/learning/personalization";
import type {
  OngoingCourseItem,
  PublishedLearningCourse,
} from "@/types/dashboard";
import type { LearningLibraryPayload } from "@/types/learning";
import type { AcademicCategory } from "@/types/onboarding";

export function LearningLibraryClient() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<LearningLibraryPayload | null>(null);

  const [filters, setFilters] = useState<LibraryFilterState>(() => ({
    query: searchParams.get("q") ?? "",
    exploreAllSubjects: searchParams.get("explore") === "1",
    academicCategory: "all",
    educationLevel: "",
    curriculumCode: "",
    learningCategory: "",
    subjectSlug: "",
    courseSlug: searchParams.get("course") ?? "",
  }));

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      const res = await fetchLearningLibrary();
      if (!active) return;

      if (res.status === "unauthenticated") {
        routerRef.current.replace(
          "/learning-space?mode=login&next=/dashboard/learn"
        );
        return;
      }
      if (res.status === "needs_onboarding") {
        routerRef.current.replace("/onboarding");
        return;
      }
      if (res.status === "error") {
        setError(res.error);
        setLoading(false);
        return;
      }
      if (res.status === "ready") {
        setPayload(res.payload);
        // Apply ?subject= URL param if present
        const urlSubject = searchParams.get("subject");
        if (urlSubject) {
          const matchedSub = res.payload.subjects.find(
            (s) =>
              s.slug === urlSubject.toLowerCase() ||
              s.name.toLowerCase() === urlSubject.toLowerCase()
          );
          if (matchedSub) {
            setFilters((prev) => ({
              ...prev,
              subjectSlug: matchedSub.slug,
              exploreAllSubjects: true,
            }));
          } else {
            setFilters((prev) => ({ ...prev, query: urlSubject }));
          }
        }
        setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [searchParams]);

  const shellPublishedCourses: PublishedLearningCourse[] = useMemo(() => {
    if (!payload) return [];
    return payload.courses.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      subject: c.subject,
      academic_category: c.academic_category,
      current_topic: c.current_topic,
      summary: c.summary,
      total_lessons: c.total_lessons,
      is_published: c.is_published,
    }));
  }, [payload]);

  const shellOngoingCourses: OngoingCourseItem[] = useMemo(() => {
    if (!payload) return [];
    return Object.values(payload.courseProgressMap)
      .filter((cp) => !cp.completed_at)
      .map((cp) => {
        const course = payload.courses.find((c) => c.id === cp.course_id);
        return {
          id: cp.id,
          course_id: cp.course_id,
          course_slug: course?.slug ?? cp.course_id,
          course_title: course?.title ?? "Course",
          subject: course?.subject ?? "General",
          topic_or_lesson: cp.current_lesson_title,
          last_lesson_slug: cp.last_lesson_slug,
          lessons_completed: cp.lessons_completed,
          total_lessons: cp.total_lessons,
          progress_percent: cp.progress_percent,
          last_accessed_at: cp.last_accessed_at,
        };
      });
  }, [payload]);

  const filtered = useMemo(() => {
    if (!payload) {
      return {
        personalizedMap: new Map(),
        filteredSubjects: [],
        filteredCourses: [],
        matchingLessons: [],
      };
    }
    return filterLibraryCatalog({
      subjects: payload.subjects,
      courses: payload.courses,
      topics: payload.topics,
      lessons: payload.lessons,
      academicProfile: payload.academicProfile,
      filters,
    });
  }, [payload, filters]);

  const resetFilters = () => {
    setFilters((prev) => ({
      query: "",
      exploreAllSubjects: prev.exploreAllSubjects,
      academicCategory: "all",
      educationLevel: "",
      curriculumCode: "",
      learningCategory: "",
      subjectSlug: "",
      courseSlug: "",
    }));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian-950 text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            className="h-8 w-8 animate-spin text-electric-400"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-slate-300">
            Loading your personalized learning library...
          </p>
        </div>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian-950 px-4 text-slate-200">
        <div className="max-w-md rounded-2xl border border-white/10 bg-obsidian-900 p-6 text-center">
          <p className="text-base font-semibold text-white">
            Unable to open the Learning Library
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {error ?? "Please check your connection and try again."}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-electric-400 px-4 py-2 text-xs font-semibold text-obsidian-950"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  const profileCategory = payload.academicProfile?.academic_category ?? null;
  const visibleLevels = payload.educationLevels.filter(
    (lvl) =>
      filters.academicCategory === "all" ||
      lvl.academic_category === filters.academicCategory
  );

  return (
    <DashboardShell
      userProfile={payload.userProfile}
      academicProfile={payload.academicProfile}
      fallbackEmail={payload.email}
      unreadNotificationCount={payload.unreadNotificationCount}
      publishedCourses={shellPublishedCourses}
      ongoingCourses={shellOngoingCourses}
    >
      <div className="space-y-7">
        {/* =================================================================
            1. LIBRARY HERO HEADER + PERSONALIZED VS EXPLORE MODE TOGGLE
           ================================================================= */}
        <section
          aria-labelledby="learning-library-heading"
          className="rounded-3xl border border-white/[0.08] bg-obsidian-900/85 p-6 shadow-card-elevated sm:p-8"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-electric-400/30 bg-electric-400/10 px-3 py-1 text-xs font-semibold text-electric-300">
                <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {filters.exploreAllSubjects
                    ? "Full Academic Catalog Exploration"
                    : `Personalized for ${formatCategoryLabel(profileCategory)}${
                        payload.academicProfile?.academic_level
                          ? ` • ${payload.academicProfile.academic_level}`
                          : ""
                      }`}
                </span>
              </div>

              <h1
                id="learning-library-heading"
                className="mt-3 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl"
              >
                Explore Your Learning Space
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">
                Discover subjects, strengthen your understanding and move closer
                to your academic goals.
              </p>
            </div>

            <div className="flex flex-col items-start gap-2 sm:items-end">
              <button
                type="button"
                aria-pressed={filters.exploreAllSubjects}
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    exploreAllSubjects: !prev.exploreAllSubjects,
                  }))
                }
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors ${
                  filters.exploreAllSubjects
                    ? "border-electric-400/50 bg-electric-400/15 text-electric-300"
                    : "border-white/15 bg-obsidian-950/90 text-slate-200 hover:border-electric-400/40 hover:text-white"
                }`}
              >
                <Compass className="h-4 w-4" aria-hidden="true" />
                <span>
                  {filters.exploreAllSubjects
                    ? "Return to My Personalized Subjects"
                    : "Explore Other Available Subjects"}
                </span>
              </button>
              <p className="text-[11px] text-slate-400">
                Exploring other subjects will not change your saved academic
                profile.
              </p>
            </div>
          </div>

          {/* A. Multi-Entity Search (Subjects, Courses, Topics, Lessons) */}
          <div className="mt-6">
            <label htmlFor="library-search-input" className="sr-only">
              Search subjects, courses, topics, and lessons
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="library-search-input"
                type="search"
                value={filters.query}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, query: e.target.value }))
                }
                placeholder="Search subjects, courses, topics, or lessons (e.g. Vectors, Big-O, Ohm's Law)..."
                className="w-full rounded-2xl border border-white/15 bg-obsidian-950/90 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-electric-400 focus:outline-none"
              />
            </div>
          </div>

          {/* B. Structured Academic Filters */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label
                htmlFor="filter-academic-category"
                className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
              >
                Academic Category
              </label>
              <select
                id="filter-academic-category"
                value={filters.academicCategory}
                onChange={(e) => {
                  const val = e.target.value as AcademicCategory | "all";
                  setFilters((prev) => ({
                    ...prev,
                    academicCategory: val,
                    educationLevel: "",
                    exploreAllSubjects:
                      val !== "all" && val !== profileCategory
                        ? true
                        : prev.exploreAllSubjects,
                  }));
                }}
                className="w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-slate-200 focus:border-electric-400 focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="secondary">Secondary School</option>
                <option value="university">University</option>
                <option value="polytechnic">Polytechnic / Technical</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="filter-education-level"
                className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
              >
                Education Level
              </label>
              <select
                id="filter-education-level"
                value={filters.educationLevel}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    educationLevel: e.target.value,
                    exploreAllSubjects: e.target.value
                      ? true
                      : prev.exploreAllSubjects,
                  }))
                }
                className="w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-slate-200 focus:border-electric-400 focus:outline-none"
              >
                <option value="">All Levels</option>
                {visibleLevels.map((lvl) => (
                  <option key={lvl.id} value={lvl.code}>
                    {lvl.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="filter-curriculum"
                className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
              >
                Curriculum
              </label>
              <select
                id="filter-curriculum"
                value={filters.curriculumCode}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    curriculumCode: e.target.value,
                    exploreAllSubjects: e.target.value
                      ? true
                      : prev.exploreAllSubjects,
                  }))
                }
                className="w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-slate-200 focus:border-electric-400 focus:outline-none"
              >
                <option value="">All Curricula</option>
                {payload.curricula.map((cur) => (
                  <option key={cur.id} value={cur.code}>
                    {cur.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="filter-subject"
                className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
              >
                Subject
              </label>
              <select
                id="filter-subject"
                value={filters.subjectSlug}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    subjectSlug: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-slate-200 focus:border-electric-400 focus:outline-none"
              >
                <option value="">All Visible Subjects</option>
                {payload.subjects.map((sub) => (
                  <option key={sub.id} value={sub.slug}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="filter-course"
                className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
              >
                Course
              </label>
              <select
                id="filter-course"
                value={filters.courseSlug}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    courseSlug: e.target.value,
                    exploreAllSubjects: e.target.value
                      ? true
                      : prev.exploreAllSubjects,
                  }))
                }
                className="w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-slate-200 focus:border-electric-400 focus:outline-none"
              >
                <option value="">All Published Courses</option>
                {(filters.exploreAllSubjects
                  ? payload.courses
                  : filtered.filteredCourses
                ).map((course) => (
                  <option key={course.id} value={course.slug}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* C. Learning Categories Pills */}
          <div className="mt-5 border-t border-white/[0.06] pt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Filter className="h-3.5 w-3.5 text-electric-300" aria-hidden="true" />
                <span>Learning Categories</span>
              </span>
              {(filters.query ||
                filters.academicCategory !== "all" ||
                filters.educationLevel ||
                filters.curriculumCode ||
                filters.learningCategory ||
                filters.subjectSlug ||
                filters.courseSlug) ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-medium text-electric-300 hover:underline"
                >
                  Clear active filters
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setFilters((prev) => ({ ...prev, learningCategory: "" }))
                }
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  !filters.learningCategory
                    ? "border-electric-400/50 bg-electric-400/15 text-electric-300"
                    : "border-white/10 bg-obsidian-950/75 text-slate-300 hover:border-white/20"
                }`}
              >
                All Categories
              </button>
              {LEARNING_CATEGORY_LABELS.map((cat) => {
                const active = filters.learningCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        learningCategory: active ? "" : cat,
                        exploreAllSubjects: active
                          ? prev.exploreAllSubjects
                          : true,
                      }))
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "border-electric-400/50 bg-electric-400/15 text-electric-300"
                        : "border-white/10 bg-obsidian-950/75 text-slate-300 hover:border-white/20"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* =================================================================
            DIRECT LESSON MATCHES WHEN SEARCHING
           ================================================================= */}
        {filters.query.trim().length > 0 &&
        filtered.matchingLessons.length > 0 ? (
          <section
            aria-labelledby="matching-lessons-heading"
            className="rounded-2xl border border-white/[0.08] bg-obsidian-900/80 p-5"
          >
            <h2
              id="matching-lessons-heading"
              className="font-display text-base font-bold text-white"
            >
              Matching Lessons &amp; Topics ({filtered.matchingLessons.length})
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {filtered.matchingLessons.map((lesson) => {
                const prog = payload.lessonProgressMap[lesson.id];
                return (
                  <Link
                    key={lesson.id}
                    href={`/dashboard/learn/courses/${lesson.course_slug}/lessons/${lesson.slug}`}
                    className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-obsidian-950/80 p-3.5 transition-colors hover:border-electric-400/40"
                  >
                    <div>
                      <p className="text-xs font-semibold text-electric-300">
                        {lesson.subject} • {lesson.topic_title}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-white">
                        {lesson.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Course: {lesson.course_title}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] text-slate-300">
                      {prog?.is_completed
                        ? "Completed"
                        : prog
                          ? "In progress"
                          : "Lesson"}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* =================================================================
            2. PUBLISHED COURSES SECTION
           ================================================================= */}
        <section aria-labelledby="published-courses-heading">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2
                id="published-courses-heading"
                className="font-display text-xl font-bold text-white"
              >
                Published Structured Courses
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Approved courses with structured topics, distraction-free
                lessons, and practice exercises.
              </p>
            </div>
            <span className="text-xs font-medium text-slate-400">
              {filtered.filteredCourses.length} published{" "}
              {filtered.filteredCourses.length === 1 ? "course" : "courses"}
            </span>
          </div>

          {filtered.filteredCourses.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-obsidian-900/75 p-6 text-center">
              <BookOpen
                className="mx-auto h-7 w-7 text-slate-400"
                aria-hidden="true"
              />
              <p className="mt-2.5 text-sm font-semibold text-white">
                No published courses match the current view yet
              </p>
              <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed text-slate-400">
                Structured learning materials for additional subjects and levels
                are currently being prepared and reviewed for publication. You
                can explore other available subjects at any time.
              </p>
              {!filters.exploreAllSubjects ? (
                <button
                  type="button"
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      exploreAllSubjects: true,
                    }))
                  }
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-electric-400/40 bg-electric-400/10 px-4 py-2 text-xs font-semibold text-electric-300 hover:bg-electric-400/20"
                >
                  <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Explore All Published Courses</span>
                </button>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.filteredCourses.map((course) => {
                const progress = payload.courseProgressMap[course.id] ?? null;
                const hasStarted = Boolean(
                  progress &&
                    (progress.lessons_started > 0 ||
                      progress.lessons_completed > 0)
                );
                const pct =
                  progress?.progress_percent !== null &&
                  progress?.progress_percent !== undefined
                    ? Math.round(progress.progress_percent)
                    : null;

                return (
                  <article
                    key={course.id}
                    className="flex flex-col justify-between rounded-2xl border border-white/[0.09] bg-obsidian-900/85 p-5 shadow-card-elevated transition-colors hover:border-electric-400/35"
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-full border border-electric-400/30 bg-electric-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-electric-300">
                          {course.subject}
                        </span>
                        <ContentProvenanceBadge
                          provenance={course.provenance}
                          compact
                        />
                      </div>

                      <h3 className="mt-3 font-display text-lg font-bold text-white">
                        {course.title}
                      </h3>

                      <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                        {course.summary || course.description}
                      </p>

                      {/* Honest Metadata Badges — Never Invented */}
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-obsidian-950/80 px-2 py-0.5">
                          <Layers className="h-3 w-3 text-slate-400" aria-hidden="true" />
                          <span>
                            {course.total_lessons}{" "}
                            {course.total_lessons === 1 ? "lesson" : "lessons"}
                          </span>
                        </span>

                        {course.education_level ? (
                          <span className="rounded-md border border-white/10 bg-obsidian-950/80 px-2 py-0.5">
                            Level: {course.education_level}
                          </span>
                        ) : null}

                        {course.difficulty ? (
                          <span className="rounded-md border border-white/10 bg-obsidian-950/80 px-2 py-0.5 capitalize">
                            {course.difficulty}
                          </span>
                        ) : null}

                        {course.estimated_duration_minutes ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-obsidian-950/80 px-2 py-0.5">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            <span>{course.estimated_duration_minutes} mins</span>
                          </span>
                        ) : null}
                      </div>

                      {course.instructor_name ? (
                        <p className="mt-2.5 text-[11px] text-slate-400">
                          Author / Source: {course.instructor_name}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-5 border-t border-white/[0.07] pt-4">
                      {hasStarted && progress ? (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">
                              {progress.lessons_completed} of{" "}
                              {course.total_lessons} lessons completed
                            </span>
                            {pct !== null ? (
                              <span className="font-semibold text-electric-300">
                                {pct}%
                              </span>
                            ) : null}
                          </div>
                          {pct !== null ? (
                            <div
                              role="progressbar"
                              aria-label={`${course.title} completion`}
                              aria-valuenow={pct}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-obsidian-950"
                            >
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-electric-400 to-aura-400"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mb-3 text-xs text-slate-400">
                          Not started yet • Ready to begin
                        </p>
                      )}

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/learn/courses/${course.slug}`}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-electric-400 to-electric-500 px-4 py-2.5 text-xs font-semibold text-obsidian-950 transition-opacity hover:opacity-95"
                        >
                          <span>
                            {hasStarted ? "Continue Course" : "Open Course"}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* =================================================================
            3. PERSONALIZED SUBJECTS DIRECTORY (WITH HONEST PREPARATION STATES)
           ================================================================= */}
        <section aria-labelledby="subjects-directory-heading">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2
                id="subjects-directory-heading"
                className="font-display text-xl font-bold text-white"
              >
                {filters.exploreAllSubjects
                  ? "All Academic Subjects"
                  : "Subjects Personalized for Your Pathway"}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Subjects matched to your saved education category, level, and
                curriculum. Subjects without published courses yet state their
                preparation status honestly.
              </p>
            </div>
            <span className="text-xs font-medium text-slate-400">
              {filtered.filteredSubjects.length}{" "}
              {filtered.filteredSubjects.length === 1 ? "subject" : "subjects"}
            </span>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.filteredSubjects.map((subject) => {
              const subjectCourses = payload.courses.filter(
                (c) =>
                  c.is_published &&
                  (filters.exploreAllSubjects ||
                    !profileCategory ||
                    c.academic_category === "all" ||
                    c.academic_category === profileCategory) &&
                  (c.subject_id === subject.id ||
                    c.subject.toLowerCase() === subject.name.toLowerCase())
              );
              const matchInfo = filtered.personalizedMap.get(subject.id);

              return (
                <div
                  key={subject.id}
                  className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-obsidian-900/75 p-5"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        {subject.learning_category}
                      </span>
                      {matchInfo?.isEnrolledSubject ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-200">
                          <Sparkles className="h-3 w-3" aria-hidden="true" />
                          <span>Enrolled Subject</span>
                        </span>
                      ) : subject.waec_neco_relevant &&
                        profileCategory === "secondary" ? (
                        <span className="rounded-full border border-aura-400/30 bg-aura-500/10 px-2.5 py-0.5 text-[11px] font-medium text-aura-300">
                          WAEC / NECO Relevant
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-2 font-display text-base font-bold text-white">
                      {subject.name}
                    </h3>

                    {subject.description ? (
                      <p className="mt-1 text-xs leading-relaxed text-slate-300">
                        {subject.description}
                      </p>
                    ) : null}

                    {matchInfo ? (
                      <p className="mt-2 text-[11px] text-slate-400">
                        {matchInfo.relevanceReason}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 border-t border-white/[0.06] pt-3">
                    {subjectCourses.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-emerald-300">
                          {subjectCourses.length} published{" "}
                          {subjectCourses.length === 1 ? "course" : "courses"}{" "}
                          available
                        </p>
                        {subjectCourses.map((c) => (
                          <Link
                            key={c.id}
                            href={`/dashboard/learn/courses/${c.slug}`}
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-obsidian-950/85 px-3 py-2 text-xs font-medium text-white transition-colors hover:border-electric-400/45 hover:text-electric-300"
                          >
                            <span className="truncate pr-2">{c.title}</span>
                            <ArrowRight
                              className="h-3.5 w-3.5 shrink-0"
                              aria-hidden="true"
                            />
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-xl border border-white/[0.06] bg-obsidian-950/60 px-3 py-2 text-xs text-slate-400">
                        Learning materials for {subject.name} are being prepared
                        for publication.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* =================================================================
            4. SAVED LESSON BOOKMARKS QUICK ACCESS
           ================================================================= */}
        {payload.bookmarks.length > 0 ? (
          <section
            aria-labelledby="library-bookmarks-heading"
            className="rounded-2xl border border-white/[0.08] bg-obsidian-900/80 p-5"
          >
            <div className="flex items-center gap-2">
              <Bookmark
                className="h-4 w-4 text-electric-300"
                aria-hidden="true"
              />
              <h2
                id="library-bookmarks-heading"
                className="font-display text-base font-bold text-white"
              >
                Your Bookmarked Lessons ({payload.bookmarks.length})
              </h2>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {payload.bookmarks.map((bm) => {
                const lesson = payload.lessons.find(
                  (l) => l.id === bm.lesson_id
                );
                if (!lesson) return null;
                return (
                  <Link
                    key={bm.id}
                    href={`/dashboard/learn/courses/${lesson.course_slug}/lessons/${lesson.slug}`}
                    className="rounded-xl border border-white/10 bg-obsidian-950/85 p-3.5 transition-colors hover:border-electric-400/40"
                  >
                    <p className="text-[11px] font-semibold text-electric-300">
                      {lesson.subject} • {lesson.course_title}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {lesson.title}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </DashboardShell>
  );
}
