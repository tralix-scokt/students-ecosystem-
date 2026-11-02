import React from "react";
import { ShieldCheck, Cpu, BookMarked } from "lucide-react";
import { BRAND_IDENTITY, LANDING_COPY } from "@/data/ecosystemContent";

export function IntroductionSection() {
  return (
    <section
      id="introduction"
      aria-labelledby="intro-heading"
      className="relative border-y border-slate-800/70 bg-obsidian-900/45 py-20 sm:py-24"
    >
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-aura-500/45 to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block font-display text-xs font-semibold uppercase tracking-[0.24em] text-electric-400">
            {LANDING_COPY.introBadge}
          </span>
          <h2
            id="intro-heading"
            className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl"
          >
            {LANDING_COPY.introHeading}
          </h2>
          <p className="mt-6 text-base leading-relaxed text-slate-300 sm:text-lg">
            {LANDING_COPY.introBody}
          </p>
        </div>

        {/* Three succinct foundational principles */}
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800/90 bg-obsidian-950/70 p-6 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-electric-400/30 bg-electric-400/10 text-electric-400">
              <BookMarked className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-4 font-display text-base font-semibold text-white">
              Purposeful Clarity
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Every visual element is engineered to sustain calm concentration
              and deep conceptual understanding across devices.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800/90 bg-obsidian-950/70 p-6 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-aura-400/35 bg-aura-500/10 text-aura-400">
              <Cpu className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-4 font-display text-base font-semibold text-white">
              {BRAND_IDENTITY.poweredBy}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Designed around responsible academic intelligence that guides
              reasoning rather than replacing genuine comprehension.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800/90 bg-obsidian-950/70 p-6 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-electric-400/30 bg-electric-400/10 text-electric-400">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-4 font-display text-base font-semibold text-white">
              Built for Long-Term Growth
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              From daily study structure to formal examination readiness, every
              pillar aligns around measurable academic progress.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
