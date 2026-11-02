import React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { BRAND_IDENTITY, LANDING_COPY } from "@/data/ecosystemContent";

export function HeroSection() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate overflow-hidden pb-20 pt-14 sm:pb-28 sm:pt-20 lg:pb-32 lg:pt-24"
    >
      {/* Studio Ambient Lighting */}
      <div
        className="pointer-events-none absolute inset-0 ecosystem-grid-bg"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-electric-400/10 blur-[130px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-[-10%] top-28 h-[420px] w-[480px] rounded-full bg-aura-500/15 blur-[130px]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-12 lg:gap-12">
          {/* Left Column: Core Brand Messaging & CTAs */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-electric-400/30 bg-obsidian-900/85 px-4 py-1.5 shadow-[0_0_24px_-6px_rgba(0,229,255,0.35)] backdrop-blur-md">
              <Sparkles
                className="h-3.5 w-3.5 text-electric-400"
                aria-hidden="true"
              />
              <span className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-electric-300">
                {BRAND_IDENTITY.name} • {BRAND_IDENTITY.poweredBy}
              </span>
            </div>

            <h1
              id="hero-heading"
              className="mt-7 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl lg:leading-[1.08]"
            >
              {LANDING_COPY.heading}
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl">
              {LANDING_COPY.supportingText}
            </p>

            <div className="mt-9 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
              <Link
                href="/login"
                className="group relative inline-flex min-h-[52px] items-center justify-center gap-3 rounded-xl border border-electric-400/70 bg-gradient-to-r from-electric-400 via-electric-500 to-aura-500 px-7 py-3.5 text-base font-semibold text-obsidian-950 shadow-[0_0_36px_-6px_rgba(0,229,255,0.6)] transition-all duration-300 hover:scale-[1.015] hover:shadow-[0_0_46px_-4px_rgba(0,229,255,0.8)] focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-300 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-950"
              >
                <span className="text-obsidian-950 font-bold tracking-wide">
                  {LANDING_COPY.primaryCta}
                </span>
                <ArrowRight
                  className="h-4 w-4 text-obsidian-950 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>

              <Link
                href="/login"
                className="inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl border border-slate-700/80 bg-obsidian-900/80 px-6 py-3.5 text-base font-medium text-white backdrop-blur-md transition-all duration-300 hover:border-electric-400/50 hover:bg-obsidian-850 hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-950"
              >
                <BookOpen
                  className="h-4 w-4 text-electric-400"
                  aria-hidden="true"
                />
                <span>{LANDING_COPY.secondaryCta}</span>
              </Link>
            </div>

            {/* Architectural Pillars Quick Strip */}
            <div className="mt-11 grid grid-cols-2 gap-4 border-t border-slate-800/80 pt-7 sm:grid-cols-4">
              {[
                { label: "Structured Learning", tag: "Pillar I" },
                { label: "AI Tutor", tag: "Pillar II" },
                { label: "Exam Preparation", tag: "Pillar III" },
                { label: "Academic Management", tag: "Pillar IV" },
              ].map((item) => (
                <div key={item.label} className="flex flex-col">
                  <span className="font-display text-[10px] uppercase tracking-[0.2em] text-electric-400/80">
                    {item.tag}
                  </span>
                  <span className="mt-1 text-xs font-medium text-slate-300 sm:text-sm">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Interactive Architectural Tome Teaser */}
          <div className="lg:col-span-5">
            <Link
              href="/login"
              aria-label="Enter the 3D Hardcover Book Login Experience"
              className="group relative mx-auto block max-w-md focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 focus-visible:ring-offset-4 focus-visible:ring-offset-obsidian-950 rounded-2xl"
            >
              {/* Dual Cyan & Violet Halo */}
              <div
                className="pointer-events-none absolute -inset-3 rounded-3xl bg-gradient-to-tr from-aura-500/25 via-transparent to-electric-400/30 opacity-75 blur-xl transition-opacity duration-500 group-hover:opacity-100"
                aria-hidden="true"
              />

              <div className="relative overflow-hidden rounded-2xl border border-slate-700/70 hardcover-surface p-6 sm:p-8 transition-transform duration-500 group-hover:-translate-y-1.5">
                <div
                  className="pointer-events-none absolute inset-0 hardcover-grain opacity-70"
                  aria-hidden="true"
                />
                {/* Top Status Header */}
                <div className="relative z-10 flex items-center justify-between border-b border-slate-700/60 pb-4">
                  <span className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-electric-300">
                    Interactive 3D Portal
                  </span>
                  <span className="rounded-full border border-aura-400/35 bg-aura-500/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-aura-300">
                    {BRAND_IDENTITY.engine}
                  </span>
                </div>

                {/* Miniature Sculptural Book Emblem */}
                <div className="relative z-10 my-7 flex flex-col items-center text-center">
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-electric-400/40 bg-obsidian-950/90 shadow-cyan-glow transition-transform duration-500 group-hover:scale-105">
                    <BookOpen
                      className="h-9 w-9 text-electric-400"
                      aria-hidden="true"
                    />
                    <span
                      className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-aura-400 shadow-[0_0_12px_#A78BFA]"
                      aria-hidden="true"
                    />
                  </div>

                  <p className="mt-6 font-display text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {BRAND_IDENTITY.name}
                  </p>
                  <p className="mt-2 font-serif text-xl italic text-slate-100 sm:text-2xl">
                    “Every great journey begins with a single page.”
                  </p>
                </div>

                {/* Bottom Action Prompt */}
                <div className="relative z-10 flex items-center justify-between rounded-xl border border-electric-400/25 bg-obsidian-950/80 px-4 py-3 text-xs font-medium text-slate-200 transition-colors group-hover:border-electric-400/60 group-hover:text-electric-300">
                  <span className="uppercase tracking-[0.16em]">
                    Open the 3D Hardcover Portal
                  </span>
                  <ArrowRight
                    className="h-4 w-4 text-electric-400 transition-transform duration-300 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
