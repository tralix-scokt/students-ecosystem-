import type {
  ContentClassification,
  ContentProvenance,
  LearningCategoryName,
  LearningCourseCatalogItem,
  LearningSubjectRecord,
} from "@/types/learning";
import type {
  AcademicCategory,
  StudentAcademicProfile,
} from "@/types/onboarding";

export const LEARNING_CATEGORY_LABELS: readonly LearningCategoryName[] = [
  "Mathematics",
  "English Language",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Studies",
  "Economics",
  "Government",
  "Literature",
  "Technical and vocational subjects",
  "Departmental & Advanced Studies",
];

export interface SubjectRelevanceMatch {
  subject: LearningSubjectRecord;
  isEnrolledSubject: boolean;
  isPathwayMatched: boolean;
  relevanceReason: string;
  priorityScore: number;
}

/**
 * Determines which subjects belong to the student's personalized learning view
 * versus broader catalog exploration — strictly enforcing Sections 2 & 3:
 *   - Secondary JSS students see Junior Secondary subjects (e.g. Mathematics,
 *     English Language, Computer Studies, Basic Science & Technology) and do NOT
 *     have SS-only or Polytechnic subjects dumped onto them.
 *   - Secondary SS students see Senior Secondary subjects aligned with their
 *     class & Nigerian WAEC/NECO relevance where appropriate.
 *   - University students see subjects matching their selected subjects, course,
 *     department, and faculty first.
 *   - Polytechnic & Technical students see subjects matching their department,
 *     qualification (ND/HND/Vocational), and technical program.
 */
export function getPersonalizedSubjectsForProfile(
  subjects: LearningSubjectRecord[],
  academicProfile: StudentAcademicProfile | null
): SubjectRelevanceMatch[] {
  if (!academicProfile || !academicProfile.academic_category) {
    return subjects.map((subject) => ({
      subject,
      isEnrolledSubject: false,
      isPathwayMatched: true,
      relevanceReason: "Available academic subject",
      priorityScore: 100 - subject.sort_order,
    }));
  }

  const category = academicProfile.academic_category;
  const level = (academicProfile.academic_level ?? "").trim();
  const isNigeria =
    (academicProfile.country ?? "").trim().toLowerCase() === "nigeria";
  const selectedLower = new Set(
    (academicProfile.selected_subjects ?? []).map((s) => s.trim().toLowerCase())
  );
  const facultyText = (academicProfile.faculty ?? "").trim().toLowerCase();
  const deptText = (academicProfile.department ?? "").trim().toLowerCase();
  const programText = (academicProfile.course_or_program ?? "")
    .trim()
    .toLowerCase();
  const qualification = (academicProfile.qualification_type ?? "")
    .trim()
    .toLowerCase();

  const matches: SubjectRelevanceMatch[] = [];

  for (const subject of subjects) {
    if (!subject.academic_categories.includes(category)) {
      continue;
    }

    const isEnrolled =
      selectedLower.has(subject.name.toLowerCase()) ||
      selectedLower.has(subject.learning_category.toLowerCase());

    if (category === "secondary") {
      // Enforce strict JSS vs SS level appropriateness
      const isJuniorProfile =
        academicProfile.secondary_category === "junior" ||
        level.toUpperCase().startsWith("JSS");
      const isSeniorProfile =
        academicProfile.secondary_category === "senior" ||
        level.toUpperCase().startsWith("SS");

      if (subject.education_levels.length > 0) {
        if (level && subject.education_levels.includes(level)) {
          // exact class match
        } else if (
          isJuniorProfile &&
          !subject.education_levels.some((l) => l.startsWith("JSS"))
        ) {
          continue;
        } else if (
          isSeniorProfile &&
          !subject.education_levels.some((l) => l.startsWith("SS"))
        ) {
          continue;
        }
      }

      const reason = isEnrolled
        ? "In your selected subjects"
        : isNigeria && isSeniorProfile && subject.waec_neco_relevant
          ? `Aligned with ${level || "Senior Secondary"} syllabus (WAEC / NECO relevant)`
          : `Aligned with ${level || "Secondary School"} curriculum`;

      const score =
        (isEnrolled ? 500 : 0) +
        (isNigeria && isSeniorProfile && subject.waec_neco_relevant ? 120 : 60) -
        subject.sort_order;

      matches.push({
        subject,
        isEnrolledSubject: isEnrolled,
        isPathwayMatched: true,
        relevanceReason: reason,
        priorityScore: score,
      });
      continue;
    }

    if (category === "university") {
      const deptMatch = subject.department_keywords.some(
        (kw) =>
          (deptText && deptText.includes(kw.toLowerCase())) ||
          (programText && programText.includes(kw.toLowerCase()))
      );
      const facultyMatch = subject.faculty_keywords.some(
        (kw) => facultyText && facultyText.includes(kw.toLowerCase())
      );
      const generalCore =
        subject.slug === "english-language" && level === "100";

      // Show subjects directly related to course, department, faculty, or selected subjects
      // (or general 100L foundation if none matched yet)
      if (!isEnrolled && !deptMatch && !facultyMatch && !generalCore) {
        continue;
      }

      const reason = isEnrolled
        ? "In your selected university courses/subjects"
        : deptMatch
          ? `Relevant to ${academicProfile.course_or_program || academicProfile.department || "your department"}`
          : facultyMatch
            ? `Relevant to ${academicProfile.faculty || "your faculty"}`
            : "100 Level general academic foundation";

      const score =
        (isEnrolled ? 500 : 0) +
        (deptMatch ? 300 : 0) +
        (facultyMatch ? 150 : 50) -
        subject.sort_order;

      matches.push({
        subject,
        isEnrolledSubject: isEnrolled,
        isPathwayMatched: true,
        relevanceReason: reason,
        priorityScore: score,
      });
      continue;
    }

    // Polytechnic / Technical College
    const polyDeptMatch = subject.department_keywords.some(
      (kw) =>
        (deptText && deptText.includes(kw.toLowerCase())) ||
        (programText && programText.includes(kw.toLowerCase()))
    );
    const qualMatch = subject.qualification_keywords.some(
      (q) => qualification && q.toLowerCase() === qualification
    );
    const isTechnicalCategory =
      subject.learning_category === "Technical and vocational subjects";

    if (!isEnrolled && !polyDeptMatch && !isTechnicalCategory && !qualMatch) {
      continue;
    }

    const reason = isEnrolled
      ? "In your selected technical subjects"
      : polyDeptMatch
        ? `Relevant to ${academicProfile.department || academicProfile.course_or_program || "your technical program"}`
        : `Relevant to ${academicProfile.qualification_type || "Polytechnic & Technical"} studies`;

    const score =
      (isEnrolled ? 500 : 0) +
      (polyDeptMatch ? 320 : 0) +
      (isTechnicalCategory ? 200 : 80) -
      subject.sort_order;

    matches.push({
      subject,
      isEnrolledSubject: isEnrolled,
      isPathwayMatched: true,
      relevanceReason: reason,
      priorityScore: score,
    });
  }

  // Fallback: if a custom university/polytechnic department matched 0 keywords, surface category-compatible subjects
  if (matches.length === 0) {
    return subjects
      .filter((s) => s.academic_categories.includes(category))
      .map((subject) => ({
        subject,
        isEnrolledSubject: false,
        isPathwayMatched: true,
        relevanceReason: `Available for ${category} learners`,
        priorityScore: 100 - subject.sort_order,
      }));
  }

  return matches.sort((a, b) => b.priorityScore - a.priorityScore);
}

