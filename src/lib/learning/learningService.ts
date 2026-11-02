"use client";

import {
  mapExerciseAttemptRow,
  queryCourseDetail,
  queryLearningLibrary,
  queryLessonDetail,
} from "@/lib/learning/queryLearning";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type {
  CourseDetailPayload,
  LearningLibraryPayload,
  LessonDetailPayload,
  StudentCourseProgressState,
  StudentExerciseAttemptRecord,
  StudentLessonProgressState,
} from "@/types/learning";

export type LoadStatus<T> =
  | { status: "unauthenticated" }
  | { status: "needs_onboarding" }
  | { status: "not_found" }
  | { status: "ready"; payload: T }
  | { status: "error"; error: string };

export async function fetchLearningLibrary(): Promise<
  LoadStatus<LearningLibraryPayload>
> {
  try {
    const res = await fetch("/api/learning/library", {
      method: "GET",
      cache: "no-store",
    });

    if (res.status === 401) {
      return { status: "unauthenticated" };
    }

    const json = (await res.json()) as {
      ok?: boolean;
      delegateToBrowser?: boolean;
      data?: LearningLibraryPayload;
      error?: string;
    };

    if (json.ok && json.data) {
      if (!json.data.academicProfile?.onboarding_completed) {
        return { status: "needs_onboarding" };
      }
      return { status: "ready", payload: json.data };
    }

    if (json.delegateToBrowser) {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        return { status: "error", error: "Supabase browser client unavailable." };
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { status: "unauthenticated" };

      const payload = await queryLearningLibrary(
        supabase,
        user.id,
        user.email ?? ""
      );
      if (!payload.academicProfile?.onboarding_completed) {
        return { status: "needs_onboarding" };
      }
      return { status: "ready", payload };
    }

    return {
      status: "error",
      error: json.error ?? "Unable to load the learning library.",
    };
  } catch {
    return {
      status: "error",
      error:
        "Network error while loading your learning library. Please check your connection and try again.",
    };
  }
}

export async function fetchCourseDetail(
  courseSlug: string
): Promise<LoadStatus<CourseDetailPayload>> {
  try {
    const res = await fetch(
      `/api/learning/courses/${encodeURIComponent(courseSlug)}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (res.status === 401) return { status: "unauthenticated" };
    if (res.status === 404) return { status: "not_found" };

    const json = (await res.json()) as {
      ok?: boolean;
      delegateToBrowser?: boolean;
      data?: CourseDetailPayload;
      error?: string;
    };

    if (json.ok && json.data) {
      if (!json.data.academicProfile?.onboarding_completed) {
        return { status: "needs_onboarding" };
      }
      return { status: "ready", payload: json.data };
    }

    if (json.delegateToBrowser) {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        return { status: "error", error: "Supabase browser client unavailable." };
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { status: "unauthenticated" };

      const payload = await queryCourseDetail(
        supabase,
        user.id,
        user.email ?? "",
        courseSlug
      );
      if (!payload) return { status: "not_found" };
      if (!payload.academicProfile?.onboarding_completed) {
        return { status: "needs_onboarding" };
      }
      return { status: "ready", payload };
    }

    return {
      status: "error",
      error: json.error ?? "Unable to load course details.",
    };
  } catch {
    return {
      status: "error",
      error: "Network error while loading course details.",
    };
  }
}

export async function fetchLessonDetail(
  courseSlug: string,
  lessonSlug: string
): Promise<LoadStatus<LessonDetailPayload>> {
  try {
    const res = await fetch(
      `/api/learning/courses/${encodeURIComponent(
        courseSlug
      )}/lessons/${encodeURIComponent(lessonSlug)}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (res.status === 401) return { status: "unauthenticated" };
    if (res.status === 404) return { status: "not_found" };

    const json = (await res.json()) as {
      ok?: boolean;
      delegateToBrowser?: boolean;
      data?: LessonDetailPayload;
      error?: string;
    };

    if (json.ok && json.data) {
      if (!json.data.academicProfile?.onboarding_completed) {
        return { status: "needs_onboarding" };
      }
      return { status: "ready", payload: json.data };
    }

    if (json.delegateToBrowser) {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        return { status: "error", error: "Supabase browser client unavailable." };
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { status: "unauthenticated" };

      const payload = await queryLessonDetail(
        supabase,
        user.id,
        user.email ?? "",
        courseSlug,
        lessonSlug
      );
      if (!payload) return { status: "not_found" };
      if (!payload.academicProfile?.onboarding_completed) {
        return { status: "needs_onboarding" };
      }
      return { status: "ready", payload };
    }

    return {
      status: "error",
      error: json.error ?? "Unable to load lesson content.",
    };
  } catch {
    return {
      status: "error",
      error: "Network error while loading lesson content.",
    };
  }
}

export async function recordLessonProgress(params: {
  lessonId: string;
  markCompleted: boolean;
  timeSpentSeconds: number;
}): Promise<{
  ok: boolean;
  lessonProgress?: StudentLessonProgressState;
  courseProgress?: StudentCourseProgressState;
  error?: string;
}> {
  try {
    const res = await fetch("/api/learning/lessons/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    const json = (await res.json()) as {
      ok?: boolean;
      delegateToBrowser?: boolean;
      sanitized?: {
        lessonId: string;
        markCompleted: boolean;
        timeSpentSeconds: number;
      };
      data?: {
        lessonProgress: StudentLessonProgressState;
        courseProgress: StudentCourseProgressState;
      };
      error?: string;
    };

    if (json.ok && !json.delegateToBrowser && json.data) {
      return {
        ok: true,
        lessonProgress: json.data.lessonProgress,
        courseProgress: json.data.courseProgress,
      };
    }

    if (json.delegateToBrowser && json.sanitized) {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        return { ok: false, error: "Supabase browser client unavailable." };
      }
      const { data, error } = await supabase.rpc(
        "record_student_lesson_activity",
        {
          p_lesson_id: json.sanitized.lessonId,
          p_mark_completed: json.sanitized.markCompleted,
          p_time_spent_seconds: json.sanitized.timeSpentSeconds,
        }
      );

      if (error || !data) {
        return {
          ok: false,
          error: "Unable to record lesson progress right now.",
        };
      }

      const typed = data as {
        lessonProgress: StudentLessonProgressState;
        courseProgress: StudentCourseProgressState;
      };
      return {
        ok: true,
        lessonProgress: typed.lessonProgress,
        courseProgress: typed.courseProgress,
      };
    }

    return {
      ok: false,
      error: json.error ?? "Unable to save lesson progress.",
    };
  } catch {
    return {
      ok: false,
      error: "Network error while saving lesson progress.",
    };
  }
}

