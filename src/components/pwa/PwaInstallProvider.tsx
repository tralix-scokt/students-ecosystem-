"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Check, Download, Share, Smartphone, Sparkles, X } from "lucide-react";

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt: () => Promise<void>;
}

export type InstallTriggerOutcome =
  | "accepted"
  | "dismissed"
  | "manual-guide"
  | "already-installed";

interface PwaInstallContextValue {
  isStandalone: boolean;
  canPromptNative: boolean;
  isIos: boolean;
  swRegistered: boolean;
  triggerInstall: () => Promise<InstallTriggerOutcome>;
  openGuideModal: () => void;
  closeGuideModal: () => void;
}

const DEFAULT_PWA_CONTEXT: PwaInstallContextValue = {
  isStandalone: false,
  canPromptNative: false,
  isIos: false,
  swRegistered: false,
  triggerInstall: async () => "manual-guide",
  openGuideModal: () => undefined,
  closeGuideModal: () => undefined,
};

const PwaInstallContext =
  createContext<PwaInstallContextValue>(DEFAULT_PWA_CONTEXT);

export function usePwaInstall(): PwaInstallContextValue {
  return useContext(PwaInstallContext);
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (
      typeof window.matchMedia === "function" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: window-controls-overlay)").matches)
    ) {
      return true;
    }
    const nav = window.navigator as Navigator & { standalone?: boolean };
    if (nav.standalone === true) return true;
  } catch {
    // Ignore restricted window matchMedia access
  }
  return false;
}

function detectIos(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  const isClassicIos = /iPad|iPhone|iPod/i.test(ua);
  const isIpadOs =
    window.navigator.platform === "MacIntel" &&
    window.navigator.maxTouchPoints > 1;
  return isClassicIos || isIpadOs;
}

