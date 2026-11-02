"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Copy,
  Globe,
  Megaphone,
  Search,
  Share2,
  Sparkles,
} from "lucide-react";
import { getPublicPlatformUrl } from "@/lib/marketing/viralShare";

interface CampaignTemplate {
  id: string;
  channel: string;
  title: string;
  goal: string;
  copyText: string;
  whatsappShare?: boolean;
  xShare?: boolean;
}

const SITE_URL = getPublicPlatformUrl();

const INDEXED_GOOGLE_HUBS = [
  {
    path: "/",
    label: "3D Standing Book Entry",
    keywords: "Brand Home • E-Learning Ecosystem • TRALIX AI",
  },
  {
    path: "/explore",
    label: "Platform Overview + Rich FAQ Schema",
    keywords: "E-Learning Ecosystem • Online Study Platform Nigeria",
  },
  {
    path: "/jamb-cbt",
    label: "JAMB UTME CBT Simulator Hub",
    keywords: "JAMB CBT practice online • JAMB past questions by year",
  },
  {
    path: "/waec-neco-past-questions",
    label: "WAEC & NECO Past-Questions Hub",
    keywords: "WAEC past questions and answers • NECO SSCE practice",
  },
  {
    path: "/ai-photo-tutor",
    label: "Snap-a-Photo AI Tutor Hub",
    keywords: "Snap photo solve math AI • AI teacher for students",
  },
];

const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: "whatsapp_broadcast",
    channel: "WhatsApp Groups & Status",
    title: "Student Study Group Viral Broadcast",
    goal: "Drive immediate free signups from SS2/SS3, JAMBites, and 100L–400L WhatsApp groups.",
    whatsappShare: true,
    copyText: `Preparing for JAMB UTME, WAEC, NECO, or university exams?

Try *E-Learning Ecosystem (Powered by TRALIX AI)* — free to start:
1. Timed JAMB, WAEC & NECO past-question CBT simulator (filter by subject & year)
2. Snap a photo (+) of any tough Maths, Physics, Chemistry or essay question and get a step-by-step teacher explanation + visual diagram
3. Built-in Study Planner, Focus Timer & Flashcards

Open the book and test yourself now:
${SITE_URL}/explore`,
  },
  {
    id: "tiktok_reels_script",
    channel: "TikTok / Instagram Reels / Shorts",
    title: "25-Second 'Snap & Solve + JAMB CBT' Demo Script",
    goal: "High-retention vertical screen-recording demo that triggers comments and shares.",
    copyText: `[0:00–0:03 HOOK — Hold phone over a tough JAMB Maths or Physics question]
Text on screen: "Stop cramming past questions you don't understand."

[0:03–0:09 SCENE 1 — Show opening the 3D Standing Book on ${SITE_URL}]
Voiceover: "Open E-Learning Ecosystem by TRALIX AI — it literally opens like a real interactive book."

[0:09–0:17 SCENE 2 — Tap '+' in AI Tutor, snap the question, show step-by-step explanation + diagram]
Voiceover: "Tap the plus button, snap any homework or past question, and it draws the diagram and explains every single step like a patient teacher."

[0:17–0:25 SCENE 3 — Show timed JAMB/WAEC/NECO CBT exam + Share Scorecard on WhatsApp]
Voiceover: "Then switch to timed JAMB, WAEC, and NECO past-question CBT and challenge your friends on WhatsApp. Link in bio — ${SITE_URL.replace(/^https?:\/\//, "")}"`,
  },
  {
    id: "x_launch_thread",
    channel: "X (Twitter) & LinkedIn",
    title: "Founder Launch Post",
    goal: "Build brand authority for TRALIX AI and attract students, educators, and tech press.",
    xShare: true,
    copyText: `We just launched E-Learning Ecosystem — Powered by TRALIX AI!

Built to help students Learn, Practice & Excel:
• Timed JAMB, WAEC & NECO past-question CBT by year & subject
• Snap-a-Photo (+) Multimodal AI Teacher with visual diagrams
• Structured courses, Study Planner & Flashcards

Try it live: ${SITE_URL}`,
  },
  {
    id: "tutorial_center_pitch",
    channel: "Schools & JAMB Tutorial Centers",
    title: "Tutorial Center / Secondary School Partnership Message",
    goal: "Onboard 50–300 students at once through tutorial coordinators and ICT teachers.",
    whatsappShare: true,
    copyText: `Hello Coordinator,

I'd love to share a free digital CBT & AI revision workspace your students can use alongside classes: *E-Learning Ecosystem (Powered by TRALIX AI)*.

Students get timed JAMB UTME, WAEC & NECO past-question CBT practice on phone or laptop, weak-topic diagnostics (<70% accuracy alerts), and a Snap-a-Photo AI Tutor that explains difficult calculations step by step.

You can preview it in 30 seconds here: ${SITE_URL}/jamb-cbt`,
  },
];

