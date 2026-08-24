"use client";

import {
  useCallback,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import { validateImage } from "@/lib/validateImage";

const FORMAT_CHIPS = ["JPG", "PNG", "WebP", "GIF"];

// Sits above the property-panel stack (Slider Control/Crop/Watermark/etc.)
// as a compact dropzone until a document exists — the rest of the rail stays
// visible underneath (each panel already renders its own disabled state with
// nothing loaded), so the sidebar keeps the same shape before and after the
// first image lands instead of swapping wholesale. Mirrors the landing
// page's own StudioPanel dropzone (dashed border, gradient icon, drag
// states) so the "getting started" moment reads the same everywhere in the
// app; `compact` shrinks it down to fit as that top slice rather than filling
// the whole rail.
export default function UploadPanel({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { addPendingAsset } = useCanvasEngine();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const [isDragActive, setIsDragActive] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(
    async (file: File | null | undefined) => {
      setIsBusy(true);
      setError(null);
      try {
        const result = await validateImage(file);
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
        URL.revokeObjectURL(result.data.objectUrl);
        addPendingAsset(result.data.file);
      } finally {
        setIsBusy(false);
      }
    },
    [addPendingAsset],
  );

  const openFileDialog = useCallback(() => {
    if (isBusy) return;
    inputRef.current?.click();
  }, [isBusy]);

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      void processFile(file);
    },
    [processFile],
  );

  const handleDragEnter = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (isBusy) return;
      dragCounterRef.current += 1;
      setIsDragActive(true);
    },
    [isBusy],
  );

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => event.preventDefault(),
    [],
  );

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
      void processFile(event.dataTransfer.files?.[0]);
    },
    [processFile],
  );

  return (
    <div
      className={
        compact
          ? "flex flex-col gap-2 p-4"
          : "flex flex-1 flex-col items-center justify-center gap-5 p-6"
      }
    >
      <div
        role="button"
        tabIndex={isBusy ? -1 : 0}
        aria-disabled={isBusy}
        aria-describedby={`${inputId}-hint`}
        onClick={openFileDialog}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openFileDialog();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex w-full flex-col items-center rounded-2xl border-2 border-dashed text-center outline-none transition-colors duration-150 ${
          compact ? "gap-2 px-4 py-4" : "gap-3 px-5 py-10"
        } ${isBusy ? "cursor-progress" : "cursor-pointer"} ${
          isDragActive
            ? "border-indigo-500 bg-indigo-500/5"
            : "border-slate-700 hover:border-slate-600"
        }`}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          hidden
          disabled={isBusy}
          onChange={handleInputChange}
        />

        <span
          className={`flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-[0_0_16px_rgba(99,102,241,0.4)] ${
            compact ? "h-9 w-9" : "h-12 w-12"
          }`}
        >
          {isBusy ? (
            <Loader2 size={compact ? 16 : 20} className="animate-spin" />
          ) : (
            <UploadCloud size={compact ? 16 : 20} />
          )}
        </span>

        <div>
          <p
            className={`font-semibold text-slate-100 ${compact ? "text-xs" : "text-sm"}`}
          >
            {isBusy ? "Loading…" : "Upload an image"}
          </p>
          <p id={`${inputId}-hint`} className="mt-1 text-xs text-slate-400">
            Drag &amp; drop, or{" "}
            <span className="font-medium text-indigo-400">click to browse</span>
          </p>
        </div>

        {!compact && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            {FORMAT_CHIPS.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-slate-700/70 bg-slate-800/60 px-2 py-0.5 text-[10px] font-medium text-slate-400"
              >
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="text-center text-xs font-medium text-red-400">{error}</p>
      )}
    </div>
  );
}