export function PwaInstallProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [swRegistered, setSwRegistered] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    setIsStandalone(detectStandalone());
    setIsIos(detectIos());

    // Register Service Worker for installability & offline shell
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      typeof navigator.serviceWorker?.register === "function"
    ) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then(() => {
          setSwRegistered(true);
        })
        .catch(() => {
          // Non-fatal in test/preview environments without SW support
        });
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setGuideOpen(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    let mql: MediaQueryList | null = null;
    const onDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true);
      }
    };
    if (typeof window.matchMedia === "function") {
      try {
        mql = window.matchMedia("(display-mode: standalone)");
        if (typeof mql.addEventListener === "function") {
          mql.addEventListener("change", onDisplayModeChange);
        }
      } catch {
        mql = null;
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      if (mql && typeof mql.removeEventListener === "function") {
        mql.removeEventListener("change", onDisplayModeChange);
      }
    };
  }, []);

  const triggerInstall = useCallback(async (): Promise<InstallTriggerOutcome> => {
    if (isStandalone) {
      return "already-installed";
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        if (choice.outcome === "accepted") {
          setIsStandalone(true);
          return "accepted";
        }
        return "dismissed";
      } catch {
        setDeferredPrompt(null);
      }
    }

    setGuideOpen(true);
    return "manual-guide";
  }, [deferredPrompt, isStandalone]);

  const openGuideModal = useCallback(() => setGuideOpen(true), []);
  const closeGuideModal = useCallback(() => setGuideOpen(false), []);

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      isStandalone,
      canPromptNative: Boolean(deferredPrompt),
      isIos,
      swRegistered,
      triggerInstall,
      openGuideModal,
      closeGuideModal,
    }),
    [
      closeGuideModal,
      deferredPrompt,
      isIos,
      isStandalone,
      openGuideModal,
      swRegistered,
      triggerInstall,
    ]
  );

  return (
    <PwaInstallContext.Provider value={value}>
      {children}

      {guideOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-guide-title"
        >
          <div
            className="fixed inset-0 bg-obsidian-950/85 backdrop-blur-sm"
            onClick={closeGuideModal}
            aria-hidden="true"
          />

          <div className="futuristic-hud-panel relative z-10 w-full max-w-md rounded-3xl p-6 text-white shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-electric-400/40 bg-electric-500/15 text-electric-300 shadow-cyan-glow">
                  <Smartphone className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-electric-300">
                    Installable Study App
                  </p>
                  <h2
                    id="pwa-install-guide-title"
                    className="font-display text-lg font-bold text-white"
                  >
                    Install E-Learning Ecosystem
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={closeGuideModal}
                aria-label="Close install instructions"
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-obsidian-900/90 text-slate-400 transition hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-slate-300">
              Launch E-Learning Ecosystem directly from your home screen or
              desktop dock in full-screen standalone mode — no browser address
              bar, instant access to AI Tutor, JAMB/WAEC/NECO CBT, and offline
              notes.
            </p>

            {isIos ? (
              <ol className="mt-4 space-y-2.5 text-xs text-slate-200">
                <li className="futuristic-tile flex items-start gap-3 rounded-2xl p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-electric-500/20 font-bold text-electric-300">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-white">
                      Tap the Share icon{" "}
                      <Share className="inline h-3.5 w-3.5 text-electric-300" />{" "}
                      in Safari
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Located at the bottom toolbar on iPhone or top bar on iPad.
                    </p>
                  </div>
                </li>
                <li className="futuristic-tile flex items-start gap-3 rounded-2xl p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-electric-500/20 font-bold text-electric-300">
                    2
                  </span>
                  <div>
                    <p className="font-semibold text-white">
                      Select &ldquo;Add to Home Screen&rdquo;
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Scroll slightly down the share sheet and tap Add to Home
                      Screen.
                    </p>
                  </div>
                </li>
                <li className="futuristic-tile flex items-start gap-3 rounded-2xl p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-electric-500/20 font-bold text-electric-300">
                    3
                  </span>
                  <div>
                    <p className="font-semibold text-white">
                      Tap &ldquo;Add&rdquo; in the top-right corner
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      The official TRALIX AI app icon appears on your home
                      screen immediately.
                    </p>
                  </div>
                </li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-2.5 text-xs text-slate-200">
                <li className="futuristic-tile flex items-start gap-3 rounded-2xl p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-electric-500/20 font-bold text-electric-300">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-white">
                      Click the Install icon in your browser bar or menu (⋮)
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      In Chrome, Edge, or Brave on Android &amp; Desktop, open
                      the browser menu and tap{" "}
                      <strong className="text-white">Install app</strong> or{" "}
                      <strong className="text-white">Add to Home screen</strong>
                      .
                    </p>
                  </div>
                </li>
                <li className="futuristic-tile flex items-start gap-3 rounded-2xl p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-electric-500/20 font-bold text-electric-300">
                    2
                  </span>
                  <div>
                    <p className="font-semibold text-white">
                      Confirm &ldquo;Install&rdquo;
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      E-Learning Ecosystem installs as a dedicated app on your
                      phone or computer with quick-launch shortcuts.
                    </p>
                  </div>
                </li>
              </ol>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={closeGuideModal}
                className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-electric-500 px-5 py-2 text-xs font-bold text-obsidian-950 transition hover:bg-electric-400"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Got It</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </PwaInstallContext.Provider>
  );
}

export function InstallAppButton({
  variant = "header",
  collapsed = false,
  onAfterClick,
}: {
  variant?: "header" | "sidebar" | "drawer" | "public-nav";
  collapsed?: boolean;
  onAfterClick?: () => void;
}) {
  const { isStandalone, canPromptNative, triggerInstall } = usePwaInstall();

  if (isStandalone) {
    if (variant === "header" || variant === "public-nav") {
      return null;
    }
    return (
      <div
        className={`flex min-h-[42px] w-full items-center gap-2.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 ${
          collapsed ? "justify-center" : ""
        }`}
        title="App Installed"
      >
        <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
        {!collapsed && <span>App Installed</span>}
      </div>
    );
  }

  const handleClick = async () => {
    await triggerInstall();
    onAfterClick?.();
  };

  if (variant === "header") {
    return (
      <button
        type="button"
        onClick={() => void handleClick()}
        aria-label="Install E-Learning app"
        title="Install E-Learning Ecosystem as an app on your device"
        className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 ${
          canPromptNative
            ? "border-electric-400/50 bg-electric-500/15 text-electric-200 shadow-cyan-glow hover:bg-electric-500/25"
            : "border-slate-800 bg-obsidian-900/90 text-slate-200 hover:border-electric-400/45 hover:text-electric-300"
        }`}
      >
        <Download
          className="h-3.5 w-3.5 shrink-0 text-electric-400"
          aria-hidden="true"
        />
        <span className="hidden sm:inline">Install App</span>
      </button>
    );
  }

  if (variant === "public-nav") {
    return (
      <button
        type="button"
        onClick={() => void handleClick()}
        aria-label="Install E-Learning app"
        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-electric-400/40 bg-electric-500/12 px-3 py-1.5 text-xs font-semibold text-electric-200 transition hover:border-electric-400 hover:bg-electric-500/20"
      >
        <Download className="h-3.5 w-3.5 text-electric-400" aria-hidden="true" />
        <span>Install App</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      aria-label="Install E-Learning app"
      title={collapsed ? "Install App" : undefined}
      className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl border border-electric-400/35 bg-electric-500/10 px-3 py-2.5 text-xs font-semibold text-electric-200 transition-colors hover:border-electric-400/60 hover:bg-electric-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 ${
        collapsed ? "justify-center" : ""
      }`}
    >
      <Download
        className="h-4 w-4 shrink-0 text-electric-400"
        aria-hidden="true"
      />
      {!collapsed && <span>Install App</span>}
    </button>
  );
}
