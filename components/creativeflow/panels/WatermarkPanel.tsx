"use client";

import { useId, useState } from "react";
import { Type, WandSparkles } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import PanelSection from "./PanelSection";
import { button, cardRadius, text as textStyles } from "../ui";

export default function WatermarkPanel() {
  const { hasImage, addTextWatermark, startAutoClean, autoCleanPreview, isAutoCleaning } = useCanvasEngine();
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

        <div className={`${cardRadius} border border-neutral-800/70 bg-neutral-900/40 p-3`}>
          <div className="mb-3 flex items-center gap-2 border-b border-neutral-800/70 pb-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-white">
              <WandSparkles size={13} strokeWidth={2.25} />
            </span>
            <h4 className={textStyles.eyebrow}>Auto remove</h4>
          </div>
          <p className={`mb-2.5 ${textStyles.helper}`}>
            Detect an existing watermark on the image and remove it automatically.
          </p>
          <button
            type="button"
            onClick={startAutoClean}
            disabled={!hasImage || autoCleanPreview || isAutoCleaning}
            className="flex w-full cursor-pointer items-start gap-2.5 rounded-lg border border-neutral-700 bg-neutral-800/60 px-3.5 py-2.5 text-left text-sm font-semibold text-neutral-200 transition-colors hover:border-neutral-600 hover:bg-neutral-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <WandSparkles size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            <span>Detect &amp; remove existing watermark</span>
          </button>
        </div>
      </div>
    </PanelSection>
  );
}
