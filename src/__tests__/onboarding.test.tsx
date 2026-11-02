import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextRequest } from "next/server";
import { OnboardingStageClient } from "@/components/onboarding/OnboardingStageClient";
import { getSecondaryCurricula } from "@/data/onboardingOptions";
import type { StudentAcademicProfile } from "@/types/onboarding";

const pushMock = vi.fn();
const replaceMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
    refresh: refreshMock,
  }),
}));

const onboardingServiceMocks = vi.hoisted(() => ({
  fetchLearnerOnboardingBundle: vi.fn(),
  saveLearnerOnboarding: vi.fn(),
  resolveBrowserOnboardingDestination: vi.fn(),
}));

vi.mock("@/lib/onboarding/onboardingService", () => onboardingServiceMocks);

vi.mock("@/lib/auth/authService", () => ({
  signOutLearner: vi.fn(),
  updateAuthenticatedLearnerProfile: vi.fn(),
}));

const mockDbRows = new Map<string, StudentAcademicProfile>();
const mockAuthGetUser = vi.fn();
const mockAuthSignIn = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  REMEMBER_COOKIE_NAME: "se_remember",
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: mockAuthGetUser,
      signInWithPassword: mockAuthSignIn,
      signOut: vi.fn(),
    },
    from: (table: string) => {
      if (table === "student_academic_profiles") {
        return {
          select: () => ({
            eq: (_col: string, userId: string) => ({
              maybeSingle: async () => ({
                data: mockDbRows.get(userId) ?? null,
                error: null,
              }),
            }),
          }),
          upsert: (payload: Omit<StudentAcademicProfile, "created_at" | "updated_at" | "completed_at">) => ({
            select: () => ({
              single: async () => {
                const saved: StudentAcademicProfile = {
                  ...payload,
                  completed_at: payload.onboarding_completed
                    ? "2026-11-01T16:00:00Z"
                    : null,
                  created_at: "2026-11-01T15:30:00Z",
                  updated_at: "2026-11-01T16:00:00Z",
                };
                mockDbRows.set(payload.user_id, saved);
                return { data: saved, error: null };
              },
            }),
          }),
        };
      }
      return {
        update: () => ({
          eq: async () => ({ data: null, error: null }),
        }),
      };
    },
  })),
}));

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
}

