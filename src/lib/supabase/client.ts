"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export const REMEMBER_COOKIE_NAME = "se_remember";
const PERSISTENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function parseDocumentCookies(): { name: string; value: string }[] {
  if (typeof document === "undefined" || !document.cookie) return [];
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((pair) => {
      const idx = pair.indexOf("=");
      if (idx === -1) return { name: pair, value: "" };
      return {
        name: decodeURIComponent(pair.slice(0, idx)),
        value: decodeURIComponent(pair.slice(idx + 1)),
      };
    });
}

export function setBrowserRememberPreference(rememberMe: boolean): void {
  if (typeof document === "undefined") return;
  const isSecure =
    typeof window !== "undefined" && window.location.protocol === "https:";
  const secureAttr = isSecure ? "; Secure" : "";
  if (rememberMe) {
    document.cookie = `${REMEMBER_COOKIE_NAME}=1; Path=/; Max-Age=${PERSISTENT_MAX_AGE_SECONDS}; SameSite=Lax${secureAttr}`;
  } else {
    // Session-scoped preference cookie
    document.cookie = `${REMEMBER_COOKIE_NAME}=0; Path=/; SameSite=Lax${secureAttr}`;
  }
}

export function getBrowserRememberPreference(): boolean {
  const cookies = parseDocumentCookies();
  const found = cookies.find((c) => c.name === REMEMBER_COOKIE_NAME);
  return found?.value !== "0";
}

export function createBrowserSupabaseClient(
  explicitRememberMe?: boolean
): SupabaseClient | null {
  const config = getSupabasePublicConfig();
  if (!config) return null;

  return createBrowserClient(config.url, config.anonKey, {
    isSingleton: false,
    cookies: {
      getAll() {
        return parseDocumentCookies();
      },
      setAll(cookiesToSet) {
        if (typeof document === "undefined") return;
        const remember =
          explicitRememberMe ?? getBrowserRememberPreference();
        const isSecure =
          typeof window !== "undefined" &&
          window.location.protocol === "https:";

        for (const { name, value, options } of cookiesToSet) {
          const isRemoval = !value || options?.maxAge === 0;
          const parts: string[] = [
            `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
            `Path=${options?.path || "/"}`,
            `SameSite=${options?.sameSite ? String(options.sameSite) : "Lax"}`,
          ];

          if (isRemoval) {
            parts.push("Max-Age=0");
          } else if (remember) {
            const maxAge = options?.maxAge ?? PERSISTENT_MAX_AGE_SECONDS;
            parts.push(`Max-Age=${maxAge}`);
          }
          // When remember === false and not removing, omit Max-Age/Expires for session-only cookie

          if (options?.secure || isSecure) {
            parts.push("Secure");
          }

          document.cookie = parts.join("; ");
        }
      },
    },
  });
}
