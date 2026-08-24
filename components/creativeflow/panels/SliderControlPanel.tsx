"use client";

import PanelSection from "./PanelSection";
import SelectiveColorCurve from "../SelectiveColorCurve";

/** Thin restyle wrapper — the curve editor's own drag/pointer logic is untouched. */
export default function SliderControlPanel() {
  return (
    <PanelSection title="Slider Control">
      <SelectiveColorCurve />
    </PanelSection>
  );
}
