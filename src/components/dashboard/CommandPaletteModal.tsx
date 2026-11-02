"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Command,
  Moon,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { DASHBOARD_NAV_ITEMS } from "@/data/dashboardNavigation";
import { searchAvailableDashboardContent } from "@/lib/dashboard/examPathways";
import {
  applyEcosystemTheme,
  type EcosystemTheme,
} from "@/lib/theme/themePreference";
import type {
  OngoingCourseItem,
  PublishedLearningCourse,
} from "@/types/dashboard";
import type { StudentAcademicProfile } from "@/types/onboarding";

interface CommandPaletteModalProps {
  open: boolean;
  onClose: () => void;
  publishedCourses: PublishedLearningCourse[];
  ongoingCourses: OngoingCourseItem[];
  academicProfile: StudentAcademicProfile | null;
  isAdmin?: boolean;
}

interface PaletteCommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: "Workspace" | "Appearance" | "Learning";
  icon: React.ReactNode;
  run: () => void;
}

export function CommandPaletteModal({
  open,
  onClose,
  publishedCourses,
  ongoingCourses,
  academicProfile,
  isAdmin = false,
}: CommandPaletteModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const commands = useMemo<PaletteCommandItem[]>(() => {
    const q = query.trim().toLowerCase();

    const adminItems: PaletteCommandItem[] = isAdmin
      ? [
          {
            id: "nav-admin-portal",
            title: "Open Admin Governance Portal",
            subtitle: "/admin",
            category: "Workspace",
            icon: <ShieldCheck className="h-4 w-4 text-electric-400" />,
            run: () => {
              onClose();
              router.push("/admin");
            },
          },
        ]
      : [];

    const navItems: PaletteCommandItem[] = DASHBOARD_NAV_ITEMS.map((item) => ({
      id: `nav-${item.id}`,
      title: `Go to ${item.label}`,
      subtitle: item.href,
      category: "Workspace",
      icon: <ArrowRight className="h-4 w-4 text-electric-400" />,
      run: () => {
        onClose();
        router.push(item.href);
      },
    }));

    const switchTheme = (theme: EcosystemTheme, label: string) => ({
      id: `theme-${theme}`,
      title: `Switch Theme: ${label}`,
      subtitle: "Apply instantly across Students Ecosystem",
      category: "Appearance" as const,
      icon:
        theme === "light" ? (
          <Sun className="h-4 w-4 text-amber-400" />
        ) : theme === "dark" ? (
          <Moon className="h-4 w-4 text-slate-300" />
        ) : (
          <Sparkles className="h-4 w-4 text-electric-400" />
        ),
      run: () => {
        applyEcosystemTheme(theme);
        onClose();
      },
    });

    const themeItems: PaletteCommandItem[] = [
      switchTheme("default", "Default (Blue Neon)"),
      switchTheme("dark", "Dark"),
      switchTheme("light", "Light"),
    ];

    const dynamicHits = q
      ? searchAvailableDashboardContent(query, {
          publishedCourses,
          ongoingCourses,
          academicProfile,
        }).map((hit) => ({
          id: `content-${hit.id}`,
          title: hit.title,
          subtitle: hit.subtitle,
          category: "Learning" as const,
          icon: <BookOpen className="h-4 w-4 text-aura-400" />,
          run: () => {
            onClose();
            router.push(hit.href);
          },
        }))
      : publishedCourses.slice(0, 4).map((c) => ({
          id: `course-${c.id}`,
          title: c.title,
          subtitle: `${c.subject} • Open Course`,
          category: "Learning" as const,
          icon: <BookOpen className="h-4 w-4 text-aura-400" />,
          run: () => {
            onClose();
            router.push(`/dashboard/learn/${c.slug}`);
          },
        }));

    const all = [...adminItems, ...navItems, ...themeItems, ...dynamicHits];
    if (!q) return all;
    return all.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [
    academicProfile,
    isAdmin,
    onClose,
    ongoingCourses,
    publishedCourses,
    query,
    router,
  ]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-16 sm:pt-24"
      role="dialog"
      aria-modal="true"
      aria-label="Quick command palette"
    >
      <div
        className="fixed inset-0 bg-obsidian-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-slate-700/90 bg-obsidian-900 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-electric-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) =>
                  commands.length > 0 ? (i + 1) % commands.length : 0
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) =>
                  commands.length > 0
                    ? (i - 1 + commands.length) % commands.length
                    : 0
                );
              } else if (e.key === "Enter" && commands[activeIndex]) {
                e.preventDefault();
                commands[activeIndex].run();
              }
            }}
            placeholder="Jump to AI Tutor, Exams, Notes, Courses, or switch Theme..."
            aria-label="Command palette search"
            className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette"
            className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {commands.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              No matching commands or study resources found.
            </p>
          ) : (
            <ul className="space-y-1">
              {commands.map((cmd, idx) => {
                const isSelected = idx === activeIndex;
                return (
                  <li key={cmd.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={cmd.run}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        isSelected
                          ? "bg-electric-500/15 text-white"
                          : "text-slate-300 hover:bg-obsidian-850"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-obsidian-950">
                          {cmd.icon}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-white">
                            {cmd.title}
                          </p>
                          <p className="truncate text-[11px] text-slate-400">
                            {cmd.subtitle}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-md border border-white/10 bg-obsidian-950/75 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {cmd.category}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/10 bg-obsidian-950/70 px-4 py-2 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Command className="h-3 w-3 text-electric-400" />
            <span>Press ↑↓ to navigate • Enter to open</span>
          </span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
}
