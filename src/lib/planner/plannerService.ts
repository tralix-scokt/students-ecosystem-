import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export interface PlannerTaskItem {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  scheduledDate: string;
  scheduledTime: string | null;
  durationMinutes: number | null;
  priority: "low" | "medium" | "high";
  isCompleted: boolean;
}

export interface TimetableEntryItem {
  id: string;
  subject: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location: string | null;
  instructorOrNotes: string | null;
}

export interface ManagedAssignmentItem {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  dueAt: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed" | "overdue";
}

export interface ManagedStudySessionItem {
  id: string;
  title: string;
  subject: string;
  scheduledDate: string;
  startTime: string | null;
  durationMinutes: number | null;
  actualDurationMinutes: number | null;
  status: "scheduled" | "in_progress" | "completed" | "skipped";
  notes: string | null;
}

export const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export async function fetchAcademicManagementData(): Promise<{
  tasks: PlannerTaskItem[];
  timetable: TimetableEntryItem[];
  assignments: ManagedAssignmentItem[];
  studySessions: ManagedStudySessionItem[];
}> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return { tasks: [], timetable: [], assignments: [], studySessions: [] };
  }

  // Sync real assignment deadline & announcement notifications silently
  try {
    await supabase.rpc("sync_student_event_notifications");
  } catch {
    // Non-fatal
  }

  const [tRes, ttRes, aRes, sRes] = await Promise.all([
    supabase
      .from("student_planner_tasks")
      .select("*")
      .order("scheduled_date", { ascending: true })
      .limit(120),
    supabase
      .from("student_timetable_entries")
      .select("*")
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(100),
    supabase
      .from("student_assignments")
      .select("*")
      .order("due_at", { ascending: true })
      .limit(100),
    supabase
      .from("student_study_sessions")
      .select("*")
      .order("scheduled_date", { ascending: false })
      .limit(100),
  ]);

  const nowMs = Date.now();

  const tasks: PlannerTaskItem[] = (tRes.data || []).map(
    (r: Record<string, unknown>) => ({
      id: String(r.id),
      title: String(r.title),
      description: r.description ? String(r.description) : null,
      subject: String(r.subject),
      scheduledDate: String(r.scheduled_date),
      scheduledTime: r.scheduled_time ? String(r.scheduled_time).slice(0, 5) : null,
      durationMinutes:
        r.duration_minutes !== null ? Number(r.duration_minutes) : null,
      priority: (r.priority as PlannerTaskItem["priority"]) || "medium",
      isCompleted: Boolean(r.is_completed),
    })
  );

  const timetable: TimetableEntryItem[] = (ttRes.data || []).map(
    (r: Record<string, unknown>) => ({
      id: String(r.id),
      subject: String(r.subject),
      dayOfWeek: Number(r.day_of_week),
      startTime: String(r.start_time).slice(0, 5),
      endTime: String(r.end_time).slice(0, 5),
      location: r.location ? String(r.location) : null,
      instructorOrNotes: r.instructor_or_notes
        ? String(r.instructor_or_notes)
        : null,
    })
  );

  const assignments: ManagedAssignmentItem[] = (aRes.data || []).map(
    (r: Record<string, unknown>) => {
      const rawStatus =
        (r.status as ManagedAssignmentItem["status"]) || "pending";
      const dueIso = String(r.due_at);
      const computedStatus =
        rawStatus !== "completed" && new Date(dueIso).getTime() < nowMs
          ? "overdue"
          : rawStatus;
      return {
        id: String(r.id),
        title: String(r.title),
        description: r.description ? String(r.description) : null,
        subject: String(r.subject),
        dueAt: dueIso,
        priority: (r.priority as ManagedAssignmentItem["priority"]) || "medium",
        status: computedStatus,
      };
    }
  );

  const studySessions: ManagedStudySessionItem[] = (sRes.data || []).map(
    (r: Record<string, unknown>) => ({
      id: String(r.id),
      title: String(r.title),
      subject: String(r.subject),
      scheduledDate: String(r.scheduled_date),
      startTime: r.start_time ? String(r.start_time).slice(0, 5) : null,
      durationMinutes:
        r.duration_minutes !== null ? Number(r.duration_minutes) : null,
      actualDurationMinutes:
        r.actual_duration_minutes !== null &&
        r.actual_duration_minutes !== undefined
          ? Number(r.actual_duration_minutes)
          : null,
      status:
        (r.status as ManagedStudySessionItem["status"]) || "scheduled",
      notes: r.notes ? String(r.notes) : null,
    })
  );

  return { tasks, timetable, assignments, studySessions };
}

export function computeStudyTimeSummary(
  sessions: ManagedStudySessionItem[],
  referenceNow = new Date()
): {
  weeklyMinutes: number;
  monthlyMinutes: number;
  completedSessionsCount: number;
} {
  const weekAgo = referenceNow.getTime() - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = referenceNow.getTime() - 30 * 24 * 60 * 60 * 1000;

  let weeklyMinutes = 0;
  let monthlyMinutes = 0;
  let completedSessionsCount = 0;

  for (const s of sessions) {
    if (s.status !== "completed") continue;
    completedSessionsCount += 1;
    const mins = s.actualDurationMinutes ?? s.durationMinutes ?? 0;
    const dt = new Date(`${s.scheduledDate}T12:00:00Z`).getTime();
    if (dt >= weekAgo) weeklyMinutes += mins;
    if (dt >= monthAgo) monthlyMinutes += mins;
  }

  return { weeklyMinutes, monthlyMinutes, completedSessionsCount };
}
