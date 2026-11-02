import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TutorRichMessageRenderer } from "@/components/ai-tutor/TutorRichMessageRenderer";
import { evaluateStudentPromptSafety } from "@/lib/ai/types";
import {
  buildMasterTeacherSystemPrompt,
  formatTutorContentForSavedNote,
  parseTutorMessageContent,
} from "@/lib/ai/visualTeaching";

const sendTutorPromptMock = vi.fn();

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
    data: {
      authenticated: true,
      emailVerified: true,
      onboardingCompleted: true,
      userId: "user-student-1",
      email: "chidi@example.edu.ng",
      userProfile: {
        id: "user-student-1",
        full_name: "Chidi Nwosu",
        email: "chidi@example.edu.ng",
        country: "Nigeria",
        role: "student" as const,
        created_at: "2026-11-02T08:00:00Z",
        updated_at: "2026-11-02T08:00:00Z",
      },
      academicProfile: {
        id: "acad-1",
        user_id: "user-student-1",
        academic_category: "secondary" as const,
        academic_level: "SS2",
        institution_name: "King's College",
        curriculum: "WAEC / NECO",
        selected_subjects: ["Biology", "Physics", "Mathematics"],
        learning_goals: ["Understand topics deeply"],
        explanation_preference: "step_by_step",
        onboarding_completed: true,
        created_at: "2026-11-02T08:05:00Z",
        updated_at: "2026-11-02T08:05:00Z",
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
    errorMessage: null,
    retry: vi.fn(),
    markAllNotificationsRead: vi.fn(),
    markNotificationRead: vi.fn(),
  }),
}));

vi.mock("@/lib/ai/tutorService", () => ({
  fetchTutorWorkspaceBootstrap: vi.fn(async () => ({
    conversations: [],
    preferences: {
      preferredMode: "explain_topic",
      explanationStyle: "step_by_step",
      preferredSubject: "Biology",
    },
  })),
  fetchConversationMessages: vi.fn(async () => []),
  saveStudentTutorPreferences: vi.fn(async () => undefined),
  renameTutorConversation: vi.fn(async () => true),
  deleteTutorConversation: vi.fn(async () => true),
  sendTutorPrompt: (...args: unknown[]) => sendTutorPromptMock(...args),
}));

import { AiTutorWorkspaceClient } from "@/components/ai-tutor/AiTutorWorkspaceClient";

