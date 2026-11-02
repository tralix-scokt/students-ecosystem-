import React from "react";
import type { Metadata } from "next";
import { BookExperience } from "@/components/book/BookExperience";

export const metadata: Metadata = {
  title: "Verify Your Email — 3D Book Portal",
  description:
    "Verify your registered email address to unlock protected E-LEARNING ECOSYSTEM areas.",
};

interface VerifyEmailPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email : "";

  return (
    <BookExperience
      initialMode="verify-email"
      initialOpen={true}
      initialEmail={email}
    />
  );
}
