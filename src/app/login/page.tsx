import React from "react";
import type { Metadata } from "next";
import { BookExperience } from "@/components/book/BookExperience";

export const metadata: Metadata = {
  title: "Open Book Portal — Sign In",
  description:
    "Open the Students Ecosystem two-page book portal to sign in and continue your learning journey.",
};

interface LoginPageProps {
  searchParams: Promise<{
    authError?: string;
    next?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const authError =
    typeof params.authError === "string" ? params.authError : undefined;
  const rawNext = typeof params.next === "string" ? params.next : "/onboarding";
  const safeNext =
    rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/onboarding";

  return (
    <BookExperience
      initialMode="login"
      initialOpen={true}
      initialAuthError={authError}
      nextPath={safeNext}
    />
  );
}
