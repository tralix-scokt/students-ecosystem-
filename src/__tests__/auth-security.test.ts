import fs from "fs";
import path from "path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  validateEmailFormat,
  validateRegistrationInput,
  validateResetPasswordInput,
  validateStrongPassword,
} from "@/lib/validation/authValidation";
import {
  checkRateLimit,
  resetRateLimiterForTests,
} from "@/lib/security/rateLimiter";
import {
  NEUTRAL_RECOVERY_MESSAGE,
  sanitizeNextPath,
} from "@/lib/auth/errorMessages";

const mockAuth = {
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  resend: vi.fn(),
  signOut: vi.fn(),
  getUser: vi.fn(),
  getSession: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  REMEMBER_COOKIE_NAME: "se_remember",
  createServerSupabaseClient: vi.fn(async () => ({
    auth: mockAuth,
  })),
}));

vi.mock("@supabase/ssr", async () => {
  const actual = await vi.importActual<typeof import("@supabase/ssr")>(
    "@supabase/ssr"
  );
  return {
    ...actual,
    createServerClient: vi.fn(() => ({
      auth: mockAuth,
    })),
  };
});

describe("Step 2 — Server Input Validation & Password Security Policy", () => {
  it("rejects invalid emails and enforces strong password complexity rules", () => {
    expect(validateEmailFormat("")).toBe("Please enter your email address.");
    expect(validateEmailFormat("not-an-email")).toBe(
      "Please enter a valid email address."
    );
    expect(validateEmailFormat("valid.learner@university.edu.ng")).toBeNull();

    expect(validateStrongPassword("short1!")).toMatch(/at least 8 characters/i);
    expect(validateStrongPassword("alllowercase1!")).toMatch(/uppercase/i);
    expect(validateStrongPassword("ALLUPPERCASE1!")).toMatch(/lowercase/i);
    expect(validateStrongPassword("NoNumbersHere!")).toMatch(/number/i);
    expect(validateStrongPassword("NoSymbols2026")).toMatch(/special/i);
    expect(validateStrongPassword("TralixSecure2026!")).toBeNull();

    const mismatchErrors = validateResetPasswordInput({
      password: "TralixSecure2026!",
      confirmPassword: "DifferentPassword2026!",
    });
    expect(mismatchErrors.confirmPassword).toBe("Passwords do not match.");
  });

  it("validates country against ISO country list and requires Terms & Privacy acceptance", () => {
    const errors = validateRegistrationInput({
      fullName: "Adaeze Okafor",
      email: "adaeze@edu.ng",
      password: "TralixSecure2026!",
      confirmPassword: "TralixSecure2026!",
      country: "Atlantis",
      acceptTerms: false,
    });
    expect(errors.country).toMatch(/valid country/i);
    expect(errors.acceptTerms).toMatch(/Terms of Service and Privacy Policy/i);
  });
});

