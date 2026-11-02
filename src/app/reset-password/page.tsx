import React from "react";
import type { Metadata } from "next";
import { BookResetPasswordSpread } from "@/components/book/BookResetPasswordSpread";

export const metadata: Metadata = {
  title: "Set New Password — 3D Book Portal",
  description:
    "Choose and confirm a strong new password for your E-LEARNING ECOSYSTEM account.",
};

export default function ResetPasswordPage() {
  return <BookResetPasswordSpread />;
}
