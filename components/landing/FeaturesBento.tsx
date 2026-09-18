"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Crop,
  Brush,
  FlipHorizontal2,
  SlidersHorizontal,
  ShieldCheck,
  Download,
  Film,
  Type,
  Music,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { sora } from "./fonts";
import type { MediaKind } from "@/lib/landing/mediaValidation";

interface FeatureCard {
  title: string;
  description: string;
  Icon: LucideIcon;
}

const IMAGE_FEATURES: FeatureCard[] = [
  {
    title: "Smart Crop & Aspect Resize",
    description: "Snap to target aspect ratios or scale pixel dimensions with live aspect ratio locking.",
    Icon: Crop,
  },
  {
    title: "Mark, Draw & Stamp Tools",
    description: "Apply freehand brush strokes, geometric shapes, and custom image/text watermarks directly on canvas.",
    Icon: Brush,
  },
  {
    title: "Transform & Border Styling",
    description: "Flip vertically or horizontally, rotate 90°, and smooth image corners using custom border radius controls.",
    Icon: FlipHorizontal2,
  },
  {
    title: "Live Color & Light Tuning",
    description: "Adjust exposure, contrast, vibrance, temperature, and hue with real-time non-destructive sliders.",
    Icon: SlidersHorizontal,
  },
  {
    title: "100% Private & Serverless",
    description: "All rendering happens locally inside your browser tab—your images never touch any external server.",
    Icon: ShieldCheck,
  },
  {
    title: "Instant Multi-Format Export",
    description: "Export high-resolution outputs directly to JPG, PNG, or WebP formats without quality loss.",
    Icon: Download,
  },
];

const VIDEO_FEATURES: FeatureCard[] = [
  {
    title: "Timeline Trimming & Frame Cropping",
    description: "Crop canvas aspect ratios live and perform precision trimming, splitting, and clip sequencing.",
    Icon: Film,
  },
  {
    title: "Timed Text & Caption Elements",
    description: "Add position-locked text and overlays perfectly synchronized to your video timeline timestamps.",
    Icon: Type,
  },
  {
    title: "Audio Controls & Music Layering",
    description: "Modify clip volume, mute unwanted tracks, apply audio fades, and layer background music tracks.",
    Icon: Music,
  },
  {
    title: "Speed & Cinematic Effects",
    description: "Control playback speed from 0.25x to 4x and apply real-time color filters (grayscale, sepia, high contrast).",
    Icon: Sparkles,
  },
  {
    title: "Zero Server Uploads",
    description: "Local tab processing ensures complete privacy and zero queuing time for clip rendering.",
    Icon: ShieldCheck,
  },
  {
    title: "Multi-Resolution Local Export",
    description: "Render high-definition WebM or MP4 video files locally at 720p, 1080p, or 1440p resolutions.",
    Icon: Download,
  },
];

export default function FeaturesBento({ activeTab }: { activeTab: MediaKind }) {
  const isVideo = activeTab === "video";
  const features = isVideo ? VIDEO_FEATURES : IMAGE_FEATURES;
  const heading = "Everything you need, nothing you don't";
  const description = "A browser-native toolset built for speed, privacy, and results — not a bloated suite.";

  return (
    <section id="features" className="px-6 pb-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-300 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-pulse" />
            {isVideo ? "Video Toolkit" : "Image Toolkit"}
          </span>
          <h2 className={`${sora.className} mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl`}>{heading}</h2>
          <p className="mt-3 text-neutral-400">{description}</p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map(({ title, description: featureDescription, Icon }) => (
              <div
                key={title}
                className="group relative overflow-hidden rounded-2xl border border-neutral-800 bg-white/[0.03] p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-neutral-600 hover:bg-white/[0.06] hover:shadow-xl hover:shadow-black/20"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/[0.04] opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                />
                <div className="relative flex h-full flex-col">
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white shadow-lg shadow-black/20 transition-colors duration-300 group-hover:bg-white group-hover:text-black">
                    <Icon size={20} />
                  </span>
                  <h3 className="text-lg font-semibold text-white">{title}</h3>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-400">{featureDescription}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
