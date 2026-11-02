import fs from "node:fs";
import path from "node:path";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  evaluateStudentPromptSafety,
  TUTOR_LEARNING_MODES,
} from "@/lib/ai/types";
import { computeStudyTimeSummary } from "@/lib/planner/plannerService";
import { filterAndSortNotes, type StudentNoteItem } from "@/lib/notes/notesService";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

// Mock Next navigation
const replaceMock = vi.fn();
const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: pushMock,
    refresh: refreshMock,
  }),
  usePathname: () => "/dashboard/ai-tutor",
  useSearchParams: () => new URLSearchParams(""),
}));

// Shared student dashboard fixture
const mockDashboardData = {
  authenticated: true,
  emailVerified: true,
  onboardingCompleted: true,
  userId: "user-student-1",
  email: "amina@example.edu.ng",
  userProfile: {
    id: "user-student-1",
    full_name: "Amina Okonkwo",
    email: "amina@example.edu.ng",
    country: "Nigeria",
    role: "student" as const,
    created_at: "2026-11-01T09:00:00Z",
    updated_at: "2026-11-01T09:00:00Z",
  },
  academicProfile: {
    id: "acad-1",
    user_id: "user-student-1",
    academic_category: "secondary" as const,
    sub_level: "SS3",
    institution_name: "Federal Government College",
    department_or_stream: "Science",
    curriculum: "WAEC / NECO",
    selected_subjects: ["Physics", "Mathematics"],
    learning_goals: ["Ace WASSCE & UTME"],
    preferred_study_time: "evening",
    learning_style: "step_by_step",
    onboarding_completed: true,
    created_at: "2026-11-01T09:05:00Z",
    updated_at: "2026-11-01T09:05:00Z",
  },
  ongoingCourses: [],
  publishedCourses: [],
  todayStudySessions: [],
  upcomingStudySessions: [],
  upcomingAssignments: [],
  progressMetrics: {
    hasAnyActivity: false,
    lessonsCompleted: 0,
    coursesInProgress: 0,
    assessmentsCount: 0,
    averageAssessmentScore: null,
    recentAssessments: [],
    subjectPerformance: [],
  },
  notifications: [
    {
      id: "notif-11111111",
      title: "Upcoming Assignment Deadline: Kinematics Problem Set",
      body: "Physics assignment due Nov 02, 2026.",
      category: "assignment" as const,
      action_url: "/dashboard/planner",
      is_read: false,
      read_at: null,
      created_at: "2026-11-01T10:00:00Z",
    },
  ],
  unreadNotificationCount: 1,
};

vi.mock("@/lib/dashboard/useStudentDashboardData", () => ({
  useStudentDashboardData: () => ({
    status: "ready",
    isRetrying: false,
    data: mockDashboardData,
    errorMessage: null,
    retry: vi.fn(),
    markAllNotificationsRead: vi.fn(),
    markNotificationRead: vi.fn(),
  }),
}));

const sendTutorPromptMock = vi.fn();
vi.mock("@/lib/ai/tutorService", () => ({
  fetchTutorWorkspaceBootstrap: vi.fn(async () => ({
    conversations: [
      {
        id: "conv-1",
        title: "Scalars vs Vectors Deep Dive",
        learningMode: "explain_topic",
        subject: "Physics",
        courseSlug: null,
        lessonSlug: null,
        messageCount: 2,
        lastMessageAt: "2026-11-01T10:00:00Z",
        createdAt: "2026-11-01T10:00:00Z",
      },
    ],
    preferences: {
      preferredMode: "explain_topic",
      explanationStyle: "step_by_step",
      preferredSubject: "Physics",
    },
  })),
  fetchConversationMessages: vi.fn(async () => []),
  saveStudentTutorPreferences: vi.fn(async () => undefined),
  renameTutorConversation: vi.fn(async () => true),
  deleteTutorConversation: vi.fn(async () => true),
  sendTutorPrompt: (...args: unknown[]) => sendTutorPromptMock(...args),
}));

