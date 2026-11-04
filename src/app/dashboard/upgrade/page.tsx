import React, { Suspense } from "react";
import { UpgradePageClient } from "@/components/billing/UpgradePageClient";

export const metadata = {
  title: "Upgrade to TRALIX Pro | E-LEARNING ECOSYSTEM",
  description:
    "Unlock unlimited TRALIX AI Tutoring, Snap-and-Solve Photo Vision, full-length JAMB/WAEC/NECO CBT mocks, and all course lessons with Paystack.",
};

export default function DashboardUpgradePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#040914]" />}>
      <UpgradePageClient />
    </Suspense>
  );
}
