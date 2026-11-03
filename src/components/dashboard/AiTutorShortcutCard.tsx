"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Bot, Camera, Mic, Sparkles } from "lucide-react";

export function AiTutorShortcutCard() {
  return (
    <section
      aria-labelledby="ai-tutor-card-heading"
      className="futuristic-hud-panel relative flex flex-col justify-between overflow-hidden rounded-3xl border border-electric-400/30 p-6 sm:p-7"
    >
      <div
        className="ambient-glow-cyan pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full"
        aria-hidden="true"
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-electric-400/45 bg-electric-400/12 text-electric-300">
              <Bot className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-electric-300">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                <span>TRALIX AI Guidance</span>
              </span>
              <p className="text-[11px] text-slate-400">
                Multimodal Neural Teacher
              </p>
            </div>
          </div>

          <svg
            aria-hidden="true"
            viewBox="0 0 64 64"
            className="h-12 w-12 shrink-0 opacity-85"
            fill="none"
          >
            <circle
              cx="32"
              cy="32"
              r="25"
              stroke="rgba(0, 229, 255, 0.32)"
              strokeDasharray="3 4"
              strokeWidth="1.25"
            />
            <circle
              cx="32"
              cy="32"
              r="14"
              stroke="rgba(167, 139, 250, 0.5)"
              strokeWidth="1.25"
            />
            <circle cx="32" cy="32" r="4" fill="#00E5FF" />
            <circle cx="50" cy="14" r="2.2" fill="#A78BFA" />
          </svg>
        </div>

        <h2
          id="ai-tutor-card-heading"
          className="mt-5 font-display text-xl font-bold tracking-tight text-white sm:text-2xl"
        >
          Your Personal AI Tutor
        </h2>

        <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
          Understand difficult concepts, get step-by-step explanations and
          improve your knowledge.
        </p>

        {/* Clean Futuristic Capability Chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-obsidian-950/75 px-3 py-1 text-[11px] font-medium text-slate-300">
            <Camera className="h-3 w-3 text-electric-400" aria-hidden="true" />
            <span>+ Photo Solver</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-obsidian-950/75 px-3 py-1 text-[11px] font-medium text-slate-300">
            <Mic className="h-3 w-3 text-aura-300" aria-hidden="true" />
            <span>Voice &amp; Visual Diagrams</span>
          </span>
        </div>
      </div>

      <div className="relative z-10 mt-6 pt-2">
        <Link
          href="/dashboard/ai-tutor"
          className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-electric-400/75 bg-gradient-to-r from-electric-400 via-electric-500 to-aura-500 px-5 py-2.5 text-sm font-bold text-obsidian-950 shadow-cyan-glow transition-all hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-300"
        >
          <span>Ask AI Tutor</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
