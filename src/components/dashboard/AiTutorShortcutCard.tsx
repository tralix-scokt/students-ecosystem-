"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Bot, Sparkles } from "lucide-react";

export function AiTutorShortcutCard() {
  return (
    <section
      aria-labelledby="ai-tutor-card-heading"
      className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-electric-400/35 bg-gradient-to-br from-obsidian-850 via-obsidian-900 to-obsidian-950 p-6 shadow-cyan-glow sm:p-7"
    >
      {/* Subtle Cyan & Violet Accent Lighting */}
      <div
        className="ambient-glow-cyan pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full"
        aria-hidden="true"
      />
      <div
        className="ambient-glow-violet pointer-events-none absolute -bottom-10 left-4 h-44 w-44 rounded-full"
        aria-hidden="true"
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-electric-400/50 bg-electric-400/15 text-electric-300">
            <Bot className="h-6 w-6" aria-hidden="true" />
          </div>

          {/* Futuristic Geometric Orbit Emblem */}
          <svg
            aria-hidden="true"
            viewBox="0 0 64 64"
            className="h-14 w-14 shrink-0 opacity-85"
            fill="none"
          >
            <circle
              cx="32"
              cy="32"
              r="24"
              stroke="rgba(0, 229, 255, 0.35)"
              strokeDasharray="4 4"
              strokeWidth="1.5"
            />
            <circle
              cx="32"
              cy="32"
              r="14"
              stroke="rgba(167, 139, 250, 0.55)"
              strokeWidth="1.5"
            />
            <circle cx="32" cy="32" r="4.5" fill="#00E5FF" />
            <circle cx="49" cy="15" r="2.5" fill="#A78BFA" />
          </svg>
        </div>

        <span className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-electric-300">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          <span>TRALIX AI Guidance</span>
        </span>

        <h2
          id="ai-tutor-card-heading"
          className="mt-1.5 font-display text-xl font-bold text-white"
        >
          Your Personal AI Tutor
        </h2>

        <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
          Understand difficult concepts, get step-by-step explanations and
          improve your knowledge.
        </p>
      </div>

      <div className="relative z-10 mt-6 pt-2">
        <Link
          href="/dashboard/ai-tutor"
          className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-electric-400/75 bg-gradient-to-r from-electric-400 via-electric-500 to-aura-500 px-5 py-2.5 text-sm font-bold text-obsidian-950 shadow-cyan-glow transition-all hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-300"
        >
          <span>Ask AI Tutor</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
