"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Loader2, Pause, Play, UploadCloud, Volume2, VolumeX } from "lucide-react";
import {
  useVideoEditor,
  EFFECT_FILTERS,
  ASPECT_RATIO_VALUES,
  type Clip,
  type ClipFitMode,
  type TransitionPreviewState,
} from "@/context/VideoEditorContext";
import Timeline from "./Timeline";
import FrameCropOverlay from "./FrameCropOverlay";

// Fallback only — used for "original" before a clip's real dimensions are known yet (nothing
// uploaded, or metadata hasn't loaded). Once known, useNativeAspectRatio below supplies the
// clip's actual width/height instead, so "Original" genuinely means the source's own shape
// (portrait, square, ultra-wide, whatever it is) rather than always boxing it into 16:9.
const FALLBACK_ASPECT_RATIO = 16 / 9;

function subscribeToLoadedMetadata(el: HTMLVideoElement | null, onChange: () => void): () => void {
  if (!el) return () => {};
  el.addEventListener("loadedmetadata", onChange);
  return () => el.removeEventListener("loadedmetadata", onChange);
}

/** The uploaded clip's real native width/height ratio, kept in sync with whichever clip is
 * currently loaded into `videoRef`. Subscribes directly to the *element's* own `loadedmetadata`
 * event rather than keying off the clip identity — the same `<video>` node is reused across
 * clips (only its `src` swaps), so one persistent listener already catches every new video's
 * dimensions as they decode, including the very first upload. */
function useNativeAspectRatio(videoRef: { current: HTMLVideoElement | null }): number | null {
  const size = useSyncExternalStore(
    useCallback((onChange) => subscribeToLoadedMetadata(videoRef.current, onChange), [videoRef]),
    useCallback(() => {
      const el = videoRef.current;
      return el && el.videoWidth && el.videoHeight ? `${el.videoWidth}x${el.videoHeight}` : "";
    }, [videoRef]),
    () => "",
  );
  if (!size) return null;
  const [w, h] = size.split("x").map(Number);
  return w / h;
}

function objectFitClass(fitMode: ClipFitMode): string {
  if (fitMode === "cover") return "object-cover";
  if (fitMode === "stretch") return "object-fill";
  return "object-contain";
}

/** CSS equivalent of the export canvas's rotate/flip transform matrix (see VideoEditorContext's
 * drawFitted) — rotate first, then flip each axis, so the two stay visually consistent between
 * preview and the rendered file. Applied to a *wrapper* div around the video (not the video
 * itself), since the video element also needs its own, separate crop transform — see
 * `cropTransformStyle` below and the comment where both are used. */
function clipTransformStyle(clip: Clip): string {
  const parts: string[] = [];
  if (clip.rotation) parts.push(`rotate(${clip.rotation}deg)`);
  if (clip.flipHorizontal) parts.push("scaleX(-1)");
  if (clip.flipVertical) parts.push("scaleY(-1)");
  return parts.join(" ");
}

/** CSS equivalent of the export canvas's crop slice (see drawFitted's sx/sy/sWidth/sHeight) —
 * scales the video up by 1/width, 1/height and shifts it so the cropped region fills its own
 * box edge-to-edge. This treats the video as if it were stretched to fill that box first (see
 * the `object-fill` override below wherever a crop is active), which is the one case where the
 * math is exact; combined with `fitMode: "contain"/"cover"` it's an approximation, since object-
 * fit's own letterboxing and this transform can't both reason about the same box in plain CSS —
 * the export canvas (which composes them as two separate, explicit size computations) is the
 * source of truth for the final render either way. */
