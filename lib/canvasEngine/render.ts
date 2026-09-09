import { BLEND_MODE_TO_COMPOSITE_OPERATION, type FilterState } from "@/types/canvasEngine";
import { getCenter, getRenderedSize } from "./geometry";
import type { EngineLayer, Rect, Viewport } from "./types";

/** Card/page background behind every layer — one step lighter than the workspace floor around it, matching the old Fabric-based card's own surface color. */
export const CARD_SURFACE = "#262626";
/** Workspace "floor" behind the document card. */
export const WORKSPACE_BACKGROUND = "#171717";

const RULE_OF_THIRDS_COLOR = "rgba(248, 250, 252, 0.4)";

/** Traces a rounded-rect path centered on the current origin (i.e. `w`/`h` straddle 0,0) — used instead of the newer `ctx.roundRect` for broader browser support. */
function traceCenteredRoundRect(ctx: CanvasRenderingContext2D, w: number, h: number, radius: number) {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  const x = -w / 2;
  const y = -h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * UI sliders are either 0-100 (50 = neutral, via `pct`) or bipolar -100..100
 * (0 = neutral, via `biPct`) — both mapped onto CSS filter()'s native range.
 * Temperature/tint/hue have no direct CSS filter equivalent, so they're
 * approximated by composing sepia() and hue-rotate() — a stylistic
 * approximation rather than a colorimetrically accurate white-balance shift.
 */
export function buildFilterString(filters: FilterState): string {
  const pct = (value: number) => Math.max(0, 100 + (value - 50) * 2);
  const biPct = (value: number, strength: number) => Math.max(0, 100 + value * strength);
  const hueDeg = (filters.hue / 100) * 180 + (filters.tint / 100) * 15 - (filters.temperature / 100) * 20;
  const sepiaAmount = (Math.max(0, filters.temperature) / 100) * 0.3;

  return [
    `brightness(${pct(filters.exposure)}%)`,
    `brightness(${biPct(filters.exposureAdjust, 0.6)}%)`,
    `contrast(${pct(filters.contrast)}%)`,
    `contrast(${biPct(filters.black, 0.5)}%)`,
    `saturate(${pct(filters.saturation)}%)`,
    `saturate(${biPct(filters.vibrance, 0.4)}%)`,
    sepiaAmount > 0 ? `sepia(${sepiaAmount})` : null,
    hueDeg !== 0 ? `hue-rotate(${hueDeg}deg)` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

interface RenderSceneOptions {
  layers: EngineLayer[];
  viewport: Viewport;
  documentSize: { width: number; height: number };
  pixelRatio: number;
  showGrid?: boolean;
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
  ctx.scale(layer.transform.flipX ? -1 : 1, layer.transform.flipY ? -1 : 1);
  if (layer.cornerRadius > 0) {
    traceCenteredRoundRect(ctx, rw, rh, layer.cornerRadius);
    ctx.clip();
  }
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
  const { layers, viewport, documentSize, pixelRatio, showGrid, cropPreview } = options;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();

  // Panning is a CSS translate on the board container itself (see
  // CanvasWorkspace), not a shift baked into the raster — the canvas buffer
  // is sized to `documentSize * zoom` and always drawn filling it edge to
  // edge, so only `zoom` (not `viewport.panX`/`panY`) belongs in this matrix.
  ctx.save();
  ctx.setTransform(viewport.zoom * pixelRatio, 0, 0, viewport.zoom * pixelRatio, 0, 0);

  ctx.fillStyle = CARD_SURFACE;
  ctx.fillRect(0, 0, documentSize.width, documentSize.height);

  layers.forEach((layer) =>
    drawLayer(ctx, layer, cropPreview && layer.id === cropPreview.layerId ? cropPreview.imageBox : null),
  );
  // Crop mode draws its own rule-of-thirds guide inside the crop window (CropCanvasFrame) —
  // this one would be misaligned against the layer's pre-crop box, so suppress it.
  if (showGrid && layers[0] && !cropPreview) drawRuleOfThirds(ctx, layers[0]);

  ctx.restore();
}

/** Renders one layer in isolation to a small bitmap (data URL) for filmstrip thumbnails — the new-engine equivalent of Fabric's isolated `toDataURL`. `maxEdge` is in CSS px; the bitmap itself is rendered at the display's device pixel ratio so it stays crisp when the `<img>` is upscaled on retina screens. */
export function renderLayerThumbnail(layer: EngineLayer, maxEdge = 160): string | null {
  const { width: rw, height: rh } = getRenderedSize(layer.transform);
  if (rw <= 0 || rh <= 0) return null;
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const scale = (maxEdge * dpr) / Math.max(rw, rh);
  const w = Math.max(1, Math.round(rw * scale));
  const h = Math.max(1, Math.round(rh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.filter = buildFilterString(layer.image.filters);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(layer.transform.flipX ? -1 : 1, layer.transform.flipY ? -1 : 1);
  if (layer.cornerRadius > 0) {
    traceCenteredRoundRect(ctx, w, h, layer.cornerRadius * scale);
    ctx.clip();
  }
  ctx.drawImage(
    layer.image.bitmap,
    layer.image.cropX,
    layer.image.cropY,
    layer.transform.width,
    layer.transform.height,
    -w / 2,
    -h / 2,
    w,
    h,
  );
  ctx.restore();
  try {
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}
