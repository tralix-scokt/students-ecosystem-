import React, { Suspense } from "react";
import type { Metadata } from "next";
import { LearningLibraryClient } from "@/components/learning/LearningLibraryClient";
import { requireServerDashboardSession } from "@/lib/dashboard/serverGuard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Learning Library",
  description:
    "Explore subjects, structured courses, distraction-free lessons, and practice exercises on E-LEARNING ECOSYSTEM, powered by TRALIX AI.",
};

export default async function DashboardLearnPage() {
  await requireServerDashboardSession("/dashboard/learn");
  return (
    <Suspense fallback={<div className="min-h-screen bg-obsidian-950" />}>
      <LearningLibraryClient />
    </Suspense>
  );
}
