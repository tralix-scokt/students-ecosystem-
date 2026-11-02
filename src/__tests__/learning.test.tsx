import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextRequest } from "next/server";
import { LearningLibraryClient } from "@/components/learning/LearningLibraryClient";
import { CourseDetailClient } from "@/components/learning/CourseDetailClient";
import { LessonReaderClient } from "@/components/learning/LessonReaderClient";
import { StudentProgressPageClient } from "@/components/learning/StudentProgressPageClient";
import { ContentProvenanceBadge } from "@/components/learning/ContentProvenanceBadge";
import {
  describeContentClassification,
  getPersonalizedSubjectsForProfile,
} from "@/lib/learning/personalization";
import type {
  ContentProvenance,
  CourseDetailPayload,
  LearningCourseCatalogItem,
  LearningLibraryPayload,
  LearningSubjectRecord,
  LessonDetailPayload,
} from "@/types/learning";
import type { StudentAcademicProfile } from "@/types/onboarding";

const pushMock = vi.fn();
const replaceMock = vi.fn();
const refreshMock = vi.fn();
let mockedPathname = "/dashboard/learn";
let mockedSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
    refresh: refreshMock,
  }),
  usePathname: () => mockedPathname,
  useSearchParams: () => mockedSearchParams,
}));

const learningServiceMocks = vi.hoisted(() => ({
  fetchLearningLibrary: vi.fn(),
  fetchCourseDetail: vi.fn(),
  fetchLessonDetail: vi.fn(),
  recordLessonProgress: vi.fn(),
  toggleLessonBookmark: vi.fn(),
  submitExerciseAttempt: vi.fn(),
}));

vi.mock("@/lib/learning/learningService", () => learningServiceMocks);

const dashboardServiceMocks = vi.hoisted(() => ({
  fetchStudentDashboard: vi.fn(),
  markDashboardNotificationsRead: vi.fn(),
}));

vi.mock("@/lib/dashboard/dashboardService", () => dashboardServiceMocks);

vi.mock("@/lib/auth/authService", () => ({
  signOutLearner: vi.fn(),
  updateAuthenticatedLearnerProfile: vi.fn(),
}));

function buildAcademicProfile(
  overrides: Partial<StudentAcademicProfile> = {}
): StudentAcademicProfile {
  return {
    user_id: "u-sec-ss1",
    academic_category: "secondary",
    country: "Nigeria",
    state_region: "Delta",
    institution_name: "Hussey College, Warri",
    institution_type: null,
    secondary_category: "senior",
    faculty: null,
    department: null,
    course_or_program: null,
    qualification_type: null,
    academic_level: "SS 1",
    curriculum: "WAEC / NECO Senior Secondary Syllabus Alignment",
    selected_subjects: ["Physics", "Mathematics"],
    learning_goals: ["Prepare for examinations"],
    explanation_preference: "standard",
    current_step: 4,
    onboarding_completed: true,
    completed_at: "2026-11-01T16:00:00Z",
    created_at: "2026-11-01T15:00:00Z",
    updated_at: "2026-11-01T16:00:00Z",
    ...overrides,
  };
}

const SAMPLE_SUBJECTS: LearningSubjectRecord[] = [
  {
    id: "sub-math",
    slug: "mathematics",
    name: "Mathematics",
    learning_category: "Mathematics",
    description: "Algebra, geometry, and calculus foundations.",
    academic_categories: ["secondary", "university", "polytechnic"],
    education_levels: ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3", "100", "ND 1"],
    curriculum_codes: ["NG-NERDC-JSS", "NG-NERDC-SSS", "NG-WAEC-NECO"],
    waec_neco_relevant: true,
    faculty_keywords: ["science", "engineering"],
    department_keywords: ["mathematics", "computer"],
    qualification_keywords: ["ND", "HND"],
    sort_order: 1,
  },
  {
    id: "sub-phys",
    slug: "physics",
    name: "Physics",
    learning_category: "Physics",
    description: "Mechanics, vectors, waves, and electricity.",
    academic_categories: ["secondary", "university", "polytechnic"],
    education_levels: ["SS 1", "SS 2", "SS 3", "100", "ND 1"],
    curriculum_codes: ["NG-NERDC-SSS", "NG-WAEC-NECO"],
    waec_neco_relevant: true,
    faculty_keywords: ["science", "engineering"],
    department_keywords: ["physics", "electrical"],
    qualification_keywords: ["ND"],
    sort_order: 2,
  },
  {
    id: "sub-bst",
    slug: "basic-science-and-technology",
    name: "Basic Science & Technology",
    learning_category: "Technical and vocational subjects",
    description: "Junior Secondary integrated science and intro technology.",
    academic_categories: ["secondary"],
    education_levels: ["JSS 1", "JSS 2", "JSS 3"],
    curriculum_codes: ["NG-NERDC-JSS"],
    waec_neco_relevant: false,
    faculty_keywords: [],
    department_keywords: [],
    qualification_keywords: [],
    sort_order: 3,
  },
  {
    id: "sub-cs",
    slug: "computer-studies",
    name: "Computer Studies",
    learning_category: "Computer Studies",
    description: "Algorithms, data structures, and computing systems.",
    academic_categories: ["secondary", "university", "polytechnic"],
    education_levels: ["JSS 1", "SS 1", "100", "200", "ND 1"],
    curriculum_codes: ["NG-NUC-CCMAS"],
    waec_neco_relevant: true,
    faculty_keywords: ["computing", "science"],
    department_keywords: ["computer", "software"],
    qualification_keywords: ["ND", "HND"],
    sort_order: 4,
  },
  {
    id: "sub-elec",
    slug: "electrical-and-technical-engineering",
    name: "Electrical & Technical Engineering",
    learning_category: "Technical and vocational subjects",
    description: "DC/AC circuits, instrumentation, and workshop practice.",
    academic_categories: ["polytechnic", "university"],
    education_levels: ["ND 1", "ND 2", "HND 1", "100"],
    curriculum_codes: ["NG-NBTE-POLY"],
    waec_neco_relevant: false,
    faculty_keywords: ["engineering"],
    department_keywords: ["electrical", "electronic"],
    qualification_keywords: ["ND", "HND", "Vocational"],
    sort_order: 5,
  },
];

