"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Award,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  GraduationCap,
  Loader2,
  Play,
  Share2,
  ShieldAlert,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import { buildExamChallengeSharePayload } from "@/lib/marketing/viralShare";
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { useStudentDashboardData } from "@/lib/dashboard/useStudentDashboardData";
import {
  fetchExamPrepBootstrap,
  requestExamAiHelper,
  startPracticeExamSession,
  submitPracticeExamSession,
  type ActiveExamAttempt,
  type ExamAttemptHistoryItem,
  type ExamCategoryRecord,
  type ExamSubjectRecord,
  type PastQuestionsAvailability,
  type SubmittedExamResponseItem,
  type TopicPerformanceItem,
} from "@/lib/exams/examService";
import {
  NIGERIAN_PAST_QUESTION_EXAM_CODES,
  PAST_QUESTION_YEARS,
} from "@/lib/exams/pastQuestionsClient";

export function ExamPreparationClient() {
  const { status, isRetrying, data, errorMessage, retry } =
    useStudentDashboardData();

  const [categories, setCategories] = useState<ExamCategoryRecord[]>([]);
  const [subjects, setSubjects] = useState<ExamSubjectRecord[]>([]);
  const [history, setHistory] = useState<ExamAttemptHistoryItem[]>([]);
  const [topicPerf, setTopicPerf] = useState<TopicPerformanceItem[]>([]);
  const [loadingBoot, setLoadingBoot] = useState(true);

  // Builder configuration
  const [selectedCatCode, setSelectedCatCode] = useState<string>("WAEC");
  const [selectedSubject, setSelectedSubject] = useState<string>("Physics");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<string>("mixed");
  const [questionCount, setQuestionCount] = useState<number>(4);
  const [isTimed, setIsTimed] = useState<boolean>(true);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(15);
  const [practiceSource, setPracticeSource] = useState<
    "curated_bank" | "past_questions_api" | "ai_generated"
  >("curated_bank");
  const [selectedExamYear, setSelectedExamYear] = useState<string>("all");
  const [pastQuestionsAvail, setPastQuestionsAvail] =
    useState<PastQuestionsAvailability | null>(null);

  // Active exam runner state
  const [startingExam, setStartingExam] = useState(false);
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<ActiveExamAttempt | null>(
    null
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [reviewMode, setReviewMode] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [submittingExam, setSubmittingExam] = useState(false);

  // Post-submit result state
  const [resultSummary, setResultSummary] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [resultResponses, setResultResponses] = useState<
    SubmittedExamResponseItem[]
  >([]);
  const [aiRevisionPlan, setAiRevisionPlan] = useState<string | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>(
    {}
  );
  const [loadingAiExplainId, setLoadingAiExplainId] = useState<string | null>(
    null
  );
  const [copiedChallenge, setCopiedChallenge] = useState(false);

  const autoSubmitTriggeredRef = useRef(false);

  const refreshBootstrap = useCallback(async () => {
    const boot = await fetchExamPrepBootstrap();
    setCategories(boot.categories);
    setSubjects(boot.subjects);
    setHistory(boot.attempts);
    setTopicPerf(boot.topicPerformance);
    if (boot.pastQuestionsAvailability) {
      setPastQuestionsAvail(boot.pastQuestionsAvailability);
    }
    setLoadingBoot(false);

    if (boot.categories.length > 0) {
      const learnerCat = data?.academicProfile?.academic_category;
      const defaultCat =
        learnerCat === "university"
          ? "UNIVERSITY_SEMESTER"
          : learnerCat === "polytechnic"
            ? "POLYTECHNIC_DIPLOMA"
            : "WAEC";
      const matched =
        boot.categories.find((c) => c.code === defaultCat) ||
        boot.categories[0];
      setSelectedCatCode(matched.code);
      setTimeLimitMinutes(matched.defaultDurationMinutes);
      const firstSubj = boot.subjects.find(
        (s) => s.examCategoryId === matched.id
      );
      if (firstSubj) {
        setSelectedSubject(firstSubj.subjectName);
      }
    }
  }, [data?.academicProfile?.academic_category]);

  useEffect(() => {
    if (status === "ready") {
      refreshBootstrap();
    }
  }, [status, refreshBootstrap]);

  const selectedCategoryObj = useMemo(
    () => categories.find((c) => c.code === selectedCatCode) || null,
    [categories, selectedCatCode]
  );

  const categorySubjects = useMemo(() => {
    if (!selectedCategoryObj) return [];
    return subjects.filter((s) => s.examCategoryId === selectedCategoryObj.id);
  }, [selectedCategoryObj, subjects]);

  const currentSubjectObj = useMemo(
    () =>
      categorySubjects.find((s) => s.subjectName === selectedSubject) ||
      categorySubjects[0] ||
      null,
    [categorySubjects, selectedSubject]
  );

  const handleCategorySelect = (cat: ExamCategoryRecord) => {
    setSelectedCatCode(cat.code);
    setTimeLimitMinutes(cat.defaultDurationMinutes);
    setSelectedTopics([]);
    if (
      !NIGERIAN_PAST_QUESTION_EXAM_CODES.has(cat.code) &&
      practiceSource === "past_questions_api"
    ) {
      setPracticeSource("curated_bank");
    }
    const subjs = subjects.filter((s) => s.examCategoryId === cat.id);
    if (subjs[0]) {
      setSelectedSubject(subjs[0].subjectName);
    }
  };

  const handleSubmitExam = useCallback(async () => {
    if (!activeAttempt || submittingExam) return;
    setSubmittingExam(true);
    setBuilderError(null);

    const res = await submitPracticeExamSession({
      attemptId: activeAttempt.id,
      answers,
      timeSpentSeconds: elapsedSeconds,
    });

    setSubmittingExam(false);
    if (!res.ok) {
      setBuilderError(res.error || "Could not submit exam.");
      return;
    }

    setResultSummary(res.summary || {});
    setResultResponses(res.responses || []);
    setActiveAttempt(null);
    setReviewMode(false);
    setAiRevisionPlan(null);
    await refreshBootstrap();
  }, [activeAttempt, answers, elapsedSeconds, refreshBootstrap, submittingExam]);

  // Monotonic wall-clock countdown & elapsed timer when exam is in progress
  // Anchors to client Date.now() when the active attempt mounts so client/server
  // clock skew cannot trigger premature auto-submit, while preventing background-tab drift.
  const examWallStartMsRef = useRef<number | null>(null);
  const activeAttemptId = activeAttempt?.id ?? null;
  useEffect(() => {
    if (!activeAttemptId) {
      examWallStartMsRef.current = null;
      return;
    }
    examWallStartMsRef.current = Date.now();
    autoSubmitTriggeredRef.current = false;
  }, [activeAttemptId]);

  useEffect(() => {
    if (!activeAttempt) return;

    const syncExamTimer = () => {
      const startMs = examWallStartMsRef.current ?? Date.now();
      const next = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setElapsedSeconds(next);
      if (
        activeAttempt.isTimed &&
        activeAttempt.timeLimitMinutes &&
        next >= activeAttempt.timeLimitMinutes * 60 &&
        !autoSubmitTriggeredRef.current
      ) {
        autoSubmitTriggeredRef.current = true;
        handleSubmitExam();
      }
    };

    const interval = setInterval(syncExamTimer, 1000);
    document.addEventListener("visibilitychange", syncExamTimer);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", syncExamTimer);
    };
  }, [activeAttempt, handleSubmitExam]);

  const handleStartExam = async () => {
    const subjName = currentSubjectObj?.subjectName || selectedSubject;
    if (!subjName) {
      setBuilderError("Please select a subject.");
      return;
    }

    setBuilderError(null);
    setStartingExam(true);
    setResultSummary(null);
    setResultResponses([]);

    const res = await startPracticeExamSession({
      examCategoryCode: selectedCatCode,
      subject: subjName,
      topics: selectedTopics,
      difficulty,
      questionCount,
      isTimed,
      timeLimitMinutes,
      practiceSource,
      examYear:
        practiceSource === "past_questions_api" && selectedExamYear !== "all"
          ? Number(selectedExamYear)
          : null,
    });

    setStartingExam(false);
    if (!res.ok) {
      setBuilderError(res.error);
      return;
    }

    setActiveAttempt(res.attempt);
    setAnswers({});
    setCurrentIndex(0);
    setElapsedSeconds(0);
    setReviewMode(false);
  };

  const handleGenerateAiRevisionPlan = async () => {
    if (!resultSummary) return;
    setGeneratingPlan(true);
    const res = await requestExamAiHelper({
      action: "revision_plan",
      attemptId: String(resultSummary.attemptId || ""),
      examName: `${selectedCatCode} ${selectedSubject}`,
      subject: selectedSubject,
      scorePercent: Number(resultSummary.scorePercent ?? 0),
      weakTopics: Array.isArray(resultSummary.weakTopics)
        ? (resultSummary.weakTopics as string[])
        : [],
    });
    setGeneratingPlan(false);
    if (res.ok && res.content) {
      setAiRevisionPlan(res.content);
    }
  };

  const handleExplainIncorrectOrWritten = async (
    resp: SubmittedExamResponseItem
  ) => {
    setLoadingAiExplainId(resp.id);
    const isWritten = resp.questionType === "written_response";
    const res = await requestExamAiHelper({
      action: isWritten ? "written_answer_feedback" : "explain_exam_answer",
      responseId: resp.id,
      questionPrompt: resp.prompt,
      studentAnswer: resp.studentAnswer || "(No answer submitted)",
      correctAnswer: resp.correctAnswerDisplay,
    });
    setLoadingAiExplainId(null);
    if (res.ok && res.content) {
      setAiExplanations((prev) => ({ ...prev, [resp.id]: res.content! }));
    }
  };

  if (status === "loading") return <DashboardSkeleton />;
  if (status === "error" || !data) {
    return (
      <DashboardErrorState
        message={errorMessage || "Unable to load Exam Preparation."}
        isRetrying={isRetrying}
        onRetry={retry}
      />
    );
  }

  const remainingSeconds =
    activeAttempt?.isTimed && activeAttempt.timeLimitMinutes
      ? Math.max(0, activeAttempt.timeLimitMinutes * 60 - elapsedSeconds)
      : null;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

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
        {/* Header & Non-Affiliation Honesty Banner */}
        <section className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 sm:p-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-electric-400/30 bg-electric-500/10 px-3 py-1 text-xs font-medium text-electric-300">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>
              CBT & Written Practice • WAEC • NECO • JAMB UTME • Tertiary
            </span>
          </div>
          <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            AI & Curated Exam Preparation
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Configure timed or untimed practice sessions, review answers before
            submission, track topic-by-topic accuracy, and generate targeted AI
            revision plans.
          </p>

          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <span>
              <strong>Academic Integrity & Board Disclaimer:</strong>{" "}
              {selectedCategoryObj?.disclaimerText ||
                "Independent practice simulation. E-LEARNING ECOSYSTEM is not affiliated with or endorsed by WAEC, NECO, JAMB, or tertiary examination boards. AI-created practice items and written feedback are clearly labeled and never presented as official past questions or examiner marking."}
            </span>
          </div>
        </section>

        {/* ACTIVE EXAM RUNNER */}
        {activeAttempt ? (
          <section className="rounded-2xl border border-electric-400/30 bg-obsidian-900/90 p-5 sm:p-6">
            {/* Top Bar: Title + Progress + Timer */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {activeAttempt.examName}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      activeAttempt.practiceSource === "ai_generated"
                        ? "bg-aura-500/20 text-aura-300"
                        : "bg-emerald-500/20 text-emerald-300"
                    }`}
                  >
                    {activeAttempt.practiceSource === "ai_generated"
                      ? "AI-Generated Practice (Not Official Past Paper)"
                      : "Curated Practice Bank"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  Answered {Object.values(answers).filter((v) => v.trim()).length}{" "}
                  of {activeAttempt.questions.length} questions
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-obsidian-950 px-3.5 py-2 text-xs font-mono font-semibold text-electric-300">
                  <Clock className="h-4 w-4" />
                  {remainingSeconds !== null ? (
                    <span>Time Left: {formatTimer(remainingSeconds)}</span>
                  ) : (
                    <span>Untimed • {formatTimer(elapsedSeconds)}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setReviewMode((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {reviewMode ? "Back to Questions" : "Review & Submit"}
                </button>
              </div>
            </div>

            {reviewMode ? (
              <div className="mt-5 space-y-5">
                <h2 className="text-lg font-semibold text-white">
                  Review Answers Before Submission
                </h2>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {activeAttempt.questions.map((q, idx) => {
                    const ans = (answers[q.key] || "").trim();
                    return (
                      <button
                        key={q.key}
                        type="button"
                        onClick={() => {
                          setCurrentIndex(idx);
                          setReviewMode(false);
                        }}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-obsidian-950/80 p-3 text-left text-xs hover:border-electric-400/50"
                      >
                        <span className="truncate font-medium text-white">
                          Q{idx + 1}: {q.topic}
                        </span>
                        <span
                          className={`ml-2 shrink-0 rounded-full px-2.5 py-0.5 font-semibold ${
                            ans
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-amber-500/20 text-amber-300"
                          }`}
                        >
                          {ans ? `Answered (${ans.slice(0, 12)})` : "Unanswered"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-4">
                  <button
                    type="button"
                    onClick={() => setReviewMode(false)}
                    className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
                  >
                    Return to Exam
                  </button>
                  <button
                    type="button"
                    disabled={submittingExam}
                    onClick={handleSubmitExam}
                    className="inline-flex items-center gap-2 rounded-xl bg-electric-500 px-5 py-2.5 text-xs font-bold text-obsidian-950 hover:bg-electric-400 disabled:opacity-50"
                  >
                    {submittingExam && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Submit Exam for Deterministic Grading
                  </button>
                </div>
              </div>
            ) : (
              (() => {
                const q = activeAttempt.questions[currentIndex];
                if (!q) return null;
                const val = answers[q.key] || "";
                return (
                  <div className="mt-5 space-y-5">
                    {/* Question Palette */}
                    <div className="flex flex-wrap gap-1.5">
                      {activeAttempt.questions.map((item, idx) => {
                        const answered = Boolean((answers[item.key] || "").trim());
                        const current = idx === currentIndex;
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setCurrentIndex(idx)}
                            className={`h-8 w-8 rounded-lg text-xs font-semibold transition ${
                              current
                                ? "bg-electric-500 text-obsidian-950"
                                : answered
                                  ? "border border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                                  : "border border-white/10 bg-obsidian-950 text-slate-300"
                            }`}
                          >
                            {idx + 1}
                          </button>
                        );
                      })}
                    </div>

                    {/* Question Stem */}
                    <div className="rounded-2xl border border-white/10 bg-obsidian-950/80 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                        <span>
                          Question {currentIndex + 1} of{" "}
                          {activeAttempt.questions.length} • Topic:{" "}
                          <strong className="text-slate-200">{q.topic}</strong>
                          {q.originType === "authorized_past_question" && (
                            <span className="ml-2 rounded-full border border-electric-400/40 bg-electric-500/15 px-2 py-0.5 text-[10px] font-bold text-electric-300">
                              Past Question{q.examYear ? ` • ${q.examYear}` : ""}
                            </span>
                          )}
                        </span>
                        <span className="uppercase tracking-wider">
                          {q.difficulty} • {q.points} pt{q.points > 1 ? "s" : ""}
                        </span>
                      </div>

                      <p className="mt-3 text-base font-medium leading-relaxed text-white">
                        {q.prompt}
                      </p>

                      {/* Answer Input by Question Type */}
                      <div className="mt-4 space-y-2.5">
                        {q.questionType === "multiple_choice" &&
                          q.options.map((opt) => {
                            const selected = val === opt.key;
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                onClick={() =>
                                  setAnswers((prev) => ({
                                    ...prev,
                                    [q.key]: opt.key,
                                  }))
                                }
                                className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition ${
                                  selected
                                    ? "border-electric-400 bg-electric-500/15 text-white"
                                    : "border-white/10 bg-obsidian-900/70 text-slate-200 hover:border-white/25"
                                }`}
                              >
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold">
                                  {opt.key}
                                </span>
                                <span>{opt.text}</span>
                              </button>
                            );
                          })}

                        {q.questionType === "true_false" && (
                          <div className="grid grid-cols-2 gap-3">
                            {["True", "False"].map((tf) => {
                              const selected =
                                val.toLowerCase() === tf.toLowerCase();
                              return (
                                <button
                                  key={tf}
                                  type="button"
                                  onClick={() =>
                                    setAnswers((prev) => ({
                                      ...prev,
                                      [q.key]: tf,
                                    }))
                                  }
                                  className={`rounded-xl border p-3.5 text-sm font-semibold transition ${
                                    selected
                                      ? "border-electric-400 bg-electric-500/15 text-white"
                                      : "border-white/10 bg-obsidian-900/70 text-slate-200 hover:border-white/25"
                                  }`}
                                >
                                  {tf}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {q.questionType === "short_answer" && (
                          <input
                            type="text"
                            value={val}
                            onChange={(e) =>
                              setAnswers((prev) => ({
                                ...prev,
                                [q.key]: e.target.value,
                              }))
                            }
                            placeholder="Type your concise short answer..."
                            className="w-full rounded-xl border border-white/15 bg-obsidian-900 px-3.5 py-2.5 text-sm text-white focus:border-electric-400 focus:outline-none"
                          />
                        )}

                        {q.questionType === "written_response" && (
                          <textarea
                            rows={5}
                            value={val}
                            onChange={(e) =>
                              setAnswers((prev) => ({
                                ...prev,
                                [q.key]: e.target.value,
                              }))
                            }
                            placeholder="Write your structured explanation (eligible for advisory AI study feedback after submission)..."
                            className="w-full rounded-xl border border-white/15 bg-obsidian-900 px-3.5 py-2.5 text-sm text-white focus:border-electric-400 focus:outline-none"
                          />
                        )}
                      </div>
                    </div>

                    {/* Prev / Next / Finish Controls */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        disabled={currentIndex === 0}
                        onClick={() =>
                          setCurrentIndex((i) => Math.max(0, i - 1))
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </button>

                      {currentIndex < activeAttempt.questions.length - 1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setCurrentIndex((i) =>
                              Math.min(activeAttempt.questions.length - 1, i + 1)
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl bg-electric-500 px-4 py-2 text-xs font-semibold text-obsidian-950"
                        >
                          Next Question
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setReviewMode(true)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-electric-500 px-4 py-2 text-xs font-bold text-obsidian-950"
                        >
                          Review & Submit
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()
            )}
          </section>
        ) : (
          /* EXAM BUILDER + POST-SUBMIT RESULTS + PAST ATTEMPTS */
          <>
            {resultSummary && (
              <section className="space-y-5 rounded-2xl border border-electric-400/30 bg-obsidian-900/90 p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-electric-300">
                      <Award className="h-4 w-4" />
                      Deterministic Practice Result
                    </span>
                    <h2 className="mt-1 text-2xl font-bold text-white">
                      Score: {String(resultSummary.scorePercent ?? 0)}% (
                      {String(resultSummary.correctCount ?? 0)} /{" "}
                      {String(resultSummary.gradableCount ?? 0)} Objective Items)
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {(() => {
                      const shareData = buildExamChallengeSharePayload({
                        examLabel:
                          selectedCategoryObj?.shortLabel || "CBT Practice",
                        subjectLabel: selectedSubject,
                        scorePercent: Number(resultSummary.scorePercent ?? 0),
                        correctCount: Number(resultSummary.correctCount ?? 0),
                        gradableCount: Number(resultSummary.gradableCount ?? 0),
                      });
                      return (
                        <>
                          <a
                            href={shareData.whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3.5 py-2.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/25"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                            <span>Share on WhatsApp</span>
                          </a>
                          <a
                            href={shareData.xIntentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-electric-400/45 hover:text-white"
                          >
                            <span>Post on X</span>
                          </a>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  shareData.message
                                );
                                setCopiedChallenge(true);
                                setTimeout(() => setCopiedChallenge(false), 2500);
                              } catch {
                                setCopiedChallenge(false);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-electric-400/35 bg-electric-500/10 px-3 py-2.5 text-xs font-semibold text-electric-300 transition hover:bg-electric-500/20"
                          >
                            <span>
                              {copiedChallenge
                                ? "Copied Challenge!"
                                : "Copy Challenge Link"}
                            </span>
                          </button>
                        </>
                      );
                    })()}

                    <button
                      type="button"
                      disabled={generatingPlan}
                      onClick={handleGenerateAiRevisionPlan}
                      className="inline-flex items-center gap-2 rounded-xl bg-aura-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-aura-400 disabled:opacity-50"
                    >
                      {generatingPlan ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Generate 5-Day AI Revision Plan
                    </button>
                  </div>
                </div>

                {/* Weak Topics & Recommended Verified Lessons */}
                {Array.isArray(resultSummary.weakTopics) &&
                  (resultSummary.weakTopics as string[]).length > 0 && (
                    <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-xs text-amber-100">
                      <p className="font-semibold">
                        Weak Topics Detected (&lt;70% accuracy):{" "}
                        {(resultSummary.weakTopics as string[]).join(", ")}
                      </p>
                      {Array.isArray(resultSummary.revisionRecommendations) &&
                        (
                          resultSummary.revisionRecommendations as Array<{
                            courseSlug: string;
                            lessonSlug: string;
                            lessonTitle: string;
                          }>
                        ).length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            {(
                              resultSummary.revisionRecommendations as Array<{
                                courseSlug: string;
                                lessonSlug: string;
                                lessonTitle: string;
                              }>
                            ).map((rec) => (
                              <Link
                                key={`${rec.courseSlug}-${rec.lessonSlug}`}
                                href={`/dashboard/learn/courses/${rec.courseSlug}/lessons/${rec.lessonSlug}`}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-obsidian-950 px-3 py-1.5 text-electric-300 hover:underline"
                              >
                                <BookOpen className="h-3.5 w-3.5" />
                                Revise Lesson: {rec.lessonTitle}
                              </Link>
                            ))}
                          </div>
                        )}
                    </div>
                  )}

                {aiRevisionPlan && (
                  <div className="rounded-xl border border-aura-400/30 bg-obsidian-950/90 p-4 text-xs text-slate-200">
                    <p className="mb-2 font-semibold text-aura-300">
                      AI-Generated 5-Day Revision Plan (Advisory Study Guide)
                    </p>
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {aiRevisionPlan}
                    </div>
                  </div>
                )}

                {/* Question-by-Question Breakdown */}
                <div className="space-y-3">
                  {resultResponses.map((resp) => (
                    <div
                      key={resp.id}
                      className="rounded-xl border border-white/10 bg-obsidian-950/80 p-4 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-white">
                          Q{resp.questionOrder} • {resp.topic}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold ${
                            resp.status === "correct"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : resp.status === "written_recorded"
                                ? "bg-aura-500/20 text-aura-300"
                                : "bg-red-500/20 text-red-300"
                          }`}
                        >
                          {resp.status === "correct" ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}
                          {resp.status === "written_recorded"
                            ? "Written Practice (Not Officially Examiner-Marked)"
                            : resp.status.toUpperCase()}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-100">
                        {resp.prompt}
                      </p>
                      <p className="mt-1.5 text-slate-300">
                        Your Answer:{" "}
                        <strong>{resp.studentAnswer || "(Unanswered)"}</strong>{" "}
                        • Expected: <strong>{resp.correctAnswerDisplay}</strong>
                      </p>
                      {resp.explanation && (
                        <p className="mt-1.5 text-slate-400">
                          Explanation: {resp.explanation}
                        </p>
                      )}

                      {(resp.status === "incorrect" ||
                        resp.status === "unanswered" ||
                        resp.questionType === "written_response") && (
                        <div className="mt-2.5">
                          <button
                            type="button"
                            disabled={loadingAiExplainId === resp.id}
                            onClick={() => handleExplainIncorrectOrWritten(resp)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-electric-400/30 bg-electric-500/10 px-3 py-1.5 font-medium text-electric-300 hover:bg-electric-500/20"
                          >
                            {loadingAiExplainId === resp.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Bot className="h-3.5 w-3.5" />
                            )}
                            {resp.questionType === "written_response"
                              ? "Request Advisory AI Feedback (Not Official Marking)"
                              : "Ask AI to Explain Step-by-Step"}
                          </button>

                          {aiExplanations[resp.id] && (
                            <div className="mt-2 whitespace-pre-wrap rounded-lg border border-white/10 bg-obsidian-900 p-3 text-slate-200">
                              {aiExplanations[resp.id]}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Builder Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <section className="space-y-5 rounded-2xl border border-white/10 bg-obsidian-900/80 p-5 sm:p-6 lg:col-span-7">
                <h2 className="text-lg font-bold text-white">
                  Configure Practice Examination
                </h2>

                {loadingBoot ? (
                  <div className="flex items-center gap-2 py-8 text-xs text-slate-300">
                    <Loader2 className="h-4 w-4 animate-spin text-electric-400" />
                    Loading examination categories...
                  </div>
                ) : (
                  <>
                    {/* Category Cards */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                        1. Examination Category
                      </label>
                      <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                        {categories.map((cat) => {
                          const active = cat.code === selectedCatCode;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => handleCategorySelect(cat)}
                              className={`rounded-xl border p-3 text-left transition ${
                                active
                                  ? "border-electric-400 bg-electric-500/15 text-white"
                                  : "border-white/10 bg-obsidian-950/70 text-slate-300 hover:border-white/25"
                              }`}
                            >
                              <p className="text-xs font-bold">
                                {cat.shortLabel}
                              </p>
                              <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">
                                {cat.academicCategory}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Subject & Practice Source */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="exam-subject-select"
                          className="block text-xs font-semibold uppercase tracking-wider text-slate-400"
                        >
                          2. Subject
                        </label>
                        <select
                          id="exam-subject-select"
                          value={selectedSubject}
                          onChange={(e) => {
                            setSelectedSubject(e.target.value);
                            setSelectedTopics([]);
                          }}
                          className="mt-1.5 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2.5 text-sm text-white"
                        >
                          {categorySubjects.map((s) => (
                            <option key={s.id} value={s.subjectName}>
                              {s.subjectName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="exam-source-select"
                          className="block text-xs font-semibold uppercase tracking-wider text-slate-400"
                        >
                          3. Question Source
                        </label>
                        <select
                          id="exam-source-select"
                          value={practiceSource}
                          onChange={(e) => {
                            const nextSrc = e.target.value as
                              | "curated_bank"
                              | "past_questions_api"
                              | "ai_generated";
                            setPracticeSource(nextSrc);
                            if (nextSrc === "past_questions_api") {
                              setQuestionCount((prev) => Math.max(prev, 10));
                            } else {
                              setQuestionCount((prev) => Math.min(prev, 15));
                            }
                          }}
                          className="mt-1.5 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2.5 text-sm text-white"
                        >
                          <option value="curated_bank">
                            Curated OER / Original Practice Bank
                          </option>
                          {NIGERIAN_PAST_QUESTION_EXAM_CODES.has(
                            selectedCatCode
                          ) && (
                            <option value="past_questions_api">
                              Nigerian Past-Questions API (JAMB / WAEC / NECO)
                            </option>
                          )}
                          <option value="ai_generated">
                            AI-Generated Practice Items (Labeled)
                          </option>
                        </select>
                      </div>
                    </div>

                    {practiceSource === "past_questions_api" && (
                      <div className="rounded-xl border border-electric-400/35 bg-electric-500/10 p-3.5 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-bold text-electric-300">
                              Live Nigerian Past-Questions Archive ({selectedCatCode === "JAMB_UTME" ? "JAMB UTME" : selectedCatCode})
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-300">
                              {pastQuestionsAvail?.apiConfigured ||
                              (pastQuestionsAvail?.pastCounts?.[selectedCatCode] ??
                                0) > 0
                                ? `API Connected • ${pastQuestionsAvail?.pastCounts?.[selectedCatCode] ?? 0} ${selectedCatCode} past questions cached + live year streaming active.`
                                : "Connect your free ALOC AccessToken in Admin Portal (/admin → Exam Question Bank) to stream 15,000+ JAMB, WAEC & NECO past questions."}
                            </p>
                          </div>
                          <div>
                            <label
                              htmlFor="exam-year-select"
                              className="sr-only"
                            >
                              Exam Year
                            </label>
                            <select
                              id="exam-year-select"
                              value={selectedExamYear}
                              onChange={(e) =>
                                setSelectedExamYear(e.target.value)
                              }
                              className="rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-xs font-semibold text-white"
                            >
                              <option value="all">All Years (Mixed)</option>
                              {PAST_QUESTION_YEARS.map((yr) => (
                                <option key={yr} value={String(yr)}>
                                  Year {yr}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Topics Filter */}
                    {practiceSource !== "past_questions_api" &&
                      currentSubjectObj &&
                      currentSubjectObj.availableTopics.length > 0 && (
                        <div>
                          <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                            4. Focus Topics (Optional — leave unselected for all)
                          </span>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {currentSubjectObj.availableTopics.map((topic) => {
                              const active = selectedTopics.includes(topic);
                              return (
                                <button
                                  key={topic}
                                  type="button"
                                  onClick={() =>
                                    setSelectedTopics((prev) =>
                                      prev.includes(topic)
                                        ? prev.filter((t) => t !== topic)
                                        : [...prev, topic]
                                    )
                                  }
                                  className={`rounded-full border px-3 py-1 text-xs transition ${
                                    active
                                      ? "border-electric-400 bg-electric-500/20 text-electric-200"
                                      : "border-white/10 bg-obsidian-950 text-slate-300"
                                  }`}
                                >
                                  {topic}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    {/* Difficulty, Count, Timed Mode */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <label
                          htmlFor="exam-difficulty"
                          className="block text-xs font-semibold uppercase tracking-wider text-slate-400"
                        >
                          Difficulty
                        </label>
                        <select
                          id="exam-difficulty"
                          value={difficulty}
                          onChange={(e) => setDifficulty(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-sm text-white"
                        >
                          <option value="mixed">Mixed Difficulty</option>
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="exam-q-count"
                          className="block text-xs font-semibold uppercase tracking-wider text-slate-400"
                        >
                          Question Count
                        </label>
                        <input
                          id="exam-q-count"
                          type="number"
                          min={2}
                          max={practiceSource === "past_questions_api" ? 40 : 15}
                          value={questionCount}
                          onChange={(e) =>
                            setQuestionCount(
                              Math.min(
                                practiceSource === "past_questions_api" ? 40 : 15,
                                Math.max(2, Number(e.target.value))
                              )
                            )
                          }
                          className="mt-1.5 w-full rounded-xl border border-white/15 bg-obsidian-950 px-3 py-2 text-sm text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Timing Mode
                        </label>
                        <div className="mt-1.5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsTimed((v) => !v)}
                            className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold ${
                              isTimed
                                ? "border-electric-400 bg-electric-500/15 text-electric-200"
                                : "border-white/15 bg-obsidian-950 text-slate-300"
                            }`}
                          >
                            {isTimed ? `Timed (${timeLimitMinutes}m)` : "Untimed"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {builderError && (
                      <div
                        role="alert"
                        className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-200"
                      >
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{builderError}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={startingExam}
                      onClick={handleStartExam}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-electric-500 px-5 py-3 text-sm font-bold text-obsidian-950 transition hover:bg-electric-400 disabled:opacity-50"
                    >
                      {startingExam ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      <span>
                        {startingExam
                          ? practiceSource === "ai_generated"
                            ? "Generating AI Practice Session..."
                            : practiceSource === "past_questions_api"
                              ? "Fetching Past Questions Archive..."
                              : "Starting Exam Session..."
                          : "Start Practice Examination"}
                      </span>
                    </button>
                  </>
                )}
              </section>

              {/* Topic Accuracy & Past Attempts Telemetry */}
              <aside className="space-y-6 lg:col-span-5">
                <section className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-5">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <Target className="h-4 w-4 text-electric-400" />
                    <span>Topic Accuracy Telemetry</span>
                  </div>
                  {topicPerf.length === 0 ? (
                    <p className="mt-3 text-xs text-slate-400">
                      Complete a practice exam to track real accuracy across
                      topics and identify weak areas automatically.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2.5">
                      {topicPerf.slice(0, 6).map((tp) => (
                        <div
                          key={`${tp.examCategoryCode}-${tp.subject}-${tp.topic}`}
                          className="rounded-xl border border-white/10 bg-obsidian-950/70 p-3 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-white">
                              {tp.topic}
                            </span>
                            <span
                              className={`font-bold ${
                                tp.accuracyPercent < 70
                                  ? "text-amber-300"
                                  : "text-emerald-300"
                              }`}
                            >
                              {tp.accuracyPercent}%
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {tp.subject} • {tp.questionsCorrect}/
                            {tp.questionsAttempted} correct
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-5">
                  <h3 className="text-sm font-bold text-white">
                    Saved Exam Attempts
                  </h3>
                  {history.length === 0 ? (
                    <p className="mt-3 text-xs text-slate-400">
                      No submitted practice attempts yet.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2.5">
                      {history.slice(0, 6).map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-obsidian-950/70 p-3 text-xs"
                        >
                          <div>
                            <p className="font-medium text-white">
                              {att.examName}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {att.practiceSource === "ai_generated"
                                ? "AI Practice"
                                : "Curated Bank"}{" "}
                              • {att.correctCount}/{att.gradableCount} correct
                            </p>
                          </div>
                          <span className="rounded-lg bg-electric-500/15 px-2.5 py-1 font-bold text-electric-300">
                            {att.scorePercent ?? 0}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </aside>
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
