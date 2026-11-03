"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Award, CheckCircle2 } from "lucide-react";
import { buildExamPreparationContext } from "@/lib/dashboard/examPathways";
import type { StudentAcademicProfile } from "@/types/onboarding";

interface ExamPreparationCardProps {
  academicProfile: StudentAcademicProfile | null;
}

export function ExamPreparationCard({
  academicProfile,
}: ExamPreparationCardProps) {
  const examContext = buildExamPreparationContext(academicProfile);

  return (
    <section
      aria-labelledby="exam-prep-heading"
      className="futuristic-hud-panel relative flex flex-col justify-between overflow-hidden rounded-3xl border border-aura-400/30 p-6 sm:p-7"
    >
      <div
        className="ambient-glow-violet pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full"
        aria-hidden="true"
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-aura-400/45 bg-aura-500/15 text-aura-300">
            <Award className="h-6 w-6" aria-hidden="true" />
          </div>
          <span className="rounded-full border border-aura-400/35 bg-aura-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-aura-300">
            Exam Readiness
          </span>
        </div>

        <h2
          id="exam-prep-heading"
          className="mt-5 font-display text-xl font-bold tracking-tight text-white sm:text-2xl"
        >
          Prepare. Practice. Succeed.
        </h2>

        <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
          {examContext.supportingCopy}
        </p>

        {/* Streamlined Pathway Examination Tracks */}
        <ul className="mt-4 space-y-2">
          {examContext.tracks.map((track) => (
            <li
              key={track.code}
              className="futuristic-tile flex items-center justify-between gap-3 rounded-2xl border border-white/[0.07] px-3.5 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-aura-300"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-white sm:text-sm">
                    {track.title}
                  </p>
                  <p className="line-clamp-1 text-[11px] text-slate-400">
                    {track.description}
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-aura-400/25 bg-aura-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-aura-300">
                {track.code}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative z-10 mt-6 pt-2">
        <Link
          href="/dashboard/exams"
          className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-aura-400/65 bg-aura-500/20 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-aura-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-aura-300"
        >
          <span>{examContext.ctaLabel}</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
