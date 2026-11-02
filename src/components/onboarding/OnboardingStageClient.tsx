"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  LogOut,
  UserCheck,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { OnboardingProgressBar } from "@/components/onboarding/OnboardingProgressBar";
import { Step1AcademicLevel } from "@/components/onboarding/Step1AcademicLevel";
import { Step2AcademicDetails } from "@/components/onboarding/Step2AcademicDetails";
import { Step3SubjectsAndGoals } from "@/components/onboarding/Step3SubjectsAndGoals";
import { Step4CompletionSummary } from "@/components/onboarding/Step4CompletionSummary";
import { BRAND_IDENTITY } from "@/data/ecosystemContent";
import { signOutLearner } from "@/lib/auth/authService";
import {
  fetchLearnerOnboardingBundle,
  saveLearnerOnboarding,
} from "@/lib/onboarding/onboardingService";
import {
  createInitialOnboardingFormState,
  profileToFormState,
  validateOnboardingByMode,
} from "@/lib/validation/onboardingValidation";
import type { UserProfile } from "@/types/auth";
import type {
  AcademicCategory,
  OnboardingFormState,
  OnboardingStep,
  StudentAcademicProfile,
} from "@/types/onboarding";

interface OnboardingStageClientProps {
  initialUserId: string;
  initialEmail: string;
  initialFullName: string;
  initialCountry: string;
  initialProfile: UserProfile | null;
  initialAcademicProfile?: StudentAcademicProfile | null;
  allowCompletedReview?: boolean;
}

