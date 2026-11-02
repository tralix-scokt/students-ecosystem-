"use client";

import React, { useState } from "react";
import { BookOpen } from "lucide-react";
import { StudentsEcosystemCrest } from "@/components/book/StudentsEcosystemCrest";
import type { BookSpreadMode } from "@/types/auth";

interface EducationQuoteItem {
  quote: string;
  author: string;
  note: string;
}

const EDUCATION_QUOTES: EducationQuoteItem[] = [
  {
    quote:
      "“Education is the most powerful weapon which you can use to change the world.”",
    author: "Nelson Mandela",
    note: "Learn • Grow • Achieve",
  },
  {
    quote: "“An investment in knowledge pays the best interest.”",
    author: "Benjamin Franklin",
    note: "Students Ecosystem",
  },
  {
    quote:
      "“Education is the passport to the future, for tomorrow belongs to those who prepare for it today.”",
    author: "Malcolm X",
    note: "Purposeful Preparation",
  },
  {
    quote:
      "“The beautiful thing about learning is that nobody can take it away from you.”",
    author: "B.B. King",
    note: "Lifelong Mastery",
  },
];

interface BookEducationQuotePageProps {
  mode?: BookSpreadMode;
}

/**
 * Left page of the open two-page book (📖):
 * Displays a timeless quote inspired by education.
 */
export function BookEducationQuotePage({
  mode = "login",
}: BookEducationQuotePageProps) {
  const defaultIndex = mode === "register" ? 1 : mode === "recovery" ? 2 : 0;
  const [customIndex, setCustomIndex] = useState<number | null>(null);
  const activeIndex = customIndex ?? defaultIndex;
  const current = EDUCATION_QUOTES[activeIndex] ?? EDUCATION_QUOTES[0];

  return (
    <div className="flex h-full flex-col justify-between">
      {/* Top Book Folio Running Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <span className="inline-flex items-center gap-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-electric-300">
          <BookOpen className="h-3.5 w-3.5 text-electric-400" aria-hidden="true" />
          <span>Students Ecosystem</span>
        </span>
        <span className="font-serif text-xs italic text-slate-400">
          Page I
        </span>
      </div>

      {/* Center Illuminated Educational Quote */}
      <div className="my-auto flex flex-col items-center py-6 text-center sm:py-10">
        <StudentsEcosystemCrest size="md" />

        <div
          className="my-5 flex w-40 items-center justify-center gap-2.5"
          aria-hidden="true"
        >
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-electric-400/60" />
          <span className="h-2 w-2 rotate-45 border border-electric-400 bg-electric-400/30" />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-fuchsia-400/60" />
        </div>

        <blockquote className="relative max-w-md px-2 sm:px-4">
          <p className="font-serif text-xl italic leading-relaxed text-white sm:text-[25px] sm:leading-[1.55]">
            {current.quote}
          </p>
          <footer className="mt-5">
            <cite className="not-italic font-display text-xs font-bold uppercase tracking-[0.2em] text-electric-300 sm:text-sm">
              — {current.author}
            </cite>
          </footer>
        </blockquote>

        {/* Subtle Quote Page Dots */}
        <div
          className="mt-7 flex items-center justify-center gap-2"
          role="group"
          aria-label="Select educational quote"
        >
          {EDUCATION_QUOTES.map((item, idx) => {
            const selected = idx === activeIndex;
            return (
              <button
                key={item.author}
                type="button"
                onClick={() => setCustomIndex(idx)}
                aria-label={`Quote by ${item.author}`}
                aria-pressed={selected}
                className={`h-2 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 ${
                  selected
                    ? "w-6 bg-gradient-to-r from-electric-400 to-fuchsia-400"
                    : "w-2 bg-slate-700 hover:bg-slate-500"
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Bottom Book Folio Footer */}
      <div className="border-t border-slate-800/80 pt-4">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="font-medium tracking-wider text-slate-300/90">
            {current.note}
          </span>
          <span className="font-serif italic text-slate-500">01</span>
        </div>
      </div>
    </div>
  );
}
