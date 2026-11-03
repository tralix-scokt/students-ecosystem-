"use client";

import React from "react";
import { ClipboardCheck, ClipboardList } from "lucide-react";
import type { AssignmentRecord } from "@/types/dashboard";

interface UpcomingAssignmentsCardProps {
  assignments: AssignmentRecord[];
}

const PRIORITY_BADGE_STYLES: Record<AssignmentRecord["priority"], string> = {
  high: "border-rose-400/45 bg-rose-950/50 text-rose-200",
  medium: "border-amber-400/40 bg-amber-950/45 text-amber-200",
  low: "border-slate-700 bg-obsidian-900 text-slate-300",
};

export function UpcomingAssignmentsCard({
  assignments,
}: UpcomingAssignmentsCardProps) {
  return (
    <section
      aria-labelledby="assignments-heading"
      className="futuristic-hud-panel flex flex-col justify-between rounded-3xl border border-white/[0.08] p-5 sm:p-6"
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-aura-400/30 bg-aura-500/12 text-aura-300">
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
            </div>
            <h2
              id="assignments-heading"
              className="font-display text-base font-bold text-white sm:text-lg"
            >
              Upcoming Assignments
            </h2>
          </div>

          {assignments.length > 0 && (
            <span className="rounded-full border border-aura-400/35 bg-aura-500/15 px-2.5 py-0.5 text-[11px] font-bold text-aura-300">
              {assignments.length}
            </span>
          )}
        </div>

        {assignments.length > 0 ? (
          <ul className="mt-4 space-y-2.5">
            {assignments.map((item) => {
              const dueFormatted = new Date(item.due_at).toLocaleDateString(
                "en-US",
                {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }
              );
              return (
                <li
                  key={item.id}
                  className="futuristic-tile rounded-2xl border border-white/[0.08] p-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-white">
                      {item.title}
                    </p>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${PRIORITY_BADGE_STYLES[item.priority]}`}
                    >
                      {item.priority}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                    <span className="font-medium text-electric-300">
                      {item.subject}
                    </span>
                    <span>Due {dueFormatted}</span>
                  </div>

                  <div className="mt-2 flex items-center justify-between border-t border-white/[0.05] pt-2 text-[11px]">
                    <span className="text-slate-500">Status</span>
                    <span className="font-semibold capitalize text-slate-200">
                      {item.status.replace("_", " ")}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="futuristic-tile mt-4 flex items-center gap-3.5 rounded-2xl border border-white/[0.08] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-obsidian-900 text-emerald-300">
              <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-white">
                No Upcoming Assignments
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                Queue clear — pending tasks and deadlines sync here
                automatically.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
