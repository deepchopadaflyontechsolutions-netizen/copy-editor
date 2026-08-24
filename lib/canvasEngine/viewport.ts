import type { Point, Viewport } from "./types";
import { toObject } from "./geometry";

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;
export const ZOOM_STEP = 1.2;

export function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

/** A new viewport at `nextZoom` that keeps the object-space point under `focalScreenPoint` fixed on screen. */
export function zoomToPoint(viewport: Viewport, nextZoom: number, focalScreenPoint: Point): Viewport {
  const zoom = clampZoom(nextZoom);
  const objectPoint = toObject(focalScreenPoint, viewport);
  return {
    zoom,
    panX: focalScreenPoint.x - objectPoint.x * zoom,
    panY: focalScreenPoint.y - objectPoint.y * zoom,
  };
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}
