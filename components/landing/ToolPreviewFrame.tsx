"use client";

import Image from "next/image";
import type { LucideIcon } from "lucide-react";

interface PreviewBadge {
  Icon: LucideIcon;
  label: string;
}

/** A single framed media shot (image or looping video) with floating glass "chip" badges that
 * call out the controls a feature exposes — used by the spotlight sections in place of a
 * before/after removal slider, since these tools (markup, crop, timeline, audio) don't have a
 * "before/after" state to compare, just a canvas with controls applied to it. */
export default function ToolPreviewFrame({
  mediaSrc,
  mediaAlt,
  mediaKind = "image",
  aspectClassName = "aspect-[4/3]",
  badges,
}: {
  mediaSrc: string;
  mediaAlt: string;
  mediaKind?: "image" | "video";
  aspectClassName?: string;
  badges: PreviewBadge[];
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-xl shadow-black/40">
      <div className={`relative w-full overflow-hidden bg-neutral-900 ${aspectClassName}`}>
        {mediaKind === "video" ? (
          <video
            src={mediaSrc}
            aria-label={mediaAlt}
            autoPlay
            muted
            loop
            playsInline
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <Image
            src={mediaSrc}
            alt={mediaAlt}
            fill
            sizes="(min-width: 1024px) 560px, 100vw"
            className="pointer-events-none object-cover"
            priority
          />
        )}

        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />

        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap gap-2 sm:inset-x-4 sm:bottom-4">
          {badges.map(({ Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-100 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
            >
              <Icon size={13} strokeWidth={2.25} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
