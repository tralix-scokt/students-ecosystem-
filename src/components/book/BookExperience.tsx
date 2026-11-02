"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BookCover } from "@/components/book/BookCover";
import { BookEducationQuotePage } from "@/components/book/BookEducationQuotePage";
import { BookLoginLeftPage } from "@/components/book/BookLoginLeftPage";
import { BookRegisterLeftPage } from "@/components/book/BookRegisterLeftPage";
import { BookRecoveryLeftPage } from "@/components/book/BookRecoveryLeftPage";
import { BookVerifyEmailPage } from "@/components/book/BookVerifyEmailPage";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { BookSpreadMode } from "@/types/auth";

interface BookExperienceProps {
  initialMode?: BookSpreadMode;
  initialOpen?: boolean;
  initialEmail?: string;
  initialAuthError?: string;
  nextPath?: string;
}

/**
 * Two-page open book experience (📖):
 * - Left page: Inspiring quote inspired by education
 * - Right page: Login / Create Account / Recovery / Email Verification form
 */
export function BookExperience({
  initialMode = "login",
  initialOpen = true,
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
      focusActiveSpreadInput(mode, reducedMotion ? 120 : 520);
      return true;
    });
  }, [focusActiveSpreadInput, mode, reducedMotion]);

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
    ? "Closed hardcover book. Activate Continue to open the book."
    : mode === "login"
      ? "Open two-page book: Educational quote on the left page, Sign In on the right page."
      : mode === "register"
        ? "Open two-page book: Create an Account on the right page."
        : mode === "verify-email"
          ? "Open two-page book: Verify Your Email on the right page."
          : "Open two-page book: Reset Your Password on the right page.";

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-x-clip bg-[#020510]">
      <div className="sr-only" role="status" aria-live="polite">
        {spreadAnnouncement}
      </div>

      {/* Studio Background Grid & Rim Ambient Pools */}
      <div
        className="pointer-events-none fixed inset-0 ecosystem-grid-bg"
        aria-hidden="true"
      />
      <div
        className="ambient-glow-cyan pointer-events-none fixed left-1/2 top-1/3 h-[540px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-80"
        aria-hidden="true"
      />
      <div
        className="ambient-glow-fuchsia pointer-events-none fixed bottom-10 right-1/4 h-[440px] w-[540px] rounded-full opacity-80"
        aria-hidden="true"
      />

      {/* Minimal Top Bar */}
      <header className="relative z-40 border-b border-white/[0.06] bg-obsidian-950/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-slate-800 bg-obsidian-900/90 px-3.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-electric-400/50 hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400"
            >
              <ArrowLeft
                className="h-3.5 w-3.5 text-electric-400"
                aria-hidden="true"
              />
              <span>Book Cover</span>
            </Link>
            <div className="hidden sm:block">
              <BrandLogo size="sm" showSubtitle={false} />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isOpen && (
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
                  Login Page
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
                  Register Page
                </button>
              </div>
            )}

            <span className="hidden items-center gap-1.5 rounded-full border border-slate-800 bg-obsidian-900/80 px-3 py-1.5 text-[11px] font-medium text-slate-300 sm:inline-flex">
              <BookOpen
                className="h-3.5 w-3.5 text-electric-400"
                aria-hidden="true"
              />
              <span>Students Ecosystem</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Open Two-Page Book Stage (📖) */}
      <main
        id="main-content"
        className="relative z-10 flex flex-1 flex-col items-center justify-center px-3 py-6 xs:px-5 sm:px-6 sm:py-10"
      >
        <div className="book-perspective w-full max-w-[1060px]">
          <div
            style={{
              transition: reducedMotion
                ? "transform 160ms ease"
                : "transform 950ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
            className={`preserve-3d relative mx-auto w-full ${
              isOpen
                ? "max-w-[1040px] book-assembly-open"
                : "max-w-[390px] book:max-w-[940px] book-assembly-closed"
            }`}
          >
            <div className="preserve-3d relative w-full">
              {/* Optional Closed Front Cover when initialOpen={false} */}
              {!isOpen && (
                <BookCover
                  isOpen={isOpen}
                  reducedMotion={reducedMotion}
                  onOpen={handleOpenBook}
                  enterButtonRef={enterButtonRef}
                />
              )}

              {/* OPEN TWO-PAGE HARDCOVER BOOK (📖) */}
              <div
                aria-hidden={!isOpen}
                className={`preserve-3d relative w-full transition-opacity duration-500 ${
                  isOpen
                    ? "opacity-100 pointer-events-auto"
                    : "max-h-[560px] overflow-hidden opacity-0 pointer-events-none select-none"
                }`}
              >
                <div
                  className={`relative rounded-[22px] p-2.5 sm:p-4 transition-shadow duration-700 ${
                    isOpen
                      ? "hardcover-surface border border-electric-400/35 shadow-book-open"
                      : "bg-transparent"
                  }`}
                >
                  {/* Animated Page-Turn Sheet When Switching Right-Page Mode */}
                  {turnSheetKey > 0 && !reducedMotion && (
                    <div
                      key={turnSheetKey}
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-4 left-1/2 right-4 z-30 hidden rounded-r-xl border border-electric-400/30 bg-gradient-to-r from-obsidian-800 via-obsidian-850 to-obsidian-900 shadow-2xl book:block animate-page-turn"
                    />
                  )}

                  {/* Stacked Outer Paper Fore-Edges Around the Open Book (📖) */}
                  {isOpen && (
                    <>
                      <div
                        aria-hidden="true"
                        className="paper-fore-edge-vertical pointer-events-none absolute inset-y-4 left-1.5 hidden w-2.5 rounded-l-sm book:block"
                      />
                      <div
                        aria-hidden="true"
                        className="paper-fore-edge-vertical pointer-events-none absolute inset-y-4 right-1.5 w-2.5 rounded-r-sm"
                      />
                      <div
                        aria-hidden="true"
                        className="paper-fore-edge-horizontal pointer-events-none absolute bottom-1.5 inset-x-5 h-2.5 rounded-b-sm"
                      />
                    </>
                  )}

                  <div className="preserve-3d relative grid grid-cols-1 book:grid-cols-2 book:min-h-[600px]">
                    {/* LEFT PAGE OF OPEN BOOK (📖): Educational Quote */}
                    <section
                      aria-label="Open book left page"
                      style={{
                        transition: reducedMotion
                          ? "opacity 150ms ease"
                          : "transform 950ms cubic-bezier(0.22, 1, 0.36, 1)",
                      }}
                      className={`book-left-wing book-interior-page-left relative z-10 flex flex-col rounded-t-2xl border border-slate-800/90 p-5 xs:p-6 sm:p-8 book:rounded-l-2xl book:rounded-tr-none book:pl-10 book:pr-9 ${
                        isOpen ? "book-left-wing-open" : "book-left-wing-closed"
                      }`}
                    >
                      <BookEducationQuotePage mode={mode} />
                    </section>

                    {/* MOBILE CENTER SPINE CREASE */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none relative z-20 flex h-3.5 w-full items-center justify-center bg-gradient-to-b from-obsidian-950 via-slate-800/80 to-obsidian-950 book:hidden"
                    >
                      <div className="h-px w-11/12 bg-gradient-to-r from-transparent via-electric-400/60 to-transparent" />
                    </div>

                    {/* DESKTOP DEEP CENTER BOOK SPINE CREASE & RIBBON BOOKMARK (📖) */}
                    <div
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-y-0 left-1/2 z-20 hidden w-9 -translate-x-1/2 items-center justify-center transition-opacity duration-500 book:flex ${
                        isOpen ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <div className="h-full w-full bg-gradient-to-r from-transparent via-[#01040c] to-transparent" />
                      <div className="absolute inset-y-2 w-[2px] bg-gradient-to-b from-electric-400/50 via-fuchsia-400/60 to-electric-400/50" />
                      <div className="absolute -bottom-3.5 h-6 w-3 bg-gradient-to-b from-fuchsia-500 to-electric-400 [clip-path:polygon(0_0,100%_0,100%_100%,50%_72%,0_100%)] shadow-cyan-glow" />
                    </div>

                    {/* RIGHT PAGE OF OPEN BOOK (📖): Login / Register / Recovery / Verify */}
                    <section
                      aria-label="Open book right page"
                      className="book-interior-page-right relative z-10 flex flex-col rounded-b-2xl border border-slate-800/90 p-5 xs:p-6 sm:p-8 book:rounded-r-2xl book:rounded-bl-none book:pl-9 book:pr-10"
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
                  </div>
                </div>
              </div>
            </div>

            {/* Cast Studio Shadow Below Open Book */}
            <div
              aria-hidden="true"
              className="pointer-events-none mx-auto mt-6 h-6 w-11/12 rounded-full bg-gradient-to-r from-electric-400/20 via-black/90 to-fuchsia-500/25 blur-xl opacity-80"
            />
          </div>
        </div>
      </main>

      <footer className="relative z-20 border-t border-white/[0.05] bg-obsidian-950/75 px-4 py-3 text-center text-xs text-slate-500 backdrop-blur-md">
        <span>Students Ecosystem &bull; Learn &bull; Grow &bull; Achieve</span>
      </footer>
    </div>
  );
}