describe("Step 3 — Pathway 1: Secondary School Onboarding, Nigerian Curricula & Navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbRows.clear();
    setViewport(1280);
  });

  it("prioritizes Nigerian curricula at the top for Nigerian students across Junior and Senior Secondary", () => {
    const ngSenior = getSecondaryCurricula("Nigeria", "senior");
    expect(ngSenior[0]).toContain("WAEC (WASSCE)");

    const ngJunior = getSecondaryCurricula("Nigeria", "junior");
    expect(ngJunior[0]).toContain("NERDC Junior Secondary");

    const ukSenior = getSecondaryCurricula("United Kingdom", "senior");
    expect(ukSenior[0]).toContain("Cambridge");
  });

  it("completes the full Secondary School pathway with Back/Continue, multi-subject selection, goals, and Completion Summary", async () => {
    onboardingServiceMocks.fetchLearnerOnboardingBundle.mockResolvedValueOnce({
      authenticated: true,
      emailVerified: true,
      userId: "u-sec-1",
      email: "adaeze@edu.ng",
      userProfile: {
        id: "u-sec-1",
        full_name: "Adaeze Okafor",
        email: "adaeze@edu.ng",
        country: "Nigeria",
        role: "student",
        created_at: "2026-11-01T10:00:00Z",
        updated_at: "2026-11-01T10:00:00Z",
      },
      academicProfile: null,
    });

    onboardingServiceMocks.saveLearnerOnboarding.mockImplementation(
      async (state) => ({
        ok: true,
        status: "saved",
        message: "Saved",
        profile: {
          user_id: "u-sec-1",
          academic_category: state.academicCategory,
          country: state.country || null,
          state_region: state.stateRegion || null,
          institution_name: state.institutionName || null,
          institution_type: null,
          secondary_category: state.secondaryCategory,
          faculty: null,
          department: null,
          course_or_program: null,
          qualification_type: null,
          academic_level: state.academicLevel || null,
          curriculum: state.curriculum || null,
          selected_subjects: state.selectedSubjects,
          learning_goals: state.learningGoals,
          explanation_preference: state.explanationPreference,
          current_step: state.currentStep,
          onboarding_completed: state.onboardingCompleted,
          completed_at: state.onboardingCompleted
            ? "2026-11-01T16:00:00Z"
            : null,
          created_at: "2026-11-01T15:00:00Z",
          updated_at: "2026-11-01T16:00:00Z",
        },
      })
    );

    const user = userEvent.setup();
    render(
      <OnboardingStageClient
        initialUserId="u-sec-1"
        initialEmail="adaeze@edu.ng"
        initialFullName="Adaeze Okafor"
        initialCountry="Nigeria"
        initialProfile={null}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "Select Your Academic Level.",
        })
      ).toBeInTheDocument();
    });

    // Continue button disabled before selecting one of the 3 cards
    const continueBtn = screen.getByRole("button", { name: /^Continue$/i });
    expect(continueBtn).toBeDisabled();

    // Verify only one category can be selected at a time
    const secondaryCard = screen.getByRole("radio", {
      name: /SECONDARY SCHOOL/i,
    });
    const universityCard = screen.getByRole("radio", { name: /UNIVERSITY/i });

    await user.click(universityCard);
    expect(universityCard).toHaveAttribute("aria-checked", "true");
    await user.click(secondaryCard);
    expect(secondaryCard).toHaveAttribute("aria-checked", "true");
    expect(universityCard).toHaveAttribute("aria-checked", "false");
    expect(continueBtn).not.toBeDisabled();

    await user.click(continueBtn);

    // Step 2: Secondary School Details
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Your Academic Details." })
      ).toBeInTheDocument();
    });

    // Test Back navigation returns to Step 1 with selection preserved
    await user.click(screen.getByRole("button", { name: /^Back$/i }));
    expect(
      screen.getByRole("radio", { name: /SECONDARY SCHOOL/i })
    ).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("button", { name: /^Continue$/i }));

    // Validate required Step 2 fields before filling
    await user.click(screen.getByRole("button", { name: /^Continue$/i }));
    expect(
      screen.getByText(/Please enter or select your state or region/i)
    ).toBeInTheDocument();

    // Fill Nigerian Secondary details (School name left optional/blank first, then filled)
    await user.selectOptions(
      screen.getByLabelText(/State or region/i),
      "Delta"
    );
    await user.click(
      screen.getByRole("radio", { name: /Senior Secondary \(SS\)/i })
    );
    await user.click(screen.getByRole("radio", { name: "SS 2" }));
    await user.selectOptions(
      screen.getByLabelText(/^Curriculum$/i),
      "WAEC (WASSCE) / NERDC Senior Secondary Curriculum (Nigeria)"
    );

    await user.click(screen.getByRole("button", { name: /^Continue$/i }));

    // Step 3: Subjects & Learning Goals
    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: /Subjects & Learning Goals/i,
        })
      ).toBeInTheDocument();
    });

    // Attempting completion without subjects/goals shows clear validation errors
    await user.click(
      screen.getByRole("button", { name: /Complete Onboarding/i })
    );
    expect(
      screen.getByText(/Please select at least one subject/i)
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mathematics" }));
    await user.click(screen.getByRole("button", { name: "Physics" }));
    await user.click(screen.getByRole("button", { name: "Chemistry" }));
    await user.click(
      screen.getByRole("button", { name: "Prepare for examinations" })
    );
    await user.click(screen.getByRole("button", { name: "Improve my grades" }));
    await user.click(screen.getByRole("radio", { name: /^Standard/i }));

    await user.click(
      screen.getByRole("button", { name: /Complete Onboarding/i })
    );

    // Step 4: Completion Summary
    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "YOUR LEARNING JOURNEY IS READY.",
        })
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        "We’ve personalized your learning environment. Your next chapter starts now."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Delta, Nigeria")).toBeInTheDocument();
    expect(screen.getByText("SS 2 (Senior Secondary)")).toBeInTheDocument();

    const enterButton = screen.getByRole("button", {
      name: /ENTER MY LEARNING SPACE/i,
    });
    await user.click(enterButton);
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });
});