export function AdminGrowthMarketingPanel() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2400);
    } catch {
      setCopiedKey(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Google Search Indexing & Search Console Setup */}
      <section className="rounded-2xl border border-electric-400/35 bg-obsidian-900/85 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-3 py-0.5 text-[11px] font-semibold text-emerald-300">
              <Globe className="h-3.5 w-3.5" />
              Google Technical SEO Active
            </span>
            <h2 className="mt-2 text-lg font-bold text-white sm:text-xl">
              Get Found on Google Search (3-Minute Search Console Setup)
            </h2>
            <p className="mt-1 text-xs text-slate-300 sm:text-sm">
              Your XML sitemap, crawler rules, OpenGraph cards, JSON-LD
              EducationalOrganization + FAQ schema, and public exam landing
              pages are live. Complete these 3 steps once in Google Search
              Console so Google indexes your site immediately:
            </p>
          </div>

          <a
            href="https://search.google.com/search-console/welcome"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-electric-500 px-4 py-2.5 text-xs font-bold text-obsidian-950 shadow-cyan-glow transition hover:bg-electric-400"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Open Google Search Console</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Step 1 */}
          <div className="rounded-xl border border-white/10 bg-obsidian-950/90 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-electric-300">
              Step 1 • Add URL Prefix
            </span>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              In Google Search Console, choose <strong>URL prefix</strong> and
              paste your production URL:
            </p>
            <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-obsidian-900 px-3 py-2">
              <code className="truncate text-[11px] text-electric-300">
                {SITE_URL}
              </code>
              <button
                type="button"
                onClick={() => handleCopy("site_url", SITE_URL)}
                className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/20"
              >
                {copiedKey === "site_url" ? (
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
            </div>
          </div>

          {/* Step 2 */}
          <div className="rounded-xl border border-emerald-400/30 bg-obsidian-950/90 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              Step 2 • HTML Meta Tag Installed
            </span>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              Your Google Search Console <code>google-site-verification</code>{" "}
              meta tag (<code>eaOjtUPx...uwac</code>) is live in{" "}
              <code>&lt;head&gt;</code> — click <strong>Verify</strong> inside
              Google Search Console now!
            </p>
          </div>

          {/* Step 3 */}
          <div className="rounded-xl border border-white/10 bg-obsidian-950/90 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-electric-300">
              Step 3 • Submit Sitemap
            </span>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              Open <strong>Sitemaps</strong> in the left menu of Google Search
              Console and submit:
            </p>
            <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-obsidian-900 px-3 py-2">
              <code className="truncate text-[11px] text-electric-300">
                {`${SITE_URL}/sitemap.xml`}
              </code>
              <button
                type="button"
                onClick={() =>
                  handleCopy("sitemap_url", `${SITE_URL}/sitemap.xml`)
                }
                className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/20"
              >
                {copiedKey === "sitemap_url" ? (
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
            </div>
          </div>
        </div>

        {/* Live Indexed SEO Routes */}
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Live Google-Indexable Landing Pages &amp; Feeds
            </h3>
            <div className="flex items-center gap-3 text-xs">
              <a
                href="/sitemap.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-electric-300 hover:underline"
              >
                <span>/sitemap.xml</span>
                <ArrowUpRight className="h-3 w-3" />
              </a>
              <a
                href="/robots.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-electric-300 hover:underline"
              >
                <span>/robots.txt</span>
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {INDEXED_GOOGLE_HUBS.map((hub) => (
              <Link
                key={hub.path}
                href={hub.path}
                target="_blank"
                className="group flex items-start justify-between gap-2 rounded-xl border border-white/10 bg-obsidian-950/80 p-3.5 transition hover:border-electric-400/45"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white group-hover:text-electric-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{hub.label}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {hub.keywords}
                  </p>
                  <code className="mt-1 block text-[10px] text-electric-300/90">
                    {hub.path}
                  </code>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-electric-300" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Ready-to-Post Viral Launch Kit */}
      <section className="rounded-2xl border border-white/10 bg-obsidian-900/85 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-electric-400" />
          <h2 className="text-lg font-bold text-white">
            Ready-to-Launch Viral Marketing Kit (1-Click Copy &amp; Share)
          </h2>
        </div>
        <p className="mt-1 text-xs text-slate-300">
          Pair Google organic search with student WhatsApp groups, TikTok/Reels
          screen-recording demos, and CBT scorecard challenges (now built
          directly into every completed exam result screen).
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {CAMPAIGN_TEMPLATES.map((tpl) => (
            <article
              key={tpl.id}
              className="flex flex-col justify-between rounded-xl border border-white/10 bg-obsidian-950/90 p-4"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-electric-400/30 bg-electric-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-electric-300">
                    <Sparkles className="h-3 w-3" />
                    {tpl.channel}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-bold text-white">
                  {tpl.title}
                </h3>
                <p className="mt-1 text-xs text-slate-400">{tpl.goal}</p>

                <pre className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-obsidian-900 p-3 font-sans text-xs leading-relaxed text-slate-200">
                  {tpl.copyText}
                </pre>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleCopy(tpl.id, tpl.copyText)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-electric-500 px-3.5 py-2 text-xs font-bold text-obsidian-950 transition hover:bg-electric-400"
                >
                  {copiedKey === tpl.id ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Script / Post</span>
                    </>
                  )}
                </button>

                {tpl.whatsappShare && (
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      tpl.copyText
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/25"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Send via WhatsApp</span>
                  </a>
                )}

                {tpl.xShare && (
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                      tpl.copyText
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-obsidian-900 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-electric-400/45 hover:text-white"
                  >
                    <span>Post on X</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
