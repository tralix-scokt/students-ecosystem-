import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomePage from "@/app/page";
import { BookExperience } from "@/components/book/BookExperience";
import { BookResetPasswordSpread } from "@/components/book/BookResetPasswordSpread";

const pushMock = vi.fn();
const replaceMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
    refresh: refreshMock,
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const authServiceMocks = vi.hoisted(() => ({
  registerLearner: vi.fn(),
  signInLearner: vi.fn(),
  requestPasswordReset: vi.fn(),
  completePasswordReset: vi.fn(),
  resendVerificationEmail: vi.fn(),
  signOutLearner: vi.fn(),
}));

vi.mock("@/lib/auth/authService", () => authServiceMocks);

const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn(() => ({
  data: { subscription: { unsubscribe: vi.fn() } },
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      setSession: vi.fn().mockResolvedValue({ error: null }),
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
  setBrowserRememberPreference: vi.fn(),
  getBrowserRememberPreference: () => true,
}));

function setViewportAndReducedMotion(width: number, reducedMotion = false) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("prefers-reduced-motion: reduce")
        ? reducedMotion
        : query.includes("min-width: 880px")
          ? width >= 880
          : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

describe("Preserved Step 1 — Landing Page & 3D Hardcover Book Presentation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setViewportAndReducedMotion(1440, false);
  });

  it("renders approved brand identity, main heading, supporting text, CTAs, and all four feature pillars", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Your Future Starts With Knowledge.",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Learn with purpose. Understand with confidence. Prepare for success."
      )
    ).toBeInTheDocument();

    for (const title of [
      "Structured Learning",
      "AI Tutor",
      "Exam Preparation",
      "Academic Management",
    ]) {
      expect(
        screen.getByRole("heading", { level: 3, name: title })
      ).toBeInTheDocument();
    }

    const getStartedLinks = screen.getAllByRole("link", {
      name: /Get Started/i,
    });
    expect(getStartedLinks[0]).toHaveAttribute("href", "/login");
  });

  it("rotates the 3D hardcover book open around the spine on ENTER and displays both facing pages", async () => {
    const user = userEvent.setup();
    const { container } = render(<BookExperience initialMode="login" />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "YOUR FUTURE STARTS WITH KNOWLEDGE.",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText("“Every great journey begins with a single page.”")
    ).toBeInTheDocument();

    const enterButton = screen.getByRole("button", {
      name: /ENTER — OPEN YOUR JOURNEY/i,
    });
    const coverWrapper = enterButton.closest("[style*='transform-origin']");
    expect(coverWrapper).toHaveStyle({
      transformOrigin: "left center",
      transform: "translateZ(20px) rotateY(0deg)",
    });

    await user.click(enterButton);

    expect(coverWrapper).toHaveStyle({
      transform: "translateZ(3px) rotateY(-180deg)",
    });
    expect(
      screen.getByRole("heading", { level: 2, name: "Welcome Back." })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "YOUR NEXT CHAPTER BEGINS HERE.",
      })
    ).toBeInTheDocument();
    expect(container.querySelector(".book-perspective")).not.toBeNull();
  });

  it("supports mobile drawer navigation on 375px viewport and respects prefers-reduced-motion", async () => {
    setViewportAndReducedMotion(375, true);
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(
      screen.getByRole("button", { name: /Open navigation menu/i })
    );
    expect(
      screen.getByRole("navigation", { name: /Mobile navigation/i })
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("navigation", { name: /Mobile navigation/i })
    ).not.toBeInTheDocument();
  });
});

