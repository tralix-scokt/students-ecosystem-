"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import { StudentsEcosystemCrest } from "@/components/book/StudentsEcosystemCrest";

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
      className={`preserve-3d backface-hidden absolute inset-x-0 top-0 z-30 h-[560px] book:inset-y-0 book:left-1/2 book:right-0 book:h-full book:w-1/2 ${
        isOpen ? "pointer-events-none select-none" : "pointer-events-auto"
      } ${reducedMotion && isOpen ? "opacity-0" : "opacity-100"}`}
    >
      <div className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-r-2xl rounded-l-[4px] border border-sky-300/40 bg-[#040814] px-6 py-7 xs:px-8 sm:px-10 sm:py-9 shadow-[18px_28px_68px_rgba(0,0,0,0.92)]">
        {/* Lower Cover Graduate & Earth Horizon */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[54%] overflow-hidden"
          aria-hidden="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/book-cover-horizon.jpg"
            alt=""
            className="h-full w-full object-cover object-[center_68%]"
          />
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#040814] via-[#040814]/80 to-transparent" />
        </div>

        {/* Top Crest & Students Ecosystem Title */}
        <div className="relative z-20 flex flex-col items-center text-center">
          <StudentsEcosystemCrest size="md" />
          <h1 className="mt-1 font-display leading-tight tracking-tight">
            <span className="block text-3xl font-extrabold text-white sm:text-4xl">
              Students
            </span>
            <span className="block bg-gradient-to-r from-[#00E5FF] via-[#38BDF8] to-[#D946EF] bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
              Ecosystem
            </span>
          </h1>
          <p className="mt-2 text-xs font-bold tracking-wider text-white sm:text-sm">
            Learn &bull; Grow &bull; Achieve
          </p>
          <p className="mt-1.5 text-xs italic text-slate-200/90">
            Your Complete Learning and Success Platform
          </p>
        </div>

        {/* Middle Continue Button */}
        <div className="relative z-30 my-auto flex justify-center pb-14">
          <button
            ref={enterButtonRef}
            type="button"
            tabIndex={isOpen ? -1 : 0}
            onClick={onOpen}
            className="group inline-flex min-h-[48px] min-w-[185px] items-center justify-center gap-2 rounded-full border border-electric-300/75 bg-gradient-to-r from-electric-400 via-sky-400 to-fuchsia-500 px-7 py-2.5 font-display text-sm font-extrabold tracking-wide text-obsidian-950 shadow-[0_0_30px_rgba(0,229,255,0.5)] transition-all hover:scale-[1.03] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <span>Continue</span>
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </button>
        </div>

        <div className="h-2 shrink-0" aria-hidden="true" />
      </div>
    </div>
  );
}
