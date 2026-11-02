"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  Edit3,
  Loader2,
  Play,
  Plus,
  Square,
  Timer,
  Trash2,
} from "lucide-react";
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { useStudentDashboardData } from "@/lib/dashboard/useStudentDashboardData";
import {
  computeStudyTimeSummary,
  DAYS_OF_WEEK,
  fetchAcademicManagementData,
  type ManagedAssignmentItem,
  type ManagedStudySessionItem,
  type PlannerTaskItem,
  type TimetableEntryItem,
} from "@/lib/planner/plannerService";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type AcademicTab = "overview" | "planner" | "timetable" | "assignments" | "sessions";
type PlannerHorizon = "daily" | "weekly" | "monthly";

export function AcademicManagementClient() {
  const { status, isRetrying, data, errorMessage, retry } =
    useStudentDashboardData();

  const [activeTab, setActiveTab] = useState<AcademicTab>("overview");
  const [plannerHorizon, setPlannerHorizon] = useState<PlannerHorizon>("daily");

  const [tasks, setTasks] = useState<PlannerTaskItem[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntryItem[]>([]);
  const [assignments, setAssignments] = useState<ManagedAssignmentItem[]>([]);
  const [sessions, setSessions] = useState<ManagedStudySessionItem[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayDayIdx = useMemo(() => new Date().getDay(), []);

  // Planner task form state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskSubject, setTaskSubject] = useState("");
  const [taskDate, setTaskDate] = useState(todayIso);
  const [taskTime, setTaskTime] = useState("16:00");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">(
    "medium"
  );

  // Timetable form state
  const [editingTtId, setEditingTtId] = useState<string | null>(null);
  const [ttSubject, setTtSubject] = useState("");
  const [ttDay, setTtDay] = useState<number>(1);
  const [ttStart, setTtStart] = useState("09:00");
  const [ttEnd, setTtEnd] = useState("10:30");
  const [ttLocation, setTtLocation] = useState("");

  // Assignment form state
  const [editingAssignId, setEditingAssignId] = useState<string | null>(null);
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDesc, setAssignDesc] = useState("");
  const [assignSubject, setAssignSubject] = useState("");
  const [assignDueDate, setAssignDueDate] = useState(todayIso);
  const [assignPriority, setAssignPriority] = useState<
    "low" | "medium" | "high"
  >("medium");

  // Live Study Session Timer state (monotonic wall-clock anchored to prevent background-tab drift)
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionSubject, setSessionSubject] = useState("");
  const [sessionPlannedMins, setSessionPlannedMins] = useState(45);
  const [liveTimerRunning, setLiveTimerRunning] = useState(false);
  const [liveTimerSeconds, setLiveTimerSeconds] = useState(0);
  const liveTimerStartedAtMsRef = useRef<number | null>(null);
  const accumulatedTimerSecondsRef = useRef<number>(0);

  const subjectChoices = useMemo(() => {
    const arr = data?.academicProfile?.selected_subjects || [];
    return arr.length > 0 ? arr : ["Mathematics", "Physics", "General Studies"];
  }, [data?.academicProfile?.selected_subjects]);

  const reloadAll = useCallback(async () => {
    const res = await fetchAcademicManagementData();
    setTasks(res.tasks);
    setTimetable(res.timetable);
    setAssignments(res.assignments);
    setSessions(res.studySessions);
    setLoadingRecords(false);
  }, []);

  useEffect(() => {
    if (status === "ready") {
      const defSubj = subjectChoices[0] || "General";
      setTaskSubject(defSubj);
      setTtSubject(defSubj);
      setAssignSubject(defSubj);
      setSessionSubject(defSubj);
      reloadAll();
    }
  }, [status, subjectChoices, reloadAll]);

  useEffect(() => {
    if (!liveTimerRunning) {
      if (liveTimerStartedAtMsRef.current !== null) {
        accumulatedTimerSecondsRef.current += Math.max(
          0,
          Math.floor((Date.now() - liveTimerStartedAtMsRef.current) / 1000)
        );
        liveTimerStartedAtMsRef.current = null;
      }
      return;
    }

    liveTimerStartedAtMsRef.current = Date.now();
    const syncElapsed = () => {
      if (liveTimerStartedAtMsRef.current === null) return;
      const delta = Math.max(
        0,
        Math.floor((Date.now() - liveTimerStartedAtMsRef.current) / 1000)
      );
      setLiveTimerSeconds(accumulatedTimerSecondsRef.current + delta);
    };

    const id = setInterval(syncElapsed, 1000);
    document.addEventListener("visibilitychange", syncElapsed);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", syncElapsed);
    };
  }, [liveTimerRunning]);

  // CRUD: Planner Task
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || taskTitle.trim().length < 2) return;

    if (editingTaskId) {
      const { error } = await supabase
        .from("student_planner_tasks")
        .update({
          title: taskTitle.trim(),
          subject: taskSubject || "General",
          scheduled_date: taskDate,
          scheduled_time: taskTime || null,
          priority: taskPriority,
        })
        .eq("id", editingTaskId);
      if (error) {
        setActionError(error.message);
        return;
      }
      setEditingTaskId(null);
    } else {
      const { error } = await supabase.from("student_planner_tasks").insert({
        user_id: user.id,
        title: taskTitle.trim(),
        subject: taskSubject || "General",
        scheduled_date: taskDate,
        scheduled_time: taskTime || null,
        priority: taskPriority,
      });
      if (error) {
        setActionError(error.message);
        return;
      }
    }

    setTaskTitle("");
    await reloadAll();
  };

  const handleToggleTask = async (t: PlannerTaskItem) => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    await supabase
      .from("student_planner_tasks")
      .update({
        is_completed: !t.isCompleted,
        completed_at: !t.isCompleted ? new Date().toISOString() : null,
      })
      .eq("id", t.id);
    await reloadAll();
  };

  const handleDeleteTask = async (id: string) => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    await supabase.from("student_planner_tasks").delete().eq("id", id);
    await reloadAll();
  };

  // CRUD: Timetable
  const handleSaveTimetable = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (ttEnd <= ttStart) {
      setActionError("Class end time must be after start time.");
      return;
    }
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (editingTtId) {
      const { error } = await supabase
        .from("student_timetable_entries")
        .update({
          subject: ttSubject || "General",
          day_of_week: ttDay,
          start_time: ttStart,
          end_time: ttEnd,
          location: ttLocation.trim() || null,
        })
        .eq("id", editingTtId);
      if (error) {
        setActionError(error.message);
        return;
      }
      setEditingTtId(null);
    } else {
      const { error } = await supabase
        .from("student_timetable_entries")
        .insert({
          user_id: user.id,
          subject: ttSubject || "General",
          day_of_week: ttDay,
          start_time: ttStart,
          end_time: ttEnd,
          location: ttLocation.trim() || null,
        });
      if (error) {
        setActionError(error.message);
        return;
      }
    }
    setTtLocation("");
    await reloadAll();
  };

  const handleDeleteTimetable = async (id: string) => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    await supabase.from("student_timetable_entries").delete().eq("id", id);
    await reloadAll();
  };

  // CRUD: Assignment
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || assignTitle.trim().length < 2) return;

    const dueIso = `${assignDueDate}T23:59:00Z`;
    if (editingAssignId) {
      const { error } = await supabase
        .from("student_assignments")
        .update({
          title: assignTitle.trim(),
          description: assignDesc.trim() || null,
          subject: assignSubject || "General",
          due_at: dueIso,
          priority: assignPriority,
        })
        .eq("id", editingAssignId);
      if (error) {
        setActionError(error.message);
        return;
      }
      setEditingAssignId(null);
    } else {
      const { error } = await supabase.from("student_assignments").insert({
        user_id: user.id,
        title: assignTitle.trim(),
        description: assignDesc.trim() || null,
        subject: assignSubject || "General",
        due_at: dueIso,
        priority: assignPriority,
        status: "pending",
      });
      if (error) {
        setActionError(error.message);
        return;
      }
    }

    setAssignTitle("");
    setAssignDesc("");
    await reloadAll();
  };

  const handleToggleAssignmentComplete = async (a: ManagedAssignmentItem) => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const nextStatus = a.status === "completed" ? "pending" : "completed";
    await supabase
      .from("student_assignments")
      .update({
        status: nextStatus,
        completed_at:
          nextStatus === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", a.id);
    await reloadAll();
  };

  const handleDeleteAssignment = async (id: string) => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    await supabase.from("student_assignments").delete().eq("id", id);
    await reloadAll();
  };

  // Study Session: Schedule or Finish Live Focus Session
  const handleScheduleStudySession = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || sessionTitle.trim().length < 2) return;

    await supabase.from("student_study_sessions").insert({
      user_id: user.id,
      title: sessionTitle.trim(),
      subject: sessionSubject || "General",
      scheduled_date: todayIso,
      duration_minutes: sessionPlannedMins,
      status: "scheduled",
    });
    setSessionTitle("");
    await reloadAll();
  };

  const handleFinishLiveSession = async () => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const finalElapsedSeconds =
      liveTimerRunning && liveTimerStartedAtMsRef.current !== null
        ? accumulatedTimerSecondsRef.current +
          Math.max(
            0,
            Math.floor((Date.now() - liveTimerStartedAtMsRef.current) / 1000)
          )
        : liveTimerSeconds;

    const recordedMins = Math.max(1, Math.round(finalElapsedSeconds / 60));
    await supabase.from("student_study_sessions").insert({
      user_id: user.id,
      title:
        sessionTitle.trim() || `Focused ${sessionSubject || "Study"} Session`,
      subject: sessionSubject || "General",
      scheduled_date: todayIso,
      duration_minutes: sessionPlannedMins,
      actual_duration_minutes: recordedMins,
      ended_at: new Date().toISOString(),
      status: "completed",
    });

    liveTimerStartedAtMsRef.current = null;
    accumulatedTimerSecondsRef.current = 0;
    setLiveTimerRunning(false);
    setLiveTimerSeconds(0);
    setSessionTitle("");
    await reloadAll();
  };

  const handleCompleteScheduledSession = async (s: ManagedStudySessionItem) => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    await supabase
      .from("student_study_sessions")
      .update({
        status: "completed",
        actual_duration_minutes: s.durationMinutes ?? 30,
        ended_at: new Date().toISOString(),
      })
      .eq("id", s.id);
    await reloadAll();
  };

  if (status === "loading") return <DashboardSkeleton />;
  if (status === "error" || !data) {
    return (
      <DashboardErrorState
        message={errorMessage || "Unable to load Academic Management."}
        isRetrying={isRetrying}
        onRetry={retry}
      />
    );
  }

  const filteredPlannerTasks = tasks.filter((t) => {
    if (plannerHorizon === "daily") return t.scheduledDate === todayIso;
    const diffDays =
      (new Date(`${t.scheduledDate}T00:00:00Z`).getTime() -
        new Date(`${todayIso}T00:00:00Z`).getTime()) /
      (24 * 60 * 60 * 1000);
    if (plannerHorizon === "weekly") return diffDays >= -1 && diffDays <= 7;
    return diffDays >= -7 && diffDays <= 31;
  });

  const studySummary = computeStudyTimeSummary(sessions);
  const todaysTasks = tasks.filter((t) => t.scheduledDate === todayIso);
  const overdueTasks = tasks.filter(
    (t) => !t.isCompleted && t.scheduledDate < todayIso
  );
  const upcomingDeadlines = assignments.filter((a) => a.status !== "completed");
  const completedAssignments = assignments.filter(
    (a) => a.status === "completed"
  );
  const todaysClasses = timetable.filter((tt) => tt.dayOfWeek === todayDayIdx);

  return (
    <DashboardShell
      userProfile={data.userProfile}
      academicProfile={data.academicProfile}
      fallbackEmail={data.email}
      unreadNotificationCount={data.unreadNotificationCount}
      publishedCourses={data.publishedCourses}
      ongoingCourses={data.ongoingCourses}
    >
      <div className="space-y-6">
        {/* Header */}
        <section className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 sm:p-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-electric-400/30 bg-electric-500/10 px-3 py-1 text-xs font-medium text-electric-300">
            <CalendarClock className="h-3.5 w-3.5" />
            <span>
              Planner • Timetable • Assignments • Study Focus Sessions
            </span>
          </div>
          <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Academic Management System
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Organize daily, weekly, and monthly study plans, manage your class
            timetable, track assignment deadlines, and record real study time.
          </p>

          {/* Navigation Tabs */}
          <div className="mt-5 flex flex-wrap gap-2">
            {(
              [
                { id: "overview", label: "Academic Overview" },
                { id: "planner", label: "My Planner" },
                { id: "timetable", label: "Class Timetable" },
                { id: "assignments", label: "Assignments" },
                { id: "sessions", label: "Study Sessions" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-electric-500 text-obsidian-950"
                    : "border border-white/10 bg-obsidian-950/70 text-slate-300 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {actionError && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 p-3.5 text-xs text-red-200"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {loadingRecords ? (
          <div className="flex items-center justify-center py-14 text-sm text-slate-300">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-electric-400" />
            Loading your academic schedule...
          </div>
        ) : (
          <>
            {/* 1. ACADEMIC MANAGEMENT DASHBOARD OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    {
                      label: "Today's Tasks",
                      value: todaysTasks.length,
                    },
                    {
                      label: "Overdue Tasks",
                      value: overdueTasks.length,
                    },
                    {
                      label: "Upcoming Deadlines",
                      value: upcomingDeadlines.length,
                    },
                    {
                      label: "Completed Assignments",
                      value: completedAssignments.length,
                    },
                    {
                      label: "Classes Today",
                      value: todaysClasses.length,
                    },
                    {
                      label: "Weekly Study Time",
                      value: `${studySummary.weeklyMinutes}m`,
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-4"
                    >
                      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                        {stat.label}
                      </p>
                      <p className="mt-1.5 text-2xl font-bold text-white">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  {/* Today's Tasks & Classes */}
                  <section className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-5">
                    <h2 className="text-sm font-bold text-white">
                      Today&apos;s Study Tasks & Classes
                    </h2>
                    {todaysTasks.length === 0 && todaysClasses.length === 0 ? (
                      <p className="mt-3 text-xs text-slate-400">
                        Nothing scheduled for today yet. Add tasks in My Planner
                        or classes in Timetable.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {todaysClasses.map((c) => (
                          <div
                            key={c.id}
                            className="rounded-xl border border-aura-400/25 bg-aura-500/10 p-3 text-xs"
                          >
                            <p className="font-semibold text-white">
                              Class: {c.subject}
                            </p>
                            <p className="text-slate-300">
                              {c.startTime} – {c.endTime}{" "}
                              {c.location ? `• ${c.location}` : ""}
                            </p>
                          </div>
                        ))}
                        {todaysTasks.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-obsidian-950/70 p-3 text-xs"
                          >
                            <div>
                              <p
                                className={`font-medium ${
                                  t.isCompleted
                                    ? "line-through text-slate-400"
                                    : "text-white"
                                }`}
                              >
                                {t.title}
                              </p>
                              <p className="text-slate-400">
                                {t.subject} • {t.priority}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleTask(t)}
                              className="text-electric-300 hover:underline"
                            >
                              {t.isCompleted ? "Undo" : "Done"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Upcoming Assignment Deadlines */}
                  <section className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-5">
                    <h2 className="text-sm font-bold text-white">
                      Upcoming & Overdue Assignments
                    </h2>
                    {upcomingDeadlines.length === 0 ? (
                      <p className="mt-3 text-xs text-slate-400">
                        No pending assignment deadlines.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {upcomingDeadlines.slice(0, 5).map((a) => (
                          <div
                            key={a.id}
                            className="rounded-xl border border-white/10 bg-obsidian-950/70 p-3 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-white">
                                {a.title}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                  a.status === "overdue"
                                    ? "bg-red-500/20 text-red-300"
                                    : "bg-amber-500/20 text-amber-300"
                                }`}
                              >
                                {a.status}
                              </span>
                            </div>
                            <p className="mt-1 text-slate-400">
                              {a.subject} • Due{" "}
                              {new Date(a.dueAt).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Recent Study Sessions */}
                  <section className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-5">
                    <h2 className="text-sm font-bold text-white">
                      Recent Study Sessions ({studySummary.monthlyMinutes}m in
                      30d)
                    </h2>
                    {sessions.length === 0 ? (
                      <p className="mt-3 text-xs text-slate-400">
                        No study sessions logged yet. Start a live focus timer
                        in Study Sessions.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {sessions.slice(0, 5).map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-obsidian-950/70 p-3 text-xs"
                          >
                            <div>
                              <p className="font-medium text-white">
                                {s.title}
                              </p>
                              <p className="text-slate-400">
                                {s.subject} • {s.scheduledDate}
                              </p>
                            </div>
                            <span className="font-semibold text-electric-300">
                              {s.actualDurationMinutes ?? s.durationMinutes ?? 0}m
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </div>
            )}

            {/* 2. MY PLANNER (DAILY / WEEKLY / MONTHLY) */}
            {activeTab === "planner" && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <form
                  onSubmit={handleSaveTask}
                  className="space-y-3.5 rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 lg:col-span-4"
                >
                  <h2 className="text-base font-bold text-white">
                    {editingTaskId ? "Edit Study Task" : "Add Study Task"}
                  </h2>
                  <div>
                    <label
                      htmlFor="planner-task-title"
                      className="block text-xs text-slate-300"
                    >
                      Task Title
                    </label>
                    <input
                      id="planner-task-title"
                      required
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="e.g. Revise Vector Resolution Examples"
                      className="mt-1 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="planner-task-subject"
                        className="block text-xs text-slate-300"
                      >
                        Subject
                      </label>
                      <select
                        id="planner-task-subject"
                        value={taskSubject}
                        onChange={(e) => setTaskSubject(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                      >
                        {subjectChoices.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="planner-task-priority"
                        className="block text-xs text-slate-300"
                      >
                        Priority
                      </label>
                      <select
                        id="planner-task-priority"
                        value={taskPriority}
                        onChange={(e) =>
                          setTaskPriority(
                            e.target.value as "low" | "medium" | "high"
                          )
                        }
                        className="mt-1 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="planner-task-date"
                        className="block text-xs text-slate-300"
                      >
                        Date
                      </label>
                      <input
                        id="planner-task-date"
                        type="date"
                        value={taskDate}
                        onChange={(e) => setTaskDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="planner-task-time"
                        className="block text-xs text-slate-300"
                      >
                        Time
                      </label>
                      <input
                        id="planner-task-time"
                        type="time"
                        value={taskTime}
                        onChange={(e) => setTaskTime(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-electric-500 px-4 py-2.5 text-xs font-bold text-obsidian-950 hover:bg-electric-400"
                  >
                    <Plus className="h-4 w-4" />
                    {editingTaskId ? "Update Task" : "Save Task"}
                  </button>
                </form>

                <section className="space-y-4 rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 lg:col-span-8">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-base font-bold text-white">
                      Study Planner Tasks
                    </h2>
                    <div className="flex gap-1.5">
                      {(["daily", "weekly", "monthly"] as const).map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setPlannerHorizon(h)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${
                            plannerHorizon === h
                              ? "bg-electric-500 text-obsidian-950"
                              : "bg-obsidian-950 text-slate-300"
                          }`}
                        >
                          {h} View
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredPlannerTasks.length === 0 ? (
                    <p className="py-10 text-center text-xs text-slate-400">
                      No study tasks in the {plannerHorizon} view yet.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredPlannerTasks.map((t) => {
                        const isOverdue =
                          !t.isCompleted && t.scheduledDate < todayIso;
                        return (
                          <div
                            key={t.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-obsidian-950/80 p-3.5 text-xs"
                          >
                            <div className="flex items-start gap-3">
                              <button
                                type="button"
                                aria-label={`Toggle ${t.title}`}
                                onClick={() => handleToggleTask(t)}
                                className="mt-0.5 text-electric-400"
                              >
                                <CheckCircle2
                                  className={`h-4 w-4 ${
                                    t.isCompleted
                                      ? "fill-emerald-500/20 text-emerald-400"
                                      : "text-slate-400"
                                  }`}
                                />
                              </button>
                              <div>
                                <p
                                  className={`font-semibold ${
                                    t.isCompleted
                                      ? "line-through text-slate-400"
                                      : "text-white"
                                  }`}
                                >
                                  {t.title}
                                </p>
                                <p className="mt-0.5 text-slate-400">
                                  {t.subject} • {t.scheduledDate}{" "}
                                  {t.scheduledTime ? `at ${t.scheduledTime}` : ""}{" "}
                                  • Priority: {t.priority}
                                  {isOverdue && (
                                    <span className="ml-2 font-bold text-red-300">
                                      (Overdue)
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                aria-label={`Edit ${t.title}`}
                                onClick={() => {
                                  setEditingTaskId(t.id);
                                  setTaskTitle(t.title);
                                  setTaskSubject(t.subject);
                                  setTaskDate(t.scheduledDate);
                                  setTaskTime(t.scheduledTime || "16:00");
                                  setTaskPriority(t.priority);
                                }}
                                className="rounded p-1.5 text-slate-300 hover:bg-white/10"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Delete ${t.title}`}
                                onClick={() => handleDeleteTask(t.id)}
                                className="rounded p-1.5 text-red-300 hover:bg-red-500/20"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* 3. WEEKLY CLASS TIMETABLE */}
            {activeTab === "timetable" && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <form
                  onSubmit={handleSaveTimetable}
                  className="space-y-3.5 rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 lg:col-span-4"
                >
                  <h2 className="text-base font-bold text-white">
                    {editingTtId ? "Edit Class Block" : "Add Class to Timetable"}
                  </h2>
                  <div>
                    <label
                      htmlFor="tt-subject"
                      className="block text-xs text-slate-300"
                    >
                      Subject / Course
                    </label>
                    <input
                      id="tt-subject"
                      required
                      value={ttSubject}
                      onChange={(e) => setTtSubject(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="tt-day"
                      className="block text-xs text-slate-300"
                    >
                      Day of Week
                    </label>
                    <select
                      id="tt-day"
                      value={ttDay}
                      onChange={(e) => setTtDay(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                    >
                      {DAYS_OF_WEEK.map((d, idx) => (
                        <option key={d} value={idx}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="tt-start"
                        className="block text-xs text-slate-300"
                      >
                        Start Time
                      </label>
                      <input
                        id="tt-start"
                        type="time"
                        value={ttStart}
                        onChange={(e) => setTtStart(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="tt-end"
                        className="block text-xs text-slate-300"
                      >
                        End Time
                      </label>
                      <input
                        id="tt-end"
                        type="time"
                        value={ttEnd}
                        onChange={(e) => setTtEnd(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="tt-location"
                      className="block text-xs text-slate-300"
                    >
                      Location / Lab / Room (Optional)
                    </label>
                    <input
                      id="tt-location"
                      value={ttLocation}
                      onChange={(e) => setTtLocation(e.target.value)}
                      placeholder="e.g. Science Lab B / Lecture Hall 2"
                      className="mt-1 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-electric-500 px-4 py-2.5 text-xs font-bold text-obsidian-950"
                  >
                    <Calendar className="h-4 w-4" />
                    {editingTtId ? "Update Class" : "Add Class Block"}
                  </button>
                </form>

                <section className="space-y-4 rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 lg:col-span-8">
                  <h2 className="text-base font-bold text-white">
                    Weekly Class Timetable
                  </h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {DAYS_OF_WEEK.map((dayLabel, idx) => {
                      const dayItems = timetable.filter(
                        (item) => item.dayOfWeek === idx
                      );
                      return (
                        <div
                          key={dayLabel}
                          className="rounded-xl border border-white/10 bg-obsidian-950/70 p-3.5"
                        >
                          <p className="text-xs font-bold uppercase tracking-wider text-electric-300">
                            {dayLabel}
                          </p>
                          {dayItems.length === 0 ? (
                            <p className="mt-2 text-[11px] text-slate-500">
                              No classes scheduled
                            </p>
                          ) : (
                            <div className="mt-2 space-y-2">
                              {dayItems.map((entry) => (
                                <div
                                  key={entry.id}
                                  className="flex items-center justify-between rounded-lg border border-white/10 bg-obsidian-900 p-2.5 text-xs"
                                >
                                  <div>
                                    <p className="font-semibold text-white">
                                      {entry.subject}
                                    </p>
                                    <p className="text-[11px] text-slate-400">
                                      {entry.startTime} – {entry.endTime}
                                      {entry.location
                                        ? ` • ${entry.location}`
                                        : ""}
                                    </p>
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingTtId(entry.id);
                                        setTtSubject(entry.subject);
                                        setTtDay(entry.dayOfWeek);
                                        setTtStart(entry.startTime);
                                        setTtEnd(entry.endTime);
                                        setTtLocation(entry.location || "");
                                      }}
                                      className="p-1 text-slate-300 hover:text-white"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteTimetable(entry.id)
                                      }
                                      className="p-1 text-red-300 hover:text-red-200"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {/* 4. ASSIGNMENT MANAGER */}
            {activeTab === "assignments" && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <form
                  onSubmit={handleSaveAssignment}
                  className="space-y-3.5 rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 lg:col-span-4"
                >
                  <h2 className="text-base font-bold text-white">
                    {editingAssignId ? "Edit Assignment" : "New Assignment"}
                  </h2>
                  <div>
                    <label
                      htmlFor="assign-title"
                      className="block text-xs text-slate-300"
                    >
                      Assignment Title
                    </label>
                    <input
                      id="assign-title"
                      required
                      value={assignTitle}
                      onChange={(e) => setAssignTitle(e.target.value)}
                      placeholder="e.g. Lab Report: Ohm's Law Verification"
                      className="mt-1 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="assign-desc"
                      className="block text-xs text-slate-300"
                    >
                      Description / Instructions
                    </label>
                    <textarea
                      id="assign-desc"
                      rows={3}
                      value={assignDesc}
                      onChange={(e) => setAssignDesc(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="assign-subj"
                        className="block text-xs text-slate-300"
                      >
                        Subject
                      </label>
                      <select
                        id="assign-subj"
                        value={assignSubject}
                        onChange={(e) => setAssignSubject(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                      >
                        {subjectChoices.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="assign-due"
                        className="block text-xs text-slate-300"
                      >
                        Due Date
                      </label>
                      <input
                        id="assign-due"
                        type="date"
                        value={assignDueDate}
                        onChange={(e) => setAssignDueDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="assign-prio"
                      className="block text-xs text-slate-300"
                    >
                      Priority
                    </label>
                    <select
                      id="assign-prio"
                      value={assignPriority}
                      onChange={(e) =>
                        setAssignPriority(
                          e.target.value as "low" | "medium" | "high"
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-electric-500 px-4 py-2.5 text-xs font-bold text-obsidian-950"
                  >
                    <ClipboardList className="h-4 w-4" />
                    {editingAssignId ? "Update Assignment" : "Save Assignment"}
                  </button>
                </form>

                <section className="space-y-3 rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 lg:col-span-8">
                  <h2 className="text-base font-bold text-white">
                    Assignments & Deadlines
                  </h2>
                  {assignments.length === 0 ? (
                    <p className="py-10 text-center text-xs text-slate-400">
                      No assignments added yet. Deadlines due within 48 hours
                      automatically trigger reminder notifications.
                    </p>
                  ) : (
                    assignments.map((a) => (
                      <div
                        key={a.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-obsidian-950/80 p-4 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-semibold ${
                                a.status === "completed"
                                  ? "line-through text-slate-400"
                                  : "text-white"
                              }`}
                            >
                              {a.title}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                a.status === "completed"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : a.status === "overdue"
                                    ? "bg-red-500/20 text-red-300"
                                    : "bg-amber-500/20 text-amber-300"
                              }`}
                            >
                              {a.status}
                            </span>
                          </div>
                          {a.description && (
                            <p className="mt-1 text-slate-300">
                              {a.description}
                            </p>
                          )}
                          <p className="mt-1 text-slate-400">
                            {a.subject} • Due{" "}
                            {new Date(a.dueAt).toLocaleDateString()} • Priority:{" "}
                            {a.priority}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleAssignmentComplete(a)}
                            className="rounded-lg border border-white/15 px-3 py-1.5 font-semibold text-electric-300 hover:bg-white/10"
                          >
                            {a.status === "completed"
                              ? "Reopen"
                              : "Mark Completed"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAssignId(a.id);
                              setAssignTitle(a.title);
                              setAssignDesc(a.description || "");
                              setAssignSubject(a.subject);
                              setAssignDueDate(a.dueAt.slice(0, 10));
                              setAssignPriority(a.priority);
                            }}
                            className="p-1.5 text-slate-300"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAssignment(a.id)}
                            className="p-1.5 text-red-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </section>
              </div>
            )}

            {/* 5. STUDY SESSIONS & LIVE FOCUS TIMER */}
            {activeTab === "sessions" && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="space-y-4 lg:col-span-5">
                  {/* Live Focus Session Card */}
                  <section className="rounded-2xl border border-electric-400/30 bg-obsidian-900/90 p-5">
                    <div className="flex items-center gap-2 text-sm font-bold text-electric-300">
                      <Timer className="h-4 w-4" />
                      <span>Live Study Session Timer</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-300">
                      Start a real study session, stay focused, and record exact
                      minutes studied to your weekly & monthly summary.
                    </p>

                    <div className="my-4 rounded-xl bg-obsidian-950 p-4 text-center font-mono text-3xl font-bold text-white">
                      {String(Math.floor(liveTimerSeconds / 60)).padStart(
                        2,
                        "0"
                      )}
                      :{String(liveTimerSeconds % 60).padStart(2, "0")}
                    </div>

                    <div className="space-y-2.5">
                      <input
                        type="text"
                        value={sessionTitle}
                        onChange={(e) => setSessionTitle(e.target.value)}
                        placeholder="Session focus (e.g. Kinematics Problem Set)"
                        className="w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                      />
                      <div className="grid grid-cols-2 gap-2.5">
                        <select
                          aria-label="Study session subject"
                          value={sessionSubject}
                          onChange={(e) => setSessionSubject(e.target.value)}
                          className="rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                        >
                          {subjectChoices.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          aria-label="Planned duration minutes"
                          min={5}
                          max={240}
                          value={sessionPlannedMins}
                          onChange={(e) =>
                            setSessionPlannedMins(Number(e.target.value))
                          }
                          className="rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                        />
                      </div>

                      <div className="flex gap-2 pt-1">
                        {!liveTimerRunning ? (
                          <button
                            type="button"
                            onClick={() => setLiveTimerRunning(true)}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-electric-500 px-4 py-2.5 text-xs font-bold text-obsidian-950"
                          >
                            <Play className="h-3.5 w-3.5" />
                            {liveTimerSeconds > 0 ? "Resume" : "Start Session"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setLiveTimerRunning(false)}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-obsidian-950"
                          >
                            <Clock className="h-3.5 w-3.5" />
                            Pause
                          </button>
                        )}

                        {liveTimerSeconds > 0 && (
                          <button
                            type="button"
                            onClick={handleFinishLiveSession}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-obsidian-950"
                          >
                            <Square className="h-3.5 w-3.5" />
                            Finish & Record
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleScheduleStudySession}
                        disabled={sessionTitle.trim().length < 2}
                        className="w-full rounded-xl border border-white/15 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-40"
                      >
                        Or Schedule for Today Without Starting Timer
                      </button>
                    </div>
                  </section>
                </div>

                {/* Summaries & Study History */}
                <section className="space-y-4 rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 lg:col-span-7">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-white/10 bg-obsidian-950 p-3">
                      <p className="text-[11px] text-slate-400">7-Day Total</p>
                      <p className="mt-1 text-xl font-bold text-electric-300">
                        {studySummary.weeklyMinutes} min
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-obsidian-950 p-3">
                      <p className="text-[11px] text-slate-400">30-Day Total</p>
                      <p className="mt-1 text-xl font-bold text-aura-300">
                        {studySummary.monthlyMinutes} min
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-obsidian-950 p-3">
                      <p className="text-[11px] text-slate-400">
                        Sessions Completed
                      </p>
                      <p className="mt-1 text-xl font-bold text-emerald-300">
                        {studySummary.completedSessionsCount}
                      </p>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white">
                    Study Session History
                  </h3>
                  {sessions.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-400">
                      No study sessions recorded yet.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {sessions.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-obsidian-950/80 p-3.5 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-white">
                              {s.title}
                            </p>
                            <p className="text-slate-400">
                              {s.subject} • {s.scheduledDate} • Status:{" "}
                              {s.status}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-electric-300">
                              {s.actualDurationMinutes ?? s.durationMinutes ?? 0}{" "}
                              min
                            </span>
                            {s.status !== "completed" && (
                              <button
                                type="button"
                                onClick={() => handleCompleteScheduledSession(s)}
                                className="rounded-lg bg-emerald-500/20 px-2.5 py-1 font-semibold text-emerald-300"
                              >
                                Complete
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
