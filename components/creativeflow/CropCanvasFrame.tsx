"use client";

import { useCanvasEngine } from "@/context/CanvasEngineContext";
import { toScreen } from "@/lib/canvasEngine/geometry";

const ACCENT = "#F8FAFC";
const HANDLE_ARM = 18;
const HANDLE_THICKNESS = 3;
const EDGE_HANDLE_LENGTH = 22;
const EDGE_HANDLE_THICKNESS = 5;
const MASK_FILL = "rgba(0, 0, 0, 0.65)";

const CORNER_UNITS: Record<"tl" | "tr" | "bl" | "br", { ux: -1 | 1; uy: -1 | 1 }> = {
  tl: { ux: -1, uy: -1 },
  tr: { ux: 1, uy: -1 },
  bl: { ux: -1, uy: 1 },
  br: { ux: 1, uy: 1 },
};

/**
 * Purely visual in-canvas crop chrome — dim mask, thirds guides, white L-corner + side handles.
 * All actual hit-testing and dragging happens in `useCanvasWorkspaceController` (mirroring how
 * `SelectionOverlay` never owns pointer logic either — the container's single pointer handler
 * does). There's no in-canvas confirm pill — Enter applies, Escape cancels, and clicking
 * anywhere outside the canvas auto-applies (see the global crop effects in CanvasEngineContext).
 */
export default function CropCanvasFrame() {
  const { cropRect, documentSize, viewport, showGrid } = useCanvasEngine();

  if (!cropRect) return null;

  const topLeft = toScreen({ x: cropRect.x, y: cropRect.y }, viewport);
  const width = cropRect.width * viewport.zoom;
  const height = cropRect.height * viewport.zoom;
  const left = topLeft.x;
  const top = topLeft.y;
  const right = left + width;
  const bottom = top + height;
  // The mask covers this SVG's own box, which matches the board container's
  // actual size (documentSize * zoom), not the unscaled document size.
  const canvasWidth = documentSize.width * viewport.zoom;
  const canvasHeight = documentSize.height * viewport.zoom;

  // Clipped to the canvas box (unlike SelectionOverlay/ContextToolbar, which
  // intentionally float outside it) — at zoom > 100% the crop rect's
  // screen-space coordinates run well past the fixed-size container on every
  // side, and without clipping the mask/grid/handles bled out over the
  // toolbar and sidebar instead of stopping at the photo's own edge.
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden" style={{ zIndex: 2 }}>
      <rect x={0} y={0} width={canvasWidth} height={Math.max(0, top)} fill={MASK_FILL} />
      <rect x={0} y={bottom} width={canvasWidth} height={Math.max(0, canvasHeight - bottom)} fill={MASK_FILL} />
      <rect x={0} y={top} width={Math.max(0, left)} height={height} fill={MASK_FILL} />
      <rect x={right} y={top} width={Math.max(0, canvasWidth - right)} height={height} fill={MASK_FILL} />

      {showGrid && (
        <g stroke="rgba(248, 250, 252, 0.55)" strokeWidth={1}>
          <line x1={left + width / 3} y1={top} x2={left + width / 3} y2={bottom} />
          <line x1={left + (width * 2) / 3} y1={top} x2={left + (width * 2) / 3} y2={bottom} />
          <line x1={left} y1={top + height / 3} x2={right} y2={top + height / 3} />
          <line x1={left} y1={top + (height * 2) / 3} x2={right} y2={top + (height * 2) / 3} />
        </g>
      )}

      <rect x={left} y={top} width={width} height={height} fill="none" stroke={ACCENT} strokeWidth={2} />

      {(["mt", "mb", "ml", "mr"] as const).map((handle) => {
        const horizontal = handle === "mt" || handle === "mb";
        const cx = handle === "ml" ? left : handle === "mr" ? right : left + width / 2;
        const cy = handle === "mt" ? top : handle === "mb" ? bottom : top + height / 2;
        const w = horizontal ? EDGE_HANDLE_LENGTH : EDGE_HANDLE_THICKNESS;
        const h = horizontal ? EDGE_HANDLE_THICKNESS : EDGE_HANDLE_LENGTH;
        return <rect key={handle} x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={1.5} fill="#FFFFFF" />;
      })}

      {(Object.keys(CORNER_UNITS) as (keyof typeof CORNER_UNITS)[]).map((handle) => {
        const { ux, uy } = CORNER_UNITS[handle];
        const cx = ux < 0 ? left : right;
        const cy = uy < 0 ? top : bottom;
        return (
          <g key={handle}>
            <rect
              x={ux > 0 ? cx - HANDLE_ARM : cx}
              y={cy - HANDLE_THICKNESS / 2}
              width={HANDLE_ARM}
              height={HANDLE_THICKNESS}
              fill="#FFFFFF"
            />
            <rect
              x={cx - HANDLE_THICKNESS / 2}
              y={uy > 0 ? cy - HANDLE_ARM : cy}
              width={HANDLE_THICKNESS}
              height={HANDLE_ARM}
              fill="#FFFFFF"
            />
          </g>
        );
      })}
    </svg>
  );
}
