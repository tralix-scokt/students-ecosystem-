"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { StudentsEcosystemCrest } from "@/components/book/StudentsEcosystemCrest";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Full-screen 3D standing hardcover book entry experience (`/`).
 * Modeled directly on the Students Ecosystem hardcover guide:
 * - Standing 3D book with spine ("Students Ecosystem"), metallic bevels, and corner ribbons
 * - Crest emblem, "Students Ecosystem", "Learn • Grow • Achieve", subtitle
 * - Centered "Continue" button right in the middle of the book
 * - Graduate facing illuminated Earth & cyber skyline + 4 glowing neon study icons
 * - Pressing "Continue" smoothly opens into `/login` (the two-page open book 📖)
 */
export function StandingBookEntry() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [isOpening, setIsOpening] = useState(false);
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    try {
      routerRef.current.prefetch?.("/login");
    } catch {
      // Prefetch optional in test environments
    }
  }, []);

  const handleContinue = useCallback(() => {
    if (isOpening) return;
    setIsOpening(true);
    if (reducedMotion) {
      routerRef.current.push("/login");
      return;
    }
    window.setTimeout(() => {
      routerRef.current.push("/login");
    }, 340);
  }, [isOpening, reducedMotion]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (
        event.key === "Enter" &&
        tag !== "button" &&
        tag !== "a" &&
        tag !== "input"
      ) {
        event.preventDefault();
        handleContinue();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleContinue]);

  return (
    <main
      id="main-content"
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#020510] px-4 py-6 sm:py-10"
    >
      {/* Studio Ambient Bokeh Lighting (Royal Blue, Cyan & Violet-Magenta) */}
      <div
        className="pointer-events-none fixed inset-0 ecosystem-grid-bg opacity-65"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed left-1/2 top-1/4 h-[460px] w-[520px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-blue-600/20 blur-[130px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed bottom-12 left-1/2 h-[380px] w-[620px] -translate-x-1/2 rounded-full bg-electric-400/15 blur-[135px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed right-1/4 top-1/3 h-[340px] w-[340px] rounded-full bg-fuchsia-600/15 blur-[130px]"
        aria-hidden="true"
      />

      {/* 3D Standing Book Scene */}
      <div className="book-perspective relative z-10 flex flex-col items-center">
        <div
          style={{
            transformStyle: "preserve-3d",
            transform: isOpening
              ? "rotateY(-68deg) scale(1.03)"
              : "rotateY(-11deg) rotateX(2deg)",
            transition: reducedMotion
              ? "opacity 140ms ease"
              : "transform 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 340ms ease",
          }}
          className={`relative flex select-none items-stretch ${
            !reducedMotion && !isOpening ? "animate-book-float" : ""
          } ${isOpening ? "opacity-90" : "opacity-100"}`}
        >
          {/* 3D Left Hardcover Spine */}
          <div
            aria-hidden="true"
            style={{
              transformOrigin: "right center",
              transform: "rotateY(-62deg)",
            }}
            className="relative z-20 -mr-[1px] flex w-10 shrink-0 flex-col items-center justify-between overflow-hidden rounded-l-lg border-y border-l border-sky-300/35 bg-gradient-to-r from-[#020612] via-[#07122b] to-[#0e1f45] py-5 shadow-[-14px_20px_38px_rgba(0,0,0,0.92)] sm:w-12"
          >
            {/* Glossy Spine Specular Highlight */}
            <div className="pointer-events-none absolute inset-y-0 right-1 w-[2px] bg-gradient-to-b from-white/75 via-sky-200/45 to-electric-400/60" />

            {/* Miniature Spine Crest */}
            <div className="mt-2 scale-90">
              <StudentsEcosystemCrest size="xs" />
            </div>

            {/* Vertical Spine Title: Students Ecosystem */}
            <div className="my-auto flex items-center justify-center py-2">
              <span className="font-display text-sm font-extrabold tracking-wide [writing-mode:vertical-rl] rotate-180 sm:text-base">
                <span className="text-white">Students </span>
                <span className="bg-gradient-to-b from-electric-300 to-fuchsia-400 bg-clip-text text-transparent">
                  Ecosystem
                </span>
              </span>
            </div>

            {/* Bottom Spine Ribbon Stripes */}
            <div className="relative h-10 w-full overflow-hidden">
              <div className="absolute -bottom-2 -left-2 right-0 h-5 rotate-[28deg] bg-gradient-to-r from-fuchsia-500/80 to-electric-400/80" />
              <div className="absolute bottom-2 -left-2 right-0 h-2.5 rotate-[28deg] bg-electric-400/70" />
            </div>
          </div>

          {/* Main Standing Front Hardcover Board */}
          <div className="relative z-30 flex h-[590px] w-[305px] flex-col justify-between overflow-hidden rounded-r-[18px] rounded-l-[3px] border border-sky-300/40 bg-[#040814] shadow-[18px_28px_68px_rgba(0,0,0,0.92),0_0_50px_-10px_rgba(0,229,255,0.28)] xs:h-[630px] xs:w-[334px] sm:h-[675px] sm:w-[368px]">
            {/* Metallic Silver-Cyan Top & Right Rim Highlights */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-30 h-[2px] bg-gradient-to-r from-white/85 via-sky-200/75 to-fuchsia-300/70"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-y-0 left-0 z-30 w-[5px] bg-gradient-to-r from-white/65 via-sky-200/20 to-transparent"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0 z-30 w-[2px] bg-gradient-to-b from-sky-300/70 via-electric-400/50 to-fuchsia-400/65"
              aria-hidden="true"
            />

            {/* Top-Right Sweeping Neon Cyan & Violet-Magenta Corner Ribbons */}
            <svg
              viewBox="0 0 180 180"
              fill="none"
              aria-hidden="true"
              className="pointer-events-none absolute right-0 top-0 z-20 h-36 w-36 sm:h-40 sm:w-40"
            >
              <defs>
                <linearGradient id="ribbon-a" x1="40" y1="0" x2="180" y2="140" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#0284C7" />
                  <stop offset="50%" stopColor="#38BDF8" />
                  <stop offset="100%" stopColor="#C026D3" />
                </linearGradient>
                <linearGradient id="ribbon-b" x1="80" y1="0" x2="180" y2="105" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#38BDF8" />
                  <stop offset="50%" stopColor="#A855F7" />
                  <stop offset="100%" stopColor="#EC4899" />
                </linearGradient>
              </defs>
              <path
                d="M66 0C106 32 146 76 180 132V98C152 56 120 24 92 0H66Z"
                fill="url(#ribbon-a)"
                opacity="0.92"
              />
              <path
                d="M108 0C136 24 160 54 180 88V52C164 31 146 13 130 0H108Z"
                fill="url(#ribbon-b)"
                opacity="0.95"
              />
            </svg>

            {/* Lower Half Artwork: Graduate Facing Illuminated Earth & Cyber Skyline */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[56%] overflow-hidden"
              aria-hidden="true"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/book-cover-horizon.jpg"
                alt=""
                className="h-full w-full object-cover object-[center_68%] brightness-105 contrast-105"
              />
              {/* Smooth Seamless Top Fade into #040814 Upper Cover */}
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#040814] via-[#040814]/80 to-transparent" />
              {/* Bottom Electric Horizon Glow */}
              <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-sky-500/25 to-transparent" />

              {/* 4 Neon-Cyan Holographic Study Icons Flanking the Graduate */}
              {/* Top-Left: Glowing Open Book */}
              <svg
                viewBox="0 0 48 48"
                fill="none"
                className="absolute left-6 top-16 h-10 w-10 text-electric-300 drop-shadow-[0_0_10px_rgba(0,229,255,0.85)] sm:left-8 sm:top-20 sm:h-11 sm:w-11"
              >
                <path
                  d="M24 13C19 10 12 9.5 7 11.5V35C12 33 19 33.5 24 36.5C29 33.5 36 33 41 35V11.5C36 9.5 29 10 24 13Z"
                  stroke="#38BDF8"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                <path d="M24 13V36.5" stroke="#67E8F9" strokeWidth="2" />
                <path d="M12 17H19M12 22H19M12 27H18" stroke="#67E8F9" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M29 17H36M29 22H36M30 27H36" stroke="#67E8F9" strokeWidth="1.7" strokeLinecap="round" />
              </svg>

              {/* Bottom-Left: Glowing Wireframe Globe */}
              <svg
                viewBox="0 0 48 48"
                fill="none"
                className="absolute bottom-20 left-6 h-10 w-10 text-electric-300 drop-shadow-[0_0_10px_rgba(0,229,255,0.85)] sm:bottom-24 sm:left-8 sm:h-11 sm:w-11"
              >
                <circle cx="24" cy="24" r="15" stroke="#38BDF8" strokeWidth="2.2" />
                <ellipse cx="24" cy="24" rx="7.5" ry="15" stroke="#67E8F9" strokeWidth="1.8" />
                <path d="M9.5 24H38.5M11.5 17.5H36.5M11.5 30.5H36.5" stroke="#67E8F9" strokeWidth="1.6" />
              </svg>

              {/* Top-Right: Glowing Laptop */}
              <svg
                viewBox="0 0 48 48"
                fill="none"
                className="absolute right-6 top-16 h-10 w-10 text-electric-300 drop-shadow-[0_0_10px_rgba(0,229,255,0.85)] sm:right-8 sm:top-20 sm:h-11 sm:w-11"
              >
                <rect x="10" y="12" width="28" height="19" rx="2.5" stroke="#38BDF8" strokeWidth="2.2" />
                <path d="M6 34H42L39 38H9L6 34Z" stroke="#67E8F9" strokeWidth="2" strokeLinejoin="round" />
              </svg>

              {/* Bottom-Right: Glowing Lightbulb */}
              <svg
                viewBox="0 0 48 48"
                fill="none"
                className="absolute bottom-20 right-6 h-10 w-10 text-electric-300 drop-shadow-[0_0_10px_rgba(0,229,255,0.85)] sm:bottom-24 sm:right-8 sm:h-11 sm:w-11"
              >
                <path
                  d="M18 31C15.2 28.6 13.5 25.1 13.5 21C13.5 15.2 18.2 10.5 24 10.5C29.8 10.5 34.5 15.2 34.5 21C34.5 25.1 32.8 28.6 30 31V34.5H18V31Z"
                  stroke="#38BDF8"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                <path d="M19.5 38H28.5M21 41.5H27" stroke="#67E8F9" strokeWidth="2" strokeLinecap="round" />
                <path d="M24 23V31M21 24L24 27L27 24" stroke="#67E8F9" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* TOP COVER SECTION: Crest, Title & Tagline */}
            <div className="relative z-20 flex flex-col items-center px-6 pt-6 text-center sm:px-8 sm:pt-7">
              <StudentsEcosystemCrest size="lg" />

              <h1 className="mt-1 font-display leading-[1.03] tracking-tight">
                <span className="block bg-gradient-to-b from-white via-slate-100 to-slate-300 bg-clip-text text-[40px] font-extrabold text-transparent drop-shadow-[0_2px_10px_rgba(255,255,255,0.18)] xs:text-[44px] sm:text-[50px]">
                  Students
                </span>
                <span className="block bg-gradient-to-r from-[#00E5FF] via-[#38BDF8] to-[#D946EF] bg-clip-text text-[38px] font-extrabold text-transparent drop-shadow-[0_4px_16px_rgba(56,189,248,0.28)] xs:text-[42px] sm:text-[47px]">
                  Ecosystem
                </span>
              </h1>

              <p className="mt-2.5 text-sm font-bold tracking-[0.06em] text-white sm:text-[15px]">
                Learn &bull; Grow &bull; Achieve
              </p>

              <p className="mt-2 max-w-[235px] text-xs italic leading-snug text-slate-200/95 sm:text-[13px]">
                Your Complete Learning
                <br />
                and Success Platform
              </p>
            </div>

            {/* MIDDLE OF THE BOOK: Primary "Continue" Button */}
            <div className="relative z-30 my-auto flex flex-col items-center justify-center px-7 pb-16 sm:pb-20">
              <button
                type="button"
                onClick={handleContinue}
                className="group relative inline-flex min-h-[50px] min-w-[190px] items-center justify-center gap-2.5 overflow-hidden rounded-full border border-electric-300/75 bg-gradient-to-r from-electric-400 via-sky-400 to-fuchsia-500 px-8 py-3 font-display text-sm font-extrabold tracking-wide text-obsidian-950 shadow-[0_0_32px_rgba(0,229,255,0.55),0_10px_24px_rgba(0,0,0,0.65)] transition-all duration-300 hover:scale-[1.03] hover:brightness-110 hover:shadow-[0_0_44px_rgba(0,229,255,0.8)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-950 active:scale-[0.98] sm:min-w-[210px] sm:text-base"
              >
                <span>Continue</span>
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </button>
            </div>

            {/* Spacer so justify-between anchors bottom cleanly */}
            <div className="h-4 shrink-0" aria-hidden="true" />
          </div>

          {/* 3D Stacked Paper Fore-Edge & Back Cover Rim on Right */}
          <div
            aria-hidden="true"
            className="paper-fore-edge-vertical my-2 hidden w-2.5 shrink-0 rounded-r-sm opacity-90 xs:block"
          />
          <div
            aria-hidden="true"
            className="my-2.5 hidden w-1.5 shrink-0 rounded-r-md border-y border-r border-fuchsia-400/35 bg-[#060d20] xs:block"
          />
        </div>

        {/* Glossy Dark Studio Tabletop Reflection Under the Standing Book */}
        <div
          aria-hidden="true"
          className="pointer-events-none mt-2 h-6 w-[88%] rounded-full bg-gradient-to-r from-fuchsia-500/25 via-electric-400/45 to-blue-500/25 blur-xl"
        />
      </div>
    </main>
  );
}
