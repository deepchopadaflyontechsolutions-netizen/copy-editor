/**
 * "Auto Clean" — automatically locates the small watermark/logo mark that
 * tends to sit in a photo's bottom-right corner and reconstructs just that
 * area from surrounding pixels, entirely with the Canvas 2D API (no
 * backend, no AI service, no third-party library).
 *
 * Split into two phases so the caller can show the detected mask as a
 * preview before committing to any pixel change:
 *
 *  - detectMark()     — read-only. Locates the mark (if any) within a
 *    bottom-right search region and returns a tight, confidence-gated
 *    ellipse mask. Returns null if nothing distinct enough is found, or if
 *    the only candidate is too large/uncertain to trust — callers must
 *    NOT fall back to blurring a big region in that case.
 *  - reconstructMark() — destructive. Given a mask returned by detectMark
 *    (never recomputed — what was previewed is exactly what gets applied),
 *    fills it from nearby pixels (weighted, edge-aware averaging) and
 *    blends the result back in with a small feather at the mask boundary.
 */

export type CanvasImageElement = HTMLImageElement | HTMLCanvasElement;

export interface RegionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MarkEllipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/** A confidence-gated detection result, in native (original-resolution) image pixel coordinates. */
export interface DetectedMark {
  ellipse: MarkEllipse;
  featherPx: number;
  /** Fraction (0..1) of the whole image's area the mask covers — for callers that want to surface it. */
  areaFraction: number;
}

// Bounds the search region so detection/reconstruction cost stays tiny
// regardless of how large the source photo is — matches the brief's
// "small" mark, and keeps the region we're willing to touch bounded.
const MAX_CANDIDATE_PX = 240;
const MIN_CANDIDATE_PX = 24;
const UNKNOWN_ALPHA_EPS = 0.02;

// Confidence/size gates (requirement: never auto-modify on a large or
// uncertain guess). A real small logo/watermark is compact relative to
// both the whole photo and its own bottom-right search box — if the best
// candidate fails either check, detectMark() returns null and nothing is
// touched.
const MAX_AREA_FRACTION_OF_IMAGE = 0.05;
const MAX_BOX_FILL_FRACTION = 0.62;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getElementNaturalSize(element: CanvasImageElement): { width: number; height: number } {
  if (element instanceof HTMLCanvasElement) return { width: element.width, height: element.height };
  return { width: element.naturalWidth || element.width, height: element.naturalHeight || element.height };
}

export function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load reconstructed image"));
    img.src = src;
  });
}

/** A corner search region sized/positioned relative to the image — never a hardcoded pixel or fixed percentage crop. */
function computeCandidateBox(width: number, height: number): RegionRect {
  const boxW = clamp(Math.round(width * 0.16), MIN_CANDIDATE_PX, Math.min(MAX_CANDIDATE_PX, width - 4));
  const boxH = clamp(Math.round(height * 0.16), MIN_CANDIDATE_PX, Math.min(MAX_CANDIDATE_PX, height - 4));
  const marginX = clamp(Math.round(width * 0.015), 2, 40);
  const marginY = clamp(Math.round(height * 0.015), 2, 40);
  const x = clamp(width - boxW - marginX, 0, Math.max(0, width - boxW));
  const y = clamp(height - boxH - marginY, 0, Math.max(0, height - boxH));
  return { x, y, width: boxW, height: boxH };
}

function sampleAverageColor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): number[] {
  if (w <= 0 || h <= 0) return [0, 0, 0];
  const { data } = ctx.getImageData(x, y, w, h);
  let r = 0;
  let g = 0;
  let b = 0;
  const count = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  return [r / count, g / count, b / count];
}

function averageColors(colors: number[][]): number[] {
  const r = colors.reduce((s, c) => s + c[0], 0) / colors.length;
  const g = colors.reduce((s, c) => s + c[1], 0) / colors.length;
  const b = colors.reduce((s, c) => s + c[2], 0) / colors.length;
  return [r, g, b];
}

/**
 * Finds the tight bounding box of whatever visually deviates from the
 * surrounding background within the candidate box. Returns null the moment
 * nothing confidently distinct is found — callers must not substitute a
 * generic/large area when this happens.
 */
