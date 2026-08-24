import { objectToNative, toScreen } from "./geometry";
import type { EngineLayer, HandleId, Point, Rect, Viewport } from "./types";

export type CropHandleKey = Exclude<HandleId, "rotate">;

export type CropPresetKey = "free" | "1:1" | "16:9" | "4:5" | "9:16";

export const CROP_PRESETS: { key: CropPresetKey; label: string; ratio: number | null }[] = [
  { key: "free", label: "Freeform", ratio: null },
  { key: "1:1", label: "1:1 Square", ratio: 1 },
  { key: "16:9", label: "16:9 Landscape", ratio: 16 / 9 },
  { key: "4:5", label: "4:5 Portrait", ratio: 4 / 5 },
  { key: "9:16", label: "9:16 Story", ratio: 9 / 16 },
];

export interface CropSessionState {
  layerId: string;
  /** Fixed for the whole session — crop only repositions/resizes the window, it never re-scales the image. */
  scaleX: number;
  scaleY: number;
  /** The full original bitmap's box, in object space — pans (but never resizes) as the user drags the image under the frame. */
  imageBox: Rect;
  /** The crop window, in object space — always fully contained within `imageBox`. */
  cropRect: Rect;
  aspectLocked: boolean;
  aspectRatio: number;
  preset: CropPresetKey;
}

export type CropDragState =
  | { kind: "handle"; handle: CropHandleKey; startRect: Rect }
  | { kind: "body"; startImageBox: Rect; startPointerObject: Point }
  | null;

const MIN_CROP_SIZE = 24;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/** Builds a fresh crop session from a layer's current transform — the crop window starts at the layer's currently-visible (already-cropped) extent, while the draggable bounds cover the *entire* original bitmap, so widening the window back out can reveal pixels a previous crop cut away. */
export function createCropSession(layer: EngineLayer): CropSessionState {
  const scaleX = layer.transform.scaleX;
  const scaleY = layer.transform.scaleY;
  const imageBox: Rect = {
    x: layer.transform.x - layer.image.cropX * scaleX,
    y: layer.transform.y - layer.image.cropY * scaleY,
    width: layer.image.naturalWidth * scaleX,
    height: layer.image.naturalHeight * scaleY,
  };
  const cropRect: Rect = {
    x: layer.transform.x,
    y: layer.transform.y,
    width: layer.transform.width * scaleX,
    height: layer.transform.height * scaleY,
  };
  return {
    layerId: layer.id,
    scaleX,
    scaleY,
    imageBox,
    cropRect,
    aspectLocked: false,
    aspectRatio: cropRect.height > 0 ? cropRect.width / cropRect.height : 1,
    preset: "free",
  };
}

/** Native-pixel crop offset/size to commit back onto the layer's transform + image content. */
export function commitCrop(session: CropSessionState): { cropX: number; cropY: number; width: number; height: number; x: number; y: number } {
  const { cropRect, imageBox, scaleX, scaleY } = session;
  return {
    cropX: objectToNative(cropRect.x, imageBox.x, scaleX, 0),
    cropY: objectToNative(cropRect.y, imageBox.y, scaleY, 0),
    width: cropRect.width / scaleX,
    height: cropRect.height / scaleY,
    x: cropRect.x,
    y: cropRect.y,
  };
}

/**
 * Resizes the crop window by dragging `handle` to `pointerObject`, clamped to stay within
 * `bounds` (the full image). Corner handles preserve aspect ratio when locked; edge handles
 * stretch a single axis around the fixed center. Mirrors the old Fabric-based crop tool's
 * per-handle edge math, just against a plain Rect instead of a live canvas object.
 */
