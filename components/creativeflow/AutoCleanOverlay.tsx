"use client";

import { Check, X } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";

// Floating confirm/cancel bar shown while a detected mark is being
// previewed (the dashed ellipse itself is a real Fabric object added
// directly to the canvas by CanvasEngineContext, so it pans/zooms for
// free) — same bottom-center slot CropOverlay uses, since the two modes
// are mutually exclusive.
export default function AutoCleanOverlay() {
  const { cancelAutoClean, applyAutoClean, isAutoCleaning } = useCanvasEngine();

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-2 flex justify-center">
      <div
        className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-neutral-700/60 bg-neutral-900/90 px-4 py-2.5 shadow-lg shadow-black/30 backdrop-blur-md"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <p className="whitespace-nowrap text-xs font-medium text-neutral-300">Mark detected — remove it?</p>

        <button
          type="button"
          onClick={cancelAutoClean}
          disabled={isAutoCleaning}
          className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-neutral-300 transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X size={13} />
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void applyAutoClean()}
          disabled={isAutoCleaning}
          className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isAutoCleaning ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-black/30 border-t-black" />
          ) : (
            <Check size={13} />
          )}
          {isAutoCleaning ? "Cleaning…" : "Apply"}
        </button>
      </div>
    </div>
  );
}
