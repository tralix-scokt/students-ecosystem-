"use client";

import React from "react";
import Link from "next/link";
import {
  Activity,
  BookOpen,
  Building2,
  ChevronRight,
  Clock,
  GraduationCap,
  Layers,
  PenSquare,
  Sparkles,
} from "lucide-react";
import { formatCategoryLabel } from "@/data/onboardingOptions";
import type { UserProfile } from "@/types/auth";
import type { StudentAcademicProfile } from "@/types/onboarding";

interface WelcomeHeroBannerProps {
  userProfile: UserProfile | null;
  academicProfile: StudentAcademicProfile | null;
  lessonsCompleted?: number;
  todayFocusMinutes?: number;
  averageAssessmentScore?: number | null;
}

export function WelcomeHeroBanner({
  userProfile,
  academicProfile,
  lessonsCompleted = 0,
  todayFocusMinutes = 0,
  averageAssessmentScore = null,
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
      className="futuristic-hud-panel relative overflow-hidden rounded-3xl border border-electric-400/25 p-5 sm:p-8"
    >
      {/* Subtle Futuristic Orbital HUD Watermark (GPU-safe SVG, zero blur filter) */}
      <svg
        aria-hidden="true"
        viewBox="0 0 240 240"
        className="pointer-events-none absolute -right-14 -top-14 h-56 w-56 opacity-35 sm:h-72 sm:w-72"
        fill="none"
      >
        <circle
          cx="120"
          cy="120"
          r="98"
          stroke="rgba(0, 229, 255, 0.22)"
          strokeDasharray="3 7"
          strokeWidth="1"
        />
        <circle
          cx="120"
          cy="120"
          r="68"
          stroke="rgba(167, 139, 250, 0.24)"
          strokeWidth="1"
        />
        <circle
          cx="120"
          cy="120"
          r="38"
          stroke="rgba(0, 229, 255, 0.3)"
          strokeWidth="1"
        />
        <circle cx="120" cy="22" r="3" fill="#00E5FF" />
        <circle cx="188" cy="120" r="2.5" fill="#A78BFA" />
      </svg>

      {/* Top HUD Telemetry Row: Live Status Pill + Compact Edit Action */}
      <div className="relative z-10 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-electric-400/30 bg-electric-400/10 px-3 py-1 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-electric-300 sm:text-[11px]">
          <span
            className="h-1.5 w-1.5 rounded-full bg-electric-400 shadow-[0_0_8px_#00E5FF]"
            aria-hidden="true"
          />
          <span>Academic Command Center</span>
        </span>

        <Link
          href="/onboarding?review=1"
          aria-label="Edit Academic Profile"
          className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-obsidian-950/75 px-3.5 py-1.5 text-[11px] font-semibold text-slate-200 transition-colors hover:border-electric-400/50 hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400"
        >
          <PenSquare className="h-3.5 w-3.5 text-electric-400" aria-hidden="true" />
          <span className="hidden sm:inline">Edit Academic Profile</span>
          <span className="sm:hidden">Profile</span>
        </Link>
      </div>

      {/* Spacious Greeting + Refined Identity Capsule Strip */}
      <div className="relative z-10 mt-5 sm:mt-6">
        <h1
          id="welcome-heading"
          className="font-display text-2xl font-bold tracking-tight text-white sm:text-4xl"
        >
          Welcome back, {studentName}
        </h1>

        <p className="mt-1.5 text-sm leading-relaxed text-slate-300 sm:text-base">
          Your next chapter of learning starts here.
        </p>

        {/* Compact Single-Line / Flow Identity Strip (replaces 3 tall stacked boxes) */}
        <dl className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-electric-400/35 bg-electric-400/12 px-3 py-1 font-semibold text-electric-300">
            <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <dt className="sr-only">Class / Academic Level</dt>
            <dd>{levelText}</dd>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-obsidian-950/75 px-3 py-1 font-medium text-slate-200">
            <GraduationCap
              className="h-3.5 w-3.5 shrink-0 text-electric-400"
              aria-hidden="true"
            />
            <dt className="sr-only">Academic Category</dt>
            <dd>{categoryLabel}</dd>
          </div>

          <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-obsidian-950/75 px-3 py-1 font-medium text-slate-300">
            <Building2
              className="h-3.5 w-3.5 shrink-0 text-aura-300"
              aria-hidden="true"
            />
            <dt className="sr-only">Institution / School</dt>
            <dd className="truncate">{institutionText}</dd>
          </div>
        </dl>
      </div>

      {/* Live 3-Column Futuristic Telemetry HUD (100% Real Student Metrics) */}
      <div className="relative z-10 mt-5 grid grid-cols-3 gap-2.5 sm:mt-6 sm:gap-3.5">
        <Link
          href="/dashboard/learn"
          className="futuristic-tile group rounded-2xl border border-white/[0.08] p-3 transition-colors hover:border-electric-400/40 sm:p-4"
        >
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:text-[11px]">
            <span>Lessons</span>
            <BookOpen
              className="h-3.5 w-3.5 text-electric-400 opacity-80 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </div>
          <p className="mt-1.5 font-display text-lg font-bold text-white sm:text-2xl">
            {lessonsCompleted}
          </p>
          <p className="text-[10px] text-slate-400 sm:text-xs">Completed</p>
        </Link>

        <Link
          href="/dashboard/planner"
          className="futuristic-tile group rounded-2xl border border-white/[0.08] p-3 transition-colors hover:border-electric-400/40 sm:p-4"
        >
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:text-[11px]">
            <span>Focus</span>
            <Clock
              className="h-3.5 w-3.5 text-aura-300 opacity-80 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </div>
          <p className="mt-1.5 font-display text-lg font-bold text-white sm:text-2xl">
            {todayFocusMinutes > 0 ? `${todayFocusMinutes}m` : "Open"}
          </p>
          <p className="text-[10px] text-slate-400 sm:text-xs">Today&apos;s plan</p>
        </Link>

        <Link
          href="/dashboard/progress"
          className="futuristic-tile group rounded-2xl border border-white/[0.08] p-3 transition-colors hover:border-electric-400/40 sm:p-4"
        >
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:text-[11px]">
            <span>Mastery</span>
            <Activity
              className="h-3.5 w-3.5 text-electric-300 opacity-80 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </div>
          <p className="mt-1.5 font-display text-lg font-bold text-electric-300 sm:text-2xl">
            {averageAssessmentScore !== null
              ? `${averageAssessmentScore}% avg`
              : "Active"}
          </p>
          <p className="text-[10px] text-slate-400 sm:text-xs">
            {averageAssessmentScore !== null
              ? "Assessment mastery"
              : "Live workspace"}
          </p>
        </Link>
      </div>

      {/* Single-Row Glide Subject Rail — Never Jams or Stacks Vertically */}
      <div className="relative z-10 mt-5 border-t border-white/[0.07] pt-3.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            <Sparkles className="h-3 w-3 text-electric-400" aria-hidden="true" />
            <span>
              {selectedSubjects.length > 0
                ? `Active Subjects (${selectedSubjects.length})`
                : courseOrProgram
                  ? "Program / Course"
                  : "Subjects"}
            </span>
          </span>
          {selectedSubjects.length > 3 && (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-400 sm:hidden">
              <span>Swipe</span>
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
            </span>
          )}
        </div>

        <div className="no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-0.5">
          {selectedSubjects.length > 0 ? (
            selectedSubjects.map((subject) => (
              <Link
                key={subject}
                href={`/dashboard/ai-tutor?subject=${encodeURIComponent(subject)}`}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-electric-400/25 bg-obsidian-950/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-electric-400/60 hover:text-electric-300"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full bg-electric-400/80"
                  aria-hidden="true"
                />
                <span>{subject}</span>
              </Link>
            ))
          ) : courseOrProgram ? (
            <span className="inline-flex shrink-0 items-center rounded-full border border-aura-400/35 bg-aura-500/15 px-3.5 py-1.5 text-xs font-medium text-aura-300">
              {courseOrProgram}
            </span>
          ) : (
            <span className="text-xs text-slate-400">
              No individual subjects selected yet
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
