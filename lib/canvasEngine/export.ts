import { renderScene } from "./render";
import type { EngineLayer } from "./types";

interface ExportSceneOptions {
  layers: EngineLayer[];
  documentSize: { width: number; height: number };
  format: "png" | "jpeg";
  multiplier: number;
  quality?: number;
}

/** Renders the layer stack (no chrome — chrome is never part of this array) to an offscreen canvas at `multiplier`x resolution and encodes it, reusing the exact same draw routine the live preview uses so export is pixel-identical to what's on screen. */
export async function exportScene({ layers, documentSize, format, multiplier, quality = 0.92 }: ExportSceneOptions): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(documentSize.width * multiplier));
  canvas.height = Math.max(1, Math.round(documentSize.height * multiplier));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  renderScene(ctx, {
    layers,
    viewport: { zoom: 1, panX: 0, panY: 0 },
    documentSize,
    pixelRatio: multiplier,
  });

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), format === "jpeg" ? "image/jpeg" : "image/png", quality);
  });
}
