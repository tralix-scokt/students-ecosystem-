import React from "react";
import { BRAND_IDENTITY } from "@/data/ecosystemContent";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
  iconOnly?: boolean;
  className?: string;
}

export function BrandLogo({
  size = "md",
  showSubtitle = true,
  iconOnly = false,
  className = "",
}: BrandLogoProps) {
  const iconDimensions = {
    sm: "h-9 w-9",
    md: "h-11 w-11",
    lg: "h-14 w-14",
  }[size];

  const titleClasses = {
    sm: "text-[11px] sm:text-sm tracking-[0.09em] sm:tracking-[0.14em]",
    md: "text-sm sm:text-base tracking-[0.12em] sm:tracking-[0.15em]",
    lg: "text-base sm:text-lg tracking-[0.14em] sm:tracking-[0.17em]",
  }[size];

  return (
    <div
      className={`inline-flex items-center gap-2.5 sm:gap-3 select-none ${className}`}
    >
      <div
        className={`theme-preserve-dark relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-electric-400/45 bg-[#020614] shadow-cyan-glow ${iconDimensions}`}
        aria-hidden={iconOnly ? undefined : "true"}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo-icon-192.png"
          alt={iconOnly ? BRAND_IDENTITY.name : ""}
          className="h-full w-full object-contain p-0.5"
          decoding="async"
        />
      </div>

      {!iconOnly && (
        <div className="min-w-0 flex flex-col leading-tight">
          <span
            className={`font-display font-bold uppercase text-white ${titleClasses}`}
          >
            {BRAND_IDENTITY.name}
          </span>
          {showSubtitle && (
            <span className="mt-1 hidden items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300/90 sm:flex">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-electric-400 shadow-[0_0_8px_#00E5FF]" />
              <span>{BRAND_IDENTITY.poweredBy}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
