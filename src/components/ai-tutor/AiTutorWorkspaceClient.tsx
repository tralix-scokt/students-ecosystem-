"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  BookmarkPlus,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Edit3,
  ExternalLink,
  Globe,
  History,
  ImagePlus,
  Layers,
  Loader2,
  MessageSquarePlus,
  Mic,
  MicOff,
  Plus,
  RefreshCw,
  RotateCw,
  Send,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { TutorRichMessageRenderer } from "@/components/ai-tutor/TutorRichMessageRenderer";
import { StudentsEcosystemCrest } from "@/components/book/StudentsEcosystemCrest";
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import {
  preparePhotoFileForTutor,
  type PreparedPhotoAttachment,
} from "@/lib/ai/imageAttachment";
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
import {
  extractFlashcardsFromTutorReply,
  formatTutorContentForSavedNote,
  type InstantStudyFlashcard,
} from "@/lib/ai/visualTeaching";
import { useStudentDashboardData } from "@/lib/dashboard/useStudentDashboardData";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface BrowserSpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

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
  const [attachedImage, setAttachedImage] =
    useState<PreparedPhotoAttachment | null>(null);
  const [preparingImage, setPreparingImage] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastFailedPayload, setLastFailedPayload] = useState<{
    text: string;
    image: PreparedPhotoAttachment | null;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);

  // Voice Dictation & Read-Aloud state
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(
    null
  );
  const speechRecognitionRef = useRef<BrowserSpeechRecognitionInstance | null>(
    null
  );

  // 1-Click Instant Study Flashcards per assistant message
  const [activeFlashcards, setActiveFlashcards] = useState<{
    messageId: string;
    cards: InstantStudyFlashcard[];
    index: number;
    flipped: boolean;
  } | null>(null);

  // Follow-up suggestions from latest AI reply
  const [suggestedFollowUps, setSuggestedFollowUps] = useState<string[]>([]);

  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const photoFileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraCaptureInputRef = useRef<HTMLInputElement | null>(null);
  const plusMenuRef = useRef<HTMLDivElement | null>(null);

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

  // Close + menu on outside click
  useEffect(() => {
    if (!plusMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        plusMenuRef.current &&
        !plusMenuRef.current.contains(e.target as Node)
      ) {
        setPlusMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [plusMenuOpen]);

  // Stop speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      speechRecognitionRef.current?.stop();
    };
  }, []);

  const handleSelectConversation = useCallback(
    async (conv: TutorConversationRecord) => {
      setActiveConversationId(conv.id);
      setLearningMode(conv.learningMode);
      if (conv.subject) setSelectedSubject(conv.subject);
      setSendError(null);
      setSuggestedFollowUps([]);
      setActiveFlashcards(null);
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
    setAttachedImage(null);
    setSuggestedFollowUps([]);
    setActiveFlashcards(null);
    setSendError(null);
    setLastFailedPayload(null);
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

  const attachFileFromInput = useCallback(async (file: File | null) => {
    if (!file) return;
    setPlusMenuOpen(false);
    setSendError(null);
    setPreparingImage(true);
    try {
      const prepared = await preparePhotoFileForTutor(file);
      setAttachedImage(prepared);
    } catch (err) {
      setSendError(
        err instanceof Error
          ? err.message
          : "Unable to attach image. Please select a valid PNG, JPG, or WEBP photo."
      );
    } finally {
      setPreparingImage(false);
    }
  }, []);

  const handlePasteClipboard = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            void attachFileFromInput(file);
            return;
          }
        }
      }
    },
    [attachFileFromInput]
  );

  const handleToggleVoiceInput = useCallback(() => {
    if (typeof window === "undefined") return;
    if (isListeningVoice) {
      speechRecognitionRef.current?.stop();
      setIsListeningVoice(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => BrowserSpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => BrowserSpeechRecognitionInstance;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      setSendError(
        "Voice dictation is not supported in this browser. Try Chrome, Edge, or Safari."
      );
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.continuous = false;
      rec.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((res) => res[0]?.transcript || "")
          .join(" ")
          .trim();
        if (transcript) {
          setPromptInput((prev) =>
            prev.trim() ? `${prev.trim()} ${transcript}` : transcript
          );
        }
      };
      rec.onerror = () => setIsListeningVoice(false);
      rec.onend = () => setIsListeningVoice(false);
      speechRecognitionRef.current = rec;
      setIsListeningVoice(true);
      rec.start();
    } catch {
      setIsListeningVoice(false);
    }
  }, [isListeningVoice]);

  const handleSpeakMessage = useCallback(
    (msg: TutorMessageRecord) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        return;
      }
      if (speakingMessageId === msg.id) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
        return;
      }

      window.speechSynthesis.cancel();
      const plain = formatTutorContentForSavedNote(msg.content)
        .replace(/[#>*_`~-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const utterance = new SpeechSynthesisUtterance(plain);
      utterance.rate = 0.98;
      utterance.onend = () => setSpeakingMessageId(null);
      utterance.onerror = () => setSpeakingMessageId(null);
      setSpeakingMessageId(msg.id);
      window.speechSynthesis.speak(utterance);
    },
    [speakingMessageId]
  );

  const handleToggleFlashcards = useCallback(
    (msg: TutorMessageRecord) => {
      if (activeFlashcards?.messageId === msg.id) {
        setActiveFlashcards(null);
        return;
      }
      const cards = extractFlashcardsFromTutorReply(msg.content);
      if (cards.length > 0) {
        setActiveFlashcards({
          messageId: msg.id,
          cards,
          index: 0,
          flipped: false,
        });
      }
    },
    [activeFlashcards?.messageId]
  );

  const submitPrompt = useCallback(
    async (
      rawText: string,
      overrideImage?: PreparedPhotoAttachment | null
    ) => {
      const activeImg =
        overrideImage !== undefined ? overrideImage : attachedImage;
      const trimmed = rawText.trim();

      const effectivePrompt =
        trimmed ||
        (activeImg
          ? "Please carefully inspect this photo and explain or solve what is shown step by step."
          : "");

      const safety = evaluateStudentPromptSafety(effectivePrompt);
      if (!safety.safe) {
        setSendError(safety.reason || "Invalid question.");
        return;
      }

      setSendError(null);
      setLastFailedPayload(null);
      setSuggestedFollowUps([]);
      setSending(true);

      const optimisticUserMsg: TutorMessageRecord = {
        id: `temp-user-${Date.now()}`,
        conversationId: activeConversationId || "pending",
        role: "user",
        content: trimmed || (activeImg ? "Analyze & explain this photo" : ""),
        imageDataUrl: activeImg?.dataUrl || null,
        learningMode,
        provider: null,
        model: null,
        isAiGenerated: false,
        isVerifiedEducationalMaterial: false,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticUserMsg]);
      setPromptInput("");
      setAttachedImage(null);

      const res = await sendTutorPrompt({
        message: effectivePrompt,
        imageDataUrl: activeImg?.dataUrl || null,
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
        setLastFailedPayload({ text: trimmed, image: activeImg || null });
        setPromptInput(trimmed);
        if (activeImg) setAttachedImage(activeImg);
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
        liveSources: res.liveSources || [],
        learningMode,
        provider: res.provider || "ai",
        model: res.model || null,
        isAiGenerated: true,
        isVerifiedEducationalMaterial: false,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setSuggestedFollowUps(res.suggestedQuestions?.slice(0, 3) || []);

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
      attachedImage,
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

  const canSend =
    !sending &&
    !preparingImage &&
    (Boolean(attachedImage) || promptInput.trim().length >= 2);

  return (
    <DashboardShell
      userProfile={data.userProfile}
      academicProfile={data.academicProfile}
      fallbackEmail={data.email}
      unreadNotificationCount={data.unreadNotificationCount}
      publishedCourses={data.publishedCourses}
      ongoingCourses={data.ongoingCourses}
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingPhoto(true);
        }}
        onDragLeave={() => setIsDraggingPhoto(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingPhoto(false);
          const droppedFile = e.dataTransfer?.files?.[0] || null;
          if (droppedFile && droppedFile.type.startsWith("image/")) {
            void attachFileFromInput(droppedFile);
          }
        }}
        className={`flex h-[calc(100vh-8.5rem)] min-h-[540px] flex-col overflow-hidden rounded-2xl border bg-obsidian-950/90 transition ${
          isDraggingPhoto
            ? "border-electric-400 ring-2 ring-electric-400/30"
            : "border-white/10"
        }`}
      >
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
                  {messages.map((msg) => {
                    const isFlashcardsOpen =
                      activeFlashcards?.messageId === msg.id;
                    const currentCard = isFlashcardsOpen
                      ? activeFlashcards.cards[activeFlashcards.index]
                      : null;

                    return (
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
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-electric-300">
                                <span>AI Tutor</span>
                                {msg.liveSources &&
                                  msg.liveSources.length > 0 && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                      <Globe className="h-2.5 w-2.5" />
                                      Live Updated
                                    </span>
                                  )}
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSpeakMessage(msg)}
                                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition ${
                                    speakingMessageId === msg.id
                                      ? "border-electric-400/50 bg-electric-500/15 text-electric-300"
                                      : "border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                                  }`}
                                >
                                  {speakingMessageId === msg.id ? (
                                    <>
                                      <VolumeX className="h-3 w-3" />
                                      <span>Stop</span>
                                    </>
                                  ) : (
                                    <>
                                      <Volume2 className="h-3 w-3" />
                                      <span>Listen</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleFlashcards(msg)}
                                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition ${
                                    isFlashcardsOpen
                                      ? "border-aura-400/50 bg-aura-500/15 text-aura-300"
                                      : "border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                                  }`}
                                >
                                  <Layers className="h-3 w-3" />
                                  <span>Flashcards</span>
                                </button>
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
                            <>
                              <TutorRichMessageRenderer
                                content={msg.content}
                                allowVisualFallback={
                                  visualPreference !== "none"
                                }
                              />

                              {/* Live Up-to-Date Grounding Sources */}
                              {msg.liveSources && msg.liveSources.length > 0 && (
                                <div className="mt-4 border-t border-white/10 pt-3">
                                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                    <Globe className="h-3 w-3 text-electric-400" />
                                    Live Reference Sources
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {msg.liveSources.map((src) => (
                                      <a
                                        key={src.url}
                                        href={src.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-obsidian-950/75 px-2.5 py-1 text-[11px] text-electric-300 transition hover:border-electric-400/40 hover:text-electric-200"
                                      >
                                        <span className="max-w-[200px] truncate">
                                          {src.title}
                                        </span>
                                        <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 1-Click Instant Study Flashcards Deck */}
                              {isFlashcardsOpen && currentCard && (
                                <div className="mt-4 rounded-xl border border-aura-400/35 bg-obsidian-950/90 p-4">
                                  <div className="mb-2.5 flex items-center justify-between text-xs">
                                    <span className="font-semibold text-aura-300">
                                      Active-Recall Study Deck (
                                      {activeFlashcards.index + 1} /{" "}
                                      {activeFlashcards.cards.length})
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setActiveFlashcards((prev) =>
                                          prev
                                            ? {
                                                ...prev,
                                                flipped: !prev.flipped,
                                              }
                                            : null
                                        )
                                      }
                                      className="inline-flex items-center gap-1 text-[11px] font-medium text-electric-300 hover:underline"
                                    >
                                      <RotateCw className="h-3 w-3" />
                                      <span>
                                        {activeFlashcards.flipped
                                          ? "Show Prompt"
                                          : "Flip Answer"}
                                      </span>
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveFlashcards((prev) =>
                                        prev
                                          ? { ...prev, flipped: !prev.flipped }
                                          : null
                                      )
                                    }
                                    className="flex min-h-[108px] w-full flex-col items-center justify-center rounded-xl border border-white/10 bg-obsidian-900/90 px-5 py-4 text-center transition hover:border-electric-400/40"
                                  >
                                    <span className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                                      {activeFlashcards.flipped
                                        ? "Explanation / Answer"
                                        : "Concept / Term"}
                                    </span>
                                    <p className="text-sm font-medium leading-relaxed text-white">
                                      {activeFlashcards.flipped
                                        ? currentCard.back
                                        : currentCard.front}
                                    </p>
                                  </button>

                                  <div className="mt-3 flex items-center justify-between">
                                    <button
                                      type="button"
                                      disabled={activeFlashcards.index === 0}
                                      onClick={() =>
                                        setActiveFlashcards((prev) =>
                                          prev
                                            ? {
                                                ...prev,
                                                index: Math.max(
                                                  0,
                                                  prev.index - 1
                                                ),
                                                flipped: false,
                                              }
                                            : null
                                        )
                                      }
                                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10 disabled:opacity-40"
                                    >
                                      <ChevronLeft className="h-3.5 w-3.5" />
                                      Prev
                                    </button>
                                    <span className="text-[11px] text-slate-400">
                                      Tap card to flip
                                    </span>
                                    <button
                                      type="button"
                                      disabled={
                                        activeFlashcards.index >=
                                        activeFlashcards.cards.length - 1
                                      }
                                      onClick={() =>
                                        setActiveFlashcards((prev) =>
                                          prev
                                            ? {
                                                ...prev,
                                                index: Math.min(
                                                  prev.cards.length - 1,
                                                  prev.index + 1
                                                ),
                                                flipped: false,
                                              }
                                            : null
                                        )
                                      }
                                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10 disabled:opacity-40"
                                    >
                                      Next
                                      <ChevronRight className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="space-y-2.5">
                              {msg.imageDataUrl && (
                                <div className="overflow-hidden rounded-xl border border-white/15 bg-obsidian-950/60">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={msg.imageDataUrl}
                                    alt="Uploaded study attachment"
                                    className="max-h-64 w-auto max-w-full object-contain"
                                  />
                                </div>
                              )}
                              {msg.content && (
                                <div className="whitespace-pre-wrap leading-relaxed">
                                  {msg.content}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Quick Tap Follow-Up Chips (only after active reply, never on empty screen) */}
                  {!sending && suggestedFollowUps.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {suggestedFollowUps.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => submitPrompt(q, null)}
                          className="rounded-xl border border-electric-400/25 bg-electric-500/10 px-3 py-1.5 text-left text-xs text-electric-300 transition hover:border-electric-400/50 hover:bg-electric-500/15"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}

                  {sending && (
                    <div className="flex items-center gap-2 rounded-xl border border-electric-400/20 bg-obsidian-900/70 px-4 py-3 text-xs text-electric-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Analyzing & preparing your up-to-date answer...</span>
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
                      {lastFailedPayload && (
                        <button
                          type="button"
                          onClick={() =>
                            submitPrompt(
                              lastFailedPayload.text,
                              lastFailedPayload.image
                            )
                          }
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

            {/* Clean Composer Bar with + Photo Attachment & Voice Dictation */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (canSend) {
                  void submitPrompt(promptInput);
                }
              }}
              className="border-t border-white/10 bg-obsidian-900/65 px-4 py-3.5 sm:px-8"
            >
              <div className="mx-auto max-w-3xl space-y-2.5">
                {/* Attached Photo Thumbnail Preview Bar */}
                {(attachedImage || preparingImage) && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-electric-400/35 bg-obsidian-950/90 p-2.5">
                    {preparingImage ? (
                      <div className="flex items-center gap-2 text-xs text-electric-300">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Optimizing photo for AI vision analysis...</span>
                      </div>
                    ) : attachedImage ? (
                      <>
                        <div className="flex min-w-0 items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={attachedImage.dataUrl}
                            alt={attachedImage.name}
                            className="h-12 w-12 shrink-0 rounded-lg border border-white/15 object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-white">
                              {attachedImage.name}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Ready for AI photo explanation • Hit Send or add a
                              question
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttachedImage(null)}
                          aria-label="Remove attached photo"
                          className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : null}
                  </div>
                )}

                {/* Hidden File & Camera Inputs */}
                <input
                  ref={photoFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  aria-label="Upload photo file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    void attachFileFromInput(file);
                    e.currentTarget.value = "";
                  }}
                />
                <input
                  ref={cameraCaptureInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  aria-label="Capture photo with camera"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    void attachFileFromInput(file);
                    e.currentTarget.value = "";
                  }}
                />

                <div className="flex items-end gap-2">
                  {/* + Plus Button for Photo Upload / Camera */}
                  <div className="relative" ref={plusMenuRef}>
                    <button
                      type="button"
                      onClick={() => setPlusMenuOpen((prev) => !prev)}
                      disabled={sending || preparingImage}
                      aria-label="Add photo"
                      aria-expanded={plusMenuOpen}
                      title="Add photo for AI to analyze & explain"
                      className={`inline-flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl border transition ${
                        plusMenuOpen || attachedImage
                          ? "border-electric-400 bg-electric-500/15 text-electric-300 shadow-electric-glow"
                          : "border-white/15 bg-obsidian-950 text-slate-200 hover:border-electric-400/50 hover:text-electric-300"
                      } disabled:opacity-45`}
                    >
                      <Plus
                        className={`h-5 w-5 transition-transform ${
                          plusMenuOpen ? "rotate-45" : ""
                        }`}
                      />
                    </button>

                    {plusMenuOpen && (
                      <div
                        role="menu"
                        aria-label="Photo attachment options"
                        className="absolute bottom-14 left-0 z-30 w-52 rounded-2xl border border-white/15 bg-obsidian-900 p-1.5 shadow-xl"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => photoFileInputRef.current?.click()}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-slate-200 transition hover:bg-electric-500/15 hover:text-electric-300"
                        >
                          <ImagePlus className="h-4 w-4 text-electric-400" />
                          <div>
                            <p className="font-semibold text-white">
                              Upload Photo
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Analyze & explain picture
                            </p>
                          </div>
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => cameraCaptureInputRef.current?.click()}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-slate-200 transition hover:bg-electric-500/15 hover:text-electric-300"
                        >
                          <Camera className="h-4 w-4 text-aura-400" />
                          <div>
                            <p className="font-semibold text-white">
                              Take Photo
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Snap homework or notes
                            </p>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Text Input + Voice Dictation Mic */}
                  <div className="relative flex-1">
                    <label htmlFor="ai-tutor-prompt" className="sr-only">
                      Ask your academic question
                    </label>
                    <textarea
                      id="ai-tutor-prompt"
                      rows={1}
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      onPaste={handlePasteClipboard}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (canSend) {
                            void submitPrompt(promptInput);
                          }
                        }
                      }}
                      placeholder={
                        attachedImage
                          ? "Add a question about this photo, or press Send..."
                          : "Ask any question or tap + to add a photo..."
                      }
                      disabled={sending}
                      className="min-h-[46px] max-h-36 w-full resize-none rounded-2xl border border-white/15 bg-obsidian-950 py-3 pl-4 pr-11 text-sm text-white placeholder-slate-500 focus:border-electric-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleToggleVoiceInput}
                      disabled={sending}
                      aria-label="Voice input"
                      title={
                        isListeningVoice
                          ? "Stop voice dictation"
                          : "Speak your question"
                      }
                      className={`absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-xl transition ${
                        isListeningVoice
                          ? "animate-pulse bg-red-500/20 text-red-400"
                          : "text-slate-400 hover:bg-white/10 hover:text-electric-300"
                      }`}
                    >
                      {isListeningVoice ? (
                        <MicOff className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={!canSend}
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
              </div>
            </form>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
