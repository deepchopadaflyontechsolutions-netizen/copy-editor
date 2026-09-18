"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  Ban,
  Contrast,
  Crop,
  Diamond,
  Droplet,
  Film,
  Gauge,
  ImageIcon,
  Layers,
  Music,
  Play,
  ShieldCheck,
  Snowflake,
  Sparkle,
  Sparkles,
  SlidersHorizontal,
  Stamp,
  Sun,
  Type,
  UploadCloud,
  Wand2,
  Zap,
} from "lucide-react";
import type { MediaKind } from "@/lib/landing/mediaValidation";

type EditorTab = MediaKind;

const ASPECT_RATIOS = [
  { label: "1:1", desc: "Square", active: false },
  { label: "4:5", desc: "Portrait", active: false },
  { label: "16:9", desc: "Widescreen", active: true },
  { label: "9:16", desc: "Story", active: false },
];

/** Same 5 options, same order, as the real Frame panel's aspect-ratio grid. */
const VIDEO_ASPECT_RATIOS = [
  { label: "16:9", active: true },
  { label: "9:16", active: false },
  { label: "1:1", active: false },
  { label: "4:5", active: false },
  { label: "Original", active: false },
];

/** Same preset list/icons as the real Effects panel. */
const VIDEO_EFFECTS = [
  { label: "None", Icon: Ban, active: true },
  { label: "Grayscale", Icon: Contrast, active: false },
  { label: "Sepia", Icon: Sun, active: false },
  { label: "Warm", Icon: Sparkles, active: false },
  { label: "Cool", Icon: Snowflake, active: false },
  { label: "Bold", Icon: Contrast, active: false },
];

const PRESETS = [
  { label: "Auto", Icon: Wand2, active: true },
  { label: "B&W", Icon: Contrast, active: false },
  { label: "Pop", Icon: Sun, active: false },
];

/** Gradient-track color sliders — visually distinct from the plain white-fill Light sliders
 * below, matching the real Adjust panel's Color section (vibrance/temperature/hue each carry
 * their own colored track instead of a neutral one). */
const COLOR_SLIDERS: { label: string; value: number; gradient: string }[] = [
  { label: "Vibrance", value: 62, gradient: "linear-gradient(to right, #7c3aed, #ef4444)" },
  { label: "Temperature", value: 55, gradient: "linear-gradient(to right, #3b82f6, #f59e0b)" },
  { label: "Hue", value: 50, gradient: "linear-gradient(to right, #ef4444, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)" },
];

const LIGHT_SLIDERS: { label: string; value: number; from?: number }[] = [
  { label: "Exposure", value: 82, from: 50 },
  { label: "Contrast", value: 48, from: 30 },
];

/** Same 4 tabs, same order, as the real image editor's dock (RightPanel.tsx). */
const IMAGE_TOOLS = [
  { label: "Upload", Icon: ImageIcon },
  { label: "Adjust", Icon: SlidersHorizontal },
  { label: "Crop", Icon: Crop },
  { label: "Mark", Icon: Stamp },
];

/** Same 6 tabs, same order, as the real video editor's dock (VideoToolDock.tsx) — distinct
 * from IMAGE_TOOLS since the two editors don't share a tab set. */
const VIDEO_TOOLS = [
  { label: "Upload", Icon: UploadCloud },
  { label: "Crop", Icon: Crop },
  { label: "Text", Icon: Type },
  { label: "Audio", Icon: Music },
  { label: "Speed", Icon: Gauge },
  { label: "Effects", Icon: Wand2 },
];

const FLOATING_CHIPS_BY_TAB: Record<
  EditorTab,
  { Icon: typeof Crop; title: string; desc: string }[]
