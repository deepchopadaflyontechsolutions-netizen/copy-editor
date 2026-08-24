"use client";

import Link from "next/link";
import { ArrowRight, Layers, ScanEye, ImageDown, Film, Clapperboard } from "lucide-react";
import MediaCompareSlider from "./MediaCompareSlider";
import type { MediaKind } from "@/lib/landing/mediaValidation";

const IMAGE_FEATURES = [
  { Icon: ScanEye, text: "Precise edge detection for complex subjects" },
  { Icon: ImageDown, text: "Transparent PNG export, ready to use" },
  { Icon: Layers, text: "Instant background swap on any subject" },
];

const VIDEO_FEATURES = [
  { Icon: Clapperboard, text: "No green screen — works on any footage" },
  { Icon: Layers, text: "Stable edges across the clip, no flicker or halos" },
  { Icon: Film, text: "Transparent WebM/MOV, ready to composite" },
];

export default function BackgroundRemovalSection({ activeTab }: { activeTab: MediaKind }) {
  const isVideo = activeTab === "video";
  const badge = isVideo ? "Video Background Remover" : "Background Remover";
  const heading = isVideo
    ? "Cut the background out of your video, one frame at a time"
    : "Isolate subjects and erase backgrounds in seconds";
  const description = isVideo
    ? "No green screen, no rotoscoping. Our model segments the subject on every frame and holds the edges steady through motion, so fine fur, stray hairs, and fast movement don't break apart into flicker."
    : "Fine fur, stray hairs, motion blur — our edge detection handles the hard cases automatically, cutting out clean subjects without the halos or jagged edges of a manual selection.";
  const features = isVideo ? VIDEO_FEATURES : IMAGE_FEATURES;
  const ctaLabel = isVideo ? "Try Video Background Remover" : "Try Background Remover";

  return (
    <section id="background-remover" className="px-6 pb-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-14">
          {/* Description — left in image mode, right in video mode */}
          <div className={isVideo ? "md:order-2" : "md:order-1"}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-400 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.9)] animate-pulse" />
              {badge}
            </span>

            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {heading}
            </h2>

            <p className="mt-4 max-w-lg text-sm leading-relaxed tracking-wide text-slate-400 sm:text-base">
              {description}
            </p>

            <ul className="mt-6 flex flex-col gap-3">
              {features.map(({ Icon, text }) => (
                <li
                  key={text}
                  className="group flex items-center gap-3 rounded-xl border-2 border-slate-800/80 bg-slate-950/40 p-3.5 text-sm text-slate-300 backdrop-blur-md transition-all duration-300 hover:border-purple-500/30 hover:bg-purple-950/30 hover:shadow-[0_0_20px_-6px_rgba(168,85,247,0.35)]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-purple-400/20 bg-purple-400/10 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.25)] transition-colors duration-200 group-hover:bg-purple-500 group-hover:text-white">
                    <Icon size={15} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>

            <Link
              href="/background-remover"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.03] hover:shadow-purple-500/40 active:scale-[0.98]"
            >
              {ctaLabel}
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Visual — right in image mode, left in video mode */}
          <div className={isVideo ? "md:order-1" : "md:order-2"}>
            <div className="mx-auto max-w-sm">
              {isVideo ? (
                <MediaCompareSlider
                  beforeSrc="/showcase/bg-remove-video.mp4"
                  afterSrc="/showcase/bg-remove-video.mp4"
                  beforeAlt="Footage with a full background"
                  afterAlt="Same footage with the background removed"
                  aspectClassName="aspect-[9/16]"
                  mediaKind="video"
                />
              ) : (
                <MediaCompareSlider
                  beforeSrc="/showcase/bg-remove-before.jpg"
                  afterSrc="/showcase/bg-remove-after.png"
                  beforeAlt="Dog running on grass with a full background"
                  afterAlt="Same dog cut out with a transparent background"
                  aspectClassName="aspect-[604/802]"
                  checkerboardAfter
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
