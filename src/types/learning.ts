import type { UserProfile } from "@/types/auth";
import type {
  AcademicCategory,
  StudentAcademicProfile,
} from "@/types/onboarding";

export type ContentClassification =
  | "verified"
  | "ai_generated"
  | "imported_third_party";

export type VerificationStatus =
  | "draft"
  | "pending_review"
  | "verified"
  | "unverified_ai"
  | "attributed_third_party"
  | "rejected";

export type CourseDifficulty = "foundational" | "intermediate" | "advanced";

export type PublicationStatus =
  | "draft"
  | "in_review"
  | "published"
  | "archived";

export type LearningCategoryName =
  | "Mathematics"
  | "English Language"
  | "Physics"
  | "Chemistry"
  | "Biology"
  | "Computer Studies"
  | "Economics"
  | "Government"
  | "Literature"
  | "Technical and vocational subjects"
  | "Departmental & Advanced Studies";

export type MaterialBlockType =
  | "explanation"
  | "subheading"
  | "definition"
  | "worked_example"
  | "formula"
  | "table"
  | "diagram";

export type ExerciseQuestionType =
  | "multiple_choice"
  | "true_false"
  | "short_answer"
  | "numerical"
  | "written_response";

export interface ContentSourceRecord {
  id: string;
  slug: string;
  source_name: string;
  source_url_or_reference: string | null;
  author_or_publisher: string;
  content_classification: ContentClassification;
  license_or_permission: string;
  attribution_text: string | null;
}

