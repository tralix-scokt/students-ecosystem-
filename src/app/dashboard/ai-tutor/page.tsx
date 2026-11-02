import React, { Suspense } from "react";
import type { Metadata } from "next";
import { AiTutorWorkspaceClient } from "@/components/ai-tutor/AiTutorWorkspaceClient";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { requireServerDashboardSession } from "@/lib/dashboard/serverGuard";

export const metadata: Metadata = {
  title: "AI Study Tutor | E-LEARNING ECOSYSTEM",
  description:
    "Personalized AI academic tutor with 6 dedicated learning modes for Secondary, University, and Polytechnic learners.",
};

export default async function AiTutorPage() {
  await requireServerDashboardSession("/dashboard/ai-tutor");

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AiTutorWorkspaceClient />
    </Suspense>
  );
}
