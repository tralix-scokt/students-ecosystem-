import React from "react";
import type { Metadata } from "next";
import { MyNotesWorkspaceClient } from "@/components/notes/MyNotesWorkspaceClient";
import { requireServerDashboardSession } from "@/lib/dashboard/serverGuard";

export const metadata: Metadata = {
  title: "My Study Notes | E-LEARNING ECOSYSTEM",
  description:
    "Private, searchable, offline-cached personal study notes organized by subject and tags.",
};

export default async function NotesPage() {
  await requireServerDashboardSession("/dashboard/notes");
  return <MyNotesWorkspaceClient />;
}
