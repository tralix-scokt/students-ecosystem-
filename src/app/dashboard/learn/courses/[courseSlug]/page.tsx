import React from "react";
import type { Metadata } from "next";
import { CourseDetailClient } from "@/components/learning/CourseDetailClient";
import { requireServerDashboardSession } from "@/lib/dashboard/serverGuard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Course Overview",
  description:
    "Structured academic course topics, lessons, and completion progress on E-LEARNING ECOSYSTEM, powered by TRALIX AI.",
};

export default async function DashboardCourseDetailPage(props: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await props.params;
  await requireServerDashboardSession(
    `/dashboard/learn/courses/${encodeURIComponent(courseSlug)}`
  );
  return <CourseDetailClient courseSlug={courseSlug} />;
}
