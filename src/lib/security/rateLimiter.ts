export type RateLimitScope =
  | "login"
  | "register"
  | "forgot-password"
  | "reset-password"
  | "resend-verification"
  | "onboarding-save"
  | "ai-gateway"
  | "exam-submit"
  | "learning-mutation"
  | "admin-mutation"
  | "account-delete";

interface ScopePolicy {
  maxRequests: number;
  windowMs: number;
}

const POLICIES: Record<RateLimitScope, ScopePolicy> = {
  login: { maxRequests: 8, windowMs: 10 * 60 * 1000 },
  register: { maxRequests: 5, windowMs: 15 * 60 * 1000 },
  "forgot-password": { maxRequests: 4, windowMs: 15 * 60 * 1000 },
  "reset-password": { maxRequests: 6, windowMs: 15 * 60 * 1000 },
  "resend-verification": { maxRequests: 3, windowMs: 10 * 60 * 1000 },
  "onboarding-save": { maxRequests: 60, windowMs: 5 * 60 * 1000 },
  "ai-gateway": { maxRequests: 24, windowMs: 5 * 60 * 1000 },
  "exam-submit": { maxRequests: 20, windowMs: 5 * 60 * 1000 },
  "learning-mutation": { maxRequests: 90, windowMs: 5 * 60 * 1000 },
  "admin-mutation": { maxRequests: 60, windowMs: 5 * 60 * 1000 },
  "account-delete": { maxRequests: 3, windowMs: 15 * 60 * 1000 },
};

const buckets = new Map<string, number[]>();

export function extractClientIdentifier(headers: Headers): string {
  const vercelForwarded = headers.get("x-vercel-forwarded-for");
  if (vercelForwarded) {
    const first = vercelForwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  return "local-client";
}

export function checkRateLimit(
  scope: RateLimitScope,
  clientId: string,
  now = Date.now()
): {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
} {
  const policy = POLICIES[scope];
  const key = `${scope}:${clientId}`;
  const cutoff = now - policy.windowMs;

  const existing = (buckets.get(key) ?? []).filter((ts) => ts > cutoff);

  if (existing.length >= policy.maxRequests) {
    const oldest = existing[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + policy.windowMs - now) / 1000)
    );
    buckets.set(key, existing);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  existing.push(now);
  buckets.set(key, existing);

  // Periodic lightweight cleanup to keep memory bounded
  if (buckets.size > 2000) {
    for (const [k, timestamps] of buckets.entries()) {
      const active = timestamps.filter((ts) => ts > now - 15 * 60 * 1000);
      if (active.length === 0) {
        buckets.delete(k);
      } else {
        buckets.set(k, active);
      }
    }
  }

  return {
    allowed: true,
    remaining: Math.max(0, policy.maxRequests - existing.length),
    retryAfterSeconds: 0,
  };
}

export function resetRateLimiterForTests(): void {
  buckets.clear();
}
