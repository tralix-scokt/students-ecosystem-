"use client";

import React from "react";
import { Check, CloudUpload, Loader2 } from "lucide-react";
import { ONBOARDING_STEPS } from "@/data/onboardingOptions";
import type { OnboardingStep } from "@/types/onboarding";

interface OnboardingProgressBarProps {
  currentStep: OnboardingStep;
  maxReachedStep: OnboardingStep;
  autoSaveState: "idle" | "saving" | "saved" | "error";
  lastSavedAt: string | null;
  onSelectStep: (step: OnboardingStep) => void;
}

export function OnboardingProgressBar({
  currentStep,
  maxReachedStep,
  autoSaveState,
  lastSavedAt,
  onSelectStep,
}: OnboardingProgressBarProps) {
  const progressPercent = Math.round(((currentStep - 1) / 3) * 100);

  return (
    <nav
      aria-label="Onboarding progress"
      className="rounded-2xl border border-white/[0.08] bg-obsidian-900/80 p-4 backdrop-blur-md sm:p-5"
    >
      {/* Top Status Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-electric-400/35 bg-electric-400/10 px-2.5 py-0.5 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-electric-300">
            Step {currentStep} of 4
          </span>
          <span className="text-xs font-medium text-slate-300 sm:text-sm">
            {ONBOARDING_STEPS[currentStep - 1]?.label}
          </span>
        </div>

        {/* Auto-Save Status Indicator */}
        <div
          aria-live="polite"
          className="flex items-center gap-1.5 text-xs text-slate-400"
        >
          {autoSaveState === "saving" && (
            <>
              <Loader2
                className="h-3.5 w-3.5 animate-spin text-electric-400"
                aria-hidden="true"
              />
              <span className="text-electric-300">Saving progress...</span>
            </>
          )}
          {autoSaveState === "saved" && (
            <>
              <CloudUpload
                className="h-3.5 w-3.5 text-electric-400"
                aria-hidden="true"
              />
              <span className="text-slate-300">
                Progress saved
                {lastSavedAt ? ` • ${lastSavedAt}` : ""}
              </span>
            </>
          )}
          {autoSaveState === "error" && (
            <span className="text-amber-300">
              Auto-save will retry on next action
            </span>
          )}
          {autoSaveState === "idle" && (
            <span className="text-slate-500">Auto-save enabled</span>
          )}
        </div>
      </div>

      {/* Linear Progress Track */}
      <div
        className="relative h-1.5 w-full overflow-hidden rounded-full bg-obsidian-950"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-electric-400 via-electric-500 to-aura-500 transition-all duration-500 ease-out"
          style={{ width: `${Math.max(12, progressPercent === 0 ? 12 : progressPercent)}%` }}
        />
      </div>

      {/* 4 Step Pills */}
      <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {ONBOARDING_STEPS.map((item) => {
          const isActive = item.step === currentStep;
          const isCompleted = item.step < currentStep;
          const canJump = item.step <= maxReachedStep && item.step !== currentStep;

          return (
            <li key={item.step}>
              <button
                type="button"
                disabled={!canJump && !isActive}
                onClick={() => {
                  if (canJump) onSelectStep(item.step);
                }}
                aria-current={isActive ? "step" : undefined}
                className={`flex min-h-[44px] w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 ${
                  isActive
                    ? "border-electric-400/70 bg-electric-400/12 text-white shadow-cyan-glow"
                    : isCompleted
                      ? "cursor-pointer border-electric-400/30 bg-obsidian-950/75 text-slate-200 hover:border-electric-400/60 hover:text-white"
                      : canJump
                        ? "cursor-pointer border-slate-700/80 bg-obsidian-950/60 text-slate-300 hover:border-slate-500"
                        : "cursor-default border-slate-800/80 bg-obsidian-950/40 text-slate-500"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isActive
                      ? "bg-electric-400 text-obsidian-950"
                      : isCompleted
                        ? "border border-electric-400/60 bg-electric-400/15 text-electric-300"
                        : "border border-slate-700 bg-obsidian-900 text-slate-400"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    item.step
                  )}
                </span>
                <span className="truncate font-display text-xs font-semibold tracking-wide">
                  <span className="hidden md:inline">{item.label}</span>
                  <span className="md:hidden">{item.shortLabel}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
