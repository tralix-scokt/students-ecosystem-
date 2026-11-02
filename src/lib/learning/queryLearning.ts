import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile } from "@/types/auth";
import type {
  ContentProvenance,
  ContentSourceRecord,
  ContentVerificationRecord,
  CourseDetailPayload,
  CourseTopicWithLessons,
  ExerciseQuestionEvaluation,
  LearningCourseCatalogItem,
  LearningCurriculumRecord,
  LearningEducationLevelRecord,
  LearningExercise,
  LearningExerciseQuestion,
  LearningLessonSummary,
  LearningLibraryPayload,
  LearningMaterialBlock,
  LearningQuestionOption,
  LearningSubjectRecord,
  LearningTopicSummary,
  LessonDetailPayload,
  StudentBookmarkRecord,
  StudentCourseProgressState,
  StudentExerciseAttemptRecord,
  StudentLessonProgressState,
} from "@/types/learning";
import type { StudentAcademicProfile } from "@/types/onboarding";

const ACADEMIC_PROFILE_COLS =
  "user_id, academic_category, country, state_region, institution_name, institution_type, secondary_category, faculty, department, course_or_program, qualification_type, academic_level, curriculum, selected_subjects, learning_goals, explanation_preference, current_step, onboarding_completed, completed_at, created_at, updated_at";

const SOURCE_COLS =
  "id, slug, source_name, source_url_or_reference, author_or_publisher, content_classification, license_or_permission, attribution_text";

const VERIFICATION_COLS =
  "id, code, source_id, content_classification, verification_status, approved_for_publication, reviewer_name, reviewed_at, review_notes";

function unwrapSingle<T>(val: T | T[] | null | undefined): T | null {
  if (!val) return null;
  return Array.isArray(val) ? (val[0] ?? null) : val;
}

function mapProvenance(row: {
  learning_content_sources?: ContentSourceRecord | ContentSourceRecord[] | null;
  learning_content_verifications?:
    | ContentVerificationRecord
    | ContentVerificationRecord[]
    | null;
}): ContentProvenance {
  return {
    source: unwrapSingle(row.learning_content_sources),
    verification: unwrapSingle(row.learning_content_verifications),
  };
}

function mapCourseRow(raw: Record<string, unknown>): LearningCourseCatalogItem {
  return {
    id: String(raw.id),
    slug: String(raw.slug),
    title: String(raw.title),
    subject: String(raw.subject),
    subject_id: raw.subject_id ? String(raw.subject_id) : null,
    academic_category:
      (raw.academic_category as LearningCourseCatalogItem["academic_category"]) ??
      "all",
    education_level: raw.education_level ? String(raw.education_level) : null,
    curriculum: raw.curriculum ? String(raw.curriculum) : null,
    curriculum_id: raw.curriculum_id ? String(raw.curriculum_id) : null,
    current_topic: raw.current_topic ? String(raw.current_topic) : null,
    summary: raw.summary ? String(raw.summary) : null,
    description: raw.description ? String(raw.description) : null,
    thumbnail_url: raw.thumbnail_url ? String(raw.thumbnail_url) : null,
    instructor_name: raw.instructor_name ? String(raw.instructor_name) : null,
    learning_objectives: Array.isArray(raw.learning_objectives)
      ? (raw.learning_objectives as string[])
      : [],
    estimated_duration_minutes:
      raw.estimated_duration_minutes !== null &&
      raw.estimated_duration_minutes !== undefined
        ? Number(raw.estimated_duration_minutes)
        : null,
    difficulty:
      (raw.difficulty as LearningCourseCatalogItem["difficulty"]) ?? null,
    total_lessons: Number(raw.total_lessons) || 0,
    is_published: Boolean(raw.is_published),
    publication_status:
      (raw.publication_status as LearningCourseCatalogItem["publication_status"]) ??
      "published",
    provenance: mapProvenance(
      raw as {
        learning_content_sources?: ContentSourceRecord | null;
        learning_content_verifications?: ContentVerificationRecord | null;
      }
    ),
  };
}

