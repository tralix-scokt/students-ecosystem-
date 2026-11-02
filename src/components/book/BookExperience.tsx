"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, BookX } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BookCover } from "@/components/book/BookCover";
import { BookLoginLeftPage } from "@/components/book/BookLoginLeftPage";
import { BookLoginRightPage } from "@/components/book/BookLoginRightPage";
import { BookRegisterLeftPage } from "@/components/book/BookRegisterLeftPage";
import { BookRegisterRightPage } from "@/components/book/BookRegisterRightPage";
import { BookRecoveryLeftPage } from "@/components/book/BookRecoveryLeftPage";
import { BookVerifyEmailPage } from "@/components/book/BookVerifyEmailPage";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { BRAND_IDENTITY } from "@/data/ecosystemContent";
import type { BookSpreadMode } from "@/types/auth";

interface BookExperienceProps {
  initialMode?: BookSpreadMode;
  initialOpen?: boolean;
  initialEmail?: string;
  initialAuthError?: string;
  nextPath?: string;
}

export function BookExperience({
  initialMode = "login",
  initialOpen = false,
  initialEmail = "",
  initialAuthError,
  nextPath = "/onboarding",
}: BookExperienceProps) {
  const reducedMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [mode, setMode] = useState<BookSpreadMode>(initialMode);
  const [verificationEmail, setVerificationEmail] = useState(initialEmail);
  const [turnSheetKey, setTurnSheetKey] = useState<number>(0);

  const enterButtonRef = useRef<HTMLButtonElement | null>(null);
  const loginEmailRef = useRef<HTMLInputElement | null>(null);
  const registerNameRef = useRef<HTMLInputElement | null>(null);
  const recoveryEmailRef = useRef<HTMLInputElement | null>(null);

  const focusActiveSpreadInput = useCallback(
    (targetMode: BookSpreadMode, delayMs: number) => {
      const timer = window.setTimeout(() => {
        if (targetMode === "login") {
          loginEmailRef.current?.focus({ preventScroll: true });
        } else if (targetMode === "register") {
          registerNameRef.current?.focus({ preventScroll: true });
        } else if (targetMode === "recovery") {
          recoveryEmailRef.current?.focus({ preventScroll: true });
        }
      }, delayMs);
      return () => window.clearTimeout(timer);
    },
    []
  );

  const handleOpenBook = useCallback(() => {
    setIsOpen((prev) => {
      if (prev) return prev;
      focusActiveSpreadInput(mode, reducedMotion ? 120 : 620);
      return true;
    });
  }, [focusActiveSpreadInput, mode, reducedMotion]);

  const handleCloseBook = useCallback(() => {
    setIsOpen(false);
    window.setTimeout(
      () => {
        enterButtonRef.current?.focus({ preventScroll: true });
      },
      reducedMotion ? 80 : 480
    );
  }, [reducedMotion]);

  const handleModeSwitch = useCallback(
    (nextMode: BookSpreadMode, targetEmail?: string) => {
      if (typeof targetEmail === "string") {
        setVerificationEmail(targetEmail);
      }
      if (nextMode === mode) return;
      if (!reducedMotion) {
        setTurnSheetKey((prev) => prev + 1);
      }
      setMode(nextMode);
      focusActiveSpreadInput(nextMode, reducedMotion ? 60 : 260);
    },
    [focusActiveSpreadInput, mode, reducedMotion]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      const isLinkOrInput =
        activeTag === "a" ||
        activeTag === "input" ||
        activeTag === "select" ||
        activeTag === "textarea";

      if (!isOpen && event.key === "Enter" && !isLinkOrInput) {
        if (document.activeElement !== enterButtonRef.current) {
          event.preventDefault();
          handleOpenBook();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleOpenBook, isOpen]);

  const spreadAnnouncement = !isOpen
    ? "Closed 3D hardcover book. Activate Enter to open your journey."
    : mode === "login"
      ? "Book opened to Sign In spread: Welcome Back."
      : mode === "register"
        ? "Book turned to Create an Account spread."
        : mode === "verify-email"
          ? "Book turned to Verify Your Email confirmation screen."
          : "Book turned to Reset Your Password view.";

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-x-clip bg-obsidian-950">
      <div className="sr-only" role="status" aria-live="polite">
        {spreadAnnouncement}
      </div>

      {/* Studio Background Grid & Rim Ambient Pools */}
      <div
        className="pointer-events-none fixed inset-0 ecosystem-grid-bg"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed left-1/2 top-1/3 h-[540px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-electric-400/[0.09] blur-[140px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed bottom-10 right-1/4 h-[440px] w-[540px] rounded-full bg-aura-500/[0.11] blur-[140px]"
        aria-hidden="true"
      />

      {/* Top Portal Bar */}
      <header className="relative z-40 border-b border-white/[0.06] bg-obsidian-950/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-800 bg-obsidian-900/90 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-electric-400/50 hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400"
            >
              <ArrowLeft
                className="h-3.5 w-3.5 text-electric-400"
                aria-hidden="true"
              />
              <span>Landing Page</span>
            </Link>
            <div className="hidden sm:block">
              <BrandLogo size="sm" showSubtitle={false} />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isOpen ? (
              <>
                <div
                  role="group"
                  aria-label="Open book section"
                  className="inline-flex items-center rounded-xl border border-slate-800 bg-obsidian-900/90 p-1"
                >
                  <button
                    type="button"
                    onClick={() => handleModeSwitch("login")}
                    aria-pressed={mode === "login"}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 ${
                      mode === "login"
                        ? "bg-electric-400/20 text-electric-300 shadow-[inset_0_0_0_1px_rgba(0,229,255,0.35)]"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Folio 01 • Login
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeSwitch("register")}
                    aria-pressed={mode === "register"}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 ${
                      mode === "register"
                        ? "bg-aura-500/20 text-aura-300 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.4)]"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Folio 03 • Register
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCloseBook}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-800 bg-obsidian-900/90 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-electric-400/45 hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400"
                >
                  <BookX
                    className="h-3.5 w-3.5 text-aura-300"
                    aria-hidden="true"
                  />
                  <span className="hidden xs:inline">Close Cover</span>
                </button>
              </>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-obsidian-900/80 px-3.5 py-1.5 text-[11px] font-medium text-slate-300">
                <BookOpen
                  className="h-3.5 w-3.5 text-electric-400"
                  aria-hidden="true"
                />
                <span>{BRAND_IDENTITY.poweredBy}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main 3D Book Stage */}
      <main
        id="main-content"
        className="relative z-10 flex flex-1 flex-col items-center justify-center px-3 py-8 xs:px-5 sm:px-6 sm:py-12"
      >
        <div className="book-perspective w-full max-w-[1040px]">
          <div
            style={{
              transition: reducedMotion
                ? "transform 160ms ease"
                : "transform 1050ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
            className={`preserve-3d relative mx-auto w-full ${
              isOpen
                ? "max-w-[1020px] book-assembly-open"
                : "max-w-[390px] book:max-w-[940px] book-assembly-closed"
            }`}
          >
            <div
              className={`preserve-3d relative w-full ${
                !isOpen && !reducedMotion ? "animate-book-float" : ""
              }`}
            >
              {/* 1. CLOSED-STATE 3D SPINE & FORE-EDGE PAGE BLOCK */}
              <div
                aria-hidden="true"
                style={{
                  transition: reducedMotion
                    ? "opacity 120ms ease"
                    : "opacity 450ms ease",
                }}
                className={`pointer-events-none absolute inset-y-0 left-0 right-0 z-20 h-[540px] xs:h-[560px] book:h-full book:left-1/2 book:w-1/2 ${
                  isOpen ? "opacity-0" : "opacity-100"
                }`}
              >
                <div className="book-spine-surface absolute -left-4 inset-y-0 flex w-5 flex-col items-center justify-between rounded-l-md border-l border-y border-aura-400/40 py-7 sm:-left-5 sm:w-6">
                  <span className="h-[2px] w-full bg-gradient-to-r from-aura-400/60 via-electric-300/45 to-transparent" />
                  <span className="h-[2px] w-full bg-gradient-to-r from-aura-400/40 via-electric-300/30 to-transparent" />
                  <span className="writing-mode-vertical select-none font-display text-[8px] font-bold uppercase tracking-[0.28em] text-slate-300/80 [writing-mode:vertical-rl] rotate-180">
                    {BRAND_IDENTITY.name}
                  </span>
                  <span className="h-[2px] w-full bg-gradient-to-r from-aura-400/40 via-electric-300/30 to-transparent" />
                  <span className="h-[2px] w-full bg-gradient-to-r from-aura-400/60 via-electric-300/45 to-transparent" />
                </div>

                <div className="paper-fore-edge-vertical absolute -right-2.5 inset-y-2.5 w-3 rounded-r-sm" />
                <div className="paper-fore-edge-horizontal absolute -bottom-2.5 left-1 right-0 h-3 rounded-br-md" />
                <div className="absolute -bottom-3.5 -right-3.5 left-0 top-1.5 -z-10 rounded-r-2xl border border-aura-500/35 bg-obsidian-950 shadow-book-closed" />
              </div>

              {/* 2. FANNING 3D FLYLEAF SHEETS */}
              {!reducedMotion && (
                <>
                  <div
                    aria-hidden="true"
                    style={{
                      transformOrigin: "left center",
                      transform: isOpen
                        ? "translateZ(2px) rotateY(-179deg)"
                        : "translateZ(14px) rotateY(0deg)",
                      transition:
                        "transform 980ms cubic-bezier(0.22, 1, 0.36, 1) 55ms, opacity 300ms ease 700ms",
                    }}
                    className={`pointer-events-none backface-hidden absolute inset-x-1 top-2 z-20 h-[524px] rounded-r-xl border border-slate-300/30 bg-gradient-to-r from-slate-300/90 via-slate-100/95 to-slate-200/90 book:inset-y-2 book:left-1/2 book:right-1.5 book:h-auto book:w-[calc(50%-6px)] ${
                      isOpen ? "opacity-0" : "opacity-95"
                    }`}
                  />
                  <div
                    aria-hidden="true"
                    style={{
                      transformOrigin: "left center",
                      transform: isOpen
                        ? "translateZ(1px) rotateY(-178deg)"
                        : "translateZ(9px) rotateY(0deg)",
                      transition:
                        "transform 920ms cubic-bezier(0.22, 1, 0.36, 1) 115ms, opacity 300ms ease 720ms",
                    }}
                    className={`pointer-events-none backface-hidden absolute inset-x-1 top-2 z-20 h-[524px] rounded-r-xl border border-electric-300/25 bg-gradient-to-r from-obsidian-800 via-obsidian-850 to-obsidian-900 book:inset-y-2 book:left-1/2 book:right-1.5 book:h-auto book:w-[calc(50%-6px)] ${
                      isOpen ? "opacity-0" : "opacity-95"
                    }`}
                  />
                </>
              )}

              {/* 3. ROTATING 3D FRONT HARDCOVER */}
              <BookCover
                isOpen={isOpen}
                reducedMotion={reducedMotion}
                onOpen={handleOpenBook}
                enterButtonRef={enterButtonRef}
              />

              {/* 4. OPEN TWO-PAGE HARDCOVER TOME */}
              <div
                aria-hidden={!isOpen}
                className={`preserve-3d relative w-full transition-opacity duration-500 ${
                  isOpen
                    ? "opacity-100 pointer-events-auto"
                    : "max-h-[540px] xs:max-h-[560px] overflow-hidden opacity-0 book:max-h-none book:opacity-100 pointer-events-none select-none"
                }`}
              >
                <div
                  className={`relative rounded-2xl p-2 sm:p-3 transition-shadow duration-700 ${
                    isOpen
                      ? "hardcover-surface border border-electric-400/30 shadow-book-open"
                      : "bg-transparent"
                  }`}
                >
                  {turnSheetKey > 0 && !reducedMotion && (
                    <div
                      key={turnSheetKey}
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-3 left-1/2 right-3 z-30 hidden rounded-r-xl border border-electric-400/30 bg-gradient-to-r from-obsidian-800 via-obsidian-850 to-obsidian-900 shadow-2xl book:block animate-page-turn"
                    />
                  )}

                  {isOpen && (
                    <>
                      <div
                        aria-hidden="true"
                        className="paper-fore-edge-vertical pointer-events-none absolute inset-y-4 left-1.5 hidden w-2 rounded-l-sm book:block"
                      />
                      <div
                        aria-hidden="true"
                        className="paper-fore-edge-vertical pointer-events-none absolute inset-y-4 right-1.5 w-2 rounded-r-sm"
                      />
                      <div
                        aria-hidden="true"
                        className="paper-fore-edge-horizontal pointer-events-none absolute bottom-1.5 inset-x-4 h-2 rounded-b-sm"
                      />
                      <div
                        aria-hidden="true"
                        className="book-spine-surface pointer-events-none absolute inset-y-3 left-1 w-2 rounded-l-md book:hidden"
                      />
                    </>
                  )}

                  <div className="preserve-3d relative grid grid-cols-1 book:grid-cols-2 book:min-h-[610px]">
                    {/* LEFT PAGE */}
                    <section
                      aria-label="Open book left page"
                      style={{
                        transition: reducedMotion
                          ? "opacity 150ms ease"
                          : "transform 1050ms cubic-bezier(0.22, 1, 0.36, 1)",
                      }}
                      className={`book-left-wing book-interior-page-left relative z-10 flex flex-col rounded-t-xl border border-slate-800/90 p-5 xs:p-6 sm:p-8 book:rounded-l-xl book:rounded-tr-none book:pl-9 book:pr-8 ${
                        isOpen ? "book-left-wing-open" : "book-left-wing-closed"
                      }`}
                    >
                      {mode === "login" && (
                        <BookLoginLeftPage
                          isInteractive={isOpen}
                          emailInputRef={loginEmailRef}
                          initialAuthError={initialAuthError}
                          nextPath={nextPath}
                          onNavigateRegister={() =>
                            handleModeSwitch("register")
                          }
                          onNavigateRecovery={() =>
                            handleModeSwitch("recovery")
                          }
                          onNavigateVerifyEmail={(emailAddr) =>
                            handleModeSwitch("verify-email", emailAddr)
                          }
                        />
                      )}

                      {mode === "register" && (
                        <BookRegisterLeftPage
                          isInteractive={isOpen}
                          nameInputRef={registerNameRef}
                          onNavigateLogin={() => handleModeSwitch("login")}
                          onVerificationRequired={(registeredEmail) =>
                            handleModeSwitch("verify-email", registeredEmail)
                          }
                        />
                      )}

                      {mode === "recovery" && (
                        <BookRecoveryLeftPage
                          isInteractive={isOpen}
                          recoveryEmailRef={recoveryEmailRef}
                          onNavigateLogin={() => handleModeSwitch("login")}
                        />
                      )}

                      {mode === "verify-email" && (
                        <BookVerifyEmailPage
                          isInteractive={isOpen}
                          email={verificationEmail}
                          onNavigateLogin={() => handleModeSwitch("login")}
                        />
                      )}
                    </section>

                    {/* CENTER SPINE CREASE */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none relative z-20 flex h-3 w-full items-center justify-center bg-gradient-to-b from-obsidian-950 via-slate-800/70 to-obsidian-950 book:hidden"
                    >
                      <div className="h-px w-11/12 bg-gradient-to-r from-transparent via-electric-400/50 to-transparent" />
                    </div>

                    <div
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-y-0 left-1/2 z-20 hidden w-8 -translate-x-1/2 items-center justify-center transition-opacity duration-500 book:flex ${
                        isOpen ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <div className="h-full w-full bg-gradient-to-r from-transparent via-obsidian-950/95 to-transparent" />
                      <div className="absolute inset-y-2 w-[2px] bg-gradient-to-b from-electric-400/45 via-aura-400/55 to-electric-400/45" />
                      <div className="absolute -bottom-3 h-5 w-2.5 bg-gradient-to-b from-aura-500 to-electric-400 [clip-path:polygon(0_0,100%_0,100%_100%,50%_72%,0_100%)] shadow-cyan-glow" />
                    </div>

                    {/* RIGHT PAGE */}
                    <section
                      aria-label="Open book right page"
                      className="book-interior-page-right relative z-10 flex flex-col rounded-b-xl border border-slate-800/90 p-5 xs:p-6 sm:p-8 book:rounded-r-xl book:rounded-bl-none book:pl-8 book:pr-9"
                    >
                      {mode === "register" || mode === "verify-email" ? (
                        <BookRegisterRightPage />
                      ) : (
                        <BookLoginRightPage />
                      )}
                    </section>
                  </div>
                </div>
              </div>
            </div>

            {/* Cast Floor Shadow */}
            <div
              aria-hidden="true"
              className={`pointer-events-none mx-auto mt-7 h-7 rounded-full bg-gradient-to-r from-electric-400/20 via-black/90 to-aura-500/25 blur-xl transition-all duration-700 ${
                isOpen
                  ? "w-11/12 opacity-80"
                  : `w-4/5 book:left-1/4 book:relative book:w-2/5 ${
                      !reducedMotion ? "animate-shadow-breath" : "opacity-70"
                    }`
              }`}
            />
          </div>
        </div>
      </main>

      <footer className="relative z-20 border-t border-white/[0.05] bg-obsidian-950/75 px-4 py-3.5 text-center text-xs text-slate-500 backdrop-blur-md">
        <span>
          {BRAND_IDENTITY.name} • {BRAND_IDENTITY.poweredBy} • Encrypted
          Supabase Session Portal
        </span>
      </footer>
    </div>
  );
}
