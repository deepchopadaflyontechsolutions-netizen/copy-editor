"use client";

import { useCallback, useMemo, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import { objectToNative, toObject } from "@/lib/canvasEngine/geometry";
import type { Point } from "@/lib/canvasEngine/types";

interface DrawOverlayProps {
  /** The board's own visible `<canvas>` (owned by CanvasWorkspace) — the live preview is
   *  painted directly onto it (in raw buffer-pixel space) so there is no second, separately
   *  stacked canvas element to keep in sync; CanvasWorkspace's normal render effect naturally
   *  overwrites these temporary pixels the next time layers/viewport change (in particular,
   *  right after this stroke's own commit). */
  mainCanvasRef: RefObject<HTMLCanvasElement | null>;
}

/**
 * Freehand pen/marker and eraser tools — active whenever `drawingTool` is
 * "brush" or "eraser". Two things happen per pointer move, in parallel:
 *  - a purely visual stroke is painted straight onto the board's existing
 *    canvas, so the user sees the erase/draw happen immediately under the
 *    cursor, the way Canva's brush/eraser do;
 *  - the same segment is also painted onto an offscreen working canvas
 *    scoped to just the active layer's visible crop window, in native
 *    bitmap-pixel space, which is what actually gets merged back into the
 *    layer and pushed onto undo history once the pointer is released.
 */
export default function DrawOverlay({ mainCanvasRef }: DrawOverlayProps) {
  const { viewport, brushColor, brushWidth, activeLayerId, engineLayers, drawingTool, commitLayerBitmapEdit } =
    useCanvasEngine();
  const isErasing = drawingTool === "eraser";

  const activeLayer = useMemo(
    () => engineLayers.find((l) => l.id === activeLayerId) ?? null,
    [engineLayers, activeLayerId],
  );

  const workingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const workingCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastLocalPointRef = useRef<Point | null>(null);
  const lastScreenPointRef = useRef<Point | null>(null);
  const isDrawingRef = useRef(false);

  const getPoints = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>): { screenPoint: Point; localPoint: Point } | null => {
      if (!activeLayer) return null;
      const rect = event.currentTarget.getBoundingClientRect();
      const screenPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const objectPoint = toObject(screenPoint, viewport);
      // "Local" = relative to the visible crop window's own origin (crop=0
      // instead of the layer's real cropX/cropY) — the space the offscreen
      // working canvas, sized to just that window, is drawn in.
      const localPoint = {
        x: objectToNative(objectPoint.x, activeLayer.transform.x, activeLayer.transform.scaleX, 0),
        y: objectToNative(objectPoint.y, activeLayer.transform.y, activeLayer.transform.scaleY, 0),
      };
      return { screenPoint, localPoint };
    },
    [activeLayer, viewport],
  );

  const strokeWorkingCanvas = useCallback(
    (from: Point, to: Point) => {
      const ctx = workingCtxRef.current;
      if (!ctx || !activeLayer) return;
      // The layer is always scaled uniformly (resize handles preserve
      // aspect ratio), so scaleX/scaleY are interchangeable — averaging
      // just guards against float drift between the two.
      const nativeWidth = Math.max(1, brushWidth / ((activeLayer.transform.scaleX + activeLayer.transform.scaleY) / 2));
      const isDot = from.x === to.x && from.y === to.y;
      ctx.save();
      ctx.globalCompositeOperation = isErasing ? "destination-out" : "source-over";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = nativeWidth;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      // A stationary click has from === to — an unstroked zero-length path
      // draws nothing at all, even with round caps, so nudge it into a dot.
      ctx.lineTo(isDot ? to.x + 0.01 : to.x, to.y);
      ctx.stroke();
      ctx.restore();
    },
    [activeLayer, brushColor, brushWidth, isErasing],
  );

  const strokeMainCanvasLive = useCallback(
    (from: Point, to: Point) => {
      const canvas = mainCanvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      // Buffer-pixel space: the canvas's internal resolution is
      // documentSize*zoom*dpr while `from`/`to` are CSS px relative to the
      // same board container the canvas fills 1:1 at 100% * dpr.
      const scale = dpr;
      const isDot = from.x === to.x && from.y === to.y;
      ctx.save();
      ctx.globalCompositeOperation = isErasing ? "destination-out" : "source-over";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = Math.max(1, brushWidth * viewport.zoom * scale);
      ctx.beginPath();
      ctx.moveTo(from.x * scale, from.y * scale);
      ctx.lineTo(isDot ? to.x * scale + 0.01 : to.x * scale, to.y * scale);
      ctx.stroke();
      ctx.restore();
    },
    [brushColor, brushWidth, isErasing, mainCanvasRef, viewport.zoom],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!activeLayer) return;

      // Seed the offscreen working canvas with exactly the currently-visible
      // crop window of the bitmap — matches what render.ts already draws
      // for this layer, so the merged result lines up pixel-for-pixel with
      // what was on screen the instant before this stroke started.
      const { image, transform } = activeLayer;
      let workingCanvas = workingCanvasRef.current;
      if (!workingCanvas) {
        workingCanvas = document.createElement("canvas");
        workingCanvasRef.current = workingCanvas;
      }
      workingCanvas.width = transform.width;
      workingCanvas.height = transform.height;
      const ctx = workingCanvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(image.bitmap, image.cropX, image.cropY, transform.width, transform.height, 0, 0, transform.width, transform.height);
      workingCtxRef.current = ctx;

      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      isDrawingRef.current = true;

      const points = getPoints(event);
      if (!points) return;
      lastLocalPointRef.current = points.localPoint;
      lastScreenPointRef.current = points.screenPoint;
      // Stamp a dot immediately so a plain click (no drag) still lands one.
      strokeWorkingCanvas(points.localPoint, points.localPoint);
      strokeMainCanvasLive(points.screenPoint, points.screenPoint);
    },
    [activeLayer, getPoints, strokeMainCanvasLive, strokeWorkingCanvas],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDrawingRef.current) return;
      event.stopPropagation();
      const points = getPoints(event);
      const lastLocal = lastLocalPointRef.current;
      const lastScreen = lastScreenPointRef.current;
      if (!points || !lastLocal || !lastScreen) return;
      strokeWorkingCanvas(lastLocal, points.localPoint);
      strokeMainCanvasLive(lastScreen, points.screenPoint);
      lastLocalPointRef.current = points.localPoint;
      lastScreenPointRef.current = points.screenPoint;
    },
    [getPoints, strokeMainCanvasLive, strokeWorkingCanvas],
  );

  const finishStroke = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDrawingRef.current) return;
      event.stopPropagation();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      isDrawingRef.current = false;
      lastLocalPointRef.current = null;
      lastScreenPointRef.current = null;

      const workingCanvas = workingCanvasRef.current;
      const layer = activeLayer;
      if (!workingCanvas || !layer) return;

      // Merge the edited crop-window canvas back into a copy of the full
      // original bitmap at its (cropX, cropY) offset — handles both a
      // never-cropped layer (cropX/cropY 0, window == full image) and one
      // that was cropped earlier, the same way. This (not the temporary
      // live strokes on the main canvas) is the actual source of truth;
      // committing it triggers the board's normal re-render, which
      // overwrites the temporary live pixels with the real, permanent result.
      const { image, transform } = layer;
      const fullCanvas = document.createElement("canvas");
      fullCanvas.width = image.naturalWidth;
      fullCanvas.height = image.naturalHeight;
      const fullCtx = fullCanvas.getContext("2d");
      if (!fullCtx) return;
      fullCtx.drawImage(image.bitmap, 0, 0, image.naturalWidth, image.naturalHeight);
      fullCtx.clearRect(image.cropX, image.cropY, transform.width, transform.height);
      fullCtx.drawImage(workingCanvas, image.cropX, image.cropY);

      void commitLayerBitmapEdit(fullCanvas.toDataURL("image/png"));
    },
    [activeLayer, commitLayerBitmapEdit],
  );

  if (!activeLayer) return null;

  return (
    <div
      className={`absolute inset-0 z-5 ${isErasing ? "cursor-cell" : "cursor-crosshair"}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishStroke}
      onPointerCancel={finishStroke}
    />
  );
}
