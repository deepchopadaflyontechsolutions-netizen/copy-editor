"use client";

import { useState, type ChangeEvent } from "react";
import { Check, Crop as CropIcon, Grid3x3, Lock, RotateCcw, Unlock, X } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import { CROP_PRESETS } from "@/lib/canvasEngine/crop";
import PanelSection from "./PanelSection";

const fieldClass =
  "w-full rounded-md border border-slate-700 bg-slate-950/70 px-1.5 py-1 text-center font-mono text-xs tabular-nums text-slate-100 focus:border-indigo-500 focus:outline-none";

// Each field shows the live engine value except while it's being actively
// typed into — then a local "draft" string takes over so a mid-drag value
// update can't fight the caret. Mirrors CropOverlay's DimensionFields.
function CropField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    const parsed = Number(draft);
    if (draft !== null && Number.isFinite(parsed)) onCommit(parsed);
    setDraft(null);
  };

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        value={draft ?? String(Math.round(value))}
        onFocus={() => setDraft(String(Math.round(value)))}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => event.key === "Enter" && commit()}
        className={fieldClass}
      />
    </label>
  );
}

export default function CropPanel() {
  const {
    hasImage,
    activeLayerId,
    cropMode,
    enterCropMode,
    cancelCropMode,
    applyCrop,
    resetCrop,
    cropPreset,
    applyCropPreset,
    cropAspectLocked,
    setCropAspectLocked,
    cropPixelSize,
    cropOffsetPx,
    setCropWidthPx,
    setCropHeightPx,
    setCropXPx,
    setCropYPx,
    showGrid,
    toggleGrid,
  } = useCanvasEngine();

  if (!cropMode) {
    return (
      <PanelSection title="Crop">
        <button
          type="button"
          onClick={enterCropMode}
          disabled={!hasImage || !activeLayerId}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-indigo-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CropIcon size={14} />
          Start crop
        </button>
      </PanelSection>
    );
  }

  return (
    <PanelSection title="Crop">
      <div className="grid grid-cols-3 gap-1.5">
        {CROP_PRESETS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => applyCropPreset(key)}
            aria-pressed={cropPreset === key}
            className={`rounded-md border px-1.5 py-1.5 text-[11px] font-medium transition-colors ${
              cropPreset === key
                ? "border-indigo-500 bg-indigo-500/15 text-indigo-300"
                : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <CropField label="Width" value={cropPixelSize.width} onCommit={setCropWidthPx} />
        <CropField label="Height" value={cropPixelSize.height} onCommit={setCropHeightPx} />
        <CropField label="X offset" value={cropOffsetPx.x} onCommit={setCropXPx} />
        <CropField label="Y offset" value={cropOffsetPx.y} onCommit={setCropYPx} />
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setCropAspectLocked(!cropAspectLocked)}
          aria-pressed={cropAspectLocked}
          title={cropAspectLocked ? "Unlock aspect ratio" : "Lock aspect ratio"}
          className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border text-[11px] font-medium transition-colors ${
            cropAspectLocked
              ? "border-indigo-500 bg-indigo-500/15 text-indigo-300"
              : "border-slate-700 bg-slate-800/50 text-slate-400 hover:text-slate-200"
          }`}
        >
          {cropAspectLocked ? <Lock size={12} /> : <Unlock size={12} />}
          Lock
        </button>
        <button
          type="button"
          onClick={toggleGrid}
          aria-pressed={showGrid}
          title={showGrid ? "Hide guides" : "Show guides"}
          className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border text-[11px] font-medium transition-colors ${
            showGrid
              ? "border-indigo-500 bg-indigo-500/15 text-indigo-300"
              : "border-slate-700 bg-slate-800/50 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Grid3x3 size={12} />
          Guides
        </button>
      </div>

      <button
        type="button"
        onClick={resetCrop}
        className="mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/50 text-[11px] font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100"
      >
        <RotateCcw size={12} />
        Reset Crop
      </button>

      <div className="mt-2 flex items-center gap-1.5">
        <button
          type="button"
          onClick={cancelCropMode}
          className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/50 text-[11px] font-medium text-slate-300 hover:bg-slate-800"
        >
          <X size={12} />
          Cancel
        </button>
        <button
          type="button"
          onClick={applyCrop}
          className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-indigo-600 text-[11px] font-semibold text-white hover:bg-indigo-500"
        >
          <Check size={12} />
          Apply
        </button>
      </div>
    </PanelSection>
  );
}
