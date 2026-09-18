"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
// The actual type/guard live in a plain (non-"use client") module so the server-rendered
// /video-editor page can also validate `?panel=` with `isVideoPanelSectionId` without importing
// a client-boundary symbol into server code — re-exported below so existing
// `import { type VideoPanelSectionId } from "@/context/VideoEditorContext"` call sites still work.
import { type VideoPanelSectionId, isVideoPanelSectionId } from "@/lib/videoPanelSections";

export type { VideoPanelSectionId };
export { isVideoPanelSectionId };

/** `start`/`end` are global-timeline seconds (same axis as `currentTime`/`clipRanges`), not
 * scoped to any one clip — a caption plays across whatever clip(s) happen to sit under that
 * window. This is what lets the Timeline's Text lane show/drag a duration block per overlay,
 * and lets the preview/export only show an overlay while the playhead is actually inside it. */
export interface TextOverlay {
  id: string;
  text: string;
  position: "top" | "center" | "bottom";
  start: number;
  end: number;
}

const MIN_OVERLAY_LENGTH = 0.3;

export type EffectPreset = "none" | "grayscale" | "sepia" | "warm" | "cool" | "contrast";

export const EFFECT_FILTERS: Record<EffectPreset, string> = {
  none: "none",
  grayscale: "grayscale(1)",
  sepia: "sepia(0.7)",
  warm: "sepia(0.35) saturate(1.3) hue-rotate(-8deg)",
  cool: "saturate(1.15) hue-rotate(12deg) brightness(1.03)",
  contrast: "contrast(1.25) saturate(1.1)",
};

export type CanvasAspectRatio = "16:9" | "9:16" | "1:1" | "4:5" | "original";

/** Width/height ratio for every fixed option — "original" has no fixed ratio (it just means
 * "whatever the first clip's native dimensions are"), so it's deliberately excluded from this
 * map rather than given a fake entry. */
export const ASPECT_RATIO_VALUES: Record<Exclude<CanvasAspectRatio, "original">, number> = {
  "16:9": 16 / 9,
  "9:16": 9 / 16,
  "1:1": 1,
  "4:5": 4 / 5,
};

export const ASPECT_RATIO_LABELS: Record<CanvasAspectRatio, string> = {
  "16:9": "16:9",
  "9:16": "9:16",
  "1:1": "1:1",
  "4:5": "4:5",
  original: "Original",
};

export type ClipRotation = 0 | 90 | 180 | 270;
export type ClipFlipAxis = "horizontal" | "vertical";
export type ClipFitMode = "contain" | "cover" | "stretch";

export type TransitionType = "none" | "fade" | "slide" | "wipe" | "zoom";
export type TransitionDirection = "left" | "right";

/** The transition that plays going *out* of a clip, into whichever clip follows it — so it
 * lives on the outgoing clip, not the incoming one, and the last clip's is simply never read
 * (there's nothing after it). `direction` only affects slide/wipe; fade/zoom ignore it. */
export interface ClipTransition {
  type: TransitionType;
  direction: TransitionDirection;
  duration: number;
}

export const DEFAULT_TRANSITION: ClipTransition = { type: "none", direction: "left", duration: 0.6 };
const MIN_TRANSITION_DURATION = 0.15;
const MAX_TRANSITION_DURATION = 2.5;

export const TRANSITION_LABELS: Record<TransitionType, string> = {
  none: "Cut",
  fade: "Fade",
  slide: "Slide",
  wipe: "Wipe",
  zoom: "Zoom",
};

export type ExportQuality = "720p" | "1080p" | "1440p";

export const EXPORT_QUALITY_LABELS: Record<ExportQuality, string> = {
  "720p": "720p",
  "1080p": "1080p",
  "1440p": "1440p",
};

/** Long-edge pixel reference for a fixed-ratio export (see the `reference` calc in exportVideo's
 * startRecording) and a matching MediaRecorder `videoBitsPerSecond` target — both scale together
 * so a higher-resolution export doesn't get starved down to the same bitrate as 720p and come
 * out mushy. "original"-aspect exports are unaffected (they always render at the source's own
 * native size, on the reasoning that "original" already means "don't second-guess the input"). */
export const EXPORT_QUALITY_REFERENCE: Record<ExportQuality, number> = {
  "720p": 1280,
  "1080p": 1920,
  "1440p": 2560,
};
export const EXPORT_QUALITY_BITRATE: Record<ExportQuality, number> = {
  "720p": 5_000_000,
  "1080p": 8_000_000,
  "1440p": 14_000_000,
};

export const MIN_CLIP_SPEED = 0.25;
export const MAX_CLIP_SPEED = 4;
export const MIN_CLIP_VOLUME = 0;
export const MAX_CLIP_VOLUME = 2;

/** Normalized 0-1 fractions of the clip's own *native, pre-rotation* source frame — e.g.
 * `{x:0.25,y:0,width:0.5,height:1}` keeps the center half of the frame's width. Applied before
 * rotation/flip/fitMode in both the preview and export pipelines: crop first slices out a
 * sub-image, then rotate/flip/fit treat that sub-image as if it were the whole source. */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CropAspectLock = "free" | "1:1" | "16:9" | "4:3";

export const CROP_ASPECT_RATIOS: Record<Exclude<CropAspectLock, "free">, number> = {
  "1:1": 1,
  "16:9": 16 / 9,
  "4:3": 4 / 3,
};

export const MIN_CROP_FRACTION = 0.05;

/** One clip on the timeline. `duration` is the full length of the underlying source file;
 * `trimStart`/`trimEnd` are the in/out points *within that source* that actually play — the
 * same pair the old single-clip editor kept globally, just now scoped per clip so a split can
 * hand each half its own independent range (and, since `effect` also lives here, its own
 * look). Two clips can point at the same `file`/`url` after a split.
 *
 * `speed` (0.25x-4x) is real, not preview-only: it changes how much of the sequence's own
 * timeline this clip actually occupies (clipRanges below divides by it) and drives the export
 * video elements' own `playbackRate`, so a sped-up/slowed-down clip is genuinely faster/slower
 * in the rendered file, not just in-app. `volume` (0-2, i.e. 0%-200%) is a per-clip gain — up to
 * 100% it's just the native element's own volume; the extra headroom above 100% only a Web Audio
 * GainNode can actually produce (HTMLMediaElement.volume caps at 1), so both the preview and the
 * export route audio through one when a clip needs the boost. */
export interface Clip {
  id: string;
  file: File;
  url: string;
  fileName: string;
  duration: number;
  trimStart: number;
  trimEnd: number;
  effect: EffectPreset;
  transitionOut: ClipTransition;
  rotation: ClipRotation;
  flipHorizontal: boolean;
  flipVertical: boolean;
  fitMode: ClipFitMode;
  speed: number;
  volume: number;
  /** Silences this clip's own audio specifically (distinct from the player's global `muted`,
   * which mutes whatever's currently loaded regardless of clip) — real in both preview and
   * export, via the same gain graph `volume` uses. */
  muted: boolean;
  /** Linear gain ramp from 0 up to this clip's own `volume` over the first `CLIP_FADE_SECONDS`
   * after `trimStart` — real in preview (see the fade rAF effect) and export (see
   * `loadIntoElement`'s gain scheduling), not just a UI toggle. */
  fadeIn: boolean;
  /** Mirror of `fadeIn`, ramping down to 0 over the last `CLIP_FADE_SECONDS` before `trimEnd`. */
  fadeOut: boolean;
  cropRect?: CropRect;
}

interface ClipRange {
  clip: Clip;
  start: number;
  end: number;
}

interface HistorySnapshot {
  clips: Clip[];
  textOverlays: TextOverlay[];
}

export interface BackgroundAudioTrack {
  file: File;
  url: string;
  fileName: string;
  duration: number;
  volume: number;
  fadeIn: boolean;
  fadeOut: boolean;
}

// A dense filmstrip (many small frames) reads as a professional NLE timeline — a sparse one
// (the old count of 8, stretched to fill the same width) reads as a handful of blurry, overly
// stretched screenshots. Raster width is dropped alongside the count increase so generating 4x
// as many frames doesn't cost proportionally more canvas/decode work or memory.
const CLIP_THUMB_COUNT = 36;
const CLIP_THUMB_WIDTH = 64;
const MIN_CLIP_LENGTH = 0.15;
const AUDIO_FADE_SECONDS = 1.5;
/** Per-clip fade in/out ramp length — same 1-3s ballpark as the master/background fades above,
 * clamped per-clip to half that clip's own trimmed length so a very short clip still fades
 * smoothly in both directions instead of the two ramps overlapping/canceling out. */
const CLIP_FADE_SECONDS = 1.5;

let nextOverlayId = 1;
let nextClipId = 1;

/** True only in browsers that can hand back a live MediaStream from a playing <video>/<canvas>
 * and mix audio through the Web Audio API — the foundation the export pipeline below is built
 * on (no ffmpeg/server round-trip: the whole render happens by re-drawing frames to a canvas in
 * real time and recording the result). Safari's coverage is inconsistent, so this is checked
 * before ever offering Export. */
function canExportInThisBrowser(): boolean {
  if (typeof window === "undefined") return false;
  return (
    typeof HTMLCanvasElement !== "undefined" &&
    "captureStream" in HTMLCanvasElement.prototype &&
    typeof MediaRecorder !== "undefined" &&
    (typeof AudioContext !== "undefined" || typeof (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext !== "undefined")
  );
}

// Resolves to 0 (rather than hanging forever) if the file can't actually be decoded — a
// mistyped/corrupt upload should fail gracefully, not leave the caller waiting on an event
// that will never fire. Browsers are also inconsistent about reporting a bare-audio `.webm`'s
// File.type as "audio/webm" vs "video/webm", so callers probe first and judge by whether
// metadata actually loaded rather than trusting `file.type` up front.
function probeMediaDuration(el: HTMLVideoElement | HTMLAudioElement): Promise<number> {
  return new Promise((resolve) => {
    const onLoaded = () => {
      cleanup();
      resolve(el.duration || 0);
    };
    const onError = () => {
      cleanup();
      resolve(0);
    };
    const cleanup = () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("error", onError);
    };
    el.addEventListener("loadedmetadata", onLoaded, { once: true });
    el.addEventListener("error", onError, { once: true });
  });
}

/** Clamps a requested transition duration so it can never eat more than roughly half of either
 * adjacent clip's own length — a 2s fade between two 1s clips would just be wrong. */
