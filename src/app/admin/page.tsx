import React from "react";
import type { Metadata } from "next";
import { AdminPortalClient } from "@/components/admin/AdminPortalClient";
import { requireServerAdminSession } from "@/lib/admin/serverAdminGuard";

export const metadata: Metadata = {
  title: "Admin Governance Portal | E-LEARNING ECOSYSTEM",
  description:
    "Protected platform administration for curriculum provenance, exam banks, user roles, announcements, and AI quotas.",
};

export default async function AdminPage() {
  await requireServerAdminSession();
  return <AdminPortalClient />;
}
