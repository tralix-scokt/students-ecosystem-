import React from "react";
import type { Metadata } from "next";
import { StudentProgressPageClient } from "@/components/learning/StudentProgressPageClient";
import { requireServerDashboardSession } from "@/lib/dashboard/serverGuard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Progress",
  description:
    "Verified course, subject, lesson, and exercise progress on E-LEARNING ECOSYSTEM, powered by TRALIX AI.",
};

export default async function DashboardProgressPage() {
  await requireServerDashboardSession("/dashboard/progress");
  return <StudentProgressPageClient />;
}
