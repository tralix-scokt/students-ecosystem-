import type {
  DashboardSearchResult,
  OngoingCourseItem,
  PublishedLearningCourse,
} from "@/types/dashboard";
import type { StudentAcademicProfile } from "@/types/onboarding";

export interface ExamPathwayBadge {
  code: string;
  title: string;
  description: string;
  isPrimary?: boolean;
}

export interface ExamPreparationContext {
  pathwayTitle: string;
  supportingCopy: string;
  ctaLabel: string;
  tracks: ExamPathwayBadge[];
}

export function buildExamPreparationContext(
  academicProfile: StudentAcademicProfile | null
): ExamPreparationContext {
  if (!academicProfile || !academicProfile.academic_category) {
    return {
      pathwayTitle: "Academic Examination Readiness",
      supportingCopy:
        "Structured revision workflows and syllabus-aligned practice will appear here based on your academic profile.",
      ctaLabel: "Open Exam Preparation",
      tracks: [
        {
          code: "EXAMS",
          title: "General Examination Readiness",
          description: "Syllabus-guided revision and structured preparation.",
          isPrimary: true,
        },
      ],
    };
  }

  const category = academicProfile.academic_category;
  const isNigeria =
    (academicProfile.country ?? "").trim().toLowerCase() === "nigeria";
  const isSeniorSecondary =
    academicProfile.secondary_category === "senior" ||
    Boolean(academicProfile.academic_level?.startsWith("SS"));

  if (category === "secondary" && isNigeria) {
    if (isSeniorSecondary) {
      return {
        pathwayTitle: "Nigerian Senior Secondary Exam Pathways",
        supportingCopy: `Tailored for ${academicProfile.academic_level || "Senior Secondary"} students preparing for national certificate and matriculation examinations.`,
        ctaLabel: "Explore Exam Pathways",
        tracks: [
          {
            code: "WAEC",
            title: "WAEC (WASSCE)",
            description:
              "West African Senior School Certificate syllabus alignment.",
            isPrimary: true,
          },
          {
            code: "NECO",
            title: "NECO (SSCE)",
            description:
              "National Examinations Council senior secondary readiness.",
            isPrimary: true,
          },
          {
            code: "JAMB UTME",
            title: "JAMB UTME",
            description:
              "Unified Tertiary Matriculation Examination subject preparation.",
            isPrimary: true,
          },
        ],
      };
    }

    // Nigerian Junior Secondary (JSS 1–JSS 3): WAEC & NECO prioritized; JAMB UTME omitted until Senior Secondary
    return {
      pathwayTitle: "Nigerian Junior Secondary Exam Pathways",
      supportingCopy: `Aligned with ${academicProfile.academic_level || "Junior Secondary"} basic education certificate standards and foundational WAEC/NECO readiness.`,
      ctaLabel: "Explore Exam Pathways",
      tracks: [
        {
          code: "WAEC",
          title: "WAEC Foundation & BECE",
          description:
            "Basic Education Certificate and Junior Secondary core standards.",
          isPrimary: true,
        },
        {
          code: "NECO",
          title: "NECO BECE",
          description:
            "National Junior Secondary certificate curriculum alignment.",
          isPrimary: true,
        },
      ],
    };
  }

  if (category === "secondary") {
    return {
      pathwayTitle: "Secondary School Examination Preparation",
      supportingCopy: `Aligned with ${academicProfile.curriculum || "your secondary school curriculum"} (${academicProfile.academic_level || "Secondary"}).`,
      ctaLabel: "Open Exam Preparation",
      tracks: [
        {
          code: "CURRICULUM",
          title: academicProfile.curriculum || "Secondary Certificate Prep",
          description:
            "Structured topic mastery and school examination readiness.",
          isPrimary: true,
        },
      ],
    };
  }

  if (category === "university") {
    const levelLabel =
      academicProfile.academic_level &&
      academicProfile.academic_level !== "Other"
        ? `${academicProfile.academic_level} Level`
        : academicProfile.academic_level || "Undergraduate";
    return {
      pathwayTitle: "University Examination Preparation",
      supportingCopy: `General academic examination preparation tailored for ${academicProfile.course_or_program || "your degree program"} (${levelLabel}).`,
      ctaLabel: "Open Exam Preparation",
      tracks: [
        {
          code: "SEMESTER",
          title: "Course & Semester Examinations",
          description: `${academicProfile.department || "Departmental"} continuous assessment and end-of-semester exam readiness.`,
          isPrimary: true,
        },
      ],
    };
  }

  // Polytechnic / Technical College
  return {
    pathwayTitle: "Polytechnic & Technical Examination Preparation",
    supportingCopy: `General academic and technical assessment preparation for ${academicProfile.course_or_program || "your program"} (${[academicProfile.qualification_type, academicProfile.academic_level].filter(Boolean).join(" • ") || "Technical Pathway"}).`,
    ctaLabel: "Open Exam Preparation",
    tracks: [
      {
        code: academicProfile.qualification_type || "TECHNICAL",
        title: "Diploma & Technical Assessments",
        description: `${academicProfile.department || "Departmental"} theory, practical, and semester examination readiness.`,
        isPrimary: true,
      },
    ],
  };
}

