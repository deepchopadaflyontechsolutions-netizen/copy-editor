"use client";

import { useCanvasEngine } from "@/context/CanvasEngineContext";

// Undo/Redo and Export now live in EditorTopBar — this strip is just the
// Before/After preview toggle, kept directly under the canvas. Before shows
// the untouched original upload; After is the live, fully-edited document —
// disabled while another exclusive canvas mode (crop/heal/Auto Clean) is
// active, since the preview those modes rely on and this one would fight
// over the same objects.
export default function BeforeAfterExportBar() {
  const { beforeAfter, toggleBeforeAfter, hasImage, cropMode, healMode, autoCleanPreview } = useCanvasEngine();
  const disabled = !hasImage || cropMode || healMode || autoCleanPreview;

  return (
    <div className="flex shrink-0 items-center justify-center px-4 py-2">
      <div
        role="group"
        aria-label="Toggle before and after preview"
        className="inline-flex items-center rounded-full border border-slate-700/70 bg-slate-900/70 p-1 shadow-inner shadow-black/20"
      >
        <button
          type="button"
          aria-pressed={beforeAfter}
          disabled={disabled}
          onClick={() => !beforeAfter && toggleBeforeAfter()}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            beforeAfter
              ? "bg-indigo-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.4)]"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          Before
        </button>
        <button
          type="button"
          aria-pressed={!beforeAfter}
          disabled={disabled}
          onClick={() => beforeAfter && toggleBeforeAfter()}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            !beforeAfter
              ? "bg-indigo-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.4)]"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          After
        </button>
      </div>
    </div>
  );
}
