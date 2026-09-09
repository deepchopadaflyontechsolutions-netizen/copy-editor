"use client";

import { Check, Contrast, RotateCcw, Sun, Wand2 } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import { useCreativeFlow } from "@/context/CreativeFlowContext";
import type { FilterState } from "@/types/canvasEngine";
import PanelSection from "./PanelSection";
import AdjustSlider from "./AdjustSlider";
import { button } from "../ui";

const VIBRANCE_TRACK = "linear-gradient(to right, #475569, #ef4444)";
const SATURATION_TRACK = "linear-gradient(to right, #3b82f6, #64748b, #ef4444)";
const TEMPERATURE_TRACK = "linear-gradient(to right, #3b82f6, #eab308)";
const TINT_TRACK = "linear-gradient(to right, #a855f7, #22c55e)";
const HUE_TRACK = "linear-gradient(to right, #ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #ec4899, #ef4444)";

const RESET_COLOR: Partial<FilterState> = { saturation: 50, vibrance: 0, temperature: 0, tint: 0, hue: 0 };
const RESET_LIGHT: Partial<FilterState> = { exposure: 50, exposureAdjust: 0, contrast: 50, black: 0 };
const RESET_ALL: Partial<FilterState> = { ...RESET_COLOR, ...RESET_LIGHT };

const PRESET_AUTO: Partial<FilterState> = { contrast: 60, saturation: 60, vibrance: 15, exposureAdjust: 5 };
const PRESET_BW: Partial<FilterState> = { saturation: 0, vibrance: 0 };
const PRESET_POP: Partial<FilterState> = { contrast: 62, saturation: 75, vibrance: 40 };

function SectionResetButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-800 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-white"
    >
      <RotateCcw size={12} />
    </button>
  );
}

/** Photo Color/Light adjustment controls — presets up top, grouped sliders below, Reset/Apply footer. */
export default function AdjustPanel() {
  const { activeLayerId, activeFilterState, setFilters, commitHistorySnapshot } = useCanvasEngine();
  const { setActiveRightPanelSection } = useCreativeFlow();
  const disabled = !activeLayerId;

  const applyPreset = (patch: Partial<FilterState>) => {
    setFilters(patch);
    commitHistorySnapshot();
  };

  const handleReset = () => {
    applyPreset(RESET_ALL);
  };

  const handleApply = () => {
    commitHistorySnapshot();
    setActiveRightPanelSection(null);
  };

  return (
    <>
      <PanelSection title="Presets">
        <div className={`grid grid-cols-3 gap-2 ${disabled ? "opacity-40" : ""}`}>
          {[
            { label: "Auto", icon: Wand2, patch: PRESET_AUTO },
            { label: "B&W", icon: Contrast, patch: PRESET_BW },
            { label: "Pop", icon: Sun, patch: PRESET_POP },
          ].map(({ label, icon: Icon, patch }) => (
            <button
              key={label}
              type="button"
              disabled={disabled}
              onClick={() => applyPreset(patch)}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-800/40 py-3 text-xs font-semibold text-neutral-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed"
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </PanelSection>

      <PanelSection
        title="Color"
        actions={<SectionResetButton label="Reset color" onClick={() => applyPreset(RESET_COLOR)} />}
      >
        <div className="flex flex-col gap-3">
          <AdjustSlider
            label="Vibrance"
            value={activeFilterState.vibrance}
            disabled={disabled}
            trackGradient={VIBRANCE_TRACK}
            onChange={(value) => setFilters({ vibrance: value })}
            onCommit={commitHistorySnapshot}
          />
          <AdjustSlider
            label="Saturation"
            value={activeFilterState.saturation - 50}
            disabled={disabled}
            trackGradient={SATURATION_TRACK}
            onChange={(value) => setFilters({ saturation: value + 50 })}
            onCommit={commitHistorySnapshot}
          />
          <AdjustSlider
            label="Temperature"
            value={activeFilterState.temperature}
            disabled={disabled}
            trackGradient={TEMPERATURE_TRACK}
            onChange={(value) => setFilters({ temperature: value })}
            onCommit={commitHistorySnapshot}
          />
          <AdjustSlider
            label="Tint"
            value={activeFilterState.tint}
            disabled={disabled}
            trackGradient={TINT_TRACK}
            onChange={(value) => setFilters({ tint: value })}
            onCommit={commitHistorySnapshot}
          />
          <AdjustSlider
            label="Hue"
            value={activeFilterState.hue}
            disabled={disabled}
            trackGradient={HUE_TRACK}
            onChange={(value) => setFilters({ hue: value })}
            onCommit={commitHistorySnapshot}
          />
        </div>
      </PanelSection>

      <PanelSection
        title="Light"
        actions={<SectionResetButton label="Reset light" onClick={() => applyPreset(RESET_LIGHT)} />}
      >
        <div className="flex flex-col gap-3">
          <AdjustSlider
            label="Brightness"
            value={activeFilterState.exposure - 50}
            disabled={disabled}
            onChange={(value) => setFilters({ exposure: value + 50 })}
            onCommit={commitHistorySnapshot}
          />
          <AdjustSlider
            label="Exposure"
            value={activeFilterState.exposureAdjust}
            disabled={disabled}
            onChange={(value) => setFilters({ exposureAdjust: value })}
            onCommit={commitHistorySnapshot}
          />
          <AdjustSlider
            label="Contrast"
            value={activeFilterState.contrast - 50}
            disabled={disabled}
            onChange={(value) => setFilters({ contrast: value + 50 })}
            onCommit={commitHistorySnapshot}
          />
          <AdjustSlider
            label="Black"
            value={activeFilterState.black}
            disabled={disabled}
            onChange={(value) => setFilters({ black: value })}
            onCommit={commitHistorySnapshot}
          />
        </div>
      </PanelSection>

      <div className="sticky bottom-0 mt-auto flex shrink-0 items-center gap-2.5 border-t border-neutral-800/70 bg-neutral-900/95 px-4 py-3.5 backdrop-blur-md">
        <button
          type="button"
          onClick={handleReset}
          disabled={disabled}
          className={`flex-1 active:scale-[0.98] disabled:active:scale-100 ${button.secondary}`}
        >
          <RotateCcw size={15} strokeWidth={2.5} />
          Reset
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={disabled}
          className={`flex-1 active:scale-[0.98] disabled:active:scale-100 ${button.primary}`}
        >
          <Check size={15} strokeWidth={2.5} />
          Apply
        </button>
      </div>
    </>
  );
}
