import React from "react";
import type { Metadata } from "next";
import { AcademicManagementClient } from "@/components/planner/AcademicManagementClient";
import { requireServerDashboardSession } from "@/lib/dashboard/serverGuard";

export const metadata: Metadata = {
  title: "Academic Planner & Timetable | E-LEARNING ECOSYSTEM",
  description:
    "Daily, weekly, and monthly study planner, class timetable, assignment deadline tracker, and live study focus timer.",
};

export default async function PlannerPage() {
  await requireServerDashboardSession("/dashboard/planner");
  return <AcademicManagementClient />;
}
