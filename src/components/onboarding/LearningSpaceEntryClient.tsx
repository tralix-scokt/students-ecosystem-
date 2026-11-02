"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Globe,
  GraduationCap,
  Loader2,
  LogOut,
  Mail,
  Settings2,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { COUNTRIES } from "@/data/countries";
import { BRAND_IDENTITY } from "@/data/ecosystemContent";
import {
  formatCategoryLabel,
  formatExplanationLabel,
} from "@/data/onboardingOptions";
import {
  signOutLearner,
  updateAuthenticatedLearnerProfile,
} from "@/lib/auth/authService";
import { fetchLearnerOnboardingBundle } from "@/lib/onboarding/onboardingService";
import type { UserProfile } from "@/types/auth";
import type { StudentAcademicProfile } from "@/types/onboarding";

interface LearningSpaceEntryClientProps {
  initialUserId: string;
  initialEmail: string;
  initialFullName: string;
  initialCountry: string;
  initialProfile: UserProfile | null;
  initialAcademicProfile: StudentAcademicProfile | null;
}

export function LearningSpaceEntryClient({
  initialUserId,
  initialEmail,
  initialFullName,
  initialCountry,
  initialProfile,
  initialAcademicProfile,
}: LearningSpaceEntryClientProps) {
  const router = useRouter();
  const [userId, setUserId] = useState(initialUserId);
  const [email, setEmail] = useState(initialProfile?.email || initialEmail);
  const [fullName, setFullName] = useState(
    initialProfile?.full_name || initialFullName
  );
  const [country, setCountry] = useState(
    initialProfile?.country && initialProfile.country !== "Unspecified"
      ? initialProfile.country
      : initialCountry
  );
  const [academicProfile, setAcademicProfile] =
    useState<StudentAcademicProfile | null>(initialAcademicProfile);
  const [isLoading, setIsLoading] = useState(!initialAcademicProfile);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [profileBanner, setProfileBanner] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const routerRef = React.useRef(router);
  routerRef.current = router;

  useEffect(() => {
    let active = true;

    async function verifyAccessAndOnboarding() {
      const bundle = await fetchLearnerOnboardingBundle();
      if (!active || !bundle) return;

      if (!bundle.authenticated) {
        routerRef.current.replace("/login?next=/learning-space");
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

      if (!bundle.academicProfile?.onboarding_completed) {
        routerRef.current.replace("/onboarding");
        routerRef.current.refresh();
        return;
      }

      setAcademicProfile(bundle.academicProfile);
      if (bundle.userProfile) {
        setUserId(bundle.userProfile.id);
        setEmail(bundle.userProfile.email);
        setFullName(bundle.userProfile.full_name);
        if (
          bundle.userProfile.country &&
          bundle.userProfile.country !== "Unspecified"
        ) {
          setCountry(bundle.userProfile.country);
        }
      }
      setIsLoading(false);
    }

    verifyAccessAndOnboarding();
    return () => {
      active = false;
    };
  }, []);

  const handleSaveIdentityProfile = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (isSavingProfile) return;

    setIsSavingProfile(true);
    setProfileBanner(null);
    setFieldErrors({});

    try {
      const result = await updateAuthenticatedLearnerProfile(userId, {
        fullName,
        country,
      });

      if (!result.ok) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        setProfileBanner({ kind: "error", text: result.message });
        return;
      }

      if (result.profile) {
        setFullName(result.profile.full_name);
        setCountry(result.profile.country);
      }
      setProfileBanner({ kind: "success", text: result.message });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOutLearner();
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="relative flex min-h-screen flex-col justify-between bg-obsidian-950">
      <div
        className="pointer-events-none fixed inset-0 ecosystem-grid-bg"
        aria-hidden="true"
      />
      <div
        className="ambient-glow-cyan pointer-events-none fixed left-1/2 top-1/4 h-[520px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-80"
        aria-hidden="true"
      />

      {/* Header */}
      <header className="relative z-30 border-b border-white/[0.06] bg-obsidian-950/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <BrandLogo size="sm" />
          <div className="flex items-center gap-3">
            <Link
              href="/onboarding?review=1"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-electric-400/40 bg-electric-400/10 px-3.5 py-2 text-xs font-semibold text-electric-300 transition-colors hover:border-electric-400 hover:text-white"
            >
              <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Update Academic Pathway</span>
              <span className="sm:hidden">Pathway</span>
            </Link>
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

      {/* Prepared Learning Space Entry Body */}
      <main
        id="main-content"
        className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8"
      >
        {isLoading ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-obsidian-900/60 p-8 text-center">
            <Loader2
              className="h-8 w-8 animate-spin text-electric-400"
              aria-hidden="true"
            />
            <p className="mt-4 font-display text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
              Loading Your Personalized Learning Space...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left Column: Prepared Learning Space Readiness */}
            <section className="space-y-6 rounded-2xl border border-electric-400/35 hardcover-surface p-6 sm:p-8 lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-electric-400/35 bg-electric-400/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-electric-300">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Learning Space Prepared</span>
              </div>

              <div>
                <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Welcome back, {fullName || "Scholar"}.
                </h1>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-300 sm:text-base">
                  Your academic onboarding is complete and your personalized
                  learning configuration is active.
                </p>
              </div>

              {academicProfile && (
                <div className="space-y-4 rounded-2xl border border-slate-800/90 bg-obsidian-950/75 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap
                        className="h-4 w-4 text-electric-400"
                        aria-hidden="true"
                      />
                      <span className="font-display text-xs font-bold uppercase tracking-[0.16em] text-white">
                        {formatCategoryLabel(academicProfile.academic_category)}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-electric-300">
                      {academicProfile.academic_level}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-xs text-slate-300 sm:grid-cols-2">
                    <div>
                      <span className="text-slate-500">Location: </span>
                      <span className="font-medium text-white">
                        {[academicProfile.state_region, academicProfile.country]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Institution: </span>
                      <span className="font-medium text-white">
                        {academicProfile.institution_name || "Independent"}
                      </span>
                    </div>
                    {academicProfile.curriculum && (
                      <div className="sm:col-span-2">
                        <span className="text-slate-500">Curriculum: </span>
                        <span className="font-medium text-white">
                          {academicProfile.curriculum}
                        </span>
                      </div>
                    )}
                    {academicProfile.course_or_program && (
                      <div className="sm:col-span-2">
                        <span className="text-slate-500">
                          Course / Program:{" "}
                        </span>
                        <span className="font-medium text-white">
                          {academicProfile.course_or_program}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-500">Explanation Mode: </span>
                      <span className="font-medium text-electric-300">
                        {formatExplanationLabel(
                          academicProfile.explanation_preference
                        )}
                      </span>
                    </div>
                  </div>

                  {academicProfile.selected_subjects.length > 0 && (
                    <div className="border-t border-slate-800/80 pt-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Subjects</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {academicProfile.selected_subjects.map((sub) => (
                          <span
                            key={sub}
                            className="rounded-md border border-electric-400/30 bg-electric-400/10 px-2 py-0.5 text-[11px] text-electric-200"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-aura-400/30 bg-aura-500/10 p-5">
                <div className="flex items-start gap-3">
                  <Sparkles
                    className="mt-0.5 h-5 w-5 shrink-0 text-aura-300"
                    aria-hidden="true"
                  />
                  <div>
                    <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-aura-300">
                      Prepared Learning Space Entry
                    </h2>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-200 sm:text-sm">
                      Your academic level, courses, goals, and explanation
                      preferences are saved and ready for your full student
                      workspace in the next stage.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Right Column: RLS-Protected Learner Identity Card */}
            <section className="rounded-2xl border border-slate-800/90 rim-border-card p-6 sm:p-8 lg:col-span-5">
              <h2 className="border-b border-slate-800 pb-4 font-display text-sm font-bold uppercase tracking-[0.18em] text-white">
                Learner Identity
              </h2>

              <form
                onSubmit={handleSaveIdentityProfile}
                noValidate
                className="mt-5 space-y-4"
              >
                <div>
                  <label
                    htmlFor="ls-email"
                    className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400"
                  >
                    Verified email (read-only)
                  </label>
                  <div className="relative mt-1">
                    <Mail
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                      aria-hidden="true"
                    />
                    <input
                      id="ls-email"
                      type="email"
                      readOnly
                      value={email}
                      className="block min-h-[44px] w-full cursor-not-allowed rounded-xl border border-slate-800 bg-obsidian-950/50 py-2 pl-10 pr-3 text-sm text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="ls-fullname"
                    className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300"
                  >
                    Full name
                  </label>
                  <div className="relative mt-1">
                    <User
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="ls-fullname"
                      type="text"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        setProfileBanner(null);
                      }}
                      className="block min-h-[44px] w-full rounded-xl border border-slate-700/80 bg-obsidian-950/80 py-2 pl-10 pr-3 text-base text-white focus:border-electric-400 focus:outline-none focus:ring-2 focus:ring-electric-400/30 sm:text-sm"
                    />
                  </div>
                  {fieldErrors.fullName && (
                    <p role="alert" className="mt-1 text-xs text-rose-300">
                      {fieldErrors.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="ls-country"
                    className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300"
                  >
                    Country
                  </label>
                  <div className="relative mt-1">
                    <Globe
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <select
                      id="ls-country"
                      value={country}
                      onChange={(e) => {
                        setCountry(e.target.value);
                        setProfileBanner(null);
                      }}
                      className="block min-h-[44px] w-full rounded-xl border border-slate-700/80 bg-obsidian-950/85 py-2 pl-10 pr-3 text-base text-white focus:border-electric-400 focus:outline-none focus:ring-2 focus:ring-electric-400/30 sm:text-sm"
                    >
                      <option value="">Select country</option>
                      {COUNTRIES.map((c) => (
                        <option
                          key={c}
                          value={c}
                          className="bg-obsidian-950 text-white"
                        >
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  {fieldErrors.country && (
                    <p role="alert" className="mt-1 text-xs text-rose-300">
                      {fieldErrors.country}
                    </p>
                  )}
                </div>

                {profileBanner && (
                  <div
                    role={profileBanner.kind === "error" ? "alert" : "status"}
                    className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
                      profileBanner.kind === "success"
                        ? "border-electric-400/40 bg-electric-400/10 text-electric-200"
                        : "border-rose-400/45 bg-rose-950/40 text-rose-200"
                    }`}
                  >
                    {profileBanner.kind === "success" ? (
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-electric-400"
                        aria-hidden="true"
                      />
                    ) : (
                      <AlertCircle
                        className="mt-0.5 h-4 w-4 shrink-0 text-rose-400"
                        aria-hidden="true"
                      />
                    )}
                    <span>{profileBanner.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-electric-400/60 bg-gradient-to-r from-electric-400 via-electric-500 to-aura-500 px-4 py-2.5 text-sm font-bold text-obsidian-950 shadow-cyan-glow transition-all hover:brightness-110 disabled:opacity-70"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2
                        className="h-4 w-4 animate-spin text-obsidian-950"
                        aria-hidden="true"
                      />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <span>Update Identity Details</span>
                  )}
                </button>
              </form>
            </section>
          </div>
        )}
      </main>

      <footer className="relative z-20 border-t border-white/[0.05] bg-obsidian-950/80 px-4 py-4 text-center text-xs text-slate-500">
        {BRAND_IDENTITY.name} • {BRAND_IDENTITY.poweredBy}
      </footer>
    </div>
  );
}