function cropTransformStyle(clip: Clip): CSSProperties {
  if (!clip.cropRect) return {};
  const width = Math.max(0.01, clip.cropRect.width);
  const height = Math.max(0.01, clip.cropRect.height);
  const scaleX = 1 / width;
  const scaleY = 1 / height;
  const translateX = -(clip.cropRect.x / width) * 100;
  const translateY = -(clip.cropRect.y / height) * 100;
  return {
    transform: `translate(${translateX}%, ${translateY}%) scale(${scaleX}, ${scaleY})`,
    transformOrigin: "0 0",
  };
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/** Mirrors the export pipeline's transition math (see VideoEditorContext's canvas renderers)
 * but expressed as CSS on two overlapping <video> elements instead of canvas draw calls — same
 * shapes (crossfade opacity, sliding translate, hard-edged wipe via clip-path, scale+fade zoom),
 * so what plays live roughly matches what Export bakes in, just driven by the DOM instead of a
 * MediaRecorder. `main` styles the currently-loaded clip, `overlay` the incoming one. */
function getTransitionPreviewStyles(preview: TransitionPreviewState | null): { main: CSSProperties; overlay: CSSProperties } {
  if (!preview) return { main: {}, overlay: { opacity: 0 } };
  const { type, direction, progress } = preview;
  switch (type) {
    case "fade":
      return { main: {}, overlay: { opacity: progress } };
    case "slide": {
      const dir = direction === "left" ? -1 : 1;
      return {
        main: { transform: `translateX(${progress * 100 * dir}%)` },
        overlay: { opacity: 1, transform: `translateX(${-dir * 100 * (1 - progress)}%)` },
      };
    }
    case "wipe": {
      const revealPct = progress * 100;
      const clipPath = direction === "left" ? `inset(0 0 0 ${100 - revealPct}%)` : `inset(0 ${100 - revealPct}% 0 0)`;
      return { main: {}, overlay: { opacity: 1, clipPath } };
    }
    case "zoom": {
      const outScale = 1 + progress * 0.15;
      const inScale = 1.15 - progress * 0.15;
      return {
        main: { transform: `scale(${outScale})`, opacity: 1 - progress },
        overlay: { opacity: progress, transform: `scale(${inScale})` },
      };
    }
    default:
      return { main: {}, overlay: { opacity: 0 } };
  }
}

/** The video-editor equivalent of CanvasWorkspace: a centered "board" (here, a 16:9 preview
 * frame instead of a canvas) with the same empty-state upload dropzone styling, plus a
 * timeline strip docked along the bottom — the one structural piece an image editor has no
 * analog for, since a video is inherently a sequence in time rather than a single frame. */
export default function VideoWorkspace() {
  const {
    videoRef,
    nextVideoRef,
    preloadNextClip,
    transitionPreview,
    hasVideo,
    isLoading,
    currentClip,
    isPlaying,
    volume,
    muted,
    textOverlays,
    currentTime,
    duration,
    addClips,
    togglePlay,
    toggleMuted,
    canvasAspectRatio,
    activePanelSection,
    setActivePanelSection,
  } = useVideoEditor();

  const { main: mainTransitionStyle, overlay: overlayTransitionStyle } = getTransitionPreviewStyles(transitionPreview);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const frameBoxRef = useRef<HTMLDivElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const isFrameEditing = activePanelSection === "frame" && Boolean(currentClip);
  const nativeAspectRatio = useNativeAspectRatio(videoRef);
  // While the Crop panel is open, the board always shows the *full, uncropped* source frame at
  // its own native shape — only the selection box drawn on top of it (FrameCropOverlay) reshapes
  // to the picked ratio. Letting the board itself snap to the ratio here (as it does once editing
  // ends, to preview the actual export framing) used to visibly resize/reposition the video every
  // time a ratio button was clicked, which is exactly the jump this avoids.
  const frameAspectRatio = isFrameEditing
    ? nativeAspectRatio ?? FALLBACK_ASPECT_RATIO
    : canvasAspectRatio === "original"
      ? (nativeAspectRatio ?? FALLBACK_ASPECT_RATIO)
      : ASPECT_RATIO_VALUES[canvasAspectRatio];

  // Interacting with the crop box needs the video to sit still and be shown undistorted — pause
  // playback the moment the Frame panel opens rather than leaving it running behind the overlay.
  useEffect(() => {
    if (isFrameEditing && isPlaying) togglePlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to *entering* frame-edit mode, not every isPlaying flicker
  }, [isFrameEditing]);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      addClips(event.target.files ?? []);
      event.target.value = "";
    },
    [addClips],
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!Array.from(event.dataTransfer.types).includes("Files")) return;
    event.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragActive(false), []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragActive(false);
      addClips(event.dataTransfer.files ?? []);
    },
    [addClips],
  );

  // Clicking anywhere in the workspace outside the video board while the Frame panel is open
  // exits crop/aspect-ratio editing — there's no separate "Apply" step to remember (every drag
  // already commits `cropRect` live, see FrameCropOverlay), so this just closes the editor once
  // the user's attention has clearly moved elsewhere, the same way a click-outside dismisses a
  // popover. Clicks on the board itself (the video, or the crop box on top of it) are always
  // "inside" `frameBoxRef` and never reach this.
  const handleWorkspacePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isFrameEditing) return;
      if (frameBoxRef.current && !frameBoxRef.current.contains(event.target as Node)) {
        setActivePanelSection(null);
      }
    },
    [isFrameEditing, setActivePanelSection],
  );

  return (
    <div
      data-video-workspace
      onPointerDown={handleWorkspacePointerDown}
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex w-full flex-1 flex-col overflow-hidden"
    >
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-3 pt-6 sm:p-6 sm:pt-10">
        <div
          ref={frameBoxRef}
          className="relative mx-auto h-full w-auto overflow-hidden rounded-lg bg-neutral-900 shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
          style={{ aspectRatio: String(frameAspectRatio), maxWidth: "min(100%, 56rem)", maxHeight: "100%" }}
        >
          {/* Rotate/flip (plus the transition slide/zoom transform) live on this wrapper, around
              the whole clip's visual — the video itself only carries the crop transform (see
              cropTransformStyle), so the two compose in the same order the export canvas does:
              crop first, then rotate/flip the cropped result. While the Frame panel is open
              (isFrameEditing) both are suppressed instead: FrameCropOverlay needs to show the
              plain, un-rotated, uncropped frame so its crop box lines up with `cropRect`'s own
              coordinate space (normalized fractions of the *pre-rotation* source). */}
          {currentClip && (
            <div
              className="absolute inset-0 overflow-hidden"
              style={
                isFrameEditing
                  ? {}
                  : {
                      opacity: mainTransitionStyle.opacity,
                      transform: [clipTransformStyle(currentClip), mainTransitionStyle.transform].filter(Boolean).join(" ") || undefined,
                    }
              }
            >
              <video
                ref={videoRef}
                src={currentClip.url}
                className={`h-full w-full ${isFrameEditing ? "object-contain" : currentClip.cropRect ? "object-fill" : objectFitClass(currentClip.fitMode)}`}
                style={{
                  filter: EFFECT_FILTERS[currentClip.effect],
                  ...(isFrameEditing ? {} : cropTransformStyle(currentClip)),
                }}
                // Combines the player-level master mute with this specific clip's own mute
                // (see AudioPanel's per-clip Mute toggle) — either one silences the element's
                // native output directly, matching the same `videoRef.current.muted` the export
                // pipeline's gain graph mirrors for its own mute handling.
                muted={muted || currentClip.muted}
                playsInline
                onClick={isFrameEditing ? undefined : togglePlay}
              />
            </div>
          )}

          {isFrameEditing && <FrameCropOverlay frameBoxRef={frameBoxRef} />}

          {/* Always mounted once a transition is configured just ahead (so it's decoded and
              ready by the time the window opens instead of stuttering in) — only visually
              revealed by `overlayTransitionStyle` while `transitionPreview` is active. Purely
              cosmetic: it's muted, audio always comes from the main element above. */}
          {preloadNextClip && (
            <div
              className="pointer-events-none absolute inset-0 overflow-hidden"
              style={{
                opacity: overlayTransitionStyle.opacity,
                clipPath: overlayTransitionStyle.clipPath,
                transform:
                  [clipTransformStyle(preloadNextClip), overlayTransitionStyle.transform].filter(Boolean).join(" ") || undefined,
              }}
            >
              <video
                ref={nextVideoRef}
                src={preloadNextClip.url}
                className={`h-full w-full ${preloadNextClip.cropRect ? "object-fill" : objectFitClass(preloadNextClip.fitMode)}`}
                style={{ filter: EFFECT_FILTERS[preloadNextClip.effect], ...cropTransformStyle(preloadNextClip) }}
                muted
                playsInline
              />
            </div>
          )}

          {hasVideo &&
            !isFrameEditing &&
            textOverlays
              .filter((overlay) => currentTime >= overlay.start && currentTime <= overlay.end)
              .map((overlay) => (
              <div
                key={overlay.id}
                className={`pointer-events-none absolute inset-x-0 flex justify-center px-6 ${
                  overlay.position === "top" ? "top-4" : overlay.position === "bottom" ? "bottom-4" : "top-1/2 -translate-y-1/2"
                }`}
              >
                <span className="rounded-md bg-black/60 px-3 py-1.5 text-center text-sm font-semibold text-white shadow-lg backdrop-blur-sm">
                  {overlay.text}
                </span>
              </div>
            ))}

          {hasVideo && !isPlaying && !isLoading && !isFrameEditing && (
            <button
              type="button"
              onClick={togglePlay}
              aria-label="Play"
              className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-black shadow-2xl transition-transform hover:scale-105">
                <Play size={26} fill="currentColor" className="translate-x-0.5" />
              </span>
            </button>
          )}

          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-950/75 backdrop-blur-[2px]">
              <Loader2 size={28} className="animate-spin text-neutral-300" />
              <p className="text-sm font-semibold text-neutral-100">Loading your video…</p>
            </div>
          )}

          {!hasVideo && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                multiple
                hidden
                onChange={handleFileChange}
                aria-label="Upload video"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed text-neutral-400 outline-none transition-colors hover:border-neutral-500 hover:bg-neutral-900/60 hover:text-neutral-200 focus-visible:ring-2 focus-visible:ring-white/40 ${
                  isDragActive ? "border-white/50 bg-neutral-900/60 text-neutral-200" : "border-neutral-700 bg-neutral-900/40"
                }`}
              >
                <UploadCloud size={32} strokeWidth={1.75} />
                <span className="text-sm font-semibold">
                  {isDragActive ? "Drop video to upload" : "Click to upload a video"}
                </span>
              </button>
            </>
          )}

          {hasVideo && !isFrameEditing && (
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-2.5 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2.5 pt-6 sm:px-4">
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="translate-x-0.5" />}
              </button>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-neutral-200">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <div className="flex-1" />
              <button
                type="button"
                onClick={toggleMuted}
                aria-label={muted || volume === 0 ? "Unmute" : "Mute"}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
              >
                {muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
            </div>
          )}
        </div>
      </div>

      <Timeline />
    </div>
  );
}
