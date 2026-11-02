import React from "react";
import type { Metadata } from "next";
import { BookExperience } from "@/components/book/BookExperience";

export const metadata: Metadata = {
  title: "Forgot Password — 3D Book Portal",
  description:
    "Request a secure password reset email for your E-LEARNING ECOSYSTEM account.",
};

export default function ForgotPasswordPage() {
  return <BookExperience initialMode="recovery" initialOpen={true} />;
}
