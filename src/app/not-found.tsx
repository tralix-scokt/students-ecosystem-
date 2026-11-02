import React from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-obsidian-950 px-4 text-slate-100">
      <div className="max-w-md rounded-3xl border border-white/10 bg-obsidian-900 p-8 text-center">
        <BookOpen className="mx-auto h-10 w-10 text-electric-400" />
        <h1 className="mt-4 text-2xl font-bold text-white">Page Not Found</h1>
        <p className="mt-2 text-xs leading-relaxed text-slate-300">
          The page or learning resource you requested does not exist or may not
          be published yet.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-xl bg-electric-500 px-4 py-2.5 text-xs font-bold text-obsidian-950"
          >
            Student Dashboard
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
