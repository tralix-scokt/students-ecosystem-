import React from "react";
import type { Metadata } from "next";
import { ExamPreparationClient } from "@/components/exams/ExamPreparationClient";
import { requireServerDashboardSession } from "@/lib/dashboard/serverGuard";

export const metadata: Metadata = {
  title: "Exam Preparation | E-LEARNING ECOSYSTEM",
  description:
    "Timed CBT and written exam practice for WAEC, NECO, JAMB UTME, School, University, and Polytechnic learners.",
};

export default async function ExamsPage() {
  await requireServerDashboardSession("/dashboard/exams");
  return <ExamPreparationClient />;
}
