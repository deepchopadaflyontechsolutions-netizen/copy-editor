import { BLEND_MODE_TO_COMPOSITE_OPERATION, type FilterState } from "@/types/canvasEngine";
import { getCenter, getRenderedSize } from "./geometry";
import type { EngineLayer, Rect, Viewport } from "./types";

/** Card/page background behind every layer — one step lighter than the workspace floor around it, matching the old Fabric-based card's own surface color. */
export const CARD_SURFACE = "#1E293B";
/** Workspace "floor" behind the document card. */
export const WORKSPACE_BACKGROUND = "#1E1E2E";

const RULE_OF_THIRDS_COLOR = "rgba(248, 250, 252, 0.4)";

/** UI sliders are 0-100 (50 = neutral) — mapped onto CSS filter()'s 0-200%-ish native range. */
export function buildFilterString(filters: FilterState): string {
  const pct = (value: number) => Math.max(0, 100 + (value - 50) * 2);
  return `brightness(${pct(filters.exposure)}%) contrast(${pct(filters.contrast)}%) saturate(${pct(filters.saturation)}%)`;
}

interface RenderSceneOptions {
  layers: EngineLayer[];
  viewport: Viewport;
  documentSize: { width: number; height: number };
  pixelRatio: number;
  showGrid?: boolean;
  /** When set (Before preview), draws only this cover-fit bitmap instead of the real layer stack. */
  beforeAfterBitmap?: HTMLImageElement | null;
  /** Active crop session, if any — see `drawLayer`'s `cropPreviewBox` param. */
  cropPreview?: { layerId: string; imageBox: Rect } | null;
}

/**
 * `cropPreviewBox`, when set, is the full original bitmap's object-space box for a layer
 * currently in crop mode — drawn uncropped and unrotated so the user can see (and drag) the
 * whole image under the dimmed crop overlay, instead of the normal cropped/rotated draw.
 */
function drawLayer(ctx: CanvasRenderingContext2D, layer: EngineLayer, cropPreviewBox?: Rect | null) {
  if (!layer.visible) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0, layer.opacity / 100));
  ctx.globalCompositeOperation = BLEND_MODE_TO_COMPOSITE_OPERATION[layer.blendMode];
  ctx.filter = buildFilterString(layer.image.filters);

  if (cropPreviewBox) {
    ctx.drawImage(
      layer.image.bitmap,
      0,
      0,
      layer.image.naturalWidth,
      layer.image.naturalHeight,
      cropPreviewBox.x,
      cropPreviewBox.y,
      cropPreviewBox.width,
      cropPreviewBox.height,
    );
    ctx.restore();
    return;
  }

  const center = getCenter(layer.transform);
  const { width: rw, height: rh } = getRenderedSize(layer.transform);
  ctx.translate(center.x, center.y);
  ctx.rotate((layer.transform.rotation * Math.PI) / 180);
  ctx.drawImage(
    layer.image.bitmap,
    layer.image.cropX,
    layer.image.cropY,
    layer.transform.width,
    layer.transform.height,
    -rw / 2,
    -rh / 2,
    rw,
    rh,
  );
  ctx.restore();
}

function drawRuleOfThirds(ctx: CanvasRenderingContext2D, layer: EngineLayer) {
  const { x, y, width, height } = { x: layer.transform.x, y: layer.transform.y, ...getRenderedSize(layer.transform) };
  ctx.save();
  ctx.strokeStyle = RULE_OF_THIRDS_COLOR;
  ctx.lineWidth = 1 / ctx.getTransform().a || 1;
  ctx.beginPath();
  ctx.moveTo(x + width / 3, y);
  ctx.lineTo(x + width / 3, y + height);
  ctx.moveTo(x + (width * 2) / 3, y);
  ctx.lineTo(x + (width * 2) / 3, y + height);
  ctx.moveTo(x, y + height / 3);
  ctx.lineTo(x + width, y + height / 3);
  ctx.moveTo(x, y + (height * 2) / 3);
  ctx.lineTo(x + width, y + (height * 2) / 3);
  ctx.stroke();
  ctx.restore();
}

/** Draws the full scene (page background + layers, respecting crop/filters/blend/opacity/rotation) into `ctx`. Used identically for live preview and for export, so there is nothing chrome-specific to exclude — chrome simply never enters this function. */
export function renderScene(ctx: CanvasRenderingContext2D, options: RenderSceneOptions) {
  const { layers, viewport, documentSize, pixelRatio, showGrid, beforeAfterBitmap, cropPreview } = options;

  ctx.save();
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.clearRect(0, 0, documentSize.width, documentSize.height);
  ctx.fillStyle = CARD_SURFACE;
  ctx.fillRect(0, 0, documentSize.width, documentSize.height);
  ctx.restore();

  ctx.save();
  ctx.setTransform(
    viewport.zoom * pixelRatio,
    0,
    0,
    viewport.zoom * pixelRatio,
    viewport.panX * pixelRatio,
    viewport.panY * pixelRatio,
  );

  if (beforeAfterBitmap) {
    const scale = Math.max(documentSize.width / beforeAfterBitmap.width, documentSize.height / beforeAfterBitmap.height);
    const w = beforeAfterBitmap.width * scale;
    const h = beforeAfterBitmap.height * scale;
    ctx.drawImage(beforeAfterBitmap, (documentSize.width - w) / 2, (documentSize.height - h) / 2, w, h);
  } else {
    layers.forEach((layer) =>
      drawLayer(ctx, layer, cropPreview && layer.id === cropPreview.layerId ? cropPreview.imageBox : null),
    );
    // Crop mode draws its own rule-of-thirds guide inside the crop window (CropCanvasFrame) —
    // this one would be misaligned against the layer's pre-crop box, so suppress it.
    if (showGrid && layers[0] && !cropPreview) drawRuleOfThirds(ctx, layers[0]);
  }

  ctx.restore();
}

/** Renders one layer in isolation to a small bitmap (data URL) for filmstrip thumbnails — the new-engine equivalent of Fabric's isolated `toDataURL`. */
export function renderLayerThumbnail(layer: EngineLayer, maxEdge = 96): string | null {
  const { width: rw, height: rh } = getRenderedSize(layer.transform);
  if (rw <= 0 || rh <= 0) return null;
  const scale = maxEdge / Math.max(rw, rh);
  const w = Math.max(1, Math.round(rw * scale));
  const h = Math.max(1, Math.round(rh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.filter = buildFilterString(layer.image.filters);
  ctx.drawImage(layer.image.bitmap, layer.image.cropX, layer.image.cropY, layer.transform.width, layer.transform.height, 0, 0, w, h);
  try {
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}
