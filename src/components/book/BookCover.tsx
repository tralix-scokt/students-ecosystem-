"use client";

import React from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { BOOK_COPY, BRAND_IDENTITY } from "@/data/ecosystemContent";

interface BookCoverProps {
  isOpen: boolean;
  reducedMotion: boolean;
  onOpen: () => void;
  enterButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

export function BookCover({
  isOpen,
  reducedMotion,
  onOpen,
  enterButtonRef,
}: BookCoverProps) {
  return (
    <div
      aria-hidden={isOpen}
      style={{
        transformOrigin: "left center",
        transform: isOpen
          ? "translateZ(3px) rotateY(-180deg)"
          : "translateZ(20px) rotateY(0deg)",
        transition: reducedMotion
          ? "opacity 180ms ease"
          : "transform 1050ms cubic-bezier(0.22, 1, 0.36, 1), opacity 350ms ease",
      }}
      className={`preserve-3d backface-hidden absolute inset-x-0 top-0 z-30 h-[540px] xs:h-[560px] book:inset-y-0 book:left-1/2 book:right-0 book:h-full book:w-1/2 ${
        isOpen ? "pointer-events-none select-none" : "pointer-events-auto"
      } ${reducedMotion && isOpen ? "opacity-0" : "opacity-100"}`}
    >
      {/* Front Hardcover Board */}
      <div className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-r-2xl rounded-l-[4px] border border-electric-400/35 hardcover-surface px-6 py-8 xs:px-8 sm:px-10 sm:py-10">
        {/* Fine Leatherette Grain */}
        <div
          className="pointer-events-none absolute inset-0 hardcover-grain opacity-85"
          aria-hidden="true"
        />

        {/* Cyan & Violet Studio Rim-Light Overlays */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-[2px] bg-gradient-to-b from-electric-300/80 via-electric-400/50 to-aura-400/75 shadow-[0_0_16px_rgba(0,229,255,0.8)]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-aura-400/55 via-electric-300/75 to-electric-400/80"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[1.5px] bg-gradient-to-r from-aura-500/80 via-aura-400/45 to-electric-400/60"
          aria-hidden="true"
        />

        {/* Bookmaker's Pressed Hinge Groove Along Left Spine */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-5 hardcover-hinge-groove"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-y-3 left-5 w-px bg-gradient-to-b from-transparent via-electric-300/25 to-transparent"
          aria-hidden="true"
        />

        {/* Inset Debossed Foil Frame */}
        <div
          className="pointer-events-none absolute inset-y-5 left-8 right-5 rounded-r-xl rounded-l-sm border border-electric-400/20 shadow-[inset_0_0_28px_rgba(0,229,255,0.06)]"
          aria-hidden="true"
        />

        {/* Corner Filigree Accents */}
        <span
          className="pointer-events-none absolute right-7 top-7 h-3 w-3 border-r-2 border-t-2 border-electric-400/60"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute bottom-7 right-7 h-3 w-3 border-b-2 border-r-2 border-aura-400/60"
          aria-hidden="true"
        />

        {/* Top Emblem & Product Branding */}
        <div className="relative z-10 pl-3 text-center">
          <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-electric-400/30 bg-obsidian-950/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-electric-300 shadow-[0_0_18px_-4px_rgba(0,229,255,0.45)]">
            <Sparkles className="h-3 w-3 text-electric-400" aria-hidden="true" />
            <span>{BRAND_IDENTITY.poweredBy}</span>
          </div>

          <p className="mt-5 font-display text-sm font-bold uppercase tracking-[0.26em] text-white sm:text-base">
            {BOOK_COPY.cover.brand}
          </p>

          <div
            className="mx-auto mt-3 h-px w-24 bg-gradient-to-r from-transparent via-electric-400/70 to-transparent"
            aria-hidden="true"
          />
        </div>

        {/* Center Sculpted Crest, Cover Title & Literary Quote */}
        <div className="relative z-10 my-auto flex flex-col items-center pl-3 text-center">
          {/* Illuminated Geometric Crest */}
          <div
            className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-electric-400/40 bg-obsidian-950/90 shadow-cyan-glow sm:h-20 sm:w-20"
            aria-hidden="true"
          >
            <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-aura-500/25 to-electric-400/25 blur-md" />
            <svg
              viewBox="0 0 44 44"
              fill="none"
              className="relative z-10 h-9 w-9 sm:h-11 sm:w-11"
            >
              <path
                d="M22 12C18 9.4 12.6 9 7.8 10.5V31.2C12.6 29.7 18 30.1 22 32.8C26 30.1 31.4 29.7 36.2 31.2V10.5C31.4 9 26 9.4 22 12Z"
                stroke="url(#cover-emblem-grad)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M22 12V32.8"
                stroke="#00E5FF"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <circle cx="22" cy="7.5" r="2.2" fill="#00E5FF" />
              <defs>
                <linearGradient
                  id="cover-emblem-grad"
                  x1="7.8"
                  y1="9.5"
                  x2="36.2"
                  y2="32.8"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#00E5FF" />
                  <stop offset="55%" stopColor="#67F0FF" />
                  <stop offset="100%" stopColor="#A78BFA" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <h1 className="max-w-xs font-display text-xl font-bold uppercase leading-snug tracking-[0.12em] text-white xs:text-2xl sm:max-w-sm sm:text-[26px]">
            {BOOK_COPY.cover.headline}
          </h1>

          <p className="mt-4 max-w-xs font-serif text-lg italic leading-relaxed text-slate-200/95 sm:text-xl">
            {BOOK_COPY.cover.quote}
          </p>
        </div>

        {/* Bottom Interactive ENTER Trigger */}
        <div className="relative z-10 pl-3 text-center">
          <button
            ref={enterButtonRef}
            type="button"
            tabIndex={isOpen ? -1 : 0}
            onClick={onOpen}
            className="group relative inline-flex min-h-[50px] w-full max-w-xs items-center justify-center gap-2.5 overflow-hidden rounded-xl border border-electric-400/65 bg-gradient-to-r from-electric-400/20 via-electric-500/25 to-aura-500/25 px-5 py-3 font-display text-xs font-bold uppercase tracking-[0.16em] text-white shadow-cyan-glow transition-all duration-300 hover:border-electric-300 hover:from-electric-400/30 hover:to-aura-500/35 hover:shadow-[0_0_38px_-4px_rgba(0,229,255,0.68)] focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-300 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-950 active:scale-[0.99] sm:text-[13px]"
          >
            <span>{BOOK_COPY.cover.cta}</span>
            <ArrowRight
              className="h-4 w-4 shrink-0 text-electric-300 transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </button>

          <p className="mt-2.5 text-[11px] tracking-wider text-slate-400">
            Click or press <kbd className="rounded border border-slate-700 bg-obsidian-900 px-1.5 py-0.5 font-sans text-[10px] text-electric-300">Enter</kbd> to open hardcover
          </p>
        </div>
      </div>
    </div>
  );
}
