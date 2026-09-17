"use client";

import { useState } from "react";
import { Plus, Trash2, Type } from "lucide-react";
import { useVideoEditor, type TextOverlay } from "@/context/VideoEditorContext";
import PanelSection from "@/components/creativeflow/panels/PanelSection";
import { button, text } from "@/components/creativeflow/ui";

const POSITIONS: { id: TextOverlay["position"]; label: string }[] = [
  { id: "top", label: "Top" },
  { id: "center", label: "Center" },
  { id: "bottom", label: "Bottom" },
];

const ACCENT_BADGE = "flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50/15 text-slate-50 ring-1 ring-inset ring-slate-50/25";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/** Overlays render live on the preview and are burned into the frame during Export (see
 * VideoEditorContext's canvas-drawing export pipeline) — what you see here is what ships.
 * Each caption's timing window (when it shows up) is set by dragging its block on the
 * Timeline's Text lane, not here — this panel just reports it. */
export default function TextPanel() {
  const { textOverlays, addTextOverlay, updateTextOverlay, removeTextOverlay } = useVideoEditor();
  const [draft, setDraft] = useState("");

  const handleAdd = () => {
    const value = draft.trim();
    if (!value) return;
    addTextOverlay(value, "bottom");
    setDraft("");
  };

  return (
    <PanelSection title="Text overlay" actions={<span className={ACCENT_BADGE}><Type size={13} /></span>}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className={text.fieldLabel} htmlFor="text-overlay-input">
            Add caption
          </label>
          <div className="flex gap-2">
            <input
              id="text-overlay-input"
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleAdd();
              }}
              placeholder="Type a caption…"
              className="w-full min-w-0 rounded-lg border border-neutral-700 bg-neutral-800/60 px-3 py-2 text-sm text-white placeholder:text-neutral-500 outline-none focus-visible:border-neutral-500"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!draft.trim()}
              aria-label="Add caption"
              className={`shrink-0 px-3 ${button.primary}`}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {textOverlays.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {textOverlays.map((overlay) => (
              <div key={overlay.id} className="flex flex-col gap-2 rounded-lg border border-neutral-800/70 bg-neutral-900/40 p-2.5">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={overlay.text}
                    onChange={(event) => updateTextOverlay(overlay.id, { text: event.target.value })}
                    className="w-full min-w-0 rounded-md border border-neutral-700 bg-neutral-800/60 px-2.5 py-1.5 text-sm text-white outline-none focus-visible:border-neutral-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeTextOverlay(overlay.id)}
                    aria-label="Remove caption"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="flex gap-1.5">
                  {POSITIONS.map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => updateTextOverlay(overlay.id, { position: pos.id })}
                      aria-pressed={overlay.position === pos.id}
                      className={`flex-1 ${button.chip(overlay.position === pos.id)}`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
                <p className={text.helper}>
                  Shows {formatTime(overlay.start)} – {formatTime(overlay.end)} — drag its block on the Timeline&apos;s
                  Text lane to retime it.
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className={text.helper}>No captions yet — add one above and it&apos;ll show up on the preview.</p>
        )}
      </div>
    </PanelSection>
  );
}
