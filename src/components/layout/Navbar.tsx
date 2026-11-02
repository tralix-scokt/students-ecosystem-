"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { LANDING_COPY } from "@/data/ecosystemContent";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-slate-800/80 bg-obsidian-950/85 backdrop-blur-xl shadow-[0_12px_40px_-16px_rgba(0,0,0,0.9)]"
          : "border-b border-white/[0.06] bg-obsidian-950/60 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-950"
          aria-label="E-LEARNING ECOSYSTEM Home"
        >
          <BrandLogo size="md" />
        </Link>

        {/* Desktop Navigation */}
        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-8 md:flex"
        >
          <a
            href="#introduction"
            className="text-sm font-medium text-slate-300 transition-colors hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 rounded-md px-2 py-1"
          >
            Overview
          </a>
          <a
            href="#features"
            className="text-sm font-medium text-slate-300 transition-colors hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 rounded-md px-2 py-1"
          >
            Core Pillars
          </a>
          <div className="h-4 w-px bg-slate-800" aria-hidden="true" />
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400"
          >
            <BookOpen className="h-4 w-4 text-electric-400" aria-hidden="true" />
            <span>{LANDING_COPY.secondaryCta}</span>
          </Link>
          <Link
            href="/login"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl border border-electric-400/50 bg-gradient-to-r from-electric-400/15 via-electric-500/20 to-aura-500/20 px-5 py-2.5 text-sm font-semibold text-white shadow-cyan-glow transition-all duration-300 hover:border-electric-300 hover:from-electric-400/25 hover:to-aura-500/30 hover:shadow-[0_0_34px_-4px_rgba(0,229,255,0.58)] focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-950"
          >
            <span>{LANDING_COPY.primaryCta}</span>
            <ArrowRight
              className="h-4 w-4 text-electric-300 transition-transform duration-300 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-primary-menu"
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-800 bg-obsidian-900/90 text-slate-200 transition-colors hover:border-electric-400/40 hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 md:hidden"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <nav
          id="mobile-primary-menu"
          aria-label="Mobile navigation"
          className="border-t border-slate-800/80 bg-obsidian-950/95 px-4 pb-6 pt-3 backdrop-blur-xl md:hidden"
        >
          <div className="flex flex-col gap-2">
            <a
              href="#introduction"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium text-slate-200 transition-colors hover:bg-obsidian-850 hover:text-electric-300"
            >
              Overview
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium text-slate-200 transition-colors hover:bg-obsidian-850 hover:text-electric-300"
            >
              Core Pillars
            </a>
            <div className="my-2 h-px bg-slate-800/80" aria-hidden="true" />
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-obsidian-900 px-4 text-sm font-medium text-white transition-colors hover:border-electric-400/50"
            >
              <BookOpen className="h-4 w-4 text-electric-400" aria-hidden="true" />
              <span>{LANDING_COPY.secondaryCta}</span>
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-1 flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-electric-400/50 bg-gradient-to-r from-electric-400/20 via-electric-500/25 to-aura-500/25 px-4 text-sm font-semibold text-white shadow-cyan-glow"
            >
              <span>{LANDING_COPY.primaryCta}</span>
              <ArrowRight className="h-4 w-4 text-electric-300" aria-hidden="true" />
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
