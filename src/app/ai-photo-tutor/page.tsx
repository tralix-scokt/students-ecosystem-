import type { Metadata } from "next";
import { PublicSeoHubLayout } from "@/components/marketing/PublicSeoHubLayout";

export const metadata: Metadata = {
  title: "Snap-a-Photo AI Tutor — Step-by-Step Visual Homework & Exam Teacher",
  description:
    "Upload a photo of any math problem, science diagram, or assignment question. Get clear step-by-step teacher explanations, custom visual diagrams, voice read-aloud, and instant flashcards.",
  alternates: {
    canonical: "/ai-photo-tutor",
  },
};

export default function AiPhotoTutorSeoPage() {
  return (
    <PublicSeoHubLayout
      eyebrow="Multimodal AI Teacher • Powered by TRALIX AI"
      headline="Snap Any Question & Learn"
      highlightedWord="Step by Step"
      subheadline="Stuck on a calculation, past-question diagram, or university lecture slide? Tap the + button to upload a photo or ask any question — your AI Tutor breaks it down clearly like a patient teacher."
      primaryCtaLabel="Try the AI Photo Tutor"
      primaryCtaHref="/register"
      secondaryCtaLabel="Sign In to AI Tutor"
      secondaryCtaHref="/login?next=/dashboard/ai-tutor"
      features={[
        {
          badge: "+ Photo Vision",
          title: "Analyze Handwritten & Printed Questions",
          description:
            "Snap or upload textbook pages, equations, circuits, or graphs and receive clear, structured explanations of every step.",
        },
        {
          badge: "Visual Teaching",
          title: "Clean Illustrated Diagrams & Worked Examples",
          description:
            "Understand geometry, forces, biology structures, and processes visually with generated SVG teaching diagrams.",
        },
        {
          badge: "Live & Up to Date",
          title: "Current Facts, Voice Read-Aloud & Flashcards",
          description:
            "Get grounded answers on current topics, listen with natural read-aloud audio, and convert answers into interactive flashcards in one click.",
        },
      ]}
    />
  );
}
