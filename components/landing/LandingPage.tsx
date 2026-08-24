"use client";

import { useState } from "react";
import LandingNavbar from "./LandingNavbar";
import HeroSection from "./HeroSection";
import ShowcaseSection from "./ShowcaseSection";
import WatermarkRemovalSection from "./WatermarkRemovalSection";
import BackgroundRemovalSection from "./BackgroundRemovalSection";
import FeaturesBento from "./FeaturesBento";
import HowItWorks from "./HowItWorks";
import FAQSection from "./FAQSection";
import LandingFooter from "./LandingFooter";
import type { MediaKind } from "@/lib/landing/mediaValidation";

export default function LandingPage() {
  const [mode, setMode] = useState<MediaKind>("image");

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#07090e] text-slate-100">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-40 top-[-8rem] h-[32rem] w-[32rem] rounded-full bg-blue-600/20 blur-[140px]" />
        <div className="absolute -right-32 top-[18rem] h-[30rem] w-[30rem] rounded-full bg-purple-600/20 blur-[140px]" />
        <div className="absolute left-1/3 top-[46rem] h-[28rem] w-[28rem] rounded-full bg-cyan-500/15 blur-[140px]" />
        <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] [background-size:32px_32px]" />
      </div>

      <LandingNavbar />
      <main className="pt-20">
        <HeroSection mode={mode} onModeChange={setMode} />
        <ShowcaseSection activeTab={mode} />
        <WatermarkRemovalSection activeTab={mode} />
        <BackgroundRemovalSection activeTab={mode} />
        <FeaturesBento />
        <HowItWorks />
        <FAQSection />
      </main>
      <LandingFooter />
    </div>
  );
}
