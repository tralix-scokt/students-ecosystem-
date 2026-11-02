import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { IntroductionSection } from "@/components/landing/IntroductionSection";
import { FeatureCardsSection } from "@/components/landing/FeatureCardsSection";
import { PortalCalloutSection } from "@/components/landing/PortalCalloutSection";
import { Footer } from "@/components/layout/Footer";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-obsidian-950">
      <Navbar />
      <main id="main-content" className="flex-1">
        <HeroSection />
        <IntroductionSection />
        <FeatureCardsSection />
        <PortalCalloutSection />
      </main>
      <Footer />
    </div>
  );
}