describe("Step 3 — Pathway 2 (University) & Pathway 3 (Polytechnic / Technical College)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbRows.clear();
    setViewport(1280);
  });

  it("supports University manual institution & course entry and persists via POST /api/onboarding", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      "https://epngfzpghwdwycpeqsfi.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-test-key";

    mockAuthGetUser.mockResolvedValue({
      data: {
        user: {
          id: "u-uni-1",
          email: "tunde@uni.edu.ng",
          email_confirmed_at: "2026-11-01T10:00:00Z",
        },
      },
      error: null,
    });

    const { POST } = await import("@/app/api/onboarding/route");

    const res = await POST(
      new Request("http://localhost:3000/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "complete",
          data: {
            academicCategory: "university",
            country: "Nigeria",
            stateRegion: "Rivers",
            institutionName: "Custom Manual University of Science",
            institutionType: "",
            secondaryCategory: null,
            faculty: "Faculty of Computing",
            department: "Software Engineering",
            courseOrProgram: "B.Sc. Software & Distributed Systems",
            qualificationType: null,
            academicLevel: "400",
            curriculum: "",
            selectedSubjects: ["Distributed Systems"],
            learningGoals: [
              "Understand difficult subjects",
              "Improve academic performance",
            ],
            explanationPreference: "advanced",
            currentStep: 4,
            onboardingCompleted: true,
          },
        }),
      })
    );

    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.profile.institution_name).toBe(
      "Custom Manual University of Science"
    );
    expect(json.profile.course_or_program).toBe(
      "B.Sc. Software & Distributed Systems"
    );
    expect(json.profile.academic_level).toBe("400");
    expect(json.profile.onboarding_completed).toBe(true);
  });

  it("validates Polytechnic ND/HND strict levels and supports flexible technical/vocational levels", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      "https://epngfzpghwdwycpeqsfi.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-test-key";

    mockAuthGetUser.mockResolvedValue({
      data: {
        user: {
          id: "u-poly-1",
          email: "emeka@poly.edu.ng",
          email_confirmed_at: "2026-11-01T10:00:00Z",
        },
      },
      error: null,
    });

    const { POST } = await import("@/app/api/onboarding/route");

    // 1. Reject invalid ND level (e.g. HND 2 paired with ND qualification)
    const invalidRes = await POST(
      new Request("http://localhost:3000/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "step-2",
          data: {
            academicCategory: "polytechnic",
            country: "Nigeria",
            stateRegion: "Delta",
            institutionName: "Petroleum Training Institute, Effurun",
            institutionType: "Monotechnic / Specialized Technical Institute",
            department: "Mechanical Engineering Technology",
            courseOrProgram: "Welding & Fabrication Technology",
            qualificationType: "ND",
            academicLevel: "HND 2",
          },
        }),
      })
    );
    expect(invalidRes.status).toBe(400);
    const invalidJson = await invalidRes.json();
    expect(invalidJson.fieldErrors?.academicLevel).toBe(
      "ND level must be ND 1 or ND 2."
    );

    // 2. Accept Vocational / Technical Program with flexible custom year/stage
    const validVocationalRes = await POST(
      new Request("http://localhost:3000/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "complete",
          data: {
            academicCategory: "polytechnic",
            country: "Nigeria",
            stateRegion: "Lagos",
            institutionName: "Yaba College of Technology",
            institutionType: "Polytechnic",
            department: "Industrial Maintenance",
            courseOrProgram: "Solar & Inverter Systems Installation",
            qualificationType: "Vocational / Technical Program",
            academicLevel: "Year 2 — Practical Trade Stage",
            selectedSubjects: [],
            learningGoals: ["Develop better study habits"],
            explanationPreference: "simple",
            currentStep: 4,
            onboardingCompleted: true,
          },
        }),
      })
    );
    const validJson = await validVocationalRes.json();
    expect(validVocationalRes.status).toBe(200);
    expect(validJson.profile.qualification_type).toBe(
      "Vocational / Technical Program"
    );
    expect(validJson.profile.academic_level).toBe(
      "Year 2 — Practical Trade Stage"
    );
  });
});

