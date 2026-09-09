"use client";

import type { ReactNode } from "react";
import { Grid3x3, Maximize, Redo2, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";

export default function CanvasFloatingToolbar() {
  const { zoom, zoomIn, zoomOut, resetView, centerCanvas, undo, redo, canUndo, canRedo, showGrid, toggleGrid } =
    useCanvasEngine();

  return (
    <div className="pointer-events-none absolute left-1/2 top-3 z-2 -translate-x-1/2">
      <div
        className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-neutral-700/60 bg-neutral-900/85 p-1 shadow-lg shadow-black/30 backdrop-blur-md"
        // Renders inside the same container CanvasWorkspace's interaction
        // hook listens on for pointerdown — without this, a button click's
        // native pointerdown would bubble up, get hit-tested against
        // whatever layer is selected, miss (this toolbar floats above the
        // page, not necessarily over any layer), and deselect it.
        onPointerDown={(event) => event.stopPropagation()}
      >
        <ToolbarIconButton label="Undo" onClick={undo} disabled={!canUndo}>
          <Undo2 size={15} />
        </ToolbarIconButton>
        <ToolbarIconButton label="Redo" onClick={redo} disabled={!canRedo}>
          <Redo2 size={15} />
        </ToolbarIconButton>

        <span className="mx-0.5 h-4.5 w-px bg-neutral-700/70" />

        <ToolbarIconButton label="Zoom out" onClick={zoomOut}>
          <ZoomOut size={15} />
        </ToolbarIconButton>
        <button
          type="button"
          title="Reset zoom to 100%"
          onClick={resetView}
          className="min-w-11 rounded-full px-1 text-center text-xs font-semibold tabular-nums text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
        >
          {Math.round(zoom * 100)}%
        </button>
        <ToolbarIconButton label="Zoom in" onClick={zoomIn}>
          <ZoomIn size={15} />
        </ToolbarIconButton>

        <span className="mx-0.5 h-4.5 w-px bg-neutral-700/70" />

        <ToolbarIconButton label="Center canvas" onClick={centerCanvas}>
          <Maximize size={15} />
        </ToolbarIconButton>
        <ToolbarIconButton label={showGrid ? "Hide grid" : "Show grid"} onClick={toggleGrid} active={showGrid}>
          <Grid3x3 size={15} />
        </ToolbarIconButton>
      </div>
    </div>
  );
}

function ToolbarIconButton({
  label,
  onClick,
  active,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        active ? "bg-blue-600 text-white" : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
