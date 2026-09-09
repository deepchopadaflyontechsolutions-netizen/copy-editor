"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { motion } from "framer-motion";
import {
  Check,
  EyeOff,
  ImageIcon,
  ImageOff,
  Images,
  Loader2,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import { LAYER_DRAG_MIME_TYPE } from "@/types/canvasEngine";
import PanelSection from "./PanelSection";
import { button, cardRadius, text } from "../ui";

// The sidebar's sole upload entry point, including the very first photo: drop
// or pick a file and it lands on the canvas as a new layer immediately — same
// as dropping straight onto the canvas — and shows up right below in this
// same grid. Already-placed layers render here too, reusing the same
// click-to-select/hover-action affordances.
export default function ImagesPanel() {
  const {
    layers,
    activeLayerId,
    selectLayer,
    deleteLayer,
    getLayerThumbnail,
    loadImageFromFile,
    reorderLayerBefore,
  } = useCanvasEngine();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);

  const thumbnails = useMemo(() => {
    const next: Record<string, string | null> = {};
    for (const layer of layers) next[layer.id] = getLayerThumbnail(layer.id);
    return next;
  }, [layers, getLayerThumbnail]);

  // Short "L1"/"L2" labels track a layer's add order, independent of the
  // newest-first display order the grid renders in below.
  const shortLabels = useMemo(() => {
    const next: Record<string, string> = {};
    layers.forEach((layer, index) => {
      next[layer.id] = `L${index + 1}`;
    });
    return next;
  }, [layers]);

  const addFile = useCallback(
    async (file: File | null | undefined) => {
      if (!file) return;
      setIsUploading(true);
      try {
        await loadImageFromFile(file);
      } finally {
        setIsUploading(false);
      }
    },
    [loadImageFromFile],
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      void addFile(file);
    },
    [addFile],
  );

  // Layer thumbnails are also draggable (for in-grid reordering), so every
  // handler below ignores anything that isn't an OS file drag — otherwise
  // reordering a layer would flash the "drop to upload" overlay.
  const isFileDrag = (event: DragEvent<HTMLDivElement>) => {
    const types = Array.from(event.dataTransfer.types);
    return types.includes("Files") && !types.includes(LAYER_DRAG_MIME_TYPE);
  };

  // `draggedLayerId` is only set while a layer thumbnail is mid-reorder-drag,
  // so it's a reliable extra guard alongside `isFileDrag` — dataTransfer.types
  // can't always be trusted to report the drag's true origin consistently
  // across browsers.
  //
  // The "drop image here" cover is driven by a window-level listener below
  // (so it lights up as soon as a file drag enters the app anywhere, not
  // only once the cursor is directly over this narrow panel) — these two
  // handlers stay scoped to the container purely to actually accept the
  // drop once it lands here.
  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (draggedLayerId || !isFileDrag(event)) return;
      event.preventDefault();
    },
    [draggedLayerId],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (draggedLayerId || !isFileDrag(event)) return;
      event.preventDefault();
      setIsDragActive(false);
      void addFile(event.dataTransfer.files?.[0]);
    },
    [addFile, draggedLayerId],
  );

  useEffect(() => {
    // Layer thumbnails render an <img>, and some browsers attach a virtual
    // "Files" entry to a same-page drag of an <img> alongside our custom
    // LAYER_DRAG_MIME_TYPE — so "Files" alone isn't enough to tell an OS
    // file drag apart from an in-grid reorder here; both checks are needed.
    let activeDrags = 0;
    const hasFilePayload = (event: globalThis.DragEvent) => {
      const types = Array.from(event.dataTransfer?.types ?? []);
      return types.includes("Files") && !types.includes(LAYER_DRAG_MIME_TYPE);
    };

    const onWindowDragEnter = (event: globalThis.DragEvent) => {
      if (draggedLayerId || !hasFilePayload(event)) return;
      activeDrags += 1;
      setIsDragActive(true);
    };
    const onWindowDragLeave = (event: globalThis.DragEvent) => {
      if (draggedLayerId || !hasFilePayload(event)) return;
      activeDrags = Math.max(0, activeDrags - 1);
      if (activeDrags === 0) setIsDragActive(false);
    };
    const onWindowDrop = () => {
      activeDrags = 0;
      setIsDragActive(false);
    };

    window.addEventListener("dragenter", onWindowDragEnter);
    window.addEventListener("dragleave", onWindowDragLeave);
    window.addEventListener("drop", onWindowDrop);
    return () => {
      window.removeEventListener("dragenter", onWindowDragEnter);
      window.removeEventListener("dragleave", onWindowDragLeave);
      window.removeEventListener("drop", onWindowDrop);
    };
  }, [draggedLayerId]);

  return (
    <PanelSection
      title={layers.length > 0 ? "Image assets" : "Upload"}
      fill
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        disabled={isUploading}
        onChange={handleChange}
        aria-label="Upload image"
      />

      <div
        className="relative flex flex-1 min-h-0 flex-col"
        onDragEnter={handleDragOver}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div
          className={`relative mb-4 mt-1 shrink-0 transition-opacity duration-200 ${isDragActive ? "opacity-30" : ""}`}
        >
          <motion.button
            type="button"
            disabled={isUploading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`w-full outline-none disabled:opacity-60 ${button.primary} ${
              isUploading ? "cursor-progress" : "cursor-pointer"
            }`}
          >
            {isUploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <UploadCloud size={14} strokeWidth={1.75} />
            )}
            {isUploading ? "Adding to canvas…" : "Upload Image"}
          </motion.button>
        </div>

        {layers.length > 0 && (
          <div
            className={`mb-4 flex min-h-47.5 flex-1 flex-col ${cardRadius} border border-neutral-800/70 bg-neutral-900/40 p-3 transition-opacity duration-200 ${isDragActive ? "opacity-30" : ""}`}
          >
            <div className="mb-3 flex shrink-0 items-center justify-between gap-2 border-b border-neutral-800/70 pb-2.5">
              <h4 className={text.eyebrow}>Image layers</h4>
              <span className="text-xs font-semibold text-neutral-300">
                {layers.length} {layers.length === 1 ? "item" : "items"}
              </span>
            </div>

            <div className="custom-scrollbar -mr-1 mb-0.5 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1.5 [&::-webkit-scrollbar]:w-1.5! [&::-webkit-scrollbar]:max-w-1.5! [&::-webkit-scrollbar-thumb]:w-1.5! [&::-webkit-scrollbar-thumb]:rounded-full">
              <div className="grid grid-cols-2 gap-2.5 pb-0.5">
                {[...layers].reverse().map((layer) => {
                  const isActive = layer.id === activeLayerId;
                  const thumb = thumbnails[layer.id];
                  return (
                    <motion.div
                      key={layer.id}
                      role="button"
                      tabIndex={0}
                      draggable
                      onDragStart={(event) => {
                        const dragEvent =
                          event as unknown as DragEvent<HTMLDivElement>;
                        dragEvent.dataTransfer.effectAllowed = "move";
                        dragEvent.dataTransfer.setData(
                          LAYER_DRAG_MIME_TYPE,
                          layer.id,
                        );
                        setDraggedLayerId(layer.id);
                        selectLayer(layer.id);
                      }}
                      onDragEnd={() => {
                        setDraggedLayerId(null);
                        setDragOverLayerId(null);
                      }}
                      onDragEnter={(event) => {
                        const dragEvent =
                          event as unknown as DragEvent<HTMLDivElement>;
                        if (
                          !dragEvent.dataTransfer.types.includes(
                            LAYER_DRAG_MIME_TYPE,
                          )
                        )
                          return;
                        dragEvent.preventDefault();
                        if (layer.id !== draggedLayerId)
                          setDragOverLayerId(layer.id);
                      }}
                      onDragOver={(event) => {
                        const dragEvent =
                          event as unknown as DragEvent<HTMLDivElement>;
                        if (
                          !dragEvent.dataTransfer.types.includes(
                            LAYER_DRAG_MIME_TYPE,
                          )
                        )
                          return;
                        dragEvent.preventDefault();
                        dragEvent.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(event) => {
                        const dragEvent =
                          event as unknown as DragEvent<HTMLDivElement>;
                        if (
                          !dragEvent.dataTransfer.types.includes(
                            LAYER_DRAG_MIME_TYPE,
                          )
                        )
                          return;
                        const draggedId =
                          dragEvent.dataTransfer.getData(LAYER_DRAG_MIME_TYPE);
                        dragEvent.preventDefault();
                        dragEvent.stopPropagation();
                        setDraggedLayerId(null);
                        setDragOverLayerId(null);
                        if (draggedId && draggedId !== layer.id)
                          reorderLayerBefore(draggedId, layer.id);
                      }}
                      aria-label={`Select layer ${layer.name}`}
                      aria-pressed={isActive}
                      onClick={() => selectLayer(layer.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          selectLayer(layer.id);
                        }
                      }}
                      className={`group relative aspect-square cursor-grab rounded-2xl bg-gradient-to-br p-[2px] outline-none transition-all duration-200 active:cursor-grabbing ${
                        dragOverLayerId === layer.id &&
                        draggedLayerId &&
                        draggedLayerId !== layer.id
                          ? "from-[#007BFF] via-[#007BFF] to-[#007BFF] shadow-[0_0_0_1px_rgba(0,123,255,0.4),0_8px_20px_-8px_rgba(0,123,255,0.55)]"
                          : isActive
                            ? "from-[#f8fafc]/40 via-[#f8fafc]/40 to-[#f8fafc]/40 shadow-[0_0_0_1px_rgba(248,250,252,0.2)]"
                            : "from-neutral-700 via-neutral-800 to-neutral-800 shadow-md shadow-black/20 hover:from-neutral-500 hover:via-neutral-600 hover:to-neutral-800"
                      } ${draggedLayerId === layer.id ? "opacity-40" : ""}`}
                    >
                      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[14px] bg-neutral-900">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumb}
                            alt={layer.name}
                            title={layer.name}
                            className={`absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                              layer.visible ? "" : "opacity-30"
                            }`}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900 text-neutral-600">
                            <ImageOff size={14} />
                          </div>
                        )}

                        <div
                          className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-transparent transition-opacity duration-200 ${
                            isActive
                              ? "opacity-100"
                              : "opacity-70 group-hover:opacity-90"
                          }`}
                        />

                        <span
                          aria-hidden="true"
                          className={`absolute left-1.5 top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border shadow shadow-black/40 backdrop-blur-sm transition-all ${
                            isActive
                              ? "border-white/60 bg-white text-black"
                              : "border-white/30 bg-black/40 text-transparent group-hover:border-white/60"
                          }`}
                        >
                          <Check size={10} strokeWidth={3} />
                        </span>

                        <button
                          type="button"
                          aria-label={`Delete ${layer.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteLayer(layer.id);
                          }}
                          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-neutral-200 opacity-0 backdrop-blur-sm transition-all hover:bg-red-500 hover:text-white group-hover:opacity-100"
                        >
                          <Trash2 size={12} />
                        </button>

                        <div className="relative mt-auto flex items-center justify-between gap-1 px-2 py-1.5">
                          <span className="truncate text-[10px] font-semibold tracking-wide text-white/90 drop-shadow-sm">
                            {shortLabels[layer.id]}
                          </span>
                          {!layer.visible && (
                            <EyeOff
                              size={10}
                              className="shrink-0 text-neutral-300"
                            />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {layers.length === 0 && !isDragActive && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-800/60 ring-1 ring-inset ring-white/15">
              <Images size={28} strokeWidth={1.75} className="text-white" />
            </div>
            <p className="text-sm font-semibold leading-snug text-neutral-300">
              Your uploaded images
              <br />
              will appear here
            </p>
          </div>
        )}

        {isDragActive && (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/30 bg-neutral-950/70 backdrop-blur-sm">
            <UploadCloud size={28} className="text-white" />
            <p className="text-sm font-semibold text-white">
              Drop image to upload
            </p>
          </div>
        )}
      </div>

      <div className="group sticky bottom-0 z-10 mt-auto hidden h-56 w-full shrink-0 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border border-neutral-800/80 bg-gradient-to-b from-neutral-900/95 to-[#0a0a0a] text-neutral-600 shadow-[0_-8px_16px_-8px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-colors hover:border-neutral-700 md:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(148,163,184,0.9) 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />
        <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-800/70 text-neutral-500 ring-1 ring-inset ring-neutral-700/60 transition-colors group-hover:text-white">
          <ImageIcon size={16} />
        </span>
        <span className="relative flex items-center gap-1.5">
          <span className="rounded-sm bg-neutral-800/80 px-1 py-px text-[9px] font-bold tracking-wide text-neutral-500 ring-1 ring-inset ring-neutral-700/60">
            AD
          </span>
          <span className="text-[11px] font-semibold tracking-wide text-neutral-400">
            Advertisement
          </span>
        </span>
        <span className="relative text-[10px] tracking-wide text-neutral-600">
          300 × 250
        </span>
      </div>
    </PanelSection>
  );
}
