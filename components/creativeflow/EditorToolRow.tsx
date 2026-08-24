"use client";

import { useEffect, useRef, useState } from "react";
import { Hand, Layers as LayersIcon, MousePointer2, Paintbrush2, WandSparkles } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import { useCreativeFlow } from "@/context/CreativeFlowContext";
import LayersPanel from "./LayersPanel";
import HistoryPanel from "./HistoryPanel";

export default function EditorToolRow() {
  const {
    hasImage,
    cropMode,
    startAutoClean,
    autoCleanPreview,
    isAutoCleaning,
    healMode,
    drawingTool: currentDrawingTool,
    setDrawingTool: setCurrentDrawingTool,
  } = useCanvasEngine();
  const { rightPanelTab, setRightPanelTab } = useCreativeFlow();

  const [layerPopoverOpen, setLayerPopoverOpen] = useState(false);
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!layerPopoverOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (layerRef.current && !layerRef.current.contains(event.target as Node)) setLayerPopoverOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [layerPopoverOpen]);

  return (
    <div className="flex shrink-0 justify-center bg-slate-950/60 px-4 py-2">
      <div className="flex items-center gap-1 rounded-2xl bg-slate-900/70 p-1.5 shadow-lg shadow-black/20">
        <ToolIconButton
          label="Select"
          Icon={MousePointer2}
          active={!cropMode && currentDrawingTool === "selection"}
          disabled={!hasImage}
          onClick={() => setCurrentDrawingTool("selection")}
        />
        <ToolIconButton
          label="Move"
          Icon={Hand}
          active={!cropMode && currentDrawingTool === "pan"}
          disabled={!hasImage}
          onClick={() => setCurrentDrawingTool("pan")}
        />

        <div ref={layerRef} className="relative">
          <ToolIconButton
            label="Layer"
            Icon={LayersIcon}
            active={layerPopoverOpen}
            disabled={!hasImage}
            onClick={() => setLayerPopoverOpen((open) => !open)}
          />
          {layerPopoverOpen && (
            <div className="absolute left-1/2 top-full z-30 mt-2 w-64 -translate-x-1/2 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40">
              <div className="flex gap-1 border-b border-slate-800 p-1.5">
                <button
                  type="button"
                  onClick={() => setRightPanelTab("layers")}
                  aria-pressed={rightPanelTab === "layers"}
                  className={`flex-1 rounded-md py-1.5 text-[11px] font-semibold transition-colors ${
                    rightPanelTab === "layers" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Layers
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelTab("history")}
                  aria-pressed={rightPanelTab === "history"}
                  className={`flex-1 rounded-md py-1.5 text-[11px] font-semibold transition-colors ${
                    rightPanelTab === "history" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  History
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {rightPanelTab === "layers" ? <LayersPanel /> : <HistoryPanel />}
              </div>
            </div>
          )}
        </div>

        <ToolIconButton
          label="Draw"
          Icon={Paintbrush2}
          active={!cropMode && currentDrawingTool === "brush"}
          disabled={!hasImage}
          onClick={() => setCurrentDrawingTool("brush")}
        />

        <ToolIconButton
          label="Watermark"
          Icon={WandSparkles}
          active={autoCleanPreview}
          disabled={!hasImage || cropMode || healMode || autoCleanPreview || isAutoCleaning}
          onClick={startAutoClean}
        />
      </div>
    </div>
  );
}

function ToolIconButton({
  label,
  Icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  Icon: typeof MousePointer2;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        active ? "bg-indigo-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.4)]" : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}
