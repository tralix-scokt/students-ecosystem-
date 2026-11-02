import React from "react";
import type { Metadata } from "next";
import { requireServerDashboardSession } from "@/lib/dashboard/serverGuard";
import { NotificationsPageClient } from "@/components/dashboard/NotificationsPageClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notifications",
  description:
    "Student notifications center on E-LEARNING ECOSYSTEM, powered by TRALIX AI.",
};

export default async function DashboardNotificationsPage() {
  await requireServerDashboardSession("/dashboard/notifications");
  return <NotificationsPageClient />;
}
