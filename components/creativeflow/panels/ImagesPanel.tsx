"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { motion } from "framer-motion";
import { Expand, Eye, EyeOff, ImageOff, ImagePlus, Trash2, UploadCloud } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import PanelSection from "./PanelSection";

// The sidebar's one upload entry point for anything beyond the very first
// photo (UploadPanel's big dropzone still owns that): drop or pick a file,
// watch it decode as a tray thumbnail, then click or drag that thumbnail
// onto the canvas to actually place it — nothing lands on the canvas just
// from uploading. Already-placed layers render in their own grid below,
// reusing the same click-to-select/hover-action affordances.
export default function ImagesPanel() {
  const {
    hasImage,
    layers,
    activeLayerId,
    selectLayer,
    toggleLayerVisibility,
    deleteLayer,
    getLayerThumbnail,
    pendingAssets,
    addPendingAsset,
    placePendingAsset,
    removePendingAsset,
  } = useCanvasEngine();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const [isDragActive, setIsDragActive] = useState(false);

  const thumbnails = useMemo(() => {
    const next: Record<string, string | null> = {};
    for (const layer of layers) next[layer.id] = getLayerThumbnail(layer.id);
    return next;
  }, [layers, getLayerThumbnail]);

  const itemCount = layers.length + pendingAssets.length;

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (file) addPendingAsset(file);
    },
    [addPendingAsset],
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
      const file = event.dataTransfer.files?.[0];
      if (file) addPendingAsset(file);
    },
    [addPendingAsset],
  );

  const handleAssetDragStart = useCallback((event: DragEvent<HTMLDivElement>, id: string) => {
    event.dataTransfer.setData("application/x-pending-asset-id", id);
    event.dataTransfer.effectAllowed = "copy";
  }, []);

  const openPreview = useCallback((url: string | null) => {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  if (!hasImage && layers.length === 0 && pendingAssets.length === 0) {
    // The big UploadPanel dropzone above already covers this moment —
    // nothing to add here until there's at least one tray asset or layer.
    return null;
  }

  return (
    <PanelSection
      title="Media Library"
      actions={
        itemCount > 0 ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-500/20 px-1.5 text-[10px] font-semibold text-indigo-300">
            {itemCount}
          </span>
        ) : undefined
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleChange}
        aria-label="Upload image"
      />

      <motion.div
        role="button"
        tabIndex={0}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mb-3 flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed py-5 text-center outline-none transition-colors ${
          isDragActive ? "border-indigo-500/50 bg-indigo-500/5" : "border-slate-700 hover:border-indigo-500/50 hover:bg-indigo-500/5"
        }`}
      >
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
            isDragActive ? "bg-indigo-500/20 text-indigo-300" : "bg-slate-800 text-slate-400"
          }`}
        >
          <UploadCloud size={16} />
        </span>
        <p className="text-[11px] font-medium text-slate-300">
          Drag &amp; drop or <span className="text-indigo-400">click to upload</span>
        </p>
      </motion.div>

      {pendingAssets.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          {pendingAssets.map((asset) => (
            <div
              key={asset.id}
              role="button"
              tabIndex={asset.status === "ready" ? 0 : -1}
              aria-label={asset.status === "ready" ? `Place ${asset.file.name} on canvas` : `Uploading ${asset.file.name}`}
              draggable={asset.status === "ready"}
              onDragStart={(event) => handleAssetDragStart(event, asset.id)}
              onClick={() => asset.status === "ready" && void placePendingAsset(asset.id)}
              onKeyDown={(event) => {
                if (asset.status === "ready" && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  void placePendingAsset(asset.id);
                }
              }}
              className={`group relative aspect-square overflow-hidden rounded-lg border border-slate-700 outline-none transition-colors ${
                asset.status === "ready" ? "cursor-grab hover:border-slate-600" : "cursor-progress"
              }`}
              title={asset.status === "ready" ? "Click or drag onto the canvas" : "Uploading…"}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.previewUrl}
                alt={asset.file.name}
                className={`h-full w-full object-cover ${asset.status === "loading" ? "opacity-40" : ""}`}
              />

              {asset.status === "loading" && (
                <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-slate-800">
                  <div className="h-full w-1/2 animate-upload-progress rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                </div>
              )}

              {asset.status === "ready" && (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/70 py-1 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    aria-label={`Insert ${asset.file.name} onto canvas`}
                    title="Insert onto canvas"
                    onClick={(event) => {
                      event.stopPropagation();
                      void placePendingAsset(asset.id);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded text-slate-200 hover:bg-indigo-500/80 hover:text-white"
                  >
                    <ImagePlus size={12} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Preview ${asset.file.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      openPreview(asset.previewUrl);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded text-slate-200 hover:bg-white/10 hover:text-white"
                  >
                    <Expand size={12} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${asset.file.name}`}
                    title="Delete"
                    onClick={(event) => {
                      event.stopPropagation();
                      removePendingAsset(asset.id);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded text-slate-200 hover:bg-red-500/80 hover:text-white"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {layers.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {[...layers].reverse().map((layer) => {
            const isActive = layer.id === activeLayerId;
            const thumb = thumbnails[layer.id];
            return (
              <motion.div
                key={layer.id}
                role="button"
                tabIndex={0}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                aria-label={`Select layer ${layer.name}`}
                aria-pressed={isActive}
                onClick={() => selectLayer(layer.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectLayer(layer.id);
                  }
                }}
                className={`group relative aspect-square cursor-pointer overflow-hidden rounded-lg outline-none transition-shadow ${
                  isActive
                    ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900"
                    : "border border-slate-700 hover:border-slate-600"
                }`}
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt={layer.name}
                    className={`h-full w-full object-cover ${layer.visible ? "" : "opacity-30"}`}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-800 text-slate-600">
                    <ImageOff size={14} />
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/70 py-1 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    aria-label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleLayerVisibility(layer.id);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded text-slate-200 hover:bg-white/10 hover:text-white"
                  >
                    {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>
                  <button
                    type="button"
                    aria-label={`Preview ${layer.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      openPreview(thumb);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded text-slate-200 hover:bg-white/10 hover:text-white"
                  >
                    <Expand size={12} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${layer.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteLayer(layer.id);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded text-slate-200 hover:bg-red-500/80 hover:text-white"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </PanelSection>
  );
}