function clampTransitionDuration(requested: number, outClip: Clip, inClip: Clip): number {
  const outLen = Math.max(0, outClip.trimEnd - outClip.trimStart);
  const inLen = Math.max(0, inClip.trimEnd - inClip.trimStart);
  const ceiling = Math.min(MAX_TRANSITION_DURATION, outLen / 2, inLen / 2);
  return Math.max(0, Math.min(requested, ceiling));
}

/** Generates a small filmstrip for one clip by seeking a detached, invisible <video> to
 * CLIP_THUMB_COUNT evenly-spaced points and rasterizing each frame to a small canvas — pure
 * client-side, no server round-trip. Runs once per clip id (see the effect that calls this). */
async function generateClipThumbnails(clip: Clip): Promise<string[]> {
  const probe = document.createElement("video");
  probe.src = clip.url;
  probe.muted = true;
  probe.playsInline = true;
  const duration = await probeMediaDuration(probe);
  if (duration <= 0) return [];

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const aspect = probe.videoHeight / probe.videoWidth || 9 / 16;
  canvas.width = CLIP_THUMB_WIDTH;
  canvas.height = Math.max(1, Math.round(CLIP_THUMB_WIDTH * aspect));

  const frames: string[] = [];
  for (let i = 0; i < CLIP_THUMB_COUNT; i++) {
    const time = (duration * (i + 0.5)) / CLIP_THUMB_COUNT;
    await new Promise<void>((resolve) => {
      const onSeeked = () => {
        probe.removeEventListener("seeked", onSeeked);
        resolve();
      };
      probe.addEventListener("seeked", onSeeked);
      probe.currentTime = time;
    });
    if (ctx) {
      ctx.drawImage(probe, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL("image/jpeg", 0.6));
    }
  }
  return frames;
}

export interface TransitionPreviewState {
  type: Exclude<TransitionType, "none">;
  direction: TransitionDirection;
  progress: number;
  incomingClip: Clip;
  elapsedSeconds: number;
}

interface VideoEditorContextValue {
  videoRef: RefObject<HTMLVideoElement | null>;
  nextVideoRef: RefObject<HTMLVideoElement | null>;
  preloadNextClip: Clip | null;
  transitionPreview: TransitionPreviewState | null;
  hasVideo: boolean;
  isLoading: boolean;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  volume: number;
  muted: boolean;
  textOverlays: TextOverlay[];
  activePanelSection: VideoPanelSectionId | null;
  setActivePanelSection: (id: VideoPanelSectionId | null) => void;
  /** Whether the mobile bottom tools sheet (VideoToolDock's `md:hidden` sheet) is actually open
   * and covering the bottom of the screen — distinct from `activePanelSection` being set, since
   * a tab stays "selected" after the sheet is dismissed (so reopening it returns to the same
   * tab). VideoWorkspace reads this to reserve space above the sheet so the crop box and other
   * preview controls never end up hidden underneath it. */
  mobilePanelOpen: boolean;
  setMobilePanelOpen: (open: boolean) => void;

  // Canvas/frame
  canvasAspectRatio: CanvasAspectRatio;
  setCanvasAspectRatio: (ratio: CanvasAspectRatio) => void;
  exportQuality: ExportQuality;
  setExportQuality: (quality: ExportQuality) => void;

  // Multi-clip sequence
  clips: Clip[];
  currentClip: Clip | null;
  clipRanges: { clipId: string; start: number; end: number }[];
  selectedClipId: string | null;
  selectClip: (id: string | null) => void;
  clipThumbnails: Record<string, string[]>;
  addClips: (files: FileList | File[]) => void;
  removeClip: (id: string) => void;
  clearProject: () => void;
  reorderClips: (fromIndex: number, toIndex: number) => void;
  updateClipTrim: (id: string, trimStart: number, trimEnd: number) => void;
  updateClipEffect: (id: string, effect: EffectPreset) => void;
  canSplit: boolean;
  splitAtPlayhead: () => void;
  updateClipTransition: (id: string, patch: Partial<ClipTransition>) => void;
  applyTransitionToAll: (id: string) => void;
  rotateClip: (id: string, direction: "cw" | "ccw") => void;
  toggleClipFlip: (id: string, axis: ClipFlipAxis) => void;
  setClipFitMode: (id: string, mode: ClipFitMode) => void;
  /** Pass `null` to clear the crop entirely. */
  setClipCrop: (id: string, cropRect: CropRect | null) => void;
  /** Real, export-synced playback rate for this clip (0.25x-4x) — see the `Clip.speed` doc. */
  setClipSpeed: (id: string, speed: number) => void;
  /** Per-clip gain, 0-2 (0%-200%) — see the `Clip.volume` doc. */
  setClipVolume: (id: string, volume: number) => void;
  /** See the `Clip.muted` doc — distinct from the player-level `muted` above. */
  toggleClipMuted: (id: string) => void;
  /** See the `Clip.fadeIn`/`Clip.fadeOut` docs. */
  toggleClipFadeIn: (id: string) => void;
  toggleClipFadeOut: (id: string) => void;
  canUndo: boolean;
  undo: () => void;
  /** Snapshots the current clips + text overlays so a caller-driven edit sequence that isn't
   * itself one atomic state update (e.g. a Timeline drag: many pointermove ticks) becomes a
   * single undo step instead of one step per tick. Call once at the start of the gesture. */
  beginTimelineEdit: () => void;

  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (value: number) => void;
  toggleMuted: () => void;
  loopPlayback: boolean;
  toggleLoopPlayback: () => void;
  addTextOverlay: (text: string, position: TextOverlay["position"]) => void;
  updateTextOverlay: (id: string, patch: Partial<Omit<TextOverlay, "id">>) => void;
  removeTextOverlay: (id: string) => void;

  // Audio
  audioFadeIn: boolean;
  audioFadeOut: boolean;
  toggleAudioFadeIn: () => void;
  toggleAudioFadeOut: () => void;
  backgroundAudio: BackgroundAudioTrack | null;
  addBackgroundAudio: (file: File) => void;
  removeBackgroundAudio: () => void;
  setBackgroundAudioVolume: (value: number) => void;
  toggleBackgroundAudioFadeIn: () => void;
  toggleBackgroundAudioFadeOut: () => void;

  canExport: boolean;
  isExporting: boolean;
  exportProgress: number;
  exportVideo: () => void;
  cancelExport: () => void;
}

const VideoEditorContext = createContext<VideoEditorContextValue | null>(null);

