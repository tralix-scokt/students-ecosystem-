"use client";

import React from "react";

export function DashboardSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading student dashboard"
      className="space-y-6 motion-safe:animate-pulse"
    >
      <span className="sr-only">Loading your personalized student dashboard...</span>

      {/* Welcome Banner Skeleton */}
      <div className="rounded-3xl border border-white/[0.08] bg-obsidian-900/75 p-6 sm:p-8">
        <div className="h-4 w-36 rounded-full bg-slate-800" />
        <div className="mt-4 h-8 w-72 max-w-full rounded-xl bg-slate-800" />
        <div className="mt-3 h-4 w-96 max-w-full rounded-lg bg-slate-800/80" />
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="h-16 rounded-2xl bg-obsidian-950/80" />
          <div className="h-16 rounded-2xl bg-obsidian-950/80" />
          <div className="h-16 rounded-2xl bg-obsidian-950/80" />
        </div>
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <div className="h-60 rounded-2xl border border-white/[0.07] bg-obsidian-900/65 p-6" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="h-56 rounded-2xl border border-white/[0.07] bg-obsidian-900/65" />
            <div className="h-56 rounded-2xl border border-white/[0.07] bg-obsidian-900/65" />
          </div>
          <div className="h-52 rounded-2xl border border-white/[0.07] bg-obsidian-900/65" />
        </div>
        <div className="space-y-6 xl:col-span-4">
          <div className="h-56 rounded-2xl border border-white/[0.07] bg-obsidian-900/65" />
          <div className="h-56 rounded-2xl border border-white/[0.07] bg-obsidian-900/65" />
        </div>
      </div>
    </div>
  );
}
