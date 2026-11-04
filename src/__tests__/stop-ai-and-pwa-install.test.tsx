import fs from "node:fs";
import path from "node:path";
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import manifest from "@/app/manifest";
import { invokeAiGateway } from "@/lib/ai/client-gateway";
import {
  InstallAppButton,
  PwaInstallProvider,
} from "@/components/pwa/PwaInstallProvider";

const mockGetSession = vi.fn();
const mockFunctionsInvoke = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      getSession: mockGetSession,
      getUser: vi.fn(async () => ({ data: { user: { id: "u-1" } } })),
    },
    functions: {
      invoke: mockFunctionsInvoke,
    },
    from: () => ({
      select: () => ({
        order: () => ({ limit: async () => ({ data: [] }) }),
        maybeSingle: async () => ({ data: null }),
        eq: () => ({
          order: () => ({ limit: async () => ({ data: [] }) }),
        }),
      }),
      upsert: async () => ({ error: null }),
    }),
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/dashboard/ai-tutor",
  useSearchParams: () => new URLSearchParams(""),
}));

vi.mock("@/lib/dashboard/useStudentDashboardData", () => ({
  useStudentDashboardData: () => ({
    status: "ready",
    isRetrying: false,
    errorMessage: null,
    retry: vi.fn(),
    data: {
      authenticated: true,
      emailVerified: true,
      onboardingCompleted: true,
      userId: "u-1",
      email: "student@example.edu.ng",
      userProfile: {
        id: "u-1",
        full_name: "Tralix Learner",
        email: "student@example.edu.ng",
        country: "Nigeria",
        role: "student",
        created_at: "2026-11-04T08:00:00Z",
        updated_at: "2026-11-04T08:00:00Z",
      },
      academicProfile: {
        id: "acad-1",
        user_id: "u-1",
        academic_category: "secondary",
        sub_level: "JSS 3",
        institution_name: "Federal Government College",
        department_or_stream: "Science",
        curriculum: "BECE",
        selected_subjects: ["Mathematics", "Basic Science"],
        learning_goals: ["Excel in exams"],
        preferred_study_time: "evening",
        learning_style: "step_by_step",
        onboarding_completed: true,
        created_at: "2026-11-04T08:00:00Z",
        updated_at: "2026-11-04T08:00:00Z",
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
      notifications: [],
      unreadNotificationCount: 0,
    },
  }),
}));

const sendTutorPromptMock = vi.fn();
vi.mock("@/lib/ai/tutorService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/tutorService")>();
  return {
    ...actual,
    fetchTutorWorkspaceBootstrap: vi.fn(async () => ({
      conversations: [],
      preferences: {
        preferredMode: "explain_topic",
        explanationStyle: "step_by_step",
        preferredSubject: "Mathematics",
      },
    })),
    sendTutorPrompt: (...args: unknown[]) => sendTutorPromptMock(...args),
  };
});

import { AiTutorWorkspaceClient } from "@/components/ai-tutor/AiTutorWorkspaceClient";

