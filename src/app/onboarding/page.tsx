import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingStageClient } from "@/components/onboarding/OnboardingStageClient";
import {
  createServerSupabaseClient,
  getServerAuthenticatedUser,
} from "@/lib/supabase/server";
import type { UserProfile } from "@/types/auth";
import type { StudentAcademicProfile } from "@/types/onboarding";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Academic Level & Student Onboarding",
  description:
    "Select your academic pathway and personalize your learning environment on E-LEARNING ECOSYSTEM, powered by TRALIX AI.",
};

interface OnboardingPageProps {
  searchParams: Promise<{ review?: string }>;
}

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const resolvedParams = await searchParams;
  const allowCompletedReview = resolvedParams?.review === "1";

  const { user, isEmailVerified } = await getServerAuthenticatedUser();

  if (!user) {
    redirect("/login?next=/onboarding");
  }

  if (!isEmailVerified) {
    const emailParam = user.email
      ? `?email=${encodeURIComponent(user.email)}`
      : "";
    redirect(`/verify-email${emailParam}`);
  }

  let initialProfile: UserProfile | null = null;
  let initialAcademicProfile: StudentAcademicProfile | null = null;

  const supabase = await createServerSupabaseClient({ timeoutMs: 2500 });
  if (supabase) {
    try {
      const [{ data: profileData }, { data: academicData }] = await Promise.all(
        [
          supabase
            .from("profiles")
            .select("id, full_name, email, country, role, created_at, updated_at")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("student_academic_profiles")
            .select(
              "user_id, academic_category, country, state_region, institution_name, institution_type, secondary_category, faculty, department, course_or_program, qualification_type, academic_level, curriculum, selected_subjects, learning_goals, explanation_preference, current_step, onboarding_completed, completed_at, created_at, updated_at"
            )
            .eq("user_id", user.id)
            .maybeSingle(),
        ]
      );

      if (profileData) {
        initialProfile = profileData as UserProfile;
      }
      if (academicData) {
        initialAcademicProfile = academicData as StudentAcademicProfile;
      }
    } catch {
      // Client component verifies and hydrates live from Supabase under RLS when sandbox egress is restricted
    }
  }

  if (initialAcademicProfile?.onboarding_completed && !allowCompletedReview) {
    redirect("/dashboard");
  }

  const metaFullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";
  const metaCountry =
    typeof user.user_metadata?.country === "string"
      ? user.user_metadata.country
      : "";

  return (
    <OnboardingStageClient
      initialUserId={user.id}
      initialEmail={user.email ?? ""}
      initialFullName={metaFullName}
      initialCountry={metaCountry}
      initialProfile={initialProfile}
      initialAcademicProfile={initialAcademicProfile}
      allowCompletedReview={allowCompletedReview}
    />
  );
}
