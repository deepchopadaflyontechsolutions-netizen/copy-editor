"use client";

import { Crop, RotateCcw } from "lucide-react";
import { useVideoEditor, ASPECT_RATIO_LABELS, type CanvasAspectRatio } from "@/context/VideoEditorContext";
import { cropRectForAspectRatio } from "../FrameCropOverlay";
import PanelSection from "@/components/creativeflow/panels/PanelSection";
import { button, text } from "@/components/creativeflow/ui";

const ACCENT_BADGE = "flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50/15 text-slate-50 ring-1 ring-inset ring-slate-50/25";

const ASPECT_RATIO_OPTIONS: CanvasAspectRatio[] = ["16:9", "9:16", "1:1", "4:5", "original"];

/** Everything about the shape of the frame lives together here — the canvas's own aspect ratio
 * and the per-clip crop that fills it — since picking a ratio *is* picking a crop: it reshapes a
 * draggable/resizable selection box live on the preview (see FrameCropOverlay, mounted by
 * VideoWorkspace while this panel is open) rather than stretching or letterboxing the video, or
 * opening a separate modal. "Original" clears the crop and shows the full frame. */
export default function FramePanel() {
  const { canvasAspectRatio, setCanvasAspectRatio, currentClip, setClipCrop, videoRef } = useVideoEditor();

  // Picking a ratio both sets the canvas's own shape and immediately reshapes the clip's crop
  // to match it (same-center, sized from the source's *real* native pixels — see
  // cropRectForAspectRatio) — this is the one place that translates "ratio" into "crop", so
  // FrameCropOverlay's drag/resize can stay a pure editor of whatever `cropRect` already is.
  const handleAspectRatio = (ratio: CanvasAspectRatio) => {
    setCanvasAspectRatio(ratio);
    if (!currentClip) return;
    const el = videoRef.current;
    if (ratio === "original" || !el?.videoWidth || !el?.videoHeight) {
      if (currentClip.cropRect) setClipCrop(currentClip.id, null);
      return;
    }
    const next = cropRectForAspectRatio(currentClip.cropRect, ratio, { w: el.videoWidth, h: el.videoHeight });
    if (next) setClipCrop(currentClip.id, next);
  };

  return (
    <>
      <PanelSection title="Aspect ratio" actions={<span className={ACCENT_BADGE}><Crop size={13} /></span>}>
        <div className="flex flex-col gap-2">
          <p className={text.helper}>
            Picking a ratio doesn&rsquo;t resize or stretch the video — it selects a region of the frame to keep, sized to
            that ratio.
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {ASPECT_RATIO_OPTIONS.map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => handleAspectRatio(ratio)}
                aria-pressed={canvasAspectRatio === ratio}
                className={button.chip(canvasAspectRatio === ratio)}
              >
                {ASPECT_RATIO_LABELS[ratio]}
              </button>
            ))}
          </div>
        </div>
      </PanelSection>

      <PanelSection title="Crop">
        {currentClip ? (
          canvasAspectRatio === "original" ? (
            <p className={text.helper}>Pick a ratio above to select the part of the frame to keep, then drag it on the preview.</p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className={text.helper}>
                Drag the box on the preview to reposition it, or its corner/edge handles to resize — the rest of{" "}
                <span className="text-neutral-300">{currentClip.fileName}</span> is discarded from the export.
              </p>
              <button type="button" onClick={() => handleAspectRatio("original")} className={button.secondary}>
                <RotateCcw size={14} />
                Reset — keep full frame
              </button>
            </div>
          )
        ) : (
          <p className={text.helper}>Select a clip on the timeline to crop it.</p>
        )}
      </PanelSection>
    </>
  );
}