function mapCourseProgressRow(
  raw: Record<string, unknown>
): StudentCourseProgressState {
  return {
    id: String(raw.id),
    course_id: String(raw.course_id),
    last_lesson_id: raw.last_lesson_id ? String(raw.last_lesson_id) : null,
    last_lesson_slug: raw.last_lesson_slug ? String(raw.last_lesson_slug) : null,
    current_lesson_title: raw.current_lesson_title
      ? String(raw.current_lesson_title)
      : null,
    lessons_started: Number(raw.lessons_started) || 0,
    lessons_completed: Number(raw.lessons_completed) || 0,
    total_lessons: Number(raw.total_lessons) || 0,
    progress_percent:
      raw.progress_percent !== null && raw.progress_percent !== undefined
        ? Number(raw.progress_percent)
        : null,
    total_time_spent_seconds: Number(raw.total_time_spent_seconds) || 0,
    last_accessed_at: String(raw.last_accessed_at),
    completed_at: raw.completed_at ? String(raw.completed_at) : null,
  };
}

function mapLessonProgressRow(
  raw: Record<string, unknown>
): StudentLessonProgressState {
  return {
    id: String(raw.id),
    course_id: String(raw.course_id),
    topic_id: String(raw.topic_id),
    lesson_id: String(raw.lesson_id),
    status: (raw.status as "in_progress" | "completed") ?? "in_progress",
    is_completed: Boolean(raw.is_completed),
    time_spent_seconds: Number(raw.time_spent_seconds) || 0,
    started_at: String(raw.started_at),
    last_accessed_at: String(raw.last_accessed_at),
    completed_at: raw.completed_at ? String(raw.completed_at) : null,
  };
}

export function mapExerciseAttemptRow(
  raw: Record<string, unknown>
): StudentExerciseAttemptRecord {
  const breakdown = Array.isArray(raw.evaluation_breakdown)
    ? (raw.evaluation_breakdown as ExerciseQuestionEvaluation[])
    : [];

  return {
    id: String(raw.id),
    course_id: String(raw.course_id),
    lesson_id: String(raw.lesson_id),
    exercise_id: String(raw.exercise_id),
    attempt_number: Number(raw.attempt_number) || 1,
    submitted_answers:
      raw.submitted_answers && typeof raw.submitted_answers === "object"
        ? (raw.submitted_answers as Record<string, string>)
        : {},
    evaluation_breakdown: breakdown,
    gradable_questions_count: Number(raw.gradable_questions_count) || 0,
    correct_answers_count: Number(raw.correct_answers_count) || 0,
    written_responses_count: Number(raw.written_responses_count) || 0,
    earned_points: Number(raw.earned_points) || 0,
    possible_points: Number(raw.possible_points) || 0,
    score_percent:
      raw.score_percent !== null && raw.score_percent !== undefined
        ? Number(raw.score_percent)
        : null,
    time_spent_seconds:
      raw.time_spent_seconds !== null && raw.time_spent_seconds !== undefined
        ? Number(raw.time_spent_seconds)
        : null,
    submitted_at: String(raw.submitted_at),
  };
}

