import { loadImage } from "./loadImage";
import { createCanvas, canvasToBlob } from "./canvas";
import type { ResizeOptions } from "./types";

/**
 * Renders `image` into an offscreen canvas at the target dimensions and
 * exports it as a Blob. `resizeMode: 'pixelated'` disables smoothing for
 * crisp nearest-neighbor scaling; 'smooth' (default) uses the browser's
 * highest-quality resampling.
 */
export async function resizeImage(options: ResizeOptions): Promise<Blob> {
  const { image, targetWidth, targetHeight, mimeType, quality, resizeMode = "smooth" } = options;

  if (
    !Number.isFinite(targetWidth) ||
    !Number.isFinite(targetHeight) ||
    targetWidth <= 0 ||
    targetHeight <= 0
  ) {
    throw new Error("resize-invalid-dimensions");
  }

  const imageElement = image instanceof File ? await loadImage(image) : image;

  const canvas = createCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("canvas-context-unavailable");
  }

  ctx.imageSmoothingEnabled = resizeMode === "smooth";
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(imageElement, 0, 0, targetWidth, targetHeight);

  return canvasToBlob(canvas, mimeType, quality);
}
