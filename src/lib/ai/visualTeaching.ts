import type {
  TutorExplanationStyle,
  TutorLearningMode,
  TutorVisualAidPreference,
} from "@/lib/ai/types";

export type TutorDiagramType =
  | "process_flow"
  | "concept_anatomy"
  | "circuit_diagram"
  | "geometry_vectors"
  | "xy_graph"
  | "comparison_board"
  | "number_fraction_bar";

export type ConceptIllustrationPreset =
  | "atom"
  | "cell"
  | "plant"
  | "earth_layers"
  | "cpu_system"
  | "general_hub";

export interface ProcessFlowStep {
  label: string;
  detail?: string;
}

export interface AnatomyPartCallout {
  name: string;
  role: string;
}

export interface CircuitComponentItem {
  label: string;
  value: string;
}

export interface VectorForceItem {
  direction: "up" | "down" | "left" | "right" | "resultant";
  label: string;
  magnitude?: string;
}

export interface GraphSeries {
  label: string;
  points: Array<[number, number]>;
}

export interface ComparisonColumn {
  heading: string;
  points: string[];
}

export interface TutorDiagramSpec {
  diagramType: TutorDiagramType;
  title: string;
  caption?: string;
  takeaway?: string;
  // 1. process_flow
  isCycle?: boolean;
  steps?: ProcessFlowStep[];
  // 2. concept_anatomy (illustrated educational picture + callouts)
  illustration?: ConceptIllustrationPreset;
  centerLabel?: string;
  parts?: AnatomyPartCallout[];
  // 3. circuit_diagram
  layout?: "series" | "parallel";
  voltageLabel?: string;
  currentLabel?: string;
  components?: CircuitComponentItem[];
  // 4. geometry_vectors
  subtype?: "right_triangle" | "forces";
  baseLabel?: string;
  heightLabel?: string;
  hypotenuseLabel?: string;
  angleLabel?: string;
  objectLabel?: string;
  vectors?: VectorForceItem[];
  // 5. xy_graph
  xLabel?: string;
  yLabel?: string;
  highlightPoint?: { x: number; y: number; label: string };
  series?: GraphSeries[];
  // 6. comparison_board
  columns?: ComparisonColumn[];
  // 7. number_fraction_bar
  numerator?: number;
  denominator?: number;
  secondNumerator?: number;
  secondDenominator?: number;
  barLabel?: string;
}

export type ParsedTutorContentBlock =
  | { kind: "markdown"; text: string }
  | { kind: "diagram"; spec: TutorDiagramSpec; source: "ai" | "curated_aid" };

const VALID_DIAGRAM_TYPES = new Set<TutorDiagramType>([
  "process_flow",
  "concept_anatomy",
  "circuit_diagram",
  "geometry_vectors",
  "xy_graph",
  "comparison_board",
  "number_fraction_bar",
]);

function clampStr(val: unknown, maxLen = 140, fallback = ""): string {
  if (typeof val !== "string") return fallback;
  return val.trim().slice(0, maxLen) || fallback;
}

