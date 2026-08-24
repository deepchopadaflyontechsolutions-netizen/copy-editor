"use client";

import { Check, X } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import { toScreen } from "@/lib/canvasEngine/geometry";

const ACCENT = "#6366F1";
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
 * Purely visual in-canvas crop chrome — dim mask, thirds guides, white L-corner + side handles,
 * and a small above-box Cancel/Apply pill. All actual hit-testing and dragging happens in
 * `useCanvasWorkspaceController` (mirroring how `SelectionOverlay` never owns pointer logic
 * either — the container's single pointer handler does).
 */
export default function CropCanvasFrame() {
  const { cropRect, documentSize, viewport, showGrid, applyCrop, cancelCropMode } = useCanvasEngine();

  if (!cropRect) return null;

  const topLeft = toScreen({ x: cropRect.x, y: cropRect.y }, viewport);
  const width = cropRect.width * viewport.zoom;
  const height = cropRect.height * viewport.zoom;
  const left = topLeft.x;
  const top = topLeft.y;
  const right = left + width;
  const bottom = top + height;
  const canvasWidth = documentSize.width;
  const canvasHeight = documentSize.height;

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" style={{ zIndex: 2 }}>
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

      <foreignObject x={left + width / 2 - 44} y={Math.max(4, top - 44)} width={88} height={36} style={{ overflow: "visible" }}>
        <div
          className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-900/90 p-1 shadow-lg shadow-black/30 backdrop-blur-md"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            aria-label="Cancel crop"
            title="Cancel (Esc)"
            onClick={cancelCropMode}
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <X size={14} />
          </button>
          <button
            type="button"
            aria-label="Apply crop"
            title="Apply (Enter)"
            onClick={applyCrop}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white transition-colors hover:bg-indigo-500"
          >
            <Check size={14} />
          </button>
        </div>
      </foreignObject>
    </svg>
  );
}
