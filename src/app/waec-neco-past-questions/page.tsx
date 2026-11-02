import type { Metadata } from "next";
import { PublicSeoHubLayout } from "@/components/marketing/PublicSeoHubLayout";

export const metadata: Metadata = {
  title: "WAEC WASSCE & NECO SSCE Past Questions & CBT Practice Online",
  description:
    "Prepare for WAEC WASSCE and NECO SSCE exams with verified objective past questions, written theory practice with AI study feedback, and structured revision plans.",
  alternates: {
    canonical: "/waec-neco-past-questions",
  },
};

export default function WaecNecoSeoPage() {
  return (
    <PublicSeoHubLayout
      eyebrow="Senior Secondary Certificate Exam Preparation"
      headline="Master WAEC & NECO"
      highlightedWord="Past Questions Online"
      subheadline="Prepare confidently for WASSCE and NECO SSCE objective and theory papers. Practice past questions by subject and year, test conceptual understanding, and track topic-by-topic readiness."
      primaryCtaLabel="Start WAEC & NECO Prep"
      primaryCtaHref="/register"
      secondaryCtaLabel="Sign In to Practice"
      secondaryCtaHref="/login?next=/dashboard/exams"
      showBoardDisclaimer={true}
      features={[
        {
          badge: "WAEC & NECO Modes",
          title: "Objective CBT & Written Theory Practice",
          description:
            "Switch seamlessly between multiple-choice objective drills and structured written-response questions with advisory AI study feedback.",
        },
        {
          badge: "Topic Mastery",
          title: "Identify Weak Topics Early",
          description:
            "Every practice attempt highlights topics below 70% accuracy so you know exactly which syllabus chapters to revise before exams begin.",
        },
        {
          badge: "Integrated Study Notes",
          title: "Save Key Formulas & Definitions",
          description:
            "Pair past-question practice with your personal Study Notes workspace and structured Learning Library lessons.",
        },
      ]}
      subjectsTitle="WAEC & NECO Subjects Supported"
      subjects={[
        "Mathematics",
        "English Language",
        "Civic Education",
        "Biology",
        "Economics",
        "Physics",
        "Chemistry",
        "Government",
        "Literature in English",
        "Commerce",
        "Financial Accounting",
        "Agricultural Science",
      ]}
    />
  );
}
