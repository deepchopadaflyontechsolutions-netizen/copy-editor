"use client";

import { useRef, type ChangeEvent, type DragEvent } from "react";
import { Music, TrendingDown, TrendingUp, Trash2, UploadCloud, Volume2, VolumeX } from "lucide-react";
import { useVideoEditor, MAX_CLIP_VOLUME } from "@/context/VideoEditorContext";
import PanelSection from "@/components/creativeflow/panels/PanelSection";
import LabeledSlider from "@/components/creativeflow/panels/LabeledSlider";
import { button, text } from "@/components/creativeflow/ui";

const ACCENT_BADGE = "flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50/15 text-slate-50 ring-1 ring-inset ring-slate-50/25";

export default function AudioPanel() {
  const {
    backgroundAudio,
    addBackgroundAudio,
    removeBackgroundAudio,
    setBackgroundAudioVolume,
    toggleBackgroundAudioFadeIn,
    toggleBackgroundAudioFadeOut,
    clips,
    selectedClipId,
    setClipVolume,
    toggleClipMuted,
    toggleClipFadeIn,
    toggleClipFadeOut,
  } = useVideoEditor();

  const selectedClip = clips.find((c) => c.id === selectedClipId) ?? null;

  const bgFileInputRef = useRef<HTMLInputElement>(null);

  const handleBgFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) addBackgroundAudio(file);
  };

  const handleBgDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) addBackgroundAudio(file);
  };

  return (
    <PanelSection title="Audio" actions={<span className={ACCENT_BADGE}><Music size={13} /></span>}>
      <div className="flex flex-col gap-6">
        {selectedClip ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleClipMuted(selectedClip.id)}
                aria-label={selectedClip.muted ? "Unmute clip" : "Mute clip"}
                aria-pressed={selectedClip.muted}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors ${
                  selectedClip.muted
                    ? "border-white/25 bg-white/10 text-white"
                    : "border-neutral-700 bg-neutral-800/60 text-neutral-300 hover:border-neutral-600 hover:text-white"
                }`}
              >
                {selectedClip.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              <div className="flex-1">
                <LabeledSlider
                  label="Clip volume"
                  value={selectedClip.muted ? 0 : Math.round(selectedClip.volume * 100)}
                  min={0}
                  max={Math.round(MAX_CLIP_VOLUME * 100)}
                  suffix="%"
                  disabled={selectedClip.muted}
                  onChange={(value) => setClipVolume(selectedClip.id, value / 100)}
                />
              </div>
            </div>

            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => toggleClipFadeIn(selectedClip.id)}
                aria-pressed={selectedClip.fadeIn}
                className={`flex flex-1 items-center justify-center gap-1.5 ${button.chip(selectedClip.fadeIn)}`}
              >
                <TrendingUp size={13} />
                Fade in
              </button>
              <button
                type="button"
                onClick={() => toggleClipFadeOut(selectedClip.id)}
                aria-pressed={selectedClip.fadeOut}
                className={`flex flex-1 items-center justify-center gap-1.5 ${button.chip(selectedClip.fadeOut)}`}
              >
                <TrendingDown size={13} />
                Fade out
              </button>
            </div>
          </div>
        ) : (
          <p className={text.helper}>Select a clip on the timeline to control its volume, mute, or fades.</p>
        )}

        <div className="flex flex-col gap-3 border-t border-neutral-800/70 pt-5">
          <span className={text.fieldLabel}>Background music</span>
          {backgroundAudio ? (
            <div className="flex flex-col gap-3 rounded-lg border border-neutral-800/70 bg-neutral-900/40 p-3">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-800/70 text-neutral-300 ring-1 ring-inset ring-white/10">
                  <Music size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{backgroundAudio.fileName}</p>
                  <p className={text.helper}>Plays underneath every clip in the sequence</p>
                </div>
                <button
                  type="button"
                  onClick={removeBackgroundAudio}
                  aria-label="Remove background audio"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <LabeledSlider
                label="Background volume"
                value={Math.round(backgroundAudio.volume * 100)}
                min={0}
                max={100}
                suffix="%"
                onChange={(value) => setBackgroundAudioVolume(value / 100)}
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={toggleBackgroundAudioFadeIn}
                  aria-pressed={backgroundAudio.fadeIn}
                  className={`flex flex-1 items-center justify-center gap-1.5 ${button.chip(backgroundAudio.fadeIn)}`}
                >
                  <TrendingUp size={13} />
                  Fade in
                </button>
                <button
                  type="button"
                  onClick={toggleBackgroundAudioFadeOut}
                  aria-pressed={backgroundAudio.fadeOut}
                  className={`flex flex-1 items-center justify-center gap-1.5 ${button.chip(backgroundAudio.fadeOut)}`}
                >
                  <TrendingDown size={13} />
                  Fade out
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(event) => {
                if (Array.from(event.dataTransfer.types).includes("Files")) event.preventDefault();
              }}
              onDrop={handleBgDrop}
              onClick={() => bgFileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-700 bg-neutral-900/40 px-4 py-5 text-center transition-colors hover:border-neutral-600 hover:bg-neutral-900/60"
            >
              <UploadCloud size={20} className="text-neutral-400" strokeWidth={1.75} />
              <p className="text-sm font-semibold text-neutral-300">Drop or click to add background audio</p>
              <p className={text.helper}>Plays alongside your clips&apos; own audio — mixed in on Export.</p>
              <input ref={bgFileInputRef} type="file" accept="audio/*" hidden onChange={handleBgFileChange} aria-label="Upload background audio" />
            </div>
          )}
        </div>
      </div>
    </PanelSection>
  );
}
