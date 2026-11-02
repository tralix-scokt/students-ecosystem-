"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  BarChart3,
  BookOpen,
  Bot,
  CalendarClock,
  FileText,
  Sparkles,
} from "lucide-react";
import { useStudentDashboardData } from "@/lib/dashboard/useStudentDashboardData";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ExamPreparationCard } from "@/components/dashboard/ExamPreparationCard";
import { AcademicProgressSection } from "@/components/dashboard/AcademicProgressSection";
import { RecommendedLearningSection } from "@/components/dashboard/RecommendedLearningSection";
import { formatCategoryLabel } from "@/data/onboardingOptions";

export type PreparedModuleKind =
  | "learn"
  | "ai-tutor"
  | "exams"
  | "planner"
  | "notes"
  | "progress";

interface PreparedModuleShellProps {
  module: PreparedModuleKind;
}

const MODULE_META: Record<
  PreparedModuleKind,
  {
    badge: string;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  learn: {
    badge: "Learning Library Entry Point",
    title: "Learn",
    description:
      "Browse published courses and learning tracks tailored to your academic category, level, and selected subjects.",
    icon: BookOpen,
  },
  "ai-tutor": {
    badge: "TRALIX AI Workspace Entry Point",
    title: "AI Tutor",
    description:
      "Prepared workspace for step-by-step concept breakdowns and guided academic problem-solving tailored to your curriculum.",
    icon: Bot,
  },
  exams: {
    badge: "Examination Pathways",
    title: "Exam Preparation",
    description:
      "Structured examination readiness aligned with your saved academic category, region, and class level.",
    icon: Award,
  },
  planner: {
    badge: "Study Schedule Workspace",
    title: "My Planner",
    description:
      "Organize daily study sessions, subject blocks, and revision milestones around your academic goals.",
    icon: CalendarClock,
  },
  notes: {
    badge: "Personal Knowledge Vault",
    title: "My Notes",
    description:
      "Dedicated space prepared for structured lecture notes, revision summaries, and subject takeaways.",
    icon: FileText,
  },
  progress: {
    badge: "Real Performance Telemetry",
    title: "My Progress",
    description:
      "Verified records of completed lessons, ongoing courses, and recorded assessment results.",
    icon: BarChart3,
  },
};

export function PreparedModuleShell({ module }: PreparedModuleShellProps) {
  const { status, isRetrying, data, errorMessage, retry } =
    useStudentDashboardData();

  if (status === "loading") {
    return <DashboardSkeleton />;
  }

  if (status === "error" || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian-950 p-4">
        <DashboardErrorState
          message={errorMessage || "Unable to load this workspace right now."}
          isRetrying={isRetrying}
          onRetry={retry}
        />
      </div>
    );
  }

  const meta = MODULE_META[module];
  const Icon = meta.icon;
  const categoryLabel = formatCategoryLabel(
    data.academicProfile?.academic_category ?? null
  );
  const subjects: string[] = data.academicProfile?.selected_subjects ?? [];

  return (
    <DashboardShell
      userProfile={data.userProfile}
      academicProfile={data.academicProfile}
      fallbackEmail={data.email}
      unreadNotificationCount={data.unreadNotificationCount}
      publishedCourses={data.publishedCourses}
      ongoingCourses={data.ongoingCourses}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-700/80 bg-obsidian-900/80 px-3.5 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-electric-400/50 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 text-electric-400" aria-hidden="true" />
            <span>Back to Dashboard</span>
          </Link>

          <span className="rounded-full border border-electric-400/30 bg-electric-400/10 px-3 py-1 text-[11px] font-semibold text-electric-300">
            {categoryLabel}
          </span>
        </div>

        <section className="rounded-3xl border border-electric-400/30 hardcover-surface p-6 shadow-card-elevated sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-electric-400/45 bg-electric-400/12 text-electric-300">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-electric-300">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{meta.badge}</span>
              </span>
              <h1 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">
                {meta.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                {meta.description}
              </p>
            </div>
          </div>

          {subjects.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/[0.07] pt-4">
              <span className="text-xs font-semibold text-slate-400">
                Connected Subjects:
              </span>
              {subjects.map((subject: string) => (
                <span
                  key={subject}
                  className="rounded-lg border border-electric-400/25 bg-electric-400/10 px-2.5 py-1 text-xs font-medium text-electric-200"
                >
                  {subject}
                </span>
              ))}
            </div>
          )}
        </section>

        {module === "exams" && (
          <ExamPreparationCard academicProfile={data.academicProfile} />
        )}

        {module === "progress" && (
          <AcademicProgressSection metrics={data.progressMetrics} />
        )}

        {module === "learn" && (
          <RecommendedLearningSection
            academicProfile={data.academicProfile}
            publishedCourses={data.publishedCourses}
          />
        )}

        {(module === "ai-tutor" ||
          module === "planner" ||
          module === "notes") && (
          <section className="rounded-2xl border border-dashed border-slate-800 bg-obsidian-950/75 p-6 text-center sm:p-8">
            <h2 className="font-display text-lg font-bold text-white">
              {meta.title} Workspace Prepared
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-slate-400 sm:text-sm">
              Your{" "}
              <strong className="text-slate-200">{categoryLabel}</strong>{" "}
              academic context is connected and ready. Interactive{" "}
              {meta.title.toLowerCase()} capabilities will activate when this
              ecosystem module rolls out.
            </p>
          </section>
        )}
      </div>
    </DashboardShell>
  );
}
