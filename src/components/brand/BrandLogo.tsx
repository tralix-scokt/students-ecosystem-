import React from "react";
import { BRAND_IDENTITY } from "@/data/ecosystemContent";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
  className?: string;
}

export function BrandLogo({
  size = "md",
  showSubtitle = true,
  className = "",
}: BrandLogoProps) {
  const iconDimensions = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  }[size];

  const titleClasses = {
    sm: "text-xs sm:text-sm tracking-[0.16em]",
    md: "text-sm sm:text-base tracking-[0.16em]",
    lg: "text-base sm:text-lg tracking-[0.18em]",
  }[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <div
        className={`relative flex shrink-0 items-center justify-center rounded-xl border border-electric-400/35 bg-gradient-to-br from-obsidian-800 via-obsidian-900 to-obsidian-950 shadow-cyan-glow ${iconDimensions}`}
        aria-hidden="true"
      >
        <div className="absolute -inset-px rounded-xl bg-gradient-to-tr from-aura-500/25 via-transparent to-electric-400/30 opacity-80" />
        <svg
          viewBox="0 0 36 36"
          fill="none"
          className="relative z-10 h-3/5 w-3/5"
        >
          {/* Open Tome Wings */}
          <path
            d="M18 10.5C14.8 8.4 10.4 8 6.5 9.2V25.6C10.4 24.4 14.8 24.8 18 27C21.2 24.8 25.6 24.4 29.5 25.6V9.2C25.6 8 21.2 8.4 18 10.5Z"
            stroke="url(#brand-cyan-violet)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Spine Axis & TRALIX AI Spark */}
          <path
            d="M18 10.5V27"
            stroke="#00E5FF"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="18" cy="7" r="2" fill="#00E5FF" />
          <defs>
            <linearGradient
              id="brand-cyan-violet"
              x1="6.5"
              y1="8.5"
              x2="29.5"
              y2="27"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#00E5FF" />
              <stop offset="55%" stopColor="#67F0FF" />
              <stop offset="100%" stopColor="#A78BFA" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="flex flex-col leading-none">
        <span
          className={`font-display font-bold uppercase text-white ${titleClasses}`}
        >
          {BRAND_IDENTITY.name}
        </span>
        {showSubtitle && (
          <span className="mt-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-slate-300/90">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-electric-400 shadow-[0_0_8px_#00E5FF]" />
            <span>{BRAND_IDENTITY.poweredBy}</span>
          </span>
        )}
      </div>
    </div>
  );
}