export function OnboardingStageClient({
  initialEmail,
  initialFullName,
  initialCountry,
  initialProfile,
  initialAcademicProfile = null,
  allowCompletedReview = false,
}: OnboardingStageClientProps) {
  const router = useRouter();

  const resolvedDefaultCountry =
    initialProfile?.country && initialProfile.country !== "Unspecified"
      ? initialProfile.country
      : initialCountry;

  const [learnerName, setLearnerName] = useState(
    initialProfile?.full_name || initialFullName
  );
  const [learnerEmail, setLearnerEmail] = useState(
    initialProfile?.email || initialEmail
  );

  const [formState, setFormState] = useState<OnboardingFormState>(() =>
    initialAcademicProfile
      ? profileToFormState(initialAcademicProfile, resolvedDefaultCountry)
      : createInitialOnboardingFormState(resolvedDefaultCountry)
  );

  const [maxReachedStep, setMaxReachedStep] = useState<OnboardingStep>(
    initialAcademicProfile?.current_step ?? 1
  );
  const [isHydrating, setIsHydrating] = useState(!initialAcademicProfile);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >(initialAcademicProfile ? "saved" : "idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [bannerError, setBannerError] = useState<string | null>(null);

  const completedInThisSessionRef = useRef(false);
  const wasAlreadyCompletedRef = useRef(
    Boolean(initialAcademicProfile?.onboarding_completed)
  );
  const hydratedRef = useRef(Boolean(initialAcademicProfile));
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestFormRef = useRef<OnboardingFormState>(formState);
  latestFormRef.current = formState;

  // Format HH:MM timestamp for saved indicator
  const markSavedNow = useCallback((isoTimestamp?: string | null) => {
    const dt = isoTimestamp ? new Date(isoTimestamp) : new Date();
    setLastSavedAt(
      dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
    setAutoSaveState("saved");
  }, []);

  const routerRef = useRef(router);
  routerRef.current = router;

  // Live Supabase Auth + RLS Onboarding Recovery on Mount / Refresh
  useEffect(() => {
    let active = true;

    async function hydrateFromDatabase() {
      const bundle = await fetchLearnerOnboardingBundle();
      if (!active || !bundle) return;

      if (!bundle.authenticated) {
        routerRef.current.replace("/login?next=/onboarding");
        routerRef.current.refresh();
        return;
      }

      if (!bundle.emailVerified) {
        const emailParam = bundle.email
          ? `?email=${encodeURIComponent(bundle.email)}`
          : "";
        routerRef.current.replace(`/verify-email${emailParam}`);
        routerRef.current.refresh();
        return;
      }

      if (bundle.userProfile) {
        setLearnerName(bundle.userProfile.full_name);
        setLearnerEmail(bundle.userProfile.email);
      }

      const fallbackCountry =
        bundle.userProfile?.country &&
        bundle.userProfile.country !== "Unspecified"
          ? bundle.userProfile.country
          : resolvedDefaultCountry;

      if (bundle.academicProfile) {
        if (bundle.academicProfile.onboarding_completed) {
          wasAlreadyCompletedRef.current = true;
        }
        if (
          bundle.academicProfile.onboarding_completed &&
          !allowCompletedReview &&
          !completedInThisSessionRef.current
        ) {
          routerRef.current.replace("/dashboard");
          routerRef.current.refresh();
          return;
        }

        const recovered = profileToFormState(
          bundle.academicProfile,
          fallbackCountry
        );
        setFormState(recovered);
        setMaxReachedStep(recovered.currentStep);
        markSavedNow(bundle.academicProfile.updated_at);
      } else if (fallbackCountry) {
        setFormState((prev) => ({
          ...prev,
          country: prev.country || fallbackCountry,
        }));
      }

      if (bundle.errorMessage) {
        setBannerError(bundle.errorMessage);
      }

      hydratedRef.current = true;
      setIsHydrating(false);
    }

    hydrateFromDatabase();
    return () => {
      active = false;
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [allowCompletedReview, markSavedNow, resolvedDefaultCountry]);

  // Schedule debounced automatic save whenever the student edits onboarding fields
  const scheduleAutoSave = useCallback(
    (nextState: OnboardingFormState) => {
      if (!hydratedRef.current) return;
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setTimeout(async () => {
        setAutoSaveState("saving");
        const remainsValidComplete =
          wasAlreadyCompletedRef.current &&
          Object.keys(validateOnboardingByMode(nextState, "complete")).length ===
            0;
        const draftToSave: OnboardingFormState = {
          ...nextState,
          onboardingCompleted:
            remainsValidComplete ||
            (nextState.currentStep === 4 && nextState.onboardingCompleted),
        };
        const res = await saveLearnerOnboarding(draftToSave, "draft");
        if (res.ok) {
          markSavedNow(res.profile?.updated_at);
        } else {
          setAutoSaveState("error");
        }
      }, 750);
    },
    [markSavedNow]
  );

  const handleUpdateField = useCallback(
    <K extends keyof OnboardingFormState>(
      field: K,
      value: OnboardingFormState[K]
    ) => {
      setFieldErrors((prev) => {
        if (!prev[field as string]) return prev;
        const copy = { ...prev };
        delete copy[field as string];
        return copy;
      });
      setBannerError(null);

      setFormState((prev) => {
        const updated: OnboardingFormState = {
          ...prev,
          [field]: value,
        };
        scheduleAutoSave(updated);
        return updated;
      });
    },
    [scheduleAutoSave]
  );

  const handleSelectCategory = (category: AcademicCategory) => {
    setFieldErrors({});
    setBannerError(null);

    setFormState((prev) => {
      const categoryChanged =
        prev.academicCategory !== null && prev.academicCategory !== category;
      const updated: OnboardingFormState = {
        ...prev,
        academicCategory: category,
        // Reset pathway-exclusive level/curriculum fields only when switching categories
        academicLevel: categoryChanged ? "" : prev.academicLevel,
        secondaryCategory:
          category === "secondary" ? prev.secondaryCategory : null,
        qualificationType:
          category === "polytechnic" ? prev.qualificationType : null,
        selectedSubjects: categoryChanged ? [] : prev.selectedSubjects,
      };
      scheduleAutoSave(updated);
      return updated;
    });
  };

  const goToStep = async (targetStep: OnboardingStep) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    setFieldErrors({});
    setBannerError(null);

    const remainsValidComplete =
      wasAlreadyCompletedRef.current &&
      Object.keys(
        validateOnboardingByMode(latestFormRef.current, "complete")
      ).length === 0;

    const updated: OnboardingFormState = {
      ...latestFormRef.current,
      currentStep: targetStep,
      onboardingCompleted:
        remainsValidComplete ||
        (targetStep === 4 ? latestFormRef.current.onboardingCompleted : false),
    };
    setFormState(updated);
    setMaxReachedStep((prev) =>
      targetStep > prev ? targetStep : prev
    );

    setAutoSaveState("saving");
    const res = await saveLearnerOnboarding(updated, "draft");
    if (res.ok) {
      markSavedNow(res.profile?.updated_at);
    } else {
      setAutoSaveState("error");
    }
  };

  const handleContinueFromStep1 = async () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    const errors = validateOnboardingByMode(formState, "step-1");
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setBannerError(null);
    setAutoSaveState("saving");

    try {
      const keepComplete =
        wasAlreadyCompletedRef.current &&
        Object.keys(validateOnboardingByMode(formState, "complete")).length ===
          0;
      const nextState: OnboardingFormState = {
        ...formState,
        currentStep: 2,
        onboardingCompleted: keepComplete,
      };
      const result = await saveLearnerOnboarding(
        nextState,
        keepComplete ? "draft" : "step-1"
      );
      if (!result.ok) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        setBannerError(result.message);
        setAutoSaveState("error");
        return;
      }

      setFormState(nextState);
      setMaxReachedStep((prev) => (prev < 2 ? 2 : prev));
      markSavedNow(result.profile?.updated_at);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueFromStep2 = async () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    const errors = validateOnboardingByMode(formState, "step-2");
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setBannerError(null);
    setAutoSaveState("saving");

    try {
      const keepComplete =
        wasAlreadyCompletedRef.current &&
        Object.keys(validateOnboardingByMode(formState, "complete")).length ===
          0;
      const nextState: OnboardingFormState = {
        ...formState,
        currentStep: 3,
        onboardingCompleted: keepComplete,
      };
      const result = await saveLearnerOnboarding(
        nextState,
        keepComplete ? "draft" : "step-2"
      );
      if (!result.ok) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        setBannerError(result.message);
        setAutoSaveState("error");
        return;
      }

      setFormState(nextState);
      setMaxReachedStep((prev) => (prev < 3 ? 3 : prev));
      markSavedNow(result.profile?.updated_at);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    const errors = validateOnboardingByMode(formState, "complete");
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setBannerError(
        "Please complete all required academic fields before finishing."
      );
      return;
    }

    setIsSubmitting(true);
    setBannerError(null);
    setAutoSaveState("saving");

    try {
      const completedState: OnboardingFormState = {
        ...formState,
        currentStep: 4,
        onboardingCompleted: true,
      };
      const result = await saveLearnerOnboarding(completedState, "complete");
      if (!result.ok) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        setBannerError(result.message);
        setAutoSaveState("error");
        return;
      }

      completedInThisSessionRef.current = true;
      setFormState(completedState);
      setMaxReachedStep(4);
      markSavedNow(result.profile?.updated_at);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOutLearner();
    router.replace("/login");
    router.refresh();
  };

  const handleEnterLearningSpace = () => {
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="relative flex min-h-screen flex-col justify-between bg-obsidian-950">
      {/* Ambient Brand Grid & Cyan/Violet Glows */}
      <div
        className="pointer-events-none fixed inset-0 ecosystem-grid-bg"
        aria-hidden="true"
      />
      <div
        className="ambient-glow-cyan pointer-events-none fixed left-1/2 top-1/4 h-[520px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-80"
        aria-hidden="true"
      />
      <div
        className="ambient-glow-violet pointer-events-none fixed bottom-10 right-1/4 h-[440px] w-[540px] rounded-full opacity-80"
        aria-hidden="true"
      />

      {/* Protected Top Navigation Bar */}
      <header className="relative z-30 border-b border-white/[0.06] bg-obsidian-950/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
          <BrandLogo size="sm" />

          <div className="flex items-center gap-3">
            {allowCompletedReview && (
              <button
                type="button"
                onClick={() => {
                  router.push("/dashboard");
                  router.refresh();
                }}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-electric-400/40 bg-electric-400/10 px-3.5 py-2 text-xs font-semibold text-electric-300 transition-colors hover:border-electric-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Back to Dashboard</span>
              </button>
            )}

            {learnerEmail && (
              <div className="hidden items-center gap-2 rounded-xl border border-slate-800 bg-obsidian-900/80 px-3 py-1.5 text-xs text-slate-300 md:inline-flex">
                <UserCheck
                  className="h-3.5 w-3.5 text-electric-400"
                  aria-hidden="true"
                />
                <span className="max-w-[200px] truncate">{learnerEmail}</span>
              </div>
            )}

            <button
              type="button"
              disabled={isSigningOut}
              onClick={handleSignOut}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-700/80 bg-obsidian-900/90 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-electric-400/50 hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 disabled:opacity-65"
            >
              {isSigningOut ? (
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <LogOut
                  className="h-3.5 w-3.5 text-electric-400"
                  aria-hidden="true"
                />
              )}
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Onboarding Container */}
      <main
        id="main-content"
        className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8"
      >
        {isHydrating ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-obsidian-900/60 p-8 text-center">
            <Loader2
              className="h-8 w-8 animate-spin text-electric-400"
              aria-hidden="true"
            />
            <p className="mt-4 font-display text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
              Restoring Your Onboarding Progress...
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 4-Step Progress Indicator */}
            <OnboardingProgressBar
              currentStep={formState.currentStep}
              maxReachedStep={maxReachedStep}
              autoSaveState={autoSaveState}
              lastSavedAt={lastSavedAt}
              onSelectStep={(step) => goToStep(step)}
            />

            {/* Global Error Banner */}
            {bannerError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-rose-400/45 bg-rose-950/35 p-4 text-xs text-rose-100 sm:text-sm"
              >
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-rose-400"
                  aria-hidden="true"
                />
                <span>{bannerError}</span>
              </div>
            )}

            {/* Active Onboarding Step */}
            {formState.currentStep === 1 && (
              <Step1AcademicLevel
                selectedCategory={formState.academicCategory}
                errorMessage={fieldErrors.academicCategory}
                isSubmitting={isSubmitting}
                onSelectCategory={handleSelectCategory}
                onContinue={handleContinueFromStep1}
              />
            )}

            {formState.currentStep === 2 && (
              <Step2AcademicDetails
                formState={formState}
                fieldErrors={fieldErrors}
                isSubmitting={isSubmitting}
                onUpdateField={handleUpdateField}
                onBack={() => goToStep(1)}
                onContinue={handleContinueFromStep2}
              />
            )}

            {formState.currentStep === 3 && (
              <Step3SubjectsAndGoals
                formState={formState}
                fieldErrors={fieldErrors}
                isSubmitting={isSubmitting}
                onUpdateField={handleUpdateField}
                onBack={() => goToStep(2)}
                onComplete={handleCompleteOnboarding}
              />
            )}

            {formState.currentStep === 4 && (
              <Step4CompletionSummary
                learnerName={learnerName}
                formState={formState}
                onBack={() => goToStep(3)}
                onEnterLearningSpace={handleEnterLearningSpace}
              />
            )}
          </div>
        )}
      </main>

      <footer className="relative z-20 border-t border-white/[0.05] bg-obsidian-950/80 px-4 py-4 text-center text-xs text-slate-500">
        {BRAND_IDENTITY.name} • {BRAND_IDENTITY.poweredBy}
      </footer>
    </div>
  );
}
