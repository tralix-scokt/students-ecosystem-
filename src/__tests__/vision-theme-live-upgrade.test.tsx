import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockSendTutorPrompt = vi.fn();
const mockPrepareImageFileForTutor = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/ai-tutor",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(""),
}));

vi.mock("@/lib/dashboard/useStudentDashboardData", () => ({
  useStudentDashboardData: () => ({
    status: "ready",
    isRetrying: false,
    errorMessage: null,
    retry: vi.fn(),
    data: {
      email: "learner@students-ecosystem.edu",
      userProfile: {
        id: "user-1",
        full_name: "Adaeze Nwosu",
        email: "learner@students-ecosystem.edu",
        role: "student",
        account_status: "active",
        onboarding_completed: true,
        created_at: "2026-11-01T00:00:00Z",
        updated_at: "2026-11-01T00:00:00Z",
      },
      academicProfile: {
        id: "acad-1",
        user_id: "user-1",
        academic_category: "secondary",
        academic_level: "SS 3",
        institution_name: "Delta Science Academy",
        curriculum: "WAEC / NECO",
        course_or_program: "Science",
        selected_subjects: ["Physics", "Mathematics"],
        study_goals: ["Pass WAEC with distinctions"],
        explanation_preference: "step_by_step",
        created_at: "2026-11-01T00:00:00Z",
        updated_at: "2026-11-01T00:00:00Z",
      },
      unreadNotificationCount: 0,
      publishedCourses: [],
      ongoingCourses: [],
    },
  }),
}));

vi.mock("@/lib/ai/tutorService", () => ({
  fetchTutorWorkspaceBootstrap: async () => ({
    conversations: [],
    preferences: {
      preferredMode: "explain_topic",
      explanationStyle: "step_by_step",
      preferredSubject: "Physics",
    },
  }),
  fetchConversationMessages: async () => [],
  saveStudentTutorPreferences: async () => {},
  renameTutorConversation: async () => true,
  deleteTutorConversation: async () => true,
  sendTutorPrompt: (...args: unknown[]) => mockSendTutorPrompt(...args),
}));

vi.mock("@/lib/ai/imageAttachment", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/ai/imageAttachment")
  >("@/lib/ai/imageAttachment");
  return {
    ...actual,
    preparePhotoFileForTutor: (...args: unknown[]) =>
      mockPrepareImageFileForTutor(...args),
  };
});

