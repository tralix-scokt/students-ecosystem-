import React from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BRAND_IDENTITY, ECOSYSTEM_FEATURES } from "@/data/ecosystemContent";

export function Footer() {
  return (
    <footer className="relative border-t border-slate-800/80 bg-obsidian-950">
      {/* Subtle top specular accent */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-electric-400/50 to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Brand Column */}
          <div className="md:col-span-5">
            <BrandLogo size="md" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              A focused, high-clarity academic platform engineered to support
              structured comprehension, guided AI inquiry, deliberate exam
              readiness, and organized scholarly growth.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-obsidian-900/80 px-3.5 py-1.5 text-xs text-slate-300">
              <span
                className="h-2 w-2 rounded-full bg-aura-400 shadow-[0_0_8px_#A78BFA]"
                aria-hidden="true"
              />
              <span>Intelligence Architecture • {BRAND_IDENTITY.engine}</span>
            </div>
          </div>

          {/* Ecosystem Pillars Column */}
          <div className="md:col-span-4">
            <h2 className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              Ecosystem Pillars
            </h2>
            <ul className="mt-4 space-y-2.5">
              {ECOSYSTEM_FEATURES.map((feature) => (
                <li key={feature.id}>
                  <a
                    href={`#${feature.id}`}
                    className="text-sm text-slate-400 transition-colors hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 rounded"
                  >
                    {feature.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Learner Portal Column */}
          <div className="md:col-span-3">
            <h2 className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              Learner Portal
            </h2>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link
                  href="/login"
                  className="text-sm text-slate-400 transition-colors hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 rounded"
                >
                  Sign In (3D Book Portal)
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-sm text-slate-400 transition-colors hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 rounded"
                >
                  Create an Account
                </Link>
              </li>
              <li>
                <a
                  href="#introduction"
                  className="text-sm text-slate-400 transition-colors hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 rounded"
                >
                  Platform Introduction
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-slate-800/70 pt-8 text-xs text-slate-500 sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {BRAND_IDENTITY.name}.{" "}
            {BRAND_IDENTITY.poweredBy}. All rights reserved.
          </p>
          <p className="text-slate-500">
            Secured with Supabase Authentication &amp; Row Level Security
          </p>
        </div>
      </div>
    </footer>
  );
}