> = {
  image: [
    { Icon: Crop, title: "Aspect Ratio Crop", desc: "Snap to any standard or custom ratio" },
    { Icon: Droplet, title: "Watermarking", desc: "Stamp your own logo or text" },
  ],
  video: [
    { Icon: Layers, title: "Multi-track Video Suite", desc: "Precision timeline & layer controls" },
    { Icon: Sparkle, title: "Cinematic Filters", desc: "Live grayscale, sepia & warm looks" },
  ],
};

const KEY_FEATURES_BY_TAB: Record<EditorTab, { Icon: typeof Crop; label: string }[]> = {
  image: [
    { Icon: Crop, label: "Aspect Ratio Crop & Resize" },
    { Icon: Droplet, label: "Professional Watermarking" },
    { Icon: SlidersHorizontal, label: "Color & Light Adjustments" },
  ],
  video: [
    { Icon: Film, label: "Multi-track Video Suite" },
    { Icon: Zap, label: "1440p Local Export" },
    { Icon: Sparkle, label: "Cinematic Filters" },
  ],
};

export default function ShowcaseSection({ activeTab }: { activeTab: EditorTab }) {
  const isVideo = activeTab === "video";

  return (
    <section id="tools" className="relative overflow-hidden px-6 pb-32 pt-4">
      {/* Decorative dotted backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(rgba(163,163,163,0.25)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black_10%,transparent_75%)]"
      />

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            A canvas built for <span className="text-white">precision</span>
          </h2>
          <p className="mt-3 text-neutral-400">
            Layered editing, precision selection tools, and fine-grained color controls —
            all live in your browser.
          </p>
        </div>

        <div className="relative overflow-visible rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl shadow-black/50">
          <div className="overflow-hidden rounded-2xl">
            {/* Fake title bar */}
            <div className="flex items-center gap-2 border-b border-neutral-800 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
              <span className="ml-3 truncate text-xs font-medium text-neutral-500">
                CreativeFlow Editor — {isVideo ? "untitled-project.mp4" : "untitled-project.psdx"}
              </span>
            </div>

            {/* Tool rail + properties panel both sit on the left of the canvas, same order as
                the real app (its dock+drawer renders before the canvas in the DOM despite the
                component's own name being "RightPanel" — see CreativeFlowApp.tsx). */}
            <div className="flex flex-col md:flex-row">
              {/* Left tool rail — same shape as the real editor's dock: labeled tiles, an
                  active pill behind the current tool, and a white accent bar on its outer
                  edge, instead of a bare row of unlabeled icon squares floating in empty
                  space. */}
              <div className="flex shrink-0 flex-row gap-2 border-b border-neutral-800/70 bg-neutral-900/90 p-2.5 md:w-20 md:flex-col md:border-b-0 md:border-r">
                {(isVideo ? VIDEO_TOOLS : IMAGE_TOOLS).map(({ label, Icon }, index) => {
                  const isActive = index === 0;
                  return (
                    <div
                      key={label}
                      className={`group relative flex h-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-medium tracking-tight md:w-full ${
                        isActive ? "text-white" : "text-neutral-400"
                      }`}
                    >
                      {isActive ? (
                        <>
                          <span className="absolute inset-0.5 rounded-lg bg-white/10" />
                          <span className="absolute right-0 top-1/2 hidden h-8 w-1 -translate-y-1/2 rounded-l-full bg-white md:block" />
                        </>
                      ) : (
                        <span className="absolute inset-0.5 rounded-lg bg-transparent transition-colors group-hover:bg-neutral-800/60" />
                      )}
                      <Icon size={19} className="relative z-10" />
                      <span className="relative z-10 leading-none">{label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Properties panel */}
              <div className="w-full shrink-0 border-b border-neutral-800 p-4 md:w-72 md:border-b-0 md:border-r">
                <div className="mb-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <Crop size={12} /> Aspect Ratio
                  </p>
                  {isVideo ? (
                    <div className="grid grid-cols-3 gap-1.5">
                      {VIDEO_ASPECT_RATIOS.map((ratio) => (
                        <div
                          key={ratio.label}
                          className={`rounded-md border px-2.5 py-1.5 text-center text-xs font-semibold ${
                            ratio.active
                              ? "border-white/25 bg-white/10 text-neutral-100"
                              : "border-neutral-800 bg-neutral-950 text-neutral-400"
                          }`}
                        >
                          {ratio.label}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      {ASPECT_RATIOS.map((ratio) => (
                        <div
                          key={ratio.label}
                          className={`rounded-md border px-2.5 py-1.5 text-xs ${
                            ratio.active
                              ? "border-white/25 bg-white/10 text-neutral-100"
                              : "border-neutral-800 bg-neutral-950 text-neutral-400"
                          }`}
                        >
                          <span className="block font-semibold">{ratio.label}</span>
                          <span className="block text-[10px] text-neutral-500">{ratio.desc}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    {isVideo ? "Effects" : "Adjust"}
                  </p>
                  {isVideo ? (
                    <div className="grid grid-cols-2 gap-1.5">
                      {VIDEO_EFFECTS.map(({ label, Icon, active }) => (
                        <div
                          key={label}
                          className={`flex flex-col items-center gap-1 rounded-md border px-2 py-2.5 text-[11px] font-semibold ${
                            active
                              ? "border-white/25 bg-white/10 text-neutral-100"
                              : "border-neutral-800 bg-neutral-950 text-neutral-400"
                          }`}
                        >
                          <Icon size={14} />
                          {label}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Presets */}
                      <div className="grid grid-cols-3 gap-1.5">
                        {PRESETS.map(({ label, Icon, active }) => (
                          <div
                            key={label}
                            className={`flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-[10px] font-semibold ${
                              active
                                ? "border-white/25 bg-white/10 text-neutral-100"
                                : "border-neutral-800 bg-neutral-950 text-neutral-400"
                            }`}
                          >
                            <Icon size={13} />
                            {label}
                          </div>
                        ))}
                      </div>

                      {/* Color — gradient-track sliders */}
                      <div>
                        <p className="mb-1.5 text-[11px] font-semibold text-neutral-400">Color</p>
                        <div className="space-y-2.5">
                          {COLOR_SLIDERS.map((slider) => (
                            <div key={slider.label}>
                              <div className="mb-1 flex justify-between text-[11px] text-neutral-400">
                                <span>{slider.label}</span>
                                <span>{slider.value}</span>
                              </div>
                              <div className="relative h-1.5 w-full rounded-full" style={{ background: slider.gradient }}>
                                <span
                                  className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-neutral-900 bg-white shadow-[0_0_4px_rgba(0,0,0,0.5)]"
                                  style={{ left: `${slider.value}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Light — plain white-fill sliders */}
                      <div>
                        <p className="mb-1.5 text-[11px] font-semibold text-neutral-400">Light</p>
                        <div className="space-y-2.5">
                          {LIGHT_SLIDERS.map((slider) => (
                            <div key={slider.label}>
                              <div className="mb-1 flex justify-between text-[11px] text-neutral-400">
                                <span>{slider.label}</span>
                                <span>{slider.value}</span>
                              </div>
                              <div className="h-1 w-full rounded-full bg-neutral-800">
                                {slider.from !== undefined ? (
                                  <motion.div
                                    className="h-1 rounded-full bg-white"
                                    initial={{ width: `${slider.from}%` }}
                                    whileInView={{ width: `${slider.value}%` }}
                                    viewport={{ once: true, amount: 0.5 }}
                                    transition={{ type: "spring", stiffness: 90, damping: 18 }}
                                  />
                                ) : (
                                  <div className="h-1 rounded-full bg-white" style={{ width: `${slider.value}%` }} />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Canvas area */}
              <div className="flex flex-1 items-center justify-center bg-neutral-950 p-6 pb-10 md:p-8 md:pb-12">
                <div className="relative aspect-[675/312] w-full max-w-2xl overflow-hidden rounded-lg border border-neutral-800 shadow-[0_0_0_1px_rgba(0,0,0,0.6)]">
                  <Image
                    src="/showcase/precision-canvas.png"
                    alt={
                      isVideo
                        ? "Paused frame of a portrait video shoot on a city rooftop, edited in the CreativeFlow timeline"
                        : "Portrait subject on a city rooftop, framed in the CreativeFlow crop tool"
                    }
                    fill
                    sizes="(min-width: 768px) 640px, 100vw"
                    className={`object-cover ${isVideo ? "brightness-[0.75]" : ""}`}
                    priority
                  />

                  {!isVideo && (
                    <>
                      {/* Crop selection frame — dashed inset border with drag handles at each
                          corner and edge midpoint, same shape as the real Crop panel's overlay. */}
                      <div className="pointer-events-none absolute inset-[8%] border-2 border-dashed border-white/70" />
                      {[
                        { top: "8%", left: "8%" },
                        { top: "8%", left: "50%" },
                        { top: "8%", left: "92%" },
                        { top: "50%", left: "8%" },
                        { top: "50%", left: "92%" },
                        { top: "92%", left: "8%" },
                        { top: "92%", left: "50%" },
                        { top: "92%", left: "92%" },
                      ].map((pos, index) => (
                        <span
                          key={index}
                          aria-hidden
                          className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-neutral-900 bg-white shadow-[0_0_6px_rgba(255,255,255,0.6)]"
                          style={pos}
                        />
                      ))}

                      {/* Floating aspect-ratio badge, gently pulsing */}
                      <motion.span
                        aria-hidden
                        animate={{ opacity: [0.75, 1, 0.75] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="pointer-events-none absolute right-[18%] top-[20%] flex items-center gap-1.5 rounded-full border border-neutral-700/60 bg-neutral-950/70 px-2.5 py-1 text-[11px] font-semibold text-neutral-200 shadow-lg shadow-black/40 backdrop-blur-sm"
                      >
                        <Crop size={12} />
                        16:9
                      </motion.span>
                    </>
                  )}

                  {isVideo && (
                    <>
                      {/* Clean export badge */}
                      <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-neutral-700/60 bg-neutral-950/70 px-2.5 py-1 text-[11px] font-semibold text-neutral-200 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
                        <ShieldCheck size={12} />
                        Clean Export — No Watermark
                      </span>

                      {/* Play/pause overlay button */}
                      <button
                        type="button"
                        aria-label="Play preview"
                        className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur-md transition-transform hover:scale-105"
                      >
                        <Play size={22} className="ml-0.5" fill="currentColor" />
                      </button>

                      {/* Timeline scrubber */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8">
                        <div className="mb-1.5 flex items-center justify-between text-[10px] text-neutral-300">
                          <span>00:14</span>
                          <span>01:30</span>
                        </div>
                        <div className="relative h-1.5 w-full rounded-full bg-white/15">
                          <div
                            className="h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                            style={{ width: "16%" }}
                          />
                          {[20, 45, 70].map((pos) => (
                            <Diamond
                              key={pos}
                              size={8}
                              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 fill-neutral-300 text-neutral-300"
                              style={{ left: `${pos}%` }}
                            />
                          ))}
                          <div
                            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-neutral-900 bg-white shadow-[0_0_10px_rgba(255,255,255,0.6)]"
                            style={{ left: "16%" }}
                          />
                        </div>
                      </div>
                    </>
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
                className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/95 px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur-md"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
                  <Icon size={16} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">{title}</span>
                  <span className="block text-xs text-neutral-400">{desc}</span>
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
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-neutral-500 sm:text-left">
            Key Features
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {KEY_FEATURES_BY_TAB[activeTab].map(({ Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 text-sm text-neutral-300"
              >
                <Icon size={16} className="shrink-0 text-neutral-200" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
