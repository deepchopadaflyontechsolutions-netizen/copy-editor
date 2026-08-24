"use client";

import StudioPanel from "./StudioPanel";
import type { MediaKind } from "@/lib/landing/mediaValidation";

export default function HeroSection({
  mode,
  onModeChange,
}: {
  mode: MediaKind;
  onModeChange: (next: MediaKind) => void;
}) {
  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-8 sm:pt-12">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-10rem] -z-10 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[#0066FF]/20 blur-[120px]"
      />

      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl md:whitespace-nowrap">
          Free Online{" "}
          <span className="bg-gradient-to-r from-[#0066FF] to-[#06B6D4] bg-clip-text text-transparent">
            Image &amp; Video Editor
          </span>
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 md:text-base">
          Resize, crop, remove backgrounds, and edit video — all in your
          browser. No installs, no plugins, nothing to download. Drop a file in
          and start editing in seconds.
        </p>

        <div className="mt-10">
          <StudioPanel mode={mode} onModeChange={onModeChange} />
        </div>
      </div>
    </section>
  );
}
