import React from "react";
import { Award, Compass, Layers, Shield, Sparkles } from "lucide-react";
import { BOOK_COPY, BRAND_IDENTITY } from "@/data/ecosystemContent";

export function BookRegisterRightPage() {
  return (
    <div className="flex h-full flex-col justify-between">
      {/* Page Header Folio */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <span className="font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-electric-400">
          {BOOK_COPY.registerRight.chapter}
        </span>
        <span className="font-serif text-xs italic text-slate-400">
          Folio IV
        </span>
      </div>

      {/* Editorial Body */}
      <div className="my-auto py-5 sm:py-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-electric-400/30 bg-electric-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-electric-300">
          <Shield className="h-3 w-3 text-electric-400" aria-hidden="true" />
          <span>Encrypted Learner Identity • RLS Protected</span>
        </div>

        <h2 className="mt-4 font-display text-2xl font-bold uppercase leading-snug tracking-[0.08em] text-white sm:text-[25px]">
          {BOOK_COPY.registerRight.heading}
        </h2>

        <blockquote className="mt-4 rounded-2xl border border-slate-700/75 bg-obsidian-950/65 p-4 sm:p-5">
          <p className="font-serif text-lg italic leading-relaxed text-slate-100 sm:text-xl">
            {BOOK_COPY.registerRight.motivationalMessage}
          </p>
        </blockquote>

        <p className="mt-4 text-xs leading-relaxed text-slate-300 sm:text-sm">
          {BOOK_COPY.registerRight.supportingText}
        </p>

        {/* Four Ecosystem Pillars Summary */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {[
            { label: "Structured Learning", Icon: Layers },
            { label: "AI Tutor", Icon: Sparkles },
            { label: "Exam Preparation", Icon: Award },
            { label: "Academic Management", Icon: Compass },
          ].map(({ label, Icon }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 rounded-xl border border-slate-800/85 bg-obsidian-950/60 p-2.5"
            >
              <Icon
                className="h-4 w-4 shrink-0 text-electric-400"
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-slate-200">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Page Footer Folio */}
      <div className="border-t border-slate-800/80 pt-4">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>{BRAND_IDENTITY.engine} • SUPABASE-READY</span>
          <span className="font-serif italic">04</span>
        </div>
      </div>
    </div>
  );
}
