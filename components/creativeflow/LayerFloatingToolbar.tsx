"use client";

import type { ReactNode } from "react";
import { Copy, Crop as CropIcon, Lock, MoreHorizontal, Trash2, Unlock } from "lucide-react";
import { getRotatedCorners, toScreen } from "@/lib/canvasEngine/geometry";
import type { EngineLayer, Viewport } from "@/lib/canvasEngine/types";

interface LayerFloatingToolbarProps {
  layer: EngineLayer;
  viewport: Viewport;
  onToggleLock: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCrop: () => void;
}

export default function LayerFloatingToolbar({ layer, viewport, onToggleLock, onDuplicate, onDelete, onCrop }: LayerFloatingToolbarProps) {
  const corners = getRotatedCorners(layer.transform).map((c) => toScreen(c, viewport));
  const minY = Math.min(...corners.map((c) => c.y));
  const centerX = corners.reduce((sum, c) => sum + c.x, 0) / corners.length;

  return (
    <div
      className="pointer-events-none absolute z-3 -translate-x-1/2"
      style={{ left: centerX, top: minY - 50 }}
    >
      <div
        className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-slate-700/60 bg-slate-900/90 p-1 shadow-lg shadow-black/30 backdrop-blur-md"
        // This toolbar renders inside the same container the canvas
        // interaction hook listens on for pointerdown — without stopping
        // propagation here, clicking a button (which fires a native
        // pointerdown before its click) would bubble up, get hit-tested
        // against the layer's box, miss (the toolbar floats above it), and
        // deselect the layer out from under the click before it registers.
        onPointerDown={(event) => event.stopPropagation()}
      >
        <ToolbarButton label={layer.locked ? "Unlock" : "Lock"} onClick={onToggleLock} active={layer.locked}>
          {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
        </ToolbarButton>
        <ToolbarButton label="Duplicate" onClick={onDuplicate}>
          <Copy size={14} />
        </ToolbarButton>
        <ToolbarButton label="Delete" onClick={onDelete}>
          <Trash2 size={14} />
        </ToolbarButton>
        <span className="mx-0.5 h-4.5 w-px bg-slate-700/70" />
        <ToolbarButton label="Crop" onClick={onCrop}>
          <CropIcon size={14} />
        </ToolbarButton>
        <ToolbarButton label="More — coming soon" onClick={() => {}}>
          <MoreHorizontal size={14} />
        </ToolbarButton>
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
        active ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
