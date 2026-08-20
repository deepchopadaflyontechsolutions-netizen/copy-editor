import type { CurvePoint } from "@/types/creativeflow";

export interface LayerMeta {
  id: string;
  name: string;
  type: string;
  visible: boolean;
}

export type BlendModeKey = "Normal" | "Multiply" | "Screen" | "Overlay";

export interface FilterState {
  /** UI scale 0-100, mapped to Fabric's -1..1 brightness range. */
  exposure: number;
  /** UI scale 0-100, mapped to Fabric's -1..1 contrast range. */
  contrast: number;
  blendMode: BlendModeKey;
  curvePoints: CurvePoint[];
}

export type ExportFormat = "png" | "jpeg";

export type DrawingTool = "selection" | "brush" | "lasso";

export const BLEND_MODE_TO_COMPOSITE_OPERATION: Record<BlendModeKey, GlobalCompositeOperation> = {
  Normal: "source-over",
  Multiply: "multiply",
  Screen: "screen",
  Overlay: "overlay",
};
