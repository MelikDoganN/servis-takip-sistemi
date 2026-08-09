"use client";

import { LandingNavbar } from "./LandingNavbar";
import { LandingHero } from "./LandingHero";
import {
  LandingAudit,
  LandingCTA,
  LandingDashboardPreview,
  LandingFeatures,
  LandingFooter,
  LandingHowItWorks,
  LandingLifecycle,
  LandingReports,
  LandingTechnicians,
  LandingWhatsApp,
} from "./LandingSections";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-surface text-slate-900">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingLifecycle />
        <LandingWhatsApp />
        <LandingDashboardPreview />
        <LandingTechnicians />
        <LandingReports />
        <LandingAudit />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
