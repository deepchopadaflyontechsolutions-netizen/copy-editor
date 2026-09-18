"use client";

import Link from "next/link";
import { ArrowRight, Brush, Undo2, Stamp, Crop as CropIcon, Scissors, Shuffle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import ToolPreviewFrame from "./ToolPreviewFrame";
import { sora } from "./fonts";
import type { MediaKind } from "@/lib/landing/mediaValidation";

const IMAGE_FEATURES = [
  { Icon: Brush, text: "Precision brush, pen, and shape marking tools" },
  { Icon: Stamp, text: "Custom watermark, logo, and text stamp overlays" },
  { Icon: Undo2, text: "Layered markup with real-time undo history" },
];

const VIDEO_FEATURES = [
  { Icon: CropIcon, text: "Live video canvas cropping (16:9, 9:16, 1:1, 4:5, original)" },
  { Icon: Scissors, text: "Multi-clip timeline trimming, splitting, and clip reordering" },
  { Icon: Shuffle, text: "Smooth inter-clip transitions (fade, slide, wipe, zoom)" },
];

export default function MarkupToolsSection({ activeTab }: { activeTab: MediaKind }) {
  const isVideo = activeTab === "video";
  const badge = isVideo ? "CROP, FRAME & TIMELINE TRIMMING" : "WATERMARK & MARKING TOOLS";
  const heading = isVideo
    ? "Reshape aspect ratios, trim timelines, and split clips"
    : "Draw, mark, brush, and stamp overlays seamlessly";
  const description = isVideo
    ? "Reshape your video frames live across standard aspect ratios while trimming, cutting, and reordering multi-clip sequences on a drag-and-drop filmstrip timeline."
    : "Annotate, highlight, or place watermarks directly on your canvas with precision drawing, freehand brush controls, and vector markup tools.";
  const features = isVideo ? VIDEO_FEATURES : IMAGE_FEATURES;
  const ctaLabel = isVideo ? "Open Video Timeline" : "Open Image Markup";
  const ctaHref = isVideo ? "/video-editor?panel=frame" : "/editor?tool=watermark_remover";

  return (
    <section id="markup-tools" className="px-6 pb-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-14">
          {/* Visual — left in image mode, right in video mode */}
          <motion.div layout className={isVideo ? "md:order-2" : "md:order-1"}>
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
                    mediaSrc="/showcase/watermark-video.mp4"
                    mediaAlt="Clip reframed to a vertical aspect ratio and trimmed on the timeline"
                    mediaKind="video"
                    aspectClassName="aspect-video"
                    badges={[
                      { Icon: CropIcon, label: "9:16" },
                      { Icon: Scissors, label: "Trim" },
                      { Icon: Shuffle, label: "Reorder" },
                    ]}
                  />
                ) : (
                  <ToolPreviewFrame
                    mediaSrc="/showcase/watermark-before.png"
                    mediaAlt="Canvas with a custom text stamp and brush markup applied"
                    aspectClassName="aspect-[4/3]"
                    badges={[
                      { Icon: Brush, label: "Brush" },
                      { Icon: Stamp, label: "Stamp" },
                      { Icon: Undo2, label: "Undo" },
                    ]}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Description — right in image mode, left in video mode */}
          <div className={isVideo ? "md:order-1" : "md:order-2"}>
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
        </div>
      </div>
    </section>
  );
}
