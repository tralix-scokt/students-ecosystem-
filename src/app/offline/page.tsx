import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, RefreshCw, WifiOff } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

export const metadata: Metadata = {
  title: "Offline Mode",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OfflinePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-obsidian-950 px-4 py-12 text-white">
      <div
        className="pointer-events-none fixed inset-0 ecosystem-grid-bg opacity-65"
        aria-hidden="true"
      />
      <div className="futuristic-hud-panel relative z-10 w-full max-w-md rounded-3xl p-7 text-center sm:p-9">
        <div className="mb-5 flex justify-center">
          <BrandLogo size="sm" />
        </div>

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-electric-400/35 bg-electric-500/12 text-electric-300 shadow-cyan-glow">
          <WifiOff className="h-6 w-6" aria-hidden="true" />
        </div>

        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-electric-300">
          Installed App • Offline Ready
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold text-white">
          You&apos;re Currently Offline
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
          Your E-Learning Ecosystem app is installed and ready. Reconnect to the
          internet to sync live AI Tutor explanations, structured lessons, and
          JAMB / WAEC / NECO CBT sessions.
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-electric-500 px-5 py-2.5 text-xs font-bold text-obsidian-950 transition hover:bg-electric-400"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span>Retry Connection</span>
          </Link>
          <Link
            href="/dashboard/notes"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-obsidian-900/90 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-electric-400/45 hover:text-white"
          >
            <BookOpen className="h-4 w-4 text-electric-400" aria-hidden="true" />
            <span>Cached Notes</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
