import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BRAND_IDENTITY } from "@/data/ecosystemContent";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for E-LEARNING ECOSYSTEM, powered by TRALIX AI.",
};

export default function TermsPage() {
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
          <div className="inline-flex items-center gap-2 rounded-full border border-electric-400/30 bg-electric-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-electric-300">
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Platform Charter</span>
          </div>

          <h1 className="mt-4 font-display text-3xl font-bold text-white">
            Terms of Service
          </h1>
          <p className="mt-2 text-xs text-slate-400">
            Last Updated: November 2, 2026 • {BRAND_IDENTITY.name} (
            {BRAND_IDENTITY.poweredBy})
          </p>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-300">
            <section>
              <h2 className="font-display text-base font-semibold text-white">
                1. Purpose of the Platform
              </h2>
              <p className="mt-2">
                {BRAND_IDENTITY.name}, powered by {BRAND_IDENTITY.engine},
                provides structured academic learning tools, AI-assisted study
                guidance, practice examination simulations, and personal study
                organization for secondary, university, and polytechnic
                learners.
              </p>
            </section>

            <section>
              <h2 className="font-display text-base font-semibold text-white">
                2. Account Registration, Minors &amp; Security
              </h2>
              <p className="mt-2">
                You agree to provide accurate registration details, verify
                ownership of your email address, and keep your credentials
                confidential. If you are under 18 years of age, you confirm that
                you are using the platform with parent, legal guardian, or
                authorized school supervision.
              </p>
            </section>

            <section>
              <h2 className="font-display text-base font-semibold text-white">
                3. No Examination Body Affiliation
              </h2>
              <p className="mt-2">
                {BRAND_IDENTITY.name} is an independent educational technology
                platform and is <strong>not affiliated with, endorsed by, or
                sponsored by WAEC, NECO, JAMB, NABTEB</strong>, or any external
                university or polytechnic examination board. Practice questions
                are original educator-authored, OER-adapted, or clearly labeled
                AI-generated study exercises—never leaked or unauthorized
                examination papers.
              </p>
            </section>

            <section>
              <h2 className="font-display text-base font-semibold text-white">
                4. AI-Generated Study Assistance Disclaimer
              </h2>
              <p className="mt-2">
                AI Tutor explanations, AI-generated practice questions, and
                written-response feedback are labeled as AI-generated study aids
                and do not constitute verified curriculum textbooks or official
                examiner marking. Always cross-check critical formulas,
                definitions, and syllabi against your institution&apos;s
                approved materials. Daily request quotas and rate limits apply
                to ensure fair platform availability.
              </p>
            </section>

            <section>
              <h2 className="font-display text-base font-semibold text-white">
                5. Academic Integrity &amp; Acceptable Use
              </h2>
              <p className="mt-2">
                Learners must use the ecosystem ethically for genuine study and
                never to cheat during live proctored examinations or submit
                AI-generated text as unattributed coursework. Automated quota
                circumvention, prompt injection, harmful or unlawful content
                requests, and unauthorized access attempts are strictly
                prohibited.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
