import type { CurvePoint } from "@/types/creativeflow";

export interface LayerMeta {
  id: string;
  name: string;
  type: string;
  visible: boolean;
}

export type BlendModeKey = "Normal" | "Multiply" | "Screen" | "Overlay";

export interface FilterState {
  /** UI scale 0-100 (50 neutral), drives the Light section's "Brightness" slider. */
  exposure: number;
  /** UI scale 0-100 (50 neutral), drives the Light section's "Contrast" slider. */
  contrast: number;
  /** UI scale 0-100 (50 neutral), drives the Color section's "Saturation" slider. */
  saturation: number;
  /** Bipolar -100..100 (0 neutral) Color-section adjustments. */
  vibrance: number;
  temperature: number;
  tint: number;
  hue: number;
  /** Bipolar -100..100 (0 neutral) Light-section adjustments, alongside exposure/contrast above. */
  exposureAdjust: number;
  black: number;
  blendMode: BlendModeKey;
  curvePoints: CurvePoint[];
}

export type ExportFormat = "png" | "jpeg";

export type DrawingTool = "selection" | "brush" | "eraser" | "lasso";

/** Custom drag-and-drop MIME type used to identify an internal layer drag —
 *  e.g. dragging a Media Library thumbnail onto the canvas to reposition it —
 *  as distinct from a native OS file drop. */
export const LAYER_DRAG_MIME_TYPE = "application/x-creativeflow-layer-id";

export const BLEND_MODE_TO_COMPOSITE_OPERATION: Record<BlendModeKey, GlobalCompositeOperation> = {
  Normal: "source-over",
  Multiply: "multiply",
  Screen: "screen",
  Overlay: "overlay",
};
