import React from "react";

interface StudentsEcosystemCrestProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

/**
 * Official E-Learning Ecosystem brand crest (Graduation Cap + Student + Open Book + Orbital Swoosh)
 * rendered across the 3D Standing Book Cover (`/`), Spine, and Two-Page Open Book (`📖`).
 */
export function StudentsEcosystemCrest({
  size = "lg",
  className = "",
}: StudentsEcosystemCrestProps) {
  const dimensions =
    size === "xs"
      ? "h-9 w-12"
      : size === "sm"
        ? "h-14 w-20"
        : size === "md"
          ? "h-20 w-32 sm:h-24 sm:w-36"
          : "h-24 w-40 sm:h-28 sm:w-48";

  return (
    <div
      className={`relative inline-flex select-none items-center justify-center ${dimensions} ${className}`}
      aria-hidden="true"
    >
      <picture className="relative z-10 flex h-full w-full items-center justify-center">
        <source srcSet="/brand/logo-emblem-transparent.webp" type="image/webp" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo-emblem-transparent.png"
          alt=""
          className="h-full w-full object-contain drop-shadow-[0_6px_18px_rgba(0,229,255,0.34)]"
          decoding="async"
        />
      </picture>
    </div>
  );
}
