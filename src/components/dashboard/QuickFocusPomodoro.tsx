"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, Coffee, Flame, Pause, Play, RotateCcw, Timer } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type PomodoroPhase = "focus" | "break";

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;
const STORAGE_KEY = "se-quick-pomodoro-v1";

interface QuickFocusPomodoroProps {
  defaultSubject?: string;
}

export function QuickFocusPomodoro({
  defaultSubject = "General",
}: QuickFocusPomodoroProps) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<PomodoroPhase>("focus");
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_SECONDS);
  const [running, setRunning] = useState(false);
  const [studiedFocusSeconds, setStudiedFocusSeconds] = useState(0);
  const [loggedSuccess, setLoggedSuccess] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Restore active sprint across dashboard navigation
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        phase?: PomodoroPhase;
        secondsLeft?: number;
        studiedFocusSeconds?: number;
      };
      if (parsed.phase === "focus" || parsed.phase === "break") {
        setPhase(parsed.phase);
      }
      if (typeof parsed.secondsLeft === "number" && parsed.secondsLeft > 0) {
        setSecondsLeft(parsed.secondsLeft);
      }
      if (
        typeof parsed.studiedFocusSeconds === "number" &&
        parsed.studiedFocusSeconds >= 0
      ) {
        setStudiedFocusSeconds(parsed.studiedFocusSeconds);
      }
    } catch {
      // Ignore storage error
    }
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ phase, secondsLeft, studiedFocusSeconds })
      );
    } catch {
      // Ignore storage error
    }
  }, [phase, secondsLeft, studiedFocusSeconds]);

  const persistRealFocusSession = useCallback(
    async (elapsedSeconds: number) => {
      if (elapsedSeconds < 60) return;
      const supabase = createBrowserSupabaseClient();
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const recordedMins = Math.max(1, Math.round(elapsedSeconds / 60));
      const todayIso = new Date().toISOString().slice(0, 10);

      const { error } = await supabase.from("student_study_sessions").insert({
        user_id: user.id,
        title: `Pomodoro Deep Focus (${defaultSubject || "General"})`,
        subject: defaultSubject || "General",
        scheduled_date: todayIso,
        duration_minutes: 25,
        actual_duration_minutes: recordedMins,
        ended_at: new Date().toISOString(),
        status: "completed",
      });

      if (!error) {
        setStudiedFocusSeconds(0);
        setLoggedSuccess(true);
        setTimeout(() => setLoggedSuccess(false), 3000);
      }
    },
    [defaultSubject]
  );

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          if (phase === "focus") {
            void persistRealFocusSession(FOCUS_SECONDS);
            setPhase("break");
            return BREAK_SECONDS;
          }
          setPhase("focus");
          return FOCUS_SECONDS;
        }
        return prev - 1;
      });
      if (phase === "focus") {
        setStudiedFocusSeconds((s) => s + 1);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [persistRealFocusSession, phase, running]);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secs = String(secondsLeft % 60).padStart(2, "0");

  const switchPhase = (nextPhase: PomodoroPhase) => {
    setRunning(false);
    setPhase(nextPhase);
    setSecondsLeft(nextPhase === "focus" ? FOCUS_SECONDS : BREAK_SECONDS);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Open focus timer"
        aria-expanded={open}
        className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition ${
          running
            ? "border-electric-400/60 bg-electric-500/15 text-electric-300 shadow-cyan-glow"
            : "border-slate-800 bg-obsidian-900/90 text-slate-300 hover:border-electric-400/45 hover:text-electric-300"
        }`}
      >
        <Timer
          className={`h-4 w-4 ${running ? "animate-pulse text-electric-400" : ""}`}
          aria-hidden="true"
        />
        <span className="hidden font-mono text-xs sm:inline">
          {mins}:{secs}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Deep Focus Pomodoro Timer"
          className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-slate-700/90 bg-obsidian-900 p-4 shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-electric-300">
              {phase === "focus" ? (
                <>
                  <Flame className="h-3.5 w-3.5 text-electric-400" />
                  <span>Focus Sprint</span>
                </>
              ) : (
                <>
                  <Coffee className="h-3.5 w-3.5 text-aura-400" />
                  <span>Short Break</span>
                </>
              )}
            </span>

            <div className="flex rounded-lg border border-white/10 bg-obsidian-950 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => switchPhase("focus")}
                className={`rounded-md px-2 py-0.5 font-medium transition ${
                  phase === "focus"
                    ? "bg-electric-500 text-obsidian-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                25m
              </button>
              <button
                type="button"
                onClick={() => switchPhase("break")}
                className={`rounded-md px-2 py-0.5 font-medium transition ${
                  phase === "break"
                    ? "bg-aura-500 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                5m
              </button>
            </div>
          </div>

          <div className="my-4 rounded-xl border border-white/10 bg-obsidian-950/85 py-4 text-center">
            <p className="font-mono text-3xl font-bold tracking-wider text-white">
              {mins}:{secs}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              {running
                ? phase === "focus"
                  ? "Stay locked in — syncing study minutes"
                  : "Recharge your eyes & breathe"
                : "Ready when you are"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRunning((r) => !r)}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-electric-500 px-3 py-2 text-xs font-bold text-obsidian-950 transition hover:bg-electric-400"
            >
              {running ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>Start</span>
                </>
              )}
            </button>
            <button
              type="button"
              aria-label="Reset focus timer"
              onClick={() => {
                setRunning(false);
                setSecondsLeft(
                  phase === "focus" ? FOCUS_SECONDS : BREAK_SECONDS
                );
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-obsidian-950 text-slate-300 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          {studiedFocusSeconds >= 60 && !running && (
            <button
              type="button"
              onClick={() => void persistRealFocusSession(studiedFocusSeconds)}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-400/35 bg-emerald-500/10 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20"
            >
              Log {Math.max(1, Math.round(studiedFocusSeconds / 60))}m to Study
              History
            </button>
          )}

          {loggedSuccess && (
            <p className="mt-2 flex items-center justify-center gap-1 text-[11px] font-medium text-emerald-300">
              <Check className="h-3.5 w-3.5" />
              Saved to your Study Progress!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
