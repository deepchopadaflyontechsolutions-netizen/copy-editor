"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { Control, Line, Rect, controlsUtils } from "fabric";
import type { Canvas, FabricObject, TransformActionHandler } from "fabric";

// Crop-box math lives entirely in canvas/object space (the same coordinate
// system as obj.left/top/width/height), which is zoom-independent in Fabric —
// so none of this needs to know about the workspace's current zoom level.
// Only the on-screen dimension badge (an HTML overlay, not a Fabric object)
// needs a screen-space conversion, done once per paint via the viewport
// transform.

export type CropPresetKey = "free" | "1:1" | "16:9" | "4:3" | "9:16";

export const CROP_PRESETS: { key: CropPresetKey; label: string; ratio: number | null }[] = [
  { key: "free", label: "Freeform", ratio: null },
  { key: "1:1", label: "Square", ratio: 1 },
  { key: "16:9", label: "Landscape", ratio: 16 / 9 },
  { key: "4:3", label: "Standard", ratio: 4 / 3 },
  { key: "9:16", label: "Story", ratio: 9 / 16 },
];

export interface CropPixelSize {
  width: number;
  height: number;
}

export interface CropScreenRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CropCommitResult {
  cropX: number;
  cropY: number;
  width: number;
  height: number;
  left: number;
  top: number;
}

interface Bounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

type CropTargetImage = FabricObject & { cropX?: number; cropY?: number };

interface CropSession {
  canvas: Canvas;
  obj: CropTargetImage;
  rect: Rect;
  bounds: Bounds;
  panels: Rect[];
  gridLines: Line[];
  updateChrome: () => void;
  computeAndSetState: () => void;
}

interface UseCanvasCropOptions {
  canvas: Canvas | null;
  active: boolean;
  targetImage: CropTargetImage | null | undefined;
}

export interface UseCanvasCropResult {
  pixelSize: CropPixelSize;
  aspectLocked: boolean;
  setAspectLocked: (locked: boolean) => void;
  preset: CropPresetKey;
  applyPreset: (preset: CropPresetKey) => void;
  setWidthPx: (nativeWidth: number) => void;
  setHeightPx: (nativeHeight: number) => void;
  badgeRect: CropScreenRect | null;
  commit: () => CropCommitResult | null;
}

const MIN_CROP_SIZE = 24;
const CROP_SNAP_THRESHOLD = 8;
const ACCENT = "#38BDF8";

type HandleKey = "tl" | "tr" | "bl" | "br" | "ml" | "mr" | "mt" | "mb";

