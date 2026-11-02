import React from "react";

interface StudentsEcosystemCrestProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

/**
 * Vector emblem modeled after the Students Ecosystem book crest:
 * - White/ice-blue 3D mortarboard graduation cap with tassel
 * - Glowing blue open book beneath the cap
 * - Sweeping cyan-to-violet/magenta orbital swoosh ring
 * - Glowing pink/magenta 5-point star accent on the upper left
 */
export function StudentsEcosystemCrest({
  size = "lg",
  className = "",
}: StudentsEcosystemCrestProps) {
  const dimensions =
    size === "xs"
      ? "h-8 w-10"
      : size === "sm"
        ? "h-12 w-16"
        : size === "md"
          ? "h-16 w-22"
          : "h-20 w-28 sm:h-24 sm:w-32";

  return (
    <div
      className={`relative inline-flex select-none items-center justify-center ${dimensions} ${className}`}
      aria-hidden="true"
    >
      <div className="pointer-events-none absolute inset-1 rounded-full bg-gradient-to-tr from-electric-400/20 via-sky-500/15 to-fuchsia-500/20 blur-xl" />
      <svg
        viewBox="0 0 160 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 h-full w-full drop-shadow-[0_6px_18px_rgba(0,229,255,0.28)]"
      >
        <defs>
          <linearGradient id="se-cap-top" x1="42" y1="10" x2="118" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#E0F2FE" />
            <stop offset="100%" stopColor="#93C5FD" />
          </linearGradient>
          <linearGradient id="se-cap-base" x1="60" y1="30" x2="100" y2="52" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="50%" stopColor="#BAE6FD" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
          <linearGradient id="se-book-left" x1="42" y1="54" x2="80" y2="92" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="55%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </linearGradient>
          <linearGradient id="se-book-right" x1="80" y1="54" x2="118" y2="92" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#67E8F9" />
            <stop offset="50%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="se-orbit" x1="16" y1="68" x2="144" y2="86" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="35%" stopColor="#6366F1" />
            <stop offset="70%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#D946EF" />
          </linearGradient>
          <linearGradient id="se-star" x1="34" y1="24" x2="50" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F472B6" />
            <stop offset="100%" stopColor="#C084FC" />
          </linearGradient>
        </defs>

        {/* Back Half of Orbital Ring */}
        <path
          d="M36 66C24 72 22 83 38 91C58 101 104 101 124 89C138 81 136 70 120 64"
          stroke="url(#se-orbit)"
          strokeWidth="4.5"
          strokeLinecap="round"
          opacity="0.45"
        />

        {/* Pink/Magenta 5-Point Star on Upper Left */}
        <path
          d="M42 23L44.4 28.4L50.2 29L45.8 32.9L47 38.6L42 35.6L37 38.6L38.2 32.9L33.8 29L39.6 28.4L42 23Z"
          fill="url(#se-star)"
        />

        {/* Open Book Base Pages */}
        <path
          d="M80 61C69 53 54 51 42 55V87C54 83 69 85 80 94V61Z"
          fill="url(#se-book-left)"
          stroke="#7DD3FC"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M80 61C91 53 106 51 118 55V87C106 83 91 85 80 94V61Z"
          fill="url(#se-book-right)"
          stroke="#7DD3FC"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        {/* Inner White/Cyan Fanning Sheets */}
        <path
          d="M80 63C70 56 57 54.5 46 57.5"
          stroke="#E0F2FE"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M80 63C90 56 103 54.5 114 57.5"
          stroke="#E0F2FE"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M80 60V94" stroke="#E0F2FE" strokeWidth="2.2" strokeLinecap="round" />

        {/* Graduation Mortarboard Skullcap */}
        <path
          d="M62 32V43C62 47.5 70 52 80 52C90 52 98 47.5 98 43V32L80 39L62 32Z"
          fill="url(#se-cap-base)"
        />
        {/* Mortarboard Diamond Top */}
        <path
          d="M80 12L116 25.5L80 38.5L44 25.5L80 12Z"
          fill="url(#se-cap-top)"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Tassel */}
        <path
          d="M104 26.5V40"
          stroke="#BAE6FD"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="104" cy="41.5" r="2.2" fill="#38BDF8" />

        {/* Sweeping Foreground Orbital Ring */}
        <path
          d="M27 72C16 81 26 95 57 101C88 107 128 100 137 86C143 77 135 67 121 62"
          stroke="url(#se-orbit)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M34 88C58 101 106 101 131 85"
          stroke="#E0F2FE"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.8"
        />
      </svg>
    </div>
  );
}