export function sanitizeTutorDiagramSpec(raw: unknown): TutorDiagramSpec | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const rawType = String(obj.diagramType || "").trim() as TutorDiagramType;
  if (!VALID_DIAGRAM_TYPES.has(rawType)) return null;

  const title = clampStr(obj.title, 110, "Classroom Visual Explanation");
  const caption = clampStr(obj.caption, 200) || undefined;
  const takeaway = clampStr(obj.takeaway, 200) || undefined;

  const base: TutorDiagramSpec = {
    diagramType: rawType,
    title,
    caption,
    takeaway,
  };

  if (rawType === "process_flow") {
    const rawSteps = Array.isArray(obj.steps) ? obj.steps.slice(0, 7) : [];
    const steps: ProcessFlowStep[] = rawSteps
      .map((s) => {
        if (typeof s === "string") {
          return { label: clampStr(s, 60) };
        }
        if (s && typeof s === "object") {
          const item = s as Record<string, unknown>;
          return {
            label: clampStr(item.label || item.title || item.name, 60),
            detail: clampStr(item.detail || item.description, 110) || undefined,
          };
        }
        return { label: "" };
      })
      .filter((s) => s.label.length > 0);
    if (steps.length < 2) return null;
    return { ...base, isCycle: Boolean(obj.isCycle), steps };
  }

  if (rawType === "concept_anatomy") {
    const rawPreset = String(obj.illustration || "general_hub");
    const illustration: ConceptIllustrationPreset = [
      "atom",
      "cell",
      "plant",
      "earth_layers",
      "cpu_system",
      "general_hub",
    ].includes(rawPreset)
      ? (rawPreset as ConceptIllustrationPreset)
      : "general_hub";
    const centerLabel = clampStr(obj.centerLabel, 50, title.slice(0, 36));
    const rawParts = Array.isArray(obj.parts) ? obj.parts.slice(0, 6) : [];
    const parts: AnatomyPartCallout[] = rawParts
      .map((p) => {
        if (!p || typeof p !== "object") return { name: "", role: "" };
        const rec = p as Record<string, unknown>;
        return {
          name: clampStr(rec.name || rec.label, 50),
          role: clampStr(rec.role || rec.detail || rec.description, 120),
        };
      })
      .filter((p) => p.name.length > 0);
    if (parts.length === 0) return null;
    return { ...base, illustration, centerLabel, parts };
  }

  if (rawType === "circuit_diagram") {
    const layout = obj.layout === "parallel" ? "parallel" : "series";
    const voltageLabel = clampStr(obj.voltageLabel, 40, "V = 12 V");
    const currentLabel = clampStr(obj.currentLabel, 40, "I (Current)");
    const rawComps = Array.isArray(obj.components)
      ? obj.components.slice(0, 4)
      : [];
    const components: CircuitComponentItem[] = rawComps
      .map((c, idx) => {
        if (!c || typeof c !== "object") {
          return { label: `R${idx + 1}`, value: clampStr(c, 40, "Resistor") };
        }
        const rec = c as Record<string, unknown>;
        return {
          label: clampStr(rec.label || rec.name, 32, `R${idx + 1}`),
          value: clampStr(rec.value || rec.detail, 48, "Resistor"),
        };
      })
      .filter((c) => c.label.length > 0);
    return {
      ...base,
      layout,
      voltageLabel,
      currentLabel,
      components:
        components.length > 0
          ? components
          : [
              { label: "R₁", value: "6 Ω" },
              { label: "R₂", value: "12 Ω" },
            ],
    };
  }

  if (rawType === "geometry_vectors") {
    const subtype = obj.subtype === "forces" ? "forces" : "right_triangle";
    if (subtype === "right_triangle") {
      return {
        ...base,
        subtype: "right_triangle",
        baseLabel: clampStr(obj.baseLabel, 40, "Base (a)"),
        heightLabel: clampStr(obj.heightLabel, 40, "Height (b)"),
        hypotenuseLabel: clampStr(obj.hypotenuseLabel, 44, "Hypotenuse (c)"),
        angleLabel: clampStr(obj.angleLabel, 24, "θ"),
      };
    }
    const rawVecs = Array.isArray(obj.vectors) ? obj.vectors.slice(0, 5) : [];
    const vectors: VectorForceItem[] = rawVecs
      .map((v) => {
        if (!v || typeof v !== "object") {
          return { direction: "right" as const, label: "" };
        }
        const rec = v as Record<string, unknown>;
        const d = String(rec.direction || "right").toLowerCase();
        const direction: VectorForceItem["direction"] =
          d === "up" ||
          d === "down" ||
          d === "left" ||
          d === "right" ||
          d === "resultant"
            ? d
            : "right";
        return {
          direction,
          label: clampStr(rec.label, 42),
          magnitude: clampStr(rec.magnitude, 30) || undefined,
        };
      })
      .filter((v) => v.label.length > 0);
    return {
      ...base,
      subtype: "forces",
      objectLabel: clampStr(obj.objectLabel, 32, "Body (m)"),
      vectors:
        vectors.length > 0
          ? vectors
          : [
              { direction: "up", label: "Normal (N)" },
              { direction: "down", label: "Weight (mg)" },
              { direction: "right", label: "Applied Force (F)" },
            ],
    };
  }

  if (rawType === "xy_graph") {
    const xLabel = clampStr(obj.xLabel, 48, "x");
    const yLabel = clampStr(obj.yLabel, 48, "y");
    const rawSeries = Array.isArray(obj.series) ? obj.series.slice(0, 3) : [];
    const series: GraphSeries[] = rawSeries
      .map((s, idx) => {
        if (!s || typeof s !== "object") return { label: "", points: [] };
        const rec = s as Record<string, unknown>;
        const ptsRaw = Array.isArray(rec.points) ? rec.points.slice(0, 12) : [];
        const points: Array<[number, number]> = [];
        for (const p of ptsRaw) {
          if (Array.isArray(p) && p.length >= 2) {
            const x = Number(p[0]);
            const y = Number(p[1]);
            if (Number.isFinite(x) && Number.isFinite(y)) {
              points.push([x, y]);
            }
          } else if (p && typeof p === "object") {
            const po = p as Record<string, unknown>;
            const x = Number(po.x);
            const y = Number(po.y);
            if (Number.isFinite(x) && Number.isFinite(y)) {
              points.push([x, y]);
            }
          }
        }
        return {
          label: clampStr(rec.label, 44, `Curve ${idx + 1}`),
          points,
        };
      })
      .filter((s) => s.points.length >= 2);
    if (series.length === 0) return null;

    let highlightPoint: TutorDiagramSpec["highlightPoint"];
    if (obj.highlightPoint && typeof obj.highlightPoint === "object") {
      const hp = obj.highlightPoint as Record<string, unknown>;
      const hx = Number(hp.x);
      const hy = Number(hp.y);
      if (Number.isFinite(hx) && Number.isFinite(hy)) {
        highlightPoint = {
          x: hx,
          y: hy,
          label: clampStr(hp.label, 48, `(${hx}, ${hy})`),
        };
      }
    }
    return { ...base, xLabel, yLabel, series, highlightPoint };
  }

  if (rawType === "comparison_board") {
    const rawCols = Array.isArray(obj.columns) ? obj.columns.slice(0, 3) : [];
    const columns: ComparisonColumn[] = rawCols
      .map((c) => {
        if (!c || typeof c !== "object") return { heading: "", points: [] };
        const rec = c as Record<string, unknown>;
        const pts = Array.isArray(rec.points)
          ? rec.points
              .slice(0, 6)
              .map((p) => clampStr(p, 110))
              .filter(Boolean)
          : [];
        return {
          heading: clampStr(rec.heading || rec.title, 48),
          points: pts,
        };
      })
      .filter((c) => c.heading.length > 0 && c.points.length > 0);
    if (columns.length < 2) return null;
    return { ...base, columns };
  }

  if (rawType === "number_fraction_bar") {
    const denominator = Math.min(
      Math.max(Math.round(Number(obj.denominator) || 4), 2),
      20
    );
    const numerator = Math.min(
      Math.max(Math.round(Number(obj.numerator) || 1), 0),
      denominator
    );
    const secondDen = obj.secondDenominator
      ? Math.min(Math.max(Math.round(Number(obj.secondDenominator)), 2), 20)
      : undefined;
    const secondNum =
      secondDen !== undefined && obj.secondNumerator !== undefined
        ? Math.min(Math.max(Math.round(Number(obj.secondNumerator)), 0), secondDen)
        : undefined;
    return {
      ...base,
      numerator,
      denominator,
      secondNumerator: secondNum,
      secondDenominator: secondDen,
      barLabel: clampStr(
        obj.barLabel,
        60,
        `${numerator}/${denominator} (${Math.round((numerator / denominator) * 100)}%)`
      ),
    };
  }

  return null;
}

