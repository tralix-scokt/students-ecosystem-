import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BRAND_IDENTITY } from "@/data/ecosystemContent";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for E-LEARNING ECOSYSTEM, powered by TRALIX AI.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-obsidian-950 text-slate-200">
      <header className="border-b border-white/[0.06] bg-obsidian-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-obsidian-900 px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-electric-400/50 hover:text-electric-300"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-electric-400" aria-hidden="true" />
            <span>Back to Registration</span>
          </Link>
          <BrandLogo size="sm" showSubtitle={false} />
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16"
      >
        <div className="rounded-2xl border border-slate-800 hardcover-surface p-6 sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-aura-400/30 bg-aura-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-aura-300">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Data Protection Notice</span>
          </div>

          <h1 className="mt-4 font-display text-3xl font-bold text-white">
            Privacy Policy
          </h1>
          <p className="mt-2 text-xs text-slate-400">
            Last Updated: November 2, 2026 • {BRAND_IDENTITY.name} (
            {BRAND_IDENTITY.poweredBy})
          </p>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-300">
            <section>
              <h2 className="font-display text-base font-semibold text-white">
                1. Categories of Personal &amp; Academic Data Collected
              </h2>
              <p className="mt-2">
                We collect only the information needed to deliver personalized
                academic study tools:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
                <li>
                  <strong>Account Identity:</strong> Full name, email address,
                  country, and cryptographically hashed authentication
                  credentials managed by Supabase Auth.
                </li>
                <li>
                  <strong>Academic Onboarding Profile:</strong> Educational
                  pathway (secondary, university, or polytechnic/technical),
                  state/region, school or institution name, class/level,
                  curriculum, selected subjects, learning goals, and explanation
                  preferences.
                </li>
                <li>
                  <strong>Learning &amp; Study Activity:</strong> Lesson
                  progress, bookmarks, exercise and practice-exam attempts,
                  planner tasks, timetable entries, assignments, study timer
                  sessions, personal notes, AI Tutor conversations, and
                  operational AI token usage logs.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-base font-semibold text-white">
                2. Row Level Security &amp; Shared-Device Protections
              </h2>
              <p className="mt-2">
                All student-owned tables in PostgreSQL enforce Row Level
                Security (RLS) so learners cannot read or modify another
                student&apos;s notes, chats, planner items, or exam records.
                Saved personal notes cached for offline reading in browser{" "}
                <code>localStorage</code> are isolated by authenticated user ID
                and cleared when you sign out via the application.
              </p>
            </section>

            <section>
              <h2 className="font-display text-base font-semibold text-white">
                3. AI Processing &amp; Infrastructure Sub-Processors
              </h2>
              <p className="mt-2">
                To provide AI Tutor explanations, practice question generation,
                and advisory revision feedback, your academic prompt, recent
                conversation context, and non-identifying pathway metadata
                (level, subject, preferred explanation style) are transmitted
                from our server-side gateway to configured AI inference
                providers (<strong>OpenAI</strong> and/or{" "}
                <strong>OpenRouter</strong>). Core database, authentication, and
                edge compute services are hosted on <strong>Supabase</strong>.
                Student data is never sold or used for third-party behavioral
                advertising.
              </p>
            </section>

            <section>
              <h2 className="font-display text-base font-semibold text-white">
                4. Minors, Secondary Learners &amp; Guardian Guidance
              </h2>
              <p className="mt-2">
                {BRAND_IDENTITY.name} supports junior and senior secondary
                school pathways that may include learners under 18 years of age.
                Learners under 18 should register and use the platform with the
                knowledge and consent of a parent, legal guardian, or authorized
                school educator. Avoid entering sensitive personal details
                (such as home addresses, phone numbers, medical records, or
                government IDs) into AI Tutor prompts or free-text notes.
              </p>
            </section>

            <section>
              <h2 className="font-display text-base font-semibold text-white">
                5. Data Export, Retention &amp; Deletion Controls
              </h2>
              <p className="mt-2">
                From <strong>Dashboard → Settings</strong>, authenticated
                learners can download a machine-readable JSON export of their
                personal and academic records at any time, or execute an
                immediate self-service purge of all learning records (AI Tutor
                chats, notes, planner tasks, timetable, assignments, study
                sessions, exam/exercise history, assessment scores, bookmarks,
                and notifications). Non-content AI token counters are retained
                for quota security, and full deletion of your core login
                identity (<code>auth.users</code> and <code>profiles</code>) can
                be requested through the platform operator&apos;s designated
                privacy support channel.
              </p>
            </section>

            <section>
              <h2 className="font-display text-base font-semibold text-white">
                6. Session Cookies &amp; Local Storage
              </h2>
              <p className="mt-2">
                Essential HTTP cookies maintain your authenticated Supabase
                session and enforce email verification and route security. No
                third-party advertising trackers are loaded.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