export interface LibraryFilterState {
  query: string;
  exploreAllSubjects: boolean;
  academicCategory: AcademicCategory | "all";
  educationLevel: string;
  curriculumCode: string;
  learningCategory: string;
  subjectSlug: string;
  courseSlug: string;
}

export function filterLibraryCatalog(params: {
  subjects: LearningSubjectRecord[];
  courses: LearningCourseCatalogItem[];
  topics: Array<{ id: string; course_id: string; title: string; slug: string }>;
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
  }>;
  academicProfile: StudentAcademicProfile | null;
  filters: LibraryFilterState;
}) {
  const { subjects, courses, topics, lessons, academicProfile, filters } =
    params;
  const q = filters.query.trim().toLowerCase();

  const personalizedMatches = getPersonalizedSubjectsForProfile(
    subjects,
    academicProfile
  );
  const personalizedMap = new Map(
    personalizedMatches.map((m) => [m.subject.id, m])
  );

  // Determine base subject pool: personalized vs explore-all
  const candidateSubjects = filters.exploreAllSubjects
    ? subjects
    : personalizedMatches.map((m) => m.subject);

  const filteredSubjects = candidateSubjects.filter((sub) => {
    if (
      filters.academicCategory !== "all" &&
      !sub.academic_categories.includes(filters.academicCategory)
    ) {
      return false;
    }
    if (
      filters.educationLevel &&
      sub.education_levels.length > 0 &&
      !sub.education_levels.includes(filters.educationLevel)
    ) {
      return false;
    }
    if (
      filters.curriculumCode &&
      sub.curriculum_codes.length > 0 &&
      !sub.curriculum_codes.includes(filters.curriculumCode)
    ) {
      return false;
    }
    if (
      filters.learningCategory &&
      sub.learning_category !== filters.learningCategory
    ) {
      return false;
    }
    if (filters.subjectSlug && sub.slug !== filters.subjectSlug) {
      return false;
    }
    if (q) {
      const subMatches =
        sub.name.toLowerCase().includes(q) ||
        sub.learning_category.toLowerCase().includes(q) ||
        (sub.description ?? "").toLowerCase().includes(q);
      const childCourseMatches = courses.some(
        (c) =>
          (c.subject_id === sub.id ||
            c.subject.toLowerCase() === sub.name.toLowerCase()) &&
          (c.title.toLowerCase().includes(q) ||
            (c.summary ?? "").toLowerCase().includes(q))
      );
      const childLessonMatches = lessons.some(
        (l) =>
          l.subject.toLowerCase() === sub.name.toLowerCase() &&
          (l.title.toLowerCase().includes(q) ||
            l.topic_title.toLowerCase().includes(q))
      );
      if (!subMatches && !childCourseMatches && !childLessonMatches) {
        return false;
      }
    }
    return true;
  });

  const allowedSubjectIds = new Set(filteredSubjects.map((s) => s.id));
  const allowedSubjectNames = new Set(
    filteredSubjects.map((s) => s.name.toLowerCase())
  );

  const filteredCourses = courses.filter((course) => {
    if (!course.is_published || course.publication_status !== "published") {
      return false;
    }
    if (
      !filters.exploreAllSubjects &&
      academicProfile?.academic_category &&
      course.academic_category !== "all" &&
      course.academic_category !== academicProfile.academic_category
    ) {
      return false;
    }
    if (
      filters.academicCategory !== "all" &&
      course.academic_category !== "all" &&
      course.academic_category !== filters.academicCategory
    ) {
      return false;
    }
    if (
      filters.educationLevel &&
      course.education_level &&
      course.education_level !== filters.educationLevel
    ) {
      return false;
    }
    if (filters.courseSlug && course.slug !== filters.courseSlug) {
      return false;
    }
    if (filters.subjectSlug) {
      const matchesSelectedSub =
        (course.subject_id && allowedSubjectIds.has(course.subject_id)) ||
        allowedSubjectNames.has(course.subject.toLowerCase());
      if (!matchesSelectedSub) return false;
    } else if (!filters.exploreAllSubjects && !q) {
      const inPersonalizedPool =
        (course.subject_id && allowedSubjectIds.has(course.subject_id)) ||
        allowedSubjectNames.has(course.subject.toLowerCase());
      if (!inPersonalizedPool) return false;
    }

    if (q) {
      const courseMatches =
        course.title.toLowerCase().includes(q) ||
        course.subject.toLowerCase().includes(q) ||
        (course.summary ?? "").toLowerCase().includes(q) ||
        (course.description ?? "").toLowerCase().includes(q);
      const topicMatches = topics.some(
        (t) =>
          t.course_id === course.id && t.title.toLowerCase().includes(q)
      );
      const lessonMatches = lessons.some(
        (l) =>
          l.course_id === course.id && l.title.toLowerCase().includes(q)
      );
      if (!courseMatches && !topicMatches && !lessonMatches) {
        return false;
      }
    }

    return true;
  });

  const matchingLessons = q
    ? lessons.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.topic_title.toLowerCase().includes(q) ||
          l.subject.toLowerCase().includes(q) ||
          l.course_title.toLowerCase().includes(q)
      )
    : [];

  return {
    personalizedMap,
    filteredSubjects,
    filteredCourses,
    matchingLessons,
  };
}

/**
 * Formats visible, truthful labels for content source classifications (Section 6).
 * AI-generated content is NEVER labeled as verified.
 */
export function describeContentClassification(
  classification: ContentClassification | null | undefined,
  provenance?: ContentProvenance
): {
  badgeLabel: string;
  shortLabel: string;
  statusNote: string;
  tone: "emerald" | "amber" | "cyan";
} {
  if (
    classification === "verified" &&
    provenance?.verification?.verification_status === "verified" &&
    provenance.verification.reviewer_name
  ) {
    return {
      badgeLabel: "Verified Educational Content",
      shortLabel: "Verified Content",
      statusNote: `Reviewed by ${provenance.verification.reviewer_name}`,
      tone: "emerald",
    };
  }

  if (classification === "imported_third_party") {
    return {
      badgeLabel: "Imported / Third-Party Licensed Content",
      shortLabel: "Licensed OER / Third-Party",
      statusNote:
        provenance?.source?.license_or_permission ||
        "Attributed external educational resource",
      tone: "cyan",
    };
  }

  return {
    badgeLabel: "AI-Generated Learning Content",
    shortLabel: "AI-Generated (Unverified)",
    statusNote:
      "AI-generated educational material — not officially verified by an external board",
    tone: "amber",
  };
}