export async function toggleLessonBookmark(params: {
  courseId: string;
  lessonId: string;
  bookmarked: boolean;
  note?: string | null;
}): Promise<{ ok: boolean; bookmarked?: boolean; error?: string }> {
  try {
    const res = await fetch("/api/learning/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    const json = (await res.json()) as {
      ok?: boolean;
      delegateToBrowser?: boolean;
      bookmarked?: boolean;
      sanitized?: {
        courseId: string;
        lessonId: string;
        bookmarked: boolean;
        note: string | null;
      };
      error?: string;
    };

    if (json.ok && !json.delegateToBrowser) {
      return { ok: true, bookmarked: json.bookmarked };
    }

    if (json.delegateToBrowser && json.sanitized) {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        return { ok: false, error: "Supabase browser client unavailable." };
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { ok: false, error: "Authentication required." };

      if (json.sanitized.bookmarked) {
        const { error } = await supabase
          .from("student_lesson_bookmarks")
          .upsert(
            {
              user_id: user.id,
              course_id: json.sanitized.courseId,
              lesson_id: json.sanitized.lessonId,
              note: json.sanitized.note,
            },
            { onConflict: "user_id,lesson_id" }
          );
        if (error) return { ok: false, error: "Unable to save bookmark." };
      } else {
        const { error } = await supabase
          .from("student_lesson_bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("lesson_id", json.sanitized.lessonId);
        if (error) return { ok: false, error: "Unable to remove bookmark." };
      }
      return { ok: true, bookmarked: json.sanitized.bookmarked };
    }

    return { ok: false, error: json.error ?? "Unable to update bookmark." };
  } catch {
    return { ok: false, error: "Network error while updating bookmark." };
  }
}

export async function submitExerciseAttempt(params: {
  exerciseId: string;
  answers: Record<string, string>;
  timeSpentSeconds?: number | null;
}): Promise<{
  ok: boolean;
  attempt?: StudentExerciseAttemptRecord;
  error?: string;
}> {
  try {
    const res = await fetch("/api/learning/exercises/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    const json = (await res.json()) as {
      ok?: boolean;
      delegateToBrowser?: boolean;
      attempt?: StudentExerciseAttemptRecord;
      sanitized?: {
        exerciseId: string;
        answers: Record<string, string>;
        timeSpentSeconds: number | null;
      };
      error?: string;
    };

    if (json.ok && !json.delegateToBrowser && json.attempt) {
      return { ok: true, attempt: json.attempt };
    }

    if (json.delegateToBrowser && json.sanitized) {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        return { ok: false, error: "Supabase browser client unavailable." };
      }
      const { data, error } = await supabase.rpc(
        "submit_student_exercise_attempt",
        {
          p_exercise_id: json.sanitized.exerciseId,
          p_answers: json.sanitized.answers,
          p_time_spent_seconds: json.sanitized.timeSpentSeconds,
        }
      );

      if (error || !data) {
        return {
          ok: false,
          error: "Unable to evaluate exercise right now.",
        };
      }

      return {
        ok: true,
        attempt: mapExerciseAttemptRow(data as Record<string, unknown>),
      };
    }

    return {
      ok: false,
      error: json.error ?? "Unable to submit exercise attempt.",
    };
  } catch {
    return {
      ok: false,
      error: "Network error while submitting exercise attempt.",
    };
  }
}
