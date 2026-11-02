import type { Metadata } from "next";
import { PublicSeoHubLayout } from "@/components/marketing/PublicSeoHubLayout";

export const metadata: Metadata = {
  title:
    "Explore E-Learning Ecosystem — JAMB, WAEC & NECO CBT + AI Photo Tutor",
  description:
    "Discover E-Learning Ecosystem (Powered by TRALIX AI): timed JAMB UTME, WAEC & NECO past-question CBT simulators, Snap-a-Photo AI Tutor with diagrams, structured lessons, study planner, and notes.",
  alternates: {
    canonical: "/explore",
  },
};

const FAQS = [
  {
    question: "What is E-Learning Ecosystem (Powered by TRALIX AI)?",
    answer:
      "E-Learning Ecosystem is an all-in-one digital study workspace combining structured curriculum lessons, timed JAMB UTME, WAEC, and NECO past-question CBT simulations, a multimodal Snap-a-Photo AI Tutor, an academic study planner, and smart notes.",
  },
  {
    question: "Can I practice real JAMB, WAEC, and NECO past questions online?",
    answer:
      "Yes. Inside the Exam Preparation center, students can run timed or untimed Computer-Based Test (CBT) sessions across core subjects including Mathematics, Use of English, Physics, Chemistry, Biology, Economics, Government, Literature, Civic Education, and Commerce, with instant grading and step-by-step explanations.",
  },
  {
    question: "How does the Snap-a-Photo AI Tutor work?",
    answer:
      "Tap the + button inside the AI Tutor to upload or photograph any textbook diagram, math equation, or assignment question. The AI analyzes the image, explains every step like a patient teacher, generates visual diagrams when helpful, and supports voice read-aloud and 1-click study flashcards.",
  },
  {
    question: "Does E-Learning Ecosystem work on mobile phones and laptops?",
    answer:
      "Yes. E-Learning Ecosystem works across Android, iPhone, iPad, Windows, and Mac browsers, can be installed to your home screen as a Progressive Web App (PWA), and includes Default Blue Neon, Dark, and Light themes.",
  },
];

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function ExplorePlatformPage() {
  return (
    <PublicSeoHubLayout
      eyebrow="E-Learning Ecosystem • Powered by TRALIX AI"
      headline="Your Complete Digital Study &"
      highlightedWord="Exam Success Platform"
      subheadline="Master secondary and university courses, practice timed JAMB UTME, WAEC & NECO past questions, snap photos of tough homework for step-by-step visual AI explanations, and organize your study timetable in one unified workspace."
      primaryCtaLabel="Create Free Student Account"
      primaryCtaHref="/register"
      secondaryCtaLabel="Experience the 3D Book Entry"
      secondaryCtaHref="/"
      showBoardDisclaimer={true}
      jsonLd={FAQ_JSON_LD}
      features={[
        {
          badge: "CBT Simulator",
          title: "JAMB, WAEC & NECO Past-Question Practice",
          description:
            "Configure timed or untimed CBT mocks by exam board, subject, and year with instant objective scoring, weak-topic detection, and 5-day revision plans.",
        },
        {
          badge: "Multimodal Vision",
          title: "Snap-a-Photo AI Teacher & Visual Diagrams",
          description:
            "Upload a photo of any equation, circuit, biology diagram, or essay prompt via the + button for clear step-by-step breakdowns and custom visual illustrations.",
        },
        {
          badge: "Structured Curriculum",
          title: "Distraction-Free Lessons & Interactive Checks",
          description:
            "Study verified course modules with worked examples, inline concept diagrams, bookmarks, and interactive self-check exercises.",
        },
        {
          badge: "Smart Productivity",
          title: "Academic Study Planner & Focus Pomodoro",
          description:
            "Build weekly study blocks, track upcoming exam deadlines, and stay locked in with the built-in header Focus Timer.",
        },
        {
          badge: "Active Recall",
          title: "Study Notes, Voice Dictation & Flashcards",
          description:
            "Organize subject notes, listen to AI explanations aloud, and turn difficult topics into instant flip flashcards.",
        },
        {
          badge: "3 Visual Themes",
          title: "Blue Neon, Dark & Daylight Modes",
          description:
            "Study comfortably day or night with instant switching between Default Blue Neon, Obsidian Dark, and crisp Light themes.",
        },
      ]}
      subjectsTitle="Core Secondary, Entrance & University Subjects"
      subjects={[
        "Mathematics",
        "Use of English",
        "Physics",
        "Chemistry",
        "Biology",
        "Economics",
        "Government",
        "Literature in English",
        "Civic Education",
        "Commerce",
        "Accounting",
        "Computer Science",
        "Further Mathematics",
        "Agricultural Science",
      ]}
      faqs={FAQS}
    />
  );
}
