"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  BookOpen,
  Edit3,
  FilePlus2,
  FileText,
  Loader2,
  Pin,
  Search,
  Trash2,
  WifiOff,
} from "lucide-react";
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { useStudentDashboardData } from "@/lib/dashboard/useStudentDashboardData";
import {
  fetchStudentNotes,
  filterAndSortNotes,
  type StudentNoteItem,
} from "@/lib/notes/notesService";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function MyNotesWorkspaceClient() {
  const { status, isRetrying, data, errorMessage, retry } =
    useStudentDashboardData();

  const [notes, setNotes] = useState<StudentNoteItem[]>([]);
  const [fromOfflineCache, setFromOfflineCache] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);

  // Editor state
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("General");
  const [tagsInput, setTagsInput] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const reloadNotes = useCallback(async () => {
    const res = await fetchStudentNotes();
    setNotes(res.notes);
    setFromOfflineCache(res.fromOfflineCache);
    setLoadingNotes(false);
  }, []);

  useEffect(() => {
    if (status === "ready") {
      const defSubj =
        data?.academicProfile?.selected_subjects?.[0] || "General";
      setSubject(defSubj);
      reloadNotes();
    }
  }, [status, data?.academicProfile?.selected_subjects, reloadNotes]);

  const subjectOptions = useMemo(() => {
    const set = new Set<string>(["General"]);
    for (const s of data?.academicProfile?.selected_subjects || []) set.add(s);
    for (const n of notes) set.add(n.subject);
    return Array.from(set);
  }, [data?.academicProfile?.selected_subjects, notes]);

  const visibleNotes = useMemo(
    () =>
      filterAndSortNotes({
        notes,
        query: searchQuery,
        subject: subjectFilter,
        onlyBookmarked,
      }),
    [notes, onlyBookmarked, searchQuery, subjectFilter]
  );

  const handleStartNewNote = () => {
    setSelectedNoteId(null);
    setTitle("");
    setDescription("");
    setContent("");
    setTagsInput("");
    setFeedback(null);
  };

  const handleOpenNote = (n: StudentNoteItem) => {
    setSelectedNoteId(n.id);
    setTitle(n.title);
    setDescription(n.description || "");
    setSubject(n.subject);
    setTagsInput(n.tags.join(", "));
    setContent(n.content);
    setFeedback(null);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setFeedback(null);

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setSaving(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const parsedTags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10);

    if (selectedNoteId) {
      const { error } = await supabase
        .from("student_notes")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          subject: subject.trim() || "General",
          tags: parsedTags,
          content,
        })
        .eq("id", selectedNoteId);
      setSaving(false);
      if (!error) {
        setFeedback("Note updated.");
        await reloadNotes();
      }
    } else {
      const { data: created, error } = await supabase
        .from("student_notes")
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          subject: subject.trim() || "General",
          tags: parsedTags,
          content,
        })
        .select("id")
        .single();
      setSaving(false);
      if (!error && created?.id) {
        setSelectedNoteId(String(created.id));
        setFeedback("Note saved privately to your study notebook.");
        await reloadNotes();
      }
    }
  };

  const handleTogglePin = async (n: StudentNoteItem) => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    await supabase
      .from("student_notes")
      .update({ is_pinned: !n.isPinned })
      .eq("id", n.id);
    await reloadNotes();
  };

  const handleToggleBookmark = async (n: StudentNoteItem) => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    await supabase
      .from("student_notes")
      .update({ is_bookmarked: !n.isBookmarked })
      .eq("id", n.id);
    await reloadNotes();
  };

  const handleDeleteNote = async (id: string) => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    await supabase.from("student_notes").delete().eq("id", id);
    if (selectedNoteId === id) {
      handleStartNewNote();
    }
    await reloadNotes();
  };

  if (status === "loading") return <DashboardSkeleton />;
  if (status === "error" || !data) {
    return (
      <DashboardErrorState
        message={errorMessage || "Unable to load My Notes."}
        isRetrying={isRetrying}
        onRetry={retry}
      />
    );
  }

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
        <section className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-electric-400/30 bg-electric-500/10 px-3 py-1 text-xs font-medium text-electric-300">
                <FileText className="h-3.5 w-3.5" />
                <span>Private RLS Study Notebook • Offline Cached</span>
              </div>
              <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                My Study Notes
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                Organize personal study notes by subject, pin key formulas, tag
                topics, and save takeaways directly from lessons or AI Tutor.
              </p>
            </div>

            <button
              type="button"
              onClick={handleStartNewNote}
              className="inline-flex items-center gap-2 rounded-xl bg-electric-500 px-4 py-2.5 text-xs font-bold text-obsidian-950 hover:bg-electric-400"
            >
              <FilePlus2 className="h-4 w-4" />
              New Note
            </button>
          </div>

          {fromOfflineCache && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-200">
              <WifiOff className="h-4 w-4 shrink-0" />
              <span>
                Offline Mode: Showing your locally cached notes. Edits will
                resume when connectivity returns.
              </span>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Search, Filter & Note List */}
          <aside className="space-y-4 rounded-2xl border border-white/10 bg-obsidian-900/80 p-4 lg:col-span-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="search"
                aria-label="Search notes"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, tags, or note content..."
                className="w-full rounded-xl border border-white/15 bg-obsidian-950 py-2 pl-9 pr-3 text-xs text-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filter notes by subject"
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="flex-1 rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
              >
                <option value="all">All Subjects ({notes.length})</option>
                {subjectOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setOnlyBookmarked((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold ${
                  onlyBookmarked
                    ? "border-amber-400 bg-amber-500/15 text-amber-200"
                    : "border-white/15 bg-obsidian-950 text-slate-300"
                }`}
              >
                <Bookmark className="h-3.5 w-3.5" />
                Bookmarked
              </button>
            </div>

            <div className="max-h-[480px] space-y-2.5 overflow-y-auto pr-1">
              {loadingNotes ? (
                <div className="flex items-center justify-center py-10 text-xs text-slate-300">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-electric-400" />
                  Loading notes...
                </div>
              ) : visibleNotes.length === 0 ? (
                <p className="py-10 text-center text-xs text-slate-400">
                  No matching notes yet. Create your first note on the right or
                  save takeaways from any lesson!
                </p>
              ) : (
                visibleNotes.map((n) => {
                  const active = n.id === selectedNoteId;
                  return (
                    <div
                      key={n.id}
                      className={`rounded-xl border p-3.5 transition ${
                        active
                          ? "border-electric-400 bg-electric-500/10"
                          : "border-white/10 bg-obsidian-950/80 hover:border-white/25"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenNote(n)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex items-center gap-1.5">
                            {n.isPinned && (
                              <Pin className="h-3 w-3 shrink-0 text-electric-300" />
                            )}
                            <p className="truncate text-xs font-bold text-white">
                              {n.title}
                            </p>
                          </div>
                          {n.description && (
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-300">
                              {n.description}
                            </p>
                          )}
                          <p className="mt-1 text-[11px] text-slate-400">
                            {n.subject} • Updated{" "}
                            {new Date(n.updatedAt).toLocaleDateString()}
                          </p>
                        </button>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            aria-label={`Pin ${n.title}`}
                            onClick={() => handleTogglePin(n)}
                            className={`rounded p-1 ${
                              n.isPinned
                                ? "text-electric-300"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            <Pin className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Bookmark ${n.title}`}
                            onClick={() => handleToggleBookmark(n)}
                            className={`rounded p-1 ${
                              n.isBookmarked
                                ? "text-amber-300"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            <Bookmark className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${n.title}`}
                            onClick={() => handleDeleteNote(n.id)}
                            className="rounded p-1 text-slate-400 hover:text-red-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {n.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {n.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-300"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}

                      {n.sourceCourseSlug && n.sourceLessonSlug && (
                        <Link
                          href={`/dashboard/learn/courses/${n.sourceCourseSlug}/lessons/${n.sourceLessonSlug}`}
                          className="mt-2 inline-flex items-center gap-1 text-[11px] text-electric-300 hover:underline"
                        >
                          <BookOpen className="h-3 w-3" />
                          Open Source Lesson
                        </Link>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* Clean Mobile-Friendly Note Editor */}
          <form
            onSubmit={handleSaveNote}
            className="space-y-4 rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 sm:p-6 lg:col-span-7"
          >
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold text-white">
                <Edit3 className="h-4 w-4 text-electric-400" />
                <span>
                  {selectedNoteId ? "Edit Study Note" : "Create New Study Note"}
                </span>
              </h2>
              {feedback && (
                <span className="text-xs font-medium text-emerald-300">
                  {feedback}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="note-title"
                  className="block text-xs text-slate-300"
                >
                  Note Title
                </label>
                <input
                  id="note-title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Equations of Uniformly Accelerated Motion"
                  className="mt-1 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="note-subject"
                  className="block text-xs text-slate-300"
                >
                  Subject
                </label>
                <select
                  id="note-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-sm text-white"
                >
                  {subjectOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="note-desc"
                  className="block text-xs text-slate-300"
                >
                  Short Summary / Description
                </label>
                <input
                  id="note-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief subtitle for quick scanning..."
                  className="mt-1 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="note-tags"
                  className="block text-xs text-slate-300"
                >
                  Tags (comma-separated)
                </label>
                <input
                  id="note-tags"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="formulas, exam-prep, week-2"
                  className="mt-1 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="note-content"
                className="block text-xs text-slate-300"
              >
                Study Note Content
              </label>
              <textarea
                id="note-content"
                rows={13}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write definitions, derivations, worked examples, and personal summary points..."
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-obsidian-950 p-3.5 text-sm leading-relaxed text-white focus:border-electric-400 focus:outline-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving || !title.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-electric-500 px-5 py-2.5 text-xs font-bold text-obsidian-950 hover:bg-electric-400 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{selectedNoteId ? "Save Changes" : "Save Note"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardShell>
  );
}
