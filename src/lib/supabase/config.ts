export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && anonKey && url.startsWith("http"));
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey || !url.startsWith("http")) {
    return null;
  }

  return { url, anonKey };
}

export function resolveRequestOrigin(headers?: Headers): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  if (headers) {
    const originHeader = headers.get("origin")?.trim();
    if (originHeader && originHeader.startsWith("http")) {
      return originHeader.replace(/\/$/, "");
    }

    const forwardedHost =
      headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
      headers.get("host")?.trim();
    if (forwardedHost) {
      const forwardedProto =
        headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
        (forwardedHost.startsWith("localhost") ||
        forwardedHost.startsWith("127.0.0.1")
          ? "http"
          : "https");
      return `${forwardedProto}://${forwardedHost}`;
    }
  }

  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredSiteUrl && configuredSiteUrl.startsWith("http")) {
    return configuredSiteUrl.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

/**
 * Distinguishes container-level outbound network transport failures (e.g. sandbox firewall)
 * from genuine Supabase authentication or authorization errors.
 */
export function isNetworkTransportError(error: unknown): boolean {
  if (!error) return false;
  const errObj = error as {
    name?: string;
    message?: string;
    status?: number;
    code?: string;
  };
  if (errObj.name === "AuthRetryableFetchError") return true;
  if (errObj.name === "AbortError") return true;
  const msg = (errObj.message ?? "").toLowerCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("networkerror") ||
    msg.includes("failed to fetch") ||
    msg.includes("ssl_error") ||
    msg.includes("econnrefused") ||
    msg.includes("enotfound") ||
    msg.includes("etimedout") ||
    msg.includes("aborted")
  );
}

/**
 * Creates a fetch wrapper with a bounded timeout so server middleware/routes
 * never stall if outbound network access is restricted in a preview container.
 */
export function createBoundedFetch(timeoutMs = 3500): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, {
        ...init,
        signal: init?.signal ?? controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };
}
