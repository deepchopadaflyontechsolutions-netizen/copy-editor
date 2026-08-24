"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { ImagePlus, UploadCloud } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import { useCanvasWorkspaceController } from "@/hooks/useCanvasWorkspaceController";
import { validateImage } from "@/lib/validateImage";
import { renderScene, WORKSPACE_BACKGROUND } from "@/lib/canvasEngine/render";
import CropOverlay from "./CropOverlay";
import CropCanvasFrame from "./CropCanvasFrame";
import AutoCleanOverlay from "./AutoCleanOverlay";
import HealBrushOverlay from "./HealBrushOverlay";
import SelectionOverlay from "./SelectionOverlay";

const DOT_GRID_BACKGROUND = {
  backgroundImage: "radial-gradient(rgba(148,163,184,0.16) 1px, transparent 1px)",
  backgroundSize: "22px 22px",
};

export default function CanvasWorkspace() {
  const workspaceRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);
  const emptyStateInputRef = useRef<HTMLInputElement>(null);
  const {
    notifyContainerResize,
    hasImage,
    isImageLoading,
    isAutoCleaning,
    autoCleanPreview,
    autoCleanMessage,
    autoCleanEllipsePreview,
    healMode,
    documentSize,
    loadImageFromFile,
    placePendingAsset,
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
    commitHistorySnapshot,
    drawingTool,
    showGrid,
    beforeAfterBitmap,
    notice,
  } = useCanvasEngine();
  const [isDragActive, setIsDragActive] = useState(false);

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
    canvas.width = Math.max(1, Math.round(documentSize.width * dpr));
    canvas.height = Math.max(1, Math.round(documentSize.height * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const raf = requestAnimationFrame(() => {
      renderScene(ctx, {
        layers: engineLayers,
        viewport,
        documentSize,
        pixelRatio: dpr,
        showGrid,
        beforeAfterBitmap,
        cropPreview: cropMode && cropLayerId && cropImageBox ? { layerId: cropLayerId, imageBox: cropImageBox } : null,
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [engineLayers, viewport, documentSize, showGrid, beforeAfterBitmap, cropMode, cropLayerId, cropImageBox]);

  const controller = useCanvasWorkspaceController({
    containerRef,
    layers: engineLayers,
    activeLayerId,
    activeLayerIsBase,
    viewport,
    setViewport,
    documentSize,
    drawingTool,
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

  const acceptDroppedFile = useCallback(
    async (file: File | null | undefined) => {
      const result = await validateImage(file);
      if (result.ok) {
        URL.revokeObjectURL(result.data.objectUrl);
        void loadImageFromFile(result.data.file);
      }
    },
    [loadImageFromFile],
  );

  const handleEmptyStateInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      void acceptDroppedFile(file);
    },
    [acceptDroppedFile],
  );

  const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounterRef.current += 1;
    setIsDragActive(true);
  }, []);
  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => event.preventDefault(), []);
  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDragActive(false);
  }, []);
  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragCounterRef.current = 0;
      setIsDragActive(false);
      const assetId = event.dataTransfer.getData("application/x-pending-asset-id");
      if (assetId) {
        void placePendingAsset(assetId);
        return;
      }
      void acceptDroppedFile(event.dataTransfer.files?.[0]);
    },
    [acceptDroppedFile, placePendingAsset],
  );

  return (
    <div
      ref={workspaceRef}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex w-full flex-1 items-center justify-center overflow-hidden p-6"
    >
      <div
        style={{ backgroundColor: WORKSPACE_BACKGROUND, ...DOT_GRID_BACKGROUND }}
        className="inline-flex max-h-full max-w-full items-center justify-center rounded-2xl py-6"
      >
        <div
          ref={containerRef}
          className="relative shrink-0 overflow-visible"
          style={{
            width: documentSize.width || undefined,
            height: documentSize.height || undefined,
            maxWidth: "100%",
            maxHeight: "100%",
            cursor: controller.cursor,
            touchAction: "none",
          }}
          {...controller.containerProps}
        >
          <canvas
            ref={canvasElRef}
            style={{
              display: "block",
              width: documentSize.width,
              height: documentSize.height,
              boxShadow: isDragActive
                ? "0 0 0 3px rgba(59,130,246,0.25), 0 20px 50px rgba(0,0,0,0.3)"
                : controller.isOutOfBounds
                  ? "0 0 0 3px rgba(245,158,11,0.3), 0 20px 50px rgba(0,0,0,0.3)"
                  : "0 20px 50px rgba(0,0,0,0.3)",
            }}
          />

          <SelectionOverlay
            activeLayer={cropMode ? null : activeLayer}
            viewport={viewport}
            guides={controller.guides}
            isOutOfBounds={controller.isOutOfBounds}
            autoCleanEllipse={autoCleanEllipsePreview}
          />

          {!hasImage && (
            <button
              type="button"
              aria-label="Upload an image"
              onClick={() => emptyStateInputRef.current?.click()}
              className="group absolute inset-4 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-700/70 outline-none transition-colors hover:border-blue-500/60 hover:bg-blue-500/5"
              style={{ pointerEvents: isDragActive ? "none" : "auto" }}
            >
              <input ref={emptyStateInputRef} type="file" accept="image/*" hidden onChange={handleEmptyStateInputChange} />
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800/80 text-slate-400 transition-colors group-hover:bg-blue-500/15 group-hover:text-blue-400">
                <ImagePlus size={26} />
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="text-sm font-semibold text-slate-300">Drop an image here</p>
                <p className="text-xs text-slate-500">or click to browse</p>
              </div>
            </button>
          )}

          {hasImage && isDragActive && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-blue-500/10">
              <UploadCloud size={28} className="text-blue-400" />
              <p className="text-sm font-semibold text-blue-400">Drop to add as a new layer</p>
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

          {(notice || autoCleanMessage) && (
            <div className="pointer-events-none absolute left-1/2 top-3 z-4 -translate-x-1/2 rounded-full border border-slate-700/60 bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-lg shadow-black/30 backdrop-blur-md">
              {notice ?? autoCleanMessage}
            </div>
          )}

          {isImageLoading && (
            <div className="absolute inset-0 z-3 flex flex-col items-center justify-center gap-3 bg-slate-950/75 backdrop-blur-[2px]">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
              <p className="text-sm font-semibold text-slate-100">Loading your image…</p>
            </div>
          )}

          {isAutoCleaning && (
            <div className="absolute inset-0 z-3 flex flex-col items-center justify-center gap-3 bg-slate-950/75 backdrop-blur-[2px]">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
              <p className="text-sm font-semibold text-slate-100">Removing marked area…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