/**
 * Searches ONLY actual available content:
 * 1. Published courses, lessons, and topics from public.learning_courses
 * 2. Ongoing course lessons from the student's real progress records
 * 3. Real selected subjects / course of study saved in the student's academic profile
 */
export function searchAvailableDashboardContent(
  query: string,
  params: {
    publishedCourses: PublishedLearningCourse[];
    ongoingCourses: OngoingCourseItem[];
    academicProfile: StudentAcademicProfile | null;
  }
): DashboardSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: DashboardSearchResult[] = [];
  const seenIds = new Set<string>();

  for (const course of params.publishedCourses) {
    const matchesTitle = course.title.toLowerCase().includes(q);
    const matchesSubject = course.subject.toLowerCase().includes(q);
    const matchesTopic = (course.current_topic ?? "")
      .toLowerCase()
      .includes(q);

    if (matchesTitle || matchesSubject) {
      const id = `course:${course.id}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        results.push({
          id,
          kind: "course",
          title: course.title,
          subtitle: `${course.subject}${course.current_topic ? ` • ${course.current_topic}` : ""}`,
          href: `/dashboard/learn/courses/${encodeURIComponent(course.slug)}`,
        });
      }
    }

    if (matchesTopic && course.current_topic) {
      const id = `topic:${course.id}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        results.push({
          id,
          kind: "topic",
          title: course.current_topic,
          subtitle: `Topic in ${course.title}`,
          href: `/dashboard/learn/courses/${encodeURIComponent(course.slug)}`,
        });
      }
    }
  }

  for (const ongoing of params.ongoingCourses) {
    if (
      ongoing.topic_or_lesson &&
      ongoing.topic_or_lesson.toLowerCase().includes(q)
    ) {
      const id = `lesson:${ongoing.id}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        results.push({
          id,
          kind: "lesson",
          title: ongoing.topic_or_lesson,
          subtitle: `Ongoing lesson • ${ongoing.course_title}`,
          href: ongoing.last_lesson_slug
            ? `/dashboard/learn/courses/${encodeURIComponent(ongoing.course_slug)}/lessons/${encodeURIComponent(ongoing.last_lesson_slug)}`
            : `/dashboard/learn/courses/${encodeURIComponent(ongoing.course_slug)}`,
        });
      }
    }
  }

  const subjects = params.academicProfile?.selected_subjects ?? [];
  for (const sub of subjects) {
    if (sub.toLowerCase().includes(q)) {
      const id = `subject:${sub.toLowerCase()}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        results.push({
          id,
          kind: "subject",
          title: sub,
          subtitle: "Your enrolled academic subject",
          href: `/dashboard/learn?subject=${encodeURIComponent(sub)}`,
        });
      }
    }
  }

  const program = params.academicProfile?.course_or_program;
  if (program && program.toLowerCase().includes(q)) {
    const id = `program:${program.toLowerCase()}`;
    if (!seenIds.has(id)) {
      seenIds.add(id);
      results.push({
        id,
        kind: "subject",
        title: program,
        subtitle: "Your academic course / program",
        href: `/dashboard/learn?subject=${encodeURIComponent(program)}`,
      });
    }
  }

  return results.slice(0, 10);
}
