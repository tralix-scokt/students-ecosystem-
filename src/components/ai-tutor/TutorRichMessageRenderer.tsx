"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  Eye,
  Lightbulb,
  Maximize2,
  RefreshCcw,
  Sparkles,
  X,
} from "lucide-react";
import {
  parseTutorMessageContent,
  type ConceptIllustrationPreset,
  type TutorDiagramSpec,
} from "@/lib/ai/visualTeaching";

function renderInlineFormatting(text: string): React.ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/g);
  return tokens.map((tok, idx) => {
    if (tok.startsWith("**") && tok.endsWith("**") && tok.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-white">
          {tok.slice(2, -2)}
        </strong>
      );
    }
    if (tok.startsWith("`") && tok.endsWith("`") && tok.length > 2) {
      return (
        <code
          key={idx}
          className="rounded-md border border-electric-400/25 bg-obsidian-900 px-1.5 py-0.5 font-mono text-[12.5px] text-electric-300"
        >
          {tok.slice(1, -1)}
        </code>
      );
    }
    if (tok.startsWith("*") && tok.endsWith("*") && tok.length > 2) {
      return (
        <em key={idx} className="italic text-slate-200">
          {tok.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={idx}>{tok}</React.Fragment>;
  });
}

function renderMarkdownText(markdown: string): React.ReactNode {
  const parts = markdown.split(/(```[\s\S]*?```)/g);
  const elements: React.ReactNode[] = [];

  parts.forEach((part, pIdx) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const firstNewline = part.indexOf("\n");
      const codeBody =
        firstNewline !== -1
          ? part.slice(firstNewline + 1, -3).trimEnd()
          : part.slice(3, -3);
      elements.push(
        <pre
          key={`code-${pIdx}`}
          className="my-3 overflow-x-auto rounded-xl border border-white/10 bg-obsidian-900/95 p-3.5 font-mono text-xs leading-relaxed text-electric-200"
        >
          <code>{codeBody}</code>
        </pre>
      );
      return;
    }

    const lines = part.split("\n");
    let i = 0;
    while (i < lines.length) {
      const rawLine = lines[i];
      const trimmed = rawLine.trim();

      if (!trimmed) {
        i += 1;
        continue;
      }

      // Headings (### / ## / #)
      const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const headingText = headingMatch[2];
        elements.push(
          <h3
            key={`h-${pIdx}-${i}`}
            className={`mt-4 mb-1.5 flex items-center gap-2 font-semibold tracking-tight text-white ${
              level <= 2 ? "text-base" : "text-sm text-electric-300"
            }`}
          >
            <span className="inline-block h-3.5 w-1 rounded-full bg-electric-400" />
            <span>{renderInlineFormatting(headingText)}</span>
          </h3>
        );
        i += 1;
        continue;
      }

      // Teacher Tip / Formula Callout (> ...)
      if (trimmed.startsWith(">")) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith(">")) {
          quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
          i += 1;
        }
        elements.push(
          <div
            key={`q-${pIdx}-${i}`}
            className="my-3 flex items-start gap-2.5 rounded-xl border border-electric-400/30 bg-electric-500/10 px-3.5 py-2.5 text-xs leading-relaxed text-electric-100"
          >
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-electric-300" />
            <div className="space-y-1">
              {quoteLines.map((ql, qi) => (
                <p key={qi}>{renderInlineFormatting(ql)}</p>
              ))}
            </div>
          </div>
        );
        continue;
      }

      // Markdown table
      if (
        trimmed.startsWith("|") &&
        i + 1 < lines.length &&
        /^\|\s*[-:]+/.test(lines[i + 1].trim())
      ) {
        const parseRow = (row: string) =>
          row
            .trim()
            .replace(/^\||\|$/g, "")
            .split("|")
            .map((cell) => cell.trim());
        const headers = parseRow(lines[i]);
        i += 2;
        const bodyRows: string[][] = [];
        while (i < lines.length && lines[i].trim().startsWith("|")) {
          bodyRows.push(parseRow(lines[i]));
          i += 1;
        }
        elements.push(
          <div
            key={`tbl-${pIdx}-${i}`}
            className="my-3 overflow-x-auto rounded-xl border border-white/10"
          >
            <table className="min-w-full divide-y divide-white/10 text-left text-xs">
              <thead className="bg-obsidian-900/90 text-electric-300">
                <tr>
                  {headers.map((h, hi) => (
                    <th key={hi} className="px-3 py-2 font-semibold">
                      {renderInlineFormatting(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-obsidian-950/60 text-slate-200">
                {bodyRows.map((r, ri) => (
                  <tr key={ri}>
                    {r.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2">
                        {renderInlineFormatting(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }

      // Bullet list
      if (/^[-*•]\s+/.test(trimmed)) {
        const items: string[] = [];
        while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
          items.push(lines[i].trim().replace(/^[-*•]\s+/, ""));
          i += 1;
        }
        elements.push(
          <ul key={`ul-${pIdx}-${i}`} className="my-2 space-y-1.5 pl-1">
            {items.map((item, li) => (
              <li
                key={li}
                className="flex items-start gap-2 text-sm leading-relaxed text-slate-200"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-electric-400" />
                <span>{renderInlineFormatting(item)}</span>
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // Numbered steps
      if (/^\d+[.)]\s+/.test(trimmed)) {
        const items: Array<{ num: string; body: string }> = [];
        while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
          const m = lines[i].trim().match(/^(\d+)[.)]\s+(.+)$/);
          if (m) {
            items.push({ num: m[1], body: m[2] });
          }
          i += 1;
        }
        elements.push(
          <ol key={`ol-${pIdx}-${i}`} className="my-2.5 space-y-2">
            {items.map((item, oi) => (
              <li
                key={oi}
                className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-200"
              >
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-electric-400/40 bg-electric-500/15 text-[11px] font-bold text-electric-300">
                  {item.num}
                </span>
                <span>{renderInlineFormatting(item.body)}</span>
              </li>
            ))}
          </ol>
        );
        continue;
      }

      // Regular paragraph
      const paraLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() !== "" &&
        !/^(#{1,4}\s+|>|[-*•]\s+|\d+[.)]\s+|\|)/.test(lines[i].trim())
      ) {
        paraLines.push(lines[i].trim());
        i += 1;
      }
      elements.push(
        <p
          key={`p-${pIdx}-${i}`}
          className="my-2 text-sm leading-relaxed text-slate-100"
        >
          {renderInlineFormatting(paraLines.join(" "))}
        </p>
      );
    }
  });

  return elements;
}

function IllustratedConceptSvg({
  preset,
  centerLabel,
  title,
}: {
  preset: ConceptIllustrationPreset;
  centerLabel: string;
  title: string;
}) {
  if (preset === "atom") {
    return (
      <svg
        viewBox="0 0 240 200"
        role="img"
        aria-label={title}
        className="h-44 w-full"
      >
        <ellipse
          cx="120"
          cy="100"
          rx="92"
          ry="36"
          fill="none"
          stroke="#00E5FF"
          strokeOpacity="0.55"
          strokeWidth="1.8"
          transform="rotate(-28 120 100)"
        />
        <ellipse
          cx="120"
          cy="100"
          rx="92"
          ry="36"
          fill="none"
          stroke="#A78BFA"
          strokeOpacity="0.6"
          strokeWidth="1.8"
          transform="rotate(28 120 100)"
        />
        <circle
          cx="120"
          cy="100"
          r="66"
          fill="none"
          stroke="#38BDF8"
          strokeDasharray="4 4"
          strokeOpacity="0.4"
          strokeWidth="1.4"
        />
        {/* Electrons */}
        <circle cx="48" cy="65" r="5.5" fill="#00E5FF" />
        <circle cx="192" cy="135" r="5.5" fill="#00E5FF" />
        <circle cx="188" cy="63" r="5.5" fill="#A78BFA" />
        <circle cx="120" cy="34" r="5.5" fill="#38BDF8" />
        {/* Nucleus */}
        <circle cx="114" cy="96" r="10" fill="#F43F5E" />
        <circle cx="127" cy="97" r="10" fill="#64748B" />
        <circle cx="120" cy="108" r="10" fill="#F43F5E" />
        <text
          x="120"
          y="188"
          textAnchor="middle"
          fill="#E2E8F0"
          fontSize="11"
          fontWeight="600"
        >
          {centerLabel}
        </text>
      </svg>
    );
  }

  if (preset === "cell") {
    return (
      <svg
        viewBox="0 0 240 200"
        role="img"
        aria-label={title}
        className="h-44 w-full"
      >
        <rect
          x="24"
          y="22"
          width="192"
          height="140"
          rx="58"
          fill="#0F172A"
          stroke="#00E5FF"
          strokeWidth="2.5"
        />
        <rect
          x="32"
          y="30"
          width="176"
          height="124"
          rx="52"
          fill="#0284C7"
          fillOpacity="0.12"
          stroke="#38BDF8"
          strokeDasharray="4 3"
          strokeWidth="1.2"
        />
        {/* Nucleus */}
        <circle
          cx="112"
          cy="92"
          r="30"
          fill="#7C3AED"
          fillOpacity="0.35"
          stroke="#A78BFA"
          strokeWidth="2"
        />
        <circle cx="112" cy="92" r="11" fill="#C4B5FD" />
        {/* Mitochondria */}
        <ellipse
          cx="172"
          cy="68"
          rx="18"
          ry="10"
          fill="#F59E0B"
          fillOpacity="0.3"
          stroke="#FBBF24"
          strokeWidth="1.6"
        />
        <path
          d="M160 68 Q166 62 172 68 T184 68"
          fill="none"
          stroke="#FDE68A"
          strokeWidth="1.4"
        />
        <ellipse
          cx="66"
          cy="124"
          rx="17"
          ry="9"
          fill="#10B981"
          fillOpacity="0.3"
          stroke="#34D399"
          strokeWidth="1.6"
        />
        {/* Ribosome dots */}
        <circle cx="66" cy="64" r="3" fill="#67E8F9" />
        <circle cx="76" cy="56" r="2.5" fill="#67E8F9" />
        <circle cx="164" cy="122" r="3" fill="#67E8F9" />
        <text
          x="120"
          y="186"
          textAnchor="middle"
          fill="#E2E8F0"
          fontSize="11"
          fontWeight="600"
        >
          {centerLabel}
        </text>
      </svg>
    );
  }

  if (preset === "plant") {
    return (
      <svg
        viewBox="0 0 240 200"
        role="img"
        aria-label={title}
        className="h-44 w-full"
      >
        {/* Sun */}
        <circle cx="42" cy="36" r="16" fill="#FBBF24" fillOpacity="0.9" />
        <line
          x1="62"
          y1="48"
          x2="96"
          y2="72"
          stroke="#FDE047"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
        {/* Leaf */}
        <path
          d="M72 126 C72 68, 152 46, 196 76 C172 132, 116 148, 72 126 Z"
          fill="#10B981"
          fillOpacity="0.28"
          stroke="#34D399"
          strokeWidth="2.4"
        />
        <path
          d="M72 126 Q132 98 190 78"
          fill="none"
          stroke="#6EE7B7"
          strokeWidth="2"
        />
        {/* Stem & roots */}
        <path
          d="M72 126 L72 166 M72 156 L54 170 M72 158 L90 170"
          stroke="#38BDF8"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        {/* O2 bubbles */}
        <circle cx="188" cy="44" r="8" fill="#00E5FF" fillOpacity="0.25" stroke="#00E5FF" />
        <text x="188" y="47" textAnchor="middle" fill="#CFFAFE" fontSize="8">
          O₂
        </text>
        <text
          x="128"
          y="188"
          textAnchor="middle"
          fill="#E2E8F0"
          fontSize="11"
          fontWeight="600"
        >
          {centerLabel}
        </text>
      </svg>
    );
  }

  if (preset === "earth_layers") {
    return (
      <svg
        viewBox="0 0 240 200"
        role="img"
        aria-label={title}
        className="h-44 w-full"
      >
        <circle cx="120" cy="94" r="72" fill="#0284C7" fillOpacity="0.25" stroke="#38BDF8" strokeWidth="2.5" />
        <circle cx="120" cy="94" r="54" fill="#D97706" fillOpacity="0.3" stroke="#F59E0B" strokeWidth="2" />
        <circle cx="120" cy="94" r="34" fill="#EA580C" fillOpacity="0.45" stroke="#FB923C" strokeWidth="2" />
        <circle cx="120" cy="94" r="16" fill="#FDE047" />
        <text x="120" y="186" textAnchor="middle" fill="#E2E8F0" fontSize="11" fontWeight="600">
          {centerLabel}
        </text>
      </svg>
    );
  }

  if (preset === "cpu_system") {
    return (
      <svg
        viewBox="0 0 240 200"
        role="img"
        aria-label={title}
        className="h-44 w-full"
      >
        <rect
          x="56"
          y="28"
          width="128"
          height="124"
          rx="14"
          fill="#0F172A"
          stroke="#00E5FF"
          strokeWidth="2.2"
        />
        <rect
          x="72"
          y="44"
          width="96"
          height="38"
          rx="6"
          fill="#00E5FF"
          fillOpacity="0.14"
          stroke="#00E5FF"
        />
        <text x="120" y="67" textAnchor="middle" fill="#CFFAFE" fontSize="10" fontWeight="600">
          Control Unit (CU)
        </text>
        <rect
          x="72"
          y="92"
          width="96"
          height="42"
          rx="6"
          fill="#A78BFA"
          fillOpacity="0.16"
          stroke="#A78BFA"
        />
        <text x="120" y="117" textAnchor="middle" fill="#EDE9FE" fontSize="10" fontWeight="600">
          ALU & Registers
        </text>
        <text x="120" y="182" textAnchor="middle" fill="#E2E8F0" fontSize="11" fontWeight="600">
          {centerLabel}
        </text>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 240 200"
      role="img"
      aria-label={title}
      className="h-44 w-full"
    >
      <line x1="120" y1="95" x2="48" y2="45" stroke="#00E5FF" strokeOpacity="0.5" strokeWidth="2" />
      <line x1="120" y1="95" x2="192" y2="45" stroke="#A78BFA" strokeOpacity="0.5" strokeWidth="2" />
      <line x1="120" y1="95" x2="48" y2="145" stroke="#34D399" strokeOpacity="0.5" strokeWidth="2" />
      <line x1="120" y1="95" x2="192" y2="145" stroke="#FBBF24" strokeOpacity="0.5" strokeWidth="2" />
      <circle cx="48" cy="45" r="14" fill="#0F172A" stroke="#00E5FF" strokeWidth="2" />
      <circle cx="192" cy="45" r="14" fill="#0F172A" stroke="#A78BFA" strokeWidth="2" />
      <circle cx="48" cy="145" r="14" fill="#0F172A" stroke="#34D399" strokeWidth="2" />
      <circle cx="192" cy="145" r="14" fill="#0F172A" stroke="#FBBF24" strokeWidth="2" />
      <circle
        cx="120"
        cy="95"
        r="38"
        fill="#0F172A"
        stroke="#00E5FF"
        strokeWidth="2.5"
      />
      <text
        x="120"
        y="99"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="11"
        fontWeight="700"
      >
        {centerLabel.slice(0, 16)}
      </text>
    </svg>
  );
}

function DiagramCanvas({ spec }: { spec: TutorDiagramSpec }) {
  if (spec.diagramType === "process_flow" && spec.steps) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {spec.steps.map((st, idx) => (
            <div
              key={idx}
              className="relative flex flex-col justify-between rounded-xl border border-electric-400/30 bg-obsidian-900/90 p-3.5"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-electric-500/20 text-xs font-bold text-electric-300">
                    {idx + 1}
                  </span>
                  {idx < spec.steps!.length - 1 ? (
                    <ArrowRight className="h-4 w-4 text-electric-400/70" />
                  ) : spec.isCycle ? (
                    <RefreshCcw className="h-4 w-4 text-aura-400" />
                  ) : null}
                </div>
                <p className="mt-2 text-xs font-semibold text-white">
                  {st.label}
                </p>
                {st.detail && (
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                    {st.detail}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        {spec.isCycle && (
          <p className="text-center text-[11px] font-medium text-aura-300">
            ↻ Continuous Cycle — Final stage feeds back into Stage 1
          </p>
        )}
      </div>
    );
  }

  if (spec.diagramType === "concept_anatomy" && spec.parts) {
    return (
      <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-12">
        <div className="rounded-xl border border-white/10 bg-obsidian-950/90 p-3 md:col-span-5">
          <IllustratedConceptSvg
            preset={spec.illustration || "general_hub"}
            centerLabel={spec.centerLabel || spec.title}
            title={spec.title}
          />
        </div>
        <div className="space-y-2 md:col-span-7">
          {spec.parts.map((part, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-obsidian-900/85 px-3 py-2.5"
            >
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-electric-500/20 text-[11px] font-bold text-electric-300">
                {idx + 1}
              </span>
              <div>
                <p className="text-xs font-semibold text-white">{part.name}</p>
                {part.role && (
                  <p className="mt-0.5 text-[11px] text-slate-300">
                    {part.role}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (spec.diagramType === "circuit_diagram") {
    const isParallel = spec.layout === "parallel";
    const comps = spec.components || [];
    return (
      <div className="space-y-3">
        <svg
          viewBox="0 0 420 190"
          role="img"
          aria-label={spec.title}
          className="h-48 w-full rounded-xl border border-white/10 bg-obsidian-950/90 p-2"
        >
          {/* Main outer loop */}
          <rect
            x="55"
            y="28"
            width={isParallel ? "230" : "310"}
            height="134"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2.4"
          />
          {isParallel && (
            <rect
              x="285"
              y="28"
              width="90"
              height="134"
              fill="none"
              stroke="#A78BFA"
              strokeWidth="2.4"
            />
          )}
          {/* Battery on left */}
          <rect x="43" y="78" width="24" height="32" fill="#090D16" />
          <line x1="40" y1="84" x2="70" y2="84" stroke="#00E5FF" strokeWidth="3" />
          <line x1="47" y1="94" x2="63" y2="94" stroke="#00E5FF" strokeWidth="2" />
          <line x1="40" y1="104" x2="70" y2="104" stroke="#00E5FF" strokeWidth="3" />
          <text x="14" y="72" fill="#67E8F9" fontSize="11" fontWeight="600">
            {spec.voltageLabel || "Supply V"}
          </text>

          {/* Current arrow on top */}
          <polygon points="175,28 163,22 163,34" fill="#FBBF24" />
          <text x="170" y="17" textAnchor="middle" fill="#FDE68A" fontSize="11" fontWeight="600">
            {spec.currentLabel || "Current (I)"}
          </text>

          {/* Resistors */}
          {isParallel ? (
            <>
              <rect
                x="265"
                y="68"
                width="40"
                height="54"
                rx="6"
                fill="#0F172A"
                stroke="#00E5FF"
                strokeWidth="2"
              />
              <text x="285" y="93" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700">
                {comps[0]?.label || "R₁"}
              </text>
              <text x="285" y="109" textAnchor="middle" fill="#94A3B8" fontSize="9">
                {comps[0]?.value || ""}
              </text>

              <rect
                x="355"
                y="68"
                width="40"
                height="54"
                rx="6"
                fill="#0F172A"
                stroke="#A78BFA"
                strokeWidth="2"
              />
              <text x="375" y="93" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700">
                {comps[1]?.label || "R₂"}
              </text>
              <text x="375" y="109" textAnchor="middle" fill="#94A3B8" fontSize="9">
                {comps[1]?.value || ""}
              </text>
            </>
          ) : (
            <>
              <rect
                x="235"
                y="14"
                width="96"
                height="28"
                rx="6"
                fill="#0F172A"
                stroke="#00E5FF"
                strokeWidth="2"
              />
              <text x="283" y="32" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700">
                {comps[0] ? `${comps[0].label}: ${comps[0].value}` : "R₁"}
              </text>
              {comps[1] && (
                <>
                  <rect
                    x="325"
                    y="72"
                    width="78"
                    height="44"
                    rx="6"
                    fill="#0F172A"
                    stroke="#A78BFA"
                    strokeWidth="2"
                  />
                  <text x="364" y="92" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700">
                    {comps[1].label}
                  </text>
                  <text x="364" y="106" textAnchor="middle" fill="#CBD5E1" fontSize="9">
                    {comps[1].value}
                  </text>
                </>
              )}
            </>
          )}
        </svg>
      </div>
    );
  }

  if (spec.diagramType === "geometry_vectors") {
    if (spec.subtype === "forces") {
      const vecMap = new Map(
        (spec.vectors || []).map((v) => [v.direction, v])
      );
      return (
        <svg
          viewBox="0 0 400 210"
          role="img"
          aria-label={spec.title}
          className="h-52 w-full rounded-xl border border-white/10 bg-obsidian-950/90 p-2"
        >
          {/* Surface line */}
          <line x1="60" y1="138" x2="340" y2="138" stroke="#475569" strokeDasharray="5 4" strokeWidth="1.5" />
          {/* Central body */}
          <rect
            x="160"
            y="82"
            width="80"
            height="56"
            rx="10"
            fill="#1E293B"
            stroke="#00E5FF"
            strokeWidth="2.2"
          />
          <text x="200" y="114" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="700">
            {spec.objectLabel || "Body (m)"}
          </text>

          {vecMap.get("up") && (
            <>
              <line x1="200" y1="82" x2="200" y2="28" stroke="#34D399" strokeWidth="2.8" />
              <polygon points="200,20 194,32 206,32" fill="#34D399" />
              <text x="210" y="30" fill="#6EE7B7" fontSize="10.5" fontWeight="600">
                {vecMap.get("up")!.label}{" "}
                {vecMap.get("up")!.magnitude ? `(${vecMap.get("up")!.magnitude})` : ""}
              </text>
            </>
          )}

          {vecMap.get("down") && (
            <>
              <line x1="200" y1="138" x2="200" y2="188" stroke="#F43F5E" strokeWidth="2.8" />
              <polygon points="200,196 194,184 206,184" fill="#F43F5E" />
              <text x="210" y="190" fill="#FDA4AF" fontSize="10.5" fontWeight="600">
                {vecMap.get("down")!.label}{" "}
                {vecMap.get("down")!.magnitude ? `(${vecMap.get("down")!.magnitude})` : ""}
              </text>
            </>
          )}

          {vecMap.get("right") && (
            <>
              <line x1="240" y1="110" x2="332" y2="110" stroke="#00E5FF" strokeWidth="2.8" />
              <polygon points="340,110 328,104 328,116" fill="#00E5FF" />
              <text x="292" y="98" textAnchor="middle" fill="#67E8F9" fontSize="10.5" fontWeight="600">
                {vecMap.get("right")!.label}{" "}
                {vecMap.get("right")!.magnitude ? `(${vecMap.get("right")!.magnitude})` : ""}
              </text>
            </>
          )}

          {vecMap.get("left") && (
            <>
              <line x1="160" y1="110" x2="68" y2="110" stroke="#FBBF24" strokeWidth="2.8" />
              <polygon points="60,110 72,104 72,116" fill="#FBBF24" />
              <text x="108" y="98" textAnchor="middle" fill="#FDE68A" fontSize="10.5" fontWeight="600">
                {vecMap.get("left")!.label}{" "}
                {vecMap.get("left")!.magnitude ? `(${vecMap.get("left")!.magnitude})` : ""}
              </text>
            </>
          )}

          {vecMap.get("resultant") && (
            <>
              <line x1="240" y1="82" x2="320" y2="34" stroke="#A78BFA" strokeDasharray="5 3" strokeWidth="2.6" />
              <polygon points="326,30 313,32 319,42" fill="#A78BFA" />
              <text x="328" y="46" fill="#DDD6FE" fontSize="10.5" fontWeight="600">
                {vecMap.get("resultant")!.label}
              </text>
            </>
          )}
        </svg>
      );
    }

    return (
      <svg
        viewBox="0 0 380 195"
        role="img"
        aria-label={spec.title}
        className="h-48 w-full rounded-xl border border-white/10 bg-obsidian-950/90 p-2"
      >
        <polygon
          points="90,152 290,152 90,36"
          fill="#00E5FF"
          fillOpacity="0.1"
          stroke="#00E5FF"
          strokeWidth="2.5"
        />
        {/* 90-degree square */}
        <polyline
          points="90,136 106,136 106,152"
          fill="none"
          stroke="#FBBF24"
          strokeWidth="2"
        />
        {/* Angle arc */}
        <path
          d="M254 152 A36 36 0 0 1 259 134"
          fill="none"
          stroke="#A78BFA"
          strokeWidth="2"
        />
        <text x="242" y="145" fill="#DDD6FE" fontSize="11" fontWeight="600">
          {spec.angleLabel || "θ"}
        </text>
        <text x="190" y="174" textAnchor="middle" fill="#E2E8F0" fontSize="11.5" fontWeight="600">
          {spec.baseLabel || "Base (a)"}
        </text>
        <text x="76" y="98" textAnchor="end" fill="#67E8F9" fontSize="11.5" fontWeight="600">
          {spec.heightLabel || "Height (b)"}
        </text>
        <text x="206" y="84" fill="#A78BFA" fontSize="11.5" fontWeight="600">
          {spec.hypotenuseLabel || "Hypotenuse (c)"}
        </text>
      </svg>
    );
  }

  if (spec.diagramType === "xy_graph" && spec.series) {
    const allPts = spec.series.flatMap((s) => s.points);
    const xs = allPts.map((p) => p[0]);
    const ys = allPts.map((p) => p[1]);
    const minX = Math.min(0, ...xs);
    const maxX = Math.max(1, ...xs);
    const minY = Math.min(0, ...ys);
    const maxY = Math.max(1, ...ys);
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;

    const toSvgX = (x: number) => 56 + ((x - minX) / spanX) * 300;
    const toSvgY = (y: number) => 158 - ((y - minY) / spanY) * 124;
    const palette = ["#00E5FF", "#A78BFA", "#34D399"];

    return (
      <div className="space-y-2">
        <svg
          viewBox="0 0 390 192"
          role="img"
          aria-label={spec.title}
          className="h-48 w-full rounded-xl border border-white/10 bg-obsidian-950/90 p-2"
        >
          {/* Gridlines */}
          {[0.25, 0.5, 0.75, 1].map((t) => (
            <line
              key={t}
              x1="56"
              y1={158 - t * 124}
              x2="356"
              y2={158 - t * 124}
              stroke="#1E293B"
              strokeWidth="1"
            />
          ))}
          {/* Axes */}
          <line x1="56" y1="24" x2="56" y2="158" stroke="#94A3B8" strokeWidth="2" />
          <line x1="56" y1="158" x2="364" y2="158" stroke="#94A3B8" strokeWidth="2" />
          <text x="210" y="182" textAnchor="middle" fill="#CBD5E1" fontSize="11" fontWeight="600">
            {spec.xLabel || "x"}
          </text>
          <text
            x="18"
            y="94"
            textAnchor="middle"
            fill="#CBD5E1"
            fontSize="11"
            fontWeight="600"
            transform="rotate(-90 18 94)"
          >
            {spec.yLabel || "y"}
          </text>

          {spec.series.map((s, si) => {
            const color = palette[si % palette.length];
            const poly = s.points
              .map(([x, y]) => `${toSvgX(x).toFixed(1)},${toSvgY(y).toFixed(1)}`)
              .join(" ");
            return (
              <g key={si}>
                <polyline
                  points={poly}
                  fill="none"
                  stroke={color}
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {s.points.map(([x, y], pi) => (
                  <circle
                    key={pi}
                    cx={toSvgX(x)}
                    cy={toSvgY(y)}
                    r="3.5"
                    fill={color}
                  />
                ))}
              </g>
            );
          })}

          {spec.highlightPoint && (
            <g>
              <circle
                cx={toSvgX(spec.highlightPoint.x)}
                cy={toSvgY(spec.highlightPoint.y)}
                r="6"
                fill="#FBBF24"
                stroke="#090D16"
                strokeWidth="2"
              />
              <text
                x={Math.min(toSvgX(spec.highlightPoint.x) + 10, 280)}
                y={Math.max(toSvgY(spec.highlightPoint.y) - 8, 22)}
                fill="#FDE68A"
                fontSize="10.5"
                fontWeight="700"
              >
                {spec.highlightPoint.label}
              </text>
            </g>
          )}
        </svg>

        <div className="flex flex-wrap gap-3 px-1 text-[11px] text-slate-300">
          {spec.series.map((s, si) => (
            <span key={si} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: palette[si % palette.length] }}
              />
              {s.label}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (spec.diagramType === "comparison_board" && spec.columns) {
    return (
      <div
        className={`grid grid-cols-1 gap-3 ${
          spec.columns.length >= 3 ? "md:grid-cols-3" : "sm:grid-cols-2"
        }`}
      >
        {spec.columns.map((col, ci) => (
          <div
            key={ci}
            className="rounded-xl border border-white/10 bg-obsidian-900/90 p-3.5"
          >
            <h4 className="border-b border-electric-400/25 pb-2 text-xs font-bold uppercase tracking-wider text-electric-300">
              {col.heading}
            </h4>
            <ul className="mt-2.5 space-y-1.5">
              {col.points.map((pt, pi) => (
                <li
                  key={pi}
                  className="flex items-start gap-2 text-xs leading-relaxed text-slate-200"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-aura-400" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  if (spec.diagramType === "number_fraction_bar") {
    const den = spec.denominator || 4;
    const num = spec.numerator ?? 1;
    return (
      <div className="space-y-3 rounded-xl border border-white/10 bg-obsidian-950/90 p-4">
        <div className="flex items-center justify-between text-xs font-semibold text-electric-200">
          <span>{spec.barLabel || `${num}/${den}`}</span>
          <span>
            {num} shaded out of {den} equal parts
          </span>
        </div>
        <div
          role="img"
          aria-label={spec.title}
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${den}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: den }).map((_, idx) => (
            <div
              key={idx}
              className={`h-9 rounded-md border transition ${
                idx < num
                  ? "border-electric-400 bg-electric-500/35"
                  : "border-white/15 bg-obsidian-900"
              }`}
            />
          ))}
        </div>
        {spec.secondDenominator && spec.secondNumerator !== undefined && (
          <div className="pt-2">
            <p className="mb-1.5 text-[11px] font-medium text-aura-300">
              Comparison bar: {spec.secondNumerator}/{spec.secondDenominator}
            </p>
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${spec.secondDenominator}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: spec.secondDenominator }).map((_, idx) => (
                <div
                  key={idx}
                  className={`h-7 rounded-md border ${
                    idx < spec.secondNumerator!
                      ? "border-aura-400 bg-aura-500/35"
                      : "border-white/15 bg-obsidian-900"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

export function TutorVisualDiagramCard({
  spec,
  source,
}: {
  spec: TutorDiagramSpec;
  source: "ai" | "curated_aid";
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

  return (
    <>
      <figure className="my-3.5 rounded-2xl border border-electric-400/30 bg-gradient-to-b from-obsidian-900/95 to-obsidian-950/95 p-4 shadow-lg">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-electric-400/35 bg-electric-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-electric-300">
              <Eye className="h-3 w-3" />
              {source === "curated_aid"
                ? "Classroom Illustrated Aid"
                : "Teacher Whiteboard Diagram"}
            </span>
            <figcaption className="text-xs font-bold text-white sm:text-sm">
              {spec.title}
            </figcaption>
          </div>

          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label={`Expand diagram ${spec.title}`}
            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-obsidian-900 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition hover:border-electric-400/50 hover:text-white"
          >
            <Maximize2 className="h-3 w-3" />
            Expand Visual
          </button>
        </div>

        <DiagramCanvas spec={spec} />

        {(spec.caption || spec.takeaway) && (
          <div className="mt-3 space-y-1 border-t border-white/10 pt-2.5 text-xs">
            {spec.caption && <p className="text-slate-300">{spec.caption}</p>}
            {spec.takeaway && (
              <p className="flex items-center gap-1.5 font-medium text-electric-300">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>Key Takeaway: {spec.takeaway}</span>
              </p>
            )}
          </div>
        )}
      </figure>

      {expanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={spec.title}
          onClick={() => setExpanded(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-electric-400/40 bg-obsidian-900 p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-electric-300">
                  Expanded Classroom Visual
                </p>
                <h3 className="text-base font-bold text-white">{spec.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                aria-label="Close expanded diagram"
                className="rounded-lg border border-white/15 bg-obsidian-950 p-2 text-slate-300 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <DiagramCanvas spec={spec} />
            {(spec.caption || spec.takeaway) && (
              <div className="mt-4 space-y-1.5 rounded-xl border border-white/10 bg-obsidian-950/80 p-3 text-xs">
                {spec.caption && <p className="text-slate-200">{spec.caption}</p>}
                {spec.takeaway && (
                  <p className="font-semibold text-electric-300">
                    Key Takeaway: {spec.takeaway}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function TutorRichMessageRenderer({
  content,
  allowVisualFallback = true,
}: {
  content: string;
  allowVisualFallback?: boolean;
}) {
  const blocks = parseTutorMessageContent(content, {
    allowCuratedFallback: allowVisualFallback,
    stripFollowUpSection: true,
  });

  return (
    <div className="space-y-1">
      {blocks.map((block, idx) =>
        block.kind === "diagram" ? (
          <TutorVisualDiagramCard
            key={`diag-${idx}`}
            spec={block.spec}
            source={block.source}
          />
        ) : (
          <div key={`md-${idx}`}>{renderMarkdownText(block.text)}</div>
        )
      )}
    </div>
  );
}
