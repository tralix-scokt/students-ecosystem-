"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-obsidian-950 px-4 text-slate-100">
      <div className="max-w-md rounded-3xl border border-white/10 bg-obsidian-900 p-8 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-400" />
        <h1 className="mt-4 text-xl font-bold text-white">
          Something Interrupted This View
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-slate-300">
          Your saved study progress, notes, and account data remain safe. Please
          retry or return to the dashboard.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 rounded-xl bg-electric-500 px-4 py-2.5 text-xs font-bold text-obsidian-950"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
