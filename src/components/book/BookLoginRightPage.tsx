import React from "react";
import { Compass, Sparkles } from "lucide-react";
import { BOOK_COPY, BRAND_IDENTITY } from "@/data/ecosystemContent";

export function BookLoginRightPage() {
  return (
    <div className="flex h-full flex-col justify-between">
      {/* Page Header Folio */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <span className="font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-aura-300">
          {BOOK_COPY.loginRight.chapter}
        </span>
        <span className="font-serif text-xs italic text-slate-400">
          Folio II
        </span>
      </div>

      {/* Illuminated Editorial Body */}
      <div className="my-auto py-6 sm:py-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-aura-400/30 bg-aura-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-aura-300">
          <Sparkles className="h-3 w-3 text-electric-400" aria-hidden="true" />
          <span>{BRAND_IDENTITY.poweredBy}</span>
        </div>

        <h2 className="mt-5 font-display text-2xl font-bold uppercase leading-snug tracking-[0.08em] text-white sm:text-[26px]">
          {BOOK_COPY.loginRight.heading}
        </h2>

        {/* Ornamental Cyan-Violet Divider */}
        <div className="my-5 flex items-center gap-3" aria-hidden="true">
          <span className="h-2 w-2 rotate-45 border border-electric-400 bg-electric-400/30" />
          <div className="h-px flex-1 bg-gradient-to-r from-electric-400/60 via-aura-400/50 to-transparent" />
        </div>

        {/* Featured Dedication Quote Frame */}
        <blockquote className="relative overflow-hidden rounded-2xl border border-slate-700/75 bg-obsidian-950/65 p-5 sm:p-6 shadow-[inset_0_1px_0_rgba(103,240,255,0.15)]">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-aura-500/15 blur-2xl"
            aria-hidden="true"
          />
          <p className="relative z-10 font-serif text-xl italic leading-relaxed text-slate-100 sm:text-2xl">
            {BOOK_COPY.loginRight.motivationalMessage}
          </p>
        </blockquote>

        <p className="mt-6 text-sm font-medium leading-relaxed text-electric-300/95 sm:text-base">
          {BOOK_COPY.loginRight.supportingText}
        </p>

        {/* Subtle Architectural Compass Callout */}
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-slate-800/80 bg-obsidian-950/50 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-electric-400/30 bg-electric-400/10 text-electric-400">
            <Compass className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            Structured Learning • AI Tutor • Exam Preparation • Academic
            Management
          </p>
        </div>
      </div>

      {/* Page Footer Folio */}
      <div className="border-t border-slate-800/80 pt-4">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>{BRAND_IDENTITY.engine} • SANCTUARY EDITION</span>
          <span className="font-serif italic">02</span>
        </div>
      </div>
    </div>
  );
}
