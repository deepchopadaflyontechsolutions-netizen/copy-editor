import type { HandleId, Point, Rect, TransformState, Viewport } from "./types";

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export function rotateVector(v: Point, degrees: number): Point {
  if (degrees === 0) return v;
  const rad = degrees * DEG2RAD;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
}

/** Object-space -> screen-space. Matches Fabric's viewportTransform convention this app already relied on. */
export function toScreen(point: Point, viewport: Viewport): Point {
  return { x: point.x * viewport.zoom + viewport.panX, y: point.y * viewport.zoom + viewport.panY };
}

export function toObject(point: Point, viewport: Viewport): Point {
  return { x: (point.x - viewport.panX) / viewport.zoom, y: (point.y - viewport.panY) / viewport.zoom };
}

/** Rendered (post-scale) size of a layer, before rotation. */
export function getRenderedSize(transform: TransformState): { width: number; height: number } {
  return { width: transform.width * transform.scaleX, height: transform.height * transform.scaleY };
}

export function getCenter(transform: TransformState): Point {
  const { width, height } = getRenderedSize(transform);
  return { x: transform.x + width / 2, y: transform.y + height / 2 };
}

/** The 4 corners of the layer's rotated footprint, in object space. */
export function getRotatedCorners(transform: TransformState): [Point, Point, Point, Point] {
  const { width, height } = getRenderedSize(transform);
  const center = getCenter(transform);
  const halfW = width / 2;
  const halfH = height / 2;
  const local: Point[] = [
    { x: -halfW, y: -halfH },
    { x: halfW, y: -halfH },
    { x: halfW, y: halfH },
    { x: -halfW, y: halfH },
  ];
  return local.map((p) => {
    const rotated = rotateVector(p, transform.rotation);
    return { x: center.x + rotated.x, y: center.y + rotated.y };
  }) as [Point, Point, Point, Point];
}

