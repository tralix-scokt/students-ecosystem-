import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  createBoundedFetch,
  getSupabasePublicConfig,
  isNetworkTransportError,
} from "@/lib/supabase/config";
import { REMEMBER_COOKIE_NAME } from "@/lib/supabase/server";

const PERSISTENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isProtectedPath(pathname: string): boolean {
  return (
    isAdminPath(pathname) ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/") ||
    pathname === "/learning-space" ||
    pathname.startsWith("/learning-space/")
  );
}

function isGuestOnlyAuthPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password"
  );
}

export async function updateSupabaseSession(
  request: NextRequest
): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  let supabaseResponse = NextResponse.next({ request });

  const config = getSupabasePublicConfig();
  if (!config) {
    if (isProtectedPath(pathname)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return supabaseResponse;
  }

  const allCookies = request.cookies.getAll();
  const hasSupabaseCookie = allCookies.some((c) => c.name.startsWith("sb-"));

  // Fast path when no Supabase session cookie exists
  if (!hasSupabaseCookie) {
    if (isProtectedPath(pathname)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.headers.set("Cache-Control", "private, no-store");
      return redirectResponse;
    }
    return supabaseResponse;
  }

  const rememberPref = request.cookies.get(REMEMBER_COOKIE_NAME)?.value;
  const shouldPersist = rememberPref !== "0";

  const supabase = createServerClient(config.url, config.anonKey, {
    global: {
      fetch: createBoundedFetch(2500),
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          const isRemoval = !value || options?.maxAge === 0;
          const adjusted = { ...options };
          if (!isRemoval && !shouldPersist) {
            delete adjusted.maxAge;
            delete adjusted.expires;
          } else if (!isRemoval && shouldPersist) {
            adjusted.maxAge = options?.maxAge ?? PERSISTENT_MAX_AGE_SECONDS;
          }
          supabaseResponse.cookies.set(name, value, adjusted);
        }
        for (const [key, value] of Object.entries(headers)) {
          supabaseResponse.headers.set(key, value);
        }
      },
    },
  });

  let userId: string | undefined;
  let userEmail: string | undefined;
  let isAuthenticated = false;
  let isEmailVerified = false;
  let transportFallbackUsed = false;

  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) {
      isAuthenticated = true;
      userId = data.user.id;
      userEmail = data.user.email;
      isEmailVerified = Boolean(data.user.email_confirmed_at);
    } else if (error && isNetworkTransportError(error)) {
      transportFallbackUsed = true;
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      const nowSec = Math.floor(Date.now() / 1000);
      if (
        session?.user &&
        (!session.expires_at || session.expires_at > nowSec)
      ) {
        isAuthenticated = true;
        userId = session.user.id;
        userEmail = session.user.email;
        isEmailVerified = Boolean(session.user.email_confirmed_at);
      }
    }
  } catch (err) {
    if (isNetworkTransportError(err)) {
      transportFallbackUsed = true;
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      const nowSec = Math.floor(Date.now() / 1000);
      if (
        session?.user &&
        (!session.expires_at || session.expires_at > nowSec)
      ) {
        isAuthenticated = true;
        userId = session.user.id;
        userEmail = session.user.email;
        isEmailVerified = Boolean(session.user.email_confirmed_at);
      }
    }
  }

  // Enforce protected route access + email verification gate + server admin role gate
  if (isProtectedPath(pathname)) {
    if (!isAuthenticated) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname);
      const redirectResp = NextResponse.redirect(loginUrl);
      redirectResp.headers.set("Cache-Control", "private, no-store");
      return redirectResp;
    }

    if (!isEmailVerified) {
      const verifyUrl = request.nextUrl.clone();
      verifyUrl.pathname = "/verify-email";
      if (userEmail) {
        verifyUrl.searchParams.set("email", userEmail);
      }
      const redirectResp = NextResponse.redirect(verifyUrl);
      redirectResp.headers.set("Cache-Control", "private, no-store");
      return redirectResp;
    }

    if (isAdminPath(pathname) && userId && !transportFallbackUsed) {
      try {
        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();

        if (!profErr && (!prof || prof.role !== "admin")) {
          const dashUrl = request.nextUrl.clone();
          dashUrl.pathname = "/dashboard";
          dashUrl.search = "";
          const redirectResp = NextResponse.redirect(dashUrl);
          redirectResp.headers.set("Cache-Control", "private, no-store");
          return redirectResp;
        }
      } catch {
        // Defer to serverAdminGuard + forced PostgreSQL RLS is_platform_admin()
      }
    }

    supabaseResponse.headers.set("Cache-Control", "private, no-store");
    return supabaseResponse;
  }

  // Redirect already authenticated & verified learners away from guest login/register pages
  if (isGuestOnlyAuthPath(pathname) && isAuthenticated && isEmailVerified) {
    const onboardingUrl = request.nextUrl.clone();
    onboardingUrl.pathname = "/onboarding";
    onboardingUrl.search = "";
    const redirectResp = NextResponse.redirect(onboardingUrl);
    redirectResp.headers.set("Cache-Control", "private, no-store");
    return redirectResp;
  }

  return supabaseResponse;
}
