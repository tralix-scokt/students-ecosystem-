import React from "react";
import type { Metadata } from "next";
import { BookExperience } from "@/components/book/BookExperience";

export const metadata: Metadata = {
  title: "Create an Account — 3D Book Portal",
  description:
    "Create your learner account inside the E-LEARNING ECOSYSTEM 3D hardcover book portal.",
};

export default function RegisterPage() {
  return <BookExperience initialMode="register" initialOpen={true} />;
}
