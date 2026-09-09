"use client";

import Link from "next/link";
import { ArrowRight, Wand2, Layers, MousePointerClick, ScanLine, Gauge } from "lucide-react";
import MediaCompareSlider from "./MediaCompareSlider";
import type { MediaKind } from "@/lib/landing/mediaValidation";

const IMAGE_FEATURES = [
  { Icon: Wand2, text: "AI auto-detection of logos, text & stamps" },
  { Icon: Layers, text: "Lossless detail preservation underneath" },
  { Icon: MousePointerClick, text: "One-click export, no manual masking" },
];

const VIDEO_FEATURES = [
  { Icon: ScanLine, text: "Locks onto the logo through pans, zooms & cuts" },
  { Icon: Layers, text: "Rebuilds every frame underneath — zero flicker" },
  { Icon: Gauge, text: "Original resolution, frame rate & bitrate kept" },
];

export default function WatermarkRemovalSection({ activeTab }: { activeTab: MediaKind }) {
  const isVideo = activeTab === "video";
  const badge = isVideo ? "Video Watermark Remover" : "Watermark Remover";
  const heading = isVideo
    ? "Erase watermarks from your footage, frame by frame"
    : "Remove logos, text, and stamps seamlessly";
  const description = isVideo
    ? "Drop in a clip and our AI tracks the logo or timestamp through motion, panning shots, and cuts, then reconstructs what's underneath on every frame — no re-encoding, no quality loss, no manual keyframing."
    : "Our AI detects corner watermarks and overlay logos, then reconstructs what's underneath — so the cleaned image keeps its original texture and detail instead of leaving a smudge behind.";
  const features = isVideo ? VIDEO_FEATURES : IMAGE_FEATURES;
  const ctaLabel = isVideo ? "Try Video Watermark Remover" : "Try Watermark Remover";

  return (
    <section id="watermark-remover" className="px-6 pb-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-14">
          {/* Visual — left in image mode, right in video mode */}
          <div className={isVideo ? "md:order-2" : "md:order-1"}>
            {isVideo ? (
              <MediaCompareSlider
                beforeSrc="/showcase/watermark-video.mp4"
                afterSrc="/showcase/watermark-video.mp4"
                beforeAlt="Footage with a watermark overlay"
                afterAlt="Same footage with the watermark removed"
                aspectClassName="aspect-video"
                mediaKind="video"
              />
            ) : (
              <MediaCompareSlider
                beforeSrc="/showcase/watermark-before.png"
                afterSrc="/showcase/watermark-after.png"
                beforeAlt="Portrait with a watermark in the corner"
                afterAlt="Same portrait with the watermark removed"
                aspectClassName="aspect-[4/3]"
              />
            )}
          </div>

          {/* Description — right in image mode, left in video mode */}
          <div className={isVideo ? "md:order-1" : "md:order-2"}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-400 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.9)] animate-pulse" />
              {badge}
            </span>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {heading}
            </h2>

            <p className="mt-4 max-w-lg text-sm leading-relaxed tracking-wide text-slate-400 sm:text-base">
              {description}
            </p>

            <ul className="mt-6 flex flex-col gap-3">
              {features.map(({ Icon, text }) => (
                <li
                  key={text}
                  className="group flex items-center gap-3 rounded-xl border-2 border-slate-800/80 bg-slate-950/40 p-3.5 text-sm text-slate-300 backdrop-blur-md transition-all duration-300 hover:border-cyan-500/30 hover:bg-cyan-950/30 hover:shadow-[0_0_20px_-6px_rgba(6,182,212,0.35)]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-cyan-400/20 bg-cyan-400/10 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)] transition-colors duration-200 group-hover:bg-cyan-500 group-hover:text-white">
                    <Icon size={15} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>

            <Link
              href="/watermark-remover"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.03] hover:shadow-cyan-500/40 active:scale-[0.98]"
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
