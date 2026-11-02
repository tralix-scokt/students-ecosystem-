import React from "react";
import { Award, CheckCircle2, Compass, Layers, Sparkles } from "lucide-react";
import { ECOSYSTEM_FEATURES, type EcosystemFeature } from "@/data/ecosystemContent";

function FeatureIcon({
  iconName,
  accent,
}: {
  iconName: EcosystemFeature["iconName"];
  accent: EcosystemFeature["accent"];
}) {
  const colorClass =
    accent === "cyan" ? "text-electric-400" : "text-aura-400";

  switch (iconName) {
    case "layers":
      return <Layers className={`h-6 w-6 ${colorClass}`} aria-hidden="true" />;
    case "sparkles":
      return (
        <Sparkles className={`h-6 w-6 ${colorClass}`} aria-hidden="true" />
      );
    case "award":
      return <Award className={`h-6 w-6 ${colorClass}`} aria-hidden="true" />;
    case "compass":
      return <Compass className={`h-6 w-6 ${colorClass}`} aria-hidden="true" />;
  }
}

export function FeatureCardsSection() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="relative py-20 sm:py-28"
    >
      {/* Subtle Background Ambient Glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[460px] w-[780px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-electric-400/[0.06] blur-[140px]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-display text-xs font-semibold uppercase tracking-[0.24em] text-aura-400">
            FOUR INTEGRATED PILLARS
          </span>
          <h2
            id="features-heading"
            className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl"
          >
            Engineered for Complete Academic Mastery
          </h2>
          <p className="mt-4 text-base text-slate-400 sm:text-lg">
            Four interconnected capabilities designed to support learners from
            initial concept discovery through confident examination performance.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
          {ECOSYSTEM_FEATURES.map((feature) => {
            const isCyan = feature.accent === "cyan";
            return (
              <article
                key={feature.id}
                id={feature.id}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-7 sm:p-8 rim-border-card transition-all duration-300 hover:-translate-y-1 ${
                  isCyan
                    ? "border-slate-800/90 hover:border-electric-400/50"
                    : "border-slate-800/90 hover:border-aura-400/50"
                }`}
              >
                {/* Top Corner Rim Accent */}
                <div
                  className={`pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full blur-3xl transition-opacity duration-500 opacity-35 group-hover:opacity-75 ${
                    isCyan ? "bg-electric-400/30" : "bg-aura-500/35"
                  }`}
                  aria-hidden="true"
                />

                <div>
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-105 ${
                        isCyan
                          ? "border-electric-400/35 bg-electric-400/10 shadow-[0_0_24px_-6px_rgba(0,229,255,0.4)]"
                          : "border-aura-400/35 bg-aura-500/10 shadow-[0_0_24px_-6px_rgba(139,92,246,0.45)]"
                      }`}
                    >
                      <FeatureIcon
                        iconName={feature.iconName}
                        accent={feature.accent}
                      />
                    </div>
                    <span className="font-display text-xs font-semibold tracking-[0.24em] text-slate-500">
                      PILLAR {feature.index}
                    </span>
                  </div>

                  <p
                    className={`mt-6 font-display text-xs font-semibold uppercase tracking-[0.18em] ${
                      isCyan ? "text-electric-300" : "text-aura-300"
                    }`}
                  >
                    {feature.subtitle}
                  </p>

                  <h3 className="mt-1.5 font-display text-2xl font-bold text-white">
                    {feature.title}
                  </h3>

                  <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
                    {feature.description}
                  </p>
                </div>

                <ul className="mt-7 flex flex-wrap gap-3 border-t border-slate-800/80 pt-5">
                  {feature.highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-obsidian-950/75 px-3 py-1.5 text-xs font-medium text-slate-300"
                    >
                      <CheckCircle2
                        className={`h-3.5 w-3.5 shrink-0 ${
                          isCyan ? "text-electric-400" : "text-aura-400"
                        }`}
                        aria-hidden="true"
                      />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
