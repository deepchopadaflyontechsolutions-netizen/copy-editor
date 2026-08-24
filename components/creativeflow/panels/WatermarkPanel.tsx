"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, Type } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import PanelSection from "./PanelSection";

type WatermarkTab = "text" | "logo";

export default function WatermarkPanel() {
  const { hasImage, addTextWatermark, addImageLayer, isImageLoading } = useCanvasEngine();
  const [tab, setTab] = useState<WatermarkTab>("text");
  const [text, setText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const handleAddText = () => {
    if (!text.trim()) return;
    addTextWatermark(text);
    setText("");
  };

  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void addImageLayer(file);
  };

  return (
    <PanelSection title="Watermark">
      <div className="mb-3 flex gap-1 rounded-lg border border-slate-800 bg-slate-900/60 p-1">
        {(
          [
            { key: "text" as const, label: "Text", Icon: Type },
            { key: "logo" as const, label: "Logo", Icon: ImagePlus },
          ]
        ).map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-semibold transition-colors ${
              tab === key ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {tab === "text" ? (
        <div className="relative flex flex-col gap-2">
          <label htmlFor={inputId} className="sr-only">
            Watermark text
          </label>
          <input
            id={inputId}
            type="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleAddText()}
            placeholder="Your watermark text…"
            disabled={!hasImage}
            className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none disabled:opacity-40"
          />
          <button
            type="button"
            onClick={handleAddText}
            disabled={!hasImage || !text.trim()}
            className="flex items-center justify-center gap-1.5 rounded-md bg-indigo-600 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Type size={12} />
            Add text layer
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleLogoChange}
            aria-label="Upload logo image"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!hasImage || isImageLoading}
            className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-slate-700 py-3 text-[11px] font-medium text-slate-400 transition-colors hover:border-indigo-500/50 hover:text-indigo-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ImagePlus size={14} />
            {isImageLoading ? "Adding…" : "Upload a logo image"}
          </button>
        </div>
      )}
    </PanelSection>
  );
}