export async function queryLearningLibrary(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string
): Promise<LearningLibraryPayload> {
  const [
    profileRes,
    academicRes,
    unreadNotifsRes,
    curriculaRes,
    levelsRes,
    subjectsRes,
    coursesRes,
    topicsRes,
    lessonsRes,
    courseProgressRes,
    lessonProgressRes,
    bookmarksRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, country, role, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("student_academic_profiles")
      .select(ACADEMIC_PROFILE_COLS)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("student_notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("is_read", false),
    supabase
      .from("learning_curricula")
      .select("id, code, name, academic_category, country, description, sort_order")
      .eq("is_published", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("learning_education_levels")
      .select(
        "id, code, label, academic_category, secondary_stage, qualification_type, sort_order"
      )
      .eq("is_published", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("learning_subjects")
      .select(
        "id, slug, name, learning_category, description, academic_categories, education_levels, curriculum_codes, waec_neco_relevant, faculty_keywords, department_keywords, qualification_keywords, sort_order"
      )
      .eq("is_published", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("learning_courses")
      .select(
        `id, slug, title, subject, subject_id, academic_category, education_level, curriculum, curriculum_id, current_topic, summary, description, thumbnail_url, instructor_name, learning_objectives, estimated_duration_minutes, difficulty, total_lessons, is_published, publication_status, learning_content_sources(${SOURCE_COLS}), learning_content_verifications(${VERIFICATION_COLS})`
      )
      .eq("is_published", true)
      .eq("publication_status", "published")
      .order("created_at", { ascending: true }),
    supabase
      .from("learning_course_topics")
      .select("id, course_id, slug, title, description, topic_order")
      .eq("is_published", true)
      .order("topic_order", { ascending: true }),
    supabase
      .from("learning_lessons")
      .select("id, course_id, topic_id, slug, title, lesson_order")
      .eq("is_published", true)
      .order("lesson_order", { ascending: true }),
    supabase
      .from("student_course_progress")
      .select(
        "id, course_id, last_lesson_id, last_lesson_slug, current_lesson_title, lessons_started, lessons_completed, total_lessons, progress_percent, total_time_spent_seconds, last_accessed_at, completed_at"
      )
      .eq("user_id", userId),
    supabase
      .from("student_lesson_progress")
      .select(
        "id, course_id, topic_id, lesson_id, status, is_completed, time_spent_seconds, started_at, last_accessed_at, completed_at"
      )
      .eq("user_id", userId),
    supabase
      .from("student_lesson_bookmarks")
      .select("id, course_id, lesson_id, note, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  if (academicRes.error) {
    throw academicRes.error;
  }

  const courses = ((coursesRes.data ?? []) as Record<string, unknown>[]).map(
    mapCourseRow
  );
  const courseById = new Map(courses.map((c) => [c.id, c]));

  const topics = (topicsRes.data ?? []) as LearningTopicSummary[];
  const topicById = new Map(topics.map((t) => [t.id, t]));

  const lessons = ((lessonsRes.data ?? []) as Array<{
    id: string;
    course_id: string;
    topic_id: string;
    slug: string;
    title: string;
    lesson_order: number;
  }>)
    .filter((l) => courseById.has(l.course_id) && topicById.has(l.topic_id))
    .map((l) => {
      const parentCourse = courseById.get(l.course_id)!;
      const parentTopic = topicById.get(l.topic_id)!;
      return {
        ...l,
        course_slug: parentCourse.slug,
        course_title: parentCourse.title,
        topic_title: parentTopic.title,
        subject: parentCourse.subject,
      };
    });

  const courseProgressMap: Record<string, StudentCourseProgressState> = {};
  for (const row of (courseProgressRes.data ?? []) as Record<string, unknown>[]) {
    const mapped = mapCourseProgressRow(row);
    courseProgressMap[mapped.course_id] = mapped;
  }

  const lessonProgressMap: Record<string, StudentLessonProgressState> = {};
  for (const row of (lessonProgressRes.data ?? []) as Record<string, unknown>[]) {
    const mapped = mapLessonProgressRow(row);
    lessonProgressMap[mapped.lesson_id] = mapped;
  }

  return {
    userId,
    email: ((profileRes.data as UserProfile | null)?.email ?? userEmail),
    userProfile: (profileRes.data as UserProfile | null) ?? null,
    academicProfile: (academicRes.data as StudentAcademicProfile | null) ?? null,
    unreadNotificationCount: (unreadNotifsRes.data ?? []).length,
    curricula: (curriculaRes.data ?? []) as LearningCurriculumRecord[],
    educationLevels: (levelsRes.data ?? []) as LearningEducationLevelRecord[],
    subjects: (subjectsRes.data ?? []) as LearningSubjectRecord[],
    courses,
    topics,
    lessons,
    courseProgressMap,
    lessonProgressMap,
    bookmarks: (bookmarksRes.data ?? []) as StudentBookmarkRecord[],
  };
}

export async function queryCourseDetail(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string,
  courseSlug: string
): Promise<CourseDetailPayload | null> {
  const [profileRes, academicRes, unreadNotifsRes, courseRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, country, role, created_at, updated_at")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("student_academic_profiles")
        .select(ACADEMIC_PROFILE_COLS)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("student_notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("is_read", false),
      supabase
        .from("learning_courses")
        .select(
          `id, slug, title, subject, subject_id, academic_category, education_level, curriculum, curriculum_id, current_topic, summary, description, thumbnail_url, instructor_name, learning_objectives, estimated_duration_minutes, difficulty, total_lessons, is_published, publication_status, learning_content_sources(${SOURCE_COLS}), learning_content_verifications(${VERIFICATION_COLS})`
        )
        .eq("slug", courseSlug)
        .eq("is_published", true)
        .eq("publication_status", "published")
        .maybeSingle(),
    ]);

  if (!courseRes.data) {
    return null;
  }

  const course = mapCourseRow(courseRes.data as Record<string, unknown>);

  const [
    topicsRes,
    lessonsRes,
    exercisesRes,
    courseProgressRes,
    lessonProgressRes,
    bookmarksRes,
  ] = await Promise.all([
    supabase
      .from("learning_course_topics")
      .select("id, course_id, slug, title, description, topic_order")
      .eq("course_id", course.id)
      .eq("is_published", true)
      .order("topic_order", { ascending: true }),
    supabase
      .from("learning_lessons")
      .select(
        `id, course_id, topic_id, slug, title, lesson_order, introduction, estimated_reading_minutes, learning_content_sources(${SOURCE_COLS}), learning_content_verifications(${VERIFICATION_COLS})`
      )
      .eq("course_id", course.id)
      .eq("is_published", true)
      .order("lesson_order", { ascending: true }),
    supabase
      .from("learning_exercises")
      .select("id")
      .eq("course_id", course.id)
      .eq("is_published", true),
    supabase
      .from("student_course_progress")
      .select(
        "id, course_id, last_lesson_id, last_lesson_slug, current_lesson_title, lessons_started, lessons_completed, total_lessons, progress_percent, total_time_spent_seconds, last_accessed_at, completed_at"
      )
      .eq("user_id", userId)
      .eq("course_id", course.id)
      .maybeSingle(),
    supabase
      .from("student_lesson_progress")
      .select(
        "id, course_id, topic_id, lesson_id, status, is_completed, time_spent_seconds, started_at, last_accessed_at, completed_at"
      )
      .eq("user_id", userId)
      .eq("course_id", course.id),
    supabase
      .from("student_lesson_bookmarks")
      .select("lesson_id")
      .eq("user_id", userId)
      .eq("course_id", course.id),
  ]);

  const lessonsByTopic = new Map<string, LearningLessonSummary[]>();
  for (const raw of (lessonsRes.data ?? []) as Record<string, unknown>[]) {
    const lesson: LearningLessonSummary = {
      id: String(raw.id),
      course_id: String(raw.course_id),
      topic_id: String(raw.topic_id),
      slug: String(raw.slug),
      title: String(raw.title),
      lesson_order: Number(raw.lesson_order) || 1,
      introduction: String(raw.introduction),
      estimated_reading_minutes:
        raw.estimated_reading_minutes !== null &&
        raw.estimated_reading_minutes !== undefined
          ? Number(raw.estimated_reading_minutes)
          : null,
      provenance: mapProvenance(
        raw as {
          learning_content_sources?: ContentSourceRecord | null;
          learning_content_verifications?: ContentVerificationRecord | null;
        }
      ),
    };
    const arr = lessonsByTopic.get(lesson.topic_id) ?? [];
    arr.push(lesson);
    lessonsByTopic.set(lesson.topic_id, arr);
  }

  const topics: CourseTopicWithLessons[] = (
    (topicsRes.data ?? []) as LearningTopicSummary[]
  ).map((t) => ({
    ...t,
    lessons: (lessonsByTopic.get(t.id) ?? []).sort(
      (a, b) => a.lesson_order - b.lesson_order
    ),
  }));

  const orderedLessons = topics.flatMap((t) => t.lessons);

  const lessonProgressMap: Record<string, StudentLessonProgressState> = {};
  for (const row of (lessonProgressRes.data ?? []) as Record<string, unknown>[]) {
    const mapped = mapLessonProgressRow(row);
    lessonProgressMap[mapped.lesson_id] = mapped;
  }

  const courseProgress = courseProgressRes.data
    ? mapCourseProgressRow(courseProgressRes.data as Record<string, unknown>)
    : null;

  // Determine exact Continue Learning lesson target:
  // 1. Last accessed lesson if still valid
  // 2. First incomplete lesson in order
  // 3. First lesson in course
  let continueLessonSlug: string | null = null;
  if (
    courseProgress?.last_lesson_slug &&
    orderedLessons.some((l) => l.slug === courseProgress.last_lesson_slug)
  ) {
    const lastLesson = orderedLessons.find(
      (l) => l.slug === courseProgress.last_lesson_slug
    )!;
    if (!lessonProgressMap[lastLesson.id]?.is_completed) {
      continueLessonSlug = lastLesson.slug;
    }
  }
  if (!continueLessonSlug) {
    const firstIncomplete = orderedLessons.find(
      (l) => !lessonProgressMap[l.id]?.is_completed
    );
    continueLessonSlug =
      firstIncomplete?.slug ?? orderedLessons[0]?.slug ?? null;
  }

  return {
    userId,
    email: ((profileRes.data as UserProfile | null)?.email ?? userEmail),
    userProfile: (profileRes.data as UserProfile | null) ?? null,
    academicProfile: (academicRes.data as StudentAcademicProfile | null) ?? null,
    unreadNotificationCount: (unreadNotifsRes.data ?? []).length,
    course: {
      ...course,
      total_lessons: orderedLessons.length,
    },
    topics,
    exercisesCount: (exercisesRes.data ?? []).length,
    courseProgress,
    lessonProgressMap,
    bookmarkedLessonIds: ((bookmarksRes.data ?? []) as Array<{ lesson_id: string }>).map(
      (b) => b.lesson_id
    ),
    continueLessonSlug,
  };
}

export async function queryLessonDetail(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string,
  courseSlug: string,
  lessonSlug: string
): Promise<LessonDetailPayload | null> {
  const courseDetail = await queryCourseDetail(
    supabase,
    userId,
    userEmail,
    courseSlug
  );
  if (!courseDetail) return null;

  const flatLessons: Array<{
    topic: LearningTopicSummary;
    lesson: LearningLessonSummary;
  }> = [];

  for (const t of courseDetail.topics) {
    for (const l of t.lessons) {
      flatLessons.push({ topic: t, lesson: l });
    }
  }

  const currentIdx = flatLessons.findIndex(
    (item) => item.lesson.slug === lessonSlug
  );
  if (currentIdx === -1) return null;

  const currentEntry = flatLessons[currentIdx];

  const [fullLessonRes, materialsRes, exercisesRes, attemptsRes] =
    await Promise.all([
      supabase
        .from("learning_lessons")
        .select(
          `id, course_id, topic_id, slug, title, lesson_order, introduction, learning_objectives, summary, key_points, estimated_reading_minutes, learning_content_sources(${SOURCE_COLS}), learning_content_verifications(${VERIFICATION_COLS})`
        )
        .eq("id", currentEntry.lesson.id)
        .eq("is_published", true)
        .maybeSingle(),
      supabase
        .from("learning_materials")
        .select(
          `id, lesson_id, material_order, block_type, heading, body, definition_term, formula_expression, formula_notes, example_steps, example_conclusion, table_caption, table_headers, table_rows, diagram_key, image_url, media_alt, media_caption, learning_content_sources(${SOURCE_COLS}), learning_content_verifications(${VERIFICATION_COLS})`
        )
        .eq("lesson_id", currentEntry.lesson.id)
        .eq("is_published", true)
        .order("material_order", { ascending: true }),
      supabase
        .from("learning_exercises")
        .select(
          `id, course_id, lesson_id, title, instructions, exercise_order, allow_retries, learning_content_sources(${SOURCE_COLS}), learning_content_verifications(${VERIFICATION_COLS})`
        )
        .eq("lesson_id", currentEntry.lesson.id)
        .eq("is_published", true)
        .order("exercise_order", { ascending: true }),
      supabase
        .from("student_exercise_attempts")
        .select(
          "id, course_id, lesson_id, exercise_id, attempt_number, submitted_answers, evaluation_breakdown, gradable_questions_count, correct_answers_count, written_responses_count, earned_points, possible_points, score_percent, time_spent_seconds, submitted_at"
        )
        .eq("user_id", userId)
        .eq("lesson_id", currentEntry.lesson.id)
        .order("submitted_at", { ascending: false }),
    ]);

  if (!fullLessonRes.data) return null;
  const fullRaw = fullLessonRes.data as Record<string, unknown>;

  const rawExercises = (exercisesRes.data ?? []) as Record<string, unknown>[];
  const exerciseIds = rawExercises.map((e) => String(e.id));

  let questionsByExercise = new Map<string, LearningExerciseQuestion[]>();

  if (exerciseIds.length > 0) {
    const { data: qData } = await supabase
      .from("learning_exercise_questions")
      .select(
        "id, exercise_id, question_order, question_type, prompt, helper_text, unit_label, points"
      )
      .in("exercise_id", exerciseIds)
      .eq("is_published", true)
      .order("question_order", { ascending: true });

    const qRows = (qData ?? []) as Record<string, unknown>[];
    const qIds = qRows.map((q) => String(q.id));

    const optionsByQuestion = new Map<string, LearningQuestionOption[]>();
    if (qIds.length > 0) {
      const { data: optData } = await supabase
        .from("learning_question_options")
        .select("id, question_id, option_key, option_text, option_order")
        .in("question_id", qIds)
        .order("option_order", { ascending: true });

      for (const opt of (optData ?? []) as LearningQuestionOption[]) {
        const list = optionsByQuestion.get(opt.question_id) ?? [];
        list.push(opt);
        optionsByQuestion.set(opt.question_id, list);
      }
    }

    questionsByExercise = new Map();
    for (const q of qRows) {
      const qId = String(q.id);
      const exId = String(q.exercise_id);
      const mappedQ: LearningExerciseQuestion = {
        id: qId,
        exercise_id: exId,
        question_order: Number(q.question_order) || 1,
        question_type:
          q.question_type as LearningExerciseQuestion["question_type"],
        prompt: String(q.prompt),
        helper_text: q.helper_text ? String(q.helper_text) : null,
        unit_label: q.unit_label ? String(q.unit_label) : null,
        points: Number(q.points) || 0,
        options: optionsByQuestion.get(qId) ?? [],
      };
      const list = questionsByExercise.get(exId) ?? [];
      list.push(mappedQ);
      questionsByExercise.set(exId, list);
    }
  }

  const exercises: LearningExercise[] = rawExercises.map((ex) => {
    const exId = String(ex.id);
    return {
      id: exId,
      course_id: String(ex.course_id),
      lesson_id: String(ex.lesson_id),
      title: String(ex.title),
      instructions: ex.instructions ? String(ex.instructions) : null,
      exercise_order: Number(ex.exercise_order) || 1,
      allow_retries: Boolean(ex.allow_retries),
      provenance: mapProvenance(
        ex as {
          learning_content_sources?: ContentSourceRecord | null;
          learning_content_verifications?: ContentVerificationRecord | null;
        }
      ),
      questions: questionsByExercise.get(exId) ?? [],
    };
  });

  const materials: LearningMaterialBlock[] = (
    (materialsRes.data ?? []) as Record<string, unknown>[]
  ).map((m) => ({
    id: String(m.id),
    lesson_id: String(m.lesson_id),
    material_order: Number(m.material_order) || 1,
    block_type: m.block_type as LearningMaterialBlock["block_type"],
    heading: m.heading ? String(m.heading) : null,
    body: m.body ? String(m.body) : null,
    definition_term: m.definition_term ? String(m.definition_term) : null,
    formula_expression: m.formula_expression
      ? String(m.formula_expression)
      : null,
    formula_notes: m.formula_notes ? String(m.formula_notes) : null,
    example_steps: Array.isArray(m.example_steps)
      ? (m.example_steps as string[])
      : [],
    example_conclusion: m.example_conclusion
      ? String(m.example_conclusion)
      : null,
    table_caption: m.table_caption ? String(m.table_caption) : null,
    table_headers: Array.isArray(m.table_headers)
      ? (m.table_headers as string[])
      : [],
    table_rows: Array.isArray(m.table_rows) ? (m.table_rows as string[][]) : [],
    diagram_key: m.diagram_key ? String(m.diagram_key) : null,
    image_url: m.image_url ? String(m.image_url) : null,
    media_alt: m.media_alt ? String(m.media_alt) : null,
    media_caption: m.media_caption ? String(m.media_caption) : null,
    provenance: mapProvenance(
      m as {
        learning_content_sources?: ContentSourceRecord | null;
        learning_content_verifications?: ContentVerificationRecord | null;
      }
    ),
  }));

  const latestAttemptsByExercise: Record<string, StudentExerciseAttemptRecord> =
    {};
  for (const rawAtt of (attemptsRes.data ?? []) as Record<string, unknown>[]) {
    const mapped = mapExerciseAttemptRow(rawAtt);
    if (!latestAttemptsByExercise[mapped.exercise_id]) {
      latestAttemptsByExercise[mapped.exercise_id] = mapped;
    }
  }

  const prevEntry = currentIdx > 0 ? flatLessons[currentIdx - 1] : null;
  const nextEntry =
    currentIdx < flatLessons.length - 1 ? flatLessons[currentIdx + 1] : null;

  return {
    userId,
    email: courseDetail.email,
    userProfile: courseDetail.userProfile,
    academicProfile: courseDetail.academicProfile,
    unreadNotificationCount: courseDetail.unreadNotificationCount,
    course: courseDetail.course,
    topic: currentEntry.topic,
    lesson: {
      ...currentEntry.lesson,
      learning_objectives: Array.isArray(fullRaw.learning_objectives)
        ? (fullRaw.learning_objectives as string[])
        : [],
      summary: fullRaw.summary ? String(fullRaw.summary) : null,
      key_points: Array.isArray(fullRaw.key_points)
        ? (fullRaw.key_points as string[])
        : [],
    },
    materials,
    exercises,
    allTopics: courseDetail.topics,
    previousLesson: prevEntry
      ? {
          slug: prevEntry.lesson.slug,
          title: prevEntry.lesson.title,
          topicTitle: prevEntry.topic.title,
        }
      : null,
    nextLesson: nextEntry
      ? {
          slug: nextEntry.lesson.slug,
          title: nextEntry.lesson.title,
          topicTitle: nextEntry.topic.title,
        }
      : null,
    courseProgress: courseDetail.courseProgress,
    lessonProgressMap: courseDetail.lessonProgressMap,
    isBookmarked: courseDetail.bookmarkedLessonIds.includes(
      currentEntry.lesson.id
    ),
    latestAttemptsByExercise,
  };
}
