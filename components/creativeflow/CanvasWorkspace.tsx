"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { AnimatePresence } from "framer-motion";
import { Loader2, UploadCloud } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import { useCanvasWorkspaceController } from "@/hooks/useCanvasWorkspaceController";
import { renderScene } from "@/lib/canvasEngine/render";
import { toObject } from "@/lib/canvasEngine/geometry";
import { LAYER_DRAG_MIME_TYPE } from "@/types/canvasEngine";
import CropOverlay from "./CropOverlay";
import CropCanvasFrame from "./CropCanvasFrame";
import AutoCleanOverlay from "./AutoCleanOverlay";
import HealBrushOverlay from "./HealBrushOverlay";
import DrawOverlay from "./DrawOverlay";
import SelectionOverlay from "./SelectionOverlay";
import LayerHandleHotspots from "./LayerHandleHotspots";
import ContextToolbar from "./ContextToolbar";

export default function CanvasWorkspace() {
  const workspaceRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const boardFileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const {
    notifyContainerResize,
    hasImage,
    isImageLoading,
    loadImageFromFile,
    isAutoCleaning,
    autoCleanPreview,
    autoCleanMessage,
    autoCleanEllipsePreview,
    isRemovingBackground,
    backgroundRemovalStatus,
    healMode,
    drawingTool,
    documentSize,
    cropMode,
    cropRect,
    cropImageBox,
    cropLayerId,
    beginCropHandleDrag,
    beginCropBodyDrag,
    updateCropDrag,
    endCropDrag,
    engineLayers,
    activeLayerId,
    activeLayerIsBase,
    viewport,
    setViewport,
    selectLayer,
    deselectLayer,
    updateLayerTransform,
    moveLayerCenterTo,
    commitHistorySnapshot,
    showGrid,
    notice,
  } = useCanvasEngine();
  const [isDragActive, setIsDragActive] = useState(false);
  const [dragKind, setDragKind] = useState<"file" | "layer" | null>(null);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const { width, height } = workspace.getBoundingClientRect();
    notifyContainerResize(width, height);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width: w, height: h } = entry.contentRect;
      notifyContainerResize(w, h);
    });
    resizeObserver.observe(workspace);
    return () => resizeObserver.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = canvasElRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    // Buffer resolution scales with zoom too (not just dpr) — the board container's CSS box is
    // sized to documentSize * zoom, and the canvas fills it 1:1, so the buffer needs that many
    // real pixels behind it to stay crisp instead of being visually stretched by the browser.
    canvas.width = Math.max(1, Math.round(documentSize.width * viewport.zoom * dpr));
    canvas.height = Math.max(1, Math.round(documentSize.height * viewport.zoom * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const raf = requestAnimationFrame(() => {
      renderScene(ctx, {
        layers: engineLayers,
        viewport,
        documentSize,
        pixelRatio: dpr,
        showGrid,
        cropPreview: cropMode && cropLayerId && cropImageBox ? { layerId: cropLayerId, imageBox: cropImageBox } : null,
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [engineLayers, viewport, documentSize, showGrid, cropMode, cropLayerId, cropImageBox]);

  const controller = useCanvasWorkspaceController({
    containerRef,
    wheelTargetRef: workspaceRef,
    layers: engineLayers,
    activeLayerId,
    activeLayerIsBase,
    viewport,
    setViewport,
    documentSize,
    selectLayer,
    deselectLayer,
    updateLayerTransform,
    commitHistorySnapshot,
    cropMode,
    cropRect,
    beginCropHandleDrag,
    beginCropBodyDrag,
    updateCropDrag,
    endCropDrag,
  });

  const activeLayer = activeLayerId ? engineLayers.find((l) => l.id === activeLayerId) ?? null : null;

  const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounterRef.current += 1;
    setIsDragActive(true);
    setDragKind(event.dataTransfer.types.includes(LAYER_DRAG_MIME_TYPE) ? "layer" : "file");
  }, []);
  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => event.preventDefault(), []);
  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsDragActive(false);
      setDragKind(null);
    }
  }, []);
  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragCounterRef.current = 0;
      setIsDragActive(false);
      setDragKind(null);

      const layerId = event.dataTransfer.getData(LAYER_DRAG_MIME_TYPE);
      if (!layerId) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const screenPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const objectPoint = toObject(screenPoint, viewport);
      moveLayerCenterTo(layerId, objectPoint.x, objectPoint.y);
    },
    [moveLayerCenterTo, viewport],
  );

  // First-time upload entry point right on the board itself — the sidebar's
  // Upload panel already covers this, but people naturally try clicking the
  // empty canvas before they look for a sidebar tab.
  const handleBoardFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (file) void loadImageFromFile(file);
    },
    [loadImageFromFile],
  );

  return (
    <div
      ref={workspaceRef}
      data-canvas-workspace
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative w-full flex-1 overflow-hidden p-3 pt-6 sm:p-6 sm:pt-10"
      style={{ cursor: controller.cursor, touchAction: "none" }}
      {...controller.containerProps}
    >
      {/* The zoomable board: sized to documentSize * zoom (a real box resize, not a CSS
          transform: scale) and centered in the workspace, offset by the pan translate. Canvas
          buffer, overlay SVGs, and every other child inside it are all measured/drawn relative
          to this box's own (0,0) origin, so resizing it here is what makes the page, layers, and
          selection/crop bounding boxes grow and shrink together as one unit.

          Pointer handling (hover cursor, drag-start, click-to-select/deselect) is attached on
          the outer workspace div above, not here — a layer's selection border/handles can
          extend past this box (e.g. resized or dragged near the page edge), and this box is
          sized only to the page, not to whatever the active layer grows to. Listening on the
          wider workspace instead means those out-of-box areas still get a working move cursor
          and can still be dragged/resized, while a click that lands outside every layer (either
          still within this box, on empty page, or out in the gray padding) reaches the same
          handler and deselects. */}
        <div
          ref={containerRef}
          data-crop-ui
          className="absolute left-1/2 top-1/2 overflow-visible"
          style={{
            width: documentSize.width * viewport.zoom || undefined,
            height: documentSize.height * viewport.zoom || undefined,
            transform: `translate(-50%, -50%) translate(${viewport.panX}px, ${viewport.panY}px)`,
          }}
        >
          <canvas
            ref={canvasElRef}
            style={{
              display: "block",
              width: documentSize.width * viewport.zoom,
              height: documentSize.height * viewport.zoom,
              boxShadow: isDragActive && dragKind === "layer"
                ? "0 0 0 3px rgba(59,130,246,0.25), 0 20px 50px rgba(0,0,0,0.3)"
                : controller.isOutOfBounds
                  ? "0 0 0 3px rgba(245,158,11,0.3), 0 20px 50px rgba(0,0,0,0.3)"
                  : "0 20px 50px rgba(0,0,0,0.3)",
            }}
          />

          {!hasImage && (
            <>
              <input
                ref={boardFileInputRef}
                type="file"
                accept="image/*"
                hidden
                disabled={isImageLoading}
                onChange={handleBoardFileChange}
                aria-label="Upload image"
              />
              <button
                type="button"
                disabled={isImageLoading}
                onClick={() => !isImageLoading && boardFileInputRef.current?.click()}
                className={`absolute inset-0 z-1 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-neutral-700 bg-neutral-900/40 text-neutral-400 outline-none transition-colors hover:border-neutral-500 hover:bg-neutral-900/60 hover:text-neutral-200 focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-progress ${
                  isImageLoading ? "cursor-progress" : "cursor-pointer"
                }`}
              >
                {isImageLoading ? (
                  <Loader2 size={32} strokeWidth={1.75} className="animate-spin" />
                ) : (
                  <UploadCloud size={32} strokeWidth={1.75} />
                )}
                <span className="text-sm font-semibold">
                  {isImageLoading ? "Adding to canvas…" : "Click to upload an image"}
                </span>
              </button>
            </>
          )}

          <SelectionOverlay
            activeLayer={cropMode || drawingTool === "brush" || drawingTool === "eraser" ? null : activeLayer}
            viewport={viewport}
            guides={controller.guides}
            isOutOfBounds={controller.isOutOfBounds}
            autoCleanEllipse={autoCleanEllipsePreview}
          />

          {activeLayer && !cropMode && drawingTool !== "brush" && drawingTool !== "eraser" && (
            <LayerHandleHotspots activeLayer={activeLayer} viewport={viewport} onHandlePointerDown={controller.beginHandleDrag} />
          )}

          {hasImage && isDragActive && dragKind === "layer" && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-blue-500/10">
              <UploadCloud size={28} className="text-blue-400" />
              <p className="text-sm font-semibold text-blue-400">Drop to move this image here</p>
            </div>
          )}

          {hasImage && controller.isOutOfBounds && !isDragActive && (
            <div className="pointer-events-none absolute bottom-3 left-1/2 z-2 -translate-x-1/2 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-[11px] font-medium text-amber-300 backdrop-blur-sm">
              Part of this layer is outside the page — it will be cut off on export
            </div>
          )}

          {hasImage && cropMode && <CropCanvasFrame />}
          {hasImage && cropMode && <CropOverlay />}
          {hasImage && autoCleanPreview && <AutoCleanOverlay />}
          {hasImage && healMode && <HealBrushOverlay />}
          {hasImage && !cropMode && (drawingTool === "brush" || drawingTool === "eraser") && (
            <DrawOverlay mainCanvasRef={canvasElRef} />
          )}

          {(notice || autoCleanMessage) && (
            <div className="pointer-events-none absolute left-1/2 top-3 z-4 -translate-x-1/2 rounded-full border border-neutral-700/60 bg-neutral-900/90 px-3 py-1.5 text-xs font-medium text-neutral-200 shadow-lg shadow-black/30 backdrop-blur-md">
              {notice ?? autoCleanMessage}
            </div>
          )}

          {isImageLoading && (
            <div className="absolute inset-0 z-3 flex flex-col items-center justify-center gap-3 bg-neutral-950/75 backdrop-blur-[2px]">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
              <p className="text-sm font-semibold text-neutral-100">Loading your image…</p>
            </div>
          )}

          {isAutoCleaning && (
            <div className="absolute inset-0 z-3 flex flex-col items-center justify-center gap-3 bg-neutral-950/75 backdrop-blur-[2px]">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
              <p className="text-sm font-semibold text-neutral-100">Removing marked area…</p>
            </div>
          )}

          {isRemovingBackground && (
            <div className="absolute inset-0 z-3 flex flex-col items-center justify-center gap-3 bg-neutral-950/75 backdrop-blur-[2px]">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
              <p className="text-sm font-semibold text-neutral-100">{backgroundRemovalStatus ?? "Removing background…"}</p>
            </div>
          )}
        </div>

      {/* Rendered as a sibling of the pan/zoom board (not a child of containerRef) so it stays
          fixed and centered at the top of the workspace itself — pan/zoom only resizes and
          translates the board, never this element. */}
      <div data-crop-ui className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2">
        <AnimatePresence>{activeLayerId && !cropMode && <ContextToolbar />}</AnimatePresence>
      </div>
    </div>
  );
}
