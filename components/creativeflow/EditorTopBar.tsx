"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Loader2, Redo2, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import { MAX_ZOOM, MIN_ZOOM } from "@/lib/canvasEngine/viewport";
import Logo from "@/components/Logo";
import { button } from "./ui";

// Fixed defaults for the one-click Export button — the format/size picker that used to gate
// every download behind an extra dropdown step is gone; PNG at 1x covers the common case, and
// nothing else in the app currently offers a way to change these.
const EXPORT_FORMAT = "png";
const EXPORT_MULTIPLIER = 1;

export default function EditorTopBar() {
  const { undo, redo, canUndo, canRedo, zoom, setZoom, zoomIn, zoomOut, resetView, hasImage, exportImage } =
    useCanvasEngine();

  const [isExporting, setIsExporting] = useState(false);
  const zoomPercent = Math.round(zoom * 100);
  const zoomMinPercent = Math.round(MIN_ZOOM * 100);
  const zoomMaxPercent = Math.round(MAX_ZOOM * 100);
  const zoomSliderFill = ((zoomPercent - zoomMinPercent) / (zoomMaxPercent - zoomMinPercent)) * 100;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportImage({ format: EXPORT_FORMAT, multiplier: EXPORT_MULTIPLIER });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center gap-1.5 overflow-x-auto border-b border-neutral-800/70 bg-neutral-950/90 px-2.5 backdrop-blur-md sm:h-18 sm:gap-4 sm:px-5">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/10" />

      <Link href="/" className="flex shrink-0 items-center">
        <Logo size={36} wordmarkClassName="hidden text-base font-bold tracking-tight text-white sm:inline" />
      </Link>

      <span className="hidden shrink-0 rounded-md border border-neutral-800 bg-neutral-900/60 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 sm:inline-block">
        Image
      </span>

      <div className="flex-1" />

      <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-neutral-800 bg-neutral-900/60 p-0.5">
        <button
          type="button"
          aria-label="Undo"
          onClick={undo}
          disabled={!canUndo}
          className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-300 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-300 sm:h-9 sm:w-9"
        >
          <Undo2 size={16} />
        </button>
        <button
          type="button"
          aria-label="Redo"
          onClick={redo}
          disabled={!canRedo}
          className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-300 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-300 sm:h-9 sm:w-9"
        >
          <Redo2 size={16} />
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/60 py-0.5 pl-0.5 pr-2 sm:pr-2.5">
        <button
          type="button"
          aria-label="Zoom out"
          onClick={zoomOut}
          disabled={zoom <= MIN_ZOOM}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-300 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-300 sm:h-9 sm:w-9"
        >
          <ZoomOut size={16} />
        </button>

        {/* The drag slider needs real width to be usable, which narrow phones don't have to
            spare — mobile keeps the +/- buttons and percent readout and drops just the slider. */}
        <input
          type="range"
          min={Math.round(MIN_ZOOM * 100)}
          max={Math.round(MAX_ZOOM * 100)}
          step={1}
          value={zoomPercent}
          onChange={(event) => setZoom(Number(event.target.value) / 100)}
          onDoubleClick={resetView}
          aria-label="Zoom percentage"
          title="Drag to zoom — double-click to reset to 100%"
          className="zoom-slider hidden w-20 sm:block"
          style={{
            background: `linear-gradient(to right, #f8fafc ${zoomSliderFill}%, rgba(248,250,252,0.15) ${zoomSliderFill}%)`,
          }}
        />

        <button
          type="button"
          aria-label="Zoom in"
          onClick={zoomIn}
          disabled={zoom >= MAX_ZOOM}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-300 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-300 sm:h-9 sm:w-9"
        >
          <ZoomIn size={16} />
        </button>

        <span className="min-w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-neutral-300 sm:min-w-10">
          {zoomPercent}%
        </span>
      </div>

      <button
        type="button"
        onClick={() => void handleExport()}
        disabled={!hasImage || isExporting}
        className={`shrink-0 px-4 hover:scale-[1.02] disabled:hover:scale-100 ${button.primary}`}
      >
        {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        {isExporting ? "Exporting…" : "Export"}
      </button>
    </header>
  );
}
