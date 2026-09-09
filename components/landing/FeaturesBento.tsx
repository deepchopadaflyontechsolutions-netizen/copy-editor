"use client";

import { Layers, ShieldCheck, Wand2, Zap, type LucideIcon } from "lucide-react";

interface FeatureCard {
  title: string;
  description: string;
  Icon: LucideIcon;
  span: string;
}

const FEATURES: FeatureCard[] = [
  {
    title: "One-Click Watermark Removal",
    description:
      "Brush or lasso over logos, text overlays, and stamps to erase them cleanly — no complex masking required.",
    Icon: Wand2,
    span: "lg:col-span-2 lg:row-span-2",
  },
  {
    title: "Blazing Speed",
    description: "Most edits render in under a second — no upload queue, no server round-trip.",
    Icon: Zap,
    span: "lg:col-span-2",
  },
  {
    title: "Private by Design",
    description: "Your files are processed entirely in your browser tab and never sent to a server.",
    Icon: ShieldCheck,
    span: "lg:col-span-1",
  },
  {
    title: "Multi-Format Support",
    description: "Import JPG, PNG, WebP images and MP4/WebM video — export in the format you need.",
    Icon: Layers,
    span: "lg:col-span-1",
  },
];

export default function FeaturesBento() {
  return (
    <section id="features" className="px-6 pb-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="mt-3 text-slate-400">
            A focused toolset built for speed, privacy, and results — not a bloated suite.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
          {FEATURES.map(({ title, description, Icon, span }) => (
            <div
              key={title}
              className={`group relative overflow-hidden rounded-2xl border-2 border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl transition-all duration-300 hover:border-[#0066FF]/40 hover:bg-white/[0.06] hover:shadow-[0_0_32px_rgba(0,102,255,0.18)] ${span}`}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#0066FF]/10 blur-3xl transition-opacity duration-300 group-hover:opacity-100"
              />
              <div className="relative flex h-full flex-col">
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#0066FF]/15 text-[#0066FF] shadow-[0_0_20px_rgba(0,102,255,0.3)]">
                  <Icon size={20} />
                </span>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
