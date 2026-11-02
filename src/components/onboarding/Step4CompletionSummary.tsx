"use client";

import React from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import {
  formatCategoryLabel,
  formatExplanationLabel,
} from "@/data/onboardingOptions";
import type { OnboardingFormState } from "@/types/onboarding";

interface Step4CompletionSummaryProps {
  learnerName: string;
  formState: OnboardingFormState;
  onBack: () => void;
  onEnterLearningSpace: () => void;
}

export function Step4CompletionSummary({
  learnerName,
  formState,
  onBack,
  onEnterLearningSpace,
}: Step4CompletionSummaryProps) {
  const category = formState.academicCategory;

  return (
    <section aria-labelledby="step4-heading" className="space-y-8">
      {/* Hero Completion Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-electric-400/45 hardcover-surface p-6 text-center shadow-book-open sm:p-10">
        <div
          className="pointer-events-none absolute -top-24 left-1/2 h-56 w-96 -translate-x-1/2 rounded-full bg-electric-400/15 blur-[90px]"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto max-w-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-electric-400/50 bg-electric-400/15 text-electric-300 shadow-cyan-glow">
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
          </div>

          <p className="mt-5 font-display text-xs font-bold uppercase tracking-[0.22em] text-electric-300">
            Onboarding Complete{learnerName ? ` • ${learnerName}` : ""}
          </p>

          <h1
            id="step4-heading"
            className="mt-3 font-display text-2xl font-bold uppercase tracking-tight text-white sm:text-4xl"
          >
            YOUR LEARNING JOURNEY IS READY.
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-200 sm:text-lg">
            We’ve personalized your learning environment. Your next chapter
            starts now.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onEnterLearningSpace}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-xl border border-electric-400/80 bg-gradient-to-r from-electric-400 via-electric-500 to-aura-500 px-8 py-3.5 font-display text-sm font-bold uppercase tracking-[0.14em] text-obsidian-950 shadow-cyan-glow transition-all duration-300 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-300 sm:w-auto"
            >
              <span>ENTER MY LEARNING SPACE</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Personalized Academic Profile Summary */}
      <div className="rounded-2xl border border-white/[0.09] rim-border-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <GraduationCap
              className="h-5 w-5 text-electric-400"
              aria-hidden="true"
            />
            <h2 className="font-display text-base font-bold uppercase tracking-[0.16em] text-white">
              Academic Summary
            </h2>
          </div>
          <span className="rounded-full border border-aura-400/40 bg-aura-500/15 px-3 py-1 text-xs font-semibold text-aura-300">
            {formatCategoryLabel(category)}
          </span>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-800/90 bg-obsidian-950/70 p-4">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Location
            </dt>
            <dd className="mt-1 text-sm font-semibold text-white">
              {[formState.stateRegion, formState.country]
                .filter(Boolean)
                .join(", ") || "—"}
            </dd>
          </div>

          <div className="rounded-xl border border-slate-800/90 bg-obsidian-950/70 p-4">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Institution
            </dt>
            <dd className="mt-1 text-sm font-semibold text-white">
              {formState.institutionName || "Independent / Not specified"}
            </dd>
          </div>

          <div className="rounded-xl border border-slate-800/90 bg-obsidian-950/70 p-4">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {category === "secondary" ? "Class & Stage" : "Current Level"}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-electric-300">
              {category === "secondary" && formState.secondaryCategory
                ? `${formState.academicLevel} (${formState.secondaryCategory === "junior" ? "Junior Secondary" : "Senior Secondary"})`
                : category === "university" && formState.academicLevel !== "Other"
                  ? `${formState.academicLevel} Level`
                  : formState.academicLevel || "—"}
            </dd>
          </div>

          {category === "secondary" && (
            <div className="rounded-xl border border-slate-800/90 bg-obsidian-950/70 p-4 sm:col-span-2 lg:col-span-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Curriculum
              </dt>
              <dd className="mt-1 text-sm font-semibold text-white">
                {formState.curriculum || "—"}
              </dd>
            </div>
          )}

          {category === "university" && (
            <>
              <div className="rounded-xl border border-slate-800/90 bg-obsidian-950/70 p-4">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Faculty
                </dt>
                <dd className="mt-1 text-sm font-semibold text-white">
                  {formState.faculty || "—"}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-800/90 bg-obsidian-950/70 p-4">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Department
                </dt>
                <dd className="mt-1 text-sm font-semibold text-white">
                  {formState.department || "—"}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-800/90 bg-obsidian-950/70 p-4">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Course of Study
                </dt>
                <dd className="mt-1 text-sm font-semibold text-white">
                  {formState.courseOrProgram || "—"}
                </dd>
              </div>
            </>
          )}

          {category === "polytechnic" && (
            <>
              <div className="rounded-xl border border-slate-800/90 bg-obsidian-950/70 p-4">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Institution &amp; Qualification
                </dt>
                <dd className="mt-1 text-sm font-semibold text-white">
                  {[formState.institutionType, formState.qualificationType]
                    .filter(Boolean)
                    .join(" • ") || "—"}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-800/90 bg-obsidian-950/70 p-4">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Department
                </dt>
                <dd className="mt-1 text-sm font-semibold text-white">
                  {formState.department || "—"}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-800/90 bg-obsidian-950/70 p-4">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Course / Technical Program
                </dt>
                <dd className="mt-1 text-sm font-semibold text-white">
                  {formState.courseOrProgram || "—"}
                </dd>
              </div>
            </>
          )}

          <div className="rounded-xl border border-slate-800/90 bg-obsidian-950/70 p-4">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Explanation Preference
            </dt>
            <dd className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-electric-300">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {formatExplanationLabel(formState.explanationPreference)}
              </span>
            </dd>
          </div>
        </dl>

        {/* Subjects & Learning Goals Tags */}
        <div className="mt-6 grid grid-cols-1 gap-5 border-t border-slate-800/80 pt-5 md:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Selected Subjects ({formState.selectedSubjects.length})
            </h3>
            {formState.selectedSubjects.length > 0 ? (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {formState.selectedSubjects.map((sub) => (
                  <span
                    key={sub}
                    className="rounded-lg border border-electric-400/35 bg-electric-400/10 px-2.5 py-1 text-xs font-medium text-electric-200"
                  >
                    {sub}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Program-level course structure applied
              </p>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Learning Goals ({formState.learningGoals.length})
            </h3>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {formState.learningGoals.map((goal) => (
                <span
                  key={goal}
                  className="rounded-lg border border-aura-400/35 bg-aura-500/12 px-2.5 py-1 text-xs font-medium text-aura-300"
                >
                  {goal}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Back Option */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-800/80 pt-5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-700/80 bg-obsidian-950/80 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-electric-400/50 hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to Edit Academic Details</span>
          </button>
        </div>
      </div>
    </section>
  );
}
