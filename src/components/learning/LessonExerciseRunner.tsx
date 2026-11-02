"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  RotateCcw,
  Send,
  XCircle,
} from "lucide-react";
import { ContentProvenanceBadge } from "@/components/learning/ContentProvenanceBadge";
import { submitExerciseAttempt } from "@/lib/learning/learningService";
import type {
  ExerciseQuestionEvaluation,
  LearningExercise,
  StudentExerciseAttemptRecord,
} from "@/types/learning";

interface LessonExerciseRunnerProps {
  exercise: LearningExercise;
  initialLatestAttempt: StudentExerciseAttemptRecord | null;
  onAttemptRecorded?: (attempt: StudentExerciseAttemptRecord) => void;
}

export function LessonExerciseRunner({
  exercise,
  initialLatestAttempt,
  onAttemptRecorded,
}: LessonExerciseRunnerProps) {
  const [latestAttempt, setLatestAttempt] =
    useState<StudentExerciseAttemptRecord | null>(initialLatestAttempt);
  const [isRetrying, setIsRetrying] = useState(initialLatestAttempt === null);
  const [answers, setAnswers] = useState<Record<string, string>>(
    () => initialLatestAttempt?.submitted_answers ?? {}
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  const evaluationByQuestion = useMemo(() => {
    const map = new Map<string, ExerciseQuestionEvaluation>();
    if (latestAttempt && !isRetrying) {
      for (const item of latestAttempt.evaluation_breakdown) {
        map.set(item.questionId, item);
      }
    }
    return map;
  }, [latestAttempt, isRetrying]);

  const setAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const hasAnyAnswer = exercise.questions.some(
      (q) => (answers[q.id] ?? "").trim().length > 0
    );
    if (!hasAnyAnswer) {
      setErrorMsg("Please answer at least one question before submitting.");
      return;
    }

    setSubmitting(true);
    const elapsedSeconds = Math.max(
      1,
      Math.round((Date.now() - startedAtRef.current) / 1000)
    );

    const result = await submitExerciseAttempt({
      exerciseId: exercise.id,
      answers,
      timeSpentSeconds: elapsedSeconds,
    });
    setSubmitting(false);

    if (!result.ok || !result.attempt) {
      setErrorMsg(
        result.error ?? "Unable to submit your exercise right now. Please retry."
      );
      return;
    }

    setLatestAttempt(result.attempt);
    setIsRetrying(false);
    onAttemptRecorded?.(result.attempt);
  };

  const handleStartRetry = () => {
    setErrorMsg(null);
    setAnswers({});
    startedAtRef.current = Date.now();
    setIsRetrying(true);
  };

  const showResults = Boolean(latestAttempt) && !isRetrying;

  return (
    <section
      aria-labelledby={`exercise-heading-${exercise.id}`}
      className="rounded-2xl border border-white/10 bg-obsidian-900/85 p-5 sm:p-6"
    >
      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            <span>Practice Exercise</span>
          </div>
          <h3
            id={`exercise-heading-${exercise.id}`}
            className="mt-1 font-display text-lg font-bold text-white sm:text-xl"
          >
            {exercise.title}
          </h3>
          {exercise.instructions ? (
            <p className="mt-1 text-sm text-slate-300">
              {exercise.instructions}
            </p>
          ) : null}
        </div>
        <ContentProvenanceBadge provenance={exercise.provenance} compact />
      </div>

      {/* Summary Banner After Evaluation */}
      {showResults && latestAttempt ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 rounded-xl border border-cyan-400/25 bg-cyan-500/10 p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-200">
                Attempt #{latestAttempt.attempt_number} Evaluated
              </p>
              <p className="mt-1 text-base font-bold text-white">
                {latestAttempt.score_percent !== null
                  ? `Objective Score: ${latestAttempt.score_percent}% (${latestAttempt.earned_points} / ${latestAttempt.possible_points} pts)`
                  : "Written Self-Review Response Recorded"}
              </p>
              <p className="mt-0.5 text-xs text-slate-300">
                {latestAttempt.gradable_questions_count > 0
                  ? `${latestAttempt.correct_answers_count} of ${latestAttempt.gradable_questions_count} objective question${
                      latestAttempt.gradable_questions_count === 1 ? "" : "s"
                    } answered accurately.`
                  : null}
                {latestAttempt.written_responses_count > 0
                  ? ` ${latestAttempt.written_responses_count} written response${
                      latestAttempt.written_responses_count === 1 ? "" : "s"
                    } saved for structured self-review (not officially examiner-marked).`
                  : ""}
              </p>
            </div>

            {exercise.allow_retries ? (
              <button
                type="button"
                onClick={handleStartRetry}
                className="inline-flex items-center gap-1.5 self-start rounded-xl border border-white/15 bg-obsidian-950/90 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:border-electric-400/50 hover:text-electric-300 sm:self-center"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Retry Exercise</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-5 space-y-6">
        {exercise.questions.map((question, idx) => {
          const currentVal = answers[question.id] ?? "";
          const evaluation = evaluationByQuestion.get(question.id);

          return (
            <div
              key={question.id}
              className="rounded-xl border border-white/[0.08] bg-obsidian-950/80 p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Question {idx + 1} •{" "}
                  {question.question_type.replace(/_/g, " ")}
                </span>
                <span className="text-xs font-medium text-slate-400">
                  {question.question_type === "written_response"
                    ? "Self-review reflection (ungraded)"
                    : `${question.points} ${
                        question.points === 1 ? "point" : "points"
                      }`}
                </span>
              </div>

              <p className="mt-2 text-sm font-medium leading-relaxed text-white sm:text-base">
                {question.prompt}
              </p>

              {question.helper_text ? (
                <p className="mt-1 text-xs text-slate-400">
                  {question.helper_text}
                </p>
              ) : null}

              {/* Question Input by Type */}
              <div className="mt-3.5">
                {question.question_type === "multiple_choice" ? (
                  <div
                    role="radiogroup"
                    aria-label={`Question ${idx + 1} options`}
                    className="space-y-2"
                  >
                    {question.options.map((opt) => {
                      const checked =
                        currentVal.toUpperCase() ===
                        opt.option_key.toUpperCase();
                      return (
                        <label
                          key={opt.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors ${
                            checked
                              ? "border-electric-400/50 bg-electric-400/10 text-white"
                              : "border-white/10 bg-obsidian-900/75 text-slate-200 hover:border-white/20"
                          } ${showResults ? "pointer-events-none opacity-90" : ""}`}
                        >
                          <input
                            type="radio"
                            name={`q-${question.id}`}
                            value={opt.option_key}
                            checked={checked}
                            disabled={showResults}
                            onChange={() =>
                              setAnswer(question.id, opt.option_key)
                            }
                            className="mt-1 h-4 w-4 accent-cyan-400"
                          />
                          <span>
                            <strong className="mr-1.5 font-semibold text-cyan-300">
                              {opt.option_key}.
                            </strong>
                            {opt.option_text}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : question.question_type === "true_false" ? (
                  <div
                    role="radiogroup"
                    aria-label={`Question ${idx + 1} True or False`}
                    className="grid gap-2.5 sm:grid-cols-2"
                  >
                    {[
                      { key: "true", label: "True" },
                      { key: "false", label: "False" },
                    ].map((choice) => {
                      const checked = currentVal.toLowerCase() === choice.key;
                      return (
                        <label
                          key={choice.key}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-medium transition-colors ${
                            checked
                              ? "border-electric-400/50 bg-electric-400/10 text-white"
                              : "border-white/10 bg-obsidian-900/75 text-slate-200 hover:border-white/20"
                          } ${showResults ? "pointer-events-none opacity-90" : ""}`}
                        >
                          <input
                            type="radio"
                            name={`q-${question.id}`}
                            value={choice.key}
                            checked={checked}
                            disabled={showResults}
                            onChange={() => setAnswer(question.id, choice.key)}
                            className="h-4 w-4 accent-cyan-400"
                          />
                          <span>{choice.label}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : question.question_type === "numerical" ? (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label={`Numerical answer for question ${idx + 1}`}
                      value={currentVal}
                      disabled={showResults}
                      onChange={(e) => setAnswer(question.id, e.target.value)}
                      placeholder={
                        question.unit_label
                          ? `Enter value (e.g. 12 or 12 ${question.unit_label})`
                          : "Enter numerical value"
                      }
                      className="w-full max-w-sm rounded-xl border border-white/15 bg-obsidian-900 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-electric-400 focus:outline-none disabled:opacity-75"
                    />
                    {question.unit_label ? (
                      <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-slate-300">
                        Expected unit: {question.unit_label}
                      </span>
                    ) : null}
                  </div>
                ) : question.question_type === "short_answer" ? (
                  <input
                    type="text"
                    aria-label={`Short answer for question ${idx + 1}`}
                    value={currentVal}
                    disabled={showResults}
                    onChange={(e) => setAnswer(question.id, e.target.value)}
                    placeholder="Type a concise term or phrase..."
                    className="w-full max-w-lg rounded-xl border border-white/15 bg-obsidian-900 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-electric-400 focus:outline-none disabled:opacity-75"
                  />
                ) : (
                  <div>
                    <div className="mb-2 flex items-center gap-1.5 text-xs text-amber-200/90">
                      <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>
                        Structured self-review response — saved to your practice
                        history and compared with our reference rubric below
                        (not officially examiner-marked).
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      aria-label={`Written response for question ${idx + 1}`}
                      value={currentVal}
                      disabled={showResults}
                      onChange={(e) => setAnswer(question.id, e.target.value)}
                      placeholder="Write your clear academic explanation here..."
                      className="w-full rounded-xl border border-white/15 bg-obsidian-900 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-electric-400 focus:outline-none disabled:opacity-75"
                    />
                  </div>
                )}
              </div>

              {/* Deterministic Feedback & Explanation */}
              {showResults && evaluation ? (
                <div
                  className={`mt-4 rounded-xl border p-3.5 text-xs leading-relaxed ${
                    evaluation.status === "correct"
                      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                      : evaluation.status === "written_recorded"
                        ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-100"
                        : "border-amber-400/30 bg-amber-500/10 text-amber-100"
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    {evaluation.status === "correct" ? (
                      <>
                        <CheckCircle2
                          className="h-4 w-4 text-emerald-300"
                          aria-hidden="true"
                        />
                        <span>
                          Correct (+{evaluation.earnedPoints} /{" "}
                          {evaluation.possiblePoints} pts)
                        </span>
                      </>
                    ) : evaluation.status === "written_recorded" ? (
                      <>
                        <FileText
                          className="h-4 w-4 text-cyan-300"
                          aria-hidden="true"
                        />
                        <span>
                          Written Response Recorded (Self-Review — Not
                          Officially Examiner-Marked)
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle
                          className="h-4 w-4 text-amber-300"
                          aria-hidden="true"
                        />
                        <span>
                          {evaluation.status === "unanswered"
                            ? "Not Answered"
                            : "Needs Review"}{" "}
                          (0 / {evaluation.possiblePoints} pts)
                        </span>
                      </>
                    )}
                  </div>

                  {evaluation.correctAnswerDisplay ? (
                    <p className="mt-2 text-slate-200">
                      <strong className="text-white">Reference Answer:</strong>{" "}
                      {evaluation.correctAnswerDisplay}
                    </p>
                  ) : null}

                  <p className="mt-1.5 text-slate-200">
                    <strong className="text-white">Explanation:</strong>{" "}
                    {evaluation.explanation}
                  </p>

                  {evaluation.rubricGuidance &&
                  evaluation.rubricGuidance.length > 0 ? (
                    <div className="mt-2.5 border-t border-white/10 pt-2">
                      <p className="font-semibold text-white">
                        Self-Check Key Points:
                      </p>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-200">
                        {evaluation.rubricGuidance.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}

        {errorMsg ? (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-rose-400/35 bg-rose-500/10 px-4 py-3 text-xs text-rose-200"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        ) : null}

        {!showResults ? (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-xs text-slate-400">
              Objective answers are graded deterministically against verified
              answer keys.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-electric-400 to-electric-500 px-5 py-2.5 text-sm font-semibold text-obsidian-950 shadow-cyan-glow transition-opacity hover:opacity-95 disabled:opacity-60"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              <span>
                {submitting ? "Evaluating Answers..." : "Submit Exercise"}
              </span>
            </button>
          </div>
        ) : null}
      </form>
    </section>
  );
}
