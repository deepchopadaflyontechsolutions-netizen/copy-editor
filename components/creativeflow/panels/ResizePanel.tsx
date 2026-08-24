"use client";

import { useState, type ChangeEvent } from "react";
import { Lock, Unlock } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import PanelSection from "./PanelSection";

const SCALE_CHIPS = [25, 50, 75, 100, 150, 200];

export default function ResizePanel() {
  const { hasImage, documentSize, resizeDocument } = useCanvasEngine();
  const [locked, setLocked] = useState(true);
  const [widthDraft, setWidthDraft] = useState<string | null>(null);
  const [heightDraft, setHeightDraft] = useState<string | null>(null);

  const width = widthDraft ?? String(Math.round(documentSize.width) || "");
  const height = heightDraft ?? String(Math.round(documentSize.height) || "");
  const aspect = documentSize.width && documentSize.height ? documentSize.width / documentSize.height : 1;

  const handleScale = (percent: number) => {
    const w = Number(width);
    const h = Number(height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;
    setWidthDraft(null);
    setHeightDraft(null);
    resizeDocument(Math.round((w * percent) / 100), Math.round((h * percent) / 100));
  };

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

  const handleApply = () => {
    const w = Number(width);
    const h = Number(height);
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) resizeDocument(w, h);
    setWidthDraft(null);
    setHeightDraft(null);
  };

  return (
    <PanelSection title="Resize">
      <div className="flex items-center gap-2">
        <label className="flex-1">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">Width</span>
          <input
            type="number"
            min={1}
            value={width}
            disabled={!hasImage}
            onChange={handleWidthChange}
            className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1.5 text-xs tabular-nums text-slate-100 focus:border-indigo-500 focus:outline-none disabled:opacity-40"
          />
        </label>
        <button
          type="button"
          onClick={() => setLocked((prev) => !prev)}
          aria-pressed={locked}
          title={locked ? "Unlock aspect ratio" : "Lock aspect ratio"}
          className={`mt-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors ${
            locked ? "border-indigo-500 bg-indigo-500/15 text-indigo-300" : "border-slate-700 text-slate-400"
          }`}
        >
          {locked ? <Lock size={12} /> : <Unlock size={12} />}
        </button>
        <label className="flex-1">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">Height</span>
          <input
            type="number"
            min={1}
            value={height}
            disabled={!hasImage}
            onChange={handleHeightChange}
            className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1.5 text-xs tabular-nums text-slate-100 focus:border-indigo-500 focus:outline-none disabled:opacity-40"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={handleApply}
        disabled={!hasImage}
        className="mt-3 w-full rounded-md bg-indigo-600 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Apply
      </button>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {SCALE_CHIPS.map((percent) => (
          <button
            key={percent}
            type="button"
            onClick={() => handleScale(percent)}
            disabled={!hasImage}
            className="rounded-md border border-slate-700 bg-slate-800/50 px-2 py-1 font-mono text-[11px] font-medium tabular-nums text-slate-400 transition-colors hover:border-indigo-500/50 hover:text-indigo-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {percent}%
          </button>
        ))}
      </div>

      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        Reshapes the document to these proportions. For the final exported pixel size, pick 1x/2x/4x in Export.
      </p>
    </PanelSection>
  );
}