/**
 * Curated classroom picture fallback when an explanation covers a classic visual
 * STEM/humanities topic without an explicit AI-emitted diagram block.
 */
export function matchCuratedConceptIllustration(
  content: string
): TutorDiagramSpec | null {
  if (content.length < 220) return null;
  const lower = content.toLowerCase();

  if (/\bphotosynthesis\b/.test(lower) && /\bchlorophyll|glucose|sunlight\b/.test(lower)) {
    return {
      diagramType: "concept_anatomy",
      illustration: "plant",
      title: "Illustrated Picture: Photosynthesis Inside a Green Leaf",
      centerLabel: "Chloroplast",
      caption: "6CO₂ + 6H₂O + Light Energy → C₆H₁₂O₆ (Glucose) + 6O₂",
      takeaway:
        "Leaves absorb sunlight via chlorophyll, draw water through xylem roots, take in CO₂ through stomata, and release oxygen.",
      parts: [
        { name: "Sunlight Energy", role: "Captured by green chlorophyll pigment in chloroplasts." },
        { name: "Carbon Dioxide (CO₂)", role: "Enters tiny leaf pores called stomata from the air." },
        { name: "Water (H₂O)", role: "Absorbed by roots from soil and transported up xylem vessels." },
        { name: "Glucose & Oxygen (O₂)", role: "Glucose feeds the plant; oxygen is released into the air." },
      ],
    };
  }

  if (/\b(bohr|proton|neutron|electron\s+shell|atomic\s+number)\b/.test(lower) && /\batom|nucleus\b/.test(lower)) {
    return {
      diagramType: "concept_anatomy",
      illustration: "atom",
      title: "Illustrated Picture: Structure of an Atom",
      centerLabel: "Dense Nucleus",
      caption: "Protons (+) and Neutrons (0) sit in the nucleus while Electrons (−) orbit in shells.",
      takeaway: "In a neutral atom, the number of protons (+) equals the number of electrons (−).",
      parts: [
        { name: "Proton (+1)", role: "Positively charged particle in the nucleus; defines atomic number (Z)." },
        { name: "Neutron (0)", role: "Uncharged particle in the nucleus; adds mass and nuclear stability." },
        { name: "Electron (−1)", role: "Negatively charged particle moving in energy shells (2, 8, 8...)." },
        { name: "Valence Shell", role: "Outermost electron shell that determines chemical bonding." },
      ],
    };
  }

  if (/\b(mitochondri|cytoplasm|cell\s+membrane|organelle)\b/.test(lower) && /\bcell\b/.test(lower)) {
    return {
      diagramType: "concept_anatomy",
      illustration: "cell",
      title: "Illustrated Picture: Core Organelles of a Living Cell",
      centerLabel: "Nucleus (DNA)",
      caption: "Each organelle acts like a specialized department keeping the cell alive.",
      parts: [
        { name: "Cell Membrane", role: "Selective outer gate controlling what enters and exits the cell." },
        { name: "Nucleus", role: "Control center storing genetic instructions (DNA)." },
        { name: "Mitochondria", role: "Powerhouse releasing ATP energy via cellular respiration." },
        { name: "Cytoplasm & Ribosomes", role: "Jelly-like medium where chemical reactions and protein synthesis happen." },
      ],
    };
  }

  if (/\bohm'?s\s+law\b/.test(lower) && /\bvoltage|current|resistance\b/.test(lower)) {
    return {
      diagramType: "circuit_diagram",
      layout: /\bparallel\b/.test(lower) && !/\bseries\s+circuit\b/.test(lower) ? "parallel" : "series",
      title: "Circuit Diagram: Ohm's Law (V = I × R)",
      voltageLabel: "Supply (V)",
      currentLabel: "Current (I)",
      caption: "Voltage pushes electric current around the closed loop while resistance opposes flow.",
      takeaway: "Increase Voltage (V) → Current (I) rises. Increase Resistance (R) → Current (I) drops.",
      components: [
        { label: "R₁", value: "Load Resistor (Ω)" },
        { label: "Ammeter", value: "Measures I (Amps)" },
      ],
    };
  }

  if (/\bpythagor|hypotenuse\b/.test(lower) && /\btriangle\b/.test(lower)) {
    return {
      diagramType: "geometry_vectors",
      subtype: "right_triangle",
      title: "Right-Angled Triangle Diagram (a² + b² = c²)",
      baseLabel: "Adjacent / Base (a)",
      heightLabel: "Opposite / Height (b)",
      hypotenuseLabel: "Hypotenuse (c)",
      angleLabel: "θ",
      caption: "The hypotenuse (c) is always the longest side directly opposite the 90° right angle.",
    };
  }

  return null;
}