const startExamMock = vi.fn();
const submitExamMock = vi.fn();
vi.mock("@/lib/exams/examService", () => ({
  fetchExamPrepBootstrap: vi.fn(async () => ({
    categories: [
      {
        id: "cat-waec",
        code: "WAEC",
        name: "WASSCE Style Practice",
        shortLabel: "WAEC Practice",
        academicCategory: "secondary",
        description: "Secondary science & math practice.",
        disclaimerText:
          "Independent preparation resource. Not affiliated with or endorsed by WAEC.",
        defaultDurationMinutes: 30,
      },
      {
        id: "cat-jamb",
        code: "JAMB_UTME",
        name: "UTME CBT Practice",
        shortLabel: "JAMB UTME Practice",
        academicCategory: "secondary",
        description: "CBT speed practice.",
        disclaimerText:
          "Independent CBT simulation. Not affiliated with JAMB.",
        defaultDurationMinutes: 25,
      },
    ],
    subjects: [
      {
        id: "subj-phys",
        examCategoryId: "cat-waec",
        subjectName: "Physics",
        subjectSlug: "physics",
        availableTopics: ["Scalars & Vectors", "Kinematics"],
      },
    ],
    attempts: [],
    topicPerformance: [],
  })),
  startPracticeExamSession: (...args: unknown[]) => startExamMock(...args),
  submitPracticeExamSession: (...args: unknown[]) => submitExamMock(...args),
  requestExamAiHelper: vi.fn(async () => ({
    ok: true,
    content: "Day 1: Revise vector resolution...",
  })),
}));

vi.mock("@/lib/admin/adminService", () => ({
  fetchAdminDashboardPayload: vi.fn(async () => ({ status: "forbidden" })),
  logAdminAuditAction: vi.fn(async () => undefined),
}));

import { AiTutorWorkspaceClient } from "@/components/ai-tutor/AiTutorWorkspaceClient";
import { ExamPreparationClient } from "@/components/exams/ExamPreparationClient";
import { AcademicManagementClient } from "@/components/planner/AcademicManagementClient";
import { NotificationsPageClient } from "@/components/dashboard/NotificationsPageClient";
import { AdminPortalClient } from "@/components/admin/AdminPortalClient";

