"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { UploadCloud } from "lucide-react";
import { Canvas } from "fabric";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import { validateImage } from "@/lib/validateImage";
import ImageUploader from "@/components/ImageUploader";
import CropOverlay from "./CropOverlay";
import AutoCleanOverlay from "./AutoCleanOverlay";
import HealBrushOverlay from "./HealBrushOverlay";
import CanvasFloatingToolbar from "./CanvasFloatingToolbar";
import type { ValidatedImage } from "@/types/uploader";

// One step lighter than the panel surfaces around it, so the card reads as
// a distinct, elevated "page" against the darker workspace floor — the same
// contrast Canva uses (white page on gray canvas), tuned for this app's dark
// palette instead of a literal light/gray pairing.
const CARD_SURFACE = "#1E293B";

export default function CanvasStage() {
  // The workspace is the full available area — measured so the document can
  // be fit within it. The card itself is sized explicitly to documentSize
  // (the engine's own record of what it just resized the canvas to) rather
  // than left to shrink-wrap its content: Fabric wraps the <canvas> in its
  // own out-of-flow container element, so a content-based CSS size doesn't
  // pick it up.
  const workspaceRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const dragCounterRef = useRef(0);
  const {
    registerCanvas,
    unregisterCanvas,
    notifyContainerResize,
    hasImage,
    isImageLoading,
    isAutoCleaning,
    autoCleanPreview,
    healMode,
    documentSize,
    loadImageFromFile,
    cropMode,
  } = useCanvasEngine();
  const [isDragActive, setIsDragActive] = useState(false);

  useEffect(() => {
    const canvasEl = canvasElRef.current;
    const workspace = workspaceRef.current;
    if (!canvasEl || !workspace) return;

    const { width, height } = workspace.getBoundingClientRect();
    const canvas = new Canvas(canvasEl, {
      width: Math.max(1, Math.floor(width)),
      height: Math.max(1, Math.floor(height)),
      backgroundColor: CARD_SURFACE,
      preserveObjectStacking: true,
    });
    registerCanvas(canvas);
    notifyContainerResize(width, height);
    if (process.env.NODE_ENV === "development") {
      (window as unknown as { __fabricCanvas?: Canvas }).__fabricCanvas = canvas;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width: w, height: h } = entry.contentRect;
      notifyContainerResize(w, h);
    });
    resizeObserver.observe(workspace);

    return () => {
      resizeObserver.disconnect();
      unregisterCanvas();
      void canvas.dispose();
    };
    // Runs exactly once per real mount: registers a single Fabric canvas
    // instance against this <canvas> element and tears it down on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const acceptDroppedFile = useCallback(async (file: File | null | undefined) => {
    const result = await validateImage(file);
    if (result.ok) {
      URL.revokeObjectURL(result.data.objectUrl);
      void loadImageFromFile(result.data.file);
    }
    // Silently ignored invalid drops (wrong type/too large) match the
    // empty-state ImageUploader's own validation — no separate error UI
    // is needed here since this drop target is a secondary entry point.
  }, [loadImageFromFile]);

  const handleImageValidated = (validated: ValidatedImage) => {
    URL.revokeObjectURL(validated.objectUrl);
    void loadImageFromFile(validated.file);
  };

  // Accepts a file dropped anywhere on the canvas stage at any time — not
  // just on the empty-state dropzone — so dragging in a new image while one
  // is already loaded adds it as a new layer instead of doing nothing.
  const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounterRef.current += 1;
    setIsDragActive(true);
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

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
      void acceptDroppedFile(event.dataTransfer.files?.[0]);
    },
    [acceptDroppedFile],
  );

  return (
    // Workspace "floor" — a neutral body-colored gutter that centers the
    // card below, so the card is sized to the document itself (à la Canva's
    // page-on-gray-body layout) instead of stretching to fill whatever
    // space happens to be available.
    <Box
      ref={workspaceRef}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "1 1 0%",
        minWidth: 0,
        minHeight: 0,
        width: "100%",
        bgcolor: "background.default",
        borderRadius: 3,
        p: 4,
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: documentSize.width || undefined,
          height: documentSize.height || undefined,
          maxWidth: "100%",
          maxHeight: "100%",
          flexShrink: 0,
          // Kept small deliberately — this card wraps the full canvas,
          // which now insets the photo from its own edge (see
          // MAX_CANVAS_INSET in CanvasEngineContext) so resize/crop handles
          // have clear room around the image; a heavier radius here would
          // still clip into that margin without adding much.
          borderRadius: "6px",
          overflow: "hidden",
          border: "1px solid",
          borderColor: isDragActive ? "primary.main" : "divider",
          boxShadow: isDragActive
            ? (theme) => `0 0 0 3px ${theme.palette.primary.main}33, 0 24px 48px rgba(0, 0, 0, 0.4)`
            : "0 24px 48px rgba(0, 0, 0, 0.4)",
          bgcolor: CARD_SURFACE,
          transition: "border-color 120ms ease, box-shadow 120ms ease",
        }}
      >
        <canvas ref={canvasElRef} style={{ display: "block" }} />

        {!hasImage && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 3,
              bgcolor: CARD_SURFACE,
              pointerEvents: isDragActive ? "none" : "auto",
            }}
          >
            <Box sx={{ width: "100%", maxWidth: 420 }}>
              <ImageUploader onImageValidated={handleImageValidated} />
            </Box>
          </Box>
        )}

        {hasImage && isDragActive && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              pointerEvents: "none",
              bgcolor: "rgba(0, 123, 255, 0.12)",
            }}
          >
            <UploadCloud size={28} color="#007BFF" />
            <Typography variant="body2" sx={{ color: "primary.main", fontWeight: 600 }}>
              Drop to add as a new layer
            </Typography>
          </Box>
        )}

        {hasImage && !cropMode && !autoCleanPreview && !healMode && <CanvasFloatingToolbar />}
        {hasImage && cropMode && <CropOverlay />}
        {hasImage && autoCleanPreview && <AutoCleanOverlay />}
        {hasImage && healMode && <HealBrushOverlay />}

        {isImageLoading && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1.5,
              zIndex: 3,
              bgcolor: "rgba(11, 18, 32, 0.72)",
              backdropFilter: "blur(2px)",
            }}
          >
            <CircularProgress size={32} sx={{ color: "primary.main" }} />
            <Typography variant="body2" sx={{ color: "#F8FAFC", fontWeight: 600 }}>
              Loading your image…
            </Typography>
          </Box>
        )}

        {isAutoCleaning && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1.5,
              zIndex: 3,
              bgcolor: "rgba(11, 18, 32, 0.72)",
              backdropFilter: "blur(2px)",
            }}
          >
            <CircularProgress size={32} sx={{ color: "primary.main" }} />
            <Typography variant="body2" sx={{ color: "#F8FAFC", fontWeight: 600 }}>
              Removing marked area…
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
