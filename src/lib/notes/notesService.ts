import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export interface StudentNoteItem {
  id: string;
  title: string;
  description: string | null;
  content: string;
  subject: string;
  tags: string[];
  isPinned: boolean;
  isBookmarked: boolean;
  sourceCourseSlug: string | null;
  sourceLessonSlug: string | null;
  sourceLessonTitle: string | null;
  createdAt: string;
  updatedAt: string;
}

const LEGACY_UNSCOPED_NOTES_CACHE_KEY = "elearning.offline_saved_notes.v1";
const OFFLINE_NOTES_CACHE_PREFIX = "elearning.offline_saved_notes.v2:";

export function getUserScopedNotesCacheKey(userId: string): string {
  return `${OFFLINE_NOTES_CACHE_PREFIX}${userId}`;
}

export function clearAllOfflineNotesCaches(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_UNSCOPED_NOTES_CACHE_KEY);
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(OFFLINE_NOTES_CACHE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      window.localStorage.removeItem(k);
    }
  } catch {
    // Ignore storage access restrictions
  }
}

export function cacheNotesOffline(userId: string, notes: StudentNoteItem[]) {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.removeItem(LEGACY_UNSCOPED_NOTES_CACHE_KEY);
    window.localStorage.setItem(
      getUserScopedNotesCacheKey(userId),
      JSON.stringify(notes.slice(0, 50))
    );
  } catch {
    // Storage quota exceeded — ignore gracefully
  }
}

export function readOfflineCachedNotes(
  userId?: string | null
): StudentNoteItem[] {
  if (typeof window === "undefined") return [];
  try {
    // Always purge legacy unscoped v1 cache to prevent shared-device cross-user leakage
    window.localStorage.removeItem(LEGACY_UNSCOPED_NOTES_CACHE_KEY);
    if (!userId) return [];
    const raw = window.localStorage.getItem(getUserScopedNotesCacheKey(userId));
    return raw ? (JSON.parse(raw) as StudentNoteItem[]) : [];
  } catch {
    return [];
  }
}

async function resolveCurrentSessionUserId(
  supabase: NonNullable<ReturnType<typeof createBrowserSupabaseClient>>
): Promise<string | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) return user.id;
  } catch {
    // Offline fallback to locally stored session JWT
  }
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData?.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function fetchStudentNotes(): Promise<{
  notes: StudentNoteItem[];
  fromOfflineCache: boolean;
}> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return { notes: [], fromOfflineCache: true };
  }

  const userId = await resolveCurrentSessionUserId(supabase);
  if (!userId) {
    return { notes: [], fromOfflineCache: false };
  }

  try {
    const { data, error } = await supabase
      .from("student_notes")
      .select("*")
      .eq("user_id", userId)
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(150);

    if (error) {
      return { notes: readOfflineCachedNotes(userId), fromOfflineCache: true };
    }

    const mapped: StudentNoteItem[] = (data || []).map(
      (r: Record<string, unknown>) => ({
        id: String(r.id),
        title: String(r.title),
        description: r.description ? String(r.description) : null,
        content: String(r.content || ""),
        subject: String(r.subject || "General"),
        tags: Array.isArray(r.tags) ? r.tags.map(String) : [],
        isPinned: Boolean(r.is_pinned),
        isBookmarked: Boolean(r.is_bookmarked),
        sourceCourseSlug: r.source_course_slug
          ? String(r.source_course_slug)
          : null,
        sourceLessonSlug: r.source_lesson_slug
          ? String(r.source_lesson_slug)
          : null,
        sourceLessonTitle: r.source_lesson_title
          ? String(r.source_lesson_title)
          : null,
        createdAt: String(r.created_at),
        updatedAt: String(r.updated_at),
      })
    );

    cacheNotesOffline(userId, mapped);
    return { notes: mapped, fromOfflineCache: false };
  } catch {
    return { notes: readOfflineCachedNotes(userId), fromOfflineCache: true };
  }
}

export function filterAndSortNotes(params: {
  notes: StudentNoteItem[];
  query: string;
  subject: string;
  onlyBookmarked: boolean;
}): StudentNoteItem[] {
  const q = params.query.trim().toLowerCase();
  const subj = params.subject.trim().toLowerCase();

  return [...params.notes]
    .filter((n) => {
      if (params.onlyBookmarked && !n.isBookmarked) return false;
      if (subj && subj !== "all" && n.subject.toLowerCase() !== subj) {
        return false;
      }
      if (!q) return true;
      const haystack = `${n.title} ${n.description || ""} ${n.content} ${n.subject} ${n.tags.join(" ")}`.toLowerCase();
      return haystack.includes(q);
    })
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
}

export async function saveLessonToPersonalNotes(params: {
  lessonTitle: string;
  subject: string;
  summary: string;
  keyTakeaways: string[];
  courseSlug: string;
  lessonSlug: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase client unavailable." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Authentication required." };

  const takeawaysBlock =
    params.keyTakeaways.length > 0
      ? `\n\nKey Takeaways:\n${params.keyTakeaways.map((t) => `• ${t}`).join("\n")}`
      : "";

  const { error } = await supabase.from("student_notes").insert({
    user_id: user.id,
    title: `Lesson Notes: ${params.lessonTitle}`,
    description: `Saved from ${params.subject} lesson`,
    content: `${params.summary}${takeawaysBlock}`,
    subject: params.subject,
    tags: ["lesson-extract", params.subject.toLowerCase().replace(/\s+/g, "-")],
    source_course_slug: params.courseSlug,
    source_lesson_slug: params.lessonSlug,
    source_lesson_title: params.lessonTitle,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
