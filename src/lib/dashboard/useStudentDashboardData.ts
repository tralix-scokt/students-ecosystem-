"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchStudentDashboard,
  markDashboardNotificationsRead,
} from "@/lib/dashboard/dashboardService";
import type { StudentDashboardPayload } from "@/types/dashboard";

export interface UseStudentDashboardResult {
  status: "loading" | "ready" | "error";
  isRetrying: boolean;
  data: StudentDashboardPayload | null;
  errorMessage: string | null;
  retry: () => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
}

export function useStudentDashboardData(): UseStudentDashboardResult {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [isRetrying, setIsRetrying] = useState(false);
  const [data, setData] = useState<StudentDashboardPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async (asRetry = false) => {
    if (asRetry) {
      setIsRetrying(true);
    } else {
      setStatus("loading");
    }
    setErrorMessage(null);

    const res = await fetchStudentDashboard();

    if (res.status === "unauthenticated") {
      setIsRetrying(false);
      routerRef.current.replace("/login?next=/dashboard");
      return;
    }

    if (res.status === "unverified-email") {
      setIsRetrying(false);
      const emailParam = res.email
        ? `?email=${encodeURIComponent(res.email)}`
        : "";
      routerRef.current.replace(`/verify-email${emailParam}`);
      return;
    }

    if (res.status === "error") {
      setIsRetrying(false);
      setErrorMessage(res.message);
      setStatus("error");
      return;
    }

    // Missing or incomplete academic profile -> guide learner smoothly to Onboarding
    if (
      !res.data.academicProfile ||
      !res.data.academicProfile.onboarding_completed
    ) {
      setIsRetrying(false);
      routerRef.current.replace("/onboarding");
      return;
    }

    setData(res.data);
    setIsRetrying(false);
    setStatus("ready");
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadDashboard(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadDashboard]);

  const retry = useCallback(async () => {
    await loadDashboard(true);
  }, [loadDashboard]);

  const markAllNotificationsRead = useCallback(async () => {
    const ok = await markDashboardNotificationsRead({ markAll: true });
    if (ok) {
      const nowIso = new Date().toISOString();
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          unreadNotificationCount: 0,
          notifications: prev.notifications.map((n) => ({
            ...n,
            is_read: true,
            read_at: n.read_at ?? nowIso,
          })),
        };
      });
    }
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    const ok = await markDashboardNotificationsRead({ notificationId: id });
    if (ok) {
      const nowIso = new Date().toISOString();
      setData((prev) => {
        if (!prev) return prev;
        const updated = prev.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true, read_at: n.read_at ?? nowIso } : n
        );
        const unreadCount = updated.filter((n) => !n.is_read).length;
        return {
          ...prev,
          unreadNotificationCount: unreadCount,
          notifications: updated,
        };
      });
    }
  }, []);

  return {
    status,
    isRetrying,
    data,
    errorMessage,
    retry,
    markAllNotificationsRead,
    markNotificationRead,
  };
}
