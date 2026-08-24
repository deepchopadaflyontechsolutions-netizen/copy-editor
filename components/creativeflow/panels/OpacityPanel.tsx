"use client";

import { useCanvasEngine } from "@/context/CanvasEngineContext";
import PanelSection from "./PanelSection";
import LabeledSlider from "./LabeledSlider";

export default function OpacityPanel() {
  const { activeLayerId, activeLayerOpacity, setOpacity, commitHistorySnapshot } = useCanvasEngine();

  return (
    <PanelSection title="Opacity">
      <LabeledSlider
        label="Layer"
        value={activeLayerOpacity}
        defaultValue={100}
        disabled={!activeLayerId}
        onChange={setOpacity}
        onCommit={commitHistorySnapshot}
      />
    </PanelSection>
  );
}
