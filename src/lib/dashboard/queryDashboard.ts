import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile } from "@/types/auth";
import type {
  AcademicProgressMetrics,
  AssessmentResultRecord,
  AssignmentRecord,
  BookmarkedLessonItem,
  OngoingCourseItem,
  PublishedLearningCourse,
  RecentLessonActivityItem,
  StudentDashboardPayload,
  StudentNotificationRecord,
  StudySessionRecord,
  SubjectLearningProgressItem,
  SubjectPerformanceSummary,
} from "@/types/dashboard";
import type {
  ContentClassification,
  LearningSubjectRecord,
} from "@/types/learning";
import type { StudentAcademicProfile } from "@/types/onboarding";

const ACADEMIC_PROFILE_COLUMNS =
  "user_id, academic_category, country, state_region, institution_name, institution_type, secondary_category, faculty, department, course_or_program, qualification_type, academic_level, curriculum, selected_subjects, learning_goals, explanation_preference, current_step, onboarding_completed, completed_at, created_at, updated_at";

interface RawProgressRow {
  id: string;
  course_id: string;
  last_lesson_slug?: string | null;
  current_lesson_title: string | null;
  lessons_started?: number;
  lessons_completed: number;
  total_lessons: number;
  progress_percent: number | string | null;
  total_time_spent_seconds?: number;
  last_accessed_at: string;
  completed_at: string | null;
  learning_courses?:
    | {
        slug: string;
        title: string;
        subject: string;
        current_topic: string | null;
        total_lessons: number;
      }
    | Array<{
        slug: string;
        title: string;
        subject: string;
        current_topic: string | null;
        total_lessons: number;
      }>
    | null;
}

export function getLocalIsoDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function computeAcademicProgressMetrics(
  progressRows: RawProgressRow[],
  assessments: AssessmentResultRecord[],
  extra?: {
    lessonsStarted?: number;
    exercisesAttempted?: number;
    totalTimeSpentSeconds?: number;
  }
): AcademicProgressMetrics {
  const lessonsCompleted = progressRows.reduce(
    (sum, r) => sum + (Number(r.lessons_completed) || 0),
    0
  );
  const lessonsStarted =
    extra?.lessonsStarted ??
    progressRows.reduce((sum, r) => sum + (Number(r.lessons_started) || 0), 0);
  const coursesStarted = progressRows.length;
  const coursesInProgress = progressRows.filter(
    (r) => !r.completed_at
  ).length;
  const coursesCompleted = progressRows.filter((r) => Boolean(r.completed_at))
    .length;
  const totalTimeSpentSeconds =
    extra?.totalTimeSpentSeconds ??
    progressRows.reduce(
      (sum, r) => sum + (Number(r.total_time_spent_seconds) || 0),
      0
    );
  const exercisesAttempted = extra?.exercisesAttempted ?? 0;
  const assessmentsCount = assessments.length;

  let averageAssessmentScore: number | null = null;
  const subjectPerformance: SubjectPerformanceSummary[] = [];

  if (assessmentsCount > 0) {
    const totalScore = assessments.reduce(
      (sum, a) => sum + Number(a.score_percent),
      0
    );
    averageAssessmentScore = Math.round((totalScore / assessmentsCount) * 10) / 10;

    const bySubject = new Map<string, { sum: number; count: number }>();
    for (const item of assessments) {
      const key = item.subject.trim();
      const prev = bySubject.get(key) ?? { sum: 0, count: 0 };
      prev.sum += Number(item.score_percent);
      prev.count += 1;
      bySubject.set(key, prev);
    }

    for (const [subject, agg] of bySubject.entries()) {
      subjectPerformance.push({
        subject,
        average_score: Math.round((agg.sum / agg.count) * 10) / 10,
        assessments_count: agg.count,
      });
    }
    subjectPerformance.sort((a, b) => b.average_score - a.average_score);
  }

  return {
    hasAnyActivity:
      progressRows.length > 0 ||
      lessonsStarted > 0 ||
      exercisesAttempted > 0 ||
      assessmentsCount > 0,
    lessonsStarted,
    lessonsCompleted,
    coursesStarted,
    coursesInProgress,
    coursesCompleted,
    exercisesAttempted,
    totalTimeSpentSeconds,
    assessmentsCount,
    averageAssessmentScore,
    recentAssessments: assessments.slice(0, 5),
    subjectPerformance,
  };
}

