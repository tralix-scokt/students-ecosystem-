import type { UserProfile } from "@/types/auth";
import type {
  ContentClassification,
  LearningSubjectRecord,
} from "@/types/learning";
import type {
  AcademicCategory,
  StudentAcademicProfile,
} from "@/types/onboarding";

export type DashboardNavId =
  | "dashboard"
  | "learn"
  | "ai-tutor"
  | "exams"
  | "planner"
  | "notes"
  | "progress"
  | "notifications"
  | "profile"
  | "settings";

export interface PublishedLearningCourse {
  id: string;
  slug: string;
  title: string;
  subject: string;
  academic_category: AcademicCategory | "all";
  education_level?: string | null;
  curriculum?: string | null;
  current_topic: string | null;
  summary: string | null;
  total_lessons: number;
  is_published: boolean;
  content_classification?: ContentClassification | null;
}

export interface OngoingCourseItem {
  id: string;
  course_id: string;
  course_slug: string;
  course_title: string;
  subject: string;
  topic_or_lesson: string | null;
  last_lesson_slug?: string | null;
  lessons_started?: number;
  lessons_completed: number;
  total_lessons: number;
  progress_percent: number | null;
  total_time_spent_seconds?: number;
  last_accessed_at: string;
  completed_at?: string | null;
}

export interface RecentLessonActivityItem {
  id: string;
  lesson_id: string;
  lesson_slug: string;
  lesson_title: string;
  course_id: string;
  course_slug: string;
  course_title: string;
  subject: string;
  status: "in_progress" | "completed";
  is_completed: boolean;
  time_spent_seconds: number;
  last_accessed_at: string;
  completed_at: string | null;
}

export interface BookmarkedLessonItem {
  id: string;
  lesson_id: string;
  lesson_slug: string;
  lesson_title: string;
  course_id: string;
  course_slug: string;
  course_title: string;
  subject: string;
  note: string | null;
  created_at: string;
}

export interface SubjectLearningProgressItem {
  subject: string;
  courses_started: number;
  courses_completed: number;
  lessons_completed: number;
  total_lessons: number;
  progress_percent: number;
  time_spent_seconds: number;
}

export interface StudySessionRecord {
  id: string;
  title: string;
  subject: string;
  scheduled_date: string;
  start_time: string | null;
  duration_minutes: number | null;
  status: "scheduled" | "in_progress" | "completed" | "skipped";
}

export interface AssignmentRecord {
  id: string;
  title: string;
  subject: string;
  due_at: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed" | "overdue";
}

export interface AssessmentResultRecord {
  id: string;
  title: string;
  subject: string;
  score_percent: number;
  recorded_at: string;
}

export interface SubjectPerformanceSummary {
  subject: string;
  average_score: number;
  assessments_count: number;
}

export interface AcademicProgressMetrics {
  hasAnyActivity: boolean;
  lessonsStarted?: number;
  lessonsCompleted: number;
  coursesStarted?: number;
  coursesInProgress: number;
  coursesCompleted?: number;
  exercisesAttempted?: number;
  totalTimeSpentSeconds?: number;
  assessmentsCount: number;
  averageAssessmentScore: number | null;
  recentAssessments: AssessmentResultRecord[];
  subjectPerformance: SubjectPerformanceSummary[];
}

export interface StudentNotificationRecord {
  id: string;
  title: string;
  body: string;
  category:
    | "system"
    | "learning"
    | "exam"
    | "planner"
    | "assignment"
    | "announcement";
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface DashboardSearchResult {
  id: string;
  kind: "course" | "subject" | "lesson" | "topic";
  title: string;
  subtitle: string;
  href: string;
}

export interface StudentDashboardPayload {
  authenticated: boolean;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  userId: string;
  email: string;
  userProfile: UserProfile | null;
  academicProfile: StudentAcademicProfile | null;
  ongoingCourses: OngoingCourseItem[];
  allCourseProgress?: OngoingCourseItem[];
  publishedCourses: PublishedLearningCourse[];
  catalogSubjects?: LearningSubjectRecord[];
  recentLessons?: RecentLessonActivityItem[];
  bookmarkedLessons?: BookmarkedLessonItem[];
  subjectLearningProgress?: SubjectLearningProgressItem[];
  todayStudySessions: StudySessionRecord[];
  upcomingStudySessions: StudySessionRecord[];
  upcomingAssignments: AssignmentRecord[];
  progressMetrics: AcademicProgressMetrics;
  notifications: StudentNotificationRecord[];
  unreadNotificationCount: number;
}
