"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Clock,
  Crown,
  Layers,
  Loader2,
  PlayCircle,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ContentProvenanceBadge } from "@/components/learning/ContentProvenanceBadge";
import { formatCategoryLabel } from "@/data/onboardingOptions";
import { useStudentSubscription } from "@/lib/billing/billingService";
import { fetchCourseDetail } from "@/lib/learning/learningService";
import type {
  OngoingCourseItem,
  PublishedLearningCourse,
} from "@/types/dashboard";
import type { CourseDetailPayload } from "@/types/learning";

interface CourseDetailClientProps {
  courseSlug: string;
}

export function CourseDetailClient({ courseSlug }: CourseDetailClientProps) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<CourseDetailPayload | null>(null);
  const { billing } = useStudentSubscription();

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      setNotFound(false);
      const res = await fetchCourseDetail(courseSlug);
      if (!active) return;

      if (res.status === "unauthenticated") {
        routerRef.current.replace(
          `/learning-space?mode=login&next=/dashboard/learn/courses/${encodeURIComponent(
            courseSlug
          )}`
        );
        return;
      }
      if (res.status === "needs_onboarding") {
        routerRef.current.replace("/onboarding");
        return;
      }
      if (res.status === "not_found") {
        setNotFound(true);
        setLoading(false);
        return;
      }
      if (res.status === "error") {
        setError(res.error);
        setLoading(false);
        return;
      }
      if (res.status === "ready") {
        setPayload(res.payload);
        setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [courseSlug]);

  const shellPublishedCourses: PublishedLearningCourse[] = useMemo(() => {
    if (!payload) return [];
    const c = payload.course;
    return [
      {
        id: c.id,
        slug: c.slug,
        title: c.title,
        subject: c.subject,
        academic_category: c.academic_category,
        current_topic: c.current_topic,
        summary: c.summary,
        total_lessons: c.total_lessons,
        is_published: c.is_published,
      },
    ];
  }, [payload]);

  const shellOngoingCourses: OngoingCourseItem[] = useMemo(() => {
    if (!payload?.courseProgress || payload.courseProgress.completed_at) {
      return [];
    }
    const cp = payload.courseProgress;
    return [
      {
        id: cp.id,
        course_id: cp.course_id,
        course_slug: payload.course.slug,
        course_title: payload.course.title,
        subject: payload.course.subject,
        topic_or_lesson: cp.current_lesson_title,
        last_lesson_slug: cp.last_lesson_slug,
        lessons_completed: cp.lessons_completed,
        total_lessons: cp.total_lessons,
        progress_percent: cp.progress_percent,
        last_accessed_at: cp.last_accessed_at,
      },
    ];
  }, [payload]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian-950 text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            className="h-8 w-8 animate-spin text-electric-400"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-slate-300">
            Loading course structure and your progress...
          </p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian-950 px-4 text-slate-200">
        <div className="max-w-md rounded-2xl border border-white/10 bg-obsidian-900 p-6 text-center">
          <BookOpen
            className="mx-auto h-8 w-8 text-slate-400"
            aria-hidden="true"
          />
          <h1 className="mt-3 font-display text-lg font-bold text-white">
            Course Not Found or Unpublished
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
            This course is either unavailable or still undergoing academic
            review prior to publication.
          </p>
          <Link
            href="/dashboard/learn"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-electric-400 px-4 py-2 text-xs font-semibold text-obsidian-950"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to Learning Library</span>
          </Link>
        </div>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian-950 px-4 text-slate-200">
        <div className="max-w-md rounded-2xl border border-white/10 bg-obsidian-900 p-6 text-center">
          <p className="text-base font-semibold text-white">
            Unable to load course details
          </p>
          <p className="mt-2 text-sm text-slate-400">{error}</p>
          <Link
            href="/dashboard/learn"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-electric-400 px-4 py-2 text-xs font-semibold text-obsidian-950"
          >
            <span>Return to Learning Library</span>
          </Link>
        </div>
      </div>
    );
  }

  const {
    course,
    topics,
    exercisesCount,
    courseProgress,
    lessonProgressMap,
    bookmarkedLessonIds,
    continueLessonSlug,
  } = payload;

  const completedCount = Object.values(lessonProgressMap).filter(
    (lp) => lp.is_completed
  ).length;
  const startedCount = Object.keys(lessonProgressMap).length;
  const totalLessons = course.total_lessons;
  const realPercent =
    courseProgress?.progress_percent !== null &&
    courseProgress?.progress_percent !== undefined
      ? Math.round(courseProgress.progress_percent)
      : startedCount > 0 && totalLessons > 0
        ? Math.round((completedCount / totalLessons) * 100)
        : null;

  const studyMinutes = courseProgress?.total_time_spent_seconds
    ? Math.max(1, Math.round(courseProgress.total_time_spent_seconds / 60))
    : 0;

  return (
    <DashboardShell
      userProfile={payload.userProfile}
      academicProfile={payload.academicProfile}
      fallbackEmail={payload.email}
      unreadNotificationCount={payload.unreadNotificationCount}
      publishedCourses={shellPublishedCourses}
      ongoingCourses={shellOngoingCourses}
    >
      <div className="space-y-6">
        {/* Back Breadcrumb */}
        <nav aria-label="Course hierarchy" className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <Link
            href="/dashboard/learn"
            className="inline-flex items-center gap-1 font-medium text-electric-300 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Learning Library</span>
          </Link>
          <span aria-hidden="true">/</span>
          <span>
            {course.academic_category === "all"
              ? "All Categories"
              : formatCategoryLabel(course.academic_category)}
          </span>
          {course.education_level ? (
            <>
              <span aria-hidden="true">/</span>
              <span>{course.education_level}</span>
            </>
          ) : null}
          <span aria-hidden="true">/</span>
          <span className="text-slate-200">{course.subject}</span>
        </nav>

        {/* =================================================================
            1. COURSE INTRODUCTION + 6. OVERALL PROGRESS + 7. CONTINUE BUTTON
           ================================================================= */}
        <section
          aria-labelledby="course-title-heading"
          className="rounded-3xl border border-white/[0.08] bg-obsidian-900/85 p-6 shadow-card-elevated sm:p-8"
        >
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-electric-400/35 bg-electric-400/10 px-3 py-1 text-xs font-semibold text-electric-300">
                  {course.subject}
                </span>
                {course.curriculum ? (
                  <span className="rounded-full border border-white/10 bg-obsidian-950/80 px-3 py-1 text-xs text-slate-300">
                    {course.curriculum}
                  </span>
                ) : null}
              </div>

              <h1
                id="course-title-heading"
                className="mt-3 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl"
              >
                {course.title}
              </h1>

              <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
                {course.description || course.summary}
              </p>

              {/* Honest Metadata Row */}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-obsidian-950/80 px-3 py-1.5">
                  <Layers className="h-3.5 w-3.5 text-electric-300" aria-hidden="true" />
                  <span>
                    {topics.length} {topics.length === 1 ? "topic" : "topics"} •{" "}
                    {totalLessons} {totalLessons === 1 ? "lesson" : "lessons"}
                  </span>
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-obsidian-950/80 px-3 py-1.5">
                  <ClipboardCheck
                    className="h-3.5 w-3.5 text-electric-300"
                    aria-hidden="true"
                  />
                  <span>
                    {exercisesCount}{" "}
                    {exercisesCount === 1 ? "exercise" : "exercises"}
                  </span>
                </span>

                {course.difficulty ? (
                  <span className="rounded-lg border border-white/10 bg-obsidian-950/80 px-3 py-1.5 capitalize">
                    Difficulty: {course.difficulty}
                  </span>
                ) : null}

                {course.estimated_duration_minutes ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-obsidian-950/80 px-3 py-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    <span>
                      Estimated {course.estimated_duration_minutes} mins
                    </span>
                  </span>
                ) : null}
              </div>

              {course.instructor_name ? (
                <p className="mt-3 text-xs text-slate-400">
                  Author / Publisher:{" "}
                  <span className="font-medium text-slate-200">
                    {course.instructor_name}
                  </span>
                </p>
              ) : null}

              {/* Content Quality & Verification Badge */}
              <div className="mt-4">
                <ContentProvenanceBadge
                  provenance={course.provenance}
                  showDetailsToggle
                />
              </div>
            </div>

            {/* 6. Overall Course Progress & 7. Continue Learning Action Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-obsidian-950/90 p-5 lg:col-span-4">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Overall Course Progress
                </h2>

                {startedCount > 0 ? (
                  <div className="mt-3">
                    <div className="flex items-baseline justify-between">
                      <span className="font-display text-3xl font-bold text-white">
                        {realPercent ?? 0}%
                      </span>
                      <span className="text-xs text-slate-300">
                        {completedCount} / {totalLessons} lessons completed
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label="Overall course progress"
                      aria-valuenow={realPercent ?? 0}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-obsidian-800"
                    >
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-electric-400 to-aura-400"
                        style={{ width: `${realPercent ?? 0}%` }}
                      />
                    </div>
                    {studyMinutes > 0 ? (
                      <p className="mt-2.5 text-xs text-slate-400">
                        Measured time spent: {studyMinutes}{" "}
                        {studyMinutes === 1 ? "minute" : "minutes"}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-white">
                      Not started yet
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      Open the first lesson below to begin tracking your lesson
                      completions and exercise mastery.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-5 border-t border-white/10 pt-4">
                {continueLessonSlug ? (
                  <Link
                    href={`/dashboard/learn/courses/${course.slug}/lessons/${continueLessonSlug}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-electric-400 to-electric-500 px-4 py-3 text-sm font-semibold text-obsidian-950 shadow-cyan-glow transition-opacity hover:opacity-95"
                  >
                    <span>
                      {startedCount > 0
                        ? "Continue Learning"
                        : "Start First Lesson"}
                    </span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <p className="text-center text-xs text-slate-400">
                    Lessons for this course are currently being prepared.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            2. WHAT STUDENTS WILL LEARN
           ================================================================= */}
        {course.learning_objectives.length > 0 ? (
          <section
            aria-labelledby="course-objectives-heading"
            className="rounded-2xl border border-white/[0.08] bg-obsidian-900/80 p-6"
          >
            <h2
              id="course-objectives-heading"
              className="font-display text-lg font-bold text-white"
            >
              What You Will Learn
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {course.learning_objectives.map((objective) => (
                <li
                  key={objective}
                  className="flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-obsidian-950/70 p-3.5 text-sm text-slate-200"
                >
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                    aria-hidden="true"
                  />
                  <span>{objective}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* =================================================================
            3. COURSE CONTENT, 4. TOPIC LIST & 5. LESSON COMPLETION INDICATORS
           ================================================================= */}
        <section
          aria-labelledby="course-content-heading"
          className="space-y-4"
        >
          <div>
            <h2
              id="course-content-heading"
              className="font-display text-xl font-bold text-white"
            >
              Course Content &amp; Topics
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Select any lesson to open the distraction-free lesson reader and
              practice exercises.
            </p>
          </div>

          {topics.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-obsidian-900/75 p-6 text-center text-sm text-slate-400">
              Topics and lessons for this course are currently being prepared
              for publication.
            </div>
          ) : (
            <div className="space-y-4">
              {topics.map((topic, tIdx) => (
                <div
                  key={topic.id}
                  className="overflow-hidden rounded-2xl border border-white/[0.09] bg-obsidian-900/85"
                >
                  <div className="border-b border-white/[0.07] bg-obsidian-950/60 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-electric-300">
                      Topic {tIdx + 1}
                    </p>
                    <h3 className="mt-0.5 font-display text-base font-bold text-white sm:text-lg">
                      {topic.title}
                    </h3>
                    {topic.description ? (
                      <p className="mt-1 text-xs text-slate-400">
                        {topic.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="divide-y divide-white/[0.06]">
                    {topic.lessons.map((lesson, lIdx) => {
                      const lp = lessonProgressMap[lesson.id];
                      const isCompleted = Boolean(lp?.is_completed);
                      const isStarted = Boolean(lp);
                      const isBookmarked = bookmarkedLessonIds.includes(
                        lesson.id
                      );

                      return (
                        <div
                          key={lesson.id}
                          className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 shrink-0">
                              {isCompleted ? (
                                <CheckCircle2
                                  className="h-5 w-5 text-emerald-400"
                                  aria-label="Lesson completed"
                                />
                              ) : isStarted ? (
                                <PlayCircle
                                  className="h-5 w-5 text-electric-300"
                                  aria-label="Lesson in progress"
                                />
                              ) : (
                                <Circle
                                  className="h-5 w-5 text-slate-500"
                                  aria-label="Lesson not started"
                                />
                              )}
                            </span>

                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-medium text-slate-400">
                                  Lesson {tIdx + 1}.{lIdx + 1}
                                </span>
                                {tIdx === 0 && lIdx === 0 ? (
                                  <span className="inline-flex items-center rounded-full border border-emerald-400/35 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                                    Free Preview
                                  </span>
                                ) : !billing.isPro &&
                                  billing.settings.paywallEnabled &&
                                  payload.userProfile?.role !== "admin" ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/35 bg-amber-500/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                                    <Crown
                                      className="h-2.5 w-2.5 text-amber-300"
                                      aria-hidden="true"
                                    />
                                    TRALIX Pro
                                  </span>
                                ) : null}
                                {isBookmarked ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300">
                                    <Bookmark
                                      className="h-3 w-3"
                                      aria-hidden="true"
                                    />
                                    <span>Bookmarked</span>
                                  </span>
                                ) : null}
                                {lesson.estimated_reading_minutes ? (
                                  <span className="text-[11px] text-slate-400">
                                    • {lesson.estimated_reading_minutes} min
                                    read
                                  </span>
                                ) : null}
                              </div>

                              <h4 className="mt-0.5 text-sm font-semibold text-white sm:text-base">
                                {lesson.title}
                              </h4>
                              <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                                {lesson.introduction}
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-3 self-end sm:self-center">
                            <ContentProvenanceBadge
                              provenance={lesson.provenance}
                              compact
                            />
                            <Link
                              href={`/dashboard/learn/courses/${course.slug}/lessons/${lesson.slug}`}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-electric-400/40 bg-electric-400/10 px-3.5 py-2 text-xs font-semibold text-electric-300 transition-colors hover:bg-electric-400/20"
                            >
                              <span>
                                {isCompleted
                                  ? "Review Lesson"
                                  : isStarted
                                    ? "Resume Lesson"
                                    : "Open Lesson"}
                              </span>
                              <ArrowRight
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
