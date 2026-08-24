"use client";

import { useCanvasEngine } from "@/context/CanvasEngineContext";
import PanelSection from "./PanelSection";
import LabeledSlider from "./LabeledSlider";

export default function BrightnessPanel() {
  const { activeLayerId, activeFilterState, setExposure, setContrast, setSaturation, commitHistorySnapshot } =
    useCanvasEngine();
  const disabled = !activeLayerId;

  return (
    <PanelSection id="panel-brightness" title="Brightness">
      <div className="flex flex-col gap-3">
        <LabeledSlider
          label="Exposure"
          value={activeFilterState.exposure}
          defaultValue={50}
          disabled={disabled}
          onChange={setExposure}
          onCommit={commitHistorySnapshot}
        />
        <LabeledSlider
          label="Contrast"
          value={activeFilterState.contrast}
          defaultValue={50}
          disabled={disabled}
          onChange={setContrast}
          onCommit={commitHistorySnapshot}
        />
        <LabeledSlider
          label="Saturation"
          value={activeFilterState.saturation}
          defaultValue={50}
          disabled={disabled}
          onChange={setSaturation}
          onCommit={commitHistorySnapshot}
        />
      </div>
    </PanelSection>
  );
}