function findTightMarkBounds(
  ctx: CanvasRenderingContext2D,
  box: RegionRect,
  imgW: number,
  imgH: number,
): { minX: number; minY: number; maxX: number; maxY: number; boxWidth: number; boxHeight: number } | null {
  const stripW = Math.max(8, Math.round(box.width * 0.5));
  const stripH = Math.max(8, Math.round(box.height * 0.5));

  const leftStripX = clamp(box.x - stripW, 0, imgW - 1);
  const leftStripWidth = Math.max(0, box.x - leftStripX);
  const topStripY = clamp(box.y - stripH, 0, imgH - 1);
  const topStripHeight = Math.max(0, box.y - topStripY);

  const backgroundSamples: number[][] = [];
  if (leftStripWidth > 0) backgroundSamples.push(sampleAverageColor(ctx, leftStripX, box.y, leftStripWidth, box.height));
  if (topStripHeight > 0) backgroundSamples.push(sampleAverageColor(ctx, box.x, topStripY, box.width, topStripHeight));
  const background = averageColors(
    backgroundSamples.length ? backgroundSamples : [sampleAverageColor(ctx, box.x, box.y, box.width, box.height)],
  );

  const boxData = ctx.getImageData(box.x, box.y, box.width, box.height);
  const { data, width: bw, height: bh } = boxData;
  const scores = new Float32Array(bw * bh);
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < bw * bh; i++) {
    const o = i * 4;
    const dr = data[o] - background[0];
    const dg = data[o + 1] - background[1];
    const db = data[o + 2] - background[2];
    const score = Math.sqrt(dr * dr + dg * dg + db * db);
    scores[i] = score;
    sum += score;
    sumSq += score * score;
  }
  const mean = sum / scores.length;
  const variance = Math.max(0, sumSq / scores.length - mean * mean);
  const std = Math.sqrt(variance);
  // Two thresholds (a hysteresis pair, as in Canny edge detection): a strict
  // one just to confirm a mark is actually present (avoids flagging a plain
  // textured corner as "content"), and a looser one to size the bounding
  // box. Marks are rarely uniform — a solid dark badge behind bright text
  // has a faint, low-contrast fill next to a very high-contrast letter — so
  // sizing the box off the strict threshold alone under-detects the mark's
  // true extent and leaves its fainter edges/corners uncleaned.
  const highThreshold = mean + Math.max(18, std * 1.1);
  const lowThreshold = mean + Math.max(8, std * 0.35);

  let minX = bw;
  let minY = bh;
  let maxX = -1;
  let maxY = -1;
  let looseCount = 0;
  let strictCount = 0;
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const idx = y * bw + x;
      if (scores[idx] > highThreshold) strictCount++;
      if (scores[idx] <= lowThreshold) continue;
      // Light denoise: require at least one similarly-scored 4-neighbor so
      // single stray pixels don't count as "content".
      const hasNeighbor =
        (x > 0 && scores[idx - 1] > lowThreshold) ||
        (x < bw - 1 && scores[idx + 1] > lowThreshold) ||
        (y > 0 && scores[idx - bw] > lowThreshold) ||
        (y < bh - 1 && scores[idx + bw] > lowThreshold);
      if (!hasNeighbor) continue;
      looseCount++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  const boxArea = bw * bh;
  const validDetection =
    maxX >= minX && maxY >= minY && strictCount >= boxArea * 0.008 && looseCount <= boxArea * 0.92;
  if (!validDetection) return null;

  return { minX, minY, maxX, maxY, boxWidth: bw, boxHeight: bh };
}

/**
 * Phase 1 — read-only detection. Locates the mark (if any) within the
 * bottom-right corner and returns a tight, confidence-gated mask, or null
 * if nothing should be touched (nothing distinct found, or the best
 * candidate is too large/uncertain to trust).
 */
export function detectMark(ctx: CanvasRenderingContext2D, imgW: number, imgH: number): DetectedMark | null {
  const box = computeCandidateBox(imgW, imgH);
  const bounds = findTightMarkBounds(ctx, box, imgW, imgH);
  if (!bounds) return null;

  const tightW = bounds.maxX - bounds.minX + 1;
  const tightH = bounds.maxY - bounds.minY + 1;

  // A candidate that fills most of its own search box isn't a compact,
  // isolated mark — it's more likely a busy/textured corner (sky, foliage,
  // fabric) being mistaken for one. Bail rather than guess.
  const boxFillFraction = (tightW * tightH) / (bounds.boxWidth * bounds.boxHeight);
  if (boxFillFraction > MAX_BOX_FILL_FRACTION) return null;

  // Most marks/logos are rectangular (badges, text boxes), so an ellipse
  // merely padded around the tight bounding box still leaves its corners
  // uncovered — an ellipse inscribed in a rectangle never reaches the
  // corners. Scaling the half-extents by sqrt(2) is the exact factor at
  // which an ellipse fully circumscribes that rectangle (corner point
  // (halfW, halfH) lands just inside); a little extra on top covers
  // detection noise at the edge.
  const halfW = tightW / 2;
  const halfH = tightH / 2;
  const coverageFactor = 1.5;
  const rx = clamp(halfW * coverageFactor, 6, box.width);
  const ry = clamp(halfH * coverageFactor, 6, box.height);

  const areaFraction = (Math.PI * rx * ry) / (imgW * imgH);
  if (areaFraction > MAX_AREA_FRACTION_OF_IMAGE) return null;

  // Small and tight on purpose: only the mask boundary itself should
  // blend, not a wide halo into surrounding, unrelated image content.
  const featherPx = clamp(Math.round(Math.min(rx, ry) * 0.12), 2, 8);

  return {
    ellipse: {
      cx: box.x + bounds.minX + halfW,
      cy: box.y + bounds.minY + halfH,
      rx,
      ry,
    },
    featherPx,
    areaFraction,
  };
}