const HANDLE_LAYOUT: Record<HandleKey, { x: number; y: number; cursor: string }> = {
  tl: { x: -0.5, y: -0.5, cursor: "nwse-resize" },
  tr: { x: 0.5, y: -0.5, cursor: "nesw-resize" },
  bl: { x: -0.5, y: 0.5, cursor: "nesw-resize" },
  br: { x: 0.5, y: 0.5, cursor: "nwse-resize" },
  ml: { x: -0.5, y: 0, cursor: "ew-resize" },
  mr: { x: 0.5, y: 0, cursor: "ew-resize" },
  mt: { x: 0, y: -0.5, cursor: "ns-resize" },
  mb: { x: 0, y: 0.5, cursor: "ns-resize" },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

// Every handle computes the box's new edges directly (left/top/width/height)
// from the live pointer position and clamps/locks them inline, then commits
// them in one `target.set(...)`. Nothing downstream re-touches the box mid
// gesture — that separation is what previously caused the stutter: an
// `object:scaling` listener was rewriting scaleX/scaleY *after* Fabric's own
// interactive transform had already computed a different value from the same
// pointer move, so the two kept fighting each other one frame apart.
function buildResizeHandler(
  handle: HandleKey,
  boundsRef: RefObject<Bounds | null>,
  aspectLockedRef: RefObject<boolean>,
  aspectRatioRef: RefObject<number>,
): TransformActionHandler {
  const affectsLeft = handle === "tl" || handle === "bl" || handle === "ml";
  const affectsRight = handle === "tr" || handle === "br" || handle === "mr";
  const affectsTop = handle === "tl" || handle === "tr" || handle === "mt";
  const affectsBottom = handle === "bl" || handle === "br" || handle === "mb";

  return (_eventData, transform, x, y) => {
    const bounds = boundsRef.current;
    if (!bounds) return false;
    const { target } = transform;

    const startLeft = transform.original.left ?? 0;
    const startTop = transform.original.top ?? 0;
    const startWidth = transform.width ?? 0;
    const startHeight = transform.height ?? 0;
    const startRight = startLeft + startWidth;
    const startBottom = startTop + startHeight;

    const px = clamp(x, bounds.left, bounds.left + bounds.width);
    const py = clamp(y, bounds.top, bounds.top + bounds.height);

    let left = startLeft;
    let top = startTop;
    let right = startRight;
    let bottom = startBottom;

    if (affectsLeft) left = clamp(px, bounds.left, right - MIN_CROP_SIZE);
    if (affectsRight) right = clamp(px, left + MIN_CROP_SIZE, bounds.left + bounds.width);
    if (affectsTop) top = clamp(py, bounds.top, bottom - MIN_CROP_SIZE);
    if (affectsBottom) bottom = clamp(py, top + MIN_CROP_SIZE, bounds.top + bounds.height);

    if (aspectLockedRef.current) {
      const ratio = aspectRatioRef.current > 0 ? aspectRatioRef.current : (right - left) / (bottom - top);

      if (handle === "ml" || handle === "mr") {
        const anchorX = handle === "ml" ? startRight : startLeft;
        const maxWidth = handle === "ml" ? anchorX - bounds.left : bounds.left + bounds.width - anchorX;
        let width = clamp(Math.abs(px - anchorX), MIN_CROP_SIZE, Math.max(MIN_CROP_SIZE, maxWidth));
        let height = width / ratio;
        const centerY = (startTop + startBottom) / 2;
        const maxHeight = 2 * Math.min(centerY - bounds.top, bounds.top + bounds.height - centerY);
        if (height > maxHeight) {
          height = Math.max(MIN_CROP_SIZE, maxHeight);
          width = height * ratio;
        }
        left = handle === "ml" ? anchorX - width : anchorX;
        right = left + width;
        top = centerY - height / 2;
        bottom = centerY + height / 2;
      } else if (handle === "mt" || handle === "mb") {
        const anchorY = handle === "mt" ? startBottom : startTop;
        const maxHeight = handle === "mt" ? anchorY - bounds.top : bounds.top + bounds.height - anchorY;
        let height = clamp(Math.abs(py - anchorY), MIN_CROP_SIZE, Math.max(MIN_CROP_SIZE, maxHeight));
        let width = height * ratio;
        const centerX = (startLeft + startRight) / 2;
        const maxWidth = 2 * Math.min(centerX - bounds.left, bounds.left + bounds.width - centerX);
        if (width > maxWidth) {
          width = Math.max(MIN_CROP_SIZE, maxWidth);
          height = width / ratio;
        }
        top = handle === "mt" ? anchorY - height : anchorY;
        bottom = top + height;
        left = centerX - width / 2;
        right = centerX + width / 2;
      } else {
        const anchorX = affectsLeft ? startRight : startLeft;
        const anchorY = affectsTop ? startBottom : startTop;
        const rawWidth = Math.max(MIN_CROP_SIZE, Math.abs(px - anchorX));
        const rawHeight = Math.max(MIN_CROP_SIZE, Math.abs(py - anchorY));
        let width: number;
        let height: number;
        if (rawWidth / ratio <= rawHeight) {
          width = rawWidth;
          height = rawWidth / ratio;
        } else {
          height = rawHeight;
          width = rawHeight * ratio;
        }
        const maxWidth = affectsLeft ? anchorX - bounds.left : bounds.left + bounds.width - anchorX;
        const maxHeight = affectsTop ? anchorY - bounds.top : bounds.top + bounds.height - anchorY;
        if (width > maxWidth) {
          width = maxWidth;
          height = width / ratio;
        }
        if (height > maxHeight) {
          height = maxHeight;
          width = height * ratio;
        }
        left = affectsLeft ? anchorX - width : anchorX;
        right = left + width;
        top = affectsTop ? anchorY - height : anchorY;
        bottom = top + height;
      }
    }

    const width = right - left;
    const height = bottom - top;
    const changed = left !== target.left || top !== target.top || width !== target.width || height !== target.height;
    target.set({ left, top, width, height });
    return changed;
  };
}

function buildCropControls(
  boundsRef: RefObject<Bounds | null>,
  aspectLockedRef: RefObject<boolean>,
  aspectRatioRef: RefObject<number>,
): Record<string, Control> {
  const controls: Record<string, Control> = {};
  (Object.keys(HANDLE_LAYOUT) as HandleKey[]).forEach((handle) => {
    const { x, y, cursor } = HANDLE_LAYOUT[handle];
    controls[handle] = new Control({
      x,
      y,
      cursorStyle: cursor,
      actionName: "resizing",
      actionHandler: controlsUtils.wrapWithFireEvent(
        "resizing",
        buildResizeHandler(handle, boundsRef, aspectLockedRef, aspectRatioRef),
      ),
    });
  });
  return controls;
}

export function useCanvasCrop({ canvas, active, targetImage }: UseCanvasCropOptions): UseCanvasCropResult {
  const sessionRef = useRef<CropSession | null>(null);
  const aspectLockedRef = useRef(false);
  const aspectRatioRef = useRef(1);
  const rafRef = useRef<number | null>(null);

  const [pixelSize, setPixelSize] = useState<CropPixelSize>({ width: 0, height: 0 });
  const [aspectLocked, setAspectLockedState] = useState(false);
  const [preset, setPreset] = useState<CropPresetKey>("free");
  const [badgeRect, setBadgeRect] = useState<CropScreenRect | null>(null);

  const schedulePaint = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      sessionRef.current?.computeAndSetState();
    });
  }, []);

  // useLayoutEffect (not useEffect) so the cleanup that tears down the crop
  // overlay runs synchronously in the same commit as the caller's obj.set(...)
  // in applyCrop — otherwise Fabric's own rAF-scheduled repaint could land
  // between "image cropped" and "overlay removed" and flash the stale rect.
  useLayoutEffect(() => {
    if (!canvas || !active || !targetImage) return;

    const bounds: Bounds = {
      left: targetImage.left ?? 0,
      top: targetImage.top ?? 0,
      width: targetImage.getScaledWidth(),
      height: targetImage.getScaledHeight(),
    };

    aspectLockedRef.current = false;
    aspectRatioRef.current = bounds.width / bounds.height;
    // One-time reset for the start of a new crop session (mount only — every
    // other state change in this hook happens from event handlers/imperative
    // calls below, never synchronously here), so a lingering "1:1 locked"
    // from a previous session can't survive into a freshly-opened crop box.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAspectLockedState(false);
    setPreset("free");

    const rect = new Rect({
      originX: "left",
      originY: "top",
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
      fill: "transparent",
      stroke: ACCENT,
      strokeDashArray: [8, 6],
      strokeWidth: 2,
      cornerColor: ACCENT,
      cornerStrokeColor: "#0B1220",
      cornerStyle: "circle",
      cornerSize: 14,
      transparentCorners: false,
      hoverCursor: "move",
    });
    rect.controls = buildCropControls(
      { current: bounds },
      aspectLockedRef,
      aspectRatioRef,
    );

    const dimPanels = [0, 1, 2, 3].map(
      () =>
        new Rect({
          originX: "left",
          originY: "top",
          fill: "rgba(2, 6, 23, 0.7)",
          selectable: false,
          evented: false,
          excludeFromExport: true,
        }),
    );
    const [topPanel, bottomPanel, leftPanel, rightPanel] = dimPanels;

    const gridLineOptions = {
      stroke: "rgba(248, 250, 252, 0.6)",
      strokeWidth: 1,
      selectable: false,
      evented: false,
      excludeFromExport: true,
    };
    const gridLines = [0, 1, 2, 3].map(() => new Line([0, 0, 0, 0], gridLineOptions));
    const [gridV1, gridV2, gridH1, gridH2] = gridLines;

    dimPanels.forEach((panel) => canvas.add(panel));
    gridLines.forEach((line) => canvas.add(line));
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.bringObjectToFront(rect);

    const updateChrome = () => {
      const left = rect.left ?? 0;
      const top = rect.top ?? 0;
      const width = rect.width ?? 0;
      const height = rect.height ?? 0;
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();

      topPanel.set({ left: 0, top: 0, width: canvasWidth, height: Math.max(0, top) });
      bottomPanel.set({
        left: 0,
        top: top + height,
        width: canvasWidth,
        height: Math.max(0, canvasHeight - (top + height)),
      });
      leftPanel.set({ left: 0, top, width: Math.max(0, left), height });
      rightPanel.set({ left: left + width, top, width: Math.max(0, canvasWidth - (left + width)), height });
      dimPanels.forEach((panel) => panel.setCoords());

      gridV1.set({ x1: left + width / 3, y1: top, x2: left + width / 3, y2: top + height });
      gridV2.set({ x1: left + (width * 2) / 3, y1: top, x2: left + (width * 2) / 3, y2: top + height });
      gridH1.set({ x1: left, y1: top + height / 3, x2: left + width, y2: top + height / 3 });
      gridH2.set({ x1: left, y1: top + (height * 2) / 3, x2: left + width, y2: top + (height * 2) / 3 });
      gridLines.forEach((line) => line.setCoords());

      canvas.requestRenderAll();
    };

    const computeAndSetState = () => {
      const scaleX = targetImage.scaleX ?? 1;
      const scaleY = targetImage.scaleY ?? 1;
      const width = rect.width ?? 0;
      const height = rect.height ?? 0;
      setPixelSize({ width: Math.round(width / scaleX), height: Math.round(height / scaleY) });

      const vpt = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
      setBadgeRect({
        left: (rect.left ?? 0) * vpt[0] + vpt[4],
        top: (rect.top ?? 0) * vpt[3] + vpt[5],
        width: width * vpt[0],
        height: height * vpt[3],
      });
    };

    sessionRef.current = { canvas, obj: targetImage, rect, bounds, panels: dimPanels, gridLines, updateChrome, computeAndSetState };

    updateChrome();
    computeAndSetState();

    const handleMoving = (event: { target?: FabricObject }) => {
      if (event.target !== rect) return;
      const width = rect.width ?? 0;
      const height = rect.height ?? 0;
      let left = rect.left ?? 0;
      let top = rect.top ?? 0;

      if (Math.abs(left - bounds.left) < CROP_SNAP_THRESHOLD) left = bounds.left;
      if (Math.abs(top - bounds.top) < CROP_SNAP_THRESHOLD) top = bounds.top;
      if (Math.abs(left + width - (bounds.left + bounds.width)) < CROP_SNAP_THRESHOLD) {
        left = bounds.left + bounds.width - width;
      }
      if (Math.abs(top + height - (bounds.top + bounds.height)) < CROP_SNAP_THRESHOLD) {
        top = bounds.top + bounds.height - height;
      }
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;
      if (Math.abs(left + width / 2 - centerX) < CROP_SNAP_THRESHOLD) left = centerX - width / 2;
      if (Math.abs(top + height / 2 - centerY) < CROP_SNAP_THRESHOLD) top = centerY - height / 2;

      left = clamp(left, bounds.left, bounds.left + bounds.width - width);
      top = clamp(top, bounds.top, bounds.top + bounds.height - height);

      rect.set({ left, top });
      rect.setCoords();
      updateChrome();
      schedulePaint();
    };

    const handleResizing = (event: { target?: FabricObject }) => {
      if (event.target !== rect) return;
      updateChrome();
      schedulePaint();
    };

    canvas.on("object:moving", handleMoving);
    canvas.on("object:resizing", handleResizing);

    return () => {
      canvas.off("object:moving", handleMoving);
      canvas.off("object:resizing", handleResizing);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      canvas.remove(rect);
      dimPanels.forEach((panel) => canvas.remove(panel));
      gridLines.forEach((line) => canvas.remove(line));
      sessionRef.current = null;
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      setBadgeRect(null);
    };
    // Re-mounts only when crop mode toggles or the target layer changes —
    // aspect lock / preset / manual dimension edits mutate the live session
    // via refs and imperative calls below instead of re-running this effect.
  }, [canvas, active, targetImage, schedulePaint]);

  const updateAspectLock = useCallback((locked: boolean) => {
    aspectLockedRef.current = locked;
    setAspectLockedState(locked);
  }, []);

  const setAspectLocked = useCallback(
    (locked: boolean) => {
      const session = sessionRef.current;
      if (locked && session?.rect.width && session.rect.height) {
        aspectRatioRef.current = session.rect.width / session.rect.height;
      } else if (!locked) {
        setPreset("free");
      }
      updateAspectLock(locked);
    },
    [updateAspectLock],
  );

  const fitRectToRatio = useCallback((ratio: number) => {
    const session = sessionRef.current;
    if (!session) return;
    const { rect, bounds } = session;
    let width = bounds.width;
    let height = width / ratio;
    if (height > bounds.height) {
      height = bounds.height;
      width = height * ratio;
    }
    const left = bounds.left + (bounds.width - width) / 2;
    const top = bounds.top + (bounds.height - height) / 2;
    rect.set({ left, top, width, height });
    rect.setCoords();
    session.updateChrome();
    session.computeAndSetState();
  }, []);

  const applyPreset = useCallback(
    (next: CropPresetKey) => {
      setPreset(next);
      const config = CROP_PRESETS.find((p) => p.key === next);
      if (!config || config.ratio === null) {
        updateAspectLock(false);
        return;
      }
      aspectRatioRef.current = config.ratio;
      updateAspectLock(true);
      fitRectToRatio(config.ratio);
    },
    [updateAspectLock, fitRectToRatio],
  );

  const setWidthPx = useCallback((nativeWidth: number) => {
    const session = sessionRef.current;
    if (!session || !Number.isFinite(nativeWidth) || nativeWidth <= 0) return;
    const { rect, bounds, obj } = session;
    const scaleX = obj.scaleX ?? 1;
    const left = rect.left ?? bounds.left;
    const top = rect.top ?? bounds.top;
    const maxWidth = bounds.left + bounds.width - left;
    let width = clamp(nativeWidth * scaleX, MIN_CROP_SIZE, Math.max(MIN_CROP_SIZE, maxWidth));
    let height = rect.height ?? bounds.height;
    if (aspectLockedRef.current) {
      const maxHeight = bounds.top + bounds.height - top;
      height = Math.min(width / aspectRatioRef.current, maxHeight);
      width = Math.min(height * aspectRatioRef.current, maxWidth);
    }
    rect.set({ width, height });
    rect.setCoords();
    session.updateChrome();
    session.computeAndSetState();
  }, []);

  const setHeightPx = useCallback((nativeHeight: number) => {
    const session = sessionRef.current;
    if (!session || !Number.isFinite(nativeHeight) || nativeHeight <= 0) return;
    const { rect, bounds, obj } = session;
    const scaleY = obj.scaleY ?? 1;
    const top = rect.top ?? bounds.top;
    const left = rect.left ?? bounds.left;
    const maxHeight = bounds.top + bounds.height - top;
    let height = clamp(nativeHeight * scaleY, MIN_CROP_SIZE, Math.max(MIN_CROP_SIZE, maxHeight));
    let width = rect.width ?? bounds.width;
    if (aspectLockedRef.current) {
      const maxWidth = bounds.left + bounds.width - left;
      width = Math.min(height * aspectRatioRef.current, maxWidth);
      height = Math.min(width / aspectRatioRef.current, maxHeight);
    }
    rect.set({ width, height });
    rect.setCoords();
    session.updateChrome();
    session.computeAndSetState();
  }, []);

  const commit = useCallback((): CropCommitResult | null => {
    const session = sessionRef.current;
    if (!session) return null;
    const { rect, obj } = session;
    const imgLeft = obj.left ?? 0;
    const imgTop = obj.top ?? 0;
    const scaleX = obj.scaleX ?? 1;
    const scaleY = obj.scaleY ?? 1;
    const left = rect.left ?? 0;
    const top = rect.top ?? 0;
    const width = rect.width ?? 0;
    const height = rect.height ?? 0;
    const cropX = Math.max(0, (left - imgLeft) / scaleX + (obj.cropX ?? 0));
    const cropY = Math.max(0, (top - imgTop) / scaleY + (obj.cropY ?? 0));
    return { cropX, cropY, width: width / scaleX, height: height / scaleY, left, top };
  }, []);

  return {
    pixelSize,
    aspectLocked,
    setAspectLocked,
    preset,
    applyPreset,
    setWidthPx,
    setHeightPx,
    badgeRect,
    commit,
  };
}
