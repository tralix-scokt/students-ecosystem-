"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  GraduationCap,
  Layers,
  Mail,
  MapPin,
  PenSquare,
  Settings,
  UserCircle,
} from "lucide-react";
import { useStudentDashboardData } from "@/lib/dashboard/useStudentDashboardData";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { formatCategoryLabel } from "@/data/onboardingOptions";

export function ProfilePageClient() {
  const { status, isRetrying, data, errorMessage, retry } =
    useStudentDashboardData();

  if (status === "loading") {
    return <DashboardSkeleton />;
  }

  if (status === "error" || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian-950 p-4">
        <DashboardErrorState
          message={errorMessage || "Unable to load your profile right now."}
          isRetrying={isRetrying}
          onRetry={retry}
        />
      </div>
    );
  }

  const profile = data.userProfile;
  const academic = data.academicProfile;
  const fullName = profile?.full_name?.trim() || "Student";
  const email = profile?.email || data.email || "Not available";
  const country = profile?.country || "Not specified";
  const categoryLabel = formatCategoryLabel(
    academic?.academic_category ?? null
  );
  const institution =
    academic?.institution_name?.trim() || "Independent / Not specified";
  const level = academic?.academic_level || "Not specified";

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-700/80 bg-obsidian-900/80 px-3.5 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-electric-400/50 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 text-electric-400" aria-hidden="true" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/onboarding?review=1"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-electric-400/60 bg-electric-400/12 px-4 py-2 text-xs font-bold text-electric-300 transition-colors hover:bg-electric-400 hover:text-obsidian-950"
            >
              <PenSquare className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Edit Academic Information</span>
            </Link>

            <Link
              href="/dashboard/settings"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-700 bg-obsidian-900 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-electric-400/45 hover:text-white"
            >
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Account Settings</span>
            </Link>
          </div>
        </div>

        <section className="rounded-3xl border border-electric-400/30 hardcover-surface p-6 shadow-card-elevated sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-electric-400/45 bg-electric-400/15 text-electric-300">
              <UserCircle className="h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white">
                {fullName}
              </h1>
              <p className="mt-0.5 text-sm text-slate-400">{email}</p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.07] bg-obsidian-950/75 p-4">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                <Mail className="h-3.5 w-3.5 text-electric-400" aria-hidden="true" />
                <span>Email Address</span>
              </dt>
              <dd className="mt-1.5 text-sm font-semibold text-white">{email}</dd>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-obsidian-950/75 p-4">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                <MapPin className="h-3.5 w-3.5 text-aura-300" aria-hidden="true" />
                <span>Country</span>
              </dt>
              <dd className="mt-1.5 text-sm font-semibold text-white">
                {country}
              </dd>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-obsidian-950/75 p-4">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                <GraduationCap
                  className="h-3.5 w-3.5 text-electric-400"
                  aria-hidden="true"
                />
                <span>Academic Category</span>
              </dt>
              <dd className="mt-1.5 text-sm font-semibold text-white">
                {categoryLabel}
              </dd>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-obsidian-950/75 p-4">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                <Building2
                  className="h-3.5 w-3.5 text-aura-300"
                  aria-hidden="true"
                />
                <span>Institution / School</span>
              </dt>
              <dd className="mt-1.5 text-sm font-semibold text-white">
                {institution}
              </dd>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-obsidian-950/75 p-4">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                <Layers
                  className="h-3.5 w-3.5 text-electric-400"
                  aria-hidden="true"
                />
                <span>Class / Academic Level</span>
              </dt>
              <dd className="mt-1.5 text-sm font-semibold text-electric-300">
                {level}
              </dd>
            </div>

            {academic?.course_or_program && (
              <div className="rounded-2xl border border-white/[0.07] bg-obsidian-950/75 p-4">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Course / Academic Program
                </dt>
                <dd className="mt-1.5 text-sm font-semibold text-white">
                  {academic.course_or_program}
                </dd>
              </div>
            )}
          </dl>

          {academic?.selected_subjects &&
            academic.selected_subjects.length > 0 && (
              <div className="mt-6 border-t border-white/[0.07] pt-5">
                <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  Selected Subjects
                </h2>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {academic.selected_subjects.map((subject: string) => (
                    <span
                      key={subject}
                      className="rounded-lg border border-electric-400/30 bg-electric-400/10 px-3 py-1 text-xs font-medium text-electric-200"
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              </div>
            )}
        </section>
      </div>
    </DashboardShell>
  );
}