export async function queryStudentDashboardData(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string
): Promise<StudentDashboardPayload> {
  const todayIso = getLocalIsoDate();

  const [
    profileRes,
    academicRes,
    publishedRes,
    subjectsRes,
    progressRes,
    lessonProgRes,
    bookmarksRes,
    exerciseAttemptsRes,
    sessionsRes,
    assignmentsRes,
    assessmentsRes,
    notificationsRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, country, role, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("student_academic_profiles")
      .select(ACADEMIC_PROFILE_COLUMNS)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("learning_courses")
      .select(
        "id, slug, title, subject, academic_category, education_level, curriculum, current_topic, summary, total_lessons, is_published, learning_content_sources(content_classification)"
      )
      .eq("is_published", true)
      .eq("publication_status", "published")
      .order("created_at", { ascending: true })
      .limit(24),
    supabase
      .from("learning_subjects")
      .select(
        "id, slug, name, learning_category, description, academic_categories, education_levels, curriculum_codes, waec_neco_relevant, faculty_keywords, department_keywords, qualification_keywords, sort_order"
      )
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .limit(50),
    supabase
      .from("student_course_progress")
      .select(
        "id, course_id, last_lesson_slug, current_lesson_title, lessons_started, lessons_completed, total_lessons, progress_percent, total_time_spent_seconds, last_accessed_at, completed_at, learning_courses(slug, title, subject, current_topic, total_lessons)"
      )
      .eq("user_id", userId)
      .order("last_accessed_at", { ascending: false })
      .limit(24),
    supabase
      .from("student_lesson_progress")
      .select(
        "id, lesson_id, course_id, status, is_completed, time_spent_seconds, last_accessed_at, completed_at, learning_lessons(slug, title), learning_courses(slug, title, subject)"
      )
      .eq("user_id", userId)
      .order("last_accessed_at", { ascending: false })
      .limit(25),
    supabase
      .from("student_lesson_bookmarks")
      .select(
        "id, lesson_id, course_id, note, created_at, learning_lessons(slug, title), learning_courses(slug, title, subject)"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("student_exercise_attempts")
      .select("id")
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false })
      .limit(200),
    supabase
      .from("student_study_sessions")
      .select(
        "id, title, subject, scheduled_date, start_time, duration_minutes, status"
      )
      .eq("user_id", userId)
      .gte("scheduled_date", todayIso)
      .order("scheduled_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(12),
    supabase
      .from("student_assignments")
      .select("id, title, subject, due_at, priority, status")
      .eq("user_id", userId)
      .neq("status", "completed")
      .order("due_at", { ascending: true })
      .limit(10),
    supabase
      .from("student_assessment_results")
      .select("id, title, subject, score_percent, recorded_at")
      .eq("user_id", userId)
      .order("recorded_at", { ascending: false })
      .limit(20),
    supabase
      .from("student_notifications")
      .select("id, title, body, category, action_url, is_read, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  if (academicRes.error) {
    throw academicRes.error;
  }

  const userProfile = (profileRes.data as UserProfile | null) ?? null;
  const academicProfile =
    (academicRes.data as StudentAcademicProfile | null) ?? null;

  const publishedCourses: PublishedLearningCourse[] = (
    (publishedRes.data ?? []) as Array<
      PublishedLearningCourse & {
        learning_content_sources?:
          | { content_classification: ContentClassification }
          | Array<{ content_classification: ContentClassification }>
          | null;
      }
    >
  ).map((c) => {
    const src = Array.isArray(c.learning_content_sources)
      ? c.learning_content_sources[0]
      : c.learning_content_sources;
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      subject: c.subject,
      academic_category: c.academic_category,
      education_level: c.education_level ?? null,
      curriculum: c.curriculum ?? null,
      current_topic: c.current_topic,
      summary: c.summary,
      total_lessons: c.total_lessons,
      is_published: c.is_published,
      content_classification: src?.content_classification ?? null,
    };
  });

  const rawProgressRows = ((progressRes.data ?? []) as RawProgressRow[]);
  const allCourseProgress: OngoingCourseItem[] = rawProgressRows.map((row) => {
    const joined = Array.isArray(row.learning_courses)
      ? row.learning_courses[0]
      : row.learning_courses;
    const totalLessons =
      Number(row.total_lessons) || Number(joined?.total_lessons) || 0;
    const completedLessons = Number(row.lessons_completed) || 0;

    let pct: number | null = null;
    if (row.progress_percent !== null && row.progress_percent !== undefined) {
      pct = Math.min(100, Math.max(0, Number(row.progress_percent)));
    } else if (totalLessons > 0) {
      pct = Math.min(100, Math.round((completedLessons / totalLessons) * 100));
    }

    return {
      id: row.id,
      course_id: row.course_id,
      course_slug: joined?.slug ?? row.course_id,
      course_title: joined?.title ?? "Course",
      subject: joined?.subject ?? "General",
      topic_or_lesson:
        row.current_lesson_title || joined?.current_topic || null,
      last_lesson_slug: row.last_lesson_slug ?? null,
      lessons_started: Number(row.lessons_started) || 0,
      lessons_completed: completedLessons,
      total_lessons: totalLessons,
      progress_percent: pct,
      total_time_spent_seconds: Number(row.total_time_spent_seconds) || 0,
      last_accessed_at: row.last_accessed_at,
      completed_at: row.completed_at,
    };
  });

  const ongoingCourses = allCourseProgress.filter((row) => !row.completed_at);

  // Subject-level real learning progress aggregation
  const subjectAgg = new Map<string, SubjectLearningProgressItem>();
  for (const cp of allCourseProgress) {
    const existing = subjectAgg.get(cp.subject) ?? {
      subject: cp.subject,
      courses_started: 0,
      courses_completed: 0,
      lessons_completed: 0,
      total_lessons: 0,
      progress_percent: 0,
      time_spent_seconds: 0,
    };
    existing.courses_started += 1;
    if (cp.completed_at) existing.courses_completed += 1;
    existing.lessons_completed += cp.lessons_completed;
    existing.total_lessons += cp.total_lessons;
    existing.time_spent_seconds += cp.total_time_spent_seconds ?? 0;
    subjectAgg.set(cp.subject, existing);
  }
  const subjectLearningProgress: SubjectLearningProgressItem[] = Array.from(
    subjectAgg.values()
  ).map((item) => ({
    ...item,
    progress_percent:
      item.total_lessons > 0
        ? Math.min(
            100,
            Math.round((item.lessons_completed / item.total_lessons) * 100)
          )
        : 0,
  }));

  const recentLessons: RecentLessonActivityItem[] = (
    (lessonProgRes.data ?? []) as Array<{
      id: string;
      lesson_id: string;
      course_id: string;
      status: "in_progress" | "completed";
      is_completed: boolean;
      time_spent_seconds: number;
      last_accessed_at: string;
      completed_at: string | null;
      learning_lessons?:
        | { slug: string; title: string }
        | Array<{ slug: string; title: string }>
        | null;
      learning_courses?:
        | { slug: string; title: string; subject: string }
        | Array<{ slug: string; title: string; subject: string }>
        | null;
    }>
  )
    .map((r) => {
      const l = Array.isArray(r.learning_lessons)
        ? r.learning_lessons[0]
        : r.learning_lessons;
      const c = Array.isArray(r.learning_courses)
        ? r.learning_courses[0]
        : r.learning_courses;
      if (!l || !c) return null;
      return {
        id: r.id,
        lesson_id: r.lesson_id,
        lesson_slug: l.slug,
        lesson_title: l.title,
        course_id: r.course_id,
        course_slug: c.slug,
        course_title: c.title,
        subject: c.subject,
        status: r.status,
        is_completed: Boolean(r.is_completed),
        time_spent_seconds: Number(r.time_spent_seconds) || 0,
        last_accessed_at: r.last_accessed_at,
        completed_at: r.completed_at,
      };
    })
    .filter((x): x is RecentLessonActivityItem => Boolean(x));

  const bookmarkedLessons: BookmarkedLessonItem[] = (
    (bookmarksRes.data ?? []) as Array<{
      id: string;
      lesson_id: string;
      course_id: string;
      note: string | null;
      created_at: string;
      learning_lessons?:
        | { slug: string; title: string }
        | Array<{ slug: string; title: string }>
        | null;
      learning_courses?:
        | { slug: string; title: string; subject: string }
        | Array<{ slug: string; title: string; subject: string }>
        | null;
    }>
  )
    .map((b) => {
      const l = Array.isArray(b.learning_lessons)
        ? b.learning_lessons[0]
        : b.learning_lessons;
      const c = Array.isArray(b.learning_courses)
        ? b.learning_courses[0]
        : b.learning_courses;
      if (!l || !c) return null;
      return {
        id: b.id,
        lesson_id: b.lesson_id,
        lesson_slug: l.slug,
        lesson_title: l.title,
        course_id: b.course_id,
        course_slug: c.slug,
        course_title: c.title,
        subject: c.subject,
        note: b.note,
        created_at: b.created_at,
      };
    })
    .filter((x): x is BookmarkedLessonItem => Boolean(x));

  const allSessions = ((sessionsRes.data ?? []) as StudySessionRecord[]);
  const todayStudySessions = allSessions.filter(
    (s) => s.scheduled_date === todayIso
  );
  const upcomingStudySessions = allSessions.filter(
    (s) => s.scheduled_date > todayIso
  );

  const upcomingAssignments = ((assignmentsRes.data ?? []) as AssignmentRecord[]);

  const assessments: AssessmentResultRecord[] = (
    (assessmentsRes.data ?? []) as Array<{
      id: string;
      title: string;
      subject: string;
      score_percent: number | string;
      recorded_at: string;
    }>
  ).map((a) => ({
    ...a,
    score_percent: Number(a.score_percent),
  }));

  const progressMetrics = computeAcademicProgressMetrics(
    rawProgressRows,
    assessments,
    {
      lessonsStarted: recentLessons.length,
      exercisesAttempted: (exerciseAttemptsRes.data ?? []).length,
      totalTimeSpentSeconds: recentLessons.reduce(
        (sum, l) => sum + l.time_spent_seconds,
        0
      ),
    }
  );

  const notifications = ((notificationsRes.data ??
    []) as StudentNotificationRecord[]);
  const unreadNotificationCount = notifications.filter(
    (n) => !n.is_read
  ).length;

  return {
    authenticated: true,
    emailVerified: true,
    onboardingCompleted: Boolean(academicProfile?.onboarding_completed),
    userId,
    email: userProfile?.email || userEmail,
    userProfile,
    academicProfile,
    ongoingCourses,
    allCourseProgress,
    publishedCourses,
    catalogSubjects: (subjectsRes.data ?? []) as LearningSubjectRecord[],
    recentLessons,
    bookmarkedLessons,
    subjectLearningProgress,
    todayStudySessions,
    upcomingStudySessions,
    upcomingAssignments,
    progressMetrics,
    notifications,
    unreadNotificationCount,
  };
}
