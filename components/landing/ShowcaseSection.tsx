"use client";

import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Layers,
  Lock,
  Paintbrush2,
  Play,
  SlidersHorizontal,
  Unlock,
  Wand2,
} from "lucide-react";

const LAYERS = [
  { name: "Background", active: false, visible: true, locked: true },
  { name: "Subject Cutout", active: true, visible: true, locked: false },
  { name: "Color Grade", active: false, visible: true, locked: false },
  { name: "Retouch Mask", active: false, visible: false, locked: false },
];

const SLIDERS = [
  { label: "Exposure", value: 62 },
  { label: "Contrast", value: 48 },
  { label: "Edge Refinement", value: 30 },
];

const TOOLS = [Paintbrush2, Wand2, SlidersHorizontal, Layers];

const KEYFRAME_POSITIONS = [12, 32, 55, 78];

const FEATURE_HIGHLIGHTS = [
  { emoji: "🪄", label: "AI Object Masking" },
  { emoji: "💧", label: "Custom Watermarking" },
  { emoji: "🎥", label: "Multi-track Video Suite" },
  { emoji: "⚡", label: "4K Browser Export" },
];

export default function ShowcaseSection() {
  return (
    <section id="tools" className="px-6 pb-28">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-12 max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            A canvas built for precision
          </h2>
          <p className="mt-3 text-slate-400">
            Layered editing, precision selection tools, and fine-grained color controls —
            all live in your browser.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="overflow-hidden rounded-2xl border border-[#1E293B] bg-[#0F172A] shadow-[0_40px_80px_rgba(0,0,0,0.5)]"
        >
          {/* Fake title bar */}
          <div className="flex items-center gap-2 border-b border-[#1E293B] px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
            <span className="ml-3 text-xs font-medium text-slate-500">
              CreativeFlow Editor — untitled-project.psdx
            </span>
          </div>

          <div className="flex flex-col md:flex-row">
            {/* Left tool rail */}
            <div className="flex shrink-0 flex-row gap-2 border-b border-[#1E293B] p-3 md:flex-col md:border-b-0 md:border-r">
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
            <div className="flex flex-1 items-center justify-center bg-[#0A0E17] p-6 md:p-8">
              <div className="relative w-full max-w-2xl overflow-hidden rounded-lg border border-[#1E293B] shadow-[0_0_0_1px_rgba(15,23,42,0.6)]">
                <div className="grid grid-cols-1 sm:grid-cols-2">
                  {/* Left half — image editing */}
                  <div className="relative aspect-[4/3] overflow-hidden border-b border-[#1E293B] bg-gradient-to-br from-[#12213D] via-[#0F172A] to-[#1E3A8A] sm:aspect-auto sm:h-[280px] sm:border-b-0 sm:border-r">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_38%,rgba(34,211,238,0.3),transparent_60%)]" />

                    {/* Subject cutout shape with cyan glow */}
                    <div className="absolute left-1/2 top-[42%] h-28 w-24 -translate-x-1/2 -translate-y-1/2 rounded-[45%_55%_60%_40%/50%_45%_55%_50%] bg-gradient-to-b from-slate-300/30 to-slate-500/30 shadow-[0_0_28px_rgba(34,211,238,0.55)] ring-2 ring-cyan-400/70" />

                    {/* Dashed selection mask */}
                    <div className="absolute left-1/2 top-[42%] h-36 w-32 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-dashed border-cyan-400/60" />

                    {/* Mask tag */}
                    <span className="absolute left-1/2 top-[calc(42%+56px)] -translate-x-1/2 whitespace-nowrap rounded-full border border-cyan-400/40 bg-cyan-500/15 px-2 py-0.5 text-[9px] font-medium text-cyan-300">
                      AI Subject Cutout
                    </span>

                    {/* Floating glass badge — image metadata */}
                    <div className="absolute bottom-2 left-2 rounded-lg border border-slate-700/60 bg-slate-900/80 px-2 py-1 text-[10px] font-medium text-slate-300 shadow-lg backdrop-blur-md">
                      1600 × 1200 • PNG
                    </div>
                  </div>

                  {/* Right half — video editing */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#1E1035] via-[#0F172A] to-[#0B1220] sm:aspect-auto sm:h-[280px]">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                        <Play size={18} className="ml-0.5 text-white/80" fill="currentColor" />
                      </div>
                    </div>

                    {/* Timeline strip */}
                    <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-black/50 px-3 py-2.5">
                      <div className="relative h-1.5 w-full rounded-full bg-slate-700/70">
                        <div className="absolute inset-y-0 left-0 w-[18%] rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" />
                        {KEYFRAME_POSITIONS.map((pos) => (
                          <span
                            key={pos}
                            className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rotate-45 bg-cyan-300"
                            style={{ left: `${pos}%` }}
                          />
                        ))}
                        <div className="absolute -top-1.5 h-4 w-0.5 bg-white" style={{ left: "18%" }}>
                          <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[9px] font-medium text-slate-400">
                        <span>00:14</span>
                        <span>01:30</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating overlay callouts */}
                <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-xl border border-slate-700/60 bg-slate-900/80 px-3 py-2 text-[10px] font-medium text-slate-200 shadow-xl backdrop-blur-md">
                  <Eye size={12} className="text-cyan-300" />
                  Subject Mask · 85% Opacity
                </div>
                <div className="pointer-events-none absolute bottom-14 right-3 flex items-center gap-1.5 rounded-xl border border-slate-700/60 bg-slate-900/80 px-3 py-2 text-[10px] font-medium text-slate-200 shadow-xl backdrop-blur-md">
                  <Lock size={12} className="text-emerald-300" />
                  Clean Export (No Watermark)
                </div>
              </div>
            </div>

            {/* Right panel */}
            <div className="w-full shrink-0 border-t border-[#1E293B] p-4 md:w-64 md:border-l md:border-t-0">
              <div className="mb-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Layers size={12} /> Layers
                </p>
                <div className="space-y-1.5">
                  {LAYERS.map((layer) => (
                    <div
                      key={layer.name}
                      className={`flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-xs ${
                        layer.active
                          ? "border-l-2 border-cyan-400 bg-cyan-950/30 text-cyan-200"
                          : "border-l-2 border-transparent text-slate-400"
                      }`}
                    >
                      <span className="truncate">{layer.name}</span>
                      <span className="flex shrink-0 items-center gap-1.5 text-slate-500">
                        {layer.visible ? (
                          <Eye size={12} className={layer.active ? "text-cyan-300" : undefined} />
                        ) : (
                          <EyeOff size={12} />
                        )}
                        {layer.locked ? <Lock size={12} /> : <Unlock size={12} className="opacity-40" />}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Properties
                </p>
                <div className="space-y-3">
                  {SLIDERS.map((slider) => (
                    <div key={slider.label}>
                      <div className="mb-1 flex justify-between text-[11px] text-slate-400">
                        <span>{slider.label}</span>
                        <span>{slider.value}</span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-[#1E293B]">
                        <div
                          className="h-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]"
                          style={{ width: `${slider.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {FEATURE_HIGHLIGHTS.map(({ emoji, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-xl border border-[#1E293B] bg-[#0F172A]/60 px-4 py-3 text-sm text-slate-300"
            >
              <span className="text-base">{emoji}</span>
              {label}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
