"use client";

import { useId, useState } from "react";
import { Type } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import PanelSection from "./PanelSection";
import { button, cardRadius, text as textStyles } from "../ui";

export default function WatermarkPanel() {
  const { hasImage, addTextWatermark } = useCanvasEngine();
  const [watermarkText, setText] = useState("");
  const inputId = useId();

  const handleAddText = () => {
    if (!watermarkText.trim()) return;
    addTextWatermark(watermarkText);
    setText("");
  };

  return (
    <PanelSection title="Watermark">
      <div className="flex flex-col gap-3">
        <div className={`${cardRadius} border border-neutral-800/70 bg-neutral-900/40 p-3`}>
          <div className="mb-3 flex items-center gap-2 border-b border-neutral-800/70 pb-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-white">
              <Type size={13} strokeWidth={2.25} />
            </span>
            <h4 className={textStyles.eyebrow}>Text watermark</h4>
          </div>

          <label htmlFor={inputId} className="sr-only">
            Watermark text
          </label>
          <input
            id={inputId}
            type="text"
            value={watermarkText}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleAddText()}
            placeholder="Your watermark text…"
            disabled={!hasImage}
            className="mb-2.5 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-white/25 focus:outline-none disabled:opacity-40"
          />
          <button
            type="button"
            onClick={handleAddText}
            disabled={!hasImage || !watermarkText.trim()}
            className={`w-full ${button.primary}`}
          >
            <Type size={14} strokeWidth={1.75} />
            Add text layer
          </button>
        </div>
      </div>
    </PanelSection>
  );
}
