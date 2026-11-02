import React from "react";
import type { Metadata } from "next";
import { requireServerDashboardSession } from "@/lib/dashboard/serverGuard";
import { SettingsPageClient } from "@/components/dashboard/SettingsPageClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Account settings and session management on E-LEARNING ECOSYSTEM, powered by TRALIX AI.",
};

export default async function DashboardSettingsPage() {
  await requireServerDashboardSession("/dashboard/settings");
  return <SettingsPageClient />;
}
