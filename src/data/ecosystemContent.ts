export interface EcosystemFeature {
  id: string;
  index: string;
  title: string;
  subtitle: string;
  description: string;
  accent: "cyan" | "violet";
  highlights: string[];
  iconName: "layers" | "sparkles" | "award" | "compass";
}

export const BRAND_IDENTITY = {
  name: "E-LEARNING ECOSYSTEM",
  poweredBy: "Powered by TRALIX AI",
  engine: "TRALIX AI",
} as const;

export const LANDING_COPY = {
  eyebrow: "E-LEARNING ECOSYSTEM • POWERED BY TRALIX AI",
  heading: "Your Future Starts With Knowledge.",
  supportingText:
    "Learn with purpose. Understand with confidence. Prepare for success.",
  introBadge: "THE ARCHITECTURE OF MASTERY",
  introHeading: "A disciplined digital sanctuary built for serious learners.",
  introBody:
    "E-LEARNING ECOSYSTEM, powered by TRALIX AI, unifies structured curriculum progression, intelligent concept guidance, focused exam readiness, and academic organization inside one distraction-free environment designed to elevate how students think, study, and achieve.",
  primaryCta: "Get Started",
  secondaryCta: "Sign In",
} as const;

export const ECOSYSTEM_FEATURES: EcosystemFeature[] = [
  {
    id: "structured-learning",
    index: "01",
    title: "Structured Learning",
    subtitle: "Progressive Curriculum Clarity",
    description:
      "Follow thoughtfully sequenced academic modules that build foundational understanding step by step before advancing to complex synthesis.",
    accent: "cyan",
    highlights: [
      "Clear conceptual milestones",
      "Distraction-free reading flow",
    ],
    iconName: "layers",
  },
  {
    id: "ai-tutor",
    index: "02",
    title: "AI Tutor",
    subtitle: "Guided Reasoning by TRALIX AI",
    description:
      "Engage with intelligent academic guidance designed to clarify difficult concepts, break down problem steps, and strengthen independent comprehension.",
    accent: "violet",
    highlights: [
      "Step-by-step concept clarity",
      "Adaptive academic explanations",
    ],
    iconName: "sparkles",
  },
  {
    id: "exam-preparation",
    index: "03",
    title: "Exam Preparation",
    subtitle: "Deliberate Readiness & Recall",
    description:
      "Prepare systematically with structured revision frameworks, targeted concept reinforcement, and calm readiness for high-stakes assessments.",
    accent: "cyan",
    highlights: [
      "Focused topic mastery",
      "Confidence under exam conditions",
    ],
    iconName: "award",
  },
  {
    id: "academic-management",
    index: "04",
    title: "Academic Management",
    subtitle: "Unified Study Organization",
    description:
      "Keep courses, study priorities, and learning goals aligned in one coherent workspace engineered for sustained academic momentum.",
    accent: "violet",
    highlights: [
      "Cohesive study rhythm",
      "Intentional goal alignment",
    ],
    iconName: "compass",
  },
];

export const BOOK_COPY = {
  cover: {
    brand: "E-LEARNING ECOSYSTEM",
    headline: "YOUR FUTURE STARTS WITH KNOWLEDGE.",
    quote: "“Every great journey begins with a single page.”",
    cta: "ENTER — OPEN YOUR JOURNEY",
  },
  loginLeft: {
    chapter: "PAGE 01 • LEARNER ACCESS",
    heading: "Welcome Back.",
    supportingText: "Continue your learning journey.",
  },
  loginRight: {
    chapter: "PAGE 02 • THE DEDICATION PRINCIPLE",
    heading: "YOUR NEXT CHAPTER BEGINS HERE.",
    motivationalMessage:
      "“Your circumstances may determine where you start, but your dedication to learning can help determine where you go.”",
    supportingText:
      "Learn with purpose. Grow with confidence. Build your future.",
  },
  registerLeft: {
    chapter: "PAGE 03 • NEW LEARNER INSCRIPTION",
    heading: "Create an Account.",
    supportingText:
      "Begin your structured learning journey in E-LEARNING ECOSYSTEM.",
  },
  registerRight: {
    chapter: "PAGE 04 • CHARTER OF PURPOSE",
    heading: "BUILT FOR PURPOSEFUL GROWTH.",
    motivationalMessage:
      "“Knowledge becomes transformative when curiosity meets disciplined, consistent effort.”",
    supportingText:
      "Prepare your learner profile for Structured Learning, AI Tutor guidance, Exam Preparation, and Academic Management.",
  },
  recoveryLeft: {
    chapter: "PAGE 01B • CREDENTIAL RECOVERY",
    heading: "Reset Your Password.",
    supportingText:
      "Enter your registered email address to receive a secure password reset link.",
  },
  verifyEmailLeft: {
    chapter: "PAGE 03B • EMAIL VERIFICATION",
    heading: "Verify Your Email.",
    supportingText:
      "Activate your learner account to unlock the next onboarding stage.",
  },
  resetPasswordLeft: {
    chapter: "RECOVERY FOLIO I • NEW CREDENTIAL",
    heading: "Set a New Password.",
    supportingText:
      "Choose a strong, unique password for your E-LEARNING ECOSYSTEM account.",
  },
  resetPasswordRight: {
    chapter: "RECOVERY FOLIO II • SECURITY CHARTER",
    heading: "PROTECT YOUR ACADEMIC SANCTUARY.",
    motivationalMessage:
      "“Security and clarity form the foundation upon which lasting academic progress is built.”",
    supportingText:
      "Use at least 8 characters combining uppercase, lowercase, numbers, and symbols.",
  },
} as const;