const DIAGRAM_FENCE_REGEX = /```(?:tutor-diagram|diagram|json)\s*([\s\S]*?)```/gi;

export function parseTutorMessageContent(
  rawContent: string,
  options?: { allowCuratedFallback?: boolean; stripFollowUpSection?: boolean }
): ParsedTutorContentBlock[] {
  let working = rawContent || "";

  if (options?.stripFollowUpSection !== false) {
    const splitMarker = working.search(
      /(?:\n|^)\s*(?:#{1,4}\s*|\*\*)?Suggested Follow-up Questions:?\*?\*?/i
    );
    if (splitMarker !== -1) {
      working = working.slice(0, splitMarker).trimEnd();
    }
  }

  const blocks: ParsedTutorContentBlock[] = [];
  let hasDiagram = false;
  let lastIndex = 0;

  DIAGRAM_FENCE_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null = DIAGRAM_FENCE_REGEX.exec(working);
  while (match !== null) {
    const fullFence = match[0];
    const innerJson = (match[1] || "").trim();
    const startIdx = match.index;

    const cleanedJson = innerJson.replace(/,\s*([}\]])/g, "$1");
    let parsedSpec: TutorDiagramSpec | null = null;
    if (cleanedJson.includes('"diagramType"')) {
      try {
        parsedSpec = sanitizeTutorDiagramSpec(JSON.parse(cleanedJson));
      } catch {
        parsedSpec = null;
      }
    }

    if (parsedSpec) {
      const before = working.slice(lastIndex, startIdx).trim();
      if (before) {
        blocks.push({ kind: "markdown", text: before });
      }
      blocks.push({ kind: "diagram", spec: parsedSpec, source: "ai" });
      hasDiagram = true;
      lastIndex = startIdx + fullFence.length;
    } else if (fullFence.toLowerCase().startsWith("```tutor-diagram")) {
      // Hide malformed internal diagram fence so raw broken JSON never leaks into UI
      const before = working.slice(lastIndex, startIdx).trim();
      if (before) {
        blocks.push({ kind: "markdown", text: before });
      }
      lastIndex = startIdx + fullFence.length;
    }

    match = DIAGRAM_FENCE_REGEX.exec(working);
  }

  const remainder = working.slice(lastIndex).trim();
  if (remainder) {
    blocks.push({ kind: "markdown", text: remainder });
  }

  if (!hasDiagram && options?.allowCuratedFallback !== false) {
    const curated = matchCuratedConceptIllustration(working);
    if (curated) {
      blocks.push({ kind: "diagram", spec: curated, source: "curated_aid" });
    }
  }

  if (blocks.length === 0 && rawContent.trim()) {
    blocks.push({ kind: "markdown", text: rawContent.trim() });
  }

  return blocks;
}

