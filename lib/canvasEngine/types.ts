import type { BlendModeKey, FilterState } from "@/types/canvasEngine";

/**
 * A layer's position/size/rotation, independent of what kind of content it
 * holds. `x`/`y` describe the *unrotated* box's top-left corner — rotation
 * always pivots around the box's center, never around x/y directly, so a
 * layer's on-screen rotated footprint is derived (see geometry.ts) rather
 * than stored.
 */
export interface TransformState {
  x: number;
  y: number;
  /** Native/authored size — rendered size is width*scaleX / height*scaleY. */
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  /** Degrees, clockwise, pivoting around the box's center. */
  rotation: number;
}

export interface EngineImageContent {
  bitmap: HTMLImageElement;
  naturalWidth: number;
  naturalHeight: number;
  /** Native-pixel offset into `bitmap` the crop window starts at. */
  cropX: number;
  cropY: number;
  filters: FilterState;
}

export interface EngineLayer {
  id: string;
  name: string;
  type: "image";
  visible: boolean;
  locked: boolean;
  /** 0-100, matches the existing UI scale. */
  opacity: number;
  blendMode: BlendModeKey;
  transform: TransformState;
  image: EngineImageContent;
}

export interface Viewport {
  zoom: number;
  panX: number;
  panY: number;
}

export interface HistorySnapshot {
  id: string;
  label: string;
  layers: EngineLayer[];
  documentAspectRatio: number;
  /** Which layer was the page-defining base photo when this snapshot was taken — not necessarily layers[0], since z-order can change independently. */
  baseLayerId: string | null;
}

export type HandleId = "tl" | "tr" | "bl" | "br" | "ml" | "mr" | "mt" | "mb" | "rotate";

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapGuide {
  axis: "v" | "h";
  /** Object-space position of the guide line along its axis. */
  position: number;
  /** Object-space span the drawn line should cover, perpendicular to `axis`. */
  start: number;
  end: number;
}

export type InteractionMode = "idle" | "dragging" | "resizing" | "rotating" | "panning" | "cropping";
