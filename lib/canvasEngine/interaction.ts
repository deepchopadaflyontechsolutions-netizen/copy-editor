import { getAABB, hitTestLayer, resizeFromHandle, rotateFromPointer } from "./geometry";
import { computeSnapGuides, isOutOfBounds, GUIDE_SNAP_THRESHOLD } from "./snapping";
import type { EngineLayer, HandleId, Point, Rect, SnapGuide, TransformState } from "./types";

/** Topmost (last in z-order) unlocked layer whose rotated footprint contains `pointerObject`, or null. */
export function hitTestLayers(layers: EngineLayer[], pointerObject: Point): string | null {
  for (let i = layers.length - 1; i >= 0; i -= 1) {
    const layer = layers[i];
    if (!layer.visible || layer.locked) continue;
    if (hitTestLayer(pointerObject, layer.transform)) return layer.id;
  }
  return null;
}

export interface DragStepResult {
  transform: TransformState;
  guides: SnapGuide[];
  outOfBounds: boolean;
}

/**
 * One step of a move-drag: translates `startTransform` by the pointer delta, then snaps against
 * the page and sibling layers (matching the Fabric-based engine's object:moving behavior — move
 * snaps, resize does not). Guides are computed for the base layer too — moving the main photo
 * around the page still benefits from centering/edge alignment lines — but it's never flagged
 * out-of-bounds, since it's expected to be repositioned freely within (or past) the page.
 *
 * `zoom` converts the snap threshold from object-space to a constant on-screen distance
 * (`GUIDE_SNAP_THRESHOLD` screen px). Without this, the threshold stayed fixed in object-space
 * px, so at any zoom other than 100% the on-screen catch radius shrank or grew with it — at higher
 * zoom the snap zone became a couple of screen pixels, making guides feel like they barely ever
 * appeared.
 */
export function stepDrag(
  startTransform: TransformState,
  pointerDelta: Point,
  siblingBoxes: Rect[],
  page: Rect,
  isBaseLayer: boolean,
  zoom: number,
): DragStepResult {
  const moved: TransformState = { ...startTransform, x: startTransform.x + pointerDelta.x, y: startTransform.y + pointerDelta.y };
  const box = getAABB(moved);
  const threshold = GUIDE_SNAP_THRESHOLD / zoom;
  const { dx, dy, guides } = computeSnapGuides(box, siblingBoxes, page, threshold);
  const snapped: TransformState = { ...moved, x: moved.x + dx, y: moved.y + dy };
  const outOfBounds = isBaseLayer ? false : isOutOfBounds(page, getAABB(snapped));
  return { transform: snapped, guides, outOfBounds };
}

export interface ResizeStepResult {
  transform: TransformState;
  outOfBounds: boolean;
}

export function stepResize(
  startTransform: TransformState,
  handle: Exclude<HandleId, "rotate">,
  pointerObject: Point,
  page: Rect,
  isBaseLayer: boolean,
): ResizeStepResult {
  const transform = resizeFromHandle(startTransform, handle, pointerObject);
  return { transform, outOfBounds: isBaseLayer ? false : isOutOfBounds(page, getAABB(transform)) };
}

export function stepRotate(startTransform: TransformState, pointerObject: Point): TransformState {
  return { ...startTransform, rotation: rotateFromPointer(startTransform, pointerObject) };
}
