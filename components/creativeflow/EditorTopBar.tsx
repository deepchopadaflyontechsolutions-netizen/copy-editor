"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Clapperboard, Download, Images, Redo2, Sparkles, Undo2, User, ZoomIn, ZoomOut } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import { MAX_ZOOM, MIN_ZOOM } from "@/lib/canvasEngine/viewport";
import type { ExportFormat } from "@/types/canvasEngine";

const ZOOM_PRESETS = [50, 100, 150, 200, 400];

export default function EditorTopBar() {
  const { undo, redo, canUndo, canRedo, zoom, setZoom, zoomIn, zoomOut, resetView, hasImage, exportImage } =
    useCanvasEngine();

  const [exportOpen, setExportOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("png");
  const [multiplier, setMultiplier] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  const zoomPercent = Math.round(zoom * 100);

  useEffect(() => {
    if (!exportOpen && !zoomOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (exportOpen && exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setExportOpen(false);
      }
      if (zoomOpen && zoomRef.current && !zoomRef.current.contains(event.target as Node)) {
        setZoomOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [exportOpen, zoomOpen]);

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
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-800 bg-slate-950 px-4">
      <Link href="/" className="flex shrink-0 items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-[#0066FF] to-[#06B6D4] text-white shadow-[0_0_14px_rgba(0,102,255,0.5)]">
          <Sparkles size={15} />
        </span>
        <span className="hidden text-sm font-bold tracking-tight text-white sm:inline">
          Creative<span className="text-[#0066FF]">Flow</span>
        </span>
      </Link>

      <div className="flex shrink-0 items-center gap-1 rounded-full border border-slate-800 bg-slate-900/80 p-1">
        <span className="flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]">
          <Images size={13} />
          Image
        </span>
        <span
          title="Video editing is coming soon"
          className="flex cursor-not-allowed items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-600"
        >
          <Clapperboard size={13} />
          Video
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-0.5 rounded-lg border border-slate-800 bg-slate-900/60 p-0.5">
        <button
          type="button"
          aria-label="Undo"
          onClick={undo}
          disabled={!canUndo}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Undo2 size={15} />
        </button>
        <button
          type="button"
          aria-label="Redo"
          onClick={redo}
          disabled={!canRedo}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Redo2 size={15} />
        </button>
      </div>

      <div
        ref={zoomRef}
        className="relative flex shrink-0 items-center gap-0.5 rounded-lg border border-slate-800 bg-slate-900/60 p-0.5"
      >
        <button
          type="button"
          aria-label="Zoom out"
          onClick={zoomOut}
          disabled={zoom <= MIN_ZOOM}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ZoomOut size={15} />
        </button>
        <button
          type="button"
          aria-label="Zoom level"
          aria-expanded={zoomOpen}
          title="Set zoom level"
          onClick={() => setZoomOpen((open) => !open)}
          className="min-w-12 px-1 text-center font-mono text-xs font-semibold tabular-nums text-slate-300 hover:text-white"
        >
          {zoomPercent}%
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={zoomIn}
          disabled={zoom >= MAX_ZOOM}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ZoomIn size={15} />
        </button>

        {zoomOpen && (
          <div className="absolute left-1/2 top-full z-30 mt-2 w-52 -translate-x-1/2 rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-2xl shadow-black/40">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Zoom</p>
              <span className="font-mono text-xs font-semibold tabular-nums text-slate-200">{zoomPercent}%</span>
            </div>
            <input
              type="range"
              min={Math.round(MIN_ZOOM * 100)}
              max={Math.round(MAX_ZOOM * 100)}
              step={5}
              value={zoomPercent}
              onChange={(event) => setZoom(Number(event.target.value) / 100)}
              aria-label="Zoom percentage"
              className="w-full accent-blue-500"
            />

            <div className="mt-3 flex flex-wrap gap-1.5">
              {ZOOM_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setZoom(preset / 100)}
                  aria-pressed={zoomPercent === preset}
                  className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
                    zoomPercent === preset
                      ? "border-indigo-500 bg-indigo-500/15 text-indigo-300"
                      : "border-slate-700 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                resetView();
                setZoomOpen(false);
              }}
              className="mt-3 w-full rounded-md border border-slate-700 py-1.5 text-[11px] font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
            >
              Reset to 100%
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        aria-label="Account"
        title="Account"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-900/60 text-slate-400 transition-colors hover:text-white"
      >
        <User size={16} />
      </button>

      <div ref={exportRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setExportOpen((open) => !open)}
          disabled={!hasImage}
          className="flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-transform hover:scale-[1.02] hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
        >
          <Download size={14} />
          Export
        </button>

        {exportOpen && (
          <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-2xl shadow-black/40">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Format</p>
            <div className="mb-3 flex gap-1.5">
              {(["png", "jpeg"] as ExportFormat[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFormat(option)}
                  aria-pressed={format === option}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold uppercase transition-colors ${
                    format === option
                      ? "border-indigo-500 bg-indigo-500/15 text-indigo-300"
                      : "border-slate-700 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Size</p>
            <div className="mb-3 flex gap-1.5">
              {[1, 2, 4].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMultiplier(option)}
                  aria-pressed={multiplier === option}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors ${
                    multiplier === option
                      ? "border-indigo-500 bg-indigo-500/15 text-indigo-300"
                      : "border-slate-700 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {option}x
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={isExporting}
              className="w-full rounded-md bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {isExporting ? "Exporting…" : "Download"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
