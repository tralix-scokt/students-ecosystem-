"use client";

import React from "react";
import Link from "next/link";
import { CalendarClock, Clock, Plus } from "lucide-react";
import type { StudySessionRecord } from "@/types/dashboard";

interface TodaysStudyPlanCardProps {
  todaySessions: StudySessionRecord[];
  upcomingSessions: StudySessionRecord[];
}

export function TodaysStudyPlanCard({
  todaySessions,
  upcomingSessions,
}: TodaysStudyPlanCardProps) {
  const hasAnyPlan = todaySessions.length > 0 || upcomingSessions.length > 0;
  const totalTodayMinutes = todaySessions.reduce(
    (sum, s) => sum + (s.duration_minutes ?? 0),
    0
  );

  return (
    <section
      aria-labelledby="study-plan-heading"
      className="rounded-2xl border border-white/[0.08] rim-border-card p-6"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <CalendarClock
            className="h-5 w-5 text-electric-400"
            aria-hidden="true"
          />
          <h2
            id="study-plan-heading"
            className="font-display text-lg font-bold text-white"
          >
            Today’s Study Plan
          </h2>
        </div>

        {totalTodayMinutes > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-electric-400/35 bg-electric-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-electric-300">
            <Clock className="h-3 w-3" aria-hidden="true" />
            <span>{totalTodayMinutes} min</span>
          </span>
        )}
      </div>

      {hasAnyPlan ? (
        <div className="mt-4 space-y-4">
          {todaySessions.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Today’s Sessions
              </p>
              <ul className="mt-2 space-y-2.5">
                {todaySessions.map((session) => (
                  <li
                    key={session.id}
                    className="rounded-xl border border-slate-800/90 bg-obsidian-950/80 p-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-white">
                        {session.title}
                      </p>
                      <span className="shrink-0 rounded-md border border-electric-400/30 bg-electric-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-electric-300">
                        {session.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="font-medium text-slate-300">
                        {session.subject}
                      </span>
                      {session.duration_minutes ? (
                        <span>• {session.duration_minutes} mins</span>
                      ) : null}
                      {session.start_time ? (
                        <span>• {session.start_time.slice(0, 5)}</span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {upcomingSessions.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Upcoming Activities
              </p>
              <ul className="mt-2 space-y-2">
                {upcomingSessions.slice(0, 3).map((session) => (
                  <li
                    key={session.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-obsidian-950/60 px-3.5 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-200">
                        {session.title}
                      </p>
                      <p className="truncate text-[11px] text-slate-400">
                        {session.subject}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium text-electric-300">
                      {session.scheduled_date}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-800 bg-obsidian-950/65 p-5 text-center">
          <p className="font-display text-sm font-bold text-white">
            No Study Plan Scheduled for Today
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
            Structure daily study sessions around your subjects and learning
            goals once you create a study plan.
          </p>
          <div className="mt-4">
            <Link
              href="/dashboard/planner"
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-electric-400/55 bg-electric-400/12 px-4 py-2 text-xs font-bold text-electric-300 transition-colors hover:bg-electric-400 hover:text-obsidian-950"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Create Study Plan</span>
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