export interface ContentVerificationRecord {
  id: string;
  code: string;
  source_id: string;
  content_classification: ContentClassification;
  verification_status: VerificationStatus;
  approved_for_publication: boolean;
  reviewer_name: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

export interface ContentProvenance {
  source: ContentSourceRecord | null;
  verification: ContentVerificationRecord | null;
}

export interface LearningCurriculumRecord {
  id: string;
  code: string;
  name: string;
  academic_category: AcademicCategory | "all";
  country: string | null;
  description: string | null;
  sort_order: number;
}

export interface LearningEducationLevelRecord {
  id: string;
  code: string;
  label: string;
  academic_category: AcademicCategory;
  secondary_stage: "junior" | "senior" | null;
  qualification_type: string | null;
  sort_order: number;
}

export interface LearningSubjectRecord {
  id: string;
  slug: string;
  name: string;
  learning_category: LearningCategoryName;
  description: string | null;
  academic_categories: string[];
  education_levels: string[];
  curriculum_codes: string[];
  waec_neco_relevant: boolean;
  faculty_keywords: string[];
  department_keywords: string[];
  qualification_keywords: string[];
  sort_order: number;
}

export interface LearningCourseCatalogItem {
  id: string;
  slug: string;
  title: string;
  subject: string;
  subject_id: string | null;
  academic_category: AcademicCategory | "all";
  education_level: string | null;
  curriculum: string | null;
  curriculum_id: string | null;
  current_topic: string | null;
  summary: string | null;
  description: string | null;
  thumbnail_url: string | null;
  instructor_name: string | null;
  learning_objectives: string[];
  estimated_duration_minutes: number | null;
  difficulty: CourseDifficulty | null;
  total_lessons: number;
  is_published: boolean;
  publication_status: PublicationStatus;
  provenance: ContentProvenance;
}

export interface LearningTopicSummary {
  id: string;
  course_id: string;
  slug: string;
  title: string;
  description: string | null;
  topic_order: number;
}

export interface LearningLessonSummary {
  id: string;
  course_id: string;
  topic_id: string;
  slug: string;
  title: string;
  lesson_order: number;
  introduction: string;
  estimated_reading_minutes: number | null;
  provenance: ContentProvenance;
}

export interface LearningMaterialBlock {
  id: string;
  lesson_id: string;
  material_order: number;
  block_type: MaterialBlockType;
  heading: string | null;
  body: string | null;
  definition_term: string | null;
  formula_expression: string | null;
  formula_notes: string | null;
  example_steps: string[];
  example_conclusion: string | null;
  table_caption: string | null;
  table_headers: string[];
  table_rows: string[][];
  diagram_key: string | null;
  image_url: string | null;
  media_alt: string | null;
  media_caption: string | null;
  provenance: ContentProvenance;
}

export interface LearningQuestionOption {
  id: string;
  question_id: string;
  option_key: string;
  option_text: string;
  option_order: number;
}

export interface LearningExerciseQuestion {
  id: string;
  exercise_id: string;
  question_order: number;
  question_type: ExerciseQuestionType;
  prompt: string;
  helper_text: string | null;
  unit_label: string | null;
  points: number;
  options: LearningQuestionOption[];
}

export interface LearningExercise {
  id: string;
  course_id: string;
  lesson_id: string;
  title: string;
  instructions: string | null;
  exercise_order: number;
  allow_retries: boolean;
  provenance: ContentProvenance;
  questions: LearningExerciseQuestion[];
}

export interface StudentCourseProgressState {
  id: string;
  course_id: string;
  last_lesson_id: string | null;
  last_lesson_slug: string | null;
  current_lesson_title: string | null;
  lessons_started: number;
  lessons_completed: number;
  total_lessons: number;
  progress_percent: number | null;
  total_time_spent_seconds: number;
  last_accessed_at: string;
  completed_at: string | null;
}

export interface StudentLessonProgressState {
  id: string;
  course_id: string;
  topic_id: string;
  lesson_id: string;
  status: "in_progress" | "completed";
  is_completed: boolean;
  time_spent_seconds: number;
  started_at: string;
  last_accessed_at: string;
  completed_at: string | null;
}

export interface StudentBookmarkRecord {
  id: string;
  course_id: string;
  lesson_id: string;
  note: string | null;
  created_at: string;
}

export interface ExerciseQuestionEvaluation {
  questionId: string;
  questionOrder: number;
  questionType: ExerciseQuestionType;
  studentAnswer: string;
  status: "correct" | "incorrect" | "written_recorded" | "unanswered";
  isCorrect: boolean | null;
  isOfficiallyMarked: boolean;
  earnedPoints: number;
  possiblePoints: number;
  correctAnswerDisplay: string;
  explanation: string;
  rubricGuidance: string[];
}

export interface StudentExerciseAttemptRecord {
  id: string;
  course_id: string;
  lesson_id: string;
  exercise_id: string;
  attempt_number: number;
  submitted_answers: Record<string, string>;
  evaluation_breakdown: ExerciseQuestionEvaluation[];
  gradable_questions_count: number;
  correct_answers_count: number;
  written_responses_count: number;
  earned_points: number;
  possible_points: number;
  score_percent: number | null;
  time_spent_seconds: number | null;
  submitted_at: string;
}

export interface LearningLibraryPayload {
  userId: string;
  email: string;
  userProfile: UserProfile | null;
  academicProfile: StudentAcademicProfile | null;
  unreadNotificationCount: number;
  curricula: LearningCurriculumRecord[];
  educationLevels: LearningEducationLevelRecord[];
  subjects: LearningSubjectRecord[];
  courses: LearningCourseCatalogItem[];
  topics: LearningTopicSummary[];
  lessons: Array<{
    id: string;
    course_id: string;
    course_slug: string;
    course_title: string;
    topic_id: string;
    topic_title: string;
    slug: string;
    title: string;
    subject: string;
    lesson_order: number;
  }>;
  courseProgressMap: Record<string, StudentCourseProgressState>;
  lessonProgressMap: Record<string, StudentLessonProgressState>;
  bookmarks: StudentBookmarkRecord[];
}

export interface CourseTopicWithLessons extends LearningTopicSummary {
  lessons: LearningLessonSummary[];
}

export interface CourseDetailPayload {
  userId: string;
  email: string;
  userProfile: UserProfile | null;
  academicProfile: StudentAcademicProfile | null;
  unreadNotificationCount: number;
  course: LearningCourseCatalogItem;
  topics: CourseTopicWithLessons[];
  exercisesCount: number;
  courseProgress: StudentCourseProgressState | null;
  lessonProgressMap: Record<string, StudentLessonProgressState>;
  bookmarkedLessonIds: string[];
  continueLessonSlug: string | null;
}

export interface LessonNavigationNeighbor {
  slug: string;
  title: string;
  topicTitle: string;
}

export interface LessonDetailPayload {
  userId: string;
  email: string;
  userProfile: UserProfile | null;
  academicProfile: StudentAcademicProfile | null;
  unreadNotificationCount: number;
  course: LearningCourseCatalogItem;
  topic: LearningTopicSummary;
  lesson: LearningLessonSummary & {
    learning_objectives: string[];
    summary: string | null;
    key_points: string[];
  };
  materials: LearningMaterialBlock[];
  exercises: LearningExercise[];
  allTopics: CourseTopicWithLessons[];
  previousLesson: LessonNavigationNeighbor | null;
  nextLesson: LessonNavigationNeighbor | null;
  courseProgress: StudentCourseProgressState | null;
  lessonProgressMap: Record<string, StudentLessonProgressState>;
  isBookmarked: boolean;
  latestAttemptsByExercise: Record<string, StudentExerciseAttemptRecord>;
}
