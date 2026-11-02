import React from "react";
import type { Metadata } from "next";
import { LessonReaderClient } from "@/components/learning/LessonReaderClient";
import { requireServerDashboardSession } from "@/lib/dashboard/serverGuard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lesson Reader",
  description:
    "Distraction-free academic lesson reader and interactive practice exercises on E-LEARNING ECOSYSTEM, powered by TRALIX AI.",
};

export default async function DashboardLessonReaderPage(props: {
  params: Promise<{ courseSlug: string; lessonSlug: string }>;
}) {
  const { courseSlug, lessonSlug } = await props.params;
  await requireServerDashboardSession(
    `/dashboard/learn/courses/${encodeURIComponent(
      courseSlug
    )}/lessons/${encodeURIComponent(lessonSlug)}`
  );
  return (
    <LessonReaderClient courseSlug={courseSlug} lessonSlug={lessonSlug} />
  );
}
