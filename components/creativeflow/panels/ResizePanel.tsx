"use client";

import { useId, useState, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import { Check, Crop, Lock, Plus, RotateCcw, Unlock, X as XIcon } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import type { CropPresetKey } from "@/lib/canvasEngine/crop";
import PanelSection from "./PanelSection";
import { button, text } from "../ui";

type AspectRatio = { key: Exclude<CropPresetKey, "free">; label: string; description: string; ratio: number };

// Quick ratio chips — resize the canvas to that shape while keeping its
// current width, for the common case of "same width, different proportions"
// rather than typing exact pixels.
const ASPECT_RATIOS: AspectRatio[] = [
  { key: "1:1", label: "1:1", description: "Square", ratio: 1 },
  { key: "4:5", label: "4:5", description: "Portrait", ratio: 4 / 5 },
  { key: "16:9", label: "16:9", description: "Widescreen", ratio: 16 / 9 },
  { key: "9:16", label: "9:16", description: "Story", ratio: 9 / 16 },
];

/** Small rectangle glyph drawn at the ratio's real proportions, so each aspect-ratio card shows its actual shape instead of just a number. */
function RatioIcon({ ratio }: { ratio: number }) {
  const size = 20;
  const box = 15;
  const w = ratio >= 1 ? box : box * ratio;
  const h = ratio >= 1 ? box / ratio : box;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
      <rect x={(size - w) / 2} y={(size - h) / 2} width={w} height={h} rx={2} fill="none" stroke="currentColor" strokeWidth={1.75} />
    </svg>
  );
}

