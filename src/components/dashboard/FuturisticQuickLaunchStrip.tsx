"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Bot,
  FileText,
  GraduationCap,
} from "lucide-react";

const QUICK_LAUNCH_MODULES = [
  {
    id: "ai-vision",
    badge: "NEURAL AI",
    title: "AI Photo & Voice Tutor",
    subtitle: "Snap homework or ask step-by-step",
    href: "/dashboard/ai-tutor",
    icon: Bot,
    accentClass:
      "border-electric-400/35 bg-electric-400/12 text-electric-300 group-hover:border-electric-400/65",
  },
  {
    id: "cbt-simulator",
    badge: "CBT ARENA",
    title: "Past Questions & Mock",
    subtitle: "JAMB • WAEC • NECO timed drills",
    href: "/dashboard/exams",
    icon: GraduationCap,
    accentClass:
      "border-aura-400/35 bg-aura-500/15 text-aura-300 group-hover:border-aura-400/65",
  },
  {
    id: "topic-library",
    badge: "CURRICULUM",
    title: "Structured Courses",
    subtitle: "Interactive lessons & visual diagrams",
    href: "/dashboard/learn",
    icon: BookOpen,
    accentClass:
      "border-emerald-400/35 bg-emerald-500/12 text-emerald-300 group-hover:border-emerald-400/65",
  },
  {
    id: "study-vault",
    badge: "STUDY VAULT",
    title: "Smart Notes & Cards",
    subtitle: "Saved insights & instant review",
    href: "/dashboard/notes",
    icon: FileText,
    accentClass:
      "border-electric-400/30 bg-electric-400/10 text-electric-300 group-hover:border-electric-400/60",
  },
] as const;

export function FuturisticQuickLaunchStrip() {
  return (
    <section aria-label="Quick workspace launchpad">
      <div className="mb-3 flex items-center justify-between px-0.5">
        <span className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Workspace Launchpad
        </span>
        <span className="text-[11px] text-slate-400">Instant access</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {QUICK_LAUNCH_MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link
              key={mod.id}
              href={mod.href}
              className="futuristic-tile group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-electric-400/45 sm:p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${mod.accentClass}`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>

                <ArrowUpRight
                  className="h-4 w-4 text-slate-500 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-electric-300"
                  aria-hidden="true"
                />
              </div>

              <div className="mt-4">
                <span className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-electric-300/90">
                  {mod.badge}
                </span>
                <p className="mt-1 font-display text-sm font-bold leading-snug text-white sm:text-[15px]">
                  {mod.title}
                </p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-400 sm:text-xs">
                  {mod.subtitle}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