/** Axis-aligned bounding box of a (possibly rotated) layer, in object space. */
export function getAABB(transform: TransformState): Rect {
  const corners = getRotatedCorners(transform);
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

/** True if `point` (object space) falls within the layer's rotated footprint. */
export function hitTestLayer(point: Point, transform: TransformState): boolean {
  const center = getCenter(transform);
  const local = rotateVector({ x: point.x - center.x, y: point.y - center.y }, -transform.rotation);
  const { width, height } = getRenderedSize(transform);
  return Math.abs(local.x) <= width / 2 && Math.abs(local.y) <= height / 2;
}

/** Unit direction (from center) each handle sits at, in the layer's local (unrotated) frame. */
export const HANDLE_UNITS: Record<Exclude<HandleId, "rotate">, Point> = {
  tl: { x: -1, y: -1 },
  tr: { x: 1, y: -1 },
  br: { x: 1, y: 1 },
  bl: { x: -1, y: 1 },
  ml: { x: -1, y: 0 },
  mr: { x: 1, y: 0 },
  mt: { x: 0, y: -1 },
  mb: { x: 0, y: 1 },
};

export const CORNER_HANDLES: ReadonlySet<HandleId> = new Set(["tl", "tr", "br", "bl"]);

/** Screen-space position of a handle (8 resize handles + the rotation anchor 30px below the box). */
export function getHandleScreenPosition(transform: TransformState, handle: HandleId, viewport: Viewport): Point {
  const center = getCenter(transform);
  const { width, height } = getRenderedSize(transform);

  if (handle === "rotate") {
    const localBelow = { x: 0, y: height / 2 + 30 / viewport.zoom };
    const rotated = rotateVector(localBelow, transform.rotation);
    return toScreen({ x: center.x + rotated.x, y: center.y + rotated.y }, viewport);
  }

  const unit = HANDLE_UNITS[handle];
  const local = { x: (unit.x * width) / 2, y: (unit.y * height) / 2 };
  const rotated = rotateVector(local, transform.rotation);
  return toScreen({ x: center.x + rotated.x, y: center.y + rotated.y }, viewport);
}

const HANDLE_HIT_RADIUS = 14;

/** Which handle (if any) sits under a screen-space pointer, checked in front-to-back visual priority. */
export function hitTestHandle(screenPoint: Point, transform: TransformState, viewport: Viewport): HandleId | null {
  const order: HandleId[] = ["rotate", "tl", "tr", "br", "bl", "mt", "mb", "ml", "mr"];
  for (const handle of order) {
    const pos = getHandleScreenPosition(transform, handle, viewport);
    const dx = screenPoint.x - pos.x;
    const dy = screenPoint.y - pos.y;
    if (dx * dx + dy * dy <= HANDLE_HIT_RADIUS * HANDLE_HIT_RADIUS) return handle;
  }
  return null;
}

export const CURSOR_BY_HANDLE: Record<HandleId, string> = {
  tl: "nwse-resize",
  br: "nwse-resize",
  tr: "nesw-resize",
  bl: "nesw-resize",
  ml: "ew-resize",
  mr: "ew-resize",
  mt: "ns-resize",
  mb: "ns-resize",
  rotate: "grab",
};

const MIN_LAYER_SIZE = 20;

/**
 * Resizes a layer by dragging `handle` to `pointerObject` (object space).
 * Corner handles always preserve aspect ratio ("proportional scaling");
 * edge handles stretch a single axis ("directional stretching") — matching
 * the distinction the Canva-style spec draws between the two handle kinds.
 * Fully rotation-aware: the corner/edge opposite the dragged handle stays
 * pinned in place regardless of the box's current rotation.
 */
export function resizeFromHandle(
  transform: TransformState,
  handle: Exclude<HandleId, "rotate">,
  pointerObject: Point,
): TransformState {
  const { width: oldW, height: oldH } = getRenderedSize(transform);
  const center = getCenter(transform);
  const unit = HANDLE_UNITS[handle];
  const anchorUnit = { x: -unit.x, y: -unit.y };
  const anchorLocalOld = { x: (anchorUnit.x * oldW) / 2, y: (anchorUnit.y * oldH) / 2 };
  const anchorAbs = { x: center.x + rotateVector(anchorLocalOld, transform.rotation).x, y: center.y + rotateVector(anchorLocalOld, transform.rotation).y };

  const pointerLocal = rotateVector({ x: pointerObject.x - anchorAbs.x, y: pointerObject.y - anchorAbs.y }, -transform.rotation);

  const isCorner = CORNER_HANDLES.has(handle);
  let newW = oldW;
  let newH = oldH;

  if (isCorner) {
    const rawW = Math.max(MIN_LAYER_SIZE, Math.abs(pointerLocal.x));
    const rawH = Math.max(MIN_LAYER_SIZE, Math.abs(pointerLocal.y));
    const ratio = oldW / oldH;
    if (rawW / ratio <= rawH) {
      newW = rawW;
      newH = rawW / ratio;
    } else {
      newH = rawH;
      newW = rawH * ratio;
    }
  } else if (handle === "ml" || handle === "mr") {
    newW = Math.max(MIN_LAYER_SIZE, Math.abs(pointerLocal.x));
  } else {
    newH = Math.max(MIN_LAYER_SIZE, Math.abs(pointerLocal.y));
  }

  const newAnchorLocal = { x: (anchorUnit.x * newW) / 2, y: (anchorUnit.y * newH) / 2 };
  const rotatedNewAnchor = rotateVector(newAnchorLocal, transform.rotation);
  const newCenter = { x: anchorAbs.x - rotatedNewAnchor.x, y: anchorAbs.y - rotatedNewAnchor.y };

  return {
    ...transform,
    x: newCenter.x - newW / 2,
    y: newCenter.y - newH / 2,
    scaleX: newW / transform.width,
    scaleY: newH / transform.height,
  };
}

const ROTATE_SNAP_INCREMENT = 15;
const ROTATE_SNAP_THRESHOLD = 3;

/** New rotation (degrees) for a layer being rotated by dragging its handle to `pointerObject`. */
export function rotateFromPointer(transform: TransformState, pointerObject: Point): number {
  const center = getCenter(transform);
  const angle = Math.atan2(pointerObject.y - center.y, pointerObject.x - center.x) * RAD2DEG;
  let rotation = angle - 90;
  rotation = ((rotation % 360) + 360) % 360;

  const nearest = Math.round(rotation / ROTATE_SNAP_INCREMENT) * ROTATE_SNAP_INCREMENT;
  if (Math.abs(rotation - nearest) < ROTATE_SNAP_THRESHOLD) rotation = nearest % 360;
  return rotation;
}

/** Object-space <-> native image-pixel-space, the same formula the Fabric-based engine used throughout crop/heal/auto-clean. Kept here for reuse once those tools are ported. */
export function objectToNative(objectValue: number, offset: number, scale: number, crop: number): number {
  return (objectValue - offset) / scale + crop;
}

export function nativeToObject(nativeValue: number, offset: number, scale: number, crop: number): number {
  return (nativeValue - crop) * scale + offset;
}