describe("Stop AI Response Mid-Generation & Installable PWA Verification", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "jwt-token-123" } },
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("1. Aborts in-flight invokeAiGateway fetch cleanly without failing over to Edge Function", async () => {
    const controller = new AbortController();

    global.fetch = vi.fn((_url, init) => {
      return new Promise<Response>((_resolve, reject) => {
        const sig = init?.signal as AbortSignal | undefined;
        sig?.addEventListener("abort", () => {
          const abortErr = new Error("The operation was aborted.");
          abortErr.name = "AbortError";
          reject(abortErr);
        });
      });
    }) as unknown as typeof fetch;

    const promise = invokeAiGateway(
      { action: "tutor_chat", message: "Explain quadratic equations" },
      { signal: controller.signal }
    );

    controller.abort();
    const res = await promise;

    expect(res.ok).toBe(false);
    expect(res.aborted).toBe(true);
    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
  });

  it("2. Lets user stop an active AI Tutor response immediately and regenerate cleanly", async () => {
    let capturedSignal: AbortSignal | undefined;
    let resolveSlowReply: ((val: Record<string, unknown>) => void) | null = null;

    sendTutorPromptMock.mockImplementationOnce(
      (params: { signal?: AbortSignal }) => {
        capturedSignal = params.signal;
        return new Promise((resolve) => {
          resolveSlowReply = resolve;
        });
      }
    );

    render(<AiTutorWorkspaceClient />);

    const input = await screen.findByLabelText(/Ask your academic question/i);
    fireEvent.change(input, {
      target: { value: "Explain simultaneous equations step by step" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Send$/i }));

    // While AI is responding, both Stop controls appear
    const composerStopBtn = await screen.findByRole("button", {
      name: /Stop AI response/i,
    });
    expect(composerStopBtn).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Stop generating response/i })
    ).toBeInTheDocument();

    // User clicks Stop!
    fireEvent.click(composerStopBtn);

    expect(capturedSignal?.aborted).toBe(true);
    expect(await screen.findByText(/Response stopped by you\./i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    // Even if the slow network call resolves late, it must NOT append the cancelled reply
    await act(async () => {
      resolveSlowReply?.({
        ok: true,
        reply: "STALE_LATE_REPLY_SHOULD_NOT_RENDER",
      });
    });
    expect(
      screen.queryByText(/STALE_LATE_REPLY_SHOULD_NOT_RENDER/)
    ).not.toBeInTheDocument();

    // Clicking Regenerate re-runs the prompt cleanly
    sendTutorPromptMock.mockResolvedValueOnce({
      ok: true,
      conversationId: "conv-regen-1",
      reply: "Freshly regenerated step-by-step simultaneous equation solution.",
      suggestedQuestions: [],
      provider: "openrouter-free",
      model: "openrouter/free",
    });

    fireEvent.click(screen.getByRole("button", { name: /Regenerate/i }));
    expect(
      await screen.findByText(
        /Freshly regenerated step-by-step simultaneous equation solution\./i
      )
    ).toBeInTheDocument();
  });

  it("3. Exposes a compliant standalone Web App Manifest & Service Worker for phone/desktop installation", () => {
    const m = manifest();
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/");
    expect(m.scope).toBe("/");
    expect(m.icons?.some((i) => i.sizes === "192x192" && i.purpose === "any")).toBe(
      true
    );
    expect(m.icons?.some((i) => i.sizes === "512x512" && i.purpose === "any")).toBe(
      true
    );
    expect(
      m.icons?.some((i) => i.sizes === "512x512" && i.purpose === "maskable")
    ).toBe(true);
    expect((m.shortcuts || []).length).toBeGreaterThanOrEqual(4);

    const swPath = path.join(process.cwd(), "public", "sw.js");
    expect(fs.existsSync(swPath)).toBe(true);
    const swCode = fs.readFileSync(swPath, "utf8");
    expect(swCode).toContain('addEventListener("install"');
    expect(swCode).toContain('addEventListener("activate"');
    expect(swCode).toContain('addEventListener("fetch"');
    expect(swCode).toContain('"/offline"');
    expect(swCode).toContain('url.pathname.startsWith("/api/")');
  });

  it("4. Triggers native beforeinstallprompt on 1-click Install App or opens clear install guide", async () => {
    const registerMock = vi.fn().mockResolvedValue({});
    Object.defineProperty(window.navigator, "serviceWorker", {
      configurable: true,
      value: { register: registerMock },
    });

    render(
      <PwaInstallProvider>
        <InstallAppButton variant="header" />
      </PwaInstallProvider>
    );

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith("/sw.js", { scope: "/" });
    });

    const installBtn = screen.getByRole("button", {
      name: /Install E-Learning app/i,
    });

    // Without beforeinstallprompt, clicking opens clear step-by-step install guide modal
    fireEvent.click(installBtn);
    expect(
      await screen.findByRole("dialog", { name: /Install E-Learning Ecosystem/i })
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /Close install instructions/i })
    );

    // When browser fires beforeinstallprompt, clicking triggers native prompt()
    const promptSpy = vi.fn().mockResolvedValue(undefined);
    const fakeEvent = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(fakeEvent, {
      prompt: promptSpy,
      userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
    });

    await act(async () => {
      window.dispatchEvent(fakeEvent);
    });

    await act(async () => {
      fireEvent.click(installBtn);
    });

    expect(promptSpy).toHaveBeenCalledTimes(1);
  });
});
