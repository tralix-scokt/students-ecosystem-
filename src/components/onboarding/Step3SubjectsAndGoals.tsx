"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Loader2,
  Plus,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import {
  EXPLANATION_PREFERENCES,
  getSuggestedSubjects,
  LEARNING_GOALS,
} from "@/data/onboardingOptions";
import type {
  ExplanationPreference,
  OnboardingFormState,
} from "@/types/onboarding";

interface Step3SubjectsAndGoalsProps {
  formState: OnboardingFormState;
  fieldErrors: Record<string, string>;
  isSubmitting: boolean;
  onUpdateField: <K extends keyof OnboardingFormState>(
    field: K,
    value: OnboardingFormState[K]
  ) => void;
  onBack: () => void;
  onComplete: () => void;
}

export function Step3SubjectsAndGoals({
  formState,
  fieldErrors,
  isSubmitting,
  onUpdateField,
  onBack,
  onComplete,
}: Step3SubjectsAndGoalsProps) {
  const [customSubject, setCustomSubject] = useState("");
  const isSecondary = formState.academicCategory === "secondary";

  const suggestedSubjects = getSuggestedSubjects(
    formState.academicCategory,
    formState.secondaryCategory
  );

  const toggleSubject = (subject: string) => {
    const exists = formState.selectedSubjects.some(
      (s) => s.toLowerCase() === subject.toLowerCase()
    );
    if (exists) {
      onUpdateField(
        "selectedSubjects",
        formState.selectedSubjects.filter(
          (s) => s.toLowerCase() !== subject.toLowerCase()
        )
      );
    } else if (formState.selectedSubjects.length < 30) {
      onUpdateField("selectedSubjects", [
        ...formState.selectedSubjects,
        subject,
      ]);
    }
  };

  const handleAddCustomSubject = () => {
    const trimmed = customSubject.trim().replace(/\s+/g, " ");
    if (trimmed.length < 2) return;
    const exists = formState.selectedSubjects.some(
      (s) => s.toLowerCase() === trimmed.toLowerCase()
    );
    if (!exists && formState.selectedSubjects.length < 30) {
      onUpdateField("selectedSubjects", [
        ...formState.selectedSubjects,
        trimmed,
      ]);
    }
    setCustomSubject("");
  };

  const toggleGoal = (goal: string) => {
    const exists = formState.learningGoals.includes(goal);
    if (exists) {
      onUpdateField(
        "learningGoals",
        formState.learningGoals.filter((g) => g !== goal)
      );
    } else {
      onUpdateField("learningGoals", [...formState.learningGoals, goal]);
    }
  };

  const handleSelectExplanation = (pref: ExplanationPreference) => {
    onUpdateField("explanationPreference", pref);
  };

  const customOnlySubjects = formState.selectedSubjects.filter(
    (sub) =>
      !suggestedSubjects.some(
        (sug) => sug.toLowerCase() === sub.toLowerCase()
      )
  );

  return (
    <section aria-labelledby="step3-heading" className="space-y-8">
      {/* Header */}
      <div className="max-w-2xl">
        <span className="inline-flex items-center rounded-full border border-electric-400/35 bg-electric-400/10 px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-electric-300">
          Personalization
        </span>
        <h1
          id="step3-heading"
          className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl"
        >
          Subjects &amp; Learning Goals.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">
          Select your subjects, academic goals, and preferred explanation style
          so your learning space adapts to how you study best.
        </p>
      </div>

      {/* 1. Subjects Multi-Select Panel */}
      <div className="rounded-2xl border border-white/[0.09] hardcover-surface p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <BookOpen
              className="h-5 w-5 text-electric-400"
              aria-hidden="true"
            />
            <h2 className="font-display text-lg font-bold text-white">
              {isSecondary
                ? "Select Your Subjects"
                : "Focus Subjects / Courses"}
            </h2>
          </div>
          <span className="rounded-full border border-slate-700/80 bg-obsidian-950/80 px-3 py-1 text-xs font-semibold text-electric-300">
            {formState.selectedSubjects.length} selected
            {!isSecondary ? " (optional)" : ""}
          </span>
        </div>

        <p className="mt-1.5 text-xs text-slate-400 sm:text-sm">
          {isSecondary
            ? "Select multiple subjects you are currently taking in Junior or Senior Secondary School."
            : "Optionally select or add key courses/modules you want prioritized first."}
        </p>

        {/* Suggested Subject Chips */}
        <div
          role="group"
          aria-label="Subject options"
          className="mt-4 flex flex-wrap gap-2.5"
        >
          {suggestedSubjects.map((subject) => {
            const selected = formState.selectedSubjects.some(
              (s) => s.toLowerCase() === subject.toLowerCase()
            );
            return (
              <button
                key={subject}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleSubject(subject)}
                className={`inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 sm:text-sm ${
                  selected
                    ? "border-electric-400 bg-electric-400/15 text-white shadow-cyan-glow"
                    : "border-slate-700/80 bg-obsidian-950/75 text-slate-300 hover:border-electric-400/45 hover:text-white"
                }`}
              >
                {selected && (
                  <Check
                    className="h-3.5 w-3.5 shrink-0 text-electric-400"
                    aria-hidden="true"
                  />
                )}
                <span>{subject}</span>
              </button>
            );
          })}

          {customOnlySubjects.map((customSub) => (
            <button
              key={customSub}
              type="button"
              aria-pressed={true}
              onClick={() => toggleSubject(customSub)}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-aura-400 bg-aura-500/20 px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-aura-400 sm:text-sm"
            >
              <span>{customSub}</span>
              <X className="h-3.5 w-3.5 text-aura-300" aria-hidden="true" />
            </button>
          ))}
        </div>

        {/* Custom Subject Input */}
        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <input
            type="text"
            aria-label="Add custom subject"
            value={customSubject}
            onChange={(e) => setCustomSubject(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCustomSubject();
              }
            }}
            placeholder="Add another subject or module..."
            className="block min-h-[44px] flex-1 rounded-xl border border-slate-700/80 bg-obsidian-950/85 px-4 py-2 text-base text-white placeholder:text-slate-500 focus:border-electric-400 focus:outline-none focus:ring-2 focus:ring-electric-400/30 sm:text-sm"
          />
          <button
            type="button"
            onClick={handleAddCustomSubject}
            disabled={customSubject.trim().length < 2}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-obsidian-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-electric-300 transition-colors hover:border-electric-400/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Add Subject</span>
          </button>
        </div>

        {fieldErrors.selectedSubjects && (
          <p
            role="alert"
            className="mt-3 flex items-center gap-1.5 text-xs text-rose-300"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{fieldErrors.selectedSubjects}</span>
          </p>
        )}
      </div>

      {/* 2. Learning Goals Multi-Select Panel */}
      <div className="rounded-2xl border border-white/[0.09] hardcover-surface p-5 sm:p-7">
        <div className="flex items-center gap-2.5">
          <Target className="h-5 w-5 text-aura-400" aria-hidden="true" />
          <h2 className="font-display text-lg font-bold text-white">
            Learning Goals
          </h2>
        </div>
        <p className="mt-1 text-xs text-slate-400 sm:text-sm">
          Select one or more goals that matter most to you right now.
        </p>

        <div
          role="group"
          aria-label="Learning goals"
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {LEARNING_GOALS.map((goal) => {
            const selected = formState.learningGoals.includes(goal);
            return (
              <button
                key={goal}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleGoal(goal)}
                className={`flex min-h-[54px] items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 ${
                  selected
                    ? "border-aura-400 bg-aura-500/15 text-white shadow-violet-glow"
                    : "border-slate-700/80 bg-obsidian-950/75 text-slate-200 hover:border-aura-400/45"
                }`}
              >
                <span className="text-sm font-medium">{goal}</span>
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${
                    selected
                      ? "border-aura-400 bg-aura-500 text-white"
                      : "border-slate-700 bg-obsidian-950 text-transparent"
                  }`}
                  aria-hidden="true"
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
              </button>
            );
          })}
        </div>

        {fieldErrors.learningGoals && (
          <p
            role="alert"
            className="mt-3 flex items-center gap-1.5 text-xs text-rose-300"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{fieldErrors.learningGoals}</span>
          </p>
        )}
      </div>

      {/* 3. Explanation Preferences Single-Select Panel */}
      <div className="rounded-2xl border border-white/[0.09] hardcover-surface p-5 sm:p-7">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-5 w-5 text-electric-400" aria-hidden="true" />
          <h2 className="font-display text-lg font-bold text-white">
            Explanation Preference
          </h2>
        </div>
        <p className="mt-1 text-xs text-slate-400 sm:text-sm">
          Choose how concepts, formulas, and topics should be explained to you.
        </p>

        <div
          role="radiogroup"
          aria-label="Explanation preferences"
          className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          {EXPLANATION_PREFERENCES.map((opt) => {
            const active = formState.explanationPreference === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => handleSelectExplanation(opt.value)}
                className={`flex flex-col justify-between rounded-2xl border p-5 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 ${
                  active
                    ? "border-electric-400 bg-electric-400/12 text-white shadow-cyan-glow"
                    : "border-slate-700/80 bg-obsidian-950/75 text-slate-300 hover:border-electric-400/45"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-lg font-bold text-white">
                      {opt.label}
                    </span>
                    <span
                      className={`h-3 w-3 rounded-full ${
                        active ? "bg-electric-400" : "bg-slate-700"
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-electric-300">
                    {opt.tagline}
                  </p>
                  <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {fieldErrors.explanationPreference && (
          <p
            role="alert"
            className="mt-3 flex items-center gap-1.5 text-xs text-rose-300"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{fieldErrors.explanationPreference}</span>
          </p>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-white/[0.08] pt-6 sm:flex-row sm:items-center">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onBack}
          className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-obsidian-950/80 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-electric-400/50 hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 disabled:opacity-65"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back</span>
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={onComplete}
          className="inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-xl border border-electric-400/70 bg-gradient-to-r from-electric-400 via-electric-500 to-aura-500 px-7 py-3 text-sm font-bold tracking-wide text-obsidian-950 shadow-cyan-glow transition-all duration-300 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-300 disabled:opacity-70"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Completing Setup...</span>
            </>
          ) : (
            <>
              <span>Complete Onboarding</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </div>
    </section>
  );
}