const OER_PROVENANCE: ContentProvenance = {
  source: {
    id: "src-oer",
    slug: "openstax-physics-cc-by-4",
    source_name: "OpenStax High School Physics (Adapted)",
    source_url_or_reference: "https://openstax.org/details/books/physics",
    author_or_publisher: "OpenStax, Rice University",
    content_classification: "imported_third_party",
    license_or_permission: "Creative Commons Attribution 4.0 International (CC BY 4.0)",
    attribution_text: "Access for free at openstax.org under CC BY 4.0.",
  },
  verification: {
    id: "ver-oer",
    code: "ver-openstax-physics-oer",
    source_id: "src-oer",
    content_classification: "imported_third_party",
    verification_status: "attributed_third_party",
    approved_for_publication: true,
    reviewer_name: "TRALIX Open Content Integration Pipeline",
    reviewed_at: "2026-11-01T12:00:00Z",
    review_notes: "Verified CC BY 4.0 license.",
  },
};

const AI_PROVENANCE: ContentProvenance = {
  source: {
    id: "src-ai",
    slug: "tralix-ai-structured-draft",
    source_name: "TRALIX AI Structured Curriculum Synthesis",
    source_url_or_reference: "internal://tralix-ai/step5",
    author_or_publisher: "TRALIX AI Authoring Engine",
    content_classification: "ai_generated",
    license_or_permission: "Platform-generated original instructional draft",
    attribution_text: "Generated by TRALIX AI; labeled unverified.",
  },
  verification: {
    id: "ver-ai",
    code: "ver-tralix-ai-cs-unverified",
    source_id: "src-ai",
    content_classification: "ai_generated",
    verification_status: "unverified_ai",
    approved_for_publication: true,
    reviewer_name: null,
    reviewed_at: null,
    review_notes: "Explicitly labeled AI-generated.",
  },
};

const SAMPLE_COURSES: LearningCourseCatalogItem[] = [
  {
    id: "33333333-3333-4333-8333-333333333301",
    slug: "foundations-of-motion-and-vectors",
    title: "Foundations of Motion, Scalars & Vectors",
    subject: "Physics",
    subject_id: "sub-phys",
    academic_category: "secondary",
    education_level: "SS 1",
    curriculum: "WAEC / NECO Senior Secondary Syllabus Alignment",
    curriculum_id: "cur-waec",
    current_topic: "Scalars, Vectors, and Displacement",
    summary: "Distinguish scalar and vector quantities and solve kinematics problems.",
    description: "Structured introduction to one-dimensional kinematics for SS 1.",
    thumbnail_url: null,
    instructor_name: "OpenStax Physics (Adapted under CC BY 4.0)",
    learning_objectives: [
      "Differentiate clearly between scalar and vector physical quantities.",
      "Calculate speed, velocity, and uniform acceleration with SI units.",
    ],
    estimated_duration_minutes: 35,
    difficulty: "foundational",
    total_lessons: 2,
    is_published: true,
    publication_status: "published",
    provenance: OER_PROVENANCE,
  },
  {
    id: "33333333-3333-4333-8333-333333333302",
    slug: "intro-to-algorithms-and-complexity",
    title: "Introduction to Algorithms & Time Complexity",
    subject: "Computer Studies",
    subject_id: "sub-cs",
    academic_category: "university",
    education_level: "100",
    curriculum: "Nigerian University Core Curriculum (NUC CCMAS)",
    curriculum_id: "cur-nuc",
    current_topic: "Algorithmic Problem Solving",
    summary: "Analyze correctness and Big-O growth rates.",
    description: "100-Level Computer Science course on algorithms.",
    thumbnail_url: null,
    instructor_name: null,
    learning_objectives: ["Compare O(1), O(log n), and O(n) growth rates."],
    estimated_duration_minutes: null,
    difficulty: "foundational",
    total_lessons: 2,
    is_published: true,
    publication_status: "published",
    provenance: AI_PROVENANCE,
  },
];

