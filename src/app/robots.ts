import type { MetadataRoute } from "next";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://students-ecosystem.vercel.app"
).replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/explore",
          "/jamb-cbt",
          "/waec-neco-past-questions",
          "/ai-photo-tutor",
          "/login",
          "/register",
          "/privacy",
          "/terms",
          "/brand/",
        ],
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/auth/",
          "/dashboard",
          "/dashboard/",
          "/onboarding",
          "/onboarding/",
          "/learning-space",
          "/learning-space/",
          "/reset-password",
          "/verify-email",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
