import React from "react";
import { ContentProvenanceBadge } from "@/components/learning/ContentProvenanceBadge";
import type { ContentProvenance } from "@/types/learning";

interface LessonDiagramFigureProps {
  diagramKey: string | null;
  imageUrl: string | null;
  altText: string;
  caption: string | null;
  provenance: ContentProvenance;
}

export function LessonDiagramFigure({
  diagramKey,
  imageUrl,
  altText,
  caption,
  provenance,
}: LessonDiagramFigureProps) {
  return (
    <figure className="my-5 rounded-2xl border border-white/10 bg-obsidian-900/85 p-4 sm:p-5">
      <div className="flex items-center justify-center overflow-x-auto rounded-xl border border-white/[0.07] bg-slate-950/80 p-4">
        {diagramKey === "vector-displacement" ? (
          <svg
            viewBox="0 0 420 230"
            role="img"
            aria-label={altText}
            className="h-auto w-full max-w-md text-slate-200"
          >
            <defs>
              <marker
                id="arrow-cyan"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#22d3ee" />
              </marker>
              <marker
                id="arrow-emerald"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#34d399" />
              </marker>
            </defs>

            {/* Start to East 4m */}
            <line
              x1="60"
              y1="185"
              x2="280"
              y2="185"
              stroke="#22d3ee"
              strokeWidth="3"
              strokeDasharray="6 4"
              markerEnd="url(#arrow-cyan)"
            />
            {/* East to North 3m */}
            <line
              x1="280"
              y1="185"
              x2="280"
              y2="45"
              stroke="#22d3ee"
              strokeWidth="3"
              strokeDasharray="6 4"
              markerEnd="url(#arrow-cyan)"
            />
            {/* Resultant Displacement 5m */}
            <line
              x1="60"
              y1="185"
              x2="275"
              y2="49"
              stroke="#34d399"
              strokeWidth="3.5"
              markerEnd="url(#arrow-emerald)"
            />
            {/* Right-angle square */}
            <polyline
              points="264,185 264,169 280,169"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.5"
            />
            <circle cx="60" cy="185" r="4.5" fill="#f8fafc" />
            <circle cx="280" cy="45" r="4.5" fill="#34d399" />

            <text x="35" y="206" fill="#e2e8f0" fontSize="12" fontWeight="600">
              Start (O)
            </text>
            <text x="145" y="206" fill="#67e8f9" fontSize="12">
              4 m East (path)
            </text>
            <text x="292" y="122" fill="#67e8f9" fontSize="12">
              3 m North
            </text>
            <text x="288" y="42" fill="#6ee7b7" fontSize="12" fontWeight="600">
              Finish
            </text>
            <text
              x="110"
              y="102"
              fill="#6ee7b7"
              fontSize="12.5"
              fontWeight="700"
            >
              Displacement d = 5 m
            </text>
          </svg>
        ) : diagramKey === "binary-search-halving" ? (
          <svg
            viewBox="0 0 460 215"
            role="img"
            aria-label={altText}
            className="h-auto w-full max-w-lg text-slate-200"
          >
            <text x="20" y="26" fill="#cbd5e1" fontSize="12" fontWeight="600">
              Binary Search Interval Halving (n = 16 sorted items)
            </text>

            {/* Step 1: 16 */}
            <rect
              x="20"
              y="42"
              width="380"
              height="24"
              rx="5"
              fill="#1e293b"
              stroke="#38bdf8"
              strokeWidth="1.5"
            />
            <text x="30" y="58" fill="#e0f2fe" fontSize="11">
              Step 0: 16 candidates [indices 0..15]
            </text>

            {/* Step 2: 8 */}
            <rect
              x="210"
              y="80"
              width="190"
              height="24"
              rx="5"
              fill="#1e293b"
              stroke="#22d3ee"
              strokeWidth="1.5"
            />
            <text x="220" y="96" fill="#cffafe" fontSize="11">
              Comparison 1 → 8 remain
            </text>

            {/* Step 3: 4 */}
            <rect
              x="210"
              y="118"
              width="95"
              height="24"
              rx="5"
              fill="#1e293b"
              stroke="#34d399"
              strokeWidth="1.5"
            />
            <text x="218" y="134" fill="#d1fae5" fontSize="11">
              Comp 2 → 4
            </text>

            {/* Step 4: 2 -> 1 */}
            <rect
              x="257"
              y="156"
              width="48"
              height="24"
              rx="5"
              fill="#064e3b"
              stroke="#10b981"
              strokeWidth="1.8"
            />
            <text x="264" y="172" fill="#ecfdf5" fontSize="11" fontWeight="700">
              Found
            </text>
            <text x="20" y="198" fill="#94a3b8" fontSize="11">
              At most log₂(16) = 4 comparisons instead of 16 linear checks
            </text>
          </svg>
        ) : diagramKey === "simple-dc-circuit" ? (
          <svg
            viewBox="0 0 420 220"
            role="img"
            aria-label={altText}
            className="h-auto w-full max-w-md text-slate-200"
          >
            {/* Outer loop wires */}
            <line
              x1="90"
              y1="50"
              x2="330"
              y2="50"
              stroke="#94a3b8"
              strokeWidth="2.5"
            />
            <line
              x1="90"
              y1="170"
              x2="330"
              y2="170"
              stroke="#94a3b8"
              strokeWidth="2.5"
            />
            {/* Left DC source wires */}
            <line
              x1="90"
              y1="50"
              x2="90"
              y2="98"
              stroke="#94a3b8"
              strokeWidth="2.5"
            />
            <line
              x1="90"
              y1="120"
              x2="90"
              y2="170"
              stroke="#94a3b8"
              strokeWidth="2.5"
            />
            {/* Battery plates */}
            <line
              x1="68"
              y1="98"
              x2="112"
              y2="98"
              stroke="#38bdf8"
              strokeWidth="3.5"
            />
            <line
              x1="78"
              y1="120"
              x2="102"
              y2="120"
              stroke="#38bdf8"
              strokeWidth="3.5"
            />
            <text x="24" y="103" fill="#7dd3fc" fontSize="12" fontWeight="700">
              + 12 V
            </text>
            <text x="48" y="126" fill="#94a3b8" fontSize="12">
              −
            </text>

            {/* Right Resistor zig-zag */}
            <polyline
              points="330,50 330,76 342,84 318,96 342,108 318,120 342,132 330,140 330,170"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2.8"
            />
            <text x="352" y="114" fill="#fde68a" fontSize="12" fontWeight="700">
              R = 6 Ω
            </text>

            {/* Current flow indicator */}
            <text x="168" y="38" fill="#34d399" fontSize="12" fontWeight="700">
              I = V / R = 2 A →
            </text>
          </svg>
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={altText}
            loading="lazy"
            className="max-h-72 w-auto rounded-lg object-contain"
          />
        ) : (
          <p className="py-6 text-xs text-slate-400">{altText}</p>
        )}
      </div>

      <figcaption className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-slate-300">
          {caption || altText}
        </p>
        <ContentProvenanceBadge provenance={provenance} compact />
      </figcaption>
    </figure>
  );
}
