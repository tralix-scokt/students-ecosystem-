"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { AlertCircle, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function sanitizeInternalNext(raw: string | null): string {
  if (!raw) return "/onboarding";
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return "/onboarding";
  }
  return trimmed;
}

function AuthConfirmInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying"
  );
  const [message, setMessage] = useState(
    "Confirming your secure session with TRALIX AI authentication..."
  );

  useEffect(() => {
    let active = true;

    async function completeConfirmation() {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        if (!active) return;
        setStatus("error");
        setMessage("Supabase environment configuration is missing.");
        return;
      }

      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type") as EmailOtpType | null;
      const hashParams =
        typeof window !== "undefined" && window.location.hash.startsWith("#")
          ? new URLSearchParams(window.location.hash.slice(1))
          : null;
      const hashType = hashParams?.get("type");
      const hashError = hashParams?.get("error_description");

      if (hashError) {
        if (!active) return;
        setStatus("error");
        setMessage(hashError);
        return;
      }

      const defaultTarget =
        type === "recovery" || hashType === "recovery"
          ? "/reset-password"
          : "/onboarding";
      const safeNext = sanitizeInternalNext(
        searchParams.get("next") ?? defaultTarget
      );

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            if (!active) return;
            setStatus("error");
            setMessage(
              "This verification or recovery link has expired or has already been used."
            );
            return;
          }
          if (!active) return;
          setStatus("success");
          setMessage("Verified! Redirecting securely...");
          router.replace(safeNext);
          router.refresh();
          return;
        }

        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });
          if (error) {
            if (!active) return;
            setStatus("error");
            setMessage(
              "This verification or recovery link is invalid or has expired."
            );
            return;
          }
          if (!active) return;
          setStatus("success");
          setMessage("Verified! Redirecting securely...");
          router.replace(safeNext);
          router.refresh();
          return;
        }

        // Check if browser client already parsed #access_token=...&refresh_token=...
        const hashAccessToken = hashParams?.get("access_token");
        const hashRefreshToken = hashParams?.get("refresh_token");
        if (hashAccessToken && hashRefreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken,
          });
          if (error) {
            if (!active) return;
            setStatus("error");
            setMessage("Unable to establish session from link.");
            return;
          }
          if (!active) return;
          setStatus("success");
          setMessage("Verified! Redirecting securely...");
          router.replace(safeNext);
          router.refresh();
          return;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          if (!active) return;
          setStatus("success");
          setMessage("Session confirmed. Redirecting...");
          router.replace(safeNext);
          router.refresh();
          return;
        }

        if (!active) return;
        setStatus("error");
        setMessage(
          "No active verification token was found in this link. Please sign in or request a fresh link."
        );
      } catch {
        if (!active) return;
        setStatus("error");
        setMessage("Unable to verify link right now. Please try again.");
      }
    }

    completeConfirmation();
    return () => {
      active = false;
    };
  }, [router, searchParams]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-obsidian-950 px-4 py-12">
      <div
        className="pointer-events-none fixed inset-0 ecosystem-grid-bg"
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-electric-400/30 hardcover-surface p-8 text-center">
        <div className="mb-6 flex justify-center">
          <BrandLogo size="sm" />
        </div>

        {status === "verifying" && (
          <div className="space-y-4">
            <Loader2
              className="mx-auto h-10 w-10 animate-spin text-electric-400"
              aria-hidden="true"
            />
            <h1 className="font-display text-xl font-bold text-white">
              Verifying Your Link
            </h1>
            <p className="text-sm text-slate-300">{message}</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <CheckCircle2
              className="mx-auto h-10 w-10 text-electric-400"
              aria-hidden="true"
            />
            <h1 className="font-display text-xl font-bold text-white">
              Verification Successful
            </h1>
            <p className="text-sm text-slate-300">{message}</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-5">
            <AlertCircle
              className="mx-auto h-10 w-10 text-rose-400"
              aria-hidden="true"
            />
            <h1 className="font-display text-xl font-bold text-white">
              Verification Link Issue
            </h1>
            <p className="text-sm leading-relaxed text-slate-300">{message}</p>
            <Link
              href="/login"
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-electric-400/60 bg-gradient-to-r from-electric-400 to-aura-500 px-6 py-2.5 text-sm font-bold text-obsidian-950 shadow-cyan-glow"
            >
              <span>Return to Login</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-obsidian-950 text-slate-300">
          Verifying...
        </div>
      }
    >
      <AuthConfirmInner />
    </Suspense>
  );
}
