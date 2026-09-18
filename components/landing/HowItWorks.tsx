"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  CheckCircle2,
  Download,
  Image as ImageIcon,
  MousePointerClick,
  SlidersHorizontal,
  UploadCloud,
  Video,
  Wand2,
  Zap,
  type LucideIcon,
} from "lucide-react";

interface Step {
  index: string;
  label: string;
  title: string;
  description: string;
  Icon: LucideIcon;
}

const STEPS: Step[] = [
  {
    index: "01",
    label: "Upload",
    title: "Drop your file",
    description: "Drag in any image or video — PNG, JPG, WebP, MP4, or MOV.",
    Icon: UploadCloud,
  },
  {
    index: "02",
    label: "Select",
    title: "Pick your tool",
    description: "Choose crop & resize, background removal, watermark removal, or color adjustment.",
    Icon: MousePointerClick,
  },
  {
    index: "03",
    label: "Editor",
    title: "Jump into the editor",
    description: "Your file opens straight into the workspace for that tool — no setup, no waiting.",
    Icon: Wand2,
  },
  {
    index: "04",
    label: "Edit",
    title: "Make your changes",
    description: "Adjust, crop, retouch, or clean up the file with live preview as you go.",
    Icon: SlidersHorizontal,
  },
  {
    index: "05",
    label: "Download",
    title: "Get back your file",
    description: "Export the finished result at full quality, ready to use.",
    Icon: Download,
  },
];

interface FeatureRow {
  Icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURE_ROWS: FeatureRow[] = [
  {
    Icon: ImageIcon,
    title: "Images",
    description: "Corner & tiled logo, 48px and 96px variants",
  },
  {
    Icon: Video,
    title: "Video",
    description: "The logo tracked and removed on every frame",
  },
  {
    Icon: Zap,
    title: "Quality",
    description: "Original resolution, frame rate, and bitrate kept",
  },
];

const ROTATE_MS = 3500;

export default function HowItWorks() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [activeFeature, setActiveFeature] = useState<number | null>(null);
  const [burstKeys, setBurstKeys] = useState<number[]>(() => FEATURE_ROWS.map(() => 0));

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setActive((current) => (current + 1) % STEPS.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [paused]);

  const step = STEPS[active];

  const handleFeatureEnter = (index: number) => {
    setActiveFeature(index);
    setBurstKeys((prev) => prev.map((key, i) => (i === index ? key + 1 : key)));
  };

  return (
    <section id="how-it-works" className="px-6 pb-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            From upload to download in five steps
          </h2>
          <p className="mt-3 text-neutral-400">No tutorials needed — the workflow is the whole app.</p>
        </div>

        <div className="grid grid-cols-1 gap-10 rounded-3xl border border-neutral-800 bg-neutral-900 p-6 sm:p-10 lg:grid-cols-2 lg:gap-16">
          {/* Left — step carousel */}
          <div
            className="flex flex-col items-center"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div className="flex w-full max-w-sm items-stretch gap-4 sm:gap-5">
              {/* Vertical step tracker — nodes connected by a line that fills as steps advance */}
              <div className="relative flex w-7 shrink-0 flex-col items-center justify-between py-3">
                <div className="absolute left-1/2 top-3 bottom-3 w-0.5 -translate-x-1/2 rounded-full bg-neutral-800" />
                <div
                  className="absolute left-1/2 top-3 w-0.5 -translate-x-1/2 rounded-full bg-white transition-[height] duration-500 ease-in-out"
                  style={{ height: `calc((100% - 24px) * ${active / (STEPS.length - 1)})` }}
                />
                {STEPS.map((s, i) => {
                  const isDone = i < active;
                  const isActive = i === active;
                  return (
                    <button
                      key={s.index}
                      type="button"
                      onClick={() => setActive(i)}
                      aria-label={`Go to step ${s.index}: ${s.label}`}
                      aria-current={isActive}
                      className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center"
                    >
                      <motion.span
                        animate={{ scale: isActive ? 1.15 : 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold transition-colors duration-300 ${
                          isDone
                            ? "border-white bg-white text-neutral-900"
                            : isActive
                              ? "border-white bg-neutral-900 text-white shadow-lg shadow-black/30"
                              : "border-neutral-700 bg-neutral-900 text-neutral-500"
                        }`}
                      >
                        {isDone ? <Check size={12} /> : s.index}
                      </motion.span>
                    </button>
                  );
                })}
              </div>

              <div className="relative h-64 flex-1 overflow-hidden sm:h-56">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step.index}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    className="absolute inset-0 flex flex-col rounded-2xl border border-neutral-700 bg-neutral-800 p-6 shadow-xl shadow-black/30"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-black shadow-lg shadow-black/20">
                        <step.Icon size={20} />
                      </span>
                      <span className="text-xs font-bold uppercase tracking-widest text-neutral-300">
                        Step {step.index} · {step.label}
                      </span>
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-neutral-400">{step.description}</p>
                    <h3 className="mt-3 text-lg font-semibold text-white">{step.title}</h3>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <p className="mt-6 max-w-sm text-center text-sm text-neutral-400">
              Upload your file, pick a tool, edit it in the studio, and download the result — one connected flow.
            </p>
          </div>

          {/* Right — feature capabilities */}
          <div className="flex flex-col justify-center">
            <h3 className="text-xl font-semibold text-white sm:text-2xl">
              Works on images and video.{" "}
              <span className="text-neutral-400">
                The same workflow applied to still photos or tracked across every video frame.
              </span>
            </h3>

            <ul className="mt-6 flex flex-col gap-3">
              {FEATURE_ROWS.map(({ Icon, title, description }, index) => {
                const isActive = activeFeature === index;
                return (
                  <li
                    key={title}
                    onMouseEnter={() => handleFeatureEnter(index)}
                    onMouseLeave={() => setActiveFeature(null)}
                    className={`group flex items-center justify-between gap-4 rounded-xl border p-4 backdrop-blur-md transition-all duration-300 ${
                      isActive ? "border-neutral-600 bg-neutral-800/40" : "border-neutral-800 bg-neutral-900/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800/60 text-neutral-300 transition-colors duration-200 group-hover:bg-white group-hover:text-black">
                        <Icon size={16} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">{title}</p>
                        <p className="text-xs leading-relaxed text-neutral-400">{description}</p>
                      </div>
                    </div>

                    {/* Checkmark unveil: spring pop-in, replayed on every hover, with a glow burst */}
                    <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-white/5 text-neutral-200">
                      <AnimatePresence>
                        {isActive && (
                          <motion.span
                            key={`glow-${burstKeys[index]}`}
                            initial={{ opacity: 0.9, scale: 0.6 }}
                            animate={{ opacity: 0, scale: 1.8 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="pointer-events-none absolute inset-0 rounded-full border border-white/60 shadow-[0_0_14px_rgba(255,255,255,0.5)]"
                          />
                        )}
                      </AnimatePresence>
                      <motion.span
                        key={`check-${burstKeys[index]}`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        className="flex items-center justify-center"
                      >
                        <CheckCircle2 size={16} />
                      </motion.span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
