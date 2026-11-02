"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Info,
  Sparkles,
} from "lucide-react";
import { describeContentClassification } from "@/lib/learning/personalization";
import type {
  ContentClassification,
  ContentProvenance,
} from "@/types/learning";

interface ContentProvenanceBadgeProps {
  classification?: ContentClassification | null;
  provenance?: ContentProvenance;
  showDetailsToggle?: boolean;
  compact?: boolean;
}

export function ContentProvenanceBadge({
  classification,
  provenance,
  showDetailsToggle = false,
  compact = false,
}: ContentProvenanceBadgeProps) {
  const [expanded, setExpanded] = useState(false);
  const effectiveClass =
    classification ??
    provenance?.verification?.content_classification ??
    provenance?.source?.content_classification ??
    "ai_generated";

  const info = describeContentClassification(effectiveClass, provenance);

  const toneStyles = {
    emerald:
      "border-emerald-400/35 bg-emerald-500/10 text-emerald-200",
    cyan: "border-cyan-400/35 bg-cyan-500/10 text-cyan-200",
    amber: "border-amber-400/35 bg-amber-500/10 text-amber-200",
  }[info.tone];

  const Icon =
    info.tone === "emerald"
      ? CheckCircle2
      : info.tone === "cyan"
        ? FileCheck2
        : Sparkles;

  const source = provenance?.source ?? null;
  const verification = provenance?.verification ?? null;

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${toneStyles} ${
            compact ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs"
          }`}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{compact ? info.shortLabel : info.badgeLabel}</span>
        </span>

        {showDetailsToggle && (source || verification) ? (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:border-white/20 hover:text-white"
          >
            <Info className="h-3 w-3 text-slate-400" aria-hidden="true" />
            <span>{expanded ? "Hide source metadata" : "Source & license"}</span>
          </button>
        ) : null}
      </div>

      {showDetailsToggle && expanded && (source || verification) ? (
        <div className="w-full max-w-2xl rounded-xl border border-white/10 bg-obsidian-950/95 p-3.5 text-xs text-slate-300">
          <p className="font-semibold text-white">
            Content Source &amp; Verification Metadata
          </p>
          <p className="mt-1 text-slate-400">{info.statusNote}</p>

          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {source ? (
              <>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Source Name
                  </dt>
                  <dd className="mt-0.5 text-slate-200">{source.source_name}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Author / Publisher
                  </dt>
                  <dd className="mt-0.5 text-slate-200">
                    {source.author_or_publisher}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    License / Permission
                  </dt>
                  <dd className="mt-0.5 text-slate-200">
                    {source.license_or_permission}
                  </dd>
                </div>
              </>
            ) : null}

            {verification ? (
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Verification Status
                </dt>
                <dd className="mt-0.5 capitalize text-slate-200">
                  {verification.verification_status.replace(/_/g, " ")}
                  {verification.reviewer_name
                    ? ` • ${verification.reviewer_name}`
                    : ""}
                  {verification.reviewed_at
                    ? ` (${new Date(verification.reviewed_at).toLocaleDateString()})`
                    : ""}
                </dd>
              </div>
            ) : null}
          </dl>

          {source?.attribution_text ? (
            <p className="mt-2.5 border-t border-white/10 pt-2 text-[11px] text-slate-400">
              {source.attribution_text}
            </p>
          ) : null}

          {source?.source_url_or_reference &&
          source.source_url_or_reference.startsWith("https://") ? (
            <a
              href={source.source_url_or_reference}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-cyan-300 hover:text-cyan-200"
            >
              <span>Reference URL</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
