import React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { BRAND_IDENTITY, LANDING_COPY } from "@/data/ecosystemContent";

export function PortalCalloutSection() {
  return (
    <section
      aria-labelledby="portal-callout-heading"
      className="relative pb-24 pt-6 sm:pb-32"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-electric-400/25 hardcover-surface px-6 py-14 text-center sm:px-12 sm:py-20">
          <div
            className="pointer-events-none absolute inset-0 hardcover-grain opacity-65"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-electric-400/15 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-aura-500/20 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-electric-400/30 bg-obsidian-950/75 px-3.5 py-1 font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-electric-300">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{BRAND_IDENTITY.name} PORTAL</span>
            </span>

            <h2
              id="portal-callout-heading"
              className="mt-5 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              Step Inside Your Learning Sanctuary.
            </h2>

            <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
              Open the interactive 3D hardcover tome to explore the learner
              sign-in and registration experience, powered by{" "}
              {BRAND_IDENTITY.engine}.
            </p>

            <div className="mt-8 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center">
              <Link
                href="/login"
                className="group inline-flex min-h-[50px] items-center justify-center gap-2.5 rounded-xl border border-electric-400/70 bg-gradient-to-r from-electric-400 via-electric-500 to-aura-500 px-7 py-3 text-sm font-bold tracking-wide text-obsidian-950 shadow-cyan-glow transition-all duration-300 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-300 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-950"
              >
                <span>{LANDING_COPY.primaryCta}</span>
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-slate-700 bg-obsidian-950/80 px-6 py-3 text-sm font-medium text-white transition-colors hover:border-electric-400/50 hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-950"
              >
                <span>{LANDING_COPY.secondaryCta}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
