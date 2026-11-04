import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest & {
  id?: string;
  screenshots?: Array<{
    src: string;
    sizes: string;
    type: string;
    form_factor?: "wide" | "narrow";
    label?: string;
  }>;
} {
  return {
    id: "/",
    name: "E-Learning Ecosystem — Powered by TRALIX AI",
    short_name: "E-Learning",
    description:
      "Learn • Practice • Excel. Structured Courses, Multimodal AI Photo Tutor, JAMB/WAEC/NECO Past-Question CBT, Academic Planner, and Smart Notes.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    background_color: "#020614",
    theme_color: "#020614",
    orientation: "any",
    categories: ["education", "productivity", "books"],
    icons: [
      {
        src: "/brand/logo-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/logo-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/logo-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/brand/logo-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/brand/opengraph-image.png",
        sizes: "1200x630",
        type: "image/png",
        form_factor: "wide",
        label:
          "E-Learning Ecosystem — AI Photo Tutor & JAMB/WAEC/NECO CBT Simulator",
      },
      {
        src: "/brand/logo-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        form_factor: "narrow",
        label: "E-Learning Ecosystem Mobile Study App",
      },
    ],
    shortcuts: [
      {
        name: "Student Dashboard",
        short_name: "Home",
        description: "Open your personalized Academic Command Deck",
        url: "/dashboard",
        icons: [{ src: "/brand/logo-icon-192.png", sizes: "192x192" }],
      },
      {
        name: "AI Photo & Voice Tutor",
        short_name: "AI Tutor",
        description: "Snap homework or ask step-by-step academic questions",
        url: "/dashboard/ai-tutor",
        icons: [{ src: "/brand/logo-icon-192.png", sizes: "192x192" }],
      },
      {
        name: "JAMB / WAEC / NECO CBT",
        short_name: "Exams",
        description: "Practice verified past questions under timed CBT mode",
        url: "/dashboard/exams",
        icons: [{ src: "/brand/logo-icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Smart Study Notes",
        short_name: "Notes",
        description: "Access your saved notes & offline study flashcards",
        url: "/dashboard/notes",
        icons: [{ src: "/brand/logo-icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