export function stepCropResize(
  startRect: Rect,
  bounds: Rect,
  handle: CropHandleKey,
  pointerObject: Point,
  aspectLocked: boolean,
  aspectRatio: number,
): Rect {
  const affectsLeft = handle === "tl" || handle === "bl" || handle === "ml";
  const affectsRight = handle === "tr" || handle === "br" || handle === "mr";
  const affectsTop = handle === "tl" || handle === "tr" || handle === "mt";
  const affectsBottom = handle === "bl" || handle === "br" || handle === "mb";

  const startLeft = startRect.x;
  const startTop = startRect.y;
  const startRight = startRect.x + startRect.width;
  const startBottom = startRect.y + startRect.height;

  const px = clamp(pointerObject.x, bounds.x, bounds.x + bounds.width);
  const py = clamp(pointerObject.y, bounds.y, bounds.y + bounds.height);

  let left = startLeft;
  let top = startTop;
  let right = startRight;
  let bottom = startBottom;

  if (affectsLeft) left = clamp(px, bounds.x, right - MIN_CROP_SIZE);
  if (affectsRight) right = clamp(px, left + MIN_CROP_SIZE, bounds.x + bounds.width);
  if (affectsTop) top = clamp(py, bounds.y, bottom - MIN_CROP_SIZE);
  if (affectsBottom) bottom = clamp(py, top + MIN_CROP_SIZE, bounds.y + bounds.height);

  if (aspectLocked) {
    const ratio = aspectRatio > 0 ? aspectRatio : (right - left) / (bottom - top);

    if (handle === "ml" || handle === "mr") {
      const anchorX = handle === "ml" ? startRight : startLeft;
      const maxWidth = handle === "ml" ? anchorX - bounds.x : bounds.x + bounds.width - anchorX;
      let width = clamp(Math.abs(px - anchorX), MIN_CROP_SIZE, Math.max(MIN_CROP_SIZE, maxWidth));
      let height = width / ratio;
      const centerY = (startTop + startBottom) / 2;
      const maxHeight = 2 * Math.min(centerY - bounds.y, bounds.y + bounds.height - centerY);
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
      const maxHeight = handle === "mt" ? anchorY - bounds.y : bounds.y + bounds.height - anchorY;
      let height = clamp(Math.abs(py - anchorY), MIN_CROP_SIZE, Math.max(MIN_CROP_SIZE, maxHeight));
      let width = height * ratio;
      const centerX = (startLeft + startRight) / 2;
      const maxWidth = 2 * Math.min(centerX - bounds.x, bounds.x + bounds.width - centerX);
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
      const maxWidth = affectsLeft ? anchorX - bounds.x : bounds.x + bounds.width - anchorX;
      const maxHeight = affectsTop ? anchorY - bounds.y : bounds.y + bounds.height - anchorY;
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

  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** Pans the underlying image under a crop window that stays fixed on screen, clamped so the window can never expose past the image's edge. */
export function stepCropPan(startImageBox: Rect, cropRect: Rect, pointerDelta: Point): Rect {
  const minX = cropRect.x + cropRect.width - startImageBox.width;
  const maxX = cropRect.x;
  const minY = cropRect.y + cropRect.height - startImageBox.height;
  const maxY = cropRect.y;
  const x = clamp(startImageBox.x + pointerDelta.x, minX, maxX);
  const y = clamp(startImageBox.y + pointerDelta.y, minY, maxY);
  return { ...startImageBox, x, y };
}

/** Largest `ratio`-shaped window centered within `bounds` (the full image). */
export function fitCropRectToRatio(bounds: Rect, ratio: number): Rect {
  let width = bounds.width;
  let height = width / ratio;
  if (height > bounds.height) {
    height = bounds.height;
    width = height * ratio;
  }
  return {
    x: bounds.x + (bounds.width - width) / 2,
    y: bounds.y + (bounds.height - height) / 2,
    width,
    height,
  };
}

export function stepCropWidth(session: CropSessionState, nativeWidth: number): Rect {
  const { cropRect, imageBox, scaleX, aspectLocked, aspectRatio } = session;
  const maxWidth = imageBox.x + imageBox.width - cropRect.x;
  let width = clamp(nativeWidth * scaleX, MIN_CROP_SIZE, Math.max(MIN_CROP_SIZE, maxWidth));
  let height = cropRect.height;
  if (aspectLocked) {
    const maxHeight = imageBox.y + imageBox.height - cropRect.y;
    height = Math.min(width / aspectRatio, maxHeight);
    width = Math.min(height * aspectRatio, maxWidth);
  }
  return { ...cropRect, width, height };
}

export function stepCropHeight(session: CropSessionState, nativeHeight: number): Rect {
  const { cropRect, imageBox, scaleY, aspectLocked, aspectRatio } = session;
  const maxHeight = imageBox.y + imageBox.height - cropRect.y;
  let height = clamp(nativeHeight * scaleY, MIN_CROP_SIZE, Math.max(MIN_CROP_SIZE, maxHeight));
  let width = cropRect.width;
  if (aspectLocked) {
    const maxWidth = imageBox.x + imageBox.width - cropRect.x;
    width = Math.min(height * aspectRatio, maxWidth);
    height = Math.min(width / aspectRatio, maxHeight);
  }
  return { ...cropRect, width, height };
}

export function stepCropX(session: CropSessionState, nativeX: number): Rect {
  const { cropRect, imageBox, scaleX } = session;
  const x = clamp(imageBox.x + nativeX * scaleX, imageBox.x, imageBox.x + imageBox.width - cropRect.width);
  return { ...cropRect, x };
}

export function stepCropY(session: CropSessionState, nativeY: number): Rect {
  const { cropRect, imageBox, scaleY } = session;
  const y = clamp(imageBox.y + nativeY * scaleY, imageBox.y, imageBox.y + imageBox.height - cropRect.height);
  return { ...cropRect, y };
}

const CROP_HANDLE_HIT_RADIUS = 14;
const CROP_HANDLE_ORDER: CropHandleKey[] = ["tl", "tr", "bl", "br", "mt", "mb", "ml", "mr"];

function cropHandleScreenPosition(cropRect: Rect, handle: CropHandleKey, viewport: Viewport): Point {
  const topLeft = toScreen({ x: cropRect.x, y: cropRect.y }, viewport);
  const w = cropRect.width * viewport.zoom;
  const h = cropRect.height * viewport.zoom;
  switch (handle) {
    case "tl":
      return { x: topLeft.x, y: topLeft.y };
    case "tr":
      return { x: topLeft.x + w, y: topLeft.y };
    case "bl":
      return { x: topLeft.x, y: topLeft.y + h };
    case "br":
      return { x: topLeft.x + w, y: topLeft.y + h };
    case "mt":
      return { x: topLeft.x + w / 2, y: topLeft.y };
    case "mb":
      return { x: topLeft.x + w / 2, y: topLeft.y + h };
    case "ml":
      return { x: topLeft.x, y: topLeft.y + h / 2 };
    case "mr":
      return { x: topLeft.x + w, y: topLeft.y + h / 2 };
  }
}

/** Which crop handle (if any) sits under a screen-space pointer. */
export function hitTestCropHandle(screenPoint: Point, cropRect: Rect, viewport: Viewport): CropHandleKey | null {
  for (const handle of CROP_HANDLE_ORDER) {
    const pos = cropHandleScreenPosition(cropRect, handle, viewport);
    const dx = screenPoint.x - pos.x;
    const dy = screenPoint.y - pos.y;
    if (dx * dx + dy * dy <= CROP_HANDLE_HIT_RADIUS * CROP_HANDLE_HIT_RADIUS) return handle;
  }
  return null;
}

/** True if a screen-space pointer falls within the crop window's body (for the "drag the image" pan gesture). */
export function hitTestCropBody(screenPoint: Point, cropRect: Rect, viewport: Viewport): boolean {
  const topLeft = toScreen({ x: cropRect.x, y: cropRect.y }, viewport);
  const w = cropRect.width * viewport.zoom;
  const h = cropRect.height * viewport.zoom;
  return screenPoint.x >= topLeft.x && screenPoint.x <= topLeft.x + w && screenPoint.y >= topLeft.y && screenPoint.y <= topLeft.y + h;
}
