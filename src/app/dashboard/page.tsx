import React from "react";
import type { Metadata } from "next";
import { requireServerDashboardSession } from "@/lib/dashboard/serverGuard";
import { StudentDashboardClient } from "@/components/dashboard/StudentDashboardClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Student Dashboard",
  description:
    "Personalized academic command center on E-LEARNING ECOSYSTEM, powered by TRALIX AI.",
};

export default async function DashboardPage() {
  await requireServerDashboardSession("/dashboard");
  return <StudentDashboardClient />;
}
