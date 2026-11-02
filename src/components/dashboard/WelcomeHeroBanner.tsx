"use client";

import React from "react";
import Link from "next/link";
import {
  BookOpen,
  Building2,
  GraduationCap,
  Layers,
  PenSquare,
} from "lucide-react";
import { formatCategoryLabel } from "@/data/onboardingOptions";
import type { UserProfile } from "@/types/auth";
import type { StudentAcademicProfile } from "@/types/onboarding";

interface WelcomeHeroBannerProps {
  userProfile: UserProfile | null;
  academicProfile: StudentAcademicProfile | null;
}

export function WelcomeHeroBanner({
  userProfile,
  academicProfile,
}: WelcomeHeroBannerProps) {
  const studentName = userProfile?.full_name?.trim() || "Learner";
  const categoryLabel = formatCategoryLabel(
    academicProfile?.academic_category ?? null
  );

  const institutionText =
    academicProfile?.institution_name?.trim() ||
    (academicProfile?.academic_category === "secondary"
      ? "Independent Secondary Learner"
      : "Not specified");

  const levelText = (() => {
    if (!academicProfile?.academic_level) return "Not specified";
    if (
      academicProfile.academic_category === "university" &&
      academicProfile.academic_level !== "Other"
    ) {
      return `${academicProfile.academic_level} Level`;
    }
    if (
      academicProfile.academic_category === "polytechnic" &&
      academicProfile.qualification_type
    ) {
      return `${academicProfile.academic_level} (${academicProfile.qualification_type})`;
    }
    return academicProfile.academic_level;
  })();

  const selectedSubjects = academicProfile?.selected_subjects ?? [];
  const courseOrProgram = academicProfile?.course_or_program;

  return (
    <section
      aria-labelledby="welcome-heading"
      className="relative overflow-hidden rounded-3xl border border-electric-400/30 hardcover-surface p-6 shadow-card-elevated sm:p-8"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full bg-electric-400/12 blur-[85px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 left-12 h-56 w-64 rounded-full bg-aura-500/12 blur-[90px]"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-electric-400/35 bg-electric-400/10 px-3 py-1 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-electric-300">
            Academic Command Center
          </span>

          <h1
            id="welcome-heading"
            className="mt-4 font-display text-2xl font-bold tracking-tight text-white sm:text-4xl"
          >
            Welcome back, {studentName}
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">
            Your next chapter of learning starts here.
          </p>
        </div>

        <Link
          href="/onboarding?review=1"
          className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-slate-700/85 bg-obsidian-950/80 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-electric-400/50 hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400"
        >
          <PenSquare className="h-3.5 w-3.5 text-electric-400" aria-hidden="true" />
          <span>Edit Academic Profile</span>
        </Link>
      </div>

      {/* Academic Identity Metadata Grid */}
      <dl className="relative z-10 mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <div className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-obsidian-950/75 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-electric-400/30 bg-electric-400/10 text-electric-300">
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Academic Category
            </dt>
            <dd className="mt-0.5 truncate text-sm font-bold text-white">
              {categoryLabel}
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-obsidian-950/75 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-aura-400/30 bg-aura-500/12 text-aura-300">
            <Building2 className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Institution / School
            </dt>
            <dd className="mt-0.5 truncate text-sm font-bold text-white">
              {institutionText}
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-obsidian-950/75 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-electric-400/30 bg-electric-400/10 text-electric-300">
            <Layers className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Class / Academic Level
            </dt>
            <dd className="mt-0.5 truncate text-sm font-bold text-electric-300">
              {levelText}
            </dd>
          </div>
        </div>
      </dl>

      {/* Selected Subjects / Academic Course Strip */}
      <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.07] pt-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <BookOpen className="h-3.5 w-3.5 text-electric-400" aria-hidden="true" />
          <span>
            {selectedSubjects.length > 0
              ? "Selected Subjects:"
              : courseOrProgram
                ? "Program / Course:"
                : "Subjects:"}
          </span>
        </span>

        {selectedSubjects.length > 0 ? (
          selectedSubjects.map((subject) => (
            <span
              key={subject}
              className="rounded-lg border border-electric-400/30 bg-electric-400/10 px-2.5 py-1 text-xs font-medium text-electric-200"
            >
              {subject}
            </span>
          ))
        ) : courseOrProgram ? (
          <span className="rounded-lg border border-aura-400/35 bg-aura-500/15 px-2.5 py-1 text-xs font-medium text-aura-300">
            {courseOrProgram}
          </span>
        ) : (
          <span className="text-xs text-slate-400">
            No individual subjects selected yet
          </span>
        )}
      </div>
    </section>
  );
}
