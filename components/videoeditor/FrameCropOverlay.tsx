"use client";

import { useCallback, useMemo, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { useVideoEditor, ASPECT_RATIO_VALUES, MIN_CROP_FRACTION, type CanvasAspectRatio, type CropRect } from "@/context/VideoEditorContext";

type Handle = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

const HANDLES: { id: Handle; top: string; left: string; cursor: string }[] = [
  { id: "nw", top: "0%", left: "0%", cursor: "nwse-resize" },
  { id: "n", top: "0%", left: "50%", cursor: "ns-resize" },
  { id: "ne", top: "0%", left: "100%", cursor: "nesw-resize" },
  { id: "e", top: "50%", left: "100%", cursor: "ew-resize" },
  { id: "se", top: "100%", left: "100%", cursor: "nwse-resize" },
  { id: "s", top: "100%", left: "50%", cursor: "ns-resize" },
  { id: "sw", top: "100%", left: "0%", cursor: "nesw-resize" },
  { id: "w", top: "50%", left: "0%", cursor: "ew-resize" },
];

const FULL_RECT: CropRect = { x: 0, y: 0, width: 1, height: 1 };

export function clampRect(rect: CropRect): CropRect {
  const width = Math.min(1, Math.max(MIN_CROP_FRACTION, rect.width));
  const height = Math.min(1, Math.max(MIN_CROP_FRACTION, rect.height));
  const x = Math.min(Math.max(0, rect.x), 1 - width);
  const y = Math.min(Math.max(0, rect.y), 1 - height);
  return { x, y, width, height };
}

function moveRect(start: CropRect, dxFrac: number, dyFrac: number): CropRect {
  const x = Math.min(Math.max(0, start.x + dxFrac), 1 - start.width);
  const y = Math.min(Math.max(0, start.y + dyFrac), 1 - start.height);
  return { ...start, x, y };
}

// Corner handles keep the *opposite* corner anchored and derive height from the dragged width
// when aspect-locked; edge handles instead grow/shrink the perpendicular dimension symmetrically
// about the box's own center — same math the old CropModal used.
function resizeRect(start: CropRect, handle: Handle, dxFrac: number, dyFrac: number, ratio: number | null): CropRect {
  let { x, y, width, height } = start;
  const right = x + width;
  const bottom = y + height;

  if (handle.includes("e")) width = width + dxFrac;
  if (handle.includes("w")) {
    const newX = x + dxFrac;
    width = right - newX;
    x = newX;
  }
  if (handle.includes("s")) height = height + dyFrac;
  if (handle.includes("n")) {
    const newY = y + dyFrac;
    height = bottom - newY;
    y = newY;
  }

  width = Math.max(MIN_CROP_FRACTION, width);
  height = Math.max(MIN_CROP_FRACTION, height);

  if (ratio) {
    const isCorner = handle.length === 2;
    if (isCorner) {
      const newHeight = width / ratio;
      if (handle[0] === "n") y = bottom - newHeight;
      height = newHeight;
    } else if (handle === "e" || handle === "w") {
      const centerY = y + height / 2;
      height = width / ratio;
      y = centerY - height / 2;
    } else {
      const centerX = x + width / 2;
      width = height * ratio;
      x = centerX - width / 2;
    }
  }

  return clampRect({ x, y, width, height });
}

/** Given the clip's *current* crop (or the full frame) and a newly-picked canvas aspect ratio,
 * returns the *largest* crop of that ratio that still fits inside the source frame ("cover" the
 * source, not shrink to fit some earlier crop), centered on wherever the previous crop was
 * centered. The actual pixel ratio is computed from the source's native width/height, since
 * `CropRect.width`/`height` are independent fractions of each (not a corrected aspect) on their
 * own. Always sizes up from the full frame (rather than the previous crop's own width) — anchoring
 * to `prev.width` there would compound: picking 1:1 then 9:16 then 1:1 again used to shrink a
 * little more each time instead of re-maximizing for the new ratio. Exported so FramePanel's
 * aspect-ratio buttons can commit this directly instead of routing it through an effect here. */
export function cropRectForAspectRatio(
  current: CropRect | undefined,
  targetRatio: CanvasAspectRatio,
  nativeSize: { w: number; h: number },
): CropRect | null {
  if (targetRatio === "original" || nativeSize.w <= 0 || nativeSize.h <= 0) return null;
  const displayRatio = ASPECT_RATIO_VALUES[targetRatio];
  // Fractional ratio needed so that (width * nativeW) / (height * nativeH) === displayRatio.
  const fractionRatio = (displayRatio * nativeSize.h) / nativeSize.w;
  const prev = current ?? FULL_RECT;
  const centerX = prev.x + prev.width / 2;
  const centerY = prev.y + prev.height / 2;
  // Start from the full frame's own width/height (not `prev`'s) so every ratio pick re-maximizes
  // independently of whatever crop was active before it.
  let width = FULL_RECT.width;
  let height = width / fractionRatio;
  if (height > FULL_RECT.height) {
    height = FULL_RECT.height;
    width = height * fractionRatio;
  }
  return clampRect({ x: centerX - width / 2, y: centerY - height / 2, width, height });
}

interface DragState {
  mode: Handle | "move";
  startClientX: number;
  startClientY: number;
  startRect: CropRect;
  containedRect: { w: number; h: number };
}

function subscribeToResize(el: Element | null, onResize: () => void): () => void {
  if (!el) return () => {};
  const observer = new ResizeObserver(onResize);
  observer.observe(el);
  return () => observer.disconnect();
}

/** Inline replacement for the old Crop modal: a draggable, 8-handle box laid directly over the
 * live preview (mounted by VideoWorkspace only while the Frame panel is open, showing the video
 * at `object-contain` with rotation suppressed — see the caller). Everything here is tracked as
 * normalized 0-1 fractions of the source's native, pre-rotation frame, exactly what
 * `Clip.cropRect` expects. There's no separate "Apply" step — dragging commits straight to
 * `setClipCrop` on release; picking an aspect ratio (handled by FramePanel via
 * `cropRectForAspectRatio` above, not here) reshapes the same `cropRect` this component just
 * renders, so a ratio pick and a drag both flow through the exact same piece of state. Outside an
 * active drag this deliberately renders `currentClip.cropRect` directly rather than mirroring it
 * into local state, so it can't drift from — or fight — whatever FramePanel just committed. */
export default function FrameCropOverlay({ frameBoxRef }: { frameBoxRef: RefObject<HTMLDivElement | null> }) {
  const { currentClip, canvasAspectRatio, setClipCrop, videoRef } = useVideoEditor();
  const dragRef = useRef<DragState | null>(null);
  // Non-null only for the duration of an active drag gesture — see the class doc above for why
  // the idle (non-dragging) rect is read straight from `currentClip.cropRect` instead.
  const [dragRect, setDragRect] = useState<CropRect | null>(null);

  const boxSize = useSyncExternalStore(
    useCallback((onChange) => subscribeToResize(frameBoxRef.current, onChange), [frameBoxRef]),
    useCallback(() => {
      const box = frameBoxRef.current;
      return box ? `${box.clientWidth}x${box.clientHeight}` : "0x0";
    }, [frameBoxRef]),
  );
  const [boxW, boxH] = boxSize.split("x").map(Number);

  const videoSize = useSyncExternalStore(
    useCallback(
      (onChange) => {
        const el = videoRef.current;
        if (!el) return () => {};
        el.addEventListener("loadedmetadata", onChange);
        return () => el.removeEventListener("loadedmetadata", onChange);
      },
      [videoRef],
    ),
    useCallback(() => {
      const el = videoRef.current;
      return el ? `${el.videoWidth}x${el.videoHeight}` : "0x0";
    }, [videoRef]),
  );
  const [videoW, videoH] = videoSize.split("x").map(Number);

  // The video is shown at object-contain inside `frameBoxRef` while this overlay is mounted, so
  // its actually-visible pixels are letterboxed to this sub-rect of the box — every drag/handle
  // position is expressed relative to this rect, not the box itself, so the crop box lines up
  // with the real image underneath it.
  const containedRect = useMemo(() => {
    if (!boxW || !boxH || !videoW || !videoH) return null;
    const scale = Math.min(boxW / videoW, boxH / videoH);
    const w = videoW * scale;
    const h = videoH * scale;
    return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h };
  }, [boxW, boxH, videoW, videoH]);

  const rect = dragRect ?? currentClip?.cropRect ?? FULL_RECT;
  // While a ratio preset is active, resizing keeps the box's own current shape (set up correctly
  // by FramePanel's cropRectForAspectRatio whenever the preset changes) rather than distorting
  // it — "original" allows a free-form resize instead.
  const ratio = canvasAspectRatio === "original" ? null : rect.width / rect.height;

  const handlePointerDown = useCallback(
    (mode: Handle | "move") => (event: ReactPointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      event.preventDefault();
      if (!containedRect) return;
      dragRef.current = {
        mode,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startRect: rect,
        containedRect: { w: containedRect.w, h: containedRect.h },
      };
      setDragRect(rect);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [containedRect, rect],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const state = dragRef.current;
      if (!state || state.containedRect.w <= 0 || state.containedRect.h <= 0) return;
      const dxFrac = (event.clientX - state.startClientX) / state.containedRect.w;
      const dyFrac = (event.clientY - state.startClientY) / state.containedRect.h;
      setDragRect(
        state.mode === "move" ? moveRect(state.startRect, dxFrac, dyFrac) : resizeRect(state.startRect, state.mode, dxFrac, dyFrac, ratio),
      );
    },
    [ratio],
  );

  // Commits once per gesture (not per pointermove tick) — matching how every other drag-driven
  // edit in this app (Timeline's trim handles, its playhead) collapses into a single undo step.
  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.currentTarget.releasePointerCapture(event.pointerId);
      const state = dragRef.current;
      dragRef.current = null;
      if (currentClip && state) setClipCrop(currentClip.id, dragRect ?? state.startRect);
      setDragRect(null);
    },
    [currentClip, dragRect, setClipCrop],
  );

  if (!currentClip || !containedRect) return null;

  return (
    <div className="absolute inset-0 z-30">
      <div
        role="group"
        aria-label="Crop selection"
        className="absolute cursor-move touch-none border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]"
        style={{
          left: containedRect.x + rect.x * containedRect.w,
          top: containedRect.y + rect.y * containedRect.h,
          width: rect.width * containedRect.w,
          height: rect.height * containedRect.h,
        }}
        onPointerDown={handlePointerDown("move")}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {HANDLES.map((handle) => (
          <div
            key={handle.id}
            onPointerDown={handlePointerDown(handle.id)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            aria-label={`Resize crop from the ${handle.id}`}
            className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border border-black/40 bg-white shadow"
            style={{ top: handle.top, left: handle.left, cursor: handle.cursor }}
          />
        ))}
      </div>
    </div>
  );
}
