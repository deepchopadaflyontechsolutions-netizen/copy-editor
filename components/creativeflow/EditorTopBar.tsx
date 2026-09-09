"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Download, Redo2, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import { MAX_ZOOM, MIN_ZOOM } from "@/lib/canvasEngine/viewport";
import type { ExportFormat } from "@/types/canvasEngine";
import Logo from "@/components/Logo";
import { button } from "./ui";

export default function EditorTopBar() {
  const { undo, redo, canUndo, canRedo, zoom, setZoom, zoomIn, zoomOut, resetView, hasImage, exportImage } =
    useCanvasEngine();

  const [exportOpen, setExportOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("png");
  const [multiplier, setMultiplier] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const zoomPercent = Math.round(zoom * 100);
  const zoomMinPercent = Math.round(MIN_ZOOM * 100);
  const zoomMaxPercent = Math.round(MAX_ZOOM * 100);
  const zoomSliderFill = ((zoomPercent - zoomMinPercent) / (zoomMaxPercent - zoomMinPercent)) * 100;

  useEffect(() => {
    if (!exportOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [exportOpen]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportImage({ format, multiplier });
    } finally {
      setIsExporting(false);
      setExportOpen(false);
    }
  };

  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center gap-1.5 overflow-x-auto border-b border-neutral-800/70 bg-neutral-950/90 px-2.5 backdrop-blur-md sm:h-18 sm:gap-4 sm:px-5">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/10" />

      <Link href="/" className="flex shrink-0 items-center">
        <Logo size={36} wordmarkClassName="hidden text-base font-bold tracking-tight text-white sm:inline" />
      </Link>

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

      <div ref={exportRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setExportOpen((open) => !open)}
          disabled={!hasImage}
          className={`px-4 hover:scale-[1.02] disabled:hover:scale-100 ${button.primary}`}
        >
          <Download size={14} />
          Export
        </button>

        {exportOpen && (
          <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-xl border border-neutral-800 bg-neutral-900 p-3 shadow-2xl shadow-black/40">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">Format</p>
            <div className="mb-3 flex gap-1.5">
              {(["png", "jpeg"] as ExportFormat[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFormat(option)}
                  aria-pressed={format === option}
                  className={`flex-1 uppercase ${button.chip(format === option)}`}
                >
                  {option}
                </button>
              ))}
            </div>

            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">Size</p>
            <div className="mb-3 flex gap-1.5">
              {[1, 2, 4].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMultiplier(option)}
                  aria-pressed={multiplier === option}
                  className={`flex-1 ${button.chip(multiplier === option)}`}
                >
                  {option}x
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={isExporting}
              className={`w-full ${button.primary} disabled:opacity-60`}
            >
              {isExporting ? "Exporting…" : "Download"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