describe("Step 5 — Complete Structured Learning System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPathname = "/dashboard/learn";
    mockedSearchParams = new URLSearchParams();
  });

  it("protects /dashboard/learn, /dashboard/learn/courses/[slug], and /dashboard/progress in middleware", async () => {
    const { updateSupabaseSession } = await import("@/lib/supabase/middleware");

    for (const path of [
      "/dashboard/learn",
      "/dashboard/learn/courses/foundations-of-motion-and-vectors",
      "/dashboard/learn/courses/foundations-of-motion-and-vectors/lessons/scalars-and-vectors",
      "/dashboard/progress",
    ]) {
      const res = await updateSupabaseSession(
        new NextRequest(`http://localhost:3000${path}`)
      );
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login?next=");
    }
  });

  it("filters personalized subjects accurately for Nigerian JSS vs SS, University, and Polytechnic profiles", () => {
    // 1. Nigerian JSS 2 student -> gets JSS subjects (Mathematics, Basic Science & Technology, Computer Studies), NOT SS-only Physics or Polytechnic Electrical
    const jssMatches = getPersonalizedSubjectsForProfile(
      SAMPLE_SUBJECTS,
      buildAcademicProfile({
        secondary_category: "junior",
        academic_level: "JSS 2",
        selected_subjects: ["Mathematics", "Basic Science & Technology"],
      })
    );
    const jssSlugs = jssMatches.map((m) => m.subject.slug);
    expect(jssSlugs).toContain("basic-science-and-technology");
    expect(jssSlugs).toContain("mathematics");
    expect(jssSlugs).not.toContain("physics");
    expect(jssSlugs).not.toContain("electrical-and-technical-engineering");

    // 2. Nigerian SS 1 student -> gets Physics & Mathematics with WAEC/NECO relevance, NOT JSS-only Basic Science & Technology
    const ssMatches = getPersonalizedSubjectsForProfile(
      SAMPLE_SUBJECTS,
      buildAcademicProfile({
        secondary_category: "senior",
        academic_level: "SS 1",
        selected_subjects: ["Physics"],
      })
    );
    const ssSlugs = ssMatches.map((m) => m.subject.slug);
    expect(ssSlugs[0]).toBe("physics");
    expect(ssSlugs).not.toContain("basic-science-and-technology");
    expect(
      ssMatches.find((m) => m.subject.slug === "mathematics")?.relevanceReason
    ).toMatch(/WAEC \/ NECO relevant/i);

    // 3. University 100L Computer Science student -> prioritizes Computer Studies
    const uniMatches = getPersonalizedSubjectsForProfile(
      SAMPLE_SUBJECTS,
      buildAcademicProfile({
        academic_category: "university",
        secondary_category: null,
        faculty: "Faculty of Computing",
        department: "Computer Science",
        course_or_program: "B.Sc. Computer Science",
        academic_level: "100",
        selected_subjects: ["Computer Studies"],
      })
    );
    expect(uniMatches[0]?.subject.slug).toBe("computer-studies");

    // 4. Polytechnic ND 1 Electrical Engineering student -> prioritizes Electrical & Technical Engineering
    const polyMatches = getPersonalizedSubjectsForProfile(
      SAMPLE_SUBJECTS,
      buildAcademicProfile({
        academic_category: "polytechnic",
        secondary_category: null,
        department: "Electrical / Electronic Engineering Technology",
        course_or_program: "Electrical Engineering Technology",
        qualification_type: "ND",
        academic_level: "ND 1",
        selected_subjects: [],
      })
    );
    expect(
      polyMatches.some(
        (m) => m.subject.slug === "electrical-and-technical-engineering"
      )
    ).toBe(true);
  });

  it("enforces truthful content source classifications and never labels AI-generated content as verified", async () => {
    const user = userEvent.setup();

    // Even if passed bogus provenance, ai_generated NEVER resolves to Verified
    const aiDesc = describeContentClassification("ai_generated", AI_PROVENANCE);
    expect(aiDesc.badgeLabel).toBe("AI-Generated Learning Content");
    expect(aiDesc.shortLabel).toBe("AI-Generated (Unverified)");

    const oerDesc = describeContentClassification(
      "imported_third_party",
      OER_PROVENANCE
    );
    expect(oerDesc.badgeLabel).toBe("Imported / Third-Party Licensed Content");

    const verifiedDesc = describeContentClassification("verified", {
      source: {
        ...OER_PROVENANCE.source!,
        content_classification: "verified",
      },
      verification: {
        id: "v-real",
        code: "v-real",
        source_id: "src-oer",
        content_classification: "verified",
        verification_status: "verified",
        approved_for_publication: true,
        reviewer_name: "Dr. Efe Okafor (Physics Curriculum Reviewer)",
        reviewed_at: "2026-11-01T10:00:00Z",
        review_notes: "Verified.",
      },
    });
    expect(verifiedDesc.badgeLabel).toBe("Verified Educational Content");

    render(
      <ContentProvenanceBadge provenance={OER_PROVENANCE} showDetailsToggle />
    );
    expect(
      screen.getByText("Imported / Third-Party Licensed Content")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Source & license/i }));
    expect(
      screen.getByText("OpenStax, Rice University")
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Creative Commons Attribution 4.0 International/i)
        .length
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders Learning Library (/dashboard/learn), honest subject preparation states, search across lessons, and Explore toggle without mutating profile", async () => {
    const user = userEvent.setup();
    const libraryPayload: LearningLibraryPayload = {
      userId: "u-sec-ss1",
      email: "efe@edu.ng",
      userProfile: {
        id: "u-sec-ss1",
        full_name: "Efe Tejiri",
        email: "efe@edu.ng",
        country: "Nigeria",
        role: "student",
        created_at: "2026-11-01T10:00:00Z",
        updated_at: "2026-11-01T10:00:00Z",
      },
      academicProfile: buildAcademicProfile(),
      unreadNotificationCount: 0,
      curricula: [
        {
          id: "cur-waec",
          code: "NG-WAEC-NECO",
          name: "WAEC / NECO Senior Secondary Syllabus Alignment",
          academic_category: "secondary",
          country: "Nigeria",
          description: null,
          sort_order: 1,
        },
      ],
      educationLevels: [
        {
          id: "lvl-ss1",
          code: "SS 1",
          label: "SS 1",
          academic_category: "secondary",
          secondary_stage: "senior",
          qualification_type: null,
          sort_order: 1,
        },
      ],
      subjects: SAMPLE_SUBJECTS,
      courses: SAMPLE_COURSES,
      topics: [
        {
          id: "top-1",
          course_id: SAMPLE_COURSES[0].id,
          slug: "scalars-vectors-displacement",
          title: "Scalars, Vectors, and Displacement",
          description: null,
          topic_order: 1,
        },
      ],
      lessons: [
        {
          id: "les-1",
          course_id: SAMPLE_COURSES[0].id,
          course_slug: SAMPLE_COURSES[0].slug,
          course_title: SAMPLE_COURSES[0].title,
          topic_id: "top-1",
          topic_title: "Scalars, Vectors, and Displacement",
          slug: "scalars-and-vectors",
          title: "Scalars, Vectors, Distance & Displacement",
          subject: "Physics",
          lesson_order: 1,
        },
      ],
      courseProgressMap: {},
      lessonProgressMap: {},
      bookmarks: [],
    };

    learningServiceMocks.fetchLearningLibrary.mockResolvedValueOnce({
      status: "ready",
      payload: libraryPayload,
    });

    render(<LearningLibraryClient />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "Explore Your Learning Space",
        })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "Discover subjects, strengthen your understanding and move closer to your academic goals."
      )
    ).toBeInTheDocument();

    // Default personalized view shows SS 1 Physics course, hides University-only CS course, and shows honest preparation notice for Mathematics
    expect(
      screen.getAllByText("Foundations of Motion, Scalars & Vectors").length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.queryByText("Introduction to Algorithms & Time Complexity")
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /Learning materials for Mathematics are being prepared for publication/i
      )
    ).toBeInTheDocument();

    // Toggle "Explore Other Available Subjects" without mutating profile
    await user.click(
      screen.getByRole("button", {
        name: /Explore Other Available Subjects/i,
      })
    );
    expect(
      screen.getAllByText("Introduction to Algorithms & Time Complexity").length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText("AI-Generated (Unverified)")
    ).toBeInTheDocument();

    // Search across lessons
    const searchBox = screen.getByLabelText(
      /Search subjects, courses, topics, and lessons/i
    );
    await user.type(searchBox, "Displacement");
    expect(
      screen.getByRole("heading", { name: /Matching Lessons & Topics/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Scalars, Vectors, Distance & Displacement")
    ).toBeInTheDocument();
  });

  it("renders Course Detail Page with all 7 layout sections, real completion progress, zero invented metadata, and Continue Learning link", async () => {
    mockedPathname =
      "/dashboard/learn/courses/foundations-of-motion-and-vectors";

    const courseDetailPayload: CourseDetailPayload = {
      userId: "u-sec-ss1",
      email: "efe@edu.ng",
      userProfile: {
        id: "u-sec-ss1",
        full_name: "Efe Tejiri",
        email: "efe@edu.ng",
        country: "Nigeria",
        role: "student",
        created_at: "2026-11-01T10:00:00Z",
        updated_at: "2026-11-01T10:00:00Z",
      },
      academicProfile: buildAcademicProfile(),
      unreadNotificationCount: 0,
      course: SAMPLE_COURSES[0],
      topics: [
        {
          id: "top-1",
          course_id: SAMPLE_COURSES[0].id,
          slug: "scalars-vectors-displacement",
          title: "Scalars, Vectors, and Displacement",
          description: "Compare distance with displacement.",
          topic_order: 1,
          lessons: [
            {
              id: "les-1",
              course_id: SAMPLE_COURSES[0].id,
              topic_id: "top-1",
              slug: "scalars-and-vectors",
              title: "Scalars, Vectors, Distance & Displacement",
              lesson_order: 1,
              introduction: "Physical quantities in mechanics.",
              estimated_reading_minutes: 15,
              provenance: OER_PROVENANCE,
            },
            {
              id: "les-2",
              course_id: SAMPLE_COURSES[0].id,
              topic_id: "top-1",
              slug: "speed-velocity-and-acceleration",
              title: "Speed, Velocity & Uniform Acceleration",
              lesson_order: 2,
              introduction: "Rates of motion and acceleration.",
              estimated_reading_minutes: 18,
              provenance: OER_PROVENANCE,
            },
          ],
        },
      ],
      exercisesCount: 2,
      courseProgress: {
        id: "cp-1",
        course_id: SAMPLE_COURSES[0].id,
        last_lesson_id: "les-1",
        last_lesson_slug: "scalars-and-vectors",
        current_lesson_title: "Scalars, Vectors, Distance & Displacement",
        lessons_started: 1,
        lessons_completed: 1,
        total_lessons: 2,
        progress_percent: 50,
        total_time_spent_seconds: 600,
        last_accessed_at: "2026-11-01T16:10:00Z",
        completed_at: null,
      },
      lessonProgressMap: {
        "les-1": {
          id: "lp-1",
          course_id: SAMPLE_COURSES[0].id,
          topic_id: "top-1",
          lesson_id: "les-1",
          status: "completed",
          is_completed: true,
          time_spent_seconds: 600,
          started_at: "2026-11-01T16:00:00Z",
          last_accessed_at: "2026-11-01T16:10:00Z",
          completed_at: "2026-11-01T16:10:00Z",
        },
      },
      bookmarkedLessonIds: ["les-1"],
      continueLessonSlug: "speed-velocity-and-acceleration",
    };

    learningServiceMocks.fetchCourseDetail.mockResolvedValueOnce({
      status: "ready",
      payload: courseDetailPayload,
    });

    render(
      <CourseDetailClient courseSlug="foundations-of-motion-and-vectors" />
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "Foundations of Motion, Scalars & Vectors",
        })
      ).toBeInTheDocument();
    });

    // What students will learn
    expect(
      screen.getByRole("heading", { name: "What You Will Learn" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Differentiate clearly between scalar and vector physical quantities."
      )
    ).toBeInTheDocument();

    // Overall course progress (50%, 1 / 2 lessons completed, 10 minutes)
    expect(
      screen.getByRole("progressbar", { name: "Overall course progress" })
    ).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText("1 / 2 lessons completed")).toBeInTheDocument();
    expect(
      screen.getByText("Measured time spent: 10 minutes")
    ).toBeInTheDocument();

    // Continue Learning button points to the exact next incomplete lesson
    const continueBtn = screen.getByRole("link", {
      name: /Continue Learning/i,
    });
    expect(continueBtn).toHaveAttribute(
      "href",
      "/dashboard/learn/courses/foundations-of-motion-and-vectors/lessons/speed-velocity-and-acceleration"
    );

    // Lesson completion indicators
    expect(screen.getByLabelText("Lesson completed")).toBeInTheDocument();
    expect(screen.getByLabelText("Lesson not started")).toBeInTheDocument();
    expect(screen.getByText("Bookmarked")).toBeInTheDocument();
  });

  it("renders Distraction-Free Lesson Reader, rich material blocks & diagram, bookmarking, lesson completion, and deterministic 5-type exercise submission + retry", async () => {
    const user = userEvent.setup();
    mockedPathname =
      "/dashboard/learn/courses/foundations-of-motion-and-vectors/lessons/scalars-and-vectors";

    const lessonPayload: LessonDetailPayload = {
      userId: "u-sec-ss1",
      email: "efe@edu.ng",
      userProfile: {
        id: "u-sec-ss1",
        full_name: "Efe Tejiri",
        email: "efe@edu.ng",
        country: "Nigeria",
        role: "student",
        created_at: "2026-11-01T10:00:00Z",
        updated_at: "2026-11-01T10:00:00Z",
      },
      academicProfile: buildAcademicProfile(),
      unreadNotificationCount: 0,
      course: SAMPLE_COURSES[0],
      topic: {
        id: "top-1",
        course_id: SAMPLE_COURSES[0].id,
        slug: "scalars-vectors-displacement",
        title: "Scalars, Vectors, and Displacement",
        description: null,
        topic_order: 1,
      },
      lesson: {
        id: "55555555-5555-4555-8555-555555555501",
        course_id: SAMPLE_COURSES[0].id,
        topic_id: "top-1",
        slug: "scalars-and-vectors",
        title: "Scalars, Vectors, Distance & Displacement",
        lesson_order: 1,
        introduction:
          "Every measurement in mechanics either carries magnitude alone or both magnitude and direction.",
        estimated_reading_minutes: 15,
        learning_objectives: ["Classify physical quantities accurately."],
        summary: "Scalars have magnitude only; vectors have magnitude and direction.",
        key_points: ["Distance >= |Displacement| for any motion."],
        provenance: OER_PROVENANCE,
      },
      materials: [
        {
          id: "mat-1",
          lesson_id: "55555555-5555-4555-8555-555555555501",
          material_order: 1,
          block_type: "definition",
          heading: "Vector Quantity",
          body: "Specified by magnitude, unit, and direction.",
          definition_term: "Vector Quantity",
          formula_expression: null,
          formula_notes: null,
          example_steps: [],
          example_conclusion: null,
          table_caption: null,
          table_headers: [],
          table_rows: [],
          diagram_key: null,
          image_url: null,
          media_alt: null,
          media_caption: null,
          provenance: OER_PROVENANCE,
        },
        {
          id: "mat-2",
          lesson_id: "55555555-5555-4555-8555-555555555501",
          material_order: 2,
          block_type: "formula",
          heading: "Pythagorean Resultant",
          body: null,
          definition_term: null,
          formula_expression: "|R| = sqrt(Rx^2 + Ry^2)",
          formula_notes: "Valid for perpendicular components.",
          example_steps: [],
          example_conclusion: null,
          table_caption: null,
          table_headers: [],
          table_rows: [],
          diagram_key: null,
          image_url: null,
          media_alt: null,
          media_caption: null,
          provenance: OER_PROVENANCE,
        },
        {
          id: "mat-3",
          lesson_id: "55555555-5555-4555-8555-555555555501",
          material_order: 3,
          block_type: "table",
          heading: "Scalar vs Vector Comparison",
          body: null,
          definition_term: null,
          formula_expression: null,
          formula_notes: null,
          example_steps: [],
          example_conclusion: null,
          table_caption: "Common quantities",
          table_headers: ["Scalar", "Vector"],
          table_rows: [["Distance (m)", "Displacement (m)"]],
          diagram_key: null,
          image_url: null,
          media_alt: null,
          media_caption: null,
          provenance: OER_PROVENANCE,
        },
        {
          id: "mat-4",
          lesson_id: "55555555-5555-4555-8555-555555555501",
          material_order: 4,
          block_type: "diagram",
          heading: "Right-Triangle Displacement",
          body: null,
          definition_term: null,
          formula_expression: null,
          formula_notes: null,
          example_steps: [],
          example_conclusion: null,
          table_caption: null,
          table_headers: [],
          table_rows: [],
          diagram_key: "vector-displacement",
          image_url: null,
          media_alt: "Right triangle showing 4m east and 3m north",
          media_caption: "Adapted from OpenStax Physics (CC BY 4.0).",
          provenance: OER_PROVENANCE,
        },
        {
          id: "mat-5",
          lesson_id: "55555555-5555-4555-8555-555555555501",
          material_order: 5,
          block_type: "worked_example",
          heading: "4 m East and 3 m North",
          body: "Find distance and displacement.",
          definition_term: null,
          formula_expression: null,
          formula_notes: null,
          example_steps: ["Distance = 4 + 3 = 7 m", "|d| = sqrt(16 + 9) = 5 m"],
          example_conclusion: "Distance is 7 m; displacement is 5 m.",
          table_caption: null,
          table_headers: [],
          table_rows: [],
          diagram_key: null,
          image_url: null,
          media_alt: null,
          media_caption: null,
          provenance: OER_PROVENANCE,
        },
      ],
      exercises: [
        {
          id: "66666666-6666-4666-8666-666666666601",
          course_id: SAMPLE_COURSES[0].id,
          lesson_id: "55555555-5555-4555-8555-555555555501",
          title: "Comprehensive Mastery Check",
          instructions: "Answer all 5 question types below.",
          exercise_order: 1,
          allow_retries: true,
          provenance: OER_PROVENANCE,
          questions: [
            {
              id: "77777777-7777-4777-8777-777777777701",
              exercise_id: "66666666-6666-4666-8666-666666666601",
              question_order: 1,
              question_type: "multiple_choice",
              prompt: "Which quantity is a vector?",
              helper_text: null,
              unit_label: null,
              points: 1,
              options: [
                {
                  id: "o1",
                  question_id: "77777777-7777-4777-8777-777777777701",
                  option_key: "A",
                  option_text: "Mass",
                  option_order: 1,
                },
                {
                  id: "o2",
                  question_id: "77777777-7777-4777-8777-777777777701",
                  option_key: "B",
                  option_text: "Displacement",
                  option_order: 2,
                },
              ],
            },
            {
              id: "77777777-7777-4777-8777-777777777702",
              exercise_id: "66666666-6666-4666-8666-666666666601",
              question_order: 2,
              question_type: "true_false",
              prompt: "Displacement can be zero when distance is positive.",
              helper_text: null,
              unit_label: null,
              points: 1,
              options: [],
            },
            {
              id: "77777777-7777-4777-8777-777777777703",
              exercise_id: "66666666-6666-4666-8666-666666666601",
              question_order: 3,
              question_type: "short_answer",
              prompt: "What type of quantity has magnitude only?",
              helper_text: null,
              unit_label: null,
              points: 1,
              options: [],
            },
            {
              id: "77777777-7777-4777-8777-777777777704",
              exercise_id: "66666666-6666-4666-8666-666666666601",
              question_order: 4,
              question_type: "numerical",
              prompt: "Find resultant magnitude for 4 m East and 3 m North.",
              helper_text: null,
              unit_label: "m",
              points: 2,
              options: [],
            },
            {
              id: "77777777-7777-4777-8777-777777777705",
              exercise_id: "66666666-6666-4666-8666-666666666601",
              question_order: 5,
              question_type: "written_response",
              prompt: "Explain why circular motion at steady speed accelerates.",
              helper_text: null,
              unit_label: null,
              points: 0,
              options: [],
            },
          ],
        },
      ],
      allTopics: [
        {
          id: "top-1",
          course_id: SAMPLE_COURSES[0].id,
          slug: "scalars-vectors-displacement",
          title: "Scalars, Vectors, and Displacement",
          description: null,
          topic_order: 1,
          lessons: [
            {
              id: "55555555-5555-4555-8555-555555555501",
              course_id: SAMPLE_COURSES[0].id,
              topic_id: "top-1",
              slug: "scalars-and-vectors",
              title: "Scalars, Vectors, Distance & Displacement",
              lesson_order: 1,
              introduction: "Intro",
              estimated_reading_minutes: 15,
              provenance: OER_PROVENANCE,
            },
          ],
        },
      ],
      previousLesson: null,
      nextLesson: {
        slug: "speed-velocity-and-acceleration",
        title: "Speed, Velocity & Uniform Acceleration",
        topicTitle: "Scalars, Vectors, and Displacement",
      },
      courseProgress: null,
      lessonProgressMap: {},
      isBookmarked: false,
      latestAttemptsByExercise: {},
    };

    learningServiceMocks.fetchLessonDetail.mockResolvedValueOnce({
      status: "ready",
      payload: lessonPayload,
    });
    learningServiceMocks.recordLessonProgress.mockResolvedValue({
      ok: true,
      lessonProgress: {
        id: "lp-new",
        course_id: SAMPLE_COURSES[0].id,
        topic_id: "top-1",
        lesson_id: "55555555-5555-4555-8555-555555555501",
        status: "completed",
        is_completed: true,
        time_spent_seconds: 40,
        started_at: "2026-11-01T16:00:00Z",
        last_accessed_at: "2026-11-01T16:01:00Z",
        completed_at: "2026-11-01T16:01:00Z",
      },
      courseProgress: {
        id: "cp-new",
        course_id: SAMPLE_COURSES[0].id,
        last_lesson_id: "55555555-5555-4555-8555-555555555501",
        last_lesson_slug: "scalars-and-vectors",
        current_lesson_title: "Scalars, Vectors, Distance & Displacement",
        lessons_started: 1,
        lessons_completed: 1,
        total_lessons: 2,
        progress_percent: 50,
        total_time_spent_seconds: 40,
        last_accessed_at: "2026-11-01T16:01:00Z",
        completed_at: null,
      },
    });
    learningServiceMocks.toggleLessonBookmark.mockResolvedValueOnce({
      ok: true,
      bookmarked: true,
    });
    learningServiceMocks.submitExerciseAttempt.mockResolvedValueOnce({
      ok: true,
      attempt: {
        id: "att-1",
        course_id: SAMPLE_COURSES[0].id,
        lesson_id: "55555555-5555-4555-8555-555555555501",
        exercise_id: "66666666-6666-4666-8666-666666666601",
        attempt_number: 1,
        submitted_answers: {
          "77777777-7777-4777-8777-777777777701": "B",
          "77777777-7777-4777-8777-777777777702": "true",
          "77777777-7777-4777-8777-777777777703": "scalar",
          "77777777-7777-4777-8777-777777777704": "5 m",
          "77777777-7777-4777-8777-777777777705":
            "Direction continuously changes so velocity changes.",
        },
        evaluation_breakdown: [
          {
            questionId: "77777777-7777-4777-8777-777777777701",
            questionOrder: 1,
            questionType: "multiple_choice",
            studentAnswer: "B",
            status: "correct",
            isCorrect: true,
            isOfficiallyMarked: true,
            earnedPoints: 1,
            possiblePoints: 1,
            correctAnswerDisplay: "Option B",
            explanation: "Displacement includes both magnitude and direction.",
            rubricGuidance: [],
          },
          {
            questionId: "77777777-7777-4777-8777-777777777702",
            questionOrder: 2,
            questionType: "true_false",
            studentAnswer: "true",
            status: "correct",
            isCorrect: true,
            isOfficiallyMarked: true,
            earnedPoints: 1,
            possiblePoints: 1,
            correctAnswerDisplay: "True",
            explanation: "A closed loop returns to the starting position.",
            rubricGuidance: [],
          },
          {
            questionId: "77777777-7777-4777-8777-777777777703",
            questionOrder: 3,
            questionType: "short_answer",
            studentAnswer: "scalar",
            status: "correct",
            isCorrect: true,
            isOfficiallyMarked: true,
            earnedPoints: 1,
            possiblePoints: 1,
            correctAnswerDisplay: "scalar",
            explanation: "Scalars have magnitude only.",
            rubricGuidance: [],
          },
          {
            questionId: "77777777-7777-4777-8777-777777777704",
            questionOrder: 4,
            questionType: "numerical",
            studentAnswer: "5 m",
            status: "correct",
            isCorrect: true,
            isOfficiallyMarked: true,
            earnedPoints: 2,
            possiblePoints: 2,
            correctAnswerDisplay: "5 m",
            explanation: "sqrt(4^2 + 3^2) = 5 m.",
            rubricGuidance: [],
          },
          {
            questionId: "77777777-7777-4777-8777-777777777705",
            questionOrder: 5,
            questionType: "written_response",
            studentAnswer: "Direction continuously changes so velocity changes.",
            status: "written_recorded",
            isCorrect: null,
            isOfficiallyMarked: false,
            earnedPoints: 0,
            possiblePoints: 0,
            correctAnswerDisplay:
              "Velocity is a vector; changing direction changes velocity.",
            explanation: "Compare your response with the rubric below.",
            rubricGuidance: ["State that velocity is a vector quantity."],
          },
        ],
        gradable_questions_count: 4,
        correct_answers_count: 4,
        written_responses_count: 1,
        earned_points: 5,
        possible_points: 5,
        score_percent: 100,
        time_spent_seconds: 30,
        submitted_at: "2026-11-01T16:05:00Z",
      },
    });

    render(
      <LessonReaderClient
        courseSlug="foundations-of-motion-and-vectors"
        lessonSlug="scalars-and-vectors"
      />
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "Scalars, Vectors, Distance & Displacement",
        })
      ).toBeInTheDocument();
    });

    // Material blocks rendered cleanly (definition, formula, table, SVG diagram, worked example, summary)
    expect(screen.getByText("|R| = sqrt(Rx^2 + Ry^2)")).toBeInTheDocument();
    expect(screen.getByText("Distance (m)")).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Right triangle showing 4m east and 3m north",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Distance is 7 m; displacement is 5 m.")
    ).toBeInTheDocument();

    // Bookmark toggle
    await user.click(screen.getByRole("button", { name: /Bookmark Lesson/i }));
    expect(learningServiceMocks.toggleLessonBookmark).toHaveBeenCalledWith({
      courseId: SAMPLE_COURSES[0].id,
      lessonId: "55555555-5555-4555-8555-555555555501",
      bookmarked: true,
    });
    expect(
      await screen.findByRole("button", { name: /^Bookmarked$/i })
    ).toHaveAttribute("aria-pressed", "true");

    // Mark Lesson as Completed
    await user.click(
      screen.getByRole("button", { name: /Mark Lesson as Completed/i })
    );
    expect(
      await screen.findByRole("button", { name: /Lesson Completed/i })
    ).toBeDisabled();

    // Answer all 5 exercise question types and submit
    const q1Group = screen.getByRole("radiogroup", {
      name: /Question 1 options/i,
    });
    await user.click(within(q1Group).getByLabelText(/B\.\s*Displacement/i));

    const q2Group = screen.getByRole("radiogroup", {
      name: /Question 2 True or False/i,
    });
    await user.click(within(q2Group).getByLabelText(/^True$/i));

    await user.type(
      screen.getByLabelText(/Short answer for question 3/i),
      "scalar"
    );
    await user.type(
      screen.getByLabelText(/Numerical answer for question 4/i),
      "5 m"
    );
    await user.type(
      screen.getByLabelText(/Written response for question 5/i),
      "Direction continuously changes so velocity changes."
    );

    await user.click(screen.getByRole("button", { name: /Submit Exercise/i }));

    expect(
      await screen.findByText(/Objective Score: 100% \(5 \/ 5 pts\)/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Written Response Recorded \(Self-Review — Not Officially Examiner-Marked\)/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText("State that velocity is a vector quantity.")
    ).toBeInTheDocument();

    // Retry Exercise resets form cleanly
    await user.click(screen.getByRole("button", { name: /Retry Exercise/i }));
    expect(
      screen.getByRole("button", { name: /Submit Exercise/i })
    ).toBeInTheDocument();

    // Next lesson pagination link
    expect(
      screen.getByRole("link", {
        name: /Next Lesson\s*Speed, Velocity & Uniform Acceleration/i,
      })
    ).toHaveAttribute(
      "href",
      "/dashboard/learn/courses/foundations-of-motion-and-vectors/lessons/speed-velocity-and-acceleration"
    );
  });

  it("renders Student Progress Page (/dashboard/progress) with Course Progress, Subject Progress, Completed Lesson History, Recent Activity, and Bookmarks", async () => {
    mockedPathname = "/dashboard/progress";

    dashboardServiceMocks.fetchStudentDashboard.mockResolvedValueOnce({
      status: "ok",
      data: {
        authenticated: true,
        emailVerified: true,
        onboardingCompleted: true,
        userId: "u-sec-ss1",
        email: "efe@edu.ng",
        userProfile: {
          id: "u-sec-ss1",
          full_name: "Efe Tejiri",
          email: "efe@edu.ng",
          country: "Nigeria",
          role: "student",
          created_at: "2026-11-01T10:00:00Z",
          updated_at: "2026-11-01T10:00:00Z",
        },
        academicProfile: buildAcademicProfile(),
        ongoingCourses: [
          {
            id: "cp-1",
            course_id: SAMPLE_COURSES[0].id,
            course_slug: SAMPLE_COURSES[0].slug,
            course_title: SAMPLE_COURSES[0].title,
            subject: "Physics",
            topic_or_lesson: "Scalars, Vectors, Distance & Displacement",
            last_lesson_slug: "scalars-and-vectors",
            lessons_started: 1,
            lessons_completed: 1,
            total_lessons: 2,
            progress_percent: 50,
            total_time_spent_seconds: 900,
            last_accessed_at: "2026-11-01T16:10:00Z",
            completed_at: null,
          },
        ],
        allCourseProgress: [
          {
            id: "cp-1",
            course_id: SAMPLE_COURSES[0].id,
            course_slug: SAMPLE_COURSES[0].slug,
            course_title: SAMPLE_COURSES[0].title,
            subject: "Physics",
            topic_or_lesson: "Scalars, Vectors, Distance & Displacement",
            last_lesson_slug: "scalars-and-vectors",
            lessons_started: 1,
            lessons_completed: 1,
            total_lessons: 2,
            progress_percent: 50,
            total_time_spent_seconds: 900,
            last_accessed_at: "2026-11-01T16:10:00Z",
            completed_at: null,
          },
        ],
        publishedCourses: [],
        recentLessons: [
          {
            id: "lp-1",
            lesson_id: "les-1",
            lesson_slug: "scalars-and-vectors",
            lesson_title: "Scalars, Vectors, Distance & Displacement",
            course_id: SAMPLE_COURSES[0].id,
            course_slug: SAMPLE_COURSES[0].slug,
            course_title: SAMPLE_COURSES[0].title,
            subject: "Physics",
            status: "completed",
            is_completed: true,
            time_spent_seconds: 900,
            last_accessed_at: "2026-11-01T16:10:00Z",
            completed_at: "2026-11-01T16:10:00Z",
          },
        ],
        bookmarkedLessons: [
          {
            id: "bm-1",
            lesson_id: "les-1",
            lesson_slug: "scalars-and-vectors",
            lesson_title: "Scalars, Vectors, Distance & Displacement",
            course_id: SAMPLE_COURSES[0].id,
            course_slug: SAMPLE_COURSES[0].slug,
            course_title: SAMPLE_COURSES[0].title,
            subject: "Physics",
            note: null,
            created_at: "2026-11-01T16:05:00Z",
          },
        ],
        subjectLearningProgress: [
          {
            subject: "Physics",
            courses_started: 1,
            courses_completed: 0,
            lessons_completed: 1,
            total_lessons: 2,
            progress_percent: 50,
            time_spent_seconds: 900,
          },
        ],
        todayStudySessions: [],
        upcomingStudySessions: [],
        upcomingAssignments: [],
        progressMetrics: {
          hasAnyActivity: true,
          lessonsStarted: 1,
          lessonsCompleted: 1,
          coursesStarted: 1,
          coursesInProgress: 1,
          coursesCompleted: 0,
          exercisesAttempted: 1,
          totalTimeSpentSeconds: 900,
          assessmentsCount: 1,
          averageAssessmentScore: 100,
          recentAssessments: [
            {
              id: "ass-1",
              title: "Scalars & Vectors Mastery Check",
              subject: "Physics",
              score_percent: 100,
              recorded_at: "2026-11-01T16:12:00Z",
            },
          ],
          subjectPerformance: [
            { subject: "Physics", average_score: 100, assessments_count: 1 },
          ],
        },
        notifications: [],
        unreadNotificationCount: 0,
      },
    });

    render(<StudentProgressPageClient />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "My Learning Progress",
        })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("heading", { name: "Course Progress" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Subject Progress" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Completed Lesson History" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Bookmarked Lessons \(1\)/i })
    ).toBeInTheDocument();
    expect(screen.getAllByText("15m").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("link", { name: /^Continue$/i })
    ).toHaveAttribute(
      "href",
      "/dashboard/learn/courses/foundations-of-motion-and-vectors/lessons/scalars-and-vectors"
    );
  });
});
