"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  AudioLines,
  Camera,
  Captions,
  ChevronDown,
  Crop,
  Crosshair,
  Diamond,
  Droplet,
  Eraser,
  Film,
  Layers,
  Paintbrush2,
  Play,
  Search,
  ShieldCheck,
  Sparkle,
  SlidersHorizontal,
  Trash2,
  Wand2,
  Zap,
} from "lucide-react";
import type { MediaKind } from "@/lib/landing/mediaValidation";

type EditorTab = MediaKind;

const LAYERS = [
  { name: "Background", thumb: "/showcase/precision-layer-bg.png", active: false },
  { name: "Woman Layer", thumb: "/showcase/precision-layer-face.png", active: true },
  { name: "Watermark Layer", thumb: null, active: false },
];

const TRACKS = [
  { name: "Video Track 1", Icon: Film, active: true },
  { name: "Audio Track", Icon: AudioLines, active: false },
  { name: "Subtitles", Icon: Captions, active: false },
];

const SLIDERS: { label: string; value: number; from?: number }[] = [
  { label: "Exposure", value: 82, from: 50 },
  { label: "Contrast", value: 48, from: 30 },
  { label: "Edge Refinement", value: 30 },
  { label: "Opacity", value: 100 },
];

const TOOLS = [Paintbrush2, Wand2, SlidersHorizontal, Layers, Eraser, Crop];

const FLOATING_CHIPS_BY_TAB: Record<
  EditorTab,
  { Icon: typeof Wand2; title: string; desc: string }[]
> = {
  image: [
    { Icon: Wand2, title: "AI Masking", desc: "Fast, pixel-perfect subject selection" },
    { Icon: Droplet, title: "Watermarking", desc: "Protect your content" },
  ],
  video: [
    { Icon: Layers, title: "Multi-track Video Suite", desc: "Precision timeline & layer controls" },
    { Icon: Crosshair, title: "AI Motion Tracking", desc: "Auto-follow subjects across frames" },
  ],
};

const KEY_FEATURES_BY_TAB: Record<EditorTab, { Icon: typeof Wand2; label: string }[]> = {
  image: [
    { Icon: Wand2, label: "AI Object Masking" },
    { Icon: Droplet, label: "Professional Watermarking" },
    { Icon: Camera, label: "Advanced Photo Suite" },
  ],
  video: [
    { Icon: Film, label: "Multi-track Video Suite" },
    { Icon: Zap, label: "4K Browser Export" },
    { Icon: Crosshair, label: "AI Motion Tracking" },
  ],
};

