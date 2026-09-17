"use client";

import { Gauge } from "lucide-react";
import { useVideoEditor, MIN_CLIP_SPEED, MAX_CLIP_SPEED } from "@/context/VideoEditorContext";
import PanelSection from "@/components/creativeflow/panels/PanelSection";
import { button, text } from "@/components/creativeflow/ui";

const SPEED_PRESETS = [0.25, 0.5, 1, 1.5, 2, 4];
const ACCENT_BADGE = "flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50/15 text-slate-50 ring-1 ring-inset ring-slate-50/25";

export default function SpeedPanel() {
  const { clips, selectedClipId, setClipSpeed } = useVideoEditor();
  const selectedClip = clips.find((c) => c.id === selectedClipId) ?? null;

  return (
    <PanelSection title="Speed" actions={<span className={ACCENT_BADGE}><Gauge size={13} /></span>}>
      {selectedClip ? (
        <div className="flex flex-col gap-4">
          <div className="flex gap-1.5">
            {SPEED_PRESETS.map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => setClipSpeed(selectedClip.id, speed)}
                aria-pressed={selectedClip.speed === speed}
                className={`flex-1 ${button.chip(selectedClip.speed === speed)}`}
              >
                {speed}x
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Fine-tune</span>
              <span className="tabular-nums text-neutral-300">{selectedClip.speed.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min={MIN_CLIP_SPEED}
              max={MAX_CLIP_SPEED}
              step={0.05}
              value={selectedClip.speed}
              onChange={(event) => setClipSpeed(selectedClip.id, Number(event.target.value))}
              aria-label="Clip speed"
              className="h-1.5 w-full cursor-pointer accent-white"
            />
          </div>
        </div>
      ) : (
        <p className={text.helper}>Select a clip on the timeline to change its speed.</p>
      )}
    </PanelSection>
  );
}
