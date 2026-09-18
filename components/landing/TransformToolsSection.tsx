"use client";

import Link from "next/link";
import { ArrowRight, FlipHorizontal2, RotateCw, SlidersHorizontal, Type, Music, Gauge } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import ToolPreviewFrame from "./ToolPreviewFrame";
import { sora } from "./fonts";
import type { MediaKind } from "@/lib/landing/mediaValidation";

const IMAGE_FEATURES = [
  { Icon: RotateCw, text: "Aspect ratio crop (16:9, 9:16, 1:1, 4:5, custom) & aspect-lock" },
  { Icon: FlipHorizontal2, text: "Quick horizontal/vertical flip, 90° rotation & corner radius slider" },
  { Icon: SlidersHorizontal, text: "Live non-destructive light & color controls (brightness, contrast, saturation, tint)" },
];

const VIDEO_FEATURES = [
  { Icon: Gauge, text: "Per-clip volume control, mute toggles, and audio fade in/out" },
  { Icon: Type, text: "Positioned text element overlays synced to playback timestamps" },
  { Icon: Music, text: "Variable speed control (0.25x–4x) and baked-in cinematic color filters" },
];

export default function TransformToolsSection({ activeTab }: { activeTab: MediaKind }) {
  const isVideo = activeTab === "video";
  const badge = isVideo ? "AUDIO, TEXT OVERLAYS & EFFECTS" : "CROP, TRANSFORM & ADJUSTMENTS";
  const heading = isVideo
    ? "Alter audio tracks, add synced text, and apply filters"
    : "Frame, flip, round corners, and tune colors live";
  const description = isVideo
    ? "Customize per-clip audio levels, layer separate background music tracks, place timed text captions, and apply cinematic filters across playback."
    : "Reshape your canvas with aspect-ratio snapping, instant flip and rotate actions, customizable corner border radius, and precise color adjustments.";
  const features = isVideo ? VIDEO_FEATURES : IMAGE_FEATURES;
  const ctaLabel = isVideo ? "Try Video Editor" : "Explore Canvas Tools";
  const ctaHref = isVideo ? "/video-editor" : "/editor?tool=crop";

  return (
    <section id="transform-tools" className="px-6 pb-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-14">
          {/* Description — left in image mode, right in video mode */}
          <div className={isVideo ? "md:order-2" : "md:order-1"}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-300 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-pulse" />
              {badge}
            </span>

            <h2 className={`${sora.className} mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl`}>
              {heading}
            </h2>

            <AnimatePresence mode="wait">
              <motion.p
                key={`${activeTab}-desc`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-4 max-w-lg text-sm leading-relaxed tracking-wide text-neutral-400 sm:text-base"
              >
                {description}
              </motion.p>
            </AnimatePresence>

            <ul className="mt-6 flex min-h-42 flex-col gap-3">
              {features.map(({ Icon, text }) => (
                <li
                  key={text}
                  className="group flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950/40 p-3.5 text-sm text-neutral-300 backdrop-blur-md transition-all duration-300 hover:border-neutral-600 hover:bg-neutral-900/40"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-700 bg-white/5 text-neutral-200 transition-colors duration-200 group-hover:bg-white group-hover:text-black">
                    <Icon size={15} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>

            <Link
              href={ctaHref}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-md shadow-black/20 transition-all hover:scale-[1.03] hover:bg-neutral-200 active:scale-[0.98]"
            >
              {ctaLabel}
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Visual — right in image mode, left in video mode */}
          <motion.div layout className={isVideo ? "md:order-1" : "md:order-2"}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                {isVideo ? (
                  <ToolPreviewFrame
                    mediaSrc="/showcase/bg-remove-video.mp4"
                    mediaAlt="Clip with captions, background music, and a cinematic filter applied"
                    mediaKind="video"
                    aspectClassName="aspect-video"
                    badges={[
                      { Icon: Type, label: "Caption" },
                      { Icon: Music, label: "Fade" },
                      { Icon: Gauge, label: "1.5x" },
                    ]}
                  />
                ) : (
                  <ToolPreviewFrame
                    mediaSrc="/showcase/bg-remove-before.jpg"
                    mediaAlt="Photo cropped to a custom aspect ratio with adjusted color and light"
                    aspectClassName="aspect-[4/3]"
                    badges={[
                      { Icon: RotateCw, label: "Rotate" },
                      { Icon: FlipHorizontal2, label: "Flip" },
                      { Icon: SlidersHorizontal, label: "Effect" },
                    ]}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
