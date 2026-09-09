"use client";

import { useCanvasEngine } from "@/context/CanvasEngineContext";

// Just the live width×height readout pinned near the crop handle — cropping
// is driven entirely from the canvas now (drag handles, Enter/Escape, click
// away), with no sidebar panel duplicating this readout.
export default function CropOverlay() {
  const { cropBadgeRect, cropPixelSize, documentSize, viewport } = useCanvasEngine();
  if (!cropBadgeRect || cropPixelSize.width <= 0 || cropPixelSize.height <= 0) return null;

  const top = Math.max(8, cropBadgeRect.top - 30);
  // Clamped to the board's own box (documentSize * zoom, since that's the
  // container this readout is absolutely positioned within) — at zoom > 100%
  // cropBadgeRect.left can land well outside that range (same root cause as
  // the crop frame's grid/handles bleeding over the toolbar/sidebar), which
  // would otherwise carry this readout off the photo entirely.
  const boardWidth = documentSize.width * viewport.zoom;
  const left = Math.min(Math.max(8, cropBadgeRect.left), Math.max(8, boardWidth - 8));

  return (
    <div
      className="pointer-events-none absolute z-3 whitespace-nowrap rounded-md border border-white/25 bg-neutral-950/85 px-2 py-1"
      style={{ left, top }}
    >
      <span className="text-[11px] font-bold tabular-nums text-neutral-100">
        {cropPixelSize.width} × {cropPixelSize.height} px
      </span>
    </div>
  );
}
