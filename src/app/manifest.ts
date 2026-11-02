import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "E-LEARNING ECOSYSTEM — Powered by TRALIX AI",
    short_name: "E-Learning",
    description:
      "Learn • Practice • Excel. Structured Learning Space, AI Tutor, JAMB/WAEC/NECO Past-Question CBT, Academic Planner, and Study Notes.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#020614",
    theme_color: "#020614",
    orientation: "portrait-primary",
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
        src: "/brand/logo-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
