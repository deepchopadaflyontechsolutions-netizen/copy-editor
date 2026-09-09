import type { Point, Viewport } from "./types";
import { toObject } from "./geometry";

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;
export const ZOOM_STEP = 1.2;

/** Zoom above this level is treated as "past original size" — the point where zoom switches from board-centered to cursor-anchored. At/below it, the board is always dead-center (see `zoomCentered`/`zoomCenterSettling`). */
export const CURSOR_ZOOM_THRESHOLD = 1;

/** Per-frame decay applied to leftover pan by `zoomCenterSettling` — how much of the remaining offset survives each animation frame. */
const PAN_SETTLE_RATE = 0.72;
/** Below this many px on both axes, leftover pan snaps to exactly (0, 0) instead of decaying forever. */
const PAN_SETTLE_EPSILON = 0.5;

export function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

/**
 * A new viewport at `nextZoom` with `panX`/`panY` left untouched. The board
 * container is always positioned at the center of its workspace (CSS
 * `left/top: 50%` + `translate(-50%, -50%)`) and sized to `documentSize *
 * zoom`, then shifted off that center by `(panX, panY)`. Because the
 * `-50%/-50%` translate is reapplied against whatever box size results from
 * the new zoom, growing or shrinking the box always happens symmetrically
 * around its own current center — wherever that sits — with no extra pan
 * math needed. Safe wherever pan is already known to be (0, 0), e.g.
 * `CanvasEngineContext.animateZoomTo`'s toolbar zoom, which never creates
 * pan in the first place. For the wheel handler, where pan can carry over
 * from cursor-anchored zooming (`zoomToPoint`), use `zoomCenterSettling`
 * instead so any leftover pan eases back to center rather than freezing in
 * place.
 */
export function zoomCentered(viewport: Viewport, nextZoom: number): Viewport {
  return { zoom: clampZoom(nextZoom), panX: viewport.panX, panY: viewport.panY };
}

/**
 * The centered-regime (zoom <= `CURSOR_ZOOM_THRESHOLD`) step used by the
 * wheel handler. Updates `zoom` and, if the viewport still carries pan left
 * over from cursor-anchored zooming above the threshold, shrinks it by
 * `PAN_SETTLE_RATE` instead of snapping it to zero outright. Called once per
 * animation frame for as long as leftover pan remains (see
 * `useCanvasWorkspaceController`'s wheel effect, which keeps re-scheduling
 * itself while unsettled even after wheel input stops), this reads as a
 * smooth ease back to dead-center rather than a jump when crossing back down
 * through the threshold — and once both axes are within `PAN_SETTLE_EPSILON`
 * of zero, snaps exactly to (0, 0) so it doesn't decay forever.
 */
export function zoomCenterSettling(viewport: Viewport, nextZoom: number): Viewport {
  const zoom = clampZoom(nextZoom);
  const settled = Math.abs(viewport.panX) < PAN_SETTLE_EPSILON && Math.abs(viewport.panY) < PAN_SETTLE_EPSILON;
  return settled
    ? { zoom, panX: 0, panY: 0 }
    : { zoom, panX: viewport.panX * PAN_SETTLE_RATE, panY: viewport.panY * PAN_SETTLE_RATE };
}

/**
 * A new viewport at `nextZoom` that keeps the object-space point under
 * `focalScreenPoint` (px relative to the board container's current rect)
 * fixed on screen. Used above `CURSOR_ZOOM_THRESHOLD` (100%, i.e. the image
 * already fills — or exceeds — the workspace), so zooming in further reads
 * as inspecting the exact spot under the cursor rather than always
 * re-centering. The board container is centered in its workspace and sized
 * to `documentSize * zoom`, so re-zooming alone shifts its top-left by
 * `documentSize * (zoom - oldZoom) / 2` (half the size delta, since it grows
 * from its center) — `panX`/`panY` (the container's own translate offset)
 * must absorb exactly that shift, plus whatever additional shift keeps
 * `focalScreenPoint` fixed, for the zoom to read as anchored under the
 * cursor instead of the board's center.
 */
export function zoomToPoint(viewport: Viewport, nextZoom: number, focalScreenPoint: Point, documentSize: { width: number; height: number }): Viewport {
  const zoom = clampZoom(nextZoom);
  const objectPoint = toObject(focalScreenPoint, viewport);
  return {
    zoom,
    panX: viewport.panX + (focalScreenPoint.x - objectPoint.x * zoom) + (documentSize.width * (zoom - viewport.zoom)) / 2,
    panY: viewport.panY + (focalScreenPoint.y - objectPoint.y * zoom) + (documentSize.height * (zoom - viewport.zoom)) / 2,
  };
}

/**
 * Clamps `viewport.panX`/`panY` so the board can never be pushed (by
 * cursor-anchored zoom, or any other pan source) far enough that one of its
 * edges retreats past the workspace's own edge — the "dead gray space on one
 * side while the image is cut off on the other" bug. On each axis, once the
 * board (`documentSize * zoom`) is bigger than the `containerSize` it sits
 * in, pan is bounded to `±(boardSize - containerSize) / 2`: at that extreme
 * the board's near edge lines up exactly with the container's edge (so you
 * can still pan to inspect every corner of an oversized image) and can go no
 * further (so it can never expose empty space beyond it). Once the board
 * fits within the container on an axis, that axis's bound collapses to 0,
 * forcing it back to dead-center — matching `zoomCenterSettling` at/below
 * `CURSOR_ZOOM_THRESHOLD`, but derived from actual measured sizes rather
 * than the zoom number alone, so it also holds for a workspace small enough
 * that the board overflows it even below 100%.
 */
export function clampPan(viewport: Viewport, documentSize: { width: number; height: number }, containerSize: { width: number; height: number }): Viewport {
  const boardWidth = documentSize.width * viewport.zoom;
  const boardHeight = documentSize.height * viewport.zoom;
  const maxPanX = Math.max(0, (boardWidth - containerSize.width) / 2);
  const maxPanY = Math.max(0, (boardHeight - containerSize.height) / 2);
  return {
    zoom: viewport.zoom,
    panX: Math.min(maxPanX, Math.max(-maxPanX, viewport.panX)),
    panY: Math.min(maxPanY, Math.max(-maxPanY, viewport.panY)),
  };
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}