/** Convenience wrapper: draws a source element to an offscreen canvas and runs detectMark against it. */
export function detectMarkFromElement(
  sourceElement: CanvasImageElement,
  nativeWidth: number,
  nativeHeight: number,
): DetectedMark | null {
  const canvas = document.createElement("canvas");
  canvas.width = nativeWidth;
  canvas.height = nativeHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(sourceElement, 0, 0, nativeWidth, nativeHeight);
  return detectMark(ctx, nativeWidth, nativeHeight);
}

function expandToWorkingRect(ellipse: MarkEllipse, featherPx: number, imgW: number, imgH: number): RegionRect {
  const pad = featherPx + 2;
  const x0 = clamp(Math.floor(ellipse.cx - ellipse.rx - pad), 0, imgW - 1);
  const y0 = clamp(Math.floor(ellipse.cy - ellipse.ry - pad), 0, imgH - 1);
  const x1 = clamp(Math.ceil(ellipse.cx + ellipse.rx + pad), 0, imgW);
  const y1 = clamp(Math.ceil(ellipse.cy + ellipse.ry + pad), 0, imgH);
  return { x: x0, y: y0, width: Math.max(1, x1 - x0), height: Math.max(1, y1 - y0) };
}

/** Soft elliptical mask, 1 inside the mark, smoothstepping to 0 over `featherPx`. */
function buildFeatherAlpha(rect: RegionRect, ellipse: MarkEllipse, featherPx: number): Float32Array {
  const alpha = new Float32Array(rect.width * rect.height);
  const featherNorm = Math.max(featherPx / Math.max(1, ellipse.rx), featherPx / Math.max(1, ellipse.ry), 0.03);
  for (let y = 0; y < rect.height; y++) {
    const py = rect.y + y;
    const ny = (py - ellipse.cy) / ellipse.ry;
    for (let x = 0; x < rect.width; x++) {
      const px = rect.x + x;
      const nx = (px - ellipse.cx) / ellipse.rx;
      const d = Math.sqrt(nx * nx + ny * ny);
      let a: number;
      if (d <= 1) a = 1;
      else if (d >= 1 + featherNorm) a = 0;
      else {
        const t = 1 - (d - 1) / featherNorm;
        a = t * t * (3 - 2 * t); // smoothstep
      }
      alpha[y * rect.width + x] = a;
    }
  }
  return alpha;
}

interface NeighborOffset {
  dx: number;
  dy: number;
  dist: number;
}

function buildNeighborOffsets(): NeighborOffset[] {
  const offsets: NeighborOffset[] = [];
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (dx === 0 && dy === 0) continue;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 2.05) continue;
      offsets.push({ dx, dy, dist });
    }
  }
  return offsets;
}

