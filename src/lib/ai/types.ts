export type TutorLearningMode =
  | "explain_topic"
  | "solve_step_by_step"
  | "practice_questions"
  | "simplify_concept"
  | "revision_assistant"
  | "study_coach";

export type TutorExplanationStyle =
  | "concise"
  | "standard"
  | "step_by_step"
  | "exam_focused";

export type TutorVisualAidPreference = "auto" | "always" | "none";

export interface TutorModeMetadata {
  id: TutorLearningMode;
  label: string;
  shortLabel: string;
  description: string;
  starterPrompts: string[];
}

export const TUTOR_LEARNING_MODES: TutorModeMetadata[] = [
  {
    id: "explain_topic",
    label: "Explain a Topic",
    shortLabel: "Explain",
    description:
      "Taught like a real classroom teacher with everyday intuition, labeled diagrams/pictures, and worked examples.",
    starterPrompts: [
      "Teach me photosynthesis like a real teacher with a clear labeled diagram.",
      "Explain Ohm's Law with an electric circuit diagram and a simple example.",
      "What is the difference between scalar and vector quantities? Show a visual comparison.",
    ],
  },
  {
    id: "solve_step_by_step",
    label: "Solve a Problem Step by Step",
    shortLabel: "Step-by-Step",
    description:
      "Numbered whiteboard steps, formulas explained in plain English, visual sketches, and pitfall alerts.",
    starterPrompts: [
      "Solve step by step with a triangle diagram: A ladder leans against a wall, 6 m from the base and 8 m high. How long is the ladder?",
      "Solve step by step: Two resistors of 6 Ω and 12 Ω are in parallel across a 12 V battery. Draw the circuit and find total current.",
      "Explain how to add 3/4 + 2/5 step by step like a patient math teacher.",
    ],
  },
  {
    id: "practice_questions",
    label: "Practice Questions",
    shortLabel: "Practice",
    description:
      "Progressive Easy, Medium, and Challenging questions with teacher walkthroughs.",
    starterPrompts: [
      "Give me 3 progressive practice questions on Uniform Acceleration with full teacher solutions.",
      "Give me 3 practice questions on Indices and Logarithms for senior secondary revision.",
      "Test me with 3 basic-to-medium questions on Parts of Speech and sentence structure.",
    ],
  },
  {
    id: "simplify_concept",
    label: "Simplify Difficult Concepts",
    shortLabel: "Simplify",
    description:
      "Answers basic or tricky questions in plain everyday words first, with helpful visual pictures.",
    starterPrompts: [
      "Explain fractions and percentages visually like I am learning them for the first time.",
      "What is an atom made of? Explain simply with a labeled picture of the nucleus and electrons.",
      "Why does ice float on water? Explain simply in everyday language.",
    ],
  },
  {
    id: "revision_assistant",
    label: "Revision Assistant",
    shortLabel: "Revision",
    description:
      "High-yield whiteboard summaries, visual comparison charts, memory anchors, and quick self-tests.",
    starterPrompts: [
      "Create a high-yield revision summary and comparison chart for Mitosis vs Meiosis.",
      "Summarize the core laws of indices and common exam traps to avoid.",
      "Give me a visual revision sheet on Supply and Demand curves in Economics.",
    ],
  },
  {
    id: "study_coach",
    label: "Study Coach",
    shortLabel: "Study Coach",
    description:
      "Practical study timetables, weak-area prioritization, and encouraging study habits.",
    starterPrompts: [
      "Help me build a realistic 7-day evening study timetable for Physics and Mathematics.",
      "How should I use active recall and spaced repetition to prepare for CBT exams?",
      "I keep forgetting formulas under timed pressure—coach me on a practical study routine.",
    ],
  },
];

export interface TutorConversationRecord {
  id: string;
  title: string;
  learningMode: TutorLearningMode;
  subject: string | null;
  courseSlug: string | null;
  lessonSlug: string | null;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
}

export interface TutorLiveSource {
  title: string;
  url: string;
}

export interface TutorMessageRecord {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  imageDataUrl?: string | null;
  liveSources?: TutorLiveSource[];
  stoppedByUser?: boolean;
  learningMode: TutorLearningMode;
  provider: string | null;
  model: string | null;
  isAiGenerated: boolean;
  isVerifiedEducationalMaterial: boolean;
  createdAt: string;
}

const UNSAFE_PATTERNS = [
  /\b(how\s+to\s+(make|build|construct|assemble)\s+(?:a\s+|an\s+|the\s+)?(bomb|explosive|weapon))\b/i,
  /\b(commit\s+suicide|suicide\s+methods?|suicidal|kill\s+myself|end\s+my\s+life|self[- ]harm\s+methods?)\b/i,
  /\b(explicit\s+sexual|pornograph)/i,
  /\b(hack\s+into|steal\s+passwords|bypass\s+live\s+exam\s+proctoring)\b/i,
  /\b(ignore\s+(all\s+)?(previous|prior|system)\s+(safety\s+)?instructions)\b/i,
];

export function evaluateStudentPromptSafety(input: string): {
  safe: boolean;
  reason?: string;
} {
  const trimmed = input.trim();
  if (trimmed.length < 2) {
    return {
      safe: false,
      reason: "Please enter at least 2 characters for your question.",
    };
  }
  if (trimmed.length > 4000) {
    return {
      safe: false,
      reason: "Your message exceeds the 4,000-character limit. Please shorten it.",
    };
  }
  for (const pat of UNSAFE_PATTERNS) {
    if (pat.test(trimmed)) {
      return {
        safe: false,
        reason:
          "TRALIX AI Tutor only supports safe, age-appropriate educational questions and academic study.",
      };
    }
  }
  return { safe: true };
}
