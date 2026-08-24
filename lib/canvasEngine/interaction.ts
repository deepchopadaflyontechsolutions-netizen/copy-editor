import { getAABB, hitTestLayer, resizeFromHandle, rotateFromPointer } from "./geometry";
import { computeSnapGuides, isOutOfBounds } from "./snapping";
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

/** One step of a move-drag: translates `startTransform` by the pointer delta, then snaps against the page and sibling layers (matching the Fabric-based engine's object:moving behavior — move snaps, resize does not). */
export function stepDrag(
  startTransform: TransformState,
  pointerDelta: Point,
  siblingBoxes: Rect[],
  page: Rect,
  isBaseLayer: boolean,
): DragStepResult {
  const moved: TransformState = { ...startTransform, x: startTransform.x + pointerDelta.x, y: startTransform.y + pointerDelta.y };
  if (isBaseLayer) {
    return { transform: moved, guides: [], outOfBounds: false };
  }
  const box = getAABB(moved);
  const { dx, dy, guides } = computeSnapGuides(box, siblingBoxes, page);
  const snapped: TransformState = { ...moved, x: moved.x + dx, y: moved.y + dy };
  return { transform: snapped, guides, outOfBounds: isOutOfBounds(page, getAABB(snapped)) };
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
