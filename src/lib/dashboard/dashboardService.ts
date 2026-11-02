import { queryStudentDashboardData } from "@/lib/dashboard/queryDashboard";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { StudentDashboardPayload } from "@/types/dashboard";

interface ServerDashboardApiResponse {
  ok: boolean;
  status?: "unauthorized" | "unverified-email" | "unconfigured" | "error";
  email?: string;
  message?: string;
  delegateToBrowser?: boolean;
  payload?: StudentDashboardPayload;
}

export type FetchDashboardResult =
  | { status: "ok"; data: StudentDashboardPayload }
  | { status: "unauthenticated" }
  | { status: "unverified-email"; email?: string }
  | { status: "error"; message: string };

export async function fetchStudentDashboard(): Promise<FetchDashboardResult> {
  try {
    const res = await fetch("/api/dashboard", {
      method: "GET",
      cache: "no-store",
    });
    const json = (await res.json()) as ServerDashboardApiResponse;

    if (json.ok && !json.delegateToBrowser && json.payload) {
      return { status: "ok", data: json.payload };
    }

    if (!json.ok) {
      if (json.status === "unauthorized") {
        return { status: "unauthenticated" };
      }
      if (json.status === "unverified-email") {
        return { status: "unverified-email", email: json.email };
      }
      if (!json.delegateToBrowser) {
        return {
          status: "error",
          message:
            json.message ??
            "Unable to load your dashboard right now. Please retry.",
        };
      }
    }
  } catch {
    // Fallback to live browser RLS query if server endpoint encountered a network issue
  }

  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return {
      status: "error",
      message:
        "Supabase environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured.",
    };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { status: "unauthenticated" };
  }

  if (!userData.user.email_confirmed_at) {
    return { status: "unverified-email", email: userData.user.email };
  }

  try {
    const payload = await queryStudentDashboardData(
      supabase,
      userData.user.id,
      userData.user.email ?? ""
    );
    return { status: "ok", data: payload };
  } catch {
    return {
      status: "error",
      message:
        "We couldn’t retrieve your academic dashboard records from Supabase. Please check your connection and retry.",
    };
  }
}

export async function markDashboardNotificationsRead(options: {
  notificationId?: string;
  markAll?: boolean;
}): Promise<boolean> {
  try {
    const res = await fetch("/api/dashboard/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });
    const json = (await res.json()) as {
      ok: boolean;
      delegateToBrowser?: boolean;
    };
    if (json.ok && !json.delegateToBrowser) {
      return true;
    }
  } catch {
    // Fallback to browser RLS update below
  }

  const supabase = createBrowserSupabaseClient();
  if (!supabase) return false;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  const nowIso = new Date().toISOString();
  let query = supabase
    .from("student_notifications")
    .update({ is_read: true, read_at: nowIso })
    .eq("user_id", userData.user.id);

  if (!options.markAll && options.notificationId) {
    query = query.eq("id", options.notificationId);
  } else {
    query = query.eq("is_read", false);
  }

  const { error } = await query;
  return !error;
}
