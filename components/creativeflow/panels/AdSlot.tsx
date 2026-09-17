"use client";

import { Megaphone } from "lucide-react";

/** Square placeholder ad unit — reserved layout space, no ad network wired up yet. Styled after
 * ImagesPanel's own (non-square, per-panel) ad block, but pulled out as a shared component and
 * rendered once by the panel-drawer shell (see VideoToolDock) so every panel gets the same slot
 * pinned to the bottom of the sidebar without each one embedding its own copy. */
export default function AdSlot() {
  return (
    <div className="group relative aspect-square w-full shrink-0 overflow-hidden rounded-2xl border border-neutral-800/80 bg-gradient-to-b from-neutral-900/95 to-[#0a0a0a] text-neutral-600 shadow-[0_-8px_16px_-8px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-colors hover:border-neutral-700">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(148,163,184,0.9) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />
      <div className="relative flex h-full w-full flex-col items-center justify-center gap-1.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-800/70 text-neutral-500 ring-1 ring-inset ring-neutral-700/60 transition-colors group-hover:text-white">
          <Megaphone size={16} />
        </span>
        <span className="flex items-center gap-1.5">
          <span className="rounded-sm bg-neutral-800/80 px-1 py-px text-[9px] font-bold tracking-wide text-neutral-500 ring-1 ring-inset ring-neutral-700/60">
            AD
          </span>
          <span className="text-[11px] font-semibold tracking-wide text-neutral-400">Advertisement</span>
        </span>
        <span className="text-[10px] tracking-wide text-neutral-600">300 × 300</span>
      </div>
    </div>
  );
}