describe("Steps 6–10 Complete E-LEARNING ECOSYSTEM Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Step 6: defines all 6 dedicated AI Tutor learning modes and enforces student prompt safety", () => {
    expect(TUTOR_LEARNING_MODES.map((m) => m.id)).toEqual([
      "explain_topic",
      "solve_step_by_step",
      "practice_questions",
      "simplify_concept",
      "revision_assistant",
      "study_coach",
    ]);

    expect(evaluateStudentPromptSafety("").safe).toBe(false);
    expect(
      evaluateStudentPromptSafety("how to bypass live exam proctoring").safe
    ).toBe(false);
    expect(
      evaluateStudentPromptSafety(
        "Explain Ohm's Law and solve for current when V = 24V and R = 12 ohms."
      ).safe
    ).toBe(true);
  });

  it("Step 6: renders AI Tutor modes, saved conversations, AI transparency notice, and sends questions cleanly", async () => {
    sendTutorPromptMock.mockResolvedValueOnce({
      ok: true,
      conversationId: "conv-1",
      reply:
        "Scalar quantities have magnitude only (e.g., mass), while vectors have magnitude and direction (e.g., velocity).",
      suggestedQuestions: ["How do we resolve a vector into x and y components?"],
      provider: "openai",
      model: "gpt-4o-mini",
      isAiGenerated: true,
      isVerifiedEducationalMaterial: false,
      remainingDailyQuota: 59,
    });

    render(<AiTutorWorkspaceClient />);

    expect(
      await screen.findByText(/Personalized AI Study Tutor/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/AI Transparency Notice:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Scalars vs Vectors Deep Dive/i)
    ).toBeInTheDocument();

    const input = screen.getByLabelText(/Ask your academic question/i);
    fireEvent.change(input, {
      target: { value: "Differentiate scalar and vector quantities." },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Send$/i }));

    expect(
      await screen.findByText(
        /AI-Generated Study Response • Not Official Syllabus Material/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Scalar quantities have magnitude only/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/How do we resolve a vector into x and y components\?/i)
    ).toBeInTheDocument();
  });

  it("Step 7: renders Exam Preparation categories, non-affiliation disclaimers, review screen, and deterministic grading", async () => {
    startExamMock.mockResolvedValueOnce({
      ok: true,
      attempt: {
        id: "att-1",
        examCategoryCode: "WAEC",
        examName: "WAEC Practice Physics Practice",
        subject: "Physics",
        difficulty: "mixed",
        questionCount: 1,
        isTimed: true,
        timeLimitMinutes: 30,
        practiceSource: "curated_bank",
        status: "in_progress",
        startedAt: "2026-11-01T11:00:00Z",
        questions: [
          {
            key: "q-1",
            order: 1,
            questionType: "multiple_choice",
            topic: "Scalars & Vectors",
            difficulty: "easy",
            prompt:
              "A student walks 6 m East and 8 m North. Find the resultant displacement.",
            points: 2,
            originType: "curated_practice",
            options: [
              { key: "A", text: "14 m" },
              { key: "B", text: "10 m" },
            ],
          },
        ],
      },
    });

    submitExamMock.mockResolvedValueOnce({
      ok: true,
      summary: {
        attemptId: "att-1",
        scorePercent: 100,
        correctCount: 1,
        gradableCount: 1,
        weakTopics: [],
        revisionRecommendations: [],
      },
      responses: [
        {
          id: "resp-1",
          questionKey: "q-1",
          questionOrder: 1,
          questionType: "multiple_choice",
          topic: "Scalars & Vectors",
          prompt:
            "A student walks 6 m East and 8 m North. Find the resultant displacement.",
          studentAnswer: "B",
          status: "correct",
          isCorrect: true,
          isOfficiallyMarked: true,
          earnedPoints: 2,
          possiblePoints: 2,
          correctAnswerDisplay: "Option B",
          explanation: "sqrt(6^2 + 8^2) = 10 m.",
          aiWrittenFeedback: null,
        },
      ],
    });

    render(<ExamPreparationClient />);

    expect(
      await screen.findByText(/AI & Curated Exam Preparation/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Not affiliated with or endorsed by WAEC/i)
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Start Practice Examination/i })
    );

    expect(
      await screen.findByText(/A student walks 6 m East and 8 m North/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /10 m/i }));
    fireEvent.click(
      screen.getAllByRole("button", { name: /Review & Submit/i })[0]
    );

    expect(
      await screen.findByRole("heading", {
        name: /Review Answers Before Submission/i,
      })
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Submit Exam for Deterministic Grading/i,
      })
    );

    expect(
      await screen.findByText(/Score: 100% \(1 \/ 1 Objective Items\)/i)
    ).toBeInTheDocument();
  });

  it("Step 8: calculates truthful weekly & monthly study summaries and renders Planner, Timetable, Assignments & Timer tabs", async () => {
    const refNow = new Date("2026-11-01T12:00:00Z");
    const summary = computeStudyTimeSummary(
      [
        {
          id: "s1",
          title: "Vectors Drill",
          subject: "Physics",
          scheduledDate: "2026-10-30",
          startTime: null,
          durationMinutes: 45,
          actualDurationMinutes: 50,
          status: "completed",
          notes: null,
        },
        {
          id: "s2",
          title: "Algebra Practice",
          subject: "Mathematics",
          scheduledDate: "2026-10-15",
          startTime: null,
          durationMinutes: 40,
          actualDurationMinutes: 40,
          status: "completed",
          notes: null,
        },
        {
          id: "s3",
          title: "Unfinished Session",
          subject: "Physics",
          scheduledDate: "2026-11-01",
          startTime: null,
          durationMinutes: 60,
          actualDurationMinutes: null,
          status: "scheduled",
          notes: null,
        },
      ],
      refNow
    );

    expect(summary.weeklyMinutes).toBe(50);
    expect(summary.monthlyMinutes).toBe(90);
    expect(summary.completedSessionsCount).toBe(2);

    render(<AcademicManagementClient />);
    expect(
      await screen.findByText(/Academic Management System/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /My Planner/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Class Timetable/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Study Sessions/i })
    ).toBeInTheDocument();
  });

  it("Step 9A & 9B: filters/sorts private notes with pinned-first priority and renders Notification preferences & delete action", async () => {
    const sampleNotes: StudentNoteItem[] = [
      {
        id: "n1",
        title: "Logarithm Laws",
        description: "Math rules",
        content: "log(ab) = log a + log b",
        subject: "Mathematics",
        tags: ["algebra"],
        isPinned: false,
        isBookmarked: true,
        sourceCourseSlug: null,
        sourceLessonSlug: null,
        sourceLessonTitle: null,
        createdAt: "2026-11-01T08:00:00Z",
        updatedAt: "2026-11-01T11:00:00Z",
      },
      {
        id: "n2",
        title: "Ohm's Law Core Formula",
        description: "V = IR",
        content: "Voltage equals current times resistance",
        subject: "Physics",
        tags: ["circuits"],
        isPinned: true,
        isBookmarked: false,
        sourceCourseSlug: "dc-circuit-fundamentals-ohms-law",
        sourceLessonSlug: "ohms-law-and-resistive-circuits",
        sourceLessonTitle: "Ohm's Law",
        createdAt: "2026-11-01T07:00:00Z",
        updatedAt: "2026-11-01T09:00:00Z",
      },
    ];

    const sorted = filterAndSortNotes({
      notes: sampleNotes,
      query: "",
      subject: "all",
      onlyBookmarked: false,
    });
    expect(sorted[0].id).toBe("n2"); // Pinned note comes first

    const bookmarkedOnly = filterAndSortNotes({
      notes: sampleNotes,
      query: "log",
      subject: "Mathematics",
      onlyBookmarked: true,
    });
    expect(bookmarkedOnly).toHaveLength(1);
    expect(bookmarkedOnly[0].id).toBe("n1");

    render(<NotificationsPageClient />);
    expect(
      await screen.findByText(/Notification Preferences/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Optional Email & Web Push Setup:/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Upcoming Assignment Deadline: Kinematics Problem Set/i)
    ).toBeInTheDocument();
  });

  it("Step 9C & 10: blocks unauthenticated /admin in middleware, blocks non-admins in AdminPortalClient, and leaks zero AI keys in client files", async () => {
    const req = new NextRequest("https://3000-test.e2b.app/admin");
    const mwRes = await updateSupabaseSession(req);
    expect(mwRes.status).toBe(307);
    expect(mwRes.headers.get("location")).toContain("/login?next=%2Fadmin");

    render(<AdminPortalClient />);
    expect(
      await screen.findByText(/Administrator Access Required/i)
    ).toBeInTheDocument();

    // Scan all client components to verify zero secret env var references
    const walkFiles = (dir: string): string[] => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const out: string[] = [];
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...walkFiles(full));
        else if (e.name.endsWith(".tsx") || e.name.endsWith(".ts"))
          out.push(full);
      }
      return out;
    };

    const componentFiles = walkFiles(
      path.join(process.cwd(), "src", "components")
    );
    for (const file of componentFiles) {
      const src = fs.readFileSync(file, "utf8");
      expect(src).not.toContain("OPENAI_API_KEY");
      expect(src).not.toContain("OPENROUTER_API_KEY");
      expect(src).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
      expect(src).not.toContain("sk-proj-");
      expect(src).not.toContain("sk-or-v1-");
    }
  });
});
