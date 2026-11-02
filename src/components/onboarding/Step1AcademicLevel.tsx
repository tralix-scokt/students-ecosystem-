"use client";

import React from "react";
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Loader2,
  School,
  Wrench,
} from "lucide-react";
import { ACADEMIC_CATEGORY_CARDS } from "@/data/onboardingOptions";
import type { AcademicCategory } from "@/types/onboarding";

interface Step1AcademicLevelProps {
  selectedCategory: AcademicCategory | null;
  errorMessage?: string;
  isSubmitting: boolean;
  onSelectCategory: (category: AcademicCategory) => void;
  onContinue: () => void;
}

const CATEGORY_ICON_MAP: Record<AcademicCategory, React.ElementType> = {
  secondary: School,
  university: GraduationCap,
  polytechnic: Wrench,
};

export function Step1AcademicLevel({
  selectedCategory,
  errorMessage,
  isSubmitting,
  onSelectCategory,
  onContinue,
}: Step1AcademicLevelProps) {
  return (
    <section aria-labelledby="step1-heading" className="space-y-8">
      {/* Header */}
      <div className="max-w-2xl">
        <span className="inline-flex items-center rounded-full border border-electric-400/35 bg-electric-400/10 px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-electric-300">
          Academic Pathway
        </span>
        <h1
          id="step1-heading"
          className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl"
        >
          Select Your Academic Level.
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-slate-300 sm:text-base">
          Choose the academic pathway that matches your current program so we
          can tailor your curriculum structure, courses, and study guidance.
        </p>
      </div>

      {/* Three Large Interactive Cards */}
      <div
        role="radiogroup"
        aria-label="Academic level categories"
        className="grid grid-cols-1 gap-5 lg:grid-cols-3"
      >
        {ACADEMIC_CATEGORY_CARDS.map((card) => {
          const IconComponent = CATEGORY_ICON_MAP[card.id];
          const isSelected = selectedCategory === card.id;

          const activeCardClasses =
            card.accent === "violet"
              ? "border-aura-400 bg-gradient-to-b from-obsidian-800/95 via-obsidian-900 to-obsidian-950 shadow-violet-glow ring-1 ring-aura-400/50"
              : "border-electric-400 bg-gradient-to-b from-obsidian-800/95 via-obsidian-900 to-obsidian-950 shadow-cyan-glow ring-1 ring-electric-400/50";

          return (
            <button
              key={card.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelectCategory(card.id)}
              className={`group relative flex min-h-[290px] flex-col justify-between rounded-2xl border p-6 text-left transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 sm:p-7 ${
                isSelected
                  ? `${activeCardClasses} -translate-y-1`
                  : "border-slate-800/90 bg-obsidian-900/75 hover:-translate-y-1 hover:border-electric-400/45 hover:bg-obsidian-850/90"
              }`}
            >
              <div>
                {/* Top Icon + Selection Check */}
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-300 ${
                      isSelected
                        ? card.accent === "violet"
                          ? "border-aura-400/60 bg-aura-500/20 text-aura-300"
                          : "border-electric-400/60 bg-electric-400/15 text-electric-300"
                        : "border-slate-700/80 bg-obsidian-950/85 text-slate-300 group-hover:border-electric-400/45 group-hover:text-electric-300"
                    }`}
                  >
                    <IconComponent className="h-7 w-7" aria-hidden="true" />
                  </div>

                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
                      isSelected
                        ? "border-electric-400 bg-electric-400 text-obsidian-950"
                        : "border-slate-700 bg-obsidian-950 text-transparent group-hover:border-slate-500"
                    }`}
                    aria-hidden="true"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                </div>

                {/* Badge & Title */}
                <p className="mt-5 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {card.badge}
                </p>
                <h2 className="mt-1.5 font-display text-xl font-bold tracking-tight text-white">
                  {card.title}
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
                  {card.subtitle}
                </p>
              </div>

              {/* Bullet Highlights */}
              <ul className="mt-6 space-y-2 border-t border-white/[0.07] pt-4">
                {card.highlights.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-center gap-2.5 text-xs font-medium text-slate-200 sm:text-sm"
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        isSelected ? "bg-electric-400" : "bg-aura-400"
                      }`}
                      aria-hidden="true"
                    />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {errorMessage && (
        <p role="alert" className="text-sm font-medium text-rose-300">
          {errorMessage}
        </p>
      )}

      {/* Continue Footer */}
      <div className="flex flex-col items-stretch justify-between gap-4 border-t border-white/[0.08] pt-6 sm:flex-row sm:items-center">
        <p className="text-xs text-slate-400 sm:text-sm">
          {selectedCategory
            ? "Pathway selected. Continue to enter your academic details."
            : "Select one academic category above to activate Continue."}
        </p>

        <button
          type="button"
          disabled={!selectedCategory || isSubmitting}
          onClick={onContinue}
          className="inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-xl border border-electric-400/70 bg-gradient-to-r from-electric-400 via-electric-500 to-aura-500 px-7 py-3 text-sm font-bold tracking-wide text-obsidian-950 shadow-cyan-glow transition-all duration-300 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-300 disabled:cursor-not-allowed disabled:border-slate-800 disabled:from-slate-800 disabled:via-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:shadow-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Saving Pathway...</span>
            </>
          ) : (
            <>
              <span>Continue</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </div>
    </section>
  );
}
