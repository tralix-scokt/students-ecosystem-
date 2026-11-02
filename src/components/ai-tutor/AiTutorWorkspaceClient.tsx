"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  BookmarkPlus,
  Check,
  Copy,
  Edit3,
  History,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import { TutorRichMessageRenderer } from "@/components/ai-tutor/TutorRichMessageRenderer";
import { StudentsEcosystemCrest } from "@/components/book/StudentsEcosystemCrest";
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import {
  deleteTutorConversation,
  fetchConversationMessages,
  fetchTutorWorkspaceBootstrap,
  renameTutorConversation,
  saveStudentTutorPreferences,
  sendTutorPrompt,
} from "@/lib/ai/tutorService";
import {
  evaluateStudentPromptSafety,
  TUTOR_LEARNING_MODES,
  type TutorConversationRecord,
  type TutorExplanationStyle,
  type TutorLearningMode,
  type TutorMessageRecord,
  type TutorVisualAidPreference,
} from "@/lib/ai/types";
import { formatTutorContentForSavedNote } from "@/lib/ai/visualTeaching";
import { useStudentDashboardData } from "@/lib/dashboard/useStudentDashboardData";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function AiTutorWorkspaceClient() {
  const searchParams = useSearchParams();
  const { status, isRetrying, data, errorMessage, retry } =
    useStudentDashboardData();

  const [conversations, setConversations] = useState<TutorConversationRecord[]>(
    []
  );
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<TutorMessageRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);

  const [learningMode, setLearningMode] =
    useState<TutorLearningMode>("explain_topic");
  const [explanationStyle, setExplanationStyle] =
    useState<TutorExplanationStyle>("step_by_step");
  const [visualPreference, setVisualPreference] =
    useState<TutorVisualAidPreference>("auto");
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  const [promptInput, setPromptInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);

  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const querySubject = searchParams.get("subject") || "";
  const queryCourse = searchParams.get("course") || "";
  const queryLesson = searchParams.get("lesson") || "";

  const availableSubjects = useMemo(() => {
    const list = data?.academicProfile?.selected_subjects || [];
    const set = new Set<string>(list);
    if (querySubject) set.add(querySubject);
    return Array.from(set);
  }, [data?.academicProfile?.selected_subjects, querySubject]);

  useEffect(() => {
    let active = true;
    (async () => {
      const boot = await fetchTutorWorkspaceBootstrap();
      if (!active) return;
      setConversations(boot.conversations);
      setLearningMode(boot.preferences.preferredMode);
      setExplanationStyle(boot.preferences.explanationStyle);
      setSelectedSubject(
        querySubject ||
          boot.preferences.preferredSubject ||
          data?.academicProfile?.selected_subjects?.[0] ||
          ""
      );
      setLoadingHistory(false);
    })();
    return () => {
      active = false;
    };
  }, [data?.academicProfile?.selected_subjects, querySubject]);

  const handleSelectConversation = useCallback(
    async (conv: TutorConversationRecord) => {
      setActiveConversationId(conv.id);
      setLearningMode(conv.learningMode);
      if (conv.subject) setSelectedSubject(conv.subject);
      setSendError(null);
      setShowSidebar(false);
      setLoadingHistory(true);
      const loaded = await fetchConversationMessages(conv.id);
      setMessages(loaded);
      setLoadingHistory(false);
    },
    []
  );

  const handleNewConversation = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setSendError(null);
    setLastFailedPrompt(null);
  }, []);

  const handleModeOrStyleChange = useCallback(
    async (
      nextMode: TutorLearningMode,
      nextStyle: TutorExplanationStyle,
      nextSubject: string
    ) => {
      setLearningMode(nextMode);
      setExplanationStyle(nextStyle);
      setSelectedSubject(nextSubject);
      await saveStudentTutorPreferences({
        preferredMode: nextMode,
        explanationStyle: nextStyle,
        preferredSubject: nextSubject || null,
      });
    },
    []
  );

  const submitPrompt = useCallback(
    async (rawText: string) => {
      const safety = evaluateStudentPromptSafety(rawText);
      if (!safety.safe) {
        setSendError(safety.reason || "Invalid question.");
        return;
      }

      const trimmed = rawText.trim();
      setSendError(null);
      setLastFailedPrompt(null);
      setSending(true);

      const optimisticUserMsg: TutorMessageRecord = {
        id: `temp-user-${Date.now()}`,
        conversationId: activeConversationId || "pending",
        role: "user",
        content: trimmed,
        learningMode,
        provider: null,
        model: null,
        isAiGenerated: false,
        isVerifiedEducationalMaterial: false,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticUserMsg]);
      setPromptInput("");

      const res = await sendTutorPrompt({
        message: trimmed,
        learningMode,
        explanationStyle,
        visualPreference,
        subject: selectedSubject || null,
        conversationId: activeConversationId,
        courseSlug: queryCourse || null,
        lessonSlug: queryLesson || null,
      });

      setSending(false);

      if (!res.ok || !res.reply) {
        setMessages((prev) =>
          prev.filter((m) => m.id !== optimisticUserMsg.id)
        );
        setLastFailedPrompt(trimmed);
        setPromptInput(trimmed);
        setSendError(
          res.error ||
            "Unable to reach the AI Tutor right now. Please try again."
        );
        return;
      }

      const convId = res.conversationId || activeConversationId || "session";
      setActiveConversationId(convId);

      const assistantMsg: TutorMessageRecord = {
        id: `msg-ai-${Date.now()}`,
        conversationId: convId,
        role: "assistant",
        content: res.reply,
        learningMode,
        provider: res.provider || "ai",
        model: res.model || null,
        isAiGenerated: true,
        isVerifiedEducationalMaterial: false,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      const refreshed = await fetchTutorWorkspaceBootstrap();
      setConversations(refreshed.conversations);
      setTimeout(() => {
        if (typeof messagesEndRef.current?.scrollIntoView === "function") {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 60);
    },
    [
      activeConversationId,
      explanationStyle,
      learningMode,
      queryCourse,
      queryLesson,
      selectedSubject,
      visualPreference,
    ]
  );

  const handleCopyMessage = useCallback(async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(
        formatTutorContentForSavedNote(content)
      );
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard blocked
    }
  }, []);

  const handleSaveReplyToNotes = useCallback(
    async (msg: TutorMessageRecord) => {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const modeLabel =
        TUTOR_LEARNING_MODES.find((m) => m.id === msg.learningMode)
          ?.shortLabel || "AI Study";
      const readableContent = formatTutorContentForSavedNote(msg.content);

      const { error } = await supabase.from("student_notes").insert({
        user_id: user.id,
        title: `${selectedSubject || "Study"} — ${modeLabel} Note`,
        description: "Saved from AI Tutor",
        content: `[AI-Generated Study Note]\n\n${readableContent}`,
        subject: selectedSubject || "General",
        tags: ["ai-tutor", msg.learningMode.replace(/_/g, "-")],
      });

      if (!error) {
        setSavedNoteId(msg.id);
        setTimeout(() => setSavedNoteId(null), 2500);
      }
    },
    [selectedSubject]
  );

  const handleRenameSubmit = useCallback(
    async (id: string) => {
      const ok = await renameTutorConversation(id, editingTitle);
      if (ok) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, title: editingTitle.trim() } : c
          )
        );
      }
      setEditingConvId(null);
      setEditingTitle("");
    },
    [editingTitle]
  );

  const handleDeleteConv = useCallback(
    async (id: string) => {
      const ok = await deleteTutorConversation(id);
      if (ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversationId === id) {
          handleNewConversation();
        }
      }
    },
    [activeConversationId, handleNewConversation]
  );

  if (status === "loading") return <DashboardSkeleton />;
  if (status === "error" || !data) {
    return (
      <DashboardErrorState
        message={errorMessage || "Unable to load AI Tutor workspace."}
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
      <div className="flex h-[calc(100vh-8.5rem)] min-h-[540px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-obsidian-950/90">
        {/* Clean Minimal Toolbar */}
        <header className="flex flex-wrap items-center justify-between gap-2.5 border-b border-white/10 bg-obsidian-900/75 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowSidebar((prev) => !prev)}
              aria-label="Toggle saved conversations"
              aria-expanded={showSidebar}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                showSidebar
                  ? "border-electric-400/50 bg-electric-500/15 text-electric-200"
                  : "border-white/10 bg-obsidian-950/80 text-slate-300 hover:border-white/20 hover:text-white"
              }`}
            >
              <History className="h-3.5 w-3.5 text-electric-400" />
              <span>Chats</span>
              {conversations.length > 0 && (
                <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] text-slate-300">
                  {conversations.length}
                </span>
              )}
            </button>

            <h1 className="font-display text-base font-bold tracking-tight text-white sm:text-lg">
              AI Tutor
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Compact Mode Selector */}
            <label htmlFor="tutor-mode-select" className="sr-only">
              Tutor mode
            </label>
            <select
              id="tutor-mode-select"
              aria-label="Tutor mode"
              value={learningMode}
              onChange={(e) =>
                handleModeOrStyleChange(
                  e.target.value as TutorLearningMode,
                  explanationStyle,
                  selectedSubject
                )
              }
              className="rounded-xl border border-white/10 bg-obsidian-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-electric-400 focus:outline-none"
            >
              {TUTOR_LEARNING_MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.shortLabel}
                </option>
              ))}
            </select>

            {/* Compact Subject Selector */}
            <label htmlFor="tutor-subject-select" className="sr-only">
              Subject
            </label>
            <select
              id="tutor-subject-select"
              aria-label="Subject"
              value={selectedSubject}
              onChange={(e) =>
                handleModeOrStyleChange(
                  learningMode,
                  explanationStyle,
                  e.target.value
                )
              }
              className="rounded-xl border border-white/10 bg-obsidian-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-electric-400 focus:outline-none"
            >
              <option value="">All Subjects</option>
              {availableSubjects.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
            </select>

            {/* Compact Visual Aids Selector */}
            <label htmlFor="tutor-visual-select" className="sr-only">
              Visual aids
            </label>
            <select
              id="tutor-visual-select"
              aria-label="Visual aids"
              value={visualPreference}
              onChange={(e) =>
                setVisualPreference(e.target.value as TutorVisualAidPreference)
              }
              className="rounded-xl border border-white/10 bg-obsidian-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-electric-400 focus:outline-none"
            >
              <option value="auto">Visuals: Auto</option>
              <option value="always">Visuals: On</option>
              <option value="none">Visuals: Off</option>
            </select>

            <button
              type="button"
              onClick={handleNewConversation}
              className="inline-flex items-center gap-1.5 rounded-xl bg-electric-500 px-3.5 py-1.5 text-xs font-semibold text-obsidian-950 transition hover:bg-electric-400"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              <span>New Chat</span>
            </button>
          </div>
        </header>

        {/* Main Workspace Split */}
        <div className="relative flex min-h-0 flex-1">
          {/* Collapsible Saved Chats Drawer */}
          {showSidebar && (
            <aside className="w-64 shrink-0 overflow-y-auto border-r border-white/10 bg-obsidian-900/90 p-3 sm:w-72">
              <div className="space-y-1.5">
                {conversations.map((conv) => {
                  const isSelected = conv.id === activeConversationId;
                  const isEditing = editingConvId === conv.id;
                  return (
                    <div
                      key={conv.id}
                      className={`rounded-xl border p-2.5 transition ${
                        isSelected
                          ? "border-electric-400/60 bg-electric-500/10"
                          : "border-white/5 bg-obsidian-950/60 hover:border-white/15"
                      }`}
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            aria-label="Rename conversation"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="w-full rounded border border-electric-400/50 bg-obsidian-900 px-2 py-1 text-xs text-white"
                          />
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleRenameSubmit(conv.id)}
                              className="rounded bg-electric-500 px-2 py-1 text-[11px] font-semibold text-obsidian-950"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingConvId(null)}
                              className="rounded bg-white/10 px-2 py-1 text-[11px] text-slate-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectConversation(conv)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p className="truncate text-xs font-medium text-white">
                              {conv.title}
                            </p>
                          </button>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              aria-label={`Rename ${conv.title}`}
                              onClick={() => {
                                setEditingConvId(conv.id);
                                setEditingTitle(conv.title);
                              }}
                              className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${conv.title}`}
                              onClick={() => handleDeleteConv(conv.id)}
                              className="rounded p-1 text-slate-400 hover:bg-red-500/20 hover:text-red-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>
          )}

          {/* Clean Distraction-Free Chat Canvas */}
          <section className="flex min-w-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
              {loadingHistory && activeConversationId ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2
                    className="h-5 w-5 animate-spin text-electric-400"
                    aria-label="Loading conversation"
                  />
                </div>
              ) : messages.length === 0 ? (
                /* Pure Clean Empty Canvas — Zero Text, Zero Made-Up Prompts */
                <div className="flex h-full items-center justify-center">
                  <StudentsEcosystemCrest
                    size="lg"
                    className="opacity-70 transition-opacity hover:opacity-95"
                  />
                </div>
              ) : (
                <div className="mx-auto max-w-3xl space-y-5">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`rounded-2xl p-4 text-sm ${
                          msg.role === "user"
                            ? "max-w-xl border border-electric-400/40 bg-electric-500/15 text-white"
                            : "w-full border border-white/10 bg-obsidian-900/85 text-slate-100"
                        }`}
                      >
                        {msg.role === "assistant" && (
                          <div className="mb-3 flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                            <span className="text-[11px] font-medium text-electric-300">
                              AI Tutor
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyMessage(msg.id, msg.content)
                                }
                                className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/10 hover:text-white"
                              >
                                {copiedId === msg.id ? (
                                  <>
                                    <Check className="h-3 w-3 text-emerald-400" />
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveReplyToNotes(msg)}
                                className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/10 hover:text-white"
                              >
                                {savedNoteId === msg.id ? (
                                  <>
                                    <Check className="h-3 w-3 text-emerald-400" />
                                    <span>Saved</span>
                                  </>
                                ) : (
                                  <>
                                    <BookmarkPlus className="h-3 w-3" />
                                    <span>Save</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {msg.role === "assistant" ? (
                          <TutorRichMessageRenderer
                            content={msg.content}
                            allowVisualFallback={visualPreference !== "none"}
                          />
                        ) : (
                          <div className="whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {sending && (
                    <div className="flex items-center gap-2 rounded-xl border border-electric-400/20 bg-obsidian-900/70 px-4 py-3 text-xs text-electric-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  )}

                  {sendError && (
                    <div
                      role="alert"
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3.5 text-xs text-red-200"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-red-300" />
                        <span>{sendError}</span>
                      </div>
                      {lastFailedPrompt && (
                        <button
                          type="button"
                          onClick={() => submitPrompt(lastFailedPrompt)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1.5 font-semibold text-red-100 hover:bg-red-500/30"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Retry</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Clean Minimal Composer Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!sending && promptInput.trim()) {
                  submitPrompt(promptInput);
                }
              }}
              className="border-t border-white/10 bg-obsidian-900/65 px-4 py-3.5 sm:px-8"
            >
              <div className="mx-auto flex max-w-3xl items-end gap-2.5">
                <div className="flex-1">
                  <label htmlFor="ai-tutor-prompt" className="sr-only">
                    Ask your academic question
                  </label>
                  <textarea
                    id="ai-tutor-prompt"
                    rows={1}
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (!sending && promptInput.trim().length >= 2) {
                          submitPrompt(promptInput);
                        }
                      }
                    }}
                    placeholder="Ask a question..."
                    disabled={sending}
                    className="min-h-[46px] max-h-36 w-full resize-none rounded-2xl border border-white/15 bg-obsidian-950 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-electric-400 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending || promptInput.trim().length < 2}
                  aria-label="Send"
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-electric-500 px-5 py-3 text-sm font-semibold text-obsidian-950 transition hover:bg-electric-400 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span>Send</span>
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