/**
 * Formats an AI Tutor message cleanly when saving into private Student Notes
 * so structured `tutor-diagram` blocks become readable study summaries.
 */
export function formatTutorContentForSavedNote(rawContent: string): string {
  const parsed = parseTutorMessageContent(rawContent, {
    allowCuratedFallback: false,
    stripFollowUpSection: true,
  });

  return parsed
    .map((block) => {
      if (block.kind === "markdown") return block.text;
      const s = block.spec;
      const lines = [`[Visual Study Diagram: ${s.title}]`];
      if (s.caption) lines.push(`Summary: ${s.caption}`);
      if (s.steps) {
        s.steps.forEach((st, i) =>
          lines.push(
            `  ${i + 1}. ${st.label}${st.detail ? ` — ${st.detail}` : ""}`
          )
        );
      }
      if (s.parts) {
        s.parts.forEach((p) => lines.push(`  • ${p.name}: ${p.role}`));
      }
      if (s.columns) {
        s.columns.forEach((c) =>
          lines.push(`  • ${c.heading}: ${c.points.join("; ")}`)
        );
      }
      if (s.takeaway) lines.push(`Key Takeaway: ${s.takeaway}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

/**
 * Builds the master classroom teacher system prompt shared by Next.js `/api/ai/gateway`
 * (and mirrored in `supabase/functions/ai-gateway/index.ts`).
 */
export function buildMasterTeacherSystemPrompt(params: {
  academicContext: string;
  subject: string | null;
  learningMode: TutorLearningMode;
  modeLabel: string;
  modeDescription: string;
  explanationStyle: TutorExplanationStyle | string;
  visualPreference: TutorVisualAidPreference;
}): string {
  const visualDirective =
    params.visualPreference === "none"
      ? "VISUAL PREFERENCE: Text-only mode selected. Do NOT output any ```tutor-diagram``` block."
      : params.visualPreference === "always"
        ? "VISUAL PREFERENCE: Visual Learner Mode ON. You MUST include exactly ONE valid ```tutor-diagram``` JSON block illustrating the core concept or problem."
        : `VISUAL PREFERENCE: Auto (Like a Real Classroom Teacher). Include ONE valid \`\`\`tutor-diagram\`\`\` JSON block WHENEVER a diagram, labeled picture, circuit, triangle/vector sketch, graph, fraction bar, process cycle, or comparison chart will help the student SEE and understand the topic faster (or whenever the student asks to draw/show/illustrate). Skip diagrams for simple greetings, 1-line factual lookups, or short conversational follow-ups.`;

  return `You are the TRALIX AI Master Classroom Teacher inside E-LEARNING ECOSYSTEM.

1. SAFETY & HONESTY RULES:
- Safe & age-appropriate for secondary school (JSS 1–SS 3, ages 11–18), university, and polytechnic students. Strictly refuse self-harm, violence, sexual content, hate speech, dangerous instructions, or live-exam cheating.
- Never claim official WAEC, NECO, JAMB, or university endorsement, and never fabricate verbatim past-paper citations.

2. TEACH LIKE A WARM, SKILLED REAL CLASSROOM TEACHER:
- Speak naturally, warmly, and encouragingly ("Let's walk through this together...", "Picture this in everyday life...").
- ANSWER BASIC QUESTIONS EFFORTLESSLY: If the student asks a basic question, greeting, quick calculation, simple definition, grammar check, or short follow-up ("What is 15% of 200?", "What is a noun?", "Why does ice float?", "I didn't understand step 2"), answer directly, simply, and warmly in plain everyday English right away—do NOT overwhelm a basic question with a huge essay!
- EXPLAIN FULL TOPICS LIKE A GREAT TEACHER AT THE WHITEBOARD:
  a) Start with **Everyday Intuition / Real-World Analogy** in plain words before technical jargon.
  b) Break the lesson into clear, bite-sized steps using short headings (###), **bold key terms**, and plain-text formulas (define every symbol and SI unit).
  c) Use a \`> Teacher Tip:\` blockquote to highlight a memory trick or the #1 mistake students make in exams.
  d) End the explanation with one friendly **Quick Check** question so the student can test their understanding.

3. ${visualDirective}
When you include a visual diagram/picture, place a fenced \`\`\`tutor-diagram\`\`\` block containing STRICT valid JSON (double quotes, no comments, no trailing commas) using ONE of these 7 schemas:
- Process / Cycle / Timeline:
\`\`\`tutor-diagram
{"diagramType":"process_flow","title":"Stages of Photosynthesis","isCycle":false,"caption":"How plants convert light into chemical food","steps":[{"label":"1. Light Absorption","detail":"Chlorophyll traps sunlight"},{"label":"2. Water Uptake","detail":"Roots draw H2O up xylem"},{"label":"3. Glucose & O2","detail":"CO2 + H2O form glucose and release oxygen"}],"takeaway":"Light energy becomes stored chemical energy."}
\`\`\`
- Labeled Picture / Structure Anatomy (illustration: "atom" | "cell" | "plant" | "earth_layers" | "cpu_system" | "general_hub"):
\`\`\`tutor-diagram
{"diagramType":"concept_anatomy","illustration":"cell","title":"Annotated Picture: Parts of an Animal Cell","centerLabel":"Nucleus","caption":"Key organelles and their jobs","parts":[{"name":"Cell Membrane","role":"Controls entry and exit"},{"name":"Nucleus","role":"Stores DNA instructions"},{"name":"Mitochondria","role":"Releases ATP energy"}],"takeaway":"Each organelle performs a vital life function."}
\`\`\`
- Electrical Circuit Picture (layout: "series" | "parallel"):
\`\`\`tutor-diagram
{"diagramType":"circuit_diagram","layout":"parallel","title":"Parallel DC Circuit","voltageLabel":"12 V Battery","currentLabel":"I_total = 3 A","components":[{"label":"R1","value":"6 Ω"},{"label":"R2","value":"12 Ω"}],"takeaway":"Voltage across parallel branches is identical."}
\`\`\`
- Geometry Right-Triangle OR Physics Force Vectors (subtype: "right_triangle" | "forces"):
\`\`\`tutor-diagram
{"diagramType":"geometry_vectors","subtype":"right_triangle","title":"Ladder Against a Wall","baseLabel":"Base = 6 m","heightLabel":"Height = 8 m","hypotenuseLabel":"Ladder = 10 m","angleLabel":"θ","takeaway":"6² + 8² = 100, so √100 = 10 m."}
\`\`\`
(or for forces: \`{"diagramType":"geometry_vectors","subtype":"forces","title":"Forces on a Moving Block","objectLabel":"Block (m)","vectors":[{"direction":"up","label":"Normal N","magnitude":"50 N"},{"direction":"down","label":"Weight mg","magnitude":"50 N"},{"direction":"right","label":"Pull F","magnitude":"20 N"},{"direction":"left","label":"Friction f","magnitude":"5 N"}]}\`)
- Coordinate / Economics / Motion Graph:
\`\`\`tutor-diagram
{"diagramType":"xy_graph","title":"Supply and Demand Equilibrium","xLabel":"Quantity (Q)","yLabel":"Price (₦)","series":[{"label":"Demand (D)","points":[[1,90],[3,60],[5,30]]},{"label":"Supply (S)","points":[[1,30],[3,60],[5,90]]}],"highlightPoint":{"x":3,"y":60,"label":"Equilibrium (Q=3, ₦60)"}}
\`\`\`
- Side-by-Side Comparison Board:
\`\`\`tutor-diagram
{"diagramType":"comparison_board","title":"Scalar vs Vector Quantities","columns":[{"heading":"Scalars","points":["Magnitude (size) only","Examples: Mass, Speed, Time","Added by ordinary arithmetic"]},{"heading":"Vectors","points":["Magnitude AND direction","Examples: Velocity, Force, Displacement","Added using vector geometry"]}]}
\`\`\`
- Visual Fraction / Percentage Bar (for basic math & ratios):
\`\`\`tutor-diagram
{"diagramType":"number_fraction_bar","title":"Visualizing 3/4 (75%)","numerator":3,"denominator":4,"barLabel":"3 out of 4 equal parts = 75%"}
\`\`\`

4. LEARNER CONTEXT & MODE:
${params.academicContext}
Subject Focus: ${params.subject || "General / Any Subject (including basic questions)"}.
Explanation Depth Preference: ${params.explanationStyle}.
Active Mode: ${params.modeLabel} — ${params.modeDescription}

5. FOLLOW-UP PROMPTS:
At the very end of your response, include a final section titled "Suggested Follow-up Questions:" followed by 3 concise, natural bullet-point questions the student can tap next.`;
}