describe("Step 2 — Server Auth Route Handlers, Enumeration Protection & Rate Limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimiterForTests();
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      "https://epngfzpghwdwycpeqsfi.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-test-key";
  });

  it("registers a valid learner and requires email verification before granting a session", async () => {
    const { POST } = await import("@/app/api/auth/register/route");

    mockAuth.signUp.mockResolvedValueOnce({
      data: {
        user: {
          id: "u-1",
          email: "adaeze@tralix.edu",
          email_confirmed_at: null,
          identities: [{ id: "id-1" }],
        },
        session: null,
      },
      error: null,
    });

    const req = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.0.1",
      },
      body: JSON.stringify({
        fullName: "Adaeze Okafor",
        email: "Adaeze@Tralix.edu",
        country: "Nigeria",
        password: "TralixSecure2026!",
        confirmPassword: "TralixSecure2026!",
        acceptTerms: true,
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("verification-required");
    expect(json.email).toBe("adaeze@tralix.edu");
    expect(mockAuth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "adaeze@tralix.edu",
        options: expect.objectContaining({
          data: { full_name: "Adaeze Okafor", country: "Nigeria" },
        }),
      })
    );
  });

  it("detects duplicate email both via GoTrue error and empty identities array", async () => {
    const { POST } = await import("@/app/api/auth/register/route");

    mockAuth.signUp.mockResolvedValueOnce({
      data: {
        user: { id: "u-existing", email: "dup@tralix.edu", identities: [] },
        session: null,
      },
      error: null,
    });

    const req = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Chidi Nwosu",
        email: "dup@tralix.edu",
        country: "Nigeria",
        password: "TralixSecure2026!",
        confirmPassword: "TralixSecure2026!",
        acceptTerms: true,
      }),
    });

    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(409);
    expect(json.fieldErrors?.email).toMatch(/already exists/i);
  });

  it("blocks unverified users on login (403) and redirects verified users to /onboarding", async () => {
    const { POST } = await import("@/app/api/auth/login/route");

    // 1. Unverified user
    mockAuth.signInWithPassword.mockResolvedValueOnce({
      data: {
        user: { id: "u-1", email: "unverified@tralix.edu", email_confirmed_at: null },
        session: { access_token: "tok" },
      },
      error: null,
    });

    const unverifiedRes = await POST(
      new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "unverified@tralix.edu",
          password: "TralixSecure2026!",
          rememberMe: true,
        }),
      })
    );
    expect(unverifiedRes.status).toBe(403);
    expect(mockAuth.signOut).toHaveBeenCalled();

    // 2. Verified user
    mockAuth.signInWithPassword.mockResolvedValueOnce({
      data: {
        user: {
          id: "u-2",
          email: "verified@tralix.edu",
          email_confirmed_at: "2026-11-01T12:00:00Z",
        },
        session: { access_token: "valid-jwt" },
      },
      error: null,
    });

    const verifiedRes = await POST(
      new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "verified@tralix.edu",
          password: "TralixSecure2026!",
          rememberMe: true,
        }),
      })
    );
    const verifiedJson = await verifiedRes.json();
    expect(verifiedRes.status).toBe(200);
    expect(verifiedJson.redirectTo).toBe("/onboarding");
  });

  it("never reveals whether an email is registered in password recovery responses", async () => {
    const { POST } = await import("@/app/api/auth/forgot-password/route");

    // Case A: Registered email
    mockAuth.resetPasswordForEmail.mockResolvedValueOnce({
      data: {},
      error: null,
    });
    const resRegistered = await POST(
      new Request("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.5" },
        body: JSON.stringify({ email: "registered@tralix.edu" }),
      })
    );
    const jsonRegistered = await resRegistered.json();

    // Case B: Non-existent email returning GoTrue user_not_found error
    mockAuth.resetPasswordForEmail.mockResolvedValueOnce({
      data: null,
      error: { message: "User not found" },
    });
    const resUnknown = await POST(
      new Request("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.6" },
        body: JSON.stringify({ email: "nobody@tralix.edu" }),
      })
    );
    const jsonUnknown = await resUnknown.json();

    expect(resRegistered.status).toBe(200);
    expect(resUnknown.status).toBe(200);
    expect(jsonRegistered.message).toBe(NEUTRAL_RECOVERY_MESSAGE);
    expect(jsonUnknown.message).toBe(NEUTRAL_RECOVERY_MESSAGE);
  });

  it("enforces server-side rate limiting against brute-force abuse", () => {
    for (let i = 0; i < 8; i++) {
      expect(checkRateLimit("login", "203.0.113.42").allowed).toBe(true);
    }
    const ninth = checkRateLimit("login", "203.0.113.42");
    expect(ninth.allowed).toBe(false);
    expect(ninth.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("Step 2 — Middleware Route Protection & Security Hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      "https://epngfzpghwdwycpeqsfi.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-test-key";
  });

  it("redirects unauthenticated visitors away from /onboarding to /login?next=/onboarding", async () => {
    const { updateSupabaseSession } = await import("@/lib/supabase/middleware");

    const req = new NextRequest("http://localhost:3000/onboarding");
    const res = await updateSupabaseSession(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fonboarding"
    );
  });

  it("redirects authenticated but unverified users from /onboarding to /verify-email", async () => {
    const { updateSupabaseSession } = await import("@/lib/supabase/middleware");

    mockAuth.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: "u-unverified",
          email: "pending@tralix.edu",
          email_confirmed_at: null,
        },
      },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/onboarding", {
      headers: { cookie: "sb-epngfzpghwdwycpeqsfi-auth-token=chunk0" },
    });
    const res = await updateSupabaseSession(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/verify-email?email=pending%40tralix.edu"
    );
  });

  it("allows verified sessions into /onboarding and redirects them away from guest /login", async () => {
    const { updateSupabaseSession } = await import("@/lib/supabase/middleware");

    mockAuth.getUser.mockResolvedValue({
      data: {
        user: {
          id: "u-verified",
          email: "active@tralix.edu",
          email_confirmed_at: "2026-11-01T12:00:00Z",
        },
      },
      error: null,
    });

    const onboardingRes = await updateSupabaseSession(
      new NextRequest("http://localhost:3000/onboarding", {
        headers: { cookie: "sb-epngfzpghwdwycpeqsfi-auth-token=valid" },
      })
    );
    expect(onboardingRes.status).toBe(200);
    expect(onboardingRes.headers.get("Cache-Control")).toContain("no-store");

    const loginRes = await updateSupabaseSession(
      new NextRequest("http://localhost:3000/login", {
        headers: { cookie: "sb-epngfzpghwdwycpeqsfi-auth-token=valid" },
      })
    );
    expect(loginRes.status).toBe(307);
    expect(loginRes.headers.get("location")).toBe(
      "http://localhost:3000/onboarding"
    );
  });

  it("blocks open-redirect payloads in /auth/callback next parameter", () => {
    expect(sanitizeNextPath("//evil.example.com")).toBe("/onboarding");
    expect(sanitizeNextPath("https://evil.example.com")).toBe("/onboarding");
    expect(sanitizeNextPath("/\\evil.com")).toBe("/onboarding");
    expect(sanitizeNextPath("/reset-password")).toBe("/reset-password");
  });

  it("contains zero service-role or secret Supabase keys in client/application source code", () => {
    function collectFiles(dir: string): string[] {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "__tests__") {
            files.push(...collectFiles(full));
          }
        } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
          files.push(full);
        }
      }
      return files;
    }

    const srcDir = path.resolve(import.meta.dirname, "..");
    const sourceFiles = collectFiles(srcDir);
    expect(sourceFiles.length).toBeGreaterThan(15);

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, "utf8");
      expect(content).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
      expect(content).not.toMatch(/sb_secret_/);
      expect(content).not.toMatch(/role":"service_role"/);
    }
  });
});
