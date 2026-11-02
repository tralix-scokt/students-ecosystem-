import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import ExplorePlatformPage from "@/app/explore/page";
import JambCbtSeoPage from "@/app/jamb-cbt/page";
import WaecNecoSeoPage from "@/app/waec-neco-past-questions/page";
import AiPhotoTutorSeoPage from "@/app/ai-photo-tutor/page";
import { AdminGrowthMarketingPanel } from "@/components/admin/AdminGrowthMarketingPanel";
import {
  buildClassmateInvitePayload,
  buildExamChallengeSharePayload,
} from "@/lib/marketing/viralShare";

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

describe("Google SEO Infrastructure, Public Landing Hubs & Viral Growth Engine", () => {
  it("1. Configures /robots.txt to allow Google indexing of public hubs and block private routes", () => {
    const config = robots();
    expect(config.sitemap).toContain("/sitemap.xml");
    const rule = Array.isArray(config.rules) ? config.rules[0] : config.rules;
    expect(rule.allow).toContain("/");
    expect(rule.allow).toContain("/explore");
    expect(rule.allow).toContain("/jamb-cbt");
    expect(rule.allow).toContain("/waec-neco-past-questions");
    expect(rule.allow).toContain("/ai-photo-tutor");
    expect(rule.disallow).toContain("/admin");
    expect(rule.disallow).toContain("/api/");
    expect(rule.disallow).toContain("/dashboard");
  });

  it("2. Generates /sitemap.xml containing all public Google landing pages", () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => u.endsWith("/explore"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/jamb-cbt"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/waec-neco-past-questions"))).toBe(
      true
    );
    expect(urls.some((u) => u.endsWith("/ai-photo-tutor"))).toBe(true);
  });

  it("3. Renders keyword-rich public SEO hubs with honest examination board non-affiliation notices", () => {
    const { unmount: u1 } = render(<ExplorePlatformPage />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Your Complete Digital Study/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Independent Practice Platform Notice/i)
    ).toBeInTheDocument();
    u1();

    const { unmount: u2 } = render(<JambCbtSeoPage />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Practice Timed JAMB UTME/i,
      })
    ).toBeInTheDocument();
    u2();

    const { unmount: u3 } = render(<WaecNecoSeoPage />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Master WAEC & NECO/i,
      })
    ).toBeInTheDocument();
    u3();

    const { unmount: u4 } = render(<AiPhotoTutorSeoPage />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Snap Any Question & Learn/i,
      })
    ).toBeInTheDocument();
    u4();
  });

  it("4. Builds real-score WhatsApp & X exam challenge share links and classmate invites", () => {
    const examShare = buildExamChallengeSharePayload({
      examLabel: "JAMB UTME",
      subjectLabel: "Mathematics",
      scorePercent: 85,
      correctCount: 17,
      gradableCount: 20,
    });
    expect(examShare.message).toContain("85% (17/20)");
    expect(examShare.message).toContain("JAMB UTME (Mathematics)");
    expect(examShare.whatsappUrl).toContain("https://wa.me/?text=");
    expect(examShare.xIntentUrl).toContain("https://twitter.com/intent/tweet");

    const invite = buildClassmateInvitePayload();
    expect(invite.whatsappUrl).toContain("https://wa.me/?text=");
    expect(invite.shareUrl).toContain("utm_source=student_invite");
  });

  it("5. Renders the Admin Google Search Console & Viral Marketing Command Panel", () => {
    render(<AdminGrowthMarketingPanel />);
    expect(
      screen.getByText(/Get Found on Google Search/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Ready-to-Launch Viral Marketing Kit/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Open Google Search Console/i })
    ).toBeInTheDocument();
  });
});