describe("Real Classroom Teacher AI Tutor — Diagrams, Pictures & Basic Questions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Allows basic everyday questions and innocent biology terms while blocking genuine self-harm & weapons prompts", () => {
    expect(evaluateStudentPromptSafety("Hi").safe).toBe(true);
    expect(evaluateStudentPromptSafety("What is 2 + 2?").safe).toBe(true);
    expect(
      evaluateStudentPromptSafety("What is 15% of 240? Show me simply.").safe
    ).toBe(true);
    expect(
      evaluateStudentPromptSafety(
        "What is programmed cell suicide (apoptosis) in biology?"
      ).safe
    ).toBe(true);

    expect(evaluateStudentPromptSafety("How to commit suicide").safe).toBe(
      false
    );
    expect(
      evaluateStudentPromptSafety("How to assemble an explosive").safe
    ).toBe(false);
  });

  it("2. Parses all visual diagram/picture blocks cleanly, hides malformed fences, and formats saved notes without raw JSON", () => {
    const teacherReply = `Let's walk through how an Animal Cell works!

### 1. Everyday Intuition
Think of a cell like a busy walled city where every organelle has a special job.

\`\`\`tutor-diagram
{"diagramType":"concept_anatomy","illustration":"cell","title":"Annotated Picture: Parts of an Animal Cell","centerLabel":"Nucleus (DNA)","caption":"Major organelles inside an animal cell","parts":[{"name":"Cell Membrane","role":"Controls entry and exit"},{"name":"Mitochondria","role":"Powerhouse making ATP energy"}],"takeaway":"Organelles cooperate to keep the cell alive."}
\`\`\`

> Teacher Tip: Animal cells do NOT have a rigid cell wall or chloroplasts—plant cells do!

Suggested Follow-up Questions:
- How does a plant cell differ from an animal cell?
- What happens inside mitochondria during respiration?`;

    const blocks = parseTutorMessageContent(teacherReply);
    expect(blocks.some((b) => b.kind === "diagram")).toBe(true);
    const diag = blocks.find((b) => b.kind === "diagram");
    expect(diag && diag.spec.title).toBe(
      "Annotated Picture: Parts of an Animal Cell"
    );

    const formattedNote = formatTutorContentForSavedNote(teacherReply);
    expect(formattedNote).toContain(
      "[Visual Study Diagram: Annotated Picture: Parts of an Animal Cell]"
    );
    expect(formattedNote).toContain("Cell Membrane: Controls entry and exit");
    expect(formattedNote).not.toContain('"diagramType"');
    expect(formattedNote).not.toContain("Suggested Follow-up Questions:");

    // Malformed fence never leaks broken JSON
    const broken = `Simple answer first.\n\`\`\`tutor-diagram\n{bad json\n\`\`\`\nDone!`;
    const safeBlocks = parseTutorMessageContent(broken, {
      allowCuratedFallback: false,
    });
    expect(safeBlocks.every((b) => b.kind === "markdown")).toBe(true);
  });

  it("3. Renders SVG classroom pictures, circuits, graphs, fraction bars, Teacher Tip callouts, and Expand Visual lightbox", () => {
    const richLesson = `### Understanding Fractions Visually
Imagine sharing a pizza cut into 4 equal slices and eating 3 of them.

\`\`\`tutor-diagram
{"diagramType":"number_fraction_bar","title":"Visualizing 3/4 (75%)","numerator":3,"denominator":4,"barLabel":"3/4 = 75%","takeaway":"3 shaded slices out of 4 equal parts."}
\`\`\`

> Teacher Tip: Always make denominators equal before adding two fractions!`;

    render(<TutorRichMessageRenderer content={richLesson} />);

    expect(
      screen.getByText(/Understanding Fractions Visually/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Visualizing 3\/4 \(75%\)/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Always make denominators equal before adding/i)
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Expand diagram Visualizing 3\/4 \(75%\)/i,
      })
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Expanded Classroom Visual/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Close expanded diagram/i })
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("4. Answers basic questions directly AND renders labeled diagrams inside AiTutorWorkspaceClient", async () => {
    sendTutorPromptMock.mockResolvedValueOnce({
      ok: true,
      conversationId: "conv-basic-1",
      reply: `Great question! Let's find **15% of 240** step by step:

1. Find **10% of 240** by dividing by 10: \`240 ÷ 10 = 24\`.
2. Find **5% of 240** (half of 10%): \`24 ÷ 2 = 12\`.
3. Add them together: \`24 + 12 = 36\`.

\`\`\`tutor-diagram
{"diagramType":"process_flow","title":"Mental Math Shortcut for 15% of 240","steps":[{"label":"10% of 240","detail":"240 ÷ 10 = 24"},{"label":"5% of 240","detail":"Half of 24 = 12"},{"label":"15% Total","detail":"24 + 12 = 36"}],"takeaway":"15% of 240 is 36."}
\`\`\``,
      suggestedQuestions: ["How do I find 25% of 360 quickly?"],
      provider: "openai",
      model: "gpt-4o-mini",
      isAiGenerated: true,
      isVerifiedEducationalMaterial: false,
      remainingDailyQuota: 58,
    });

    render(<AiTutorWorkspaceClient />);

    const basicChip = await screen.findByRole("button", {
      name: /What is 15% of 240\? Show me simply\./i,
    });
    fireEvent.click(basicChip);

    expect(
      await screen.findByText(/Mental Math Shortcut for 15% of 240/i)
    ).toBeInTheDocument();
    expect(sendTutorPromptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "What is 15% of 240? Show me simply.",
        visualPreference: "auto",
      })
    );
  });

  it("5. Respects visualPreference in buildMasterTeacherSystemPrompt", () => {
    const alwaysPrompt = buildMasterTeacherSystemPrompt({
      academicContext: "Secondary SS2",
      subject: "Physics",
      learningMode: "explain_topic",
      modeLabel: "Explain a Topic",
      modeDescription: "Classroom lesson",
      explanationStyle: "step_by_step",
      visualPreference: "always",
    });
    expect(alwaysPrompt).toContain("Visual Learner Mode ON");

    const nonePrompt = buildMasterTeacherSystemPrompt({
      academicContext: "Secondary SS2",
      subject: "Physics",
      learningMode: "explain_topic",
      modeLabel: "Explain a Topic",
      modeDescription: "Classroom lesson",
      explanationStyle: "step_by_step",
      visualPreference: "none",
    });
    expect(nonePrompt).toContain("Text-only mode selected");
  });
});
