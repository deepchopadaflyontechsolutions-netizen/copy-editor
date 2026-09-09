"use client";

import { CURSOR_BY_HANDLE, getHandleScreenPosition } from "@/lib/canvasEngine/geometry";
import type { EngineLayer, HandleId, Viewport } from "@/lib/canvasEngine/types";

const ALL_HANDLES: HandleId[] = ["tl", "tr", "br", "bl", "mt", "mb", "ml", "mr", "rotate"];

// Matches geometry.ts's own HANDLE_HIT_RADIUS (14px) used for the in-bounds
// hit test, so a handle behaves identically whether it's reached by this
// hotspot or by the page container's own pointer math.
const HOTSPOT_SIZE = 28;

interface LayerHandleHotspotsProps {
  activeLayer: EngineLayer;
  viewport: Viewport;
  onHandlePointerDown: (handle: HandleId, event: React.PointerEvent<HTMLDivElement>) => void;
}

/**
 * Real, individually-positioned pointer targets laid over each resize/rotate
 * handle SelectionOverlay draws (that SVG is pointer-events-none and purely
 * visual). The active layer's box can extend past the page — once it does,
 * a handle can sit outside the page container's own DOM box, and since that
 * container's pointer handlers only ever see events landing inside its own
 * box, a handle out there was previously unreachable: no hover cursor, no
 * way to grab it. Each hotspot is its own element at the handle's exact
 * screen coordinate (which can be negative or beyond the page's box) and
 * stays interactive there because its own box, not the container's, is what
 * gets hit-tested.
 */
export default function LayerHandleHotspots({ activeLayer, viewport, onHandlePointerDown }: LayerHandleHotspotsProps) {
  if (activeLayer.locked) return null;

  return (
    <>
      {ALL_HANDLES.map((handle) => {
        const pos = getHandleScreenPosition(activeLayer.transform, handle, viewport);
        return (
          <div
            key={handle}
            onPointerDown={(event) => {
              // Stop here so the page container's own pointerdown handler
              // (which does its own, now-redundant handle hit test) never
              // also runs for the same gesture.
              event.stopPropagation();
              onHandlePointerDown(handle, event);
            }}
            style={{
              position: "absolute",
              left: pos.x - HOTSPOT_SIZE / 2,
              top: pos.y - HOTSPOT_SIZE / 2,
              width: HOTSPOT_SIZE,
              height: HOTSPOT_SIZE,
              cursor: CURSOR_BY_HANDLE[handle],
              touchAction: "none",
              zIndex: 3,
            }}
          />
        );
      })}
    </>
  );
}
