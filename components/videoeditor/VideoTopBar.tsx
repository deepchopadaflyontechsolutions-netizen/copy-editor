"use client";

import Link from "next/link";
import { Download, Loader2, X } from "lucide-react";
import { useVideoEditor } from "@/context/VideoEditorContext";
import Logo from "@/components/Logo";
import { button } from "@/components/creativeflow/ui";

/** Mirrors EditorTopBar's chrome (logo, pill-grouped actions, primary Export CTA) so the
 * video editor reads as the same product, not a bolted-on second app. Undo/redo has no
 * history to act on yet (no edit is destructive/undoable in this pass), so that pill is
 * intentionally omitted rather than shown permanently disabled. */
export default function VideoTopBar() {
  const { hasVideo, canExport, isExporting, exportProgress, exportVideo, cancelExport } = useVideoEditor();

  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center gap-1.5 overflow-x-auto border-b border-neutral-800/70 bg-neutral-950/90 px-2.5 backdrop-blur-md sm:h-18 sm:gap-4 sm:px-5">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/10" />

      <Link href="/" className="flex shrink-0 items-center">
        <Logo size={36} wordmarkClassName="hidden text-base font-bold tracking-tight text-white sm:inline" />
      </Link>

      <span className="hidden shrink-0 rounded-md border border-neutral-800 bg-neutral-900/60 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 sm:inline-block">
        Video
      </span>

      <div className="flex-1" />

      {isExporting ? (
        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/60 py-1.5 pl-3 pr-1.5">
          <Loader2 size={13} className="animate-spin text-neutral-300" />
          <span className="min-w-11 font-mono text-xs tabular-nums text-neutral-300">
            {Math.round(exportProgress * 100)}%
          </span>
          <div className="h-1 w-16 overflow-hidden rounded-full bg-neutral-700 sm:w-24">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-150"
              style={{ width: `${Math.round(exportProgress * 100)}%` }}
            />
          </div>
          <button
            type="button"
            onClick={cancelExport}
            aria-label="Cancel export"
            className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={exportVideo}
          disabled={!hasVideo || !canExport}
          title={!hasVideo ? "Upload a video first" : !canExport ? "Export needs a Chromium-based browser" : "Render and download this edit"}
          className={`px-4 hover:scale-[1.02] disabled:hover:scale-100 ${button.primary}`}
        >
          <Download size={14} />
          Export
        </button>
      )}
    </header>
  );
}