describe("Step 3 — Page Refresh Recovery, Completed Redirects & Mobile Responsiveness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbRows.clear();
  });

  it("recovers saved incomplete onboarding on page refresh at the exact saved step on a 375px mobile viewport", async () => {
    setViewport(375);

    const savedIncomplete: StudentAcademicProfile = {
      user_id: "u-resume",
      academic_category: "polytechnic",
      country: "Nigeria",
      state_region: "Edo",
      institution_name: "Auchi Polytechnic",
      institution_type: "Polytechnic",
      secondary_category: null,
      faculty: null,
      department: "Accountancy",
      course_or_program: "Accountancy",
      qualification_type: "HND",
      academic_level: "HND 1",
      curriculum: null,
      selected_subjects: [],
      learning_goals: ["Improve my grades"],
      explanation_preference: null,
      current_step: 3,
      onboarding_completed: false,
      completed_at: null,
      created_at: "2026-11-01T14:00:00Z",
      updated_at: "2026-11-01T15:00:00Z",
    };

    onboardingServiceMocks.fetchLearnerOnboardingBundle.mockResolvedValueOnce({
      authenticated: true,
      emailVerified: true,
      userId: "u-resume",
      email: "osaze@auchipoly.edu.ng",
      userProfile: null,
      academicProfile: savedIncomplete,
    });

    render(
      <OnboardingStageClient
        initialUserId="u-resume"
        initialEmail="osaze@auchipoly.edu.ng"
        initialFullName="Osaze Igbinedion"
        initialCountry="Nigeria"
        initialProfile={null}
      />
    );

    // Resumes directly at Step 3 (Subjects & Learning Goals) with "Improve my grades" pre-selected
    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: /Subjects & Learning Goals/i,
        })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: "Improve my grades" })
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/Step 3 of 4/i)).toBeInTheDocument();
  });

  it("redirects completed students to /dashboard on login while keeping incomplete students on /onboarding", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      "https://epngfzpghwdwycpeqsfi.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-test-key";

    const { POST } = await import("@/app/api/auth/login/route");

    // 1. Incomplete student -> /onboarding
    mockAuthSignIn.mockResolvedValueOnce({
      data: {
        user: {
          id: "u-incomplete",
          email: "newstudent@tralix.edu",
          email_confirmed_at: "2026-11-01T12:00:00Z",
        },
        session: { access_token: "tok" },
      },
      error: null,
    });

    const resIncomplete = await POST(
      new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "10.9.0.1" },
        body: JSON.stringify({
          email: "newstudent@tralix.edu",
          password: "TralixSecure2026!",
          rememberMe: true,
        }),
      })
    );
    expect((await resIncomplete.json()).redirectTo).toBe("/onboarding");

    // 2. Completed student -> /dashboard
    mockDbRows.set("u-completed", {
      user_id: "u-completed",
      academic_category: "university",
      country: "Nigeria",
      state_region: "Lagos",
      institution_name: "University of Lagos",
      institution_type: null,
      secondary_category: null,
      faculty: "Faculty of Science",
      department: "Mathematics",
      course_or_program: "B.Sc. Mathematics",
      qualification_type: null,
      academic_level: "200",
      curriculum: null,
      selected_subjects: [],
      learning_goals: ["Improve my grades"],
      explanation_preference: "standard",
      current_step: 4,
      onboarding_completed: true,
      completed_at: "2026-11-01T15:00:00Z",
      created_at: "2026-11-01T14:00:00Z",
      updated_at: "2026-11-01T15:00:00Z",
    });

    mockAuthSignIn.mockResolvedValueOnce({
      data: {
        user: {
          id: "u-completed",
          email: "returning@tralix.edu",
          email_confirmed_at: "2026-11-01T12:00:00Z",
        },
        session: { access_token: "tok2" },
      },
      error: null,
    });

    const resCompleted = await POST(
      new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "10.9.0.2" },
        body: JSON.stringify({
          email: "returning@tralix.edu",
          password: "TralixSecure2026!",
          rememberMe: true,
        }),
      })
    );
    expect((await resCompleted.json()).redirectTo).toBe("/dashboard");
  });

  it("protects /learning-space in middleware against unauthenticated visitors", async () => {
    const { updateSupabaseSession } = await import("@/lib/supabase/middleware");
    const req = new NextRequest("http://localhost:3000/learning-space");
    const res = await updateSupabaseSession(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Flearning-space"
    );
  });
});
