import type { Metadata } from "next";
import { PublicSeoHubLayout } from "@/components/marketing/PublicSeoHubLayout";

export const metadata: Metadata = {
  title: "JAMB UTME CBT Practice Online & Past Questions by Year",
  description:
    "Practice timed JAMB UTME CBT past questions online across Mathematics, Use of English, Physics, Chemistry, Biology, Economics, and Government with instant scoring and AI explanations.",
  alternates: {
    canonical: "/jamb-cbt",
  },
};

export default function JambCbtSeoPage() {
  return (
    <PublicSeoHubLayout
      eyebrow="JAMB UTME Computer-Based Test Simulator"
      headline="Practice Timed JAMB UTME"
      highlightedWord="CBT Past Questions"
      subheadline="Build real exam speed and accuracy before test day. Filter JAMB UTME past questions by subject and exam year, review flagged questions before submitting, and generate targeted 5-day revision plans for weak topics."
      primaryCtaLabel="Start JAMB CBT Practice"
      primaryCtaHref="/register"
      secondaryCtaLabel="Sign In to Exam Center"
      secondaryCtaHref="/login?next=/dashboard/exams"
      showBoardDisclaimer={true}
      features={[
        {
          badge: "Real CBT Timing",
          title: "Countdown Timer & Question Navigator",
          description:
            "Simulate authentic Computer-Based Test pressure with live countdown timers, Previous/Next controls, and a full Review-Before-Submit grid.",
        },
        {
          badge: "Year & Subject Filter",
          title: "Targeted Past Questions by Exam Year",
          description:
            "Drill specific subjects and exam years across Use of English, Mathematics, Physics, Chemistry, Biology, Government, and Economics.",
        },
        {
          badge: "Diagnostic Analytics",
          title: "Instant Score Breakdown & Weak-Topic Repair",
          description:
            "See exact objective accuracy immediately after submission, review step-by-step explanations, and generate a personalized 5-day study plan.",
        },
      ]}
      subjectsTitle="JAMB UTME Subject Combinations Available"
      subjects={[
        "Use of English",
        "Mathematics",
        "Physics",
        "Chemistry",
        "Biology",
        "Economics",
        "Government",
        "Literature in English",
        "Commerce",
        "Accounting",
        "CRS",
        "Civic Education",
      ]}
      faqs={[
        {
          question: "How do I start a timed JAMB CBT mock on E-Learning Ecosystem?",
          answer:
            "Create a free student account, open the Exam Preparation tab from your dashboard, select JAMB UTME, pick your subject and preferred exam year, choose Timed CBT mode, and click Start Practice.",
        },
        {
          question: "Can I ask the AI Tutor to explain a JAMB question I missed?",
          answer:
            "Yes. Every graded attempt shows detailed explanations, and you can also paste or snap a photo of any calculation or concept inside the AI Tutor for a full step-by-step teacher walkthrough.",
        },
      ]}
    />
  );
}
