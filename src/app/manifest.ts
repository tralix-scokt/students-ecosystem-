import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "E-LEARNING ECOSYSTEM — Powered by TRALIX AI",
    short_name: "E-Learning",
    description:
      "Structured Learning Space, AI Tutor, CBT Exam Preparation, Academic Planner, and Offline-Ready Study Notes.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#050814",
    theme_color: "#050814",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
