import React from "react";
import type { Metadata } from "next";
import { requireServerDashboardSession } from "@/lib/dashboard/serverGuard";
import { ProfilePageClient } from "@/components/dashboard/ProfilePageClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Profile",
  description:
    "Student academic profile overview on E-LEARNING ECOSYSTEM, powered by TRALIX AI.",
};

export default async function DashboardProfilePage() {
  await requireServerDashboardSession("/dashboard/profile");
  return <ProfilePageClient />;
}