export function VideoEditorProvider({
  children,
  initialAssetFile = null,
  initialPanel = null,
}: {
  children: ReactNode;
  /** A video file the landing page already handed off (see VideoEditorApp's own `loadAsset`
   * call) — added as this project's first clip the moment it resolves. Mirrors how
   * CanvasEngineProvider accepts `initialImageFile` for the image editor's own landing-page
   * handoff. */
  initialAssetFile?: File | null;
  /** Which sidebar panel to open once `initialAssetFile` has landed — read from `?panel=` on
   * /video-editor, e.g. the landing page's "Crop" quick action deep-links straight to the Crop
   * panel instead of dropping the user on a blank drawer. */
  initialPanel?: VideoPanelSectionId | null;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // A second, always-mounted (but normally invisible) <video> used only to *preview* a
  // transition live — see `transitionPreview` below. Export renders transitions for real on an
  // offscreen canvas; this one just gives the in-app preview something honest to show instead
  // of a silent hard cut while a transition is configured.
  const nextVideoRef = useRef<HTMLVideoElement | null>(null);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgObjectUrlRef = useRef<string | null>(null);
  // Lazily-created, kept alive for the life of the app: the main preview <video> element only
  // ever exists once (its `src` swaps per clip, the node itself doesn't remount), so
  // createMediaElementSource can safely be called on it exactly once and reused — a second call
  // on the same element throws. Only created the first time a clip actually needs >100% volume
  // boost, since native HTMLMediaElement.volume already handles the 0-100% range on its own.
  const previewAudioCtxRef = useRef<AudioContext | null>(null);
  const previewGainRef = useRef<GainNode | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  // Tracked by clip *id*, not array position — reordering or removing clips would otherwise
  // silently make an index point at the wrong clip. The numeric index used for playback below
  // is derived from this id every render instead of stored.
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const [clipThumbnails, setClipThumbnails] = useState<Record<string, string[]>>({});

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopPlayback, setLoopPlayback] = useState(false);
  const [volume, setVolumeState] = useState(1);
  const [muted, setMuted] = useState(false);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  // Upload is the only tab that works before a clip exists, so it starts pre-selected —
  // the other tabs stay disabled (enforced by the tool dock) until `hasVideo` flips true.
  const [activePanelSection, setActivePanelSection] = useState<VideoPanelSectionId | null>("upload");
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const [audioFadeIn, setAudioFadeIn] = useState(false);
  const [audioFadeOut, setAudioFadeOut] = useState(false);
  const [backgroundAudio, setBackgroundAudio] = useState<BackgroundAudioTrack | null>(null);
  const [canvasAspectRatio, setCanvasAspectRatio] = useState<CanvasAspectRatio>("original");
  const [exportQuality, setExportQuality] = useState<ExportQuality>("1080p");

  // Undo history: only clips + text overlays are tracked (the two pieces of state that split/
  // trim/ripple-delete/rotate/etc. actually mutate) — background-audio and playback settings
  // aren't part of the undo stack. Capped so an aggressive editing session can't grow this
  // unboundedly; oldest entries just fall off.
  const [history, setHistory] = useState<HistorySnapshot[]>([]);

  const exportCancelRef = useRef(false);
  const isPlayingRef = useRef(false);
  const loopPlaybackRef = useRef(false);
  const clipsRef = useRef<Clip[]>([]);
  const textOverlaysRef = useRef<TextOverlay[]>([]);
  const activeClipIndexRef = useRef(0);
  const clipRangesRef = useRef<ClipRange[]>([]);
  const pendingAutoplayRef = useRef(false);
  const pendingSeekLocalRef = useRef<number | null>(null);
  const selectedClipIdRef = useRef<string | null>(null);
  const thumbnailInFlightRef = useRef<Record<string, boolean>>({});

  // Cumulative sequence timing derived from every clip's own (trimEnd - trimStart) / speed —
  // that division is what makes a 2x clip take up half as much of the timeline and a 0.5x clip
  // twice as much, matching how long it actually takes to play at that rate. This is the single
  // source of truth both playback and export walk through to turn "one long timeline" into
  // "which clip, and where in it". Written as a purely functional prefix-sum (no mutable
  // accumulator) so it stays safe under React Compiler.
  const clipRanges = useMemo<ClipRange[]>(
    () =>
      clips.map((clip, index) => {
        const effectiveLength = (c: Clip) => Math.max(0, c.trimEnd - c.trimStart) / Math.max(MIN_CLIP_SPEED, c.speed);
        const start = clips.slice(0, index).reduce((sum, c) => sum + effectiveLength(c), 0);
        return { clip, start, end: start + effectiveLength(clip) };
      }),
    [clips],
  );
  const duration = clipRanges.length > 0 ? clipRanges[clipRanges.length - 1].end : 0;

  const activeClipIndex = useMemo(() => {
    const idx = clips.findIndex((c) => c.id === activeClipId);
    return idx === -1 ? 0 : idx;
  }, [clips, activeClipId]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    loopPlaybackRef.current = loopPlayback;
  }, [loopPlayback]);
  useEffect(() => {
    clipsRef.current = clips;
  }, [clips]);
  useEffect(() => {
    textOverlaysRef.current = textOverlays;
  }, [textOverlays]);
  useEffect(() => {
    activeClipIndexRef.current = activeClipIndex;
  }, [activeClipIndex]);
  useEffect(() => {
    clipRangesRef.current = clipRanges;
  }, [clipRanges]);
  useEffect(() => {
    selectedClipIdRef.current = selectedClipId;
  }, [selectedClipId]);

  // Undo: pushHistory snapshots clipsRef/textOverlaysRef (not the `clips`/`textOverlays` state
  // variables themselves) so it always captures whatever was actually committed as of the last
  // render, regardless of which callback closure calls it. Every *discrete* clip/overlay mutator
  // below calls this once before making its change; continuous ones (Timeline drags) instead
  // call the exposed `beginTimelineEdit` once at the start of the gesture, so a whole drag
  // collapses into a single undo step instead of one per pointermove tick.
  const pushHistory = useCallback(() => {
    setHistory((prev) => {
      const next = [...prev, { clips: clipsRef.current, textOverlays: textOverlaysRef.current }];
      return next.length > 30 ? next.slice(next.length - 30) : next;
    });
  }, []);
  const beginTimelineEdit = pushHistory;

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setClips(last.clips);
      setTextOverlays(last.textOverlays);
      return prev.slice(0, -1);
    });
  }, []);
  const canUndo = history.length > 0;

  // Single-clip editor: only one video is ever loaded at a time, so a new upload replaces
  // whatever's currently loaded (like a standalone trim tool) rather than appending to a
  // sequence. Only the first file of a multi-file selection/drop is used.
  const addClips = useCallback((files: FileList | File[]) => {
    // Filtering on `file.type` up front would silently drop legitimate files whose browser-
    // reported MIME type doesn't cleanly start with "video/" (containers like .mkv/.mov are
    // inconsistently sniffed across browsers/OSes) — the `accept="video/*"` on the file input
    // already steers the native picker, and here the file gets a real decode attempt; one that
    // actually fails to load (probed duration <= 0) is skipped, silently but safely.
    const file = Array.from(files)[0];
    if (!file) return;
    setIsLoading(true);
    void (async () => {
      const url = URL.createObjectURL(file);
      const probe = document.createElement("video");
      probe.preload = "metadata";
      probe.src = url;
      const dur = await probeMediaDuration(probe);
      if (dur <= 0) {
        URL.revokeObjectURL(url);
        setIsLoading(false);
        return;
      }
      const created: Clip = {
        id: `clip-${nextClipId++}`,
        file,
        url,
        fileName: file.name,
        duration: dur,
        trimStart: 0,
        trimEnd: dur,
        effect: "none",
        transitionOut: DEFAULT_TRANSITION,
        rotation: 0,
        flipHorizontal: false,
        flipVertical: false,
        fitMode: "contain",
        speed: 1,
        volume: 1,
        muted: false,
        fadeIn: false,
        fadeOut: false,
      };
      setClips((prev) => {
        prev.forEach((c) => URL.revokeObjectURL(c.url));
        return [created];
      });
      setTextOverlays([]);
      setSelectedClipId(created.id);
      setActiveClipId(created.id);
      // Leaves whichever panel the user already had open (usually "upload") alone — closing it
      // here used to snap the sidebar shut the instant a file finished uploading/replacing,
      // right when the user wants to see the result of that action.
      setIsLoading(false);
    })();
  }, []);

  // Seeds the project with whatever file the landing page already handed off, the moment it
  // resolves (`initialAssetFile` starts null and flips once VideoEditorApp's own `loadAsset`
  // call finishes) — `addClips` itself is stable, so this only ever fires once per real handoff.
  // Same "runs once per handed-off file" shape as CanvasEngineProvider's own `initialImageFile`
  // effect, and the same reason for the lint suppression: reacting to a value that just arrived
  // from an external source (IndexedDB) is exactly what this effect is for.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialAssetFile) addClips([initialAssetFile]);
  }, [initialAssetFile, addClips]);

  // Opens whichever panel the landing page deep-linked to (`initialPanel`), but only once the
  // handed-off clip has actually landed — `addClips` itself ends by resetting
  // `activePanelSection` to null, so this has to run *after* that settles, not race it. The ref
  // guard makes it a true one-shot: once applied, later clip/panel changes are left alone.
  const appliedInitialPanelRef = useRef(false);
  useEffect(() => {
    if (appliedInitialPanelRef.current || !initialPanel || clips.length === 0) return;
    appliedInitialPanelRef.current = true;
    setActivePanelSection(initialPanel);
  }, [initialPanel, clips.length]);

  // Removal/clearing are the only two places the clip list can shrink, so the "nothing left to
  // play" reset (pausing the element, zeroing playback state) lives directly in these event
  // handlers rather than a useEffect watching `clips` — it only ever needs to run exactly when
  // one of these two actions causes it.
  //
  // Ripple-delete: because the sequence is a contiguous concatenation (clipRanges is a prefix-
  // sum with no gaps), every later clip already shifts left automatically once the removed one
  // drops out of the array — that part needs no special handling. What *does* need explicit
  // handling is every other track anchored to absolute global-timeline seconds: text overlays.
  // Left untouched, an overlay timed to sit over what's now a different, shifted stretch of
  // footage would silently drift out of sync with the cut. So overlays entirely after the
  // removed clip shift left by its length, overlays entirely inside it are collapsed to a
  // zero-length stub at the cut point (and then dropped by the filter below), and an overlay
  // straddling the cut has its tail trimmed back to the cut point.
  const removeClip = useCallback(
    (id: string) => {
      const idx = clips.findIndex((c) => c.id === id);
      if (idx === -1) return;
      const removedRange = clipRanges[idx];
      const removedDuration = removedRange.end - removedRange.start;
      pushHistory();
      const remaining = clips.filter((c) => c.id !== id);
      URL.revokeObjectURL(clips[idx].url);
      setClips(remaining);
      setTextOverlays((prev) =>
        prev
          .map((overlay) => {
            if (overlay.start >= removedRange.end) {
              return { ...overlay, start: overlay.start - removedDuration, end: overlay.end - removedDuration };
            }
            if (overlay.start >= removedRange.start) {
              const span = overlay.end - overlay.start;
              return { ...overlay, start: removedRange.start, end: removedRange.start + span };
            }
            if (overlay.end > removedRange.start) {
              return { ...overlay, end: removedRange.start };
            }
            return overlay;
          })
          .filter((overlay) => overlay.end - overlay.start > 0.05),
      );
      setSelectedClipId((prev) => (prev === id ? (remaining[0]?.id ?? null) : prev));
      setActiveClipId((prev) => (prev === id ? (remaining[0]?.id ?? null) : prev));
      if (remaining.length === 0) {
        videoRef.current?.pause();
        setIsPlaying(false);
        setCurrentTime(0);
      }
    },
    [clips, clipRanges, pushHistory],
  );

  const clearProject = useCallback(() => {
    clips.forEach((clip) => URL.revokeObjectURL(clip.url));
    setClips([]);
    setSelectedClipId(null);
    setActiveClipId(null);
    setTextOverlays([]);
    setActivePanelSection("upload");
    videoRef.current?.pause();
    setIsPlaying(false);
    setCurrentTime(0);
  }, [clips]);

  const reorderClips = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= clips.length ||
        toIndex >= clips.length
      ) {
        return;
      }
      pushHistory();
      setClips((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
    },
    [clips.length, pushHistory],
  );

  const updateClipTrim = useCallback((id: string, trimStart: number, trimEnd: number) => {
    setClips((prev) =>
      prev.map((clip) =>
        clip.id === id
          ? {
              ...clip,
              trimStart: Math.max(0, Math.min(trimStart, clip.duration)),
              trimEnd: Math.max(0, Math.min(trimEnd, clip.duration)),
            }
          : clip,
      ),
    );
  }, []);

  const updateClipEffect = useCallback(
    (id: string, effect: EffectPreset) => {
      pushHistory();
      setClips((prev) => prev.map((clip) => (clip.id === id ? { ...clip, effect } : clip)));
    },
    [pushHistory],
  );

  const rotateClip = useCallback(
    (id: string, direction: "cw" | "ccw") => {
      pushHistory();
      setClips((prev) =>
        prev.map((clip) =>
          clip.id === id
            ? { ...clip, rotation: (((clip.rotation + (direction === "cw" ? 90 : -90)) % 360 + 360) % 360) as ClipRotation }
            : clip,
        ),
      );
    },
    [pushHistory],
  );

  const toggleClipFlip = useCallback(
    (id: string, axis: ClipFlipAxis) => {
      pushHistory();
      setClips((prev) =>
        prev.map((clip) => {
          if (clip.id !== id) return clip;
          return axis === "horizontal"
            ? { ...clip, flipHorizontal: !clip.flipHorizontal }
            : { ...clip, flipVertical: !clip.flipVertical };
        }),
      );
    },
    [pushHistory],
  );

  const setClipFitMode = useCallback(
    (id: string, mode: ClipFitMode) => {
      pushHistory();
      setClips((prev) => prev.map((clip) => (clip.id === id ? { ...clip, fitMode: mode } : clip)));
    },
    [pushHistory],
  );

  // One commit per crop-modal "Apply" (or "Reset"), not per drag tick — the modal owns the
  // in-progress rect as its own local state and only calls this once the user confirms.
  const setClipCrop = useCallback(
    (id: string, cropRect: CropRect | null) => {
      pushHistory();
      setClips((prev) => prev.map((clip) => (clip.id === id ? { ...clip, cropRect: cropRect ?? undefined } : clip)));
    },
    [pushHistory],
  );

  // Continuous sliders (like updateClipTrim above), not discrete picks — deliberately not
  // pushed onto the undo stack per call, or dragging either slider would flood it with one
  // snapshot per tick instead of one per gesture.
  const setClipSpeed = useCallback((id: string, speed: number) => {
    setClips((prev) =>
      prev.map((clip) => (clip.id === id ? { ...clip, speed: Math.max(MIN_CLIP_SPEED, Math.min(speed, MAX_CLIP_SPEED)) } : clip)),
    );
  }, []);

  const setClipVolume = useCallback((id: string, volume: number) => {
    setClips((prev) =>
      prev.map((clip) => (clip.id === id ? { ...clip, volume: Math.max(MIN_CLIP_VOLUME, Math.min(volume, MAX_CLIP_VOLUME)) } : clip)),
    );
  }, []);

  const toggleClipMuted = useCallback(
    (id: string) => {
      pushHistory();
      setClips((prev) => prev.map((clip) => (clip.id === id ? { ...clip, muted: !clip.muted } : clip)));
    },
    [pushHistory],
  );
  const toggleClipFadeIn = useCallback(
    (id: string) => {
      pushHistory();
      setClips((prev) => prev.map((clip) => (clip.id === id ? { ...clip, fadeIn: !clip.fadeIn } : clip)));
    },
    [pushHistory],
  );
  const toggleClipFadeOut = useCallback(
    (id: string) => {
      pushHistory();
      setClips((prev) => prev.map((clip) => (clip.id === id ? { ...clip, fadeOut: !clip.fadeOut } : clip)));
    },
    [pushHistory],
  );

  const updateClipTransition = useCallback(
    (id: string, patch: Partial<ClipTransition>) => {
      pushHistory();
      setClips((prev) =>
        prev.map((clip) =>
          clip.id === id
            ? {
                ...clip,
                transitionOut: {
                  ...clip.transitionOut,
                  ...patch,
                  duration:
                    patch.duration !== undefined
                      ? Math.max(MIN_TRANSITION_DURATION, Math.min(patch.duration, MAX_TRANSITION_DURATION))
                      : clip.transitionOut.duration,
                },
              }
            : clip,
        ),
      );
    },
    [pushHistory],
  );

  // Per-clip filmstrip generation: fires once per clip id that doesn't have thumbnails yet.
  useEffect(() => {
    clips.forEach((clip) => {
      if (clipThumbnails[clip.id] || thumbnailInFlightRef.current[clip.id]) return;
      thumbnailInFlightRef.current[clip.id] = true;
      void generateClipThumbnails(clip).then((frames) => {
        setClipThumbnails((prev) => ({ ...prev, [clip.id]: frames }));
      });
    });
  }, [clips, clipThumbnails]);

  const canSplit = useMemo(
    () =>
      clipRanges.some(
        (range) => currentTime > range.start + MIN_CLIP_LENGTH && currentTime < range.end - MIN_CLIP_LENGTH,
      ),
    [clipRanges, currentTime],
  );

  // The razor tool: finds whichever clip the playhead currently sits inside and swaps it for
  // two adjacent clips sharing the same source file, split at that instant — each half then
  // has its own trimStart/trimEnd (and, via updateClipEffect, its own look) from this point on.
  const splitAtPlayhead = useCallback(() => {
    const idx = clipRanges.findIndex(
      (range) => currentTime > range.start + MIN_CLIP_LENGTH && currentTime < range.end - MIN_CLIP_LENGTH,
    );
    if (idx === -1) return;
    const range = clipRanges[idx];
    const localSplit = range.clip.trimStart + (currentTime - range.start);
    // The new boundary this creates (first -> second) starts as a hard cut; `second` keeps
    // whatever transition the original clip had going into *its* next clip, since it's now
    // the one adjacent to it.
    const first: Clip = { ...range.clip, id: `clip-${nextClipId++}`, trimEnd: localSplit, transitionOut: DEFAULT_TRANSITION };
    const second: Clip = { ...range.clip, id: `clip-${nextClipId++}`, trimStart: localSplit };
    pushHistory();
    setClips((prev) => {
      const clipIndex = prev.findIndex((c) => c.id === range.clip.id);
      if (clipIndex === -1) return prev;
      const next = [...prev];
      next.splice(clipIndex, 1, first, second);
      return next;
    });
    setSelectedClipId(first.id);
  }, [clipRanges, currentTime, pushHistory]);

  // Native <video> element wiring for the *sequence*: rebinds only when the loaded clip's own
  // url changes (a real clip swap), not on every trim/effect edit — the refs above keep the
  // handlers reading up-to-date trim bounds even while these listeners stay attached across
  // in-place edits to the same clip.
  useEffect(() => {
    const el = videoRef.current;
    const clip = clips[activeClipIndex];
    if (!el || !clip) return;

    const onLoadedMetadata = () => {
      el.currentTime = pendingSeekLocalRef.current ?? clip.trimStart;
      pendingSeekLocalRef.current = null;
      // A freshly-loaded clip should play at its own configured rate immediately, not whatever
      // the previously-loaded clip left playbackRate at — the reactive speed/volume effect below
      // also covers this, but setting it here too means it's correct from the very first frame.
      el.playbackRate = clip.speed;
      setIsLoading(false);
    };
    const onSeeked = () => {
      if (pendingAutoplayRef.current) {
        pendingAutoplayRef.current = false;
        void el.play();
      }
    };
    const onTimeUpdate = () => {
      const idx = activeClipIndexRef.current;
      const currentClip = clipsRef.current[idx];
      const range = clipRangesRef.current[idx];
      if (!currentClip || !range) return;
      // 123apps-style clamped preview: while the loaded clip is the one actively selected for
      // trimming (its cyan handles are showing on the main timeline track), playback is confined
      // to just that clip's own [trimStart, trimEnd] — reaching trimEnd pauses and rewinds to
      // trimStart instead of advancing into the next clip, since the point of selecting a clip is
      // previewing this clip's trim in isolation. Sequence playback (no clip selected, or a clip
      // selected for something other than trimming) keeps the normal advance-to-next-clip behavior
      // below.
      const isTrimPreview = selectedClipIdRef.current === currentClip.id;
      if (isTrimPreview && el.currentTime >= currentClip.trimEnd - 0.03) {
        el.pause();
        el.currentTime = currentClip.trimStart;
        setIsPlaying(false);
        setCurrentTime(range.start);
        return;
      }
      if (el.currentTime >= currentClip.trimEnd - 0.03) {
        if (isPlayingRef.current) {
          if (idx + 1 < clipsRef.current.length) {
            pendingAutoplayRef.current = true;
            setActiveClipId(clipsRef.current[idx + 1]?.id ?? null);
          } else if (loopPlaybackRef.current) {
            // Restart the *whole sequence* from clip 0, not just this last clip's own in point —
            // otherwise looping a multi-clip timeline would silently degrade into repeating only
            // its final clip forever. Single-clip sequences (idx === 0 here) still just jump back
            // to their own in point and keep playing, since `seeked` doesn't need
            // pendingAutoplayRef here (the element never actually paused).
            // The whole sequence is restarting from the top — force the background track back
            // to its own start in lockstep, otherwise it would keep playing from wherever it
            // happened to be (or have already ended) instead of looping along with the video.
            if (bgAudioRef.current) bgAudioRef.current.currentTime = 0;
            if (idx !== 0) {
              pendingAutoplayRef.current = true;
              setActiveClipId(clipsRef.current[0]?.id ?? null);
            } else {
              el.currentTime = currentClip.trimStart;
            }
          } else {
            el.pause();
            el.currentTime = currentClip.trimEnd;
            setIsPlaying(false);
          }
        } else {
          el.currentTime = currentClip.trimEnd;
        }
        return;
      }
      if (el.currentTime < currentClip.trimStart) {
        el.currentTime = currentClip.trimStart;
        return;
      }
      // Divide by speed: at 2x, native currentTime advances twice as fast as timeline time, so
      // half as many timeline-seconds have actually elapsed for the same native-time delta (the
      // inverse of the multiply-by-speed conversion `seek` below does going the other direction).
      setCurrentTime(range.start + (el.currentTime - currentClip.trimStart) / Math.max(MIN_CLIP_SPEED, currentClip.speed));
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    el.addEventListener("loadedmetadata", onLoadedMetadata);
    el.addEventListener("seeked", onSeeked);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    return () => {
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
      el.removeEventListener("seeked", onSeeked);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebind only on an actual clip swap
  }, [clips[activeClipIndex]?.url, activeClipIndex]);

  const toggleLoopPlayback = useCallback(() => {
    setLoopPlayback((prev) => !prev);
  }, []);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el || clips.length === 0) return;
    if (el.paused) {
      if (currentTime >= duration - 0.05) {
        // Reached the end of the whole sequence — restart from the first clip rather than
        // sitting stuck at the last frame doing nothing.
        pendingAutoplayRef.current = true;
        if (activeClipIndex !== 0) setActiveClipId(clips[0].id);
        else el.currentTime = clips[0].trimStart;
      } else {
        // Defensive snap-into-bounds: the ordinary paths (loadedmetadata, onTimeUpdate, seek)
        // already keep `el.currentTime` inside [trimStart, trimEnd) for the active clip, but a
        // trim edit that shrinks the range out from under an already-paused, already-past-the-
        // new-trimEnd position wouldn't otherwise reseek until the next play — so Play always
        // re-checks itself rather than trusting the last write to have accounted for this.
        const activeClip = clips[activeClipIndex];
        if (activeClip && (el.currentTime < activeClip.trimStart || el.currentTime >= activeClip.trimEnd)) {
          el.currentTime = activeClip.trimStart;
        }
        void el.play();
      }
    } else {
      el.pause();
    }
  }, [clips, currentTime, duration, activeClipIndex]);

  const seek = useCallback(
    (time: number) => {
      const el = videoRef.current;
      if (!el || clipRanges.length === 0) return;
      const clamped = Math.min(Math.max(time, 0), duration);
      let idx = clipRanges.findIndex((range) => clamped >= range.start && clamped < range.end);
      if (idx === -1) idx = clipRanges.length - 1;
      const range = clipRanges[idx];
      // Inverse of the timeupdate conversion above: timelineSeconds = nativeDelta / speed, so
      // nativeDelta = timelineSeconds * speed.
      const local = range.clip.trimStart + (clamped - range.start) * Math.max(MIN_CLIP_SPEED, range.clip.speed);
      if (idx === activeClipIndex) {
        el.currentTime = local;
      } else {
        pendingSeekLocalRef.current = local;
        setActiveClipId(range.clip.id);
      }
      setCurrentTime(clamped);
      const bg = bgAudioRef.current;
      if (bg && backgroundAudio) bg.currentTime = Math.min(clamped, backgroundAudio.duration || 0);
    },
    [clipRanges, duration, activeClipIndex, backgroundAudio],
  );

  // Selecting a clip to edit it (Timeline, Upload list, or the Trim/Effects panels) also moves
  // the preview to that clip's start. Without this, editing a clip other than whichever one
  // happens to be loaded for playback produces zero visible change — the effect/trim data is
  // genuinely saved (and exports correctly), but nothing on screen moves, which reads as "it's
  // not applying" even though it is.
  const selectClip = useCallback(
    (id: string | null) => {
      setSelectedClipId(id);
      if (!id) return;
      const range = clipRanges.find((r) => r.clip.id === id);
      if (range) seek(range.start);
    },
    [clipRanges, seek],
  );

  // Copies one clip's outgoing transition (type/direction/duration) onto every other boundary
  // in the sequence in one click — the "apply to all" shortcut so a user who likes the look they
  // just dialed in on one cut doesn't have to redo it boundary-by-boundary. The last clip has no
  // outgoing boundary, so it's left untouched (nothing reads its transitionOut anyway).
  const applyTransitionToAll = useCallback(
    (id: string) => {
      pushHistory();
      setClips((prev) => {
        const source = prev.find((c) => c.id === id);
        if (!source) return prev;
        const trans = source.transitionOut;
        return prev.map((clip, idx) => (idx < prev.length - 1 ? { ...clip, transitionOut: { ...trans } } : clip));
      });
    },
    [pushHistory],
  );

  // Global editing shortcuts — a real window listener rather than something scoped to the
  // Timeline component, so they work regardless of which part of the editor has focus (matching
  // how every desktop NLE treats these). Skipped entirely while an input/textarea/contentEditable
  // has focus so typing a caption or nudging a number field never gets hijacked as a shortcut.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;

      const key = event.key.toLowerCase();
      const hasModifier = event.ctrlKey || event.metaKey || event.altKey;

      // Undo is the one shortcut that's *supposed* to carry a modifier — check it before the
      // no-modifier guard below (which every other shortcut relies on to avoid hijacking browser/
      // OS combos like Ctrl+S or Alt+ArrowLeft).
      if ((event.ctrlKey || event.metaKey) && !event.altKey && key === "z") {
        event.preventDefault();
        undo();
        return;
      }
      if (hasModifier) return;

      if (event.code === "Space") {
        event.preventDefault();
        togglePlay();
        return;
      }
      if (key === "s" || key === "c") {
        if (canSplit) splitAtPlayhead();
        return;
      }
      if (key === "delete" || key === "backspace") {
        if (selectedClipId) {
          event.preventDefault();
          removeClip(selectedClipId);
        }
        return;
      }
      if (key === "arrowleft" || key === "arrowright") {
        event.preventDefault();
        const step = event.shiftKey ? 1 : 0.05;
        seek(currentTime + (key === "arrowleft" ? -step : step));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, canSplit, splitAtPlayhead, selectedClipId, removeClip, currentTime, seek, undo]);

  // The clip that should be pre-loaded into the secondary preview video right now — whichever
  // clip follows the one currently loaded for playback, but only when there's an actual
  // transition configured between them (otherwise the secondary element just sits idle/empty).
  const preloadNextClip = useMemo(() => {
    const clip = clips[activeClipIndex];
    const nextClip = clips[activeClipIndex + 1];
    if (!clip || !nextClip || clip.transitionOut.type === "none") return null;
    return nextClip;
  }, [clips, activeClipIndex]);

  // Derived, not stored: whenever the playhead sits inside the last `transDur` seconds of a
  // clip that has a real transition configured, this describes exactly what the live preview
  // should be compositing right now — same clamped duration and progress math the export
  // pipeline uses, just evaluated against `currentTime` on every render instead of an
  // AudioContext clock. `elapsedSeconds` lets the driver effect below seek the secondary video
  // to roughly the right instant even if the user scrubs straight into the middle of a window.
  const transitionPreview = useMemo(() => {
    const idx = clipRanges.findIndex((range) => currentTime >= range.start && currentTime < range.end);
    if (idx === -1) return null;
    const range = clipRanges[idx];
    const nextRange = clipRanges[idx + 1];
    if (!nextRange) return null;
    const trans = range.clip.transitionOut;
    if (trans.type === "none") return null;
    const transDur = clampTransitionDuration(trans.duration, range.clip, nextRange.clip);
    if (transDur <= 0) return null;
    const windowStart = range.end - transDur;
    if (currentTime < windowStart) return null;
    const elapsedSeconds = currentTime - windowStart;
    return {
      type: trans.type as Exclude<TransitionType, "none">,
      direction: trans.direction,
      progress: Math.min(1, Math.max(0, elapsedSeconds / transDur)),
      incomingClip: nextRange.clip,
      elapsedSeconds,
    };
  }, [clipRanges, currentTime]);

  // Drives the secondary preview video: starts it once a transition window is entered (seeking
  // to roughly the right instant within the incoming clip first, so scrubbing straight into the
  // middle of a window doesn't show its very first frame), pauses it once the window ends, and
  // — critically — mirrors `isPlaying` too, otherwise pressing Pause on the main video leaves
  // this one running on its own, drifting the overlay out of sync with a now-frozen main frame.
  // While paused, every tick still reseeks it (cheap, no restart) so a scrub through a window
  // shows the right frame instead of whatever was loaded before the scrub.
  useEffect(() => {
    const el = nextVideoRef.current;
    if (!el) return;
    if (!transitionPreview) {
      if (!el.paused) el.pause();
      return;
    }
    const target = transitionPreview.incomingClip.trimStart + transitionPreview.elapsedSeconds;
    if (isPlaying) {
      if (el.paused) {
        try {
          el.currentTime = target;
        } catch {
          // element not ready yet (src still loading) — it'll start from the top, close enough
        }
        void el.play();
      }
    } else {
      if (!el.paused) el.pause();
      try {
        el.currentTime = target;
      } catch {
        // not ready yet; nothing to sync to
      }
    }
  }, [transitionPreview, isPlaying]);

  // Volume is state-only here now — the effect below owns actually writing `el.volume`/
  // `el.playbackRate`, since the final value the element needs is a *combination* of this master
  // fader and whichever clip is currently active (see that effect for why).
  const setVolume = useCallback(
    (value: number) => {
      setVolumeState(value);
      if (value > 0 && muted) setMuted(false);
    },
    [muted],
  );

  const toggleMuted = useCallback(() => setMuted((prev) => !prev), []);

  // Lazily attaches a GainNode to the main preview <video> the first time any clip actually
  // needs >100% volume — see the ref comments above for why this has to happen at most once.
  const ensurePreviewBoostGain = useCallback((): GainNode | null => {
    if (previewGainRef.current) return previewGainRef.current;
    const el = videoRef.current;
    if (!el) return null;
    try {
      const AudioCtxCtor =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtxCtor();
      const source = ctx.createMediaElementSource(el);
      const gain = ctx.createGain();
      source.connect(gain).connect(ctx.destination);
      previewAudioCtxRef.current = ctx;
      previewGainRef.current = gain;
      return gain;
    } catch {
      return null;
    }
  }, []);

  // Keeps the preview <video> in sync with both the master fader (`volume`/`muted`) and the
  // active clip's own `speed`/`volume`/`muted` any time either changes — real playbackRate (not
  // preview-only) and real volume, combined: the master fader and the clip's own 0-100% both
  // just multiply into the native element's `volume` (capped at 1, same as any HTMLMediaElement),
  // and only the clip's boost above 100% (or an active fade — see the effect below) needs the
  // GainNode, applied on top of that. This is the *steady-state* value; the fade effect below
  // takes over writing `gain.gain.value` every frame while actually playing through a fade
  // window, and this effect's own value is what's left in place once that stops.
  useEffect(() => {
    const el = videoRef.current;
    const clip = clips[activeClipIndex];
    if (!el || !clip) return;
    el.playbackRate = clip.speed;
    const master = muted ? 0 : volume;
    const clipMuteFactor = clip.muted ? 0 : 1;
    el.volume = Math.max(0, Math.min(1, master * Math.min(1, clip.volume) * clipMuteFactor));
    const needsGain = clip.volume > 1 || clip.fadeIn || clip.fadeOut;
    if (needsGain) {
      const gain = ensurePreviewBoostGain();
      if (gain) {
        gain.gain.value = clip.muted ? 0 : Math.max(1, clip.volume);
        void previewAudioCtxRef.current?.resume().catch(() => {});
      }
    } else if (previewGainRef.current) {
      previewGainRef.current.gain.value = 1;
    }
  }, [clips, activeClipIndex, volume, muted, ensurePreviewBoostGain]);

  // Live fade in/out during preview playback: reads the active clip's own native playback
  // position every animation frame and writes the fade multiplier straight into the GainNode
  // (on top of whatever steady-state boost the effect above set), the same "recompute from
  // el.currentTime every frame" approach Timeline.tsx's playhead uses — far simpler and more
  // robust than trying to schedule exact Web Audio ramps against an HTMLMediaElement's timeline,
  // which can be paused/resumed/sought/rate-changed at any moment. A no-op unless the active
  // clip actually has a fade enabled.
  useEffect(() => {
    const clip = clips[activeClipIndex];
    if (!isPlaying || !clip || (!clip.fadeIn && !clip.fadeOut)) return;
    const el = videoRef.current;
    if (!el) return;
    const gain = ensurePreviewBoostGain();
    if (!gain) return;
    const clipDur = Math.max(0, clip.trimEnd - clip.trimStart) / Math.max(MIN_CLIP_SPEED, clip.speed);
    const fadeDur = Math.min(CLIP_FADE_SECONDS, clipDur / 2 || 0);
    const boost = clip.muted ? 0 : Math.max(1, clip.volume);
    let raf = 0;
    const tick = () => {
      const t = el.currentTime;
      let mult = 1;
      if (clip.fadeIn && fadeDur > 0 && t < clip.trimStart + fadeDur) {
        mult *= Math.max(0, Math.min(1, (t - clip.trimStart) / fadeDur));
      }
      if (clip.fadeOut && fadeDur > 0 && t > clip.trimEnd - fadeDur) {
        mult *= Math.max(0, Math.min(1, (clip.trimEnd - t) / fadeDur));
      }
      gain.gain.value = boost * mult;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      // Hand back a steady, unfaded value on teardown (pause/clip swap) so audio doesn't get
      // stuck silenced mid-ramp — matches what the steady-state effect above would set anyway.
      if (previewGainRef.current) previewGainRef.current.gain.value = boost;
    };
  }, [isPlaying, clips, activeClipIndex, ensurePreviewBoostGain]);

  useEffect(() => {
    return () => {
      void previewAudioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  // New captions default to a 3-second window starting at the playhead (clamped to the
  // sequence's own length) — a sensible starting duration the Timeline's Text-lane handles can
  // then be dragged to adjust, rather than defaulting to "the whole video" or a zero-length stub.
  const addTextOverlay = useCallback(
    (text: string, position: TextOverlay["position"]) => {
      pushHistory();
      const start = duration > 0 ? Math.min(currentTime, Math.max(0, duration - MIN_OVERLAY_LENGTH)) : 0;
      const end = duration > 0 ? Math.min(duration, start + 3) : start + 3;
      setTextOverlays((prev) => [
        ...prev,
        { id: `overlay-${nextOverlayId++}`, text, position, start, end: Math.max(end, start + MIN_OVERLAY_LENGTH) },
      ]);
    },
    [pushHistory, currentTime, duration],
  );

  const updateTextOverlay = useCallback((id: string, patch: Partial<Omit<TextOverlay, "id">>) => {
    setTextOverlays((prev) => prev.map((overlay) => (overlay.id === id ? { ...overlay, ...patch } : overlay)));
  }, []);

  const removeTextOverlay = useCallback(
    (id: string) => {
      pushHistory();
      setTextOverlays((prev) => prev.filter((overlay) => overlay.id !== id));
    },
    [pushHistory],
  );

  const toggleAudioFadeIn = useCallback(() => setAudioFadeIn((v) => !v), []);
  const toggleAudioFadeOut = useCallback(() => setAudioFadeOut((v) => !v), []);

  const addBackgroundAudio = useCallback((file: File) => {
    // Same reasoning as addClips: don't gate on `file.type` (a bare-audio .webm is reported as
    // "video/webm" by plenty of browsers/OSes) — attempt the decode and only bail if it
    // actually fails.
    const url = URL.createObjectURL(file);
    const probe = document.createElement("audio");
    probe.preload = "metadata";
    probe.src = url;
    void probeMediaDuration(probe).then((dur) => {
      if (dur <= 0) {
        URL.revokeObjectURL(url);
        return;
      }
      if (bgObjectUrlRef.current) URL.revokeObjectURL(bgObjectUrlRef.current);
      bgObjectUrlRef.current = url;
      setBackgroundAudio({ file, url, fileName: file.name, duration: dur, volume: 0.5, fadeIn: false, fadeOut: false });
    });
  }, []);

  const removeBackgroundAudio = useCallback(() => {
    if (bgObjectUrlRef.current) {
      URL.revokeObjectURL(bgObjectUrlRef.current);
      bgObjectUrlRef.current = null;
    }
    setBackgroundAudio(null);
  }, []);

  const setBackgroundAudioVolume = useCallback((value: number) => {
    setBackgroundAudio((prev) => (prev ? { ...prev, volume: value } : prev));
  }, []);
  const toggleBackgroundAudioFadeIn = useCallback(() => {
    setBackgroundAudio((prev) => (prev ? { ...prev, fadeIn: !prev.fadeIn } : prev));
  }, []);
  const toggleBackgroundAudioFadeOut = useCallback(() => {
    setBackgroundAudio((prev) => (prev ? { ...prev, fadeOut: !prev.fadeOut } : prev));
  }, []);

  // Background track preview: mirrors the main sequence's play/pause so scrubbing and
  // pressing play move both tracks together. Exact drift over a long timeline isn't corrected
  // frame-by-frame here (seek() above resyncs it) — the export pipeline below is what actually
  // renders precise, sample-accurate timing into the file.
  useEffect(() => {
    const audio = bgAudioRef.current;
    if (!audio || !backgroundAudio) return;
    audio.volume = backgroundAudio.volume;
    if (isPlaying) void audio.play();
    else audio.pause();
  }, [isPlaying, backgroundAudio]);

  useEffect(() => {
    return () => {
      if (bgObjectUrlRef.current) URL.revokeObjectURL(bgObjectUrlRef.current);
    };
  }, []);

  const cancelExport = useCallback(() => {
    exportCancelRef.current = true;
  }, []);

  // The export pipeline: a second, detached <video> plays each clip's source in sequence (so
  // the visible preview is untouched) while every frame is redrawn onto an offscreen canvas
  // with that clip's own CSS filter and any text overlays burned in. `canvas.captureStream()`
  // supplies the video track. Audio is mixed through the Web Audio API rather than a plain
  // `captureStream()` grab, because there are now up to two independent sources (each clip's
  // own audio, plus an optional background track) that need independent gain/fade control —
  // a MediaStreamAudioDestinationNode combines whatever's routed into it into one track, which
  // gets combined with the canvas's video track and recorded with MediaRecorder. This is what
  // makes multi-clip sequencing, per-clip effects, and audio fades all real in the download,
  // not preview-only — entirely in-browser, no server or bundled encoder.
  const exportVideo = useCallback(() => {
    if (clips.length === 0 || isExporting || !canExportInThisBrowser()) return;

    exportCancelRef.current = false;
    setIsExporting(true);
    setExportProgress(0);

    const sequence = clips;
    const ranges = clipRanges;
    const totalDuration = duration;
    const overlays = textOverlays;

    const cleanupFns: (() => void)[] = [];
    const cleanup = () => cleanupFns.forEach((fn) => fn());

    // Two detached <video> elements rather than one: a transition needs the outgoing clip's
    // tail and the incoming clip's head decoding and playing *simultaneously* so their frames
    // can be composited together. Outside of a transition window only `outgoing` is ever
    // driven — `incoming` sits idle until the next boundary that actually has one configured.
    const videoA = document.createElement("video");
    const videoB = document.createElement("video");
    [videoA, videoB].forEach((el) => {
      el.muted = true; // audio is routed through the Web Audio graph below, not the element's own output
      el.playsInline = true;
    });
    cleanupFns.push(() => {
      [videoA, videoB].forEach((el) => {
        el.pause();
        el.removeAttribute("src");
        el.load();
      });
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const AudioCtxCtor =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioCtx = new AudioCtxCtor();
    cleanupFns.push(() => {
      void audioCtx.close().catch(() => {});
    });

    const destination = audioCtx.createMediaStreamDestination();
    const mainGain = audioCtx.createGain();
    mainGain.connect(destination);
    const sourceNodeA = audioCtx.createMediaElementSource(videoA);
    const sourceNodeB = audioCtx.createMediaElementSource(videoB);
    // One GainNode per *physical* element (not per logical outgoing/incoming role, which swaps
    // back and forth as the sequence advances) — videoA/videoB get reused across every clip in
    // the sequence, so each one's gain has to be re-set to whichever clip is currently loaded
    // into it (see loadIntoElement below) rather than fixed once. This is what makes a clip's
    // own >100% volume boost real in the export, the same way the GainNode in
    // ensurePreviewBoostGain does for the live preview.
    const perClipGainA = audioCtx.createGain();
    const perClipGainB = audioCtx.createGain();
    sourceNodeA.connect(perClipGainA).connect(mainGain);
    sourceNodeB.connect(perClipGainB).connect(mainGain);
    const gainForElement = (el: HTMLVideoElement) => (el === videoA ? perClipGainA : perClipGainB);
    cleanupFns.push(() => {
      try {
        sourceNodeA.disconnect();
        sourceNodeB.disconnect();
        perClipGainA.disconnect();
        perClipGainB.disconnect();
        mainGain.disconnect();
      } catch {
        // already disconnected during teardown
      }
    });

    let bgEl: HTMLAudioElement | null = null;
    let bgGain: GainNode | null = null;
    if (backgroundAudio) {
      bgEl = new Audio(backgroundAudio.url);
      bgGain = audioCtx.createGain();
      const bgSourceNode = audioCtx.createMediaElementSource(bgEl);
      bgSourceNode.connect(bgGain).connect(destination);
      const el = bgEl;
      const gain = bgGain;
      cleanupFns.push(() => {
        el.pause();
        try {
          bgSourceNode.disconnect();
          gain.disconnect();
        } catch {
          // already disconnected during teardown
        }
      });
    }

    const finish = (success: boolean, blob?: Blob) => {
      cleanup();
      setIsExporting(false);
      setExportProgress(0);
      if (success && blob) {
        const url = URL.createObjectURL(blob);
        const base = (sequence[0]?.fileName ?? "video").replace(/\.[^.]+$/, "");
        const link = document.createElement("a");
        link.href = url;
        link.download = `${base}-edited.webm`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
    };

    // Letterboxed draw of one clip's current frame into an arbitrary destination rect (not
    // just the full canvas) — the rect and alpha are what let the transition renderers below
    // slide/fade/zoom a frame around instead of always filling the whole frame at full opacity.
    // Also applies that clip's own crop/rotation/flip/fitMode, composed in that order:
    //   1. crop slices a sub-rectangle (sx/sy/sWidth/sHeight, in native pre-rotation pixels) out
    //      of the source frame — everything below treats that slice as if it were the whole
    //      source, exactly like the CSS crop transform on the live <video> does.
    //   2. rotation/flip are done via the canvas transform matrix (translate to the dest rect's
    //      center, rotate, then scale by ±1 per axis) *before* drawImage, so drawImage itself
    //      always just paints the (possibly cropped) frame in its own native orientation.
    // A 90/270 rotation swaps which axis of the (cropped) source maps to the destination's
    // visual width/height, which is why `visualW`/`visualH` (used for the fit-scale) and
    // `nativeDrawW`/`nativeDrawH` (the actual drawImage args, still pre-rotation) are kept apart.
    const drawFitted = (videoEl: HTMLVideoElement, clip: Clip, destX: number, destY: number, destW: number, destH: number, alpha = 1) => {
      if (!ctx) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.rect(destX, destY, destW, destH);
      ctx.clip();
      ctx.fillStyle = "#000";
      ctx.fillRect(destX, destY, destW, destH);

      const nativeVideoW = videoEl.videoWidth || destW;
      const nativeVideoH = videoEl.videoHeight || destH;
      const crop = clip.cropRect ?? { x: 0, y: 0, width: 1, height: 1 };
      const sx = crop.x * nativeVideoW;
      const sy = crop.y * nativeVideoH;
      const sWidth = Math.max(1, crop.width * nativeVideoW);
      const sHeight = Math.max(1, crop.height * nativeVideoH);

      const rotated90 = clip.rotation === 90 || clip.rotation === 270;
      const visualW = rotated90 ? sHeight : sWidth;
      const visualH = rotated90 ? sWidth : sHeight;

      let drawVisualW: number;
      let drawVisualH: number;
      if (clip.fitMode === "stretch") {
        drawVisualW = destW;
        drawVisualH = destH;
      } else {
        const scale =
          clip.fitMode === "cover" ? Math.max(destW / visualW, destH / visualH) : Math.min(destW / visualW, destH / visualH);
        drawVisualW = visualW * scale;
        drawVisualH = visualH * scale;
      }
      const nativeDrawW = rotated90 ? drawVisualH : drawVisualW;
      const nativeDrawH = rotated90 ? drawVisualW : drawVisualH;

      ctx.translate(destX + destW / 2, destY + destH / 2);
      ctx.rotate((clip.rotation * Math.PI) / 180);
      ctx.scale(clip.flipHorizontal ? -1 : 1, clip.flipVertical ? -1 : 1);
      ctx.filter = EFFECT_FILTERS[clip.effect];
      ctx.drawImage(videoEl, sx, sy, sWidth, sHeight, -nativeDrawW / 2, -nativeDrawH / 2, nativeDrawW, nativeDrawH);
      ctx.filter = "none";
      ctx.restore();
    };

    // `elapsedSeconds` is the same global-timeline clock `overlay.start`/`overlay.end` are
    // expressed in (see getGlobalElapsed below) — without this filter every caption would be
    // burned into every frame of the export regardless of its configured window.
    const drawOverlays = (elapsedSeconds: number) => {
      if (!ctx) return;
      for (const overlay of overlays) {
        if (elapsedSeconds < overlay.start || elapsedSeconds > overlay.end) continue;
        const fontSize = Math.round(canvas.height * 0.055);
        ctx.font = `700 ${fontSize}px ${getComputedStyle(document.body).fontFamily || "sans-serif"}`;
        ctx.textAlign = "center";
        const y =
          overlay.position === "top"
            ? fontSize * 1.6
            : overlay.position === "bottom"
              ? canvas.height - fontSize
              : canvas.height / 2;
        const metrics = ctx.measureText(overlay.text);
        const paddingX = fontSize * 0.5;
        const paddingY = fontSize * 0.35;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(
          canvas.width / 2 - metrics.width / 2 - paddingX,
          y - fontSize - paddingY * 0.4,
          metrics.width + paddingX * 2,
          fontSize + paddingY * 1.3,
        );
        ctx.fillStyle = "#ffffff";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(overlay.text, canvas.width / 2, y);
      }
    };

    // The four transition looks, each just a different way of compositing the outgoing clip's
    // frame against the incoming clip's frame as `progress` runs 0 -> 1 over the configured
    // duration. "none" never reaches these — drawFrame only enters the transitioning phase when
    // there's an actual transition configured.
    type Side = { el: HTMLVideoElement; clip: Clip };
    type TransitionRenderer = (out: Side, incoming: Side, progress: number, direction: TransitionDirection) => void;

    const renderFade: TransitionRenderer = (out, incoming, progress) => {
      drawFitted(out.el, out.clip, 0, 0, canvas.width, canvas.height);
      drawFitted(incoming.el, incoming.clip, 0, 0, canvas.width, canvas.height, progress);
    };
    const renderSlide: TransitionRenderer = (out, incoming, progress, direction) => {
      const dir = direction === "left" ? -1 : 1;
      const outX = progress * canvas.width * dir;
      const inX = -dir * canvas.width * (1 - progress);
      drawFitted(out.el, out.clip, outX, 0, canvas.width, canvas.height);
      drawFitted(incoming.el, incoming.clip, inX, 0, canvas.width, canvas.height);
    };
    const renderWipe: TransitionRenderer = (out, incoming, progress, direction) => {
      drawFitted(out.el, out.clip, 0, 0, canvas.width, canvas.height);
      const revealW = canvas.width * progress;
      if (revealW <= 0 || !ctx) return;
      ctx.save();
      ctx.beginPath();
      if (direction === "left") ctx.rect(canvas.width - revealW, 0, revealW, canvas.height);
      else ctx.rect(0, 0, revealW, canvas.height);
      ctx.clip();
      drawFitted(incoming.el, incoming.clip, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    };
    const renderZoom: TransitionRenderer = (out, incoming, progress) => {
      const outScale = 1 + progress * 0.15;
      const outW = canvas.width * outScale;
      const outH = canvas.height * outScale;
      drawFitted(out.el, out.clip, (canvas.width - outW) / 2, (canvas.height - outH) / 2, outW, outH, 1 - progress);
      const inScale = 1.15 - progress * 0.15;
      const inW = canvas.width * inScale;
      const inH = canvas.height * inScale;
      drawFitted(incoming.el, incoming.clip, (canvas.width - inW) / 2, (canvas.height - inH) / 2, inW, inH, progress);
    };
    const transitionRenderers: Record<Exclude<TransitionType, "none">, TransitionRenderer> = {
      fade: renderFade,
      slide: renderSlide,
      wipe: renderWipe,
      zoom: renderZoom,
    };

    // Same divide-by-speed conversion clipRanges uses to turn native source-time into
    // timeline/output-time — keeps export progress and the text-overlay elapsed-time filter
    // (drawOverlays) in sync with a sped-up/slowed-down clip exactly like the live preview is.
    const getGlobalElapsed = (idx: number, clip: Clip, elCurrentTime: number) =>
      (ranges[idx]?.start ?? 0) + (elCurrentTime - clip.trimStart) / Math.max(MIN_CLIP_SPEED, clip.speed);

    const reportProgress = (idx: number, clip: Clip, elCurrentTime: number) => {
      const elapsed = getGlobalElapsed(idx, clip, elCurrentTime);
      setExportProgress(Math.min(1, elapsed / Math.max(0.001, totalDuration)));
    };

    let rafId = 0;
    cleanupFns.push(() => cancelAnimationFrame(rafId));

    // Schedules one clip's own gain (mute + fade in/out) on whichever physical gain node its
    // element is using, anchored to the AudioContext clock at the moment it's called —
    // `cancelScheduledValues` first clears out any leftover automation from whichever earlier
    // clip last used this same physical node (videoA/videoB, and therefore perClipGainA/B, are
    // reused across the whole sequence). Callers must invoke this at the instant the clip is
    // actually about to start playing (immediately before `el.play()`, in the same synchronous
    // tick) — scheduling it any earlier would bake the fade ramp's timing in before playback
    // truly begins.
    const scheduleClipGain = (el: HTMLVideoElement, clip: Clip) => {
      const gain = gainForElement(el);
      const now = audioCtx.currentTime;
      gain.gain.cancelScheduledValues(now);
      const base = clip.muted ? 0 : clip.volume;
      const clipDur = Math.max(0, clip.trimEnd - clip.trimStart) / Math.max(MIN_CLIP_SPEED, clip.speed);
      const clipFadeDur = Math.min(CLIP_FADE_SECONDS, clipDur / 2 || 0);
      gain.gain.setValueAtTime(clip.fadeIn && clipFadeDur > 0 ? 0 : base, now);
      if (clip.fadeIn && clipFadeDur > 0) gain.gain.linearRampToValueAtTime(base, now + clipFadeDur);
      if (clip.fadeOut && clipFadeDur > 0) {
        gain.gain.setValueAtTime(base, now + Math.max(clipFadeDur, clipDur - clipFadeDur));
        gain.gain.linearRampToValueAtTime(0, now + clipDur);
      }
    };

    // playbackRate here is what actually makes speed real in the export: the draw loop below is
    // driven by requestAnimationFrame sampling this element's *own* real-time playback, so
    // setting its rate to clip.speed is all that's needed for the recorded frames — and thus the
    // recorded audio driven off the same element — to genuinely play back faster/slower, no
    // manual per-frame time-stepping required. `scheduleGain` defaults to scheduling this clip's
    // gain right before `onReady` (and thus `el.play()`) fires, same tick — the very first clip
    // is the one exception (see the `loadIntoElement(videoA, sequence[0], ...)` call below),
    // since its `onReady` kicks off `startRecording()`'s own async setup before playback actually
    // starts, which would leave a scheduled-too-early ramp for just that one clip.
    const loadIntoElement = (el: HTMLVideoElement, clip: Clip, onReady: () => void, scheduleGain = true) => {
      el.src = clip.url;
      el.playbackRate = clip.speed;
      el.addEventListener(
        "loadedmetadata",
        () => {
          el.currentTime = clip.trimStart;
          el.addEventListener(
            "seeked",
            () => {
              if (scheduleGain) scheduleClipGain(el, clip);
              onReady();
            },
            { once: true },
          );
        },
        { once: true },
      );
    };

    let clipIdx = 0;
    let outgoing: Side = { el: videoA, clip: sequence[0] };
    let incoming: Side = { el: videoB, clip: sequence[0] };
    let phase: "playing" | "transitioning" = "playing";
    let awaitingIncoming = false;
    let incomingReady = false;
    let activeTransitionDur = 0;
    let transitionStartClipTime = 0;

    const drawFrame = () => {
      if (exportCancelRef.current) {
        recorder.stop();
        return;
      }
      const clip = sequence[clipIdx];
      if (!clip) {
        recorder.stop();
        return;
      }
      const nextClip = sequence[clipIdx + 1];

      if (phase === "playing") {
        const configured = nextClip ? clip.transitionOut : null;
        const transDur =
          configured && configured.type !== "none" ? clampTransitionDuration(configured.duration, clip, nextClip!) : 0;
        const threshold = clip.trimEnd - transDur;

        if (transDur > 0 && nextClip && !awaitingIncoming && !incomingReady && outgoing.el.currentTime >= threshold) {
          awaitingIncoming = true;
          activeTransitionDur = transDur;
          loadIntoElement(incoming.el, nextClip, () => {
            incoming = { el: incoming.el, clip: nextClip };
            void incoming.el.play();
            incomingReady = true;
            awaitingIncoming = false;
          });
        }

        if (incomingReady) {
          phase = "transitioning";
          transitionStartClipTime = outgoing.el.currentTime;
          rafId = requestAnimationFrame(drawFrame);
          return;
        }

        if (!awaitingIncoming && (outgoing.el.currentTime >= clip.trimEnd || outgoing.el.ended)) {
          const nextIdx = clipIdx + 1;
          if (nextIdx >= sequence.length) {
            recorder.stop();
            return;
          }
          clipIdx = nextIdx;
          outgoing.el.pause();
          const targetEl = outgoing.el;
          loadIntoElement(targetEl, sequence[nextIdx], () => {
            outgoing = { el: targetEl, clip: sequence[nextIdx] };
            void targetEl.play();
            rafId = requestAnimationFrame(drawFrame);
          });
          return;
        }

        drawFitted(outgoing.el, clip, 0, 0, canvas.width, canvas.height);
        drawOverlays(getGlobalElapsed(clipIdx, clip, outgoing.el.currentTime));
        reportProgress(clipIdx, clip, outgoing.el.currentTime);
        rafId = requestAnimationFrame(drawFrame);
        return;
      }

      // phase === "transitioning": both `outgoing` and `incoming` are playing concurrently:
      // composite them per the configured look until the outgoing clip actually runs out.
      const progress = Math.min(1, (outgoing.el.currentTime - transitionStartClipTime) / activeTransitionDur);
      const renderer = transitionRenderers[clip.transitionOut.type as Exclude<TransitionType, "none">];
      renderer(outgoing, incoming, progress, clip.transitionOut.direction);
      drawOverlays(getGlobalElapsed(clipIdx, clip, outgoing.el.currentTime));
      reportProgress(clipIdx, clip, outgoing.el.currentTime);

      if (progress >= 1 || outgoing.el.currentTime >= clip.trimEnd) {
        outgoing.el.pause();
        const finishedEl = outgoing.el;
        outgoing = incoming;
        incoming = { el: finishedEl, clip: incoming.clip };
        clipIdx += 1;
        phase = "playing";
        incomingReady = false;
      }
      rafId = requestAnimationFrame(drawFrame);
    };

    let recorder: MediaRecorder;

    const startRecording = () => {
      if (exportCancelRef.current) return finish(false);

      // Canvas dimensions are the export's actual "frame format" — everything drawFitted paints
      // for every clip in the sequence gets composited into this one fixed box, exactly like a
      // real NLE's project/sequence resolution. "original" derives it from the first clip's own
      // native size (rotated 90/270 swaps which axis is which); every other option is a fixed
      // ratio rendered at a ~1280px-long-edge reference size.
      const nativeW = outgoing.el.videoWidth || 1280;
      const nativeH = outgoing.el.videoHeight || 720;
      const firstRotated90 = outgoing.clip.rotation === 90 || outgoing.clip.rotation === 270;
      const baseW = firstRotated90 ? nativeH : nativeW;
      const baseH = firstRotated90 ? nativeW : nativeH;
      if (canvasAspectRatio === "original") {
        canvas.width = baseW;
        canvas.height = baseH;
      } else {
        const ratio = ASPECT_RATIO_VALUES[canvasAspectRatio];
        const reference = Math.max(baseW, baseH, EXPORT_QUALITY_REFERENCE[exportQuality]);
        if (ratio >= 1) {
          canvas.width = reference;
          canvas.height = Math.round(reference / ratio);
        } else {
          canvas.height = reference;
          canvas.width = Math.round(reference * ratio);
        }
      }

      let videoTrack: MediaStreamTrack;
      try {
        const canvasStream = (canvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream(30);
        videoTrack = canvasStream.getVideoTracks()[0];
      } catch {
        return finish(false);
      }

      const combined = new MediaStream([videoTrack, ...destination.stream.getAudioTracks()]);
      const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find(
        (type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type),
      );
      recorder = new MediaRecorder(combined, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: EXPORT_QUALITY_BITRATE[exportQuality],
      });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        combined.getTracks().forEach((track) => track.stop());
        finish(true, new Blob(chunks, { type: "video/webm" }));
      };
      cleanupFns.push(() => {
        if (recorder.state !== "inactive") recorder.stop();
      });

      // Gain automation is scheduled against the AudioContext's own clock, anchored to "now" —
      // the instant recording actually starts — since that's the only clock both audio sources
      // and the canvas draw loop agree on. The very first clip's own gain/fade is scheduled here
      // too (not inside `loadIntoElement`, which already handled it for every clip after this
      // one) since this is the true instant its playback actually begins.
      scheduleClipGain(outgoing.el, outgoing.clip);
      const startCtxTime = audioCtx.currentTime;
      const baseGain = muted ? 0 : volume;
      const fadeDur = Math.min(AUDIO_FADE_SECONDS, totalDuration / 2 || 0);
      mainGain.gain.setValueAtTime(audioFadeIn && fadeDur > 0 ? 0 : baseGain, startCtxTime);
      if (audioFadeIn && fadeDur > 0) mainGain.gain.linearRampToValueAtTime(baseGain, startCtxTime + fadeDur);
      if (audioFadeOut && fadeDur > 0) {
        mainGain.gain.setValueAtTime(baseGain, startCtxTime + Math.max(fadeDur, totalDuration - fadeDur));
        mainGain.gain.linearRampToValueAtTime(0, startCtxTime + totalDuration);
      }

      if (bgEl && bgGain && backgroundAudio) {
        const bgBase = backgroundAudio.volume;
        bgGain.gain.setValueAtTime(backgroundAudio.fadeIn && fadeDur > 0 ? 0 : bgBase, startCtxTime);
        if (backgroundAudio.fadeIn && fadeDur > 0) bgGain.gain.linearRampToValueAtTime(bgBase, startCtxTime + fadeDur);
        if (backgroundAudio.fadeOut && fadeDur > 0) {
          bgGain.gain.setValueAtTime(bgBase, startCtxTime + Math.max(fadeDur, totalDuration - fadeDur));
          bgGain.gain.linearRampToValueAtTime(0, startCtxTime + totalDuration);
        }
        bgEl.currentTime = 0;
        void bgEl.play();
      }

      recorder.start();
      void outgoing.el.play();
      rafId = requestAnimationFrame(drawFrame);
    };

    loadIntoElement(
      videoA,
      sequence[0],
      () => {
        outgoing = { el: videoA, clip: sequence[0] };
        startRecording();
      },
      false,
    );
  }, [clips, clipRanges, duration, isExporting, textOverlays, volume, muted, audioFadeIn, audioFadeOut, backgroundAudio, canvasAspectRatio, exportQuality]);

  const value = useMemo<VideoEditorContextValue>(
    () => ({
      videoRef,
      nextVideoRef,
      preloadNextClip,
      transitionPreview,
      hasVideo: clips.length > 0,
      isLoading,
      duration,
      currentTime,
      isPlaying,
      volume,
      muted,
      textOverlays,
      activePanelSection,
      setActivePanelSection,
      mobilePanelOpen,
      setMobilePanelOpen,

      canvasAspectRatio,
      setCanvasAspectRatio,
      exportQuality,
      setExportQuality,

      clips,
      currentClip: clips[activeClipIndex] ?? null,
      clipRanges: clipRanges.map((r) => ({ clipId: r.clip.id, start: r.start, end: r.end })),
      selectedClipId,
      selectClip,
      clipThumbnails,
      addClips,
      removeClip,
      clearProject,
      reorderClips,
      updateClipTrim,
      updateClipEffect,
      canSplit,
      splitAtPlayhead,
      updateClipTransition,
      applyTransitionToAll,
      rotateClip,
      toggleClipFlip,
      setClipFitMode,
      setClipCrop,
      setClipSpeed,
      setClipVolume,
      toggleClipMuted,
      toggleClipFadeIn,
      toggleClipFadeOut,
      canUndo,
      undo,
      beginTimelineEdit,

      togglePlay,
      seek,
      setVolume,
      toggleMuted,
      loopPlayback,
      toggleLoopPlayback,
      addTextOverlay,
      updateTextOverlay,
      removeTextOverlay,

      audioFadeIn,
      audioFadeOut,
      toggleAudioFadeIn,
      toggleAudioFadeOut,
      backgroundAudio,
      addBackgroundAudio,
      removeBackgroundAudio,
      setBackgroundAudioVolume,
      toggleBackgroundAudioFadeIn,
      toggleBackgroundAudioFadeOut,

      canExport: canExportInThisBrowser(),
      isExporting,
      exportProgress,
      exportVideo,
      cancelExport,
    }),
    [
      clips,
      activeClipIndex,
      preloadNextClip,
      transitionPreview,
      isLoading,
      duration,
      currentTime,
      isPlaying,
      volume,
      muted,
      textOverlays,
      activePanelSection,
      mobilePanelOpen,
      canvasAspectRatio,
      exportQuality,
      clipRanges,
      selectedClipId,
      selectClip,
      clipThumbnails,
      addClips,
      removeClip,
      clearProject,
      reorderClips,
      updateClipTrim,
      updateClipEffect,
      canSplit,
      splitAtPlayhead,
      updateClipTransition,
      applyTransitionToAll,
      rotateClip,
      toggleClipFlip,
      setClipFitMode,
      setClipCrop,
      setClipSpeed,
      setClipVolume,
      toggleClipMuted,
      toggleClipFadeIn,
      toggleClipFadeOut,
      canUndo,
      undo,
      beginTimelineEdit,
      togglePlay,
      seek,
      setVolume,
      toggleMuted,
      loopPlayback,
      toggleLoopPlayback,
      addTextOverlay,
      updateTextOverlay,
      removeTextOverlay,
      audioFadeIn,
      audioFadeOut,
      toggleAudioFadeIn,
      toggleAudioFadeOut,
      backgroundAudio,
      addBackgroundAudio,
      removeBackgroundAudio,
      setBackgroundAudioVolume,
      toggleBackgroundAudioFadeIn,
      toggleBackgroundAudioFadeOut,
      isExporting,
      exportProgress,
      exportVideo,
      cancelExport,
    ],
  );

  return (
    <VideoEditorContext.Provider value={value}>
      {backgroundAudio && <audio ref={bgAudioRef} src={backgroundAudio.url} className="hidden" />}
      {children}
    </VideoEditorContext.Provider>
  );
}

export function useVideoEditor(): VideoEditorContextValue {
  const ctx = useContext(VideoEditorContext);
  if (!ctx) throw new Error("useVideoEditor must be used within a VideoEditorProvider");
  return ctx;
}
