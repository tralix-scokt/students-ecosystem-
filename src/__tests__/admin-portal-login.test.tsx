import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  normalizeEmail,
  validateLoginInput,
} from "@/lib/validation/authValidation";
import {
  cleanAlocQuestionHtml,
  resolveAlocSubjectSlug,
} from "@/lib/exams/pastQuestionsClient";

const pushMock = vi.fn();
const replaceMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
    refresh: refreshMock,
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(""),
  usePathname: () => "/login",
}));

const signInLearnerMock = vi.fn();
const signOutLearnerMock = vi.fn(async () => ({ ok: true }));

vi.mock("@/lib/auth/authService", () => ({
  signInLearner: (...args: unknown[]) => signInLearnerMock(...args),
  signOutLearner: () => signOutLearnerMock(),
  resendVerificationEmail: vi.fn(),
}));

const fetchAdminDashboardPayloadMock = vi.fn();
const logAdminAuditActionMock = vi.fn<(_arg?: unknown) => Promise<void>>(
  async () => undefined
);

vi.mock("@/lib/admin/adminService", () => ({
  fetchAdminDashboardPayload: () => fetchAdminDashboardPayloadMock(),
  logAdminAuditAction: (arg: unknown) => logAdminAuditActionMock(arg),
}));

import { BookLoginLeftPage } from "@/components/book/BookLoginLeftPage";
import { AdminPortalClient } from "@/components/admin/AdminPortalClient";

describe("Admin Login Routing & Executive Governance Command Center", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates tralixscokt@gmail.com and scokt@2012 cleanly in login validation", () => {
    const errors = validateLoginInput({
      email: "  TralixScokt@gmail.com ",
      password: "scokt@2012",
    });
    expect(errors).toEqual({});
    expect(normalizeEmail("  TralixScokt@gmail.com ")).toBe(
      "tralixscokt@gmail.com"
    );
  });

  it("routes directly to /admin when signing in as an administrator", async () => {
    signInLearnerMock.mockResolvedValueOnce({
      status: "success",
      title: "Signed In",
      message: "Signed in successfully.",
      redirectTo: "/admin",
    });

    render(
      <BookLoginLeftPage
        isInteractive={true}
        onNavigateRegister={vi.fn()}
        onNavigateRecovery={vi.fn()}
        onNavigateVerifyEmail={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "tralixscokt@gmail.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: "scokt@2012" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Sign In$/i }));

    await waitFor(() => {
      expect(signInLearnerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "tralixscokt@gmail.com",
          password: "scokt@2012",
        })
      );
      expect(pushMock).toHaveBeenCalledWith("/admin");
    });
  });

  it("renders the ready Admin Governance Command Center with admin identity, search/filter, and sign-out", async () => {
    fetchAdminDashboardPayloadMock.mockResolvedValueOnce({
      status: "ready",
      adminIdentity: {
        fullName: "Tralix scokt",
        email: "tralixscokt@gmail.com",
      },
      overview: {
        totalUsers: 5,
        studentUsers: 4,
        educatorUsers: 0,
        adminUsers: 1,
        onboardedStudents: 4,
        publishedCourses: 12,
        draftCourses: 0,
        publishedSubjects: 8,
        publishedLessons: 36,
        publishedExamQuestions: 45,
        submittedExamAttempts: 8,
        aiRequestsTotal: 64,
        aiRequests24h: 19,
        aiErrors24h: 0,
        publishedAnnouncements: 2,
      },
      users: [
        {
          id: "1be5ed88-01ed-49b9-a65b-e88e2dea4459",
          fullName: "Tralix scokt",
          email: "tralixscokt@gmail.com",
          country: "Nigeria",
          role: "admin",
          createdAt: "2026-11-01T15:05:32Z",
        },
        {
          id: "22222222-2222-2222-2222-222222222222",
          fullName: "Adaeze Nwosu",
          email: "adaeze@example.com",
          country: "Nigeria",
          role: "student",
          createdAt: "2026-11-02T08:00:00Z",
        },
      ],
      courses: [],
      examCategories: [{ id: "cat-1", code: "WAEC", shortLabel: "WAEC" }],
      examQuestions: [],
      announcements: [
        {
          id: "ann-1",
          title: "Welcome to 2026 Academic Term",
          body: "Mock CBT sessions are open.",
          targetCategory: "all",
          isPublished: true,
          createdAt: "2026-11-02T09:00:00Z",
        },
      ],
      aiSettings: {
        aiEnabled: true,
        defaultProvider: "openai",
        defaultModel: "gpt-4o-mini",
        fallbackModel: "openai/gpt-4o-mini",
        dailyRequestLimitPerStudent: 60,
        maxTokensPerResponse: 1100,
      },
      aiUsageLogs: [],
      auditLogs: [],
      systemHealth: { status: "healthy" },
    });

    render(<AdminPortalClient />);

    expect(
      await screen.findByText(/Admin Governance Command Center/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Tralix scokt/i)).toBeInTheDocument();
    expect(screen.getByText(/tralixscokt@gmail\.com/i)).toBeInTheDocument();

    // Switch to Student & Role Access tab and filter by search
    fireEvent.click(
      screen.getByRole("button", { name: /Student & Role Access/i })
    );
    expect(screen.getByText("Adaeze Nwosu")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(
      /Search users by name, email, or country/i
    );
    fireEvent.change(searchInput, { target: { value: "tralix" } });
    expect(screen.queryByText("Adaeze Nwosu")).not.toBeInTheDocument();
    expect(screen.getAllByText(/Tralix scokt/i).length).toBeGreaterThanOrEqual(
      2
    );

    // Sign out from Admin Header
    fireEvent.click(screen.getByRole("button", { name: /Sign Out/i }));
    await waitFor(() => {
      expect(signOutLearnerMock).toHaveBeenCalledTimes(1);
      expect(replaceMock).toHaveBeenCalledWith("/login");
    });
  });

  it("maps Nigerian exam subjects & sanitizes ALOC HTML past questions cleanly", () => {
    expect(resolveAlocSubjectSlug("Use of English")).toBe("english");
    expect(resolveAlocSubjectSlug("Literature in English")).toBe("englishlit");
    expect(resolveAlocSubjectSlug("Financial Accounting")).toBe("accounting");
    expect(resolveAlocSubjectSlug("Civic Education")).toBe("civiledu");
    expect(resolveAlocSubjectSlug("Christian Religious Studies")).toBe("crk");

    const cleaned = cleanAlocQuestionHtml(
      "<p>Solve <i>x</i><sup>2</sup> + H<sub>2</sub>O at 100&deg;C &times; 2</p>"
    );
    expect(cleaned).toBe("Solve x² + H₂O at 100°C × 2");
  });
});
