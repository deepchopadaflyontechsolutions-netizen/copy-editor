"use client";

import { getHandleScreenPosition, getRotatedCorners } from "@/lib/canvasEngine/geometry";
import { GUIDE_COLOR } from "@/lib/canvasEngine/snapping";
import type { EngineLayer, HandleId, SnapGuide, Viewport } from "@/lib/canvasEngine/types";
import { toScreen } from "@/lib/canvasEngine/geometry";

const ACCENT = "#F8FAFC";
const OUT_OF_BOUNDS_COLOR = "#F59E0B";

const CORNER_HANDLES: HandleId[] = ["tl", "tr", "br", "bl"];
const EDGE_HANDLES: HandleId[] = ["mt", "mb", "ml", "mr"];

interface SelectionOverlayProps {
  activeLayer: EngineLayer | null;
  viewport: Viewport;
  guides: SnapGuide[];
  isOutOfBounds: boolean;
  autoCleanEllipse: { cx: number; cy: number; rx: number; ry: number } | null;
}

export default function SelectionOverlay({ activeLayer, viewport, guides, isOutOfBounds, autoCleanEllipse }: SelectionOverlayProps) {
  return (
    // overflow-visible (not -hidden): once a resize is a crop rather than a
    // fit (see `resizeDocument`), a layer's real bounds routinely extend past
    // the document frame — clipping this SVG at the frame edge would hide
    // exactly the part the user most needs to see: how much of the image the
    // page is currently cropping.
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" style={{ zIndex: 2 }}>
      {guides.map((guide, index) => {
        const start = guide.axis === "v" ? toScreen({ x: guide.position, y: guide.start }, viewport) : toScreen({ x: guide.start, y: guide.position }, viewport);
        const end = guide.axis === "v" ? toScreen({ x: guide.position, y: guide.end }, viewport) : toScreen({ x: guide.end, y: guide.position }, viewport);
        return (
          <line
            key={index}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke={GUIDE_COLOR}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            style={{ filter: "drop-shadow(0 0 1.5px rgba(0,0,0,0.85))" }}
          />
        );
      })}

      {autoCleanEllipse && (
        <ellipse
          cx={toScreen({ x: autoCleanEllipse.cx, y: autoCleanEllipse.cy }, viewport).x}
          cy={toScreen({ x: autoCleanEllipse.cx, y: autoCleanEllipse.cy }, viewport).y}
          rx={autoCleanEllipse.rx * viewport.zoom}
          ry={autoCleanEllipse.ry * viewport.zoom}
          fill="rgba(59, 130, 246, 0.18)"
          stroke="#3B82F6"
          strokeDasharray="6 4"
          strokeWidth={2}
        />
      )}

      {activeLayer &&
        (() => {
          const corners = getRotatedCorners(activeLayer.transform).map((c) => toScreen(c, viewport));
          const points = corners.map((c) => `${c.x},${c.y}`).join(" ");
          const boxColor = isOutOfBounds ? OUT_OF_BOUNDS_COLOR : ACCENT;
          const rotateHandlePos = getHandleScreenPosition(activeLayer.transform, "rotate", viewport);
          const bottomMidRotated = getHandleScreenPosition(activeLayer.transform, "mb", viewport);

          return (
            <g>
              <polygon points={points} fill="none" stroke={boxColor} strokeWidth={2} />

              <line
                x1={bottomMidRotated.x}
                y1={bottomMidRotated.y}
                x2={rotateHandlePos.x}
                y2={rotateHandlePos.y}
                stroke={ACCENT}
                strokeWidth={1.5}
              />

              {EDGE_HANDLES.map((handle) => {
                const pos = getHandleScreenPosition(activeLayer.transform, handle, viewport);
                const isHorizontalEdge = handle === "mt" || handle === "mb";
                const w = isHorizontalEdge ? 16 : 8;
                const h = isHorizontalEdge ? 8 : 16;
                return (
                  <rect
                    key={handle}
                    x={pos.x - w / 2}
                    y={pos.y - h / 2}
                    width={w}
                    height={h}
                    rx={3}
                    transform={`rotate(${activeLayer.transform.rotation} ${pos.x} ${pos.y})`}
                    fill="#FFFFFF"
                    stroke={ACCENT}
                    strokeWidth={1.5}
                  />
                );
              })}

              {CORNER_HANDLES.map((handle) => {
                const pos = getHandleScreenPosition(activeLayer.transform, handle, viewport);
                return <circle key={handle} cx={pos.x} cy={pos.y} r={6} fill="#FFFFFF" stroke={ACCENT} strokeWidth={1.5} />;
              })}

              <circle cx={rotateHandlePos.x} cy={rotateHandlePos.y} r={9} fill="#FFFFFF" stroke={ACCENT} strokeWidth={1.5} />
              <text x={rotateHandlePos.x} y={rotateHandlePos.y + 4} textAnchor="middle" fontSize={11} fill={ACCENT}>
                ↺
              </text>
            </g>
          );
        })()}
    </svg>
  );
}
