import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextRequest } from "next/server";
import { StudentDashboardClient } from "@/components/dashboard/StudentDashboardClient";
import { NotificationsPageClient } from "@/components/dashboard/NotificationsPageClient";
import {
  buildExamPreparationContext,
  searchAvailableDashboardContent,
} from "@/lib/dashboard/examPathways";
import {
  computeAcademicProgressMetrics,
  queryStudentDashboardData,
} from "@/lib/dashboard/queryDashboard";
import { DASHBOARD_NAV_ITEMS } from "@/data/dashboardNavigation";
import type { StudentDashboardPayload } from "@/types/dashboard";
import type { StudentAcademicProfile } from "@/types/onboarding";

const pushMock = vi.fn();
const replaceMock = vi.fn();
const refreshMock = vi.fn();
let mockedPathname = "/dashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
    refresh: refreshMock,
  }),
  usePathname: () => mockedPathname,
}));

const dashboardServiceMocks = vi.hoisted(() => ({
  fetchStudentDashboard: vi.fn(),
  markDashboardNotificationsRead: vi.fn(),
}));

vi.mock("@/lib/dashboard/dashboardService", () => dashboardServiceMocks);

const signOutLearnerMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/authService", () => ({
  signOutLearner: signOutLearnerMock,
  updateAuthenticatedLearnerProfile: vi.fn(),
}));

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
}

function buildBaseAcademicProfile(
  overrides: Partial<StudentAcademicProfile> = {}
): StudentAcademicProfile {
  return {
    user_id: "student-ng-sec",
    academic_category: "secondary",
    country: "Nigeria",
    state_region: "Delta",
    institution_name: "Federal Government College, Warri",
    institution_type: null,
    secondary_category: "senior",
    faculty: null,
    department: null,
    course_or_program: null,
    qualification_type: null,
    academic_level: "SS 2",
    curriculum: "WAEC (WASSCE) / NERDC Senior Secondary Curriculum (Nigeria)",
    selected_subjects: ["Mathematics", "Physics", "Chemistry"],
    learning_goals: ["Prepare for examinations", "Improve my grades"],
    explanation_preference: "standard",
    current_step: 4,
    onboarding_completed: true,
    completed_at: "2026-11-01T16:00:00Z",
    created_at: "2026-11-01T15:00:00Z",
    updated_at: "2026-11-01T16:00:00Z",
    ...overrides,
  };
}

function buildEmptyDashboardPayload(
  academicOverrides: Partial<StudentAcademicProfile> = {},
  payloadOverrides: Partial<StudentDashboardPayload> = {}
): StudentDashboardPayload {
  const academicProfile = buildBaseAcademicProfile(academicOverrides);
  return {
    authenticated: true,
    emailVerified: true,
    onboardingCompleted: academicProfile.onboarding_completed,
    userId: "student-ng-sec",
    email: "adaeze.okafor@edu.ng",
    userProfile: {
      id: "student-ng-sec",
      full_name: "Adaeze Okafor",
      email: "adaeze.okafor@edu.ng",
      country: "Nigeria",
      role: "student",
      created_at: "2026-11-01T14:00:00Z",
      updated_at: "2026-11-01T14:00:00Z",
    },
    academicProfile,
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
    notifications: [],
    unreadNotificationCount: 0,
    ...payloadOverrides,
  };
}