export default function ShowcaseSection({ activeTab }: { activeTab: EditorTab }) {
  const isVideo = activeTab === "video";

  return (
    <section id="tools" className="relative overflow-hidden px-6 pb-32 pt-4">
      {/* Decorative dotted network backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(rgba(94,234,212,0.35)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black_10%,transparent_75%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            A canvas built for{" "}
            <span className="bg-gradient-to-r from-cyan-300 to-teal-200 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(45,212,191,0.35)]">
              precision
            </span>
          </h2>
          <p className="mt-3 text-slate-400">
            Layered editing, precision selection tools, and fine-grained color controls —
            all live in your browser.
          </p>
        </div>

        <div className="relative overflow-visible rounded-2xl border-2 border-[#1E293B] bg-[#0F172A] shadow-[0_40px_80px_rgba(0,0,0,0.5)]">
          <div className="overflow-hidden rounded-2xl">
            {/* Fake title bar */}
            <div className="flex items-center gap-2 border-b-2 border-[#1E293B] px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
              <span className="ml-3 truncate text-xs font-medium text-slate-500">
                CreativeFlow Editor — {isVideo ? "untitled-project.mp4" : "untitled-project.psdx"}
              </span>
            </div>

            <div className="flex flex-col md:flex-row">
              {/* Left tool rail */}
              <div className="flex shrink-0 flex-row gap-2 border-b-2 border-[#1E293B] p-3 md:flex-col md:border-b-0 md:border-r-2">
                {TOOLS.map((Icon, index) => (
                  <div
                    key={index}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      index === 0
                        ? "bg-[#3B82F6]/20 text-[#3B82F6] shadow-[0_0_16px_rgba(59,130,246,0.4)]"
                        : "text-slate-500"
                    }`}
                  >
                    <Icon size={16} />
                  </div>
                ))}
              </div>

              {/* Canvas area */}
              <div className="flex flex-1 items-center justify-center bg-[#0A0E17] p-6 pb-10 md:p-8 md:pb-12">
                <div className="relative aspect-[675/312] w-full max-w-2xl overflow-hidden rounded-lg border-2 border-[#1E293B] shadow-[0_0_0_1px_rgba(15,23,42,0.6)]">
                  <Image
                    src="/showcase/precision-canvas.png"
                    alt={
                      isVideo
                        ? "Paused frame of a portrait video shoot on a city rooftop, edited in the CreativeFlow timeline"
                        : "AI-masked portrait subject on a city rooftop, edited in the CreativeFlow canvas"
                    }
                    fill
                    sizes="(min-width: 768px) 640px, 100vw"
                    className={`object-cover ${isVideo ? "brightness-[0.75]" : ""}`}
                    priority
                  />

                  {!isVideo && (
                    <>
                      {/* Neon cyan AI-mask outline around the subject, pulsing */}
                      <motion.svg
                        aria-hidden
                        viewBox="0 0 675 312"
                        className="pointer-events-none absolute inset-0 h-full w-full"
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <g
                          fill="none"
                          stroke="#22d3ee"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="drop-shadow-[0_0_6px_rgba(34,211,238,0.85)]"
                        >
                          <ellipse cx="430" cy="95" rx="38" ry="46" />
                          <path d="M355 300 C360 220 385 168 430 150 C475 168 500 220 505 300" />
                        </g>
                      </motion.svg>

                      {/* Floating magnifying glass, continuous scanning loop */}
                      <motion.div
                        aria-hidden
                        animate={{ x: [0, 15, -10, 0], y: [0, -10, 10, 0] }}
                        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                        className="pointer-events-none absolute right-[18%] top-[20%] flex h-11 w-11 items-center justify-center rounded-full border-2 border-cyan-400/50 bg-slate-950/70 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.55)] backdrop-blur-sm"
                      >
                        <Search size={18} />
                      </motion.div>
                    </>
                  )}

                  {isVideo && (
                    <>
                      {/* Clean export badge */}
                      <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full border-2 border-cyan-400/30 bg-slate-950/70 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
                        <ShieldCheck size={12} />
                        Clean Export — No Watermark
                      </span>

                      {/* Play/pause overlay button */}
                      <button
                        type="button"
                        aria-label="Play preview"
                        className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/25 bg-black/40 text-white backdrop-blur-md transition-transform hover:scale-105"
                      >
                        <Play size={22} className="ml-0.5" fill="currentColor" />
                      </button>

                      {/* Timeline scrubber */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8">
                        <div className="mb-1.5 flex items-center justify-between text-[10px] font-mono text-slate-300">
                          <span>00:14</span>
                          <span>01:30</span>
                        </div>
                        <div className="relative h-1.5 w-full rounded-full bg-white/15">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]"
                            style={{ width: "16%" }}
                          />
                          {[20, 45, 70].map((pos) => (
                            <Diamond
                              key={pos}
                              size={8}
                              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 fill-cyan-300 text-cyan-300"
                              style={{ left: `${pos}%` }}
                            />
                          ))}
                          <div
                            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                            style={{ left: "16%" }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right panel */}
              <div className="w-full shrink-0 border-t-2 border-[#1E293B] p-4 md:w-64 md:border-l-2 md:border-t-0">
                <div className="mb-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Layers size={12} /> {isVideo ? "Tracks" : "Layers"}
                  </p>
                  {isVideo ? (
                    <div className="space-y-1.5">
                      {TRACKS.map((track) => (
                        <div
                          key={track.name}
                          className={`flex items-center gap-2 rounded-md py-1.5 pl-1.5 pr-2.5 text-xs ${
                            track.active
                              ? "border-l-2 border-cyan-400 bg-cyan-950/30 text-cyan-200"
                              : "border-l-2 border-transparent text-slate-400"
                          }`}
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded ${
                              track.active
                                ? "bg-cyan-500/20 text-cyan-300"
                                : "bg-gradient-to-br from-slate-700 to-slate-900 text-slate-400"
                            }`}
                          >
                            <track.Icon size={13} />
                          </span>
                          <span className="flex-1 truncate">{track.name}</span>
                          <Trash2 size={12} className="shrink-0 text-slate-600" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {LAYERS.map((layer) => (
                        <div
                          key={layer.name}
                          className={`flex items-center gap-2 rounded-md py-1.5 pl-1.5 pr-2.5 text-xs ${
                            layer.active
                              ? "border-l-2 border-cyan-400 bg-cyan-950/30 text-cyan-200"
                              : "border-l-2 border-transparent text-slate-400"
                          }`}
                        >
                          {layer.thumb ? (
                            <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded">
                              <Image src={layer.thumb} alt="" fill sizes="28px" className="object-cover" />
                            </span>
                          ) : (
                            <span className="h-7 w-7 shrink-0 rounded bg-gradient-to-br from-slate-700 to-slate-900" />
                          )}
                          <span className="flex-1 truncate">{layer.name}</span>
                          <Trash2 size={12} className="shrink-0 text-slate-600" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {isVideo ? "Video Controls" : "Properties"}
                  </p>
                  {isVideo ? (
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-300">
                        <span>Keyframes</span>
                        <span className="relative inline-flex h-4 w-8 items-center rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                          <span className="absolute right-0.5 h-3 w-3 rounded-full bg-white shadow" />
                        </span>
                      </div>

                      <div>
                        <p className="mb-1 text-[11px] text-slate-400">Transitions</p>
                        <div className="flex items-center justify-between rounded-md border-2 border-[#1E293B] bg-[#0A0E17] px-2.5 py-1.5 text-[11px] text-slate-300">
                          Cross Dissolve
                          <ChevronDown size={12} className="text-slate-500" />
                        </div>
                      </div>

                      <div>
                        <p className="mb-1 text-[11px] text-slate-400">Frame Rate / Resolution</p>
                        <div className="flex gap-1.5">
                          <span className="rounded-md border-2 border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[10px] font-semibold text-cyan-300">
                            4K
                          </span>
                          <span className="rounded-md border-2 border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[10px] font-semibold text-cyan-300">
                            60 FPS
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {SLIDERS.map((slider) => (
                        <div key={slider.label}>
                          <div className="mb-1 flex justify-between text-[11px] text-slate-400">
                            <span>{slider.label}</span>
                            <span>{slider.value}</span>
                          </div>
                          <div className="h-1 w-full rounded-full bg-[#1E293B]">
                            {slider.from !== undefined ? (
                              <motion.div
                                className="h-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]"
                                initial={{ width: `${slider.from}%` }}
                                whileInView={{ width: `${slider.value}%` }}
                                viewport={{ once: true, amount: 0.5 }}
                                transition={{ type: "spring", stiffness: 90, damping: 18 }}
                              />
                            ) : (
                              <div
                                className="h-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]"
                                style={{ width: `${slider.value}%` }}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Feature chips: normal flow on mobile, overlapping the card's bottom edge from md up */}
          <div className="relative mt-6 flex flex-wrap justify-center gap-3 md:absolute md:inset-x-8 md:bottom-0 md:mt-0 md:translate-y-1/2 md:justify-start">
            {FLOATING_CHIPS_BY_TAB[activeTab].map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="flex items-center gap-3 rounded-xl border-2 border-[#1E293B] bg-[#0B1120]/95 px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.55)] backdrop-blur-md"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-300">
                  <Icon size={16} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">{title}</span>
                  <span className="block text-xs text-slate-400">{desc}</span>
                </span>
              </div>
            ))}
          </div>

          <Sparkle
            aria-hidden
            size={22}
            className="pointer-events-none absolute -bottom-6 -right-4 hidden text-white/70 drop-shadow-[0_0_10px_rgba(255,255,255,0.6)] sm:block"
          />
        </div>

        <div className="mt-8 md:mt-14">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 sm:text-left">
            Key Features
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {KEY_FEATURES_BY_TAB[activeTab].map(({ Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 rounded-xl border-2 border-[#1E293B] bg-[#0F172A]/60 px-4 py-3 text-sm text-slate-300"
              >
                <Icon size={16} className="shrink-0 text-cyan-300" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
