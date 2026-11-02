import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  createBoundedFetch,
  getSupabasePublicConfig,
  isNetworkTransportError,
} from "@/lib/supabase/config";

export const REMEMBER_COOKIE_NAME = "se_remember";
const PERSISTENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function createServerSupabaseClient(options?: {
  rememberMe?: boolean;
  timeoutMs?: number;
}): Promise<SupabaseClient | null> {
  const config = getSupabasePublicConfig();
  if (!config) return null;

  const cookieStore = await cookies();
  const rememberCookie = cookieStore.get(REMEMBER_COOKIE_NAME)?.value;
  const shouldPersist =
    options?.rememberMe ?? (rememberCookie !== "0" ? true : false);

  return createServerClient(config.url, config.anonKey, {
    global: {
      fetch: createBoundedFetch(options?.timeoutMs ?? 3000),
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          if (typeof options?.rememberMe === "boolean") {
            cookieStore.set(
              REMEMBER_COOKIE_NAME,
              options.rememberMe ? "1" : "0",
              {
                path: "/",
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
                ...(options.rememberMe
                  ? { maxAge: PERSISTENT_MAX_AGE_SECONDS }
                  : {}),
              }
            );
          }

          for (const { name, value, options: cookieOptions } of cookiesToSet) {
            const isRemoval = !value || cookieOptions?.maxAge === 0;
            const adjustedOptions = { ...cookieOptions };

            if (!isRemoval && !shouldPersist) {
              delete adjustedOptions.maxAge;
              delete adjustedOptions.expires;
            } else if (!isRemoval && shouldPersist) {
              adjustedOptions.maxAge =
                cookieOptions?.maxAge ?? PERSISTENT_MAX_AGE_SECONDS;
            }

            cookieStore.set(name, value, adjustedOptions);
          }
        } catch {
          // Called from a Server Component where cookie mutation is deferred to middleware
        }
      },
    },
  });
}

/**
 * Resolves the authenticated Supabase user on the server.
 * Primarily verifies via `supabase.auth.getUser()` against Supabase GoTrue.
 * If outbound container networking is restricted (e.g. sandbox preview),
 * falls back only to non-expired structured session cookies while client guards
 * perform live verification against Supabase Auth in the user's browser.
 */
export async function getServerAuthenticatedUser(): Promise<{
  user: User | null;
  isEmailVerified: boolean;
}> {
  const supabase = await createServerSupabaseClient({ timeoutMs: 2500 });
  if (!supabase) {
    return { user: null, isEmailVerified: false };
  }

  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) {
      return {
        user: data.user,
        isEmailVerified: Boolean(data.user.email_confirmed_at),
      };
    }

    if (error && isNetworkTransportError(error)) {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (
        session?.user &&
        (!session.expires_at || session.expires_at > nowSeconds)
      ) {
        return {
          user: session.user,
          isEmailVerified: Boolean(session.user.email_confirmed_at),
        };
      }
    }

    return { user: null, isEmailVerified: false };
  } catch (err) {
    if (isNetworkTransportError(err)) {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (
        session?.user &&
        (!session.expires_at || session.expires_at > nowSeconds)
      ) {
        return {
          user: session.user,
          isEmailVerified: Boolean(session.user.email_confirmed_at),
        };
      }
    }
    return { user: null, isEmailVerified: false };
  }
}