function hasKnownNeighbor(idx: number, w: number, h: number, known: Uint8Array, offsets: NeighborOffset[]): boolean {
  const x = idx % w;
  const y = (idx / w) | 0;
  for (const { dx, dy, dist } of offsets) {
    if (dist > 1.5) continue; // immediate 8-neighborhood only, defines the ring boundary
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
    if (known[ny * w + nx]) return true;
  }
  return false;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Reconstructs one unknown pixel from its already-known neighbors (up to a
 * radius of 2, i.e. "multiple nearby samples"), weighted by both spatial
 * distance and color similarity to the neighborhood's median. The
 * color-similarity term is what gives edge/gradient preservation: neighbors
 * on the "wrong side" of a nearby edge diverge from the median and get
 * down-weighted, so the fill is pulled from the consistent side instead of
 * blurring across the edge.
 */
function computeWeightedColor(
  idx: number,
  w: number,
  h: number,
  work: Uint8ClampedArray,
  known: Uint8Array,
  offsets: NeighborOffset[],
): number[] {
  const x = idx % w;
  const y = (idx / w) | 0;
  const neighbors: { r: number; g: number; b: number; dist: number }[] = [];

  for (const { dx, dy, dist } of offsets) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
    const nIdx = ny * w + nx;
    if (!known[nIdx]) continue;
    const o = nIdx * 4;
    neighbors.push({ r: work[o], g: work[o + 1], b: work[o + 2], dist });
  }

  if (neighbors.length === 0) {
    const o = idx * 4;
    return [work[o], work[o + 1], work[o + 2]];
  }

  const medR = median(neighbors.map((n) => n.r));
  const medG = median(neighbors.map((n) => n.g));
  const medB = median(neighbors.map((n) => n.b));

  const SPATIAL_SIGMA = 1.4;
  const COLOR_SIGMA = 28;

  let wr = 0;
  let wg = 0;
  let wb = 0;
  let wsum = 0;
  for (const n of neighbors) {
    const spatialW = Math.exp(-(n.dist * n.dist) / (2 * SPATIAL_SIGMA * SPATIAL_SIGMA));
    const colorDist = Math.sqrt((n.r - medR) ** 2 + (n.g - medG) ** 2 + (n.b - medB) ** 2);
    const colorW = Math.exp(-(colorDist * colorDist) / (2 * COLOR_SIGMA * COLOR_SIGMA));
    const weight = spatialW * colorW;
    wr += n.r * weight;
    wg += n.g * weight;
    wb += n.b * weight;
    wsum += weight;
  }

  if (wsum <= 1e-6) return [medR, medG, medB];
  return [wr / wsum, wg / wsum, wb / wsum];
}

function writeColor(work: Uint8ClampedArray, idx: number, color: number[]): void {
  const o = idx * 4;
  work[o] = color[0];
  work[o + 1] = color[1];
  work[o + 2] = color[2];
  work[o + 3] = 255;
}

function averageKnownColor(src: Uint8ClampedArray, known: Uint8Array, total: number): number[] {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let i = 0; i < total; i++) {
    if (!known[i]) continue;
    const o = i * 4;
    r += src[o];
    g += src[o + 1];
    b += src[o + 2];
    count++;
  }
  if (count === 0) return [128, 128, 128];
  return [r / count, g / count, b / count];
}

/**
 * Fills every pixel whose feather alpha is non-negligible by peeling inward
 * from the mask boundary in rings (each ring reconstructed only from
 * already-known pixels: original background or earlier rings), the classic
 * boundary-driven inpainting approach. Never touches a pixel outside the
 * (small, feathered) mask.
 */
function inpaintRegion(original: ImageData, alpha: Float32Array, w: number, h: number): Uint8ClampedArray {
  const src = original.data;
  const work = new Uint8ClampedArray(src.length);
  work.set(src);

  const total = w * h;
  const known = new Uint8Array(total);
  const remaining = new Set<number>();
  for (let i = 0; i < total; i++) {
    if (alpha[i] > UNKNOWN_ALPHA_EPS) {
      known[i] = 0;
      remaining.add(i);
    } else {
      known[i] = 1;
    }
  }

  if (remaining.size === 0) return work;

  const fallback = averageKnownColor(src, known, total);
  const offsets = buildNeighborOffsets();
  const maxRings = w + h; // generous upper bound; real ring count is far smaller

  let guard = 0;
  while (remaining.size > 0 && guard < maxRings) {
    guard++;
    const frontier: number[] = [];
    for (const idx of remaining) {
      if (hasKnownNeighbor(idx, w, h, known, offsets)) frontier.push(idx);
    }

    if (frontier.length === 0) {
      // No unknown pixel touches a known one — shouldn't happen for a
      // bounded hole, but flush the rest with a safe fallback rather than
      // looping forever.
      for (const idx of remaining) writeColor(work, idx, fallback);
      break;
    }

    // Colors for the whole ring are computed from the *previous* ring's
    // state before any of them are written, so pixels within the same ring
    // never lean on each other — only on strictly earlier, settled data.
    const updates = frontier.map((idx) => ({ idx, color: computeWeightedColor(idx, w, h, work, known, offsets) }));
    for (const { idx, color } of updates) {
      writeColor(work, idx, color);
      known[idx] = 1;
      remaining.delete(idx);
    }
  }

  return work;
}