export default function ResizePanel() {
  const {
    hasImage,
    documentSize,
    resizeDocument,
    originalImageSize,
    activeLayerId,
    baseLayerId,
    selectLayer,
    cropMode,
    cropPreset,
    cropAspectLocked,
    enterCropMode,
    cancelCropMode,
    applyCrop,
    applyCropPreset,
    applyCropCustomRatio,
  } = useCanvasEngine();
  const [locked, setLocked] = useState(true);
  const [widthDraft, setWidthDraft] = useState<string | null>(null);
  const [heightDraft, setHeightDraft] = useState<string | null>(null);
  const [customRatioOpen, setCustomRatioOpen] = useState(false);
  const [customRatioW, setCustomRatioW] = useState("2");
  const [customRatioH, setCustomRatioH] = useState("3");
  const customRatioWId = useId();
  const customRatioHId = useId();

  const width = widthDraft ?? String(Math.round(documentSize.width) || "");
  const height = heightDraft ?? String(Math.round(documentSize.height) || "");
  const aspect = documentSize.width && documentSize.height ? documentSize.width / documentSize.height : 1;

  const handleWidthChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setWidthDraft(next);
    if (locked) {
      const parsed = Number(next);
      if (Number.isFinite(parsed) && parsed > 0) setHeightDraft(String(Math.round(parsed / aspect)));
    }
  };

  const handleHeightChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setHeightDraft(next);
    if (locked) {
      const parsed = Number(next);
      if (Number.isFinite(parsed) && parsed > 0) setWidthDraft(String(Math.round(parsed * aspect)));
    }
  };

  const applySize = (w: number, h: number) => {
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;
    setWidthDraft(null);
    setHeightDraft(null);
    resizeDocument(Math.round(w), Math.round(h));
  };

  // Picking a shape opens the same interactive crop session the canvas
  // toolbar's Crop icon starts — full image visible, dimmed outside the
  // frame, draggable handles — instead of silently resizing the whole page.
  // Nothing about the plain Width/Height "Resize" flow above changes.
  //
  // Starting a fresh session passes the ratio straight into `enterCropMode`
  // rather than calling `applyCropPreset` right after — the two need to
  // land in the same state update, since a plain follow-up call would run
  // against last render's (still-empty) crop session and do nothing.
  const handleSelectRatio = (key: Exclude<CropPresetKey, "free">, ratio: number) => {
    if (!hasImage) return;
    if (!activeLayerId && baseLayerId) selectLayer(baseLayerId);
    if (cropMode) applyCropPreset(key);
    else enterCropMode({ preset: key, ratio });
  };

  const handleApplyCustom = () => applySize(Number(width), Number(height));

  const parsedCustomRatioW = Number(customRatioW);
  const parsedCustomRatioH = Number(customRatioH);
  const isCustomRatioValid =
    Number.isFinite(parsedCustomRatioW) &&
    Number.isFinite(parsedCustomRatioH) &&
    parsedCustomRatioW > 0 &&
    parsedCustomRatioH > 0;

  const handleApplyCustomRatio = () => {
    if (!isCustomRatioValid || !hasImage) return;
    if (!activeLayerId && baseLayerId) selectLayer(baseLayerId);
    const ratio = parsedCustomRatioW / parsedCustomRatioH;
    if (cropMode) applyCropCustomRatio(ratio);
    else enterCropMode({ preset: "free", ratio });
  };

  const handleResetToOriginal = () => {
    if (!originalImageSize) return;
    applySize(originalImageSize.width, originalImageSize.height);
  };

  const isAtOriginalSize =
    !!originalImageSize &&
    Math.round(documentSize.width) === originalImageSize.width &&
    Math.round(documentSize.height) === originalImageSize.height;

  // A preset card is "active" once it's the shape actually driving the live
  // crop frame. "Custom ratio" reuses the same "free" preset the freeform
  // crop tool defaults to, so it's only counted as active once it's also
  // aspect-locked — that combination is unique to `applyCropCustomRatio`.
  const activeRatioKey = cropMode && cropPreset !== "free" ? cropPreset : null;
  const isCustomRatioActive = cropMode && cropPreset === "free" && cropAspectLocked;

  return (
    <PanelSection>
      <div className="mb-2.5 flex items-center justify-between">
        <h4 className={text.sectionTitle}>Dimensions</h4>
        <button
          type="button"
          onClick={handleResetToOriginal}
          disabled={!hasImage || !originalImageSize || isAtOriginalSize}
          title="Reset to original size"
          className="flex items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-[13px] font-semibold text-white transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:border-neutral-700 disabled:bg-transparent disabled:text-neutral-500 disabled:opacity-50"
        >
          <RotateCcw size={13} strokeWidth={2.5} />
          Original size
        </button>
      </div>

      <div className="flex items-end gap-2">
        <label className="flex-1">
          <span className={`mb-1.5 block ${text.fieldLabel}`}>Width</span>
          <div className="relative">
            <input
              type="number"
              min={1}
              value={width}
              disabled={!hasImage}
              onChange={handleWidthChange}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900/80 py-2.5 pl-3 pr-9 text-[15px] font-semibold tabular-nums text-white transition-colors [appearance:textfield] focus:border-white/30 focus:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-white/15 disabled:opacity-40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-neutral-300">
              px
            </span>
          </div>
        </label>
        <button
          type="button"
          onClick={() => setLocked((prev) => !prev)}
          aria-pressed={locked}
          title={locked ? "Unlock aspect ratio" : "Lock aspect ratio"}
          className={`flex h-10.5 w-10.5 shrink-0 items-center justify-center rounded-lg border transition-colors ${
            locked
              ? "border-white/30 bg-white/10 text-white shadow-[0_0_0_1px_rgba(129,140,248,0.15)]"
              : "border-neutral-700 bg-neutral-900/60 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
          }`}
        >
          {locked ? <Lock size={15} /> : <Unlock size={15} />}
        </button>
        <label className="flex-1">
          <span className={`mb-1.5 block ${text.fieldLabel}`}>Height</span>
          <div className="relative">
            <input
              type="number"
              min={1}
              value={height}
              disabled={!hasImage}
              onChange={handleHeightChange}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900/80 py-2.5 pl-3 pr-9 text-[15px] font-semibold tabular-nums text-white transition-colors [appearance:textfield] focus:border-white/30 focus:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-white/15 disabled:opacity-40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-neutral-300">
              px
            </span>
          </div>
        </label>
      </div>

      <button
        type="button"
        onClick={handleApplyCustom}
        disabled={!hasImage}
        className={`mt-3.5 w-full ${button.primary}`}
      >
        <Crop size={14} strokeWidth={2.25} />
        Crop
      </button>

      <h4 className={`mb-2.5 mt-6 ${text.sectionTitle}`}>Aspect ratio</h4>

      {/* Picking a preset below only previews the crop frame on the board —
          nothing is saved until Apply. Sits in the panel's own normal flow
          (not floating over the canvas), and closing/switching tabs no
          longer silently commits it (see the pointerdown scoping in
          CanvasEngineContext) — Apply/Cancel are the only ways to resolve
          a crop in progress now. */}
      {cropMode && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-[#007BFF]/40 bg-[#007BFF]/10 px-3 py-2.5">
          <span className="text-xs font-semibold text-white">Adjust the frame, then apply</span>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={cancelCropMode}
              className="rounded-md border border-white/20 px-2.5 py-1 text-[12px] font-semibold text-white/80 transition-colors hover:border-white/40 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={applyCrop}
              className="flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-[12px] font-semibold text-black transition-colors hover:bg-neutral-200"
            >
              <Check size={12} strokeWidth={3} />
              Apply
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        {ASPECT_RATIOS.map(({ key, label, description, ratio }) => {
          const isActive = activeRatioKey === key;
          return (
            <motion.button
              key={key}
              type="button"
              onClick={() => handleSelectRatio(key, ratio)}
              disabled={!hasImage}
              aria-pressed={isActive}
              whileHover={hasImage ? { scale: 1.015 } : undefined}
              whileTap={hasImage ? { scale: 0.98 } : undefined}
              className={`relative flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                isActive
                  ? "border-[#007BFF]/60 bg-[#007BFF]/10 shadow-[0_0_0_1px_rgba(0,123,255,0.3),0_6px_16px_-4px_rgba(0,123,255,0.35)]"
                  : "border-neutral-700 bg-neutral-800/50 hover:border-neutral-500 hover:bg-neutral-800"
              }`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
                  isActive ? "bg-[#007BFF]/20 text-white" : "bg-neutral-900/70 text-neutral-300"
                }`}
              >
                <RatioIcon ratio={ratio} />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className={`text-sm font-semibold ${isActive ? "text-white" : "text-neutral-200"}`}>{label}</span>
                <span className={`truncate text-xs ${isActive ? "text-white/70" : "text-neutral-500"}`}>{description}</span>
              </span>
              {isActive && (
                <span className="absolute right-2 top-2 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#007BFF] text-white shadow-sm">
                  <Check size={10} strokeWidth={3.5} />
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      <motion.button
        type="button"
        onClick={() => setCustomRatioOpen((prev) => !prev)}
        disabled={!hasImage}
        aria-pressed={customRatioOpen || isCustomRatioActive}
        aria-expanded={customRatioOpen}
        whileHover={hasImage ? { scale: 1.01 } : undefined}
        whileTap={hasImage ? { scale: 0.99 } : undefined}
        className={`relative mt-2.5 flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          customRatioOpen || isCustomRatioActive
            ? "border-[#007BFF]/60 bg-[#007BFF]/10 shadow-[0_0_0_1px_rgba(0,123,255,0.3),0_6px_16px_-4px_rgba(0,123,255,0.35)]"
            : "border-neutral-700 bg-neutral-800/50 hover:border-neutral-500 hover:bg-neutral-800"
        }`}
      >
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-dashed ${
            customRatioOpen || isCustomRatioActive ? "border-[#007BFF]/60 bg-[#007BFF]/20 text-white" : "border-neutral-600 text-neutral-400"
          }`}
        >
          <Plus size={16} strokeWidth={2.5} />
        </span>
        <span className="flex flex-col gap-0.5">
          <span className={`text-sm font-semibold ${customRatioOpen || isCustomRatioActive ? "text-white" : "text-neutral-200"}`}>
            Custom ratio
          </span>
          <span className={`text-xs ${customRatioOpen || isCustomRatioActive ? "text-white/70" : "text-neutral-500"}`}>
            Set your own W : H
          </span>
        </span>
        {isCustomRatioActive && (
          <span className="absolute right-2 top-2 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#007BFF] text-white shadow-sm">
            <Check size={10} strokeWidth={3.5} />
          </span>
        )}
      </motion.button>

      {customRatioOpen && (
        <div className="mt-2.5 rounded-lg border border-neutral-700 bg-neutral-900/50 p-3.5">
          <div className="mb-3 flex items-center justify-between">
            <span className={text.fieldLabel}>Custom ratio</span>
            <button
              type="button"
              onClick={() => setCustomRatioOpen(false)}
              aria-label="Close custom ratio"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-white"
            >
              <XIcon size={14} strokeWidth={2.5} />
            </button>
          </div>
          <div className="flex items-center gap-2.5">
            <label className="sr-only" htmlFor={customRatioWId}>
              Custom ratio width
            </label>
            <input
              id={customRatioWId}
              type="number"
              min={1}
              value={customRatioW}
              disabled={!hasImage}
              onChange={(event) => setCustomRatioW(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleApplyCustomRatio()}
              placeholder="W"
              className="w-16 min-w-0 rounded-lg border border-neutral-700 bg-neutral-900/80 py-2.5 text-center text-[15px] font-semibold tabular-nums text-white transition-colors [appearance:textfield] focus:border-white/30 focus:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-white/15 disabled:opacity-40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="shrink-0 text-base font-semibold text-neutral-500">:</span>
            <label className="sr-only" htmlFor={customRatioHId}>
              Custom ratio height
            </label>
            <input
              id={customRatioHId}
              type="number"
              min={1}
              value={customRatioH}
              disabled={!hasImage}
              onChange={(event) => setCustomRatioH(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleApplyCustomRatio()}
              placeholder="H"
              className="w-16 min-w-0 rounded-lg border border-neutral-700 bg-neutral-900/80 py-2.5 text-center text-[15px] font-semibold tabular-nums text-white transition-colors [appearance:textfield] focus:border-white/30 focus:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-white/15 disabled:opacity-40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={handleApplyCustomRatio}
              disabled={!hasImage || !isCustomRatioValid}
              className={`h-10.5 flex-1 ${button.primary}`}
            >
              <Check size={14} strokeWidth={2.5} />
              Apply
            </button>
          </div>
        </div>
      )}
    </PanelSection>
  );
}