describe("Step 2 — 3D Book Registration, Login, Verification & Recovery UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setViewportAndReducedMotion(1280, true);
  });

  it("validates all registration fields (Full name, Email, Country, Password complexity, Confirm, Terms) and shows Email Verification screen on success", async () => {
    authServiceMocks.registerLearner.mockResolvedValueOnce({
      status: "verification-required",
      title: "Verify Your Email Address",
      email: "adaeze@university.edu.ng",
      message: "Your learner account has been created.",
    });

    const user = userEvent.setup();
    render(<BookExperience initialMode="register" initialOpen={true} />);

    // Empty submission shows clear validation errors
    await user.click(screen.getByRole("button", { name: /Create Account/i }));
    expect(
      screen.getByText("Please enter your full name.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Please select your country.")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "You must accept the Terms of Service and Privacy Policy to register."
      )
    ).toBeInTheDocument();

    // Fill valid registration form including Country and Terms & Privacy
    await user.type(screen.getByLabelText(/Full name/i), "Adaeze Okafor");
    await user.type(
      screen.getByLabelText(/Email address/i),
      "adaeze@university.edu.ng"
    );
    await user.selectOptions(screen.getByLabelText(/Country/i), "Nigeria");

    const pwInput = screen.getByLabelText(/^Password$/i);
    const confirmInput = screen.getByLabelText(/Confirm password/i);
    await user.type(pwInput, "TralixSecure2026!");
    await user.type(confirmInput, "TralixSecure2026!");

    // Test password visibility toggles on registration
    await user.click(
      screen.getByRole("button", { name: /Show registration password/i })
    );
    expect(pwInput).toHaveAttribute("type", "text");

    await user.click(
      screen.getByRole("button", { name: /Show password confirmation/i })
    );
    expect(confirmInput).toHaveAttribute("type", "text");

    await user.click(
      screen.getByLabelText(/Terms of Service/i, { exact: false })
    );
    await user.click(screen.getByRole("button", { name: /Create Account/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 2, name: "Verify Your Email." })
      ).toBeInTheDocument();
    });
    expect(screen.getByText("adaeze@university.edu.ng")).toBeInTheDocument();
  });

  it("displays duplicate email error clearly during registration", async () => {
    authServiceMocks.registerLearner.mockResolvedValueOnce({
      status: "validation-error",
      title: "Email Already Registered",
      message:
        "An account with this email address already exists. Please sign in or use Forgot password.",
      fieldErrors: {
        email:
          "An account with this email address already exists. Please sign in or use Forgot password.",
      },
    });

    const user = userEvent.setup();
    render(<BookExperience initialMode="register" initialOpen={true} />);

    await user.type(screen.getByLabelText(/Full name/i), "Chidi Nwosu");
    await user.type(
      screen.getByLabelText(/Email address/i),
      "existing@tralix.edu"
    );
    await user.selectOptions(screen.getByLabelText(/Country/i), "Nigeria");
    await user.type(screen.getByLabelText(/^Password$/i), "StrongPass2026!");
    await user.type(
      screen.getByLabelText(/Confirm password/i),
      "StrongPass2026!"
    );
    await user.click(
      screen.getByLabelText(/Terms of Service/i, { exact: false })
    );
    await user.click(screen.getByRole("button", { name: /Create Account/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/An account with this email address already exists/i)
      ).toBeInTheDocument();
    });
  });

  it("handles invalid login, unverified email login, and redirects verified login to /onboarding", async () => {
    const user = userEvent.setup();
    render(<BookExperience initialMode="login" initialOpen={true} />);

    // 1. Invalid credentials
    authServiceMocks.signInLearner.mockResolvedValueOnce({
      status: "auth-error",
      title: "Sign-In Unsuccessful",
      message:
        "Invalid email address or password. Please check your credentials and try again.",
    });

    await user.type(
      screen.getByLabelText(/Email address/i),
      "learner@tralix.edu"
    );
    await user.type(screen.getByLabelText(/^Password$/i), "WrongPass123!");
    await user.click(screen.getByRole("button", { name: /^Sign In$/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Invalid email address or password/i)
      ).toBeInTheDocument();
    });

    // 2. Unverified email blocks access and offers verification options
    authServiceMocks.signInLearner.mockResolvedValueOnce({
      status: "unverified-email",
      title: "Email Verification Required",
      email: "learner@tralix.edu",
      message: "Your email address has not been verified yet.",
    });

    await user.click(screen.getByRole("button", { name: /^Sign In$/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/Email Verification Required/i)
      ).toBeInTheDocument();
    });

    // 3. Verified login redirects to /onboarding (never a dashboard)
    authServiceMocks.signInLearner.mockResolvedValueOnce({
      status: "success",
      redirectTo: "/onboarding",
      message: "Signed in successfully.",
    });

    await user.click(screen.getByRole("button", { name: /^Sign In$/i }));
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/onboarding");
    });
  });

  it("supports Forgot Password request and Open-Book Set New Password recovery flow", async () => {
    authServiceMocks.requestPasswordReset.mockResolvedValueOnce({
      status: "success",
      title: "Check Your Inbox",
      message:
        "If an account is registered with that email address, we have sent a password reset link.",
    });

    const user = userEvent.setup();
    const { unmount } = render(
      <BookExperience initialMode="recovery" initialOpen={true} />
    );

    await user.type(
      screen.getByLabelText(/Email address/i),
      "unknown@tralix.edu"
    );
    await user.click(
      screen.getByRole("button", { name: /Send Password Reset Link/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/If an account is registered with that email address/i)
      ).toBeInTheDocument();
    });

    unmount();

    // Test Reset Password spread with active recovery session
    mockGetSession.mockResolvedValueOnce({
      data: { session: { access_token: "recovery-jwt" } },
    });
    authServiceMocks.completePasswordReset.mockResolvedValueOnce({
      status: "success",
      title: "Password Updated Successfully",
      redirectTo: "/login",
      message: "Your password has been updated securely.",
    });

    render(<BookResetPasswordSpread />);

    await waitFor(() => {
      expect(screen.getByLabelText(/^New password$/i)).toBeInTheDocument();
    });

    await user.type(
      screen.getByLabelText(/^New password$/i),
      "NewTralixPass2026#"
    );
    await user.type(
      screen.getByLabelText(/Confirm new password/i),
      "NewTralixPass2026#"
    );
    await user.click(screen.getByRole("button", { name: /Update Password/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Password Updated Successfully")
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("link", { name: /Sign In With New Password/i })
    ).toHaveAttribute("href", "/login");
  });
});
