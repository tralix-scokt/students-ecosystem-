"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  BookmarkPlus,
  Bot,
  Check,
  Copy,
  Edit3,
  Eye,
  GraduationCap,
  History,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";
import { TutorRichMessageRenderer } from "@/components/ai-tutor/TutorRichMessageRenderer";
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

const QUICK_BASIC_QUESTIONS = [
  "What is 15% of 240? Show me simply.",
  "Explain photosynthesis with a labeled diagram.",
  "What is an atom made of? Show a picture.",
  "Explain nouns vs verbs with simple examples.",
];

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
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);

  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const querySubject = searchParams.get("subject") || "";
  const queryTopic = searchParams.get("topic") || "";
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
      if (queryTopic) {
        setPromptInput(
          `Teach me "${queryTopic}" like a real classroom teacher with a clear diagram and worked example.`
        );
      }
      setLoadingHistory(false);
    })();
    return () => {
      active = false;
    };
  }, [data?.academicProfile?.selected_subjects, querySubject, queryTopic]);

  const handleSelectConversation = useCallback(
    async (conv: TutorConversationRecord) => {
      setActiveConversationId(conv.id);
      setLearningMode(conv.learningMode);
      if (conv.subject) setSelectedSubject(conv.subject);
      setSendError(null);
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
    setSuggestedQuestions([]);
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
      if (typeof res.remainingDailyQuota === "number") {
        setRemainingQuota(res.remainingDailyQuota);
      }

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
      setSuggestedQuestions(res.suggestedQuestions || []);

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
        description: "Saved from TRALIX AI Tutor (AI-generated study note)",
        content: `[AI-Generated Study Note — Verify formulas against course material]\n\n${readableContent}`,
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

  const currentModeMeta =
    TUTOR_LEARNING_MODES.find((m) => m.id === learningMode) ||
    TUTOR_LEARNING_MODES[0];

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
        {/* Header & Honest AI Provenance Notice */}
        <section className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-electric-400/30 bg-electric-500/10 px-3 py-1 text-xs font-medium text-electric-300">
                <GraduationCap className="h-3.5 w-3.5" />
                <span>
                  TRALIX Classroom Teacher • Visual Diagrams & Pictures • 6 Modes
                </span>
              </div>
              <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Personalized AI Study Tutor
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                Adapted to your{" "}
                <span className="font-medium text-electric-300">
                  {data.academicProfile?.academic_category || "academic"}
                </span>{" "}
                pathway. Ask anything from quick basic questions to deep topics
                explained like a real classroom teacher—with labeled diagrams
                and illustrated pictures whenever helpful.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {remainingQuota !== null && (
                <span className="rounded-xl border border-white/10 bg-obsidian-950/80 px-3 py-2 text-xs text-slate-300">
                  Daily AI quota remaining:{" "}
                  <strong className="text-electric-300">{remainingQuota}</strong>
                </span>
              )}
              <button
                type="button"
                onClick={handleNewConversation}
                className="inline-flex items-center gap-2 rounded-xl bg-electric-500 px-4 py-2.5 text-xs font-semibold text-obsidian-950 transition hover:bg-electric-400"
              >
                <MessageSquarePlus className="h-4 w-4" />
                New Study Chat
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <span>
              <strong>AI Transparency Notice:</strong> Tutor responses and
              whiteboard diagrams are{" "}
              <span className="underline">AI-generated study guidance</span> and
              are not a substitute for verified syllabus documents or official
              examiner rulings. Always cross-check critical formulas in your
              verified Learning Space courses.
            </span>
          </div>
        </section>

        {/* 6 Dedicated Learning Modes Selector */}
        <section aria-label="AI Tutor Learning Modes">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
            {TUTOR_LEARNING_MODES.map((mode) => {
              const active = mode.id === learningMode;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() =>
                    handleModeOrStyleChange(
                      mode.id,
                      explanationStyle,
                      selectedSubject
                    )
                  }
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-electric-400 bg-electric-500/15 text-white shadow-sm"
                      : "border-white/10 bg-obsidian-900/60 text-slate-300 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <span className="text-xs font-semibold">{mode.label}</span>
                  <span className="mt-1 line-clamp-2 text-[11px] text-slate-400">
                    {mode.description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Main Workspace Split: Conversation History + Active Tutor Chat */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Saved Conversations Sidebar */}
          <aside className="rounded-2xl border border-white/10 bg-obsidian-900/75 p-4 lg:col-span-4 xl:col-span-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <History className="h-4 w-4 text-electric-400" />
                <span>Saved Conversations</span>
              </div>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">
                {conversations.length}
              </span>
            </div>

            {/* Subject, Style & Visual Aids Controls */}
            <div className="mt-3 space-y-2.5 border-b border-white/10 pb-3.5">
              <div>
                <label
                  htmlFor="tutor-subject-select"
                  className="block text-[11px] font-medium uppercase tracking-wider text-slate-400"
                >
                  Subject Context
                </label>
                <select
                  id="tutor-subject-select"
                  value={selectedSubject}
                  onChange={(e) =>
                    handleModeOrStyleChange(
                      learningMode,
                      explanationStyle,
                      e.target.value
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-white/15 bg-obsidian-950 px-2.5 py-2 text-xs text-white focus:border-electric-400 focus:outline-none"
                >
                  <option value="">General / All Subjects & Basic Q&A</option>
                  {availableSubjects.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="tutor-style-select"
                  className="block text-[11px] font-medium uppercase tracking-wider text-slate-400"
                >
                  Explanation Depth
                </label>
                <select
                  id="tutor-style-select"
                  value={explanationStyle}
                  onChange={(e) =>
                    handleModeOrStyleChange(
                      learningMode,
                      e.target.value as TutorExplanationStyle,
                      selectedSubject
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-white/15 bg-obsidian-950 px-2.5 py-2 text-xs text-white focus:border-electric-400 focus:outline-none"
                >
                  <option value="step_by_step">
                    Teacher Step-by-Step Breakdown
                  </option>
                  <option value="standard">Balanced Everyday + Academic</option>
                  <option value="concise">Quick & Direct Answer</option>
                  <option value="exam_focused">Exam-Focused Technique</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="tutor-visual-select"
                  className="block text-[11px] font-medium uppercase tracking-wider text-slate-400"
                >
                  Diagrams & Pictures
                </label>
                <select
                  id="tutor-visual-select"
                  value={visualPreference}
                  onChange={(e) =>
                    setVisualPreference(
                      e.target.value as TutorVisualAidPreference
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-white/15 bg-obsidian-950 px-2.5 py-2 text-xs text-white focus:border-electric-400 focus:outline-none"
                >
                  <option value="auto">
                    Auto — Draw Diagrams When Helpful
                  </option>
                  <option value="always">
                    Always Include Diagram / Picture
                  </option>
                  <option value="none">Text Only (No Diagrams)</option>
                </select>
              </div>
            </div>

            {/* Conversation History List */}
            <div className="mt-3 max-h-[380px] space-y-2 overflow-y-auto pr-1">
              {conversations.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  No saved tutor conversations yet. Ask your first question to
                  save history automatically.
                </p>
              ) : (
                conversations.map((conv) => {
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
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {conv.subject || "General"} •{" "}
                              {conv.learningMode.replace(/_/g, " ")}
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
                })
              )}
            </div>
          </aside>

          {/* Active Conversational Tutor Panel */}
          <section className="flex min-h-[560px] flex-col rounded-2xl border border-white/10 bg-obsidian-900/80 lg:col-span-8 xl:col-span-9">
            {/* Chat Thread */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
              {loadingHistory && activeConversationId ? (
                <div className="flex items-center justify-center py-16 text-sm text-slate-300">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-electric-400" />
                  Loading conversation messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="space-y-5 py-4">
                  <div className="rounded-2xl border border-electric-400/20 bg-obsidian-950/70 p-5">
                    <div className="flex items-center gap-2 text-electric-300">
                      <Sparkles className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-wider">
                        {currentModeMeta.label} • Classroom Teacher Mode
                      </span>
                    </div>
                    <h2 className="mt-1.5 text-lg font-semibold text-white">
                      What would you like me to teach or explain in{" "}
                      {selectedSubject || "your studies"} today?
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-slate-300">
                      {currentModeMeta.description} Ask a basic everyday
                      question, request a step-by-step whiteboard lesson, or ask
                      me to draw a labeled diagram or picture.
                    </p>
                  </div>

                  <div>
                    <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Suggested Teacher Lessons & Visual Prompts
                    </p>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                      {currentModeMeta.starterPrompts.map((starter) => (
                        <button
                          key={starter}
                          type="button"
                          onClick={() => submitPrompt(starter)}
                          disabled={sending}
                          className="rounded-xl border border-white/10 bg-obsidian-950/80 p-3.5 text-left text-xs text-slate-200 transition hover:border-electric-400/50 hover:text-white"
                        >
                          {starter}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Or Try a Quick Basic Question
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_BASIC_QUESTIONS.map((basic) => (
                        <button
                          key={basic}
                          type="button"
                          onClick={() => submitPrompt(basic)}
                          disabled={sending}
                          className="rounded-full border border-white/10 bg-obsidian-950/70 px-3 py-1.5 text-xs text-slate-300 transition hover:border-electric-400/45 hover:text-electric-200"
                        >
                          {basic}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`rounded-2xl p-4 text-sm ${
                        msg.role === "user"
                          ? "max-w-2xl border border-electric-400/40 bg-electric-500/20 text-white"
                          : "w-full max-w-4xl border border-white/10 bg-obsidian-950/90 text-slate-100"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-aura-500/15 px-2.5 py-0.5 text-[11px] font-medium text-aura-300">
                            <Bot className="h-3 w-3" />
                            AI-Generated Study Response • Not Official Syllabus
                            Material
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
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  Copy
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
                                  Saved to Notes
                                </>
                              ) : (
                                <>
                                  <BookmarkPlus className="h-3 w-3" />
                                  Save to Notes
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
                ))
              )}

              {sending && (
                <div className="flex items-center gap-2.5 rounded-xl border border-electric-400/20 bg-obsidian-950/70 p-4 text-xs text-electric-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    TRALIX Teacher is writing your{" "}
                    {currentModeMeta.shortLabel.toLowerCase()} lesson
                    {visualPreference !== "none"
                      ? " & preparing visual aids if needed..."
                      : "..."}
                  </span>
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
                      Retry
                    </button>
                  )}
                </div>
              )}

              {suggestedQuestions.length > 0 && !sending && (
                <div className="pt-2">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Suggested Follow-up Questions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedQuestions.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => submitPrompt(q)}
                        className="rounded-full border border-electric-400/30 bg-electric-500/10 px-3 py-1.5 text-left text-xs text-electric-200 transition hover:bg-electric-500/20"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!sending && promptInput.trim()) {
                  submitPrompt(promptInput);
                }
              }}
              className="border-t border-white/10 bg-obsidian-950/70 p-4"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>
                  Ask any basic question or full topic—press{" "}
                  <kbd className="rounded border border-white/15 bg-obsidian-900 px-1.5 py-0.5 text-[10px] text-slate-300">
                    Enter
                  </kbd>{" "}
                  to send,{" "}
                  <kbd className="rounded border border-white/15 bg-obsidian-900 px-1.5 py-0.5 text-[10px] text-slate-300">
                    Shift + Enter
                  </kbd>{" "}
                  for a new line.
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setVisualPreference((prev) =>
                      prev === "always" ? "auto" : "always"
                    )
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium transition ${
                    visualPreference === "always"
                      ? "border-electric-400 bg-electric-500/20 text-electric-200"
                      : "border-white/15 bg-obsidian-900 text-slate-300 hover:border-electric-400/40 hover:text-white"
                  }`}
                >
                  <Eye className="h-3 w-3" />
                  {visualPreference === "always"
                    ? "Always Draw Diagram: ON"
                    : "Draw Diagram When Helpful"}
                </button>
              </div>

              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label htmlFor="ai-tutor-prompt" className="sr-only">
                    Ask your academic question
                  </label>
                  <textarea
                    id="ai-tutor-prompt"
                    rows={2}
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
                    placeholder={`Ask any basic question or ${currentModeMeta.label.toLowerCase()} in ${selectedSubject || "any subject"}...`}
                    disabled={sending}
                    className="w-full resize-none rounded-xl border border-white/15 bg-obsidian-900 px-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:border-electric-400 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending || promptInput.trim().length < 2}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-electric-500 px-5 py-3 text-sm font-semibold text-obsidian-950 transition hover:bg-electric-400 disabled:cursor-not-allowed disabled:opacity-50"
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
