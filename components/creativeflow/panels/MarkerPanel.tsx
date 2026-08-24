"use client";

import { Hand, MousePointer2, Paintbrush2, Pipette } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import type { DrawingTool } from "@/types/canvasEngine";
import PanelSection from "./PanelSection";
import LabeledSlider from "./LabeledSlider";
import { SWATCHES } from "./ColorWheelPanel";

const TOOLS: { key: DrawingTool; label: string; Icon: typeof MousePointer2 }[] = [
  { key: "selection", label: "Select", Icon: MousePointer2 },
  { key: "pan", label: "Pan", Icon: Hand },
  { key: "brush", label: "Brush", Icon: Paintbrush2 },
];

export default function MarkerPanel() {
  const { drawingTool, setDrawingTool, brushColor, setBrushColor, brushWidth, setBrushWidth, hasImage } =
    useCanvasEngine();

  return (
    <PanelSection title="Marker">
      <div className="flex items-center gap-1.5">
        {TOOLS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            aria-label={label}
            aria-pressed={drawingTool === key}
            disabled={!hasImage}
            onClick={() => setDrawingTool(key)}
            title={label}
            className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              drawingTool === key
                ? "border-indigo-500 bg-indigo-500/15 text-indigo-300"
                : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-200"
            }`}
          >
            <Icon size={14} />
          </button>
        ))}

        <label
          title="Pick a color"
          className="relative flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-800/50 text-slate-400 hover:text-slate-200"
        >
          <Pipette size={14} style={{ color: brushColor }} />
          <input
            type="color"
            value={brushColor}
            onChange={(event) => setBrushColor(event.target.value)}
            aria-label="Marker color picker"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
      </div>

      <div className="mt-3 grid grid-cols-8 gap-1.5">
        {SWATCHES.map((hex) => (
          <button
            key={hex}
            type="button"
            aria-label={`Set brush color ${hex}`}
            aria-pressed={brushColor.toLowerCase() === hex.toLowerCase()}
            disabled={!hasImage}
            onClick={() => setBrushColor(hex)}
            className={`h-6 w-6 rounded-full border transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${
              brushColor.toLowerCase() === hex.toLowerCase()
                ? "border-indigo-400 ring-2 ring-indigo-500/50"
                : "border-white/20"
            }`}
            style={{ backgroundColor: hex }}
          />
        ))}
      </div>

      <div className="mt-3">
        <LabeledSlider
          label="Size"
          value={brushWidth}
          defaultValue={8}
          min={1}
          max={60}
          suffix="px"
          disabled={!hasImage}
          onChange={setBrushWidth}
        />
      </div>
    </PanelSection>
  );
}
