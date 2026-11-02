import React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

interface FeatureCardItem {
  title: string;
  description: string;
  badge?: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface PublicSeoHubLayoutProps {
  eyebrow: string;
  headline: string;
  highlightedWord: string;
  subheadline: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  features: FeatureCardItem[];
  subjectsTitle?: string;
  subjects?: string[];
  faqs?: FaqItem[];
  showBoardDisclaimer?: boolean;
  jsonLd?: Record<string, unknown>;
}

const HUB_NAV_LINKS = [
  { href: "/explore", label: "Platform Overview" },
  { href: "/jamb-cbt", label: "JAMB CBT Practice" },
  { href: "/waec-neco-past-questions", label: "WAEC & NECO Prep" },
  { href: "/ai-photo-tutor", label: "AI Photo Tutor" },
];

export function PublicSeoHubLayout({
  eyebrow,
  headline,
  highlightedWord,
  subheadline,
  primaryCtaLabel,
  primaryCtaHref,
  secondaryCtaLabel = "Open 3D Book Cover",
  secondaryCtaHref = "/",
  features,
  subjectsTitle,
  subjects,
  faqs,
  showBoardDisclaimer = false,
  jsonLd,
}: PublicSeoHubLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-obsidian-950 text-white">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <div
        className="pointer-events-none fixed inset-0 ecosystem-grid-bg"
        aria-hidden="true"
      />
      <div
        className="ambient-glow-cyan pointer-events-none fixed left-1/3 top-1/4 h-[520px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-75"
        aria-hidden="true"
      />

      {/* Public Top Navigation */}
      <header className="relative z-30 border-b border-white/10 bg-obsidian-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link href="/" aria-label="E-Learning Ecosystem Home">
            <BrandLogo size="sm" />
          </Link>

          <nav
            aria-label="Explore platform capabilities"
            className="hidden items-center gap-5 text-xs font-medium text-slate-300 md:flex"
          >
            {HUB_NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition hover:text-electric-300"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="rounded-xl border border-white/15 bg-obsidian-900 px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:border-electric-400/50 hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-xl bg-electric-500 px-3.5 py-2 text-xs font-bold text-obsidian-950 shadow-cyan-glow transition hover:bg-electric-400"
            >
              <span>Start Free</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="relative z-10 mx-auto max-w-6xl space-y-14 px-4 py-12 sm:px-6 sm:py-16"
      >
        {/* Hero */}
        <section className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-electric-400/35 bg-electric-500/10 px-3.5 py-1 text-xs font-semibold text-electric-300">
            <BookOpen className="h-3.5 w-3.5" />
            <span>{eyebrow}</span>
          </span>

          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            {headline}{" "}
            <span className="bg-gradient-to-r from-[#00E5FF] via-[#38BDF8] to-[#D946EF] bg-clip-text text-transparent">
              {highlightedWord}
            </span>
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
            {subheadline}
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={primaryCtaHref}
              className="inline-flex items-center gap-2 rounded-2xl bg-electric-500 px-6 py-3.5 text-sm font-bold text-obsidian-950 shadow-cyan-glow transition hover:bg-electric-400"
            >
              <span>{primaryCtaLabel}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={secondaryCtaHref}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-obsidian-900/90 px-5 py-3.5 text-sm font-semibold text-slate-200 transition hover:border-electric-400/45 hover:text-white"
            >
              <span>{secondaryCtaLabel}</span>
            </Link>
          </div>
        </section>

        {showBoardDisclaimer && (
          <aside
            aria-label="Examination board non-affiliation notice"
            className="mx-auto max-w-4xl rounded-2xl border border-amber-400/30 bg-amber-500/10 px-5 py-3.5 text-xs leading-relaxed text-amber-100"
          >
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <p>
                <strong>Independent Practice Platform Notice:</strong> E-Learning
                Ecosystem is an independent study and exam simulation platform
                powered by TRALIX AI and is not affiliated with, endorsed by, or
                operated by JAMB, WAEC, NECO, or tertiary examination boards.
              </p>
            </div>
          </aside>
        )}

        {/* Feature Grid */}
        <section aria-labelledby="capabilities-heading" className="space-y-6">
          <h2
            id="capabilities-heading"
            className="text-center font-display text-xl font-bold text-white sm:text-2xl"
          >
            Built to Help Students Learn, Practice &amp; Excel
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-white/10 bg-obsidian-900/85 p-5 transition hover:border-electric-400/35"
              >
                {feature.badge && (
                  <span className="inline-block rounded-full border border-electric-400/30 bg-electric-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-electric-300">
                    {feature.badge}
                  </span>
                )}
                <h3 className="mt-2 font-display text-base font-bold text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Subject Coverage */}
        {subjects && subjects.length > 0 && (
          <section className="rounded-2xl border border-white/10 bg-obsidian-900/75 p-6">
            <h2 className="font-display text-lg font-bold text-white sm:text-xl">
              {subjectsTitle || "Supported Academic Subjects"}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {subjects.map((subj) => (
                <span
                  key={subj}
                  className="rounded-xl border border-white/10 bg-obsidian-950 px-3 py-1.5 text-xs font-medium text-slate-200"
                >
                  {subj}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* FAQ Rich Section */}
        {faqs && faqs.length > 0 && (
          <section aria-labelledby="faq-heading" className="space-y-4">
            <h2
              id="faq-heading"
              className="font-display text-xl font-bold text-white sm:text-2xl"
            >
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {faqs.map((faq) => (
                <article
                  key={faq.question}
                  className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-5"
                >
                  <h3 className="text-sm font-bold text-white sm:text-base">
                    {faq.question}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
                    {faq.answer}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* SEO Internal Cross-Link Footer */}
      <footer className="relative z-10 mt-10 border-t border-white/10 bg-obsidian-950/90 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6">
          <div>
            <BrandLogo size="sm" />
            <p className="mt-2 text-xs text-slate-400">
              Learn &bull; Practice &bull; Excel &mdash; Complete Learning and
              Exam Preparation Workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-slate-300">
            {HUB_NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:text-electric-300"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/privacy" className="hover:text-electric-300">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-electric-300">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
