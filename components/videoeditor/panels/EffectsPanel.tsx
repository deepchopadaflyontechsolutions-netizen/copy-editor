"use client";

import { Ban, Snowflake, Sun, Contrast, Sparkles, Wand2 } from "lucide-react";
import { useVideoEditor, type EffectPreset } from "@/context/VideoEditorContext";
import PanelSection from "@/components/creativeflow/panels/PanelSection";
import { text } from "@/components/creativeflow/ui";

const PRESETS: { id: EffectPreset; label: string; icon: typeof Ban }[] = [
  { id: "none", label: "None", icon: Ban },
  { id: "grayscale", label: "Grayscale", icon: Contrast },
  { id: "sepia", label: "Sepia", icon: Sun },
  { id: "warm", label: "Warm", icon: Sparkles },
  { id: "cool", label: "Cool", icon: Snowflake },
  { id: "contrast", label: "Bold", icon: Contrast },
];

const ACCENT_BADGE = "flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50/15 text-slate-50 ring-1 ring-inset ring-slate-50/25";

/** Applied to the *selected* clip's preview and, since it's a CSS filter string reused verbatim
 * by the export pipeline's canvas draw, baked into the rendered file too — not preview-only.
 * Scoping this per clip (rather than globally) is what lets a split segment carry its own look
 * independent of its sibling. */
export default function EffectsPanel() {
  const { clips, selectedClipId, updateClipEffect } = useVideoEditor();
  const clip = clips.find((c) => c.id === selectedClipId) ?? null;

  if (!clip) {
    return (
      <PanelSection title="Effects" actions={<span className={ACCENT_BADGE}><Wand2 size={13} /></span>}>
        <p className={text.helper}>Select a clip on the timeline to apply an effect.</p>
      </PanelSection>
    );
  }

  return (
    <PanelSection title="Effects" actions={<span className={ACCENT_BADGE}><Wand2 size={13} /></span>}>
      <div className="flex flex-col gap-3">
        <p className={text.helper}>
          Applied to <span className="text-neutral-300">{clip.fileName}</span> — live in the preview, and carried into Export.
        </p>
        {/* 2-up on narrow phones, 3-up once the (full-width, `md:hidden`) mobile sheet has room
            for it, back to 2-up on the fixed 320px desktop drawer — sized to match at each
            step so a tile never looks oversized for its column. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2 md:grid-cols-2 md:gap-2.5">
          {PRESETS.map(({ id, label, icon: Icon }) => {
            const isActive = clip.effect === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => updateClipEffect(clip.id, id)}
                aria-pressed={isActive}
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors md:gap-1.5 md:px-3 md:py-3 md:text-sm ${
                  isActive
                    ? "border-white/25 bg-white/10 text-white"
                    : "border-neutral-700 bg-neutral-800/40 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
                }`}
              >
                <Icon size={15} className="md:hidden" />
                <Icon size={18} className="hidden md:block" />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </PanelSection>
  );
}