vi.mock("@/lib/notifications/notificationService", () => ({
  fetchNotificationPreferences: async () => ({
    inAppEnabled: true,
    emailEnabled: true,
    pushEnabled: false,
    studyReminders: true,
    assignmentReminders: true,
    examReminders: true,
    milestoneAlerts: true,
    announcementAlerts: true,
    digestFrequency: "daily",
    quietHoursStart: null,
    quietHoursEnd: null,
  }),
  saveNotificationPreferences: async () => true,
  registerBrowserPushSubscription: async () => ({ ok: true }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabaseClient: () => null,
}));

import { AiTutorWorkspaceClient } from "@/components/ai-tutor/AiTutorWorkspaceClient";
import { SettingsPageClient } from "@/components/dashboard/SettingsPageClient";
import { isValidTutorImageDataUrl } from "@/lib/ai/imageAttachment";
import {
  detectTimeSensitiveIntent,
  fetchLiveCurrentContext,
} from "@/lib/ai/liveSearchGrounding";
import { runServerProviderCompletion } from "@/lib/ai/server-gateway";
import { extractFlashcardsFromTutorReply } from "@/lib/ai/visualTeaching";
import {
  applyEcosystemTheme,
  getStoredEcosystemTheme,
} from "@/lib/theme/themePreference";

describe("Photo Vision (+ Button), Live Up-to-Date Grounding, 3-Theme Settings & Power Features", () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.documentElement.dataset.theme = "default";
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: "sk-test-openai",
      OPENROUTER_API_KEY: "sk-or-test-primary",
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  it("1. Validates base64 image data URLs and lets students upload a photo via the + button for AI vision explanation", async () => {
    const sampleDataUrl =
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQ==";
    expect(isValidTutorImageDataUrl(sampleDataUrl)).toBe(true);
    expect(isValidTutorImageDataUrl("javascript:alert(1)")).toBe(false);

    mockPrepareImageFileForTutor.mockResolvedValueOnce({
      dataUrl: sampleDataUrl,
      name: "circuit-homework.jpg",
      width: 800,
      height: 600,
    });

    mockSendTutorPrompt.mockResolvedValueOnce({
      ok: true,
      conversationId: "conv-vision-1",
      reply:
        "### Circuit Photo Breakdown\n**Ohm's Law**: Voltage equals current multiplied by resistance (`V = I × R`).\n\n### Step-by-Step Solution\nFrom your photo, the 12 V battery feeds a 4 Ω resistor, so `I = 3 A`.",
      suggestedQuestions: ["What if another 4 Ω resistor is added in series?"],
      liveSources: [],
      provider: "openai",
      model: "gpt-4o-mini",
    });

    render(<AiTutorWorkspaceClient />);

    // Clean empty screen with zero pre-filled prompts
    expect(
      await screen.findByRole("heading", { name: /^AI Tutor$/i })
    ).toBeInTheDocument();

    // Click the + button to open photo attachment options
    const plusBtn = screen.getByRole("button", { name: /Add photo/i });
    fireEvent.click(plusBtn);
    expect(screen.getByText(/Upload Photo/i)).toBeInTheDocument();
    expect(screen.getByText(/Take Photo/i)).toBeInTheDocument();

    // Simulate selecting a photo file
    const fileInput = screen.getByLabelText(/Upload photo file/i);
    const fakePhoto = new File(["fake-jpeg-bytes"], "circuit-homework.jpg", {
      type: "image/jpeg",
    });
    fireEvent.change(fileInput, { target: { files: [fakePhoto] } });

    // Thumbnail preview appears and Send becomes enabled even without text!
    expect(
      await screen.findByText("circuit-homework.jpg")
    ).toBeInTheDocument();
    const sendBtn = screen.getByRole("button", { name: /^Send$/i });
    expect(sendBtn).not.toBeDisabled();

    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(mockSendTutorPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          imageDataUrl: sampleDataUrl,
        })
      );
    });

    expect(
      await screen.findByText(/Circuit Photo Breakdown/i)
    ).toBeInTheDocument();

    // Test 1-Click Interactive Flashcards generated from the AI Tutor reply
    fireEvent.click(screen.getByRole("button", { name: /Flashcards/i }));
    expect(
      await screen.findByText(/Active-Recall Study Deck/i)
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Flip Answer/i }));
    expect(screen.getByText(/Explanation \/ Answer/i)).toBeInTheDocument();
  });

  it("2. Retrieves live up-to-date context and prioritizes live web search for current questions", async () => {
    expect(
      detectTimeSensitiveIntent("Who is the current President of Nigeria in 2026?")
    ).toBe(true);
    expect(detectTimeSensitiveIntent("Factorize x^2 - 9")).toBe(false);

    global.fetch = vi
      .fn()
      // Wikipedia search
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            query: {
              search: [{ pageid: 101, title: "President of Nigeria" }],
            },
          }),
          { status: 200 }
        )
      )
      // DuckDuckGo Instant Answer
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            Heading: "President of Nigeria",
            AbstractText:
              "Bola Ahmed Tinubu serves as the President of the Federal Republic of Nigeria.",
            AbstractURL: "https://en.wikipedia.org/wiki/President_of_Nigeria",
          }),
          { status: 200 }
        )
      )
      // Wikipedia extract
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            query: {
              pages: {
                "101": {
                  title: "President of Nigeria",
                  extract:
                    "The President of Nigeria is the head of state and head of government of the Federal Republic of Nigeria.",
                },
              },
            },
          }),
          { status: 200 }
        )
      ) as unknown as typeof fetch;

    const live = await fetchLiveCurrentContext(
      "Who is the current President of Nigeria?"
    );
    expect(live.usedLiveContext).toBe(true);
    expect(live.contextBlock).toContain("LIVE UP-TO-DATE REFERENCE DATA");
    expect(live.contextBlock).toContain("Bola Ahmed Tinubu");
    expect(live.sources.length).toBeGreaterThan(0);

    // Verify server provider chain uses OpenRouter live web plugin first when preferLiveWebSearch is true
    const providerFetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          model: "openai/gpt-4o-mini",
          choices: [
            {
              message: {
                content: "Here is the current updated answer.",
                annotations: [
                  {
                    url_citation: {
                      title: "Official Reference",
                      url: "https://en.wikipedia.org/wiki/Nigeria",
                    },
                  },
                ],
              },
            },
          ],
          usage: { prompt_tokens: 30, completion_tokens: 15, total_tokens: 45 },
        }),
        { status: 200 }
      )
    );
    global.fetch = providerFetchMock as unknown as typeof fetch;

    const completion = await runServerProviderCompletion({
      messages: [{ role: "user", content: "Latest update" }],
      preferLiveWebSearch: true,
    });
    expect(completion.provider).toBe("openrouter-live-web");
    expect(completion.webCitations?.[0]?.url).toBe(
      "https://en.wikipedia.org/wiki/Nigeria"
    );
  });

  it("3. Switches themes in Settings between Default (Blue Neon), Dark, and Light and persists preference", async () => {
    render(<SettingsPageClient />);

    expect(
      await screen.findByText(/Appearance & Theme/i)
    ).toBeInTheDocument();

    const defaultRadio = screen.getByRole("radio", {
      name: /Default \(Blue Neon\)/i,
    });
    const darkRadio = screen.getByRole("radio", { name: /^Dark/i });
    const lightRadio = screen.getByRole("radio", { name: /^Light/i });

    expect(defaultRadio).toHaveAttribute("aria-checked", "true");

    // Switch to Light theme
    fireEvent.click(lightRadio);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(getStoredEcosystemTheme()).toBe("light");

    // Switch to Dark theme
    fireEvent.click(darkRadio);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(getStoredEcosystemTheme()).toBe("dark");

    // Switch back to Default (Blue Neon)
    applyEcosystemTheme("default");
    expect(document.documentElement.dataset.theme).toBe("default");
  });

  it("4. Opens Global ⌘K / Ctrl+K Command Palette and extracts study flashcards cleanly", async () => {
    const cards = extractFlashcardsFromTutorReply(
      "### Newton's First Law\nAn object stays at rest or uniform motion unless acted upon by a net external force.\n\n**Inertia**: Resistance of any physical object to a change in velocity."
    );
    expect(cards.length).toBeGreaterThanOrEqual(2);
    expect(cards[0].front).toContain("Newton's First Law");

    render(<AiTutorWorkspaceClient />);
    await screen.findByRole("heading", { name: /^AI Tutor$/i });

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(
      await screen.findByRole("dialog", { name: /Quick command palette/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Switch Theme: Default \(Blue Neon\)/i)
    ).toBeInTheDocument();
  });
});
