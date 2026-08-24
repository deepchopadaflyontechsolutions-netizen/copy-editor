"use client";

import { useCanvasEngine } from "@/context/CanvasEngineContext";

// Just the live width×height readout pinned near the crop handle — every
// other crop control (ratio presets, dimension fields, aspect lock,
// cancel/apply) now lives solely in the Crop drawer (CropPanel) and the
// small confirm pill CropCanvasFrame anchors above the selection, so this
// no longer duplicates either.
export default function CropOverlay() {
  const { cropBadgeRect, cropPixelSize } = useCanvasEngine();
  if (!cropBadgeRect || cropPixelSize.width <= 0 || cropPixelSize.height <= 0) return null;

  const top = Math.max(8, cropBadgeRect.top - 30);

  return (
    <div
      className="pointer-events-none absolute z-3 whitespace-nowrap rounded-md border border-indigo-500 bg-slate-950/85 px-2 py-1"
      style={{ left: cropBadgeRect.left, top }}
    >
      <span className="font-mono text-[11px] font-bold tabular-nums text-slate-100">
        {cropPixelSize.width} × {cropPixelSize.height} px
      </span>
    </div>
  );
}
