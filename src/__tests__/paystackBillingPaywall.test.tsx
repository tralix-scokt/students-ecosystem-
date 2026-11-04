import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  buildPaystackPlanCatalog,
  DEFAULT_BILLING_SETTINGS,
  formatNaira,
} from "@/lib/billing/billingService";
import {
  PaystackPricingPlansSection,
  PaystackUpgradeModal,
} from "@/components/billing/PaystackUpgradeModal";
import { POST as paystackWebhookPost } from "@/app/api/billing/paystack/webhook/route";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/dashboard/upgrade",
  useSearchParams: () => new URLSearchParams(),
}));

describe("Paystack Freemium Paywall & Naira Subscription Passes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("configures exact ₦2,000 (7d), ₦3,500 (30d), and ₦10,000 (90d) Naira passes and Free Starter quotas", () => {
    expect(DEFAULT_BILLING_SETTINGS.price7dNgn).toBe(2000);
    expect(DEFAULT_BILLING_SETTINGS.price30dNgn).toBe(3500);
    expect(DEFAULT_BILLING_SETTINGS.price90dNgn).toBe(10000);
    expect(DEFAULT_BILLING_SETTINGS.freeDailyAiMessages).toBe(6);
    expect(DEFAULT_BILLING_SETTINGS.freeDailyPhotoSnaps).toBe(2);
    expect(DEFAULT_BILLING_SETTINGS.freeMaxExamQuestions).toBe(10);

    const catalog = buildPaystackPlanCatalog(DEFAULT_BILLING_SETTINGS);
    expect(catalog).toHaveLength(3);

    expect(catalog[0].code).toBe("pass_7d");
    expect(formatNaira(catalog[0].priceNgn)).toBe("₦2,000");
    expect(catalog[0].durationDays).toBe(7);

    expect(catalog[1].code).toBe("pass_30d");
    expect(formatNaira(catalog[1].priceNgn)).toBe("₦3,500");
    expect(catalog[1].durationDays).toBe(30);
    expect(catalog[1].badge).toBe("MOST POPULAR");

    expect(catalog[2].code).toBe("pass_90d");
    expect(formatNaira(catalog[2].priceNgn)).toBe("₦10,000");
    expect(catalog[2].durationDays).toBe(90);
    expect(catalog[2].badge).toBe("BEST SEASON VALUE");
  });

  it("renders all three Paystack Naira plans and Nigerian payment channels inside PaystackUpgradeModal", () => {
    const onClose = vi.fn();
    render(
      <PaystackUpgradeModal
        open={true}
        onClose={onClose}
        reasonTitle="Daily Free AI Tutor Limit Reached"
        reasonDescription="You have used all 6 free AI Tutor messages for today."
      />
    );

    expect(
      screen.getByRole("heading", { name: /Daily Free AI Tutor Limit Reached/i })
    ).toBeInTheDocument();

    expect(screen.getByText("7-Day Cram Pass")).toBeInTheDocument();
    expect(screen.getByText("Monthly Pro")).toBeInTheDocument();
    expect(screen.getByText("90-Day Exam Season Pass")).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /Pay ₦2,000 with Paystack/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Pay ₦3,500 with Paystack/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Pay ₦10,000 with Paystack/i })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Card \(Verve \/ Visa \/ Mastercard\)/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/OPay \/ PalmPay \/ QR/i)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Close upgrade modal"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("displays Extend +Days labels when an active TRALIX Pro subscriber views PaystackPricingPlansSection", () => {
    render(
      <PaystackPricingPlansSection
        isPro={true}
        currentPlanLabel="Monthly Pro (30 Days)"
        expiresAt="2026-12-04T00:00:00.000Z"
      />
    );

    expect(
      screen.getByText(/Early renewal stacks extra days onto your current expiry date/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Extend \+30 Days \(₦3,500\)/i })
    ).toBeInTheDocument();
  });

  it("rejects unsigned Paystack webhook requests without x-paystack-signature (HTTP 401)", async () => {
    const unsignedReq = new Request(
      "https://students-ecosystem.vercel.app/api/billing/paystack/webhook",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "charge.success",
          data: { reference: "TRALIX_FAKE_123", amount: 350000 },
        }),
      }
    );

    const res = await paystackWebhookPost(unsignedReq);
    expect(res.status).toBe(401);
    const json = (await res.json()) as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/x-paystack-signature/i);
  });

  it("shows honest setup guidance when Paystack gateway key has not been configured yet", async () => {
    const origFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({
        ok: false,
        code: "GATEWAY_NOT_CONFIGURED",
        error:
          "Paystack checkout is being finalized by the administrator. Please try again shortly.",
      }),
    }) as unknown as typeof fetch;

    try {
      render(<PaystackPricingPlansSection isAdmin={true} />);
      fireEvent.click(
        screen.getByRole("button", { name: /Pay ₦3,500 with Paystack/i })
      );

      await waitFor(() => {
        expect(
          screen.getByText(/Paystack checkout is being finalized/i)
        ).toBeInTheDocument();
      });

      expect(
        screen.getByRole("link", {
          name: /Open Admin Portal \(\/admin\) to Paste Paystack Secret Key/i,
        })
      ).toHaveAttribute("href", "/admin");
    } finally {
      global.fetch = origFetch;
    }
  });
});