describe("Step 4 — Personalized Student Dashboard, Academic Pathways & Zero Fabricated Data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPathname = "/dashboard";
    setViewport(1280);
  });

  it("protects /dashboard and /dashboard/* sub-routes in middleware for unauthenticated users", async () => {
    const { updateSupabaseSession } = await import("@/lib/supabase/middleware");

    const mainRes = await updateSupabaseSession(
      new NextRequest("http://localhost:3000/dashboard")
    );
    expect(mainRes.status).toBe(307);
    expect(mainRes.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fdashboard"
    );

    const subRouteRes = await updateSupabaseSession(
      new NextRequest("http://localhost:3000/dashboard/exams")
    );
    expect(subRouteRes.status).toBe(307);
    expect(subRouteRes.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fdashboard%2Fexams"
    );
  });

  it("renders real student identity, all 10 navigation items, honest empty states, and zero unread badge when no activity exists", async () => {
    expect(DASHBOARD_NAV_ITEMS).toHaveLength(10);
    expect(DASHBOARD_NAV_ITEMS.map((item) => item.label)).toEqual([
      "Dashboard",
      "Learn",
      "AI Tutor",
      "Exam Preparation",
      "My Planner",
      "My Notes",
      "My Progress",
      "Notifications",
      "My Profile",
      "Settings",
    ]);

    dashboardServiceMocks.fetchStudentDashboard.mockResolvedValueOnce({
      status: "ok",
      data: buildEmptyDashboardPayload(),
    });

    render(<StudentDashboardClient />);

    // Personalized Welcome Section
    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "Welcome back, Adaeze Okafor",
        })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("Your next chapter of learning starts here.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Federal Government College, Warri")
    ).toBeInTheDocument();
    expect(screen.getByText("SS 2")).toBeInTheDocument();
    expect(screen.getAllByText("Mathematics").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Physics").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Chemistry").length).toBeGreaterThanOrEqual(1);

    // Desktop Sidebar contains all 10 navigation items
    const desktopNav = screen.getByRole("navigation", {
      name: /^Dashboard navigation$/i,
    });
    for (const navItem of DASHBOARD_NAV_ITEMS) {
      expect(
        within(desktopNav).getByRole("link", {
          name: new RegExp(`^${navItem.label}$`),
        })
      ).toBeInTheDocument();
    }

    // AI Tutor Shortcut Card
    expect(
      screen.getByRole("heading", { name: "Your Personal AI Tutor" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Understand difficult concepts, get step-by-step explanations and improve your knowledge."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Ask AI Tutor/i })
    ).toHaveAttribute("href", "/dashboard/ai-tutor");

    // Honest empty states (zero fake progress, assignments, study sessions, or scores)
    expect(screen.getByText("No Ongoing Courses Yet")).toBeInTheDocument();
    expect(
      screen.getByText("No Study Plan Scheduled for Today")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Create Study Plan/i })
    ).toHaveAttribute("href", "/dashboard/planner");
    expect(screen.getByText("No Upcoming Assignments")).toBeInTheDocument();
    expect(
      screen.getByText("No Learning Activity Recorded Yet")
    ).toBeInTheDocument();
    expect(
      screen.getByText("No Published Courses Available Yet")
    ).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();

    // Unread notification badge must NOT appear when unreadNotificationCount === 0
    expect(
      screen.queryByRole("link", { name: /unread\)/i })
    ).not.toBeInTheDocument();
  });

  it("adapts Exam Preparation pathways accurately across Nigerian Secondary (Senior & Junior), University, and Polytechnic profiles", async () => {
    // 1. Nigerian Senior Secondary (SS 2) -> WAEC, NECO, JAMB UTME
    const ngSeniorContext = buildExamPreparationContext(
      buildBaseAcademicProfile({
        academic_category: "secondary",
        country: "Nigeria",
        secondary_category: "senior",
        academic_level: "SS 2",
      })
    );
    expect(ngSeniorContext.tracks.map((t) => t.code)).toEqual([
      "WAEC",
      "NECO",
      "JAMB UTME",
    ]);

    // 2. Nigerian Junior Secondary (JSS 2) -> WAEC & NECO BECE (does not force JAMB UTME prematurely)
    const ngJuniorContext = buildExamPreparationContext(
      buildBaseAcademicProfile({
        academic_category: "secondary",
        country: "Nigeria",
        secondary_category: "junior",
        academic_level: "JSS 2",
      })
    );
    expect(ngJuniorContext.tracks.map((t) => t.code)).toEqual(["WAEC", "NECO"]);
    expect(ngJuniorContext.tracks.some((t) => t.code === "JAMB UTME")).toBe(
      false
    );

    // 3. University Student (300 Level) -> University semester & continuous assessment
    const uniProfile = buildBaseAcademicProfile({
      academic_category: "university",
      institution_name: "University of Benin",
      secondary_category: null,
      faculty: "Faculty of Engineering",
      department: "Electrical & Electronic Engineering",
      course_or_program: "B.Eng. Electrical Engineering",
      academic_level: "300",
      selected_subjects: ["Control Theory", "Power Electronics"],
    });

    dashboardServiceMocks.fetchStudentDashboard.mockResolvedValueOnce({
      status: "ok",
      data: buildEmptyDashboardPayload({}, { academicProfile: uniProfile }),
    });

    const { unmount } = render(<StudentDashboardClient />);

    await waitFor(() => {
      expect(screen.getByText("University of Benin")).toBeInTheDocument();
    });
    expect(screen.getByText("300 Level")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Prepare. Practice. Succeed." })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Course & Semester Examinations")
    ).toBeInTheDocument();
    expect(screen.queryByText("JAMB UTME")).not.toBeInTheDocument();
    unmount();

    // 4. Polytechnic Student (ND 2) -> Polytechnic / Technical assessments
    const polyProfile = buildBaseAcademicProfile({
      academic_category: "polytechnic",
      institution_name: "Petroleum Training Institute, Effurun",
      institution_type: "Monotechnic / Specialized Technical Institute",
      secondary_category: null,
      department: "Petroleum Engineering Technology",
      course_or_program: "Petroleum & Natural Gas Processing",
      qualification_type: "ND",
      academic_level: "ND 2",
      selected_subjects: ["Drilling Fluids"],
    });

    dashboardServiceMocks.fetchStudentDashboard.mockResolvedValueOnce({
      status: "ok",
      data: buildEmptyDashboardPayload({}, { academicProfile: polyProfile }),
    });

    render(<StudentDashboardClient />);

    await waitFor(() => {
      expect(
        screen.getByText("Petroleum Training Institute, Effurun")
      ).toBeInTheDocument();
    });
    expect(screen.getByText("ND 2 (ND)")).toBeInTheDocument();
    expect(
      screen.getByText("Diploma & Technical Assessments")
    ).toBeInTheDocument();
    expect(screen.queryByText("WAEC (WASSCE)")).not.toBeInTheDocument();
  });

  it("retrieves and aggregates real Supabase records (courses, study plan, assignments, progress chart, unread notifications, and search)", async () => {
    const richPayload = buildEmptyDashboardPayload(
      {},
      {
        ongoingCourses: [
          {
            id: "prog-1",
            course_id: "course-1",
            course_slug: "senior-physics-mechanics",
            course_title: "Senior Secondary Mechanics & Waves",
            subject: "Physics",
            topic_or_lesson: "Projectile Motion & Parabolic Trajectories",
            lessons_completed: 6,
            total_lessons: 10,
            progress_percent: 60,
            last_accessed_at: "2026-11-01T15:30:00Z",
          },
        ],
        publishedCourses: [
          {
            id: "course-1",
            slug: "senior-physics-mechanics",
            title: "Senior Secondary Mechanics & Waves",
            subject: "Physics",
            academic_category: "secondary",
            current_topic: "Wave Optics",
            summary: "Kinematics, vectors, and wave optics for WASSCE.",
            total_lessons: 10,
            is_published: true,
          },
        ],
        todayStudySessions: [
          {
            id: "sess-1",
            title: "Solve 15 Projectile Motion Problems",
            subject: "Physics",
            scheduled_date: "2026-11-01",
            start_time: "17:00:00",
            duration_minutes: 45,
            status: "scheduled",
          },
        ],
        upcomingAssignments: [
          {
            id: "assign-1",
            title: "Stoichiometry & Mole Concept Worksheet",
            subject: "Chemistry",
            due_at: "2026-11-05T12:00:00Z",
            priority: "high",
            status: "pending",
          },
        ],
        progressMetrics: computeAcademicProgressMetrics(
          [
            {
              id: "prog-1",
              course_id: "course-1",
              current_lesson_title:
                "Projectile Motion & Parabolic Trajectories",
              lessons_completed: 6,
              total_lessons: 10,
              progress_percent: 60,
              last_accessed_at: "2026-11-01T15:30:00Z",
              completed_at: null,
            },
          ],
          [
            {
              id: "assess-1",
              title: "Kinematics Diagnostic",
              subject: "Physics",
              score_percent: 84,
              recorded_at: "2026-11-01T12:00:00Z",
            },
          ]
        ),
        notifications: [
          {
            id: "notif-1",
            title: "Assignment Due Soon",
            body: "Stoichiometry worksheet is due Nov 5.",
            category: "assignment",
            action_url: "/dashboard",
            is_read: false,
            read_at: null,
            created_at: "2026-11-01T14:00:00Z",
          },
        ],
        unreadNotificationCount: 1,
      }
    );

    dashboardServiceMocks.fetchStudentDashboard.mockResolvedValueOnce({
      status: "ok",
      data: richPayload,
    });

    const user = userEvent.setup();
    render(<StudentDashboardClient />);

    await waitFor(() => {
      expect(
        screen.getAllByText("Senior Secondary Mechanics & Waves").length
      ).toBeGreaterThanOrEqual(1);
    });

    // Progress bar & percentage from real course progress
    expect(
      screen.getByRole("progressbar", {
        name: "Senior Secondary Mechanics & Waves progress",
      })
    ).toHaveAttribute("aria-valuenow", "60");

    // Today's study session & duration
    expect(
      screen.getByText("Solve 15 Projectile Motion Problems")
    ).toBeInTheDocument();
    expect(screen.getByText("45 min")).toBeInTheDocument();

    // Upcoming assignment
    expect(
      screen.getByText("Stoichiometry & Mole Concept Worksheet")
    ).toBeInTheDocument();

    // Academic Progress metrics & SVG Subject Performance chart
    expect(screen.getByText("84%")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Physics average performance 84%" })
    ).toBeInTheDocument();

    // Unread notification badge appears ONLY because unreadNotificationCount === 1
    expect(
      screen.getByRole("link", { name: "Notifications (1 unread)" })
    ).toBeInTheDocument();

    // Real Search: matches real lesson/course and shows honest empty state for nonexistent query
    const searchInput = screen.getByLabelText(
      /Search courses, subjects, lessons, and topics/i
    );
    await user.type(searchInput, "Parabolic");
    expect(
      screen.getByText(/Ongoing lesson • Senior Secondary Mechanics & Waves/i)
    ).toBeInTheDocument();

    await user.clear(searchInput);
    await user.type(searchInput, "QuantumTeleportation999");
    expect(
      screen.getByText(
        /No matching courses, subjects, lessons, or topics available/i
      )
    ).toBeInTheDocument();

    // Direct unit check on search helper
    expect(
      searchAvailableDashboardContent("   ", {
        publishedCourses: richPayload.publishedCourses,
        ongoingCourses: richPayload.ongoingCourses,
        academicProfile: richPayload.academicProfile,
      })
    ).toEqual([]);
  });

  it("supports Profile Menu actions (Full name, Email, Category, Institution, Level, Edit Academic Info, Account Settings, Sign Out) and Mobile Navigation", async () => {
    setViewport(375);
    signOutLearnerMock.mockResolvedValueOnce(undefined);

    dashboardServiceMocks.fetchStudentDashboard.mockResolvedValueOnce({
      status: "ok",
      data: buildEmptyDashboardPayload(),
    });

    const user = userEvent.setup();
    render(<StudentDashboardClient />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Welcome back, Adaeze Okafor" })
      ).toBeInTheDocument();
    });

    // Verify Mobile Bottom Navigation exists cleanly
    const bottomNav = screen.getByRole("navigation", {
      name: /Mobile quick navigation/i,
    });
    expect(within(bottomNav).getByText("Home")).toBeInTheDocument();
    expect(within(bottomNav).getByText("AI Tutor")).toBeInTheDocument();

    // Open Mobile Navigation Drawer and verify all 10 items are reachable on mobile
    await user.click(
      screen.getByRole("button", { name: /Open dashboard navigation/i })
    );
    const mobileDialog = screen.getByRole("dialog", {
      name: /Mobile dashboard navigation/i,
    });
    expect(within(mobileDialog).getByText("My Notes")).toBeInTheDocument();
    await user.click(
      within(mobileDialog).getByRole("button", {
        name: /Close navigation drawer/i,
      })
    );

    // Open Student Profile Menu & verify all required details + links + Sign Out
    await user.click(
      screen.getByRole("button", { name: /Open student profile menu/i })
    );
    const profileMenu = screen.getByRole("menu", {
      name: /Student profile details and actions/i,
    });
    expect(within(profileMenu).getByText("Adaeze Okafor")).toBeInTheDocument();
    expect(
      within(profileMenu).getByText("adaeze.okafor@edu.ng")
    ).toBeInTheDocument();
    expect(
      within(profileMenu).getByText("Secondary School")
    ).toBeInTheDocument();
    expect(
      within(profileMenu).getByText("Federal Government College, Warri")
    ).toBeInTheDocument();
    expect(within(profileMenu).getByText("SS 2")).toBeInTheDocument();

    const editLink = within(profileMenu).getByRole("menuitem", {
      name: /Edit academic information/i,
    });
    expect(editLink).toHaveAttribute("href", "/onboarding?review=1");

    const settingsLink = within(profileMenu).getByRole("menuitem", {
      name: /Account settings/i,
    });
    expect(settingsLink).toHaveAttribute("href", "/dashboard/settings");

    await user.click(
      within(profileMenu).getByRole("menuitem", { name: /Sign out/i })
    );
    expect(signOutLearnerMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("handles missing/incomplete onboarding redirect, friendly error + retry recovery, and notification mark-as-read", async () => {
    const user = userEvent.setup();

    // 1. Error state followed by Retry recovery
    dashboardServiceMocks.fetchStudentDashboard
      .mockResolvedValueOnce({
        status: "error",
        message: "Temporary connection timeout while loading dashboard.",
      })
      .mockResolvedValueOnce({
        status: "ok",
        data: buildEmptyDashboardPayload(
          {},
          {
            notifications: [
              {
                id: "n-100",
                title: "Welcome to Command Center",
                body: "Your academic workspace is active.",
                category: "system",
                action_url: null,
                is_read: false,
                read_at: null,
                created_at: "2026-11-01T16:00:00Z",
              },
            ],
            unreadNotificationCount: 1,
          }
        ),
      });

    dashboardServiceMocks.markDashboardNotificationsRead.mockResolvedValue(
      true
    );

    const { unmount } = render(<NotificationsPageClient />);

    await waitFor(() => {
      expect(
        screen.getByText("Temporary connection timeout while loading dashboard.")
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /Retry Loading Dashboard/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText("Welcome to Command Center")
      ).toBeInTheDocument();
    });
    expect(screen.getByText("1 unread")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Mark read/i }));
    expect(
      dashboardServiceMocks.markDashboardNotificationsRead
    ).toHaveBeenCalledWith({ notificationId: "n-100" });
    await waitFor(() => {
      expect(screen.queryByText("1 unread")).not.toBeInTheDocument();
    });
    unmount();

    // 2. Incomplete academic profile smoothly redirects to /onboarding
    dashboardServiceMocks.fetchStudentDashboard.mockResolvedValueOnce({
      status: "ok",
      data: buildEmptyDashboardPayload({ onboarding_completed: false }),
    });

    render(<StudentDashboardClient />);
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/onboarding");
    });
  });

  it("executes queryStudentDashboardData across all 12 dashboard & learning Supabase tables cleanly", async () => {
    const mockFrom = vi.fn((table: string) => {
      const emptyChain = {
        select: () => emptyChain,
        eq: () => emptyChain,
        neq: () => emptyChain,
        in: () => emptyChain,
        gte: () => emptyChain,
        order: () => emptyChain,
        limit: async () => ({ data: [], error: null }),
        maybeSingle: async () => {
          if (table === "profiles") {
            return {
              data: {
                id: "u-q1",
                full_name: "Chinedu Eze",
                email: "chinedu@edu.ng",
                country: "Nigeria",
                role: "student",
                created_at: "2026-11-01T10:00:00Z",
                updated_at: "2026-11-01T10:00:00Z",
              },
              error: null,
            };
          }
          if (table === "student_academic_profiles") {
            return {
              data: buildBaseAcademicProfile({ user_id: "u-q1" }),
              error: null,
            };
          }
          return { data: null, error: null };
        },
      };
      return emptyChain;
    });

    const payload = await queryStudentDashboardData(
      { from: mockFrom } as unknown as Parameters<
        typeof queryStudentDashboardData
      >[0],
      "u-q1",
      "chinedu@edu.ng"
    );

    expect(payload.userProfile?.full_name).toBe("Chinedu Eze");
    expect(payload.academicProfile?.academic_level).toBe("SS 2");
    expect(payload.unreadNotificationCount).toBe(0);
    expect(mockFrom).toHaveBeenCalledTimes(12);
  });
});
