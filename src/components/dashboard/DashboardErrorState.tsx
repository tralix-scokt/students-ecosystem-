"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface DashboardErrorStateProps {
  message: string;
  isRetrying: boolean;
  onRetry: () => void;
}

export function DashboardErrorState({
  message,
  isRetrying,
  onRetry,
}: DashboardErrorStateProps) {
  return (
    <section
      role="alert"
      aria-live="assertive"
      className="mx-auto max-w-xl rounded-3xl border border-rose-400/35 bg-obsidian-900/90 p-7 text-center shadow-card-elevated sm:p-10"
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-400/40 bg-rose-950/50 text-rose-300">
        <AlertTriangle className="h-7 w-7" aria-hidden="true" />
      </div>

      <h2 className="mt-5 font-display text-xl font-bold text-white sm:text-2xl">
        Unable to Load Your Dashboard
      </h2>

      <p className="mt-2.5 text-sm leading-relaxed text-slate-300">{message}</p>

      <div className="mt-7 flex justify-center">
        <button
          type="button"
          disabled={isRetrying}
          onClick={onRetry}
          className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-electric-400/70 bg-gradient-to-r from-electric-400 via-electric-500 to-aura-500 px-6 py-2.5 text-sm font-bold text-obsidian-950 shadow-cyan-glow transition-all hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-300 disabled:opacity-65"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span>{isRetrying ? "Retrying..." : "Retry Loading Dashboard"}</span>
        </button>
      </div>
    </section>
  );
}