/** Blends the reconstruction back over the original using the feather mask. */
function compositeResult(original: ImageData, filled: Uint8ClampedArray, alpha: Float32Array): ImageData {
  const out = new ImageData(original.width, original.height);
  const src = original.data;
  const data = out.data;
  for (let i = 0; i < alpha.length; i++) {
    const o = i * 4;
    const a = alpha[i];
    if (a <= 0) {
      data[o] = src[o];
      data[o + 1] = src[o + 1];
      data[o + 2] = src[o + 2];
      data[o + 3] = src[o + 3];
      continue;
    }
    data[o] = src[o] + (filled[o] - src[o]) * a;
    data[o + 1] = src[o + 1] + (filled[o + 1] - src[o + 1]) * a;
    data[o + 2] = src[o + 2] + (filled[o + 2] - src[o + 2]) * a;
    data[o + 3] = 255;
  }
  return out;
}

/** A native-pixel-space region to reconstruct, with a per-pixel alpha mask (0..1) over it. */
export interface MaskedRegion {
  rect: RegionRect;
  alpha: Float32Array;
}

/**
 * Shared reconstruction core: draws the source at full resolution, fills
 * `region.rect`'s masked pixels from their immediate surroundings, blends
 * the result back in via `region.alpha`, and returns a same-size,
 * same-resolution canvas. Used by both automatic (ellipse mask) and manual
 * (hand-painted mask) callers so they share one reconstruction path. Yields
 * one paint frame first so a caller-driven loading indicator is visible
 * before the (synchronous, but bounded and fast) pixel work runs.
 */
async function reconstructRegion(
  sourceElement: CanvasImageElement,
  nativeWidth: number,
  nativeHeight: number,
  region: MaskedRegion,
): Promise<HTMLCanvasElement> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const fullCanvas = document.createElement("canvas");
  fullCanvas.width = nativeWidth;
  fullCanvas.height = nativeHeight;
  const fullCtx = fullCanvas.getContext("2d", { willReadFrequently: true });
  if (!fullCtx) throw new Error("Canvas 2D context unavailable");
  fullCtx.drawImage(sourceElement, 0, 0, nativeWidth, nativeHeight);

  const { rect, alpha } = region;
  const original = fullCtx.getImageData(rect.x, rect.y, rect.width, rect.height);
  const filled = inpaintRegion(original, alpha, rect.width, rect.height);
  const composited = compositeResult(original, filled, alpha);

  fullCtx.putImageData(composited, rect.x, rect.y);
  return fullCanvas;
}

/**
 * Phase 2 (automatic) — reconstructs exactly the mask a caller already
 * showed as a preview (via detectMark/detectMarkFromElement — never
 * recomputed here).
 */
export async function reconstructMark(
  sourceElement: CanvasImageElement,
  nativeWidth: number,
  nativeHeight: number,
  mark: DetectedMark,
): Promise<HTMLCanvasElement> {
  const { ellipse, featherPx } = mark;
  const rect = expandToWorkingRect(ellipse, featherPx, nativeWidth, nativeHeight);
  const alpha = buildFeatherAlpha(rect, ellipse, featherPx);
  return reconstructRegion(sourceElement, nativeWidth, nativeHeight, { rect, alpha });
}

/**
 * Phase 2 (manual) — reconstructs a caller-supplied region/mask, e.g. one
 * rasterized from a user's heal-brush strokes. The mask is used as-is
 * (already feathered by the caller if desired via featherAlphaMask below).
 */
export async function reconstructManualMask(
  sourceElement: CanvasImageElement,
  nativeWidth: number,
  nativeHeight: number,
  region: MaskedRegion,
): Promise<HTMLCanvasElement> {
  return reconstructRegion(sourceElement, nativeWidth, nativeHeight, region);
}

/**
 * Softens a binary-ish alpha mask's edges with a small separable box blur
 * (a cheap, good-enough approximation of a Gaussian for a couple of
 * pixels of radius) — used to feather a hand-painted mask the same way the
 * automatic ellipse mask is feathered, without a hard stroke-edge seam.
 */
export function featherAlphaMask(alpha: Float32Array, w: number, h: number, radiusPx: number): Float32Array {
  const radius = Math.max(0, Math.round(radiusPx));
  if (radius === 0) return alpha;

  const blurPass = (src: Float32Array): Float32Array => {
    const out = new Float32Array(src.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let count = 0;
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          sum += src[y * w + nx];
          count++;
        }
        out[y * w + x] = sum / count;
      }
    }
    const out2 = new Float32Array(src.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= h) continue;
          sum += out[ny * w + x];
          count++;
        }
        out2[y * w + x] = sum / count;
      }
    }
    return out2;
  };

  return blurPass(alpha);
}
