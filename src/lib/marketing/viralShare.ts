const DEFAULT_SITE_URL = "https://students-ecosystem.vercel.app";

export function getPublicPlatformUrl(): string {
  const raw =
    typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SITE_URL
      ? process.env.NEXT_PUBLIC_SITE_URL
      : DEFAULT_SITE_URL;
  return raw.replace(/\/+$/, "");
}

export interface ExamScoreShareInput {
  examLabel: string;
  subjectLabel?: string;
  scorePercent: number;
  correctCount: number;
  gradableCount: number;
}

export function buildExamChallengeSharePayload(input: ExamScoreShareInput): {
  shareUrl: string;
  message: string;
  whatsappUrl: string;
  xIntentUrl: string;
} {
  const baseUrl = getPublicPlatformUrl();
  const shareUrl = `${baseUrl}/explore?utm_source=student_share&utm_medium=exam_scorecard`;
  const pct = Math.max(0, Math.min(100, Math.round(input.scorePercent)));
  const subjectPart = input.subjectLabel ? ` (${input.subjectLabel})` : "";
  const message = `I just scored ${pct}% (${input.correctCount}/${input.gradableCount}) on a ${input.examLabel}${subjectPart} practice test on E-Learning Ecosystem! Can you beat my score? Practice JAMB, WAEC & NECO CBT + Snap-a-Photo AI Tutor here: ${shareUrl}`;

  return {
    shareUrl,
    message,
    whatsappUrl: `https://wa.me/?text=${encodeURIComponent(message)}`,
    xIntentUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      message
    )}`,
  };
}

export function buildClassmateInvitePayload(): {
  shareUrl: string;
  message: string;
  whatsappUrl: string;
  xIntentUrl: string;
} {
  const baseUrl = getPublicPlatformUrl();
  const shareUrl = `${baseUrl}/?utm_source=student_invite&utm_medium=whatsapp`;
  const message = `Study with me on E-Learning Ecosystem (Powered by TRALIX AI)! Practice timed JAMB, WAEC & NECO past questions + snap any tough homework photo for step-by-step AI explanations: ${shareUrl}`;

  return {
    shareUrl,
    message,
    whatsappUrl: `https://wa.me/?text=${encodeURIComponent(message)}`,
    xIntentUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      message
    )}`,
  };
}
