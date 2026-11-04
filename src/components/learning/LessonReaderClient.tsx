"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  Calculator,
  CheckCircle2,
  Clock,
  Crown,
  FileText,
  ListChecks,
  Loader2,
  Lock,
  PauseCircle,
} from "lucide-react";
import { PaystackPricingPlansSection } from "@/components/billing/PaystackUpgradeModal";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ContentProvenanceBadge } from "@/components/learning/ContentProvenanceBadge";
import { LessonDiagramFigure } from "@/components/learning/LessonDiagramFigure";
import { LessonExerciseRunner } from "@/components/learning/LessonExerciseRunner";
import { useStudentSubscription } from "@/lib/billing/billingService";
import {
  fetchLessonDetail,
  recordLessonProgress,
  toggleLessonBookmark,
} from "@/lib/learning/learningService";
import { saveLessonToPersonalNotes } from "@/lib/notes/notesService";
import type {
  OngoingCourseItem,
  PublishedLearningCourse,
} from "@/types/dashboard";
import type {
  LearningMaterialBlock,
  LessonDetailPayload,
} from "@/types/learning";

interface LessonReaderClientProps {
  courseSlug: string;
  lessonSlug: string;
}

function MaterialBlockView({ block }: { block: LearningMaterialBlock }) {
  if (block.block_type === "subheading") {
    return (
      <h2 className="mt-8 border-b border-white/10 pb-2 font-display text-xl font-bold text-white">
        {block.heading}
      </h2>
    );
  }

  if (block.block_type === "explanation") {
    return (
      <div className="my-4 space-y-2">
        {block.heading ? (
          <h3 className="font-display text-base font-semibold text-white">
            {block.heading}
          </h3>
        ) : null}
        {block.body ? (
          <p className="text-[15px] leading-7 text-slate-200">{block.body}</p>
        ) : null}
      </div>
    );
  }

  if (block.block_type === "definition") {
    return (
      <aside
        aria-label={`Definition: ${block.definition_term || block.heading || "Term"}`}
        className="my-5 rounded-2xl border-l-4 border-electric-400 bg-obsidian-950/85 p-4 sm:p-5"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-electric-300">
          Key Definition
        </p>
        {block.definition_term || block.heading ? (
          <p className="mt-1 font-display text-base font-bold text-white">
            {block.definition_term || block.heading}
          </p>
        ) : null}
        {block.body ? (
          <p className="mt-1.5 text-sm leading-relaxed text-slate-200">
            {block.body}
          </p>
        ) : null}
      </aside>
    );
  }

  if (block.block_type === "formula") {
    return (
      <div className="my-5 rounded-2xl border border-aura-400/30 bg-obsidian-950/90 p-4 sm:p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-aura-300">
          <Calculator className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{block.heading || "Key Formula"}</span>
        </div>
        {block.formula_expression ? (
          <div className="mt-2.5 overflow-x-auto rounded-xl border border-white/10 bg-obsidian-900 px-4 py-3 font-mono text-base font-semibold text-white">
            {block.formula_expression}
          </div>
        ) : null}
        {block.formula_notes || block.body ? (
          <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
            {block.formula_notes || block.body}
          </p>
        ) : null}
      </div>
    );
  }

  if (block.block_type === "worked_example") {
    return (
      <div className="my-6 rounded-2xl border border-emerald-400/25 bg-obsidian-950/90 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
          Worked Example
        </p>
        {block.heading ? (
          <h3 className="mt-1 font-display text-base font-bold text-white">
            {block.heading}
          </h3>
        ) : null}
        {block.body ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-200">
            {block.body}
          </p>
        ) : null}

        {block.example_steps.length > 0 ? (
          <ol className="mt-3 space-y-2 border-l-2 border-emerald-400/35 pl-4 text-sm text-slate-200">
            {block.example_steps.map((step, idx) => (
              <li key={step}>
                <span className="mr-1.5 font-semibold text-emerald-300">
                  Step {idx + 1}:
                </span>
                {step}
              </li>
            ))}
          </ol>
        ) : null}

        {block.example_conclusion ? (
          <p className="mt-3 rounded-xl bg-emerald-500/10 px-3.5 py-2.5 text-xs font-medium text-emerald-100">
            <strong>Result:</strong> {block.example_conclusion}
          </p>
        ) : null}
      </div>
    );
  }

  if (block.block_type === "table") {
    return (
      <div className="my-6 overflow-hidden rounded-2xl border border-white/10 bg-obsidian-950/85">
        {block.heading || block.table_caption ? (
          <div className="border-b border-white/10 px-4 py-3">
            {block.heading ? (
              <h3 className="text-sm font-bold text-white">{block.heading}</h3>
            ) : null}
            {block.table_caption ? (
              <p className="mt-0.5 text-xs text-slate-400">
                {block.table_caption}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            {block.table_headers.length > 0 ? (
              <thead>
                <tr className="border-b border-white/10 bg-obsidian-900/90 text-slate-200">
                  {block.table_headers.map((header) => (
                    <th key={header} className="px-4 py-2.5 font-semibold">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
            ) : null}
            <tbody className="divide-y divide-white/[0.06] text-slate-300">
              {block.table_rows.map((row, rIdx) => (
                <tr key={`row-${rIdx}`}>
                  {row.map((cell, cIdx) => (
                    <td key={`cell-${rIdx}-${cIdx}`} className="px-4 py-2.5">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (block.block_type === "diagram") {
    return (
      <LessonDiagramFigure
        diagramKey={block.diagram_key}
        imageUrl={block.image_url}
        altText={block.media_alt || block.heading || "Educational diagram"}
        caption={block.media_caption}
        provenance={block.provenance}
      />
    );
  }

  return null;
}

export function LessonReaderClient({
  courseSlug,
  lessonSlug,
}: LessonReaderClientProps) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<LessonDetailPayload | null>(null);

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completionBusy, setCompletionBusy] = useState(false);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [saveNoteBusy, setSaveNoteBusy] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const openedAtRef = useRef<number>(Date.now());
  const recordedVisitRef = useRef<string | null>(null);
  const { billing, refresh: refreshBilling } = useStudentSubscription();

  useEffect(() => {
    let active = true;
    openedAtRef.current = Date.now();

    async function load() {
      setLoading(true);
      setError(null);
      setNotFound(false);
      setActionFeedback(null);

      const res = await fetchLessonDetail(courseSlug, lessonSlug);
      if (!active) return;

      if (res.status === "unauthenticated") {
        routerRef.current.replace(
          `/learning-space?mode=login&next=/dashboard/learn/courses/${encodeURIComponent(
            courseSlug
          )}/lessons/${encodeURIComponent(lessonSlug)}`
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
        const data = res.payload;
        setPayload(data);
        setIsBookmarked(data.isBookmarked);
        const existingLessonProg = data.lessonProgressMap[data.lesson.id];
        setIsCompleted(Boolean(existingLessonProg?.is_completed));
        setLoading(false);

        // Record lesson access once per lesson open so Continue Learning knows last lesson accessed
        if (recordedVisitRef.current !== data.lesson.id) {
          recordedVisitRef.current = data.lesson.id;
          void recordLessonProgress({
            lessonId: data.lesson.id,
            markCompleted: false,
            timeSpentSeconds: 0,
          }).then((act) => {
            if (!active || !act.ok) return;
            setPayload((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                courseProgress: act.courseProgress ?? prev.courseProgress,
                lessonProgressMap: act.lessonProgress
                  ? {
                      ...prev.lessonProgressMap,
                      [prev.lesson.id]: act.lessonProgress,
                    }
                  : prev.lessonProgressMap,
              };
            });
          });
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [courseSlug, lessonSlug]);

  const consumeElapsedSeconds = (): number => {
    const now = Date.now();
    const secs = Math.max(
      1,
      Math.min(3600, Math.round((now - openedAtRef.current) / 1000))
    );
    openedAtRef.current = now;
    return secs;
  };

  const handleToggleBookmark = async () => {
    if (!payload || bookmarkBusy) return;
    setBookmarkBusy(true);
    setActionFeedback(null);
    const nextState = !isBookmarked;
    const res = await toggleLessonBookmark({
      courseId: payload.course.id,
      lessonId: payload.lesson.id,
      bookmarked: nextState,
    });
    setBookmarkBusy(false);

    if (res.ok) {
      setIsBookmarked(nextState);
      setActionFeedback(
        nextState
          ? "Lesson saved to your bookmarks."
          : "Lesson removed from bookmarks."
      );
    } else {
      setActionFeedback(res.error ?? "Unable to update bookmark.");
    }
  };

  const handleMarkCompleted = async () => {
    if (!payload || completionBusy || isCompleted) return;
    setCompletionBusy(true);
    setActionFeedback(null);
    const elapsed = consumeElapsedSeconds();

    const res = await recordLessonProgress({
      lessonId: payload.lesson.id,
      markCompleted: true,
      timeSpentSeconds: elapsed,
    });
    setCompletionBusy(false);

    if (res.ok) {
      setIsCompleted(true);
      setPayload((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          courseProgress: res.courseProgress ?? prev.courseProgress,
          lessonProgressMap: res.lessonProgress
            ? {
                ...prev.lessonProgressMap,
                [prev.lesson.id]: res.lessonProgress,
              }
            : prev.lessonProgressMap,
        };
      });
      setActionFeedback(
        "Lesson marked as completed. Your course progress has been updated."
      );
    } else {
      setActionFeedback(res.error ?? "Unable to save lesson completion.");
    }
  };

  const handleResumeLater = async () => {
    if (!payload || resumeBusy) return;
    setResumeBusy(true);
    const elapsed = consumeElapsedSeconds();
    await recordLessonProgress({
      lessonId: payload.lesson.id,
      markCompleted: isCompleted,
      timeSpentSeconds: elapsed,
    });
    setResumeBusy(false);
    router.push(`/dashboard/learn/courses/${payload.course.slug}`);
  };

  const handleSaveToNotes = async () => {
    if (!payload || saveNoteBusy) return;
    setSaveNoteBusy(true);
    setActionFeedback(null);
    const res = await saveLessonToPersonalNotes({
      lessonTitle: payload.lesson.title,
      subject: payload.course.subject,
      summary: payload.lesson.summary || payload.course.summary || "",
      keyTakeaways: payload.lesson.key_points || [],
      courseSlug: payload.course.slug,
      lessonSlug: payload.lesson.slug,
    });
    setSaveNoteBusy(false);
    setActionFeedback(
      res.ok
        ? "Lesson summary & takeaways saved to My Notes."
        : res.error || "Unable to save lesson to My Notes."
    );
  };

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
            Opening lesson reader...
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
            Lesson Not Found or Unpublished
          </h1>
          <p className="mt-1.5 text-xs text-slate-400">
            This lesson is not yet published for student access.
          </p>
          <Link
            href={`/dashboard/learn/courses/${courseSlug}`}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-electric-400 px-4 py-2 text-xs font-semibold text-obsidian-950"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to Course</span>
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
            Unable to load lesson
          </p>
          <p className="mt-2 text-sm text-slate-400">{error}</p>
          <Link
            href={`/dashboard/learn/courses/${courseSlug}`}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-electric-400 px-4 py-2 text-xs font-semibold text-obsidian-950"
          >
            <span>Return to Course</span>
          </Link>
        </div>
      </div>
    );
  }

  const {
    course,
    topic,
    lesson,
    materials,
    exercises,
    allTopics,
    previousLesson,
    nextLesson,
    lessonProgressMap,
    latestAttemptsByExercise,
  } = payload;

  const isLessonLockedByPaywall =
    previousLesson !== null &&
    !billing.isPro &&
    billing.settings.paywallEnabled &&
    payload.userProfile?.role !== "admin";

  return (
    <DashboardShell
      userProfile={payload.userProfile}
      academicProfile={payload.academicProfile}
      fallbackEmail={payload.email}
      unreadNotificationCount={payload.unreadNotificationCount}
      publishedCourses={shellPublishedCourses}
      ongoingCourses={shellOngoingCourses}
    >
      {/* Distraction-free two-column layout: focused reading pane + compact outline */}
      <div className="mx-auto max-w-6xl">
        {/* Top Hierarchy Breadcrumbs */}
        <nav
          aria-label="Lesson hierarchy"
          className="mb-5 flex flex-wrap items-center gap-2 text-xs text-slate-400"
        >
          <Link
            href="/dashboard/learn"
            className="font-medium text-electric-300 hover:underline"
          >
            Learning Library
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            href={`/dashboard/learn/courses/${course.slug}`}
            className="font-medium text-electric-300 hover:underline"
          >
            {course.title}
          </Link>
          <span aria-hidden="true">/</span>
          <span>{topic.title}</span>
          <span aria-hidden="true">/</span>
          <span className="text-slate-200">{lesson.title}</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* ===============================================================
              MAIN DISTRACTION-FREE ACADEMIC READING COLUMN
             =============================================================== */}
          <article className="space-y-6 lg:col-span-8">
            <header className="rounded-3xl border border-white/[0.09] bg-obsidian-900/90 p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-electric-300">
                  {course.subject} • {topic.title}
                </span>

                {lesson.estimated_reading_minutes ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{lesson.estimated_reading_minutes} min study</span>
                  </span>
                ) : null}
              </div>

              <h1 className="mt-2.5 font-display text-2xl font-bold leading-snug text-white sm:text-3xl">
                {lesson.title}
              </h1>

              {/* Visible Source Classification & Verification Metadata */}
              <div className="mt-4">
                <ContentProvenanceBadge
                  provenance={lesson.provenance}
                  showDetailsToggle
                />
              </div>

              {/* Action Toolbar: Bookmark, Mark Completed, Resume Later */}
              <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-white/[0.08] pt-4">
                <button
                  type="button"
                  onClick={handleMarkCompleted}
                  disabled={completionBusy || isCompleted}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                    isCompleted
                      ? "border border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                      : "bg-gradient-to-r from-electric-400 to-electric-500 text-obsidian-950 hover:opacity-95"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {isCompleted
                      ? "Lesson Completed"
                      : completionBusy
                        ? "Saving..."
                        : "Mark Lesson as Completed"}
                  </span>
                </button>

                <button
                  type="button"
                  aria-pressed={isBookmarked}
                  disabled={bookmarkBusy}
                  onClick={handleToggleBookmark}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                    isBookmarked
                      ? "border-amber-400/45 bg-amber-500/15 text-amber-200"
                      : "border-white/15 bg-obsidian-950 text-slate-200 hover:border-white/25"
                  }`}
                >
                  <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{isBookmarked ? "Bookmarked" : "Bookmark Lesson"}</span>
                </button>

                <button
                  type="button"
                  disabled={resumeBusy}
                  onClick={handleResumeLater}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-obsidian-950 px-3.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-electric-400/40 hover:text-white"
                >
                  <PauseCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {resumeBusy ? "Saving place..." : "Save & Resume Later"}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={saveNoteBusy}
                  onClick={handleSaveToNotes}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-electric-400/35 bg-electric-500/10 px-3.5 py-2 text-xs font-semibold text-electric-300 transition-colors hover:bg-electric-500/20"
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {saveNoteBusy ? "Saving note..." : "Save to My Notes"}
                  </span>
                </button>
              </div>

              {actionFeedback ? (
                <p
                  role="status"
                  aria-live="polite"
                  className="mt-3 text-xs font-medium text-electric-300"
                >
                  {actionFeedback}
                </p>
              ) : null}
            </header>

            {/* Lesson Introduction & Objectives + Structured Material Blocks */}
            {isLessonLockedByPaywall ? (
              <div className="space-y-6 rounded-3xl border border-amber-400/30 bg-obsidian-900/90 p-6 sm:p-8">
                <div>
                  <p className="text-base leading-8 text-slate-200">
                    {lesson.introduction}
                  </p>
                </div>

                <div className="rounded-2xl border border-cyan-400/25 bg-slate-950/85 p-5 sm:p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300 border border-amber-400/30">
                        <Lock className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                          <Crown className="h-3 w-3" aria-hidden="true" />
                          TRALIX Pro Course Chapter
                        </p>
                        <h2 className="text-base sm:text-lg font-extrabold text-white">
                          Unlock This Lesson, Worked Examples &amp; Mastery Quiz
                        </h2>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Lesson 1 of every course is free on Starter. Upgrade with
                    Paystack to unlock every course chapter, unlimited 24/7 AI
                    Photo Tutoring, and full-length JAMB/WAEC/NECO CBT mocks.
                  </p>

                  <PaystackPricingPlansSection
                    settings={billing.settings}
                    isPro={billing.isPro}
                    isAdmin={billing.isAdmin}
                    callbackPath={`/dashboard/learn/courses/${course.slug}/lessons/${lesson.slug}`}
                    onVerifiedSuccess={() => {
                      void refreshBilling();
                    }}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-3xl border border-white/[0.08] bg-obsidian-900/85 p-6 sm:p-8">
                  <p className="text-base leading-8 text-slate-100">
                    {lesson.introduction}
                  </p>

                  {lesson.learning_objectives.length > 0 ? (
                    <div className="my-6 rounded-2xl border border-white/10 bg-obsidian-950/85 p-4 sm:p-5">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-electric-300">
                        <ListChecks className="h-4 w-4" aria-hidden="true" />
                        <span>Lesson Learning Objectives</span>
                      </div>
                      <ul className="mt-2.5 list-disc space-y-1.5 pl-5 text-sm text-slate-200">
                        {lesson.learning_objectives.map((obj) => (
                          <li key={obj}>{obj}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {/* Structured Material Blocks */}
                  <div>
                    {materials.map((block) => (
                      <MaterialBlockView key={block.id} block={block} />
                    ))}
                  </div>

                  {/* Lesson Summary & Key Points */}
                  {(lesson.summary || lesson.key_points.length > 0) ? (
                    <div className="mt-8 rounded-2xl border border-electric-400/25 bg-obsidian-950/90 p-5">
                      <h2 className="font-display text-base font-bold text-white">
                        Lesson Summary &amp; Key Points
                      </h2>
                      {lesson.summary ? (
                        <p className="mt-2 text-sm leading-relaxed text-slate-200">
                          {lesson.summary}
                        </p>
                      ) : null}
                      {lesson.key_points.length > 0 ? (
                        <ul className="mt-3 space-y-1.5 text-sm text-slate-200">
                          {lesson.key_points.map((pt) => (
                            <li key={pt} className="flex items-start gap-2">
                              <CheckCircle2
                                className="mt-0.5 h-4 w-4 shrink-0 text-electric-300"
                                aria-hidden="true"
                              />
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {/* Practice Exercises */}
                {exercises.length > 0 ? (
                  <div className="space-y-6">
                    {exercises.map((ex) => (
                      <LessonExerciseRunner
                        key={ex.id}
                        exercise={ex}
                        initialLatestAttempt={
                          latestAttemptsByExercise[ex.id] ?? null
                        }
                      />
                    ))}
                  </div>
                ) : null}
              </>
            )}

            {/* Previous & Next Lesson Footer Navigation */}
            <nav
              aria-label="Lesson pagination"
              className="grid gap-3 pt-2 sm:grid-cols-2"
            >
              {previousLesson ? (
                <Link
                  href={`/dashboard/learn/courses/${course.slug}/lessons/${previousLesson.slug}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-obsidian-900/85 p-4 transition-colors hover:border-electric-400/40"
                >
                  <ArrowLeft
                    className="h-4 w-4 shrink-0 text-electric-300"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Previous Lesson
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-white">
                      {previousLesson.title}
                    </p>
                  </div>
                </Link>
              ) : (
                <Link
                  href={`/dashboard/learn/courses/${course.slug}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-obsidian-900/85 p-4 transition-colors hover:border-electric-400/40"
                >
                  <ArrowLeft
                    className="h-4 w-4 shrink-0 text-slate-400"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Course Overview
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-white">
                      {course.title}
                    </p>
                  </div>
                </Link>
              )}

              {nextLesson ? (
                <Link
                  href={`/dashboard/learn/courses/${course.slug}/lessons/${nextLesson.slug}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-electric-400/35 bg-obsidian-900/90 p-4 text-right transition-colors hover:border-electric-400/60"
                >
                  <div className="ml-auto">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-electric-300">
                      Next Lesson
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-white">
                      {nextLesson.title}
                    </p>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-electric-300"
                    aria-hidden="true"
                  />
                </Link>
              ) : (
                <Link
                  href={`/dashboard/learn/courses/${course.slug}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-400/30 bg-obsidian-900/90 p-4 text-right transition-colors hover:border-emerald-400/50"
                >
                  <div className="ml-auto">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                      End of Course Lessons
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-white">
                      Return to Course Progress
                    </p>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-emerald-300"
                    aria-hidden="true"
                  />
                </Link>
              )}
            </nav>
          </article>

          {/* ===============================================================
              COMPACT COURSE LESSON OUTLINE SIDEBAR
             =============================================================== */}
          <aside
            aria-label="Course outline"
            className="space-y-4 lg:col-span-4"
          >
            <div className="rounded-2xl border border-white/[0.08] bg-obsidian-900/85 p-5">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-slate-300">
                Course Outline
              </h2>
              <p className="mt-1 text-xs text-slate-400">{course.title}</p>

              <div className="mt-4 space-y-4">
                {allTopics.map((t, tIdx) => (
                  <div key={t.id}>
                    <p className="text-xs font-semibold text-electric-300">
                      Topic {tIdx + 1}: {t.title}
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {t.lessons.map((l) => {
                        const active = l.id === lesson.id;
                        const completed =
                          l.id === lesson.id
                            ? isCompleted
                            : Boolean(lessonProgressMap[l.id]?.is_completed);

                        return (
                          <li key={l.id}>
                            <Link
                              href={`/dashboard/learn/courses/${course.slug}/lessons/${l.slug}`}
                              aria-current={active ? "page" : undefined}
                              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs transition-colors ${
                                active
                                  ? "border-electric-400/50 bg-electric-400/15 font-semibold text-white"
                                  : "border-white/[0.06] bg-obsidian-950/75 text-slate-300 hover:border-white/20"
                              }`}
                            >
                              <span className="truncate">{l.title}</span>
                              {completed ? (
                                <CheckCircle2
                                  className="h-3.5 w-3.5 shrink-0 text-emerald-400"
                                  aria-label="Completed"
                                />
                              ) : null}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </DashboardShell>
  );
}
