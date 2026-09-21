"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

/** Medium Rectangle (300×250) Google AdSense unit, always in test mode (`data-ad-test="on"`). */
export default function SidebarAd({ adSlot }: { adSlot?: string }) {
  const adRef = useRef<HTMLModElement>(null);

  const pushed = useRef(false);

  useEffect(() => {
    // Strict Mode runs effects twice in dev, and the script only sets data-adsbygoogle-status
    // after it loads asynchronously, so an attribute check isn't enough. A second push for the
    // same <ins> throws "All 'ins' elements ... already have ads in them". Refs survive the
    // simulated remount, so this flag blocks the duplicate.
    if (pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error("AdSense script error:", err);
    }
  }, []);

  return (
    <div className="relative mx-auto h-[250px] w-[300px] max-w-full shrink-0 overflow-hidden rounded-xl border border-[#1E293B] bg-[#090D16]">
      {/* Fallback behind the ad. Google sets display:none on unfilled units, which reveals this;
          a filled ad renders on top of it. */}
      <div
        aria-hidden
        className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-neutral-600"
      >
        <span className="flex items-center gap-1.5">
          <span className="rounded-sm bg-neutral-800/80 px-1 py-px text-[9px] font-bold tracking-wide text-neutral-500 ring-1 ring-inset ring-neutral-700/60">
            AD
          </span>
          <span className="text-[11px] font-semibold tracking-wide text-neutral-400">
            Advertisement
          </span>
        </span>
        <span className="text-[10px] tracking-wide text-neutral-600">
          300 × 250
        </span>
      </div>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{
          display: "inline-block",
          width: "300px",
          height: "250px",
          position: "relative",
        }}
        data-ad-client={
          process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID ||
          "ca-pub-1985890330605429"
        }
        data-ad-slot={
          adSlot || process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID || "2450680699"
        }
        data-adtest="on"
      />
    </div>
  );
}
