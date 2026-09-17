"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import {
  FlipHorizontal2,
  FlipVertical2,
  Film,
  Music,
  Pause,
  Play,
  Plus,
  Repeat,
  RotateCcw,
  RotateCw,
  Sparkles,
  Trash2,
  Undo2,
  Volume2,
  X,
} from "lucide-react";
import { useVideoEditor, MIN_CLIP_SPEED, type Clip, type TextOverlay } from "@/context/VideoEditorContext";
import { useColorMode } from "@/context/ColorModeContext";
import { formatPreciseTime } from "@/lib/formatters";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const MIN_TRIM_LENGTH = 0.15;
const MIN_TEXT_OVERLAY_LENGTH = 0.3;

// Below this, a thumbnail reads as a smeared sliver rather than a recognizable frame — so a clip
// card never renders more thumbnails than fit at this width, no matter how many are available.
const MIN_THUMB_WIDTH_PX = 26;

/** Picks an evenly-spaced subset of `count` thumbnails out of `thumbs` (or all of them if there
 * are already fewer than `count`) — keeps the filmstrip's frame spacing uniform across the clip
 * instead of just slicing off the tail. */
function sampleThumbs(thumbs: string[], count: number): string[] {
  if (count <= 0 || thumbs.length === 0) return [];
  if (thumbs.length <= count) return thumbs;
  const step = thumbs.length / count;
  return Array.from({ length: count }, (_, i) => thumbs[Math.min(thumbs.length - 1, Math.floor(i * step))]);
}

const WAVEFORM_BAR_COUNT = 48;

/** Deterministic pseudo-random bar heights for the background-audio waveform — seeded from the
 * file name + duration so the same track always renders the same "waveform" rather than
 * reshuffling on every re-render (a real decode is unnecessary for a track-lane preview). */
function buildWaveformBars(seedKey: string, count: number): number[] {
  let seed = 0;
  for (let i = 0; i < seedKey.length; i++) seed = (seed * 31 + seedKey.charCodeAt(i)) >>> 0;
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    bars.push(0.25 + (seed % 1000) / 1000 * 0.75);
  }
  return bars;
}

const NICE_INTERVALS = [1, 2,5, 10, 15, 30, 60, 120, 300, 600, 900, 1800];
const MINOR_TICKS_PER_MAJOR = 5;
// Roughly how much horizontal room a major tick's timestamp label needs to not collide with its
// neighbor — used to thin out major ticks on a narrow (mobile) lane instead of always targeting a
// fixed count that was only ever tuned for desktop widths.
const PX_PER_MAJOR_TICK = 70;

/** Picks a "nice" major-gridline spacing (1s, 2s, 5s, 10s, 15s, 30s, 1m, ...) so the ruler always
 * reads as round timestamps (0s, 10s, 20s...) no matter how long the sequence is, rather than
 * dividing the duration into a fixed, often-awkward number of segments. `laneWidthPx` scales how
 * many major ticks are targeted, so labels stay legible instead of overlapping on narrow screens. */
function computeRulerInterval(duration: number, laneWidthPx: number): number {
  if (duration <= 0) return 10;
  const targetMajorTicks = laneWidthPx > 0 ? Math.max(3, Math.min(9, Math.round(laneWidthPx / PX_PER_MAJOR_TICK))) : 9;
  const raw = duration / targetMajorTicks;
  return NICE_INTERVALS.find((step) => step >= raw) ?? NICE_INTERVALS[NICE_INTERVALS.length - 1];
}

interface DisplayRange {
  clip: Clip;
  start: number;
  end: number;
  /** True for the single, currently-selected clip — the only one shown at its full untrimmed
   * source length with cyan trim handles directly on its main-track card. Every other clip keeps
   * its normal trimmed length so the rest of the sequence still lays out exactly as it plays. */
  isExpanded: boolean;
}

/** Every color the timeline uses, split by light/dark — built once per render from
 * `useColorMode()` so the whole track (chrome, lanes, cards, and the active trim window's accent)
 * follows the app's theme toggle instead of being hardcoded to one dark palette. The accent hex
 * values mirror `theme/theme.ts`'s `secondary` color for each mode (dark `#06B6D4`, light
 * `#0891B2`) so the trim handles read as the same "brand cyan" MUI already uses elsewhere. */
function useTimelineTheme(isDark: boolean) {
  return useMemo(
    () => ({
      accentHex: isDark ? "#FFFFFF" : "#1E293B",
      panelBg: isDark ? "bg-neutral-950" : "bg-white",
      panelBorder: isDark ? "border-neutral-800/70" : "border-slate-200",
      heading: isDark ? "text-neutral-500" : "text-slate-500",
      btn: isDark
        ? "border-neutral-700 bg-neutral-800/60 text-neutral-300 hover:border-neutral-600 hover:text-white disabled:hover:border-neutral-700 disabled:hover:text-neutral-300"
        : "border-slate-300 bg-slate-100 text-slate-600 hover:border-slate-400 hover:text-slate-900 disabled:hover:border-slate-300 disabled:hover:text-slate-600",
      toggleOn: isDark ? "border-white/50 bg-white/15 text-white" : "border-cyan-600/50 bg-cyan-600/15 text-cyan-700",
      toggleOff: isDark
        ? "border-neutral-700 bg-neutral-800/60 text-neutral-300 hover:border-neutral-600 hover:text-white"
        : "border-slate-300 bg-slate-100 text-slate-600 hover:border-slate-400 hover:text-slate-900",
      pill: isDark ? "border-neutral-700 bg-neutral-800/95 hover:border-white/60" : "border-slate-300 bg-white/95 hover:border-slate-500",
      pillText: isDark ? "text-neutral-300" : "text-slate-600",
      pillBtnBg: isDark ? "bg-white text-neutral-950" : "bg-slate-900 text-white",
      railIcon: isDark ? "text-neutral-600" : "text-slate-400",
      rulerBorder: isDark ? "border-neutral-800" : "border-slate-200",
      tickMinor: isDark ? "bg-neutral-700" : "bg-slate-300",
      tickMajor: isDark ? "bg-neutral-600" : "bg-slate-400",
      tickLabel: isDark ? "text-neutral-500" : "text-slate-500",
      laneBg: isDark ? "bg-neutral-900/60" : "bg-slate-100",
      addPill: isDark
        ? "border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-cyan-400/50 hover:bg-neutral-700 hover:text-white"
        : "border-slate-300 bg-white text-slate-600 hover:border-cyan-600/50 hover:bg-slate-100 hover:text-slate-900",
      cardBg: isDark ? "bg-neutral-800 hover:bg-neutral-700" : "bg-slate-200 hover:bg-slate-300",
      cardDefaultBorder: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.08)",
      placeholderStripe: isDark
        ? "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 34px)"
        : "repeating-linear-gradient(90deg, rgba(15,23,42,0.06) 0px, rgba(15,23,42,0.06) 1px, transparent 1px, transparent 34px)",
      dragOverRing: isDark ? "ring-white/50" : "ring-slate-500/50",
      scrim: isDark ? "bg-neutral-950/60" : "bg-slate-900/55",
      handleBg: isDark ? "bg-white hover:bg-neutral-200" : "bg-slate-700 hover:bg-slate-800",
      handleShadow: isDark ? "shadow-[0_0_6px_rgba(255,255,255,0.8)]" : "shadow-[0_0_6px_rgba(51,65,85,0.6)]",
      // The active trim window's own border/wash — a neutral white-family color (not the cyan
      // accent used by the handles) that still flips by theme: white in dark mode, near-black in
      // light mode, matching the playhead's own light/dark treatment below.
      wash: isDark ? "border-white/70 bg-white/10" : "border-slate-900/70 bg-slate-900/10",
      selectedShadow: isDark ? "shadow-[0_0_10px_rgba(34,211,238,0.5)]" : "shadow-[0_0_10px_rgba(8,145,178,0.35)]",
      accentText: isDark ? "text-white" : "text-slate-800",
      labelBg: isDark ? "bg-neutral-950/90" : "bg-white/95",
      removeBtn: isDark ? "bg-black/60 text-neutral-300" : "bg-white/85 text-slate-600",
      textClipBorder: isDark ? "border-white/30" : "border-slate-900/30",
      textClipBg: isDark ? "bg-white/10" : "bg-slate-900/10",
      textClipText: isDark ? "text-white" : "text-slate-800",
      textHandleHover: isDark ? "hover:bg-white/40" : "hover:bg-slate-900/40",
      audioCardBg: isDark ? "bg-neutral-800 hover:bg-neutral-700" : "bg-slate-200 hover:bg-slate-300",
      waveformBar: isDark ? "bg-neutral-400" : "bg-slate-500",
      audioText: isDark ? "text-neutral-200" : "text-slate-700",
      audioTextMuted: isDark ? "text-neutral-300/80" : "text-slate-500",
      removeAudioBtn: isDark ? "text-neutral-300/70 hover:bg-red-500/60 hover:text-white" : "text-slate-500 hover:bg-red-500/80 hover:text-white",
      hoverGuide: isDark ? "bg-white/25" : "bg-slate-900/20",
      hoverPill: isDark ? "border-neutral-700 bg-neutral-900/95 text-white" : "border-slate-300 bg-white/95 text-slate-900",
      playheadLine: isDark ? "bg-white shadow-[0_0_6px_rgba(255,255,255,0.85)]" : "bg-slate-900 shadow-[0_0_6px_rgba(15,23,42,0.45)]",
      dropText: isDark ? "text-neutral-400" : "text-slate-500",
    }),
    [isDark],
  );
}

/** Modular Canva-style multi-track timeline: a fixed-width scrollable track area (ruler + video
 * + elements + audio lanes, all sharing one horizontal scroll so they stay aligned) sits to the
 * right of a fixed label rail. A floating play/pause pill hovers centered above the ruler. Every
 * color (lanes, cards, the active trim window's accent) is theme-aware — see `useTimelineTheme`.
 *
 * Trimming happens directly on the main video-track card (no separate widget below): selecting a
 * clip expands its card to its full source length and overlays a dark ~0.6-opacity scrim on the
 * cut-away head/tail plus cyan drag handles at trimStart/trimEnd — see `displayRanges` below. */
export default function Timeline() {
  const {
    videoRef,
    hasVideo,
    duration,
    currentTime,
    currentClip,
    isPlaying,
    togglePlay,
    seek,
    clips,
    clipRanges,
    selectedClipId,
    selectClip,
    clipThumbnails,
    removeClip,
    reorderClips,
    updateClipTrim,
    setActivePanelSection,
    backgroundAudio,
    addBackgroundAudio,
    removeBackgroundAudio,
    textOverlays,
    updateTextOverlay,
    canUndo,
    undo,
    beginTimelineEdit,
    loopPlayback,
    toggleLoopPlayback,
    rotateClip,
    toggleClipFlip,
  } = useVideoEditor();

  const { mode } = useColorMode();
  const isDark = mode === "dark";
  const t = useTimelineTheme(isDark);

  const trackRef = useRef<HTMLDivElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [bgDragActive, setBgDragActive] = useState(false);
  const [resizingClipId, setResizingClipId] = useState<string | null>(null);
  const resizeRef = useRef<{
    clipId: string;
    edge: "start" | "end";
    pixelsPerSecond: number;
    startClientX: number;
    initialTrimStart: number;
    initialTrimEnd: number;
  } | null>(null);
  // Spans the ruler + elements/video/audio lanes (but not the audio fade-controls panel below
  // them) — the single playhead marker is positioned absolutely inside this, so its height
  // always matches "ruler down to the bottom of the audio track". Its own rendered width (read
  // fresh on every scrub/rAF tick below) is also the one basis every pixel position on the
  // timeline is computed from.
  const laneStackRef = useRef<HTMLDivElement>(null);
  // Tracks the lane stack's live pixel width so the video-clip filmstrips below can cap how many
  // thumbnails they render — without this, a fixed thumbnail count squeezed into a narrow (mobile
  // width) clip card renders each frame only a few pixels wide, which shows up as a smeared,
  // near-duplicate "collage" rather than a readable filmstrip.
  const [laneWidthPx, setLaneWidthPx] = useState(0);
  useEffect(() => {
    const node = laneStackRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (typeof width === "number") setLaneWidthPx(width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const playheadRef = useRef<HTMLDivElement>(null);
  const textLaneRef = useRef<HTMLDivElement>(null);
  const textDragRef = useRef<{
    overlayId: string;
    mode: "start" | "end" | "move";
    startClientX: number;
    pixelsPerSecond: number;
    initialStartDisplay: number;
    initialEndDisplay: number;
  } | null>(null);
  // Dragging inside the active [trimStart, trimEnd] window (as opposed to grabbing a handle):
  // slides both boundaries together by the same delta, keeping their span fixed. Kept separate
  // from `resizeRef` above so a plain click (no movement) can still fall through to an ordinary
  // seek — `moved`/`historyStarted` only flip once the pointer actually travels past a small
  // threshold, so a tap doesn't shift the window by a spurious few milliseconds or spam undo.
  const rangeDragRef = useRef<{
    clipId: string;
    pixelsPerSecond: number;
    startClientX: number;
    initialTrimStart: number;
    initialTrimEnd: number;
    /** This clip's current native source-time playhead offset from its own trimStart, captured
     * once at drag start (null if this clip isn't the one actually loaded for playback) — reapplied
     * against the *new* trimStart on every move so the marker slides along with the window instead
     * of being left behind to get clamped back in afterwards. */
    localOffset: number | null;
    moved: boolean;
    historyStarted: boolean;
  } | null>(null);

  // The track's own "display" axis: identical to the normal trimmed sequence everywhere except
  // across the currently-selected clip's span, which is stretched to that clip's full untrimmed
  // source length so its filmstrip and cyan handles have real, complete footage to sit on. Since
  // every clip's on-screen width is exactly its own length divided by this same total, the axis
  // stays perfectly linear (constant pixels-per-second) — selecting a different clip just
  // recomputes it, reflowing the ruler and every other clip's card around the new expansion.
  const displayRanges = useMemo<DisplayRange[]>(() => {
    // Purely functional prefix-sum (no mutable accumulator), matching how the context's own
    // `clipRanges` is derived — keeps this safe under the React Compiler.
    const lengthOf = (clip: Clip) =>
      clip.id === selectedClipId
        ? clip.duration
        : Math.max(0, clip.trimEnd - clip.trimStart) / Math.max(MIN_CLIP_SPEED, clip.speed);
    return clips.map((clip, index) => {
      const start = clips.slice(0, index).reduce((sum, c) => sum + lengthOf(c), 0);
      return { clip, start, end: start + lengthOf(clip), isExpanded: clip.id === selectedClipId };
    });
  }, [clips, selectedClipId]);
  const displayDuration = displayRanges.length > 0 ? displayRanges[displayRanges.length - 1].end : 0;

  // Converts a real playback/`currentTime` second into the display axis above — identity outside
  // the selected clip's span, stretched to source time inside it.
  const sequenceTimeToDisplayTime = useCallback(
    (time: number) => {
      if (clipRanges.length === 0) return 0;
      let idx = clipRanges.findIndex((r) => time >= r.start && time < r.end);
      if (idx === -1) idx = clipRanges.length - 1;
      const seqRange = clipRanges[idx];
      const dispRange = displayRanges[idx];
      const clip = clips[idx];
      if (!seqRange || !dispRange || !clip) return 0;
      const elapsed = time - seqRange.start;
      if (dispRange.isExpanded) {
        return dispRange.start + clip.trimStart + elapsed * Math.max(MIN_CLIP_SPEED, clip.speed);
      }
      return dispRange.start + elapsed;
    },
    [clipRanges, displayRanges, clips],
  );

  // Inverse of the above: given a display second, finds which clip it falls in and returns the
  // sequence second to actually `seek()` to. Clamped into [trimStart, trimEnd] when that clip is
  // the expanded one, so clicking its dimmed, untrimmed filmstrip snaps to whichever trim handle
  // it landed outside of rather than seeking into footage that isn't part of the export.
  const displayTimeToSequenceTime = useCallback(
    (displayTime: number): { time: number; clipId: string | null } => {
      if (displayRanges.length === 0) return { time: 0, clipId: null };
      let idx = displayRanges.findIndex((r) => displayTime >= r.start && displayTime < r.end);
      if (idx === -1) idx = displayRanges.length - 1;
      const dispRange = displayRanges[idx];
      const seqRange = clipRanges[idx];
      if (!dispRange || !seqRange) return { time: 0, clipId: null };
      const localWithin = displayTime - dispRange.start;
      if (dispRange.isExpanded) {
        const localSource = Math.min(dispRange.clip.trimEnd, Math.max(dispRange.clip.trimStart, localWithin));
        return { time: seqRange.start + (localSource - dispRange.clip.trimStart), clipId: dispRange.clip.id };
      }
      const clampedLocal = Math.min(Math.max(localWithin, 0), seqRange.end - seqRange.start);
      return { time: seqRange.start + clampedLocal, clipId: dispRange.clip.id };
    },
    [displayRanges, clipRanges],
  );

  // Writes the marker's position directly to the DOM via a hardware-accelerated transform,
  // bypassing React state/render entirely — this is what keeps both the 60fps playback glide
  // and pointer-drag scrubbing below perfectly smooth instead of only updating once per re-render.
  const setPlayheadPx = useCallback((px: number) => {
    const el = playheadRef.current;
    if (el) el.style.transform = `translateX(${px}px)`;
  }, []);

  const setPlayheadFromDisplayTime = useCallback(
    (displayTime: number) => {
      const laneWidth = laneStackRef.current?.getBoundingClientRect().width ?? 0;
      const ratio = displayDuration > 0 ? Math.min(1, Math.max(0, displayTime / displayDuration)) : 0;
      setPlayheadPx(ratio * laneWidth);
    },
    [displayDuration, setPlayheadPx],
  );

  // The one path every click/drag/ruler-tap goes through: takes a position in display seconds,
  // resolves it to the real sequence second to seek to (clamping into the active clip's trim
  // bounds when applicable), and re-derives the marker's on-screen position from wherever that
  // seek actually landed — so a click on a dimmed scrim visibly snaps to the trim handle it was
  // outside of instead of momentarily rendering under the cursor.
  const seekToDisplayTime = useCallback(
    (displayTime: number) => {
      const clamped = Math.min(displayDuration, Math.max(0, displayTime));
      const { time } = displayTimeToSequenceTime(clamped);
      seek(time);
      setPlayheadFromDisplayTime(sequenceTimeToDisplayTime(time));
    },
    [displayDuration, displayTimeToSequenceTime, seek, sequenceTimeToDisplayTime, setPlayheadFromDisplayTime],
  );

  // Hover preview: shows the exact timecode under the cursor anywhere over the ruler/lanes,
  // independent of the drag-to-seek handlers below (this fires on every hover, not just while a
  // button is held) — computed against the same lane-stack width so it lines up with wherever
  // a click would actually seek to.
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);

  const handleTimelineHover = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!hasVideo || displayDuration <= 0) return;
      const rect = laneStackRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0) return;
      const x = Math.min(rect.width, Math.max(0, event.clientX - rect.left));
      setHoverX(x);
      setHoverTime((x / rect.width) * displayDuration);
    },
    [hasVideo, displayDuration],
  );

  const handleTimelineHoverLeave = useCallback(() => setHoverTime(null), []);

  // Shared by the ruler and every lane: `event.currentTarget` is whichever of those the gesture
  // actually started on, so the ratio is computed against that element's own (identical-width)
  // rect — this is what makes scrubbing from any lane, or the ruler, move the same playhead. The
  // marker's transform is updated in the same tick as `seek`, so dragging tracks the pointer
  // instantly rather than waiting on the next `timeupdate`-driven re-render.
  const handleScrubPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!hasVideo || displayDuration <= 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      const rect = event.currentTarget.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      seekToDisplayTime(ratio * displayDuration);
    },
    [hasVideo, displayDuration, seekToDisplayTime],
  );

  const handleScrubPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!hasVideo || displayDuration <= 0 || event.buttons !== 1) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      seekToDisplayTime(ratio * displayDuration);
    },
    [hasVideo, displayDuration, seekToDisplayTime],
  );

  // Dragging the marker handle itself: the ratio is computed against the full lane-stack width
  // (not the handle's own tiny rect), so grabbing the triangle scrubs exactly like dragging on
  // the ruler or any track lane.
  const handlePlayheadPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!hasVideo || displayDuration <= 0) return;
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      const rect = laneStackRef.current?.getBoundingClientRect();
      if (rect) seekToDisplayTime(((event.clientX - rect.left) / rect.width) * displayDuration);
    },
    [hasVideo, displayDuration, seekToDisplayTime],
  );

  const handlePlayheadPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!hasVideo || displayDuration <= 0 || event.buttons !== 1) return;
      const rect = laneStackRef.current?.getBoundingClientRect();
      if (rect) seekToDisplayTime(((event.clientX - rect.left) / rect.width) * displayDuration);
    },
    [hasVideo, displayDuration, seekToDisplayTime],
  );

  const handlePlayheadPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  // Smooth 60fps glide during playback: reads the native <video> element's own `currentTime`
  // every animation frame (not the lower-frequency `timeupdate`-derived `currentTime` state) and
  // writes the marker's position straight to the DOM, so the line glides continuously instead of
  // visibly ticking between `timeupdate` events (which browsers fire as infrequently as 4-10x/s).
  useEffect(() => {
    if (!isPlaying) return;
    let raf = 0;
    const tick = () => {
      const el = videoRef.current;
      const idx = currentClip ? clips.findIndex((c) => c.id === currentClip.id) : -1;
      const dispRange = idx !== -1 ? displayRanges[idx] : undefined;
      if (el && currentClip && dispRange && displayDuration > 0) {
        const displayPos = dispRange.isExpanded
          ? dispRange.start + el.currentTime
          : dispRange.start + (el.currentTime - currentClip.trimStart) / Math.max(MIN_CLIP_SPEED, currentClip.speed);
        const ratio = Math.min(1, Math.max(0, displayPos / displayDuration));
        const laneWidth = laneStackRef.current?.getBoundingClientRect().width ?? 0;
        setPlayheadPx(ratio * laneWidth);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, videoRef, currentClip, clips, displayRanges, displayDuration, setPlayheadPx]);

  // Keeps the marker synced whenever `currentTime` changes for any reason other than the rAF
  // loop above (seeking via buttons/keyboard shortcuts/undo, or the video simply pausing) —
  // skipped while playing since that loop is the higher-frequency, authoritative driver there.
  useEffect(() => {
    if (isPlaying) return;
    setPlayheadFromDisplayTime(sequenceTimeToDisplayTime(currentTime));
  }, [currentTime, isPlaying, sequenceTimeToDisplayTime, setPlayheadFromDisplayTime]);

  const rulerInterval = useMemo(() => computeRulerInterval(displayDuration, laneWidthPx), [displayDuration, laneWidthPx]);
  const majorMarks = useMemo(() => {
    if (displayDuration <= 0) return [];
    const marks: number[] = [];
    for (let t = 0; t <= displayDuration + 0.001; t += rulerInterval) marks.push(t);
    return marks;
  }, [displayDuration, rulerInterval]);
  const minorMarks = useMemo(() => {
    if (displayDuration <= 0) return [];
    const step = rulerInterval / MINOR_TICKS_PER_MAJOR;
    const marks: number[] = [];
    for (let t = 0; t <= displayDuration + 0.001; t += step) marks.push(t);
    return marks;
  }, [displayDuration, rulerInterval]);

  const handleDragStart = useCallback((index: number) => (event: DragEvent<HTMLDivElement>) => {
    setDraggingIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  }, []);

  const handleDragOverClip = useCallback((index: number) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }, []);

  const handleDropOnClip = useCallback(
    (index: number) => (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (draggingIndex !== null) reorderClips(draggingIndex, index);
      setDraggingIndex(null);
      setDragOverIndex(null);
    },
    [draggingIndex, reorderClips],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingIndex(null);
    setDragOverIndex(null);
  }, []);

  // Drag-to-trim: grabbing the selected clip's own cyan handle scrubs its trimStart/trimEnd
  // live. Because the display axis is linear (see `displayRanges` above), pixels-per-second is
  // just the lane's own width divided by the total display duration — the same rate the rest of
  // the track uses — captured once at pointer-down so a drag of dx pixels always means the same
  // time delta regardless of layout changes mid-drag.
  const handleTrimHandlePointerDown = useCallback(
    (clip: Clip, edge: "start" | "end") => (event: ReactPointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      event.preventDefault();
      beginTimelineEdit();
      const laneWidth = laneStackRef.current?.getBoundingClientRect().width ?? 0;
      const pixelsPerSecond = displayDuration > 0 ? laneWidth / displayDuration : 0;
      resizeRef.current = {
        clipId: clip.id,
        edge,
        pixelsPerSecond,
        startClientX: event.clientX,
        initialTrimStart: clip.trimStart,
        initialTrimEnd: clip.trimEnd,
      };
      setResizingClipId(clip.id);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [beginTimelineEdit, displayDuration],
  );

  const handleTrimHandlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const state = resizeRef.current;
      if (!state || state.pixelsPerSecond <= 0) return;
      const clip = clips.find((c) => c.id === state.clipId);
      if (!clip) return;
      const deltaSeconds = (event.clientX - state.startClientX) / state.pixelsPerSecond;
      if (state.edge === "start") {
        const next = Math.min(
          Math.max(0, state.initialTrimStart + deltaSeconds),
          state.initialTrimEnd - MIN_TRIM_LENGTH,
        );
        updateClipTrim(clip.id, next, state.initialTrimEnd);
      } else {
        const next = Math.max(
          Math.min(clip.duration, state.initialTrimEnd + deltaSeconds),
          state.initialTrimStart + MIN_TRIM_LENGTH,
        );
        updateClipTrim(clip.id, state.initialTrimStart, next);
      }
    },
    [clips, updateClipTrim],
  );

  const handleTrimHandlePointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    resizeRef.current = null;
    setResizingClipId(null);
  }, []);

  const RANGE_DRAG_CLICK_THRESHOLD_PX = 3;

  // Dragging inside the active [trimStart, trimEnd] window: slides both boundaries together,
  // keeping the trimmed duration fixed. Same pixels-per-second basis as the handles (the lane's
  // own width / displayDuration — constant across the linear display axis), captured once at
  // pointer-down.
  const handleTrimRangePointerDown = useCallback(
    (clip: Clip) => (event: ReactPointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      const laneWidth = laneStackRef.current?.getBoundingClientRect().width ?? 0;
      const pixelsPerSecond = displayDuration > 0 ? laneWidth / displayDuration : 0;
      const seqRange = clipRanges.find((r) => r.clipId === clip.id);
      rangeDragRef.current = {
        clipId: clip.id,
        pixelsPerSecond,
        startClientX: event.clientX,
        initialTrimStart: clip.trimStart,
        initialTrimEnd: clip.trimEnd,
        localOffset:
          currentClip?.id === clip.id && seqRange
            ? (currentTime - seqRange.start) * Math.max(MIN_CLIP_SPEED, clip.speed)
            : null,
        moved: false,
        historyStarted: false,
      };
      setResizingClipId(clip.id);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [displayDuration, clipRanges, currentClip, currentTime],
  );

  const handleTrimRangePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const state = rangeDragRef.current;
      if (!state || state.pixelsPerSecond <= 0) return;
      const dxPx = event.clientX - state.startClientX;
      if (!state.moved) {
        if (Math.abs(dxPx) < RANGE_DRAG_CLICK_THRESHOLD_PX) return;
        state.moved = true;
        beginTimelineEdit();
        state.historyStarted = true;
      }
      const clip = clips.find((c) => c.id === state.clipId);
      if (!clip) return;
      const span = state.initialTrimEnd - state.initialTrimStart;
      const deltaSeconds = dxPx / state.pixelsPerSecond;
      // Hard-clamped so trimStart can never go below 0 or trimEnd past this clip's own full
      // source length (`totalDuration` for this widget), with the span itself never changing.
      const nextStart = Math.min(Math.max(0, state.initialTrimStart + deltaSeconds), Math.max(0, clip.duration - span));
      updateClipTrim(clip.id, nextStart, nextStart + span);

      // Slide the playhead along with the window so it keeps the same relative offset from
      // trimStart it had when the drag began, rather than being left behind to get clamped back
      // into range afterwards.
      if (state.localOffset !== null) {
        const el = videoRef.current;
        const idx = clips.findIndex((c) => c.id === clip.id);
        const dispRange = idx !== -1 ? displayRanges[idx] : undefined;
        if (el && dispRange) {
          const newLocalTime = nextStart + Math.min(Math.max(state.localOffset, 0), span);
          el.currentTime = newLocalTime;
          setPlayheadFromDisplayTime(dispRange.start + newLocalTime);
        }
      }
    },
    [clips, displayRanges, beginTimelineEdit, updateClipTrim, videoRef, setPlayheadFromDisplayTime],
  );

  const handleTrimRangePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.currentTarget.releasePointerCapture(event.pointerId);
      const state = rangeDragRef.current;
      if (state && !state.moved) {
        // A plain click (no drag) inside the active window: seek there, same as clicking
        // anywhere else on the track, instead of silently doing nothing.
        const rect = laneStackRef.current?.getBoundingClientRect();
        if (rect) {
          const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
          seekToDisplayTime(ratio * displayDuration);
        }
      }
      rangeDragRef.current = null;
      setResizingClipId(null);
    },
    [seekToDisplayTime, displayDuration],
  );

  // Elements lane drag: "start"/"end" resize the caption's own window from either edge; "move"
  // (grabbing the block's body) shifts the whole window without changing its length. Captions are
  // stored in sequence seconds, but the drag itself happens in display seconds (the lane's own
  // pixel space) so it stays pixel-accurate even while a clip is expanded — converted back to
  // sequence seconds only at the point of calling `updateTextOverlay`.
  const handleTextHandlePointerDown = useCallback(
    (overlay: TextOverlay, mode: "start" | "end" | "move") => (event: ReactPointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      event.preventDefault();
      beginTimelineEdit();
      const laneWidthPx = textLaneRef.current?.getBoundingClientRect().width ?? 0;
      textDragRef.current = {
        overlayId: overlay.id,
        mode,
        startClientX: event.clientX,
        pixelsPerSecond: displayDuration > 0 ? laneWidthPx / displayDuration : 0,
        initialStartDisplay: sequenceTimeToDisplayTime(overlay.start),
        initialEndDisplay: sequenceTimeToDisplayTime(overlay.end),
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [displayDuration, beginTimelineEdit, sequenceTimeToDisplayTime],
  );

  const handleTextHandlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const state = textDragRef.current;
      if (!state || state.pixelsPerSecond <= 0) return;
      const deltaDisplaySeconds = (event.clientX - state.startClientX) / state.pixelsPerSecond;
      if (state.mode === "start") {
        const nextDisplay = Math.min(
          Math.max(0, state.initialStartDisplay + deltaDisplaySeconds),
          state.initialEndDisplay - MIN_TEXT_OVERLAY_LENGTH,
        );
        updateTextOverlay(state.overlayId, { start: displayTimeToSequenceTime(nextDisplay).time });
      } else if (state.mode === "end") {
        const nextDisplay = Math.max(
          Math.min(displayDuration, state.initialEndDisplay + deltaDisplaySeconds),
          state.initialStartDisplay + MIN_TEXT_OVERLAY_LENGTH,
        );
        updateTextOverlay(state.overlayId, { end: displayTimeToSequenceTime(nextDisplay).time });
      } else {
        const span = state.initialEndDisplay - state.initialStartDisplay;
        const nextStartDisplay = Math.min(
          Math.max(0, state.initialStartDisplay + deltaDisplaySeconds),
          Math.max(0, displayDuration - span),
        );
        updateTextOverlay(state.overlayId, {
          start: displayTimeToSequenceTime(nextStartDisplay).time,
          end: displayTimeToSequenceTime(nextStartDisplay + span).time,
        });
      }
    },
    [displayDuration, displayTimeToSequenceTime, updateTextOverlay],
  );

  const handleTextHandlePointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    textDragRef.current = null;
  }, []);

  const handleBgDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!Array.from(event.dataTransfer.types).includes("Files")) return;
    event.preventDefault();
    setBgDragActive(true);
  }, []);
  const handleBgDragLeave = useCallback(() => setBgDragActive(false), []);
  const handleBgDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setBgDragActive(false);
      const file = event.dataTransfer.files?.[0];
      if (file) addBackgroundAudio(file);
    },
    [addBackgroundAudio],
  );
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  const audioWidthPercent =
    backgroundAudio && displayDuration > 0
      ? Math.min(100, (sequenceTimeToDisplayTime(backgroundAudio.duration) / displayDuration) * 100)
      : 100;

  const waveformBars = useMemo(
    () =>
      backgroundAudio
        ? buildWaveformBars(`${backgroundAudio.fileName}:${backgroundAudio.duration}`, WAVEFORM_BAR_COUNT)
        : [],
    [backgroundAudio],
  );

  return (
    <div className={`shrink-0 border-t ${t.panelBorder} ${t.panelBg} px-3 py-3 backdrop-blur-md sm:px-6`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className={`hidden text-xs font-semibold uppercase tracking-wide sm:inline ${t.heading}`}>Timeline</span>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto sm:flex-none sm:gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo last edit"
            className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${t.btn}`}
          >
            <Undo2 size={12} />
            <span className="hidden sm:inline">Undo</span>
          </button>
          <div className={`mx-0.5 h-4 w-px shrink-0 ${t.panelBorder} border-l`} aria-hidden="true" />
          <button
            type="button"
            onClick={() => selectedClipId && rotateClip(selectedClipId, "ccw")}
            disabled={!selectedClipId}
            title="Rotate left 90°"
            aria-label="Rotate selected clip left"
            className={`flex shrink-0 items-center justify-center rounded-md border p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${t.btn}`}
          >
            <RotateCcw size={12} />
          </button>
          <button
            type="button"
            onClick={() => selectedClipId && rotateClip(selectedClipId, "cw")}
            disabled={!selectedClipId}
            title="Rotate right 90°"
            aria-label="Rotate selected clip right"
            className={`flex shrink-0 items-center justify-center rounded-md border p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${t.btn}`}
          >
            <RotateCw size={12} />
          </button>
          <button
            type="button"
            onClick={() => selectedClipId && toggleClipFlip(selectedClipId, "horizontal")}
            disabled={!selectedClipId}
            title="Flip horizontal"
            aria-label="Flip selected clip horizontally"
            className={`flex shrink-0 items-center justify-center rounded-md border p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${t.btn}`}
          >
            <FlipHorizontal2 size={12} />
          </button>
          <button
            type="button"
            onClick={() => selectedClipId && toggleClipFlip(selectedClipId, "vertical")}
            disabled={!selectedClipId}
            title="Flip vertical"
            aria-label="Flip selected clip vertically"
            className={`flex shrink-0 items-center justify-center rounded-md border p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${t.btn}`}
          >
            <FlipVertical2 size={12} />
          </button>
          <div className={`mx-0.5 h-4 w-px shrink-0 ${t.panelBorder} border-l`} aria-hidden="true" />
          <button
            type="button"
            onClick={toggleLoopPlayback}
            disabled={!hasVideo}
            aria-pressed={loopPlayback}
            title={loopPlayback ? "Loop: on" : "Loop: off"}
            aria-label="Toggle loop playback"
            className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              loopPlayback ? t.toggleOn : t.toggleOff
            }`}
          >
            <Repeat size={12} />
            <span className="hidden sm:inline">Loop</span>
          </button>
        </div>
      </div>

      {/* Floating play/pause pill, centered above the ruler — "0:06 ▶ 0:09" style readout of
          current position against total (real, trimmed) sequence duration. */}
      <div className="relative mb-1 flex justify-center">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!hasVideo}
          aria-label={isPlaying ? "Pause" : "Play"}
          className={`z-30 flex items-center gap-2 rounded-full border px-3 py-1 shadow-lg shadow-black/50 backdrop-blur transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${t.pill}`}
        >
          <span className={`font-mono text-[12px] tabular-nums ${t.pillText}`}>{formatTime(currentTime)}</span>
          <span className={`flex h-5 w-5 items-center justify-center rounded-full ${t.pillBtnBg}`}>
            {isPlaying ? <Pause size={11} fill="currentColor" /> : <Play size={11} fill="currentColor" className="ml-0.5" />}
          </span>
          <span className={`font-mono text-[12px] tabular-nums ${t.pillText}`}>{formatTime(duration)}</span>
        </button>
      </div>

      {/* Label rail (fixed) + horizontally scrollable track area (ruler + lanes, sharing one
          scroll so everything stays aligned). */}
      <div className="flex gap-2">
        <div className="flex w-8 shrink-0 flex-col gap-1.5 pt-6">
          <div className={`flex h-9 items-center justify-center ${t.railIcon}`} title="Elements">
            <Sparkles size={13} />
          </div>
          <div className={`flex h-16 items-center justify-center ${t.railIcon}`} title="Video">
            <Film size={13} />
          </div>
          <div className={`flex h-9 items-center justify-center ${t.railIcon}`} title="Audio">
            <Music size={13} />
          </div>
        </div>

        <div className="min-w-0 flex-1 pb-1">
          <div className="relative w-full">
            {/* Spans ruler -> elements -> video -> audio lane (not the fade-controls panel
                below) — the single playhead marker below is positioned against this stack. */}
            <div
              ref={laneStackRef}
              className="relative"
              onPointerMove={handleTimelineHover}
              onPointerLeave={handleTimelineHoverLeave}
            >
            {/* Ruler — dynamic major intervals (0s, 10s, 20s...) with fine minor tick lines
                between them, over the display axis (stretched across the selected clip's full
                source length while one is selected). Clickable/draggable like every lane below. */}
            <div
              onPointerDown={handleScrubPointerDown}
              onPointerMove={handleScrubPointerMove}
              className={`relative mb-1.5 h-5 border-b ${t.rulerBorder} ${hasVideo ? "cursor-pointer" : ""}`}
            >
              {hasVideo &&
                minorMarks.map((mark, i) => (
                  <span
                    key={`minor-${i}`}
                    aria-hidden
                    className={`pointer-events-none absolute bottom-0 h-1.5 w-px ${t.tickMinor}`}
                    style={{ left: `${(mark / displayDuration) * 100}%` }}
                  />
                ))}
              {hasVideo &&
                majorMarks.map((mark, i) => (
                  <div
                    key={`major-${i}`}
                    aria-hidden
                    className="pointer-events-none absolute bottom-0 flex flex-col items-start"
                    style={{ left: `${(mark / displayDuration) * 100}%` }}
                  >
                    <span className={`mb-0.5 -translate-x-1/2 whitespace-nowrap font-mono text-[11px] ${t.tickLabel}`}>
                      {formatTime(mark)}
                    </span>
                    <span className={`h-2.5 w-px ${t.tickMajor}`} />
                  </div>
                ))}
            </div>

            {/* Row 1: Elements ("Add elements" pill + caption/text blocks positioned by time). */}
            <div
              ref={textLaneRef}
              onPointerDown={handleScrubPointerDown}
              onPointerMove={handleScrubPointerMove}
              className={`relative mb-1.5 h-9 overflow-hidden rounded-xl ${t.laneBg} ${
                hasVideo ? "cursor-pointer" : "cursor-not-allowed opacity-50"
              }`}
            >
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  setActivePanelSection("text");
                }}
                disabled={!hasVideo}
                className={`absolute left-1.5 top-1/2 z-20 flex -translate-y-1/2 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow shadow-black/30 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${t.addPill}`}
              >
                <Plus size={11} />
                Add elements
              </button>
              {textOverlays.map((overlay) => {
                const startDisplay = sequenceTimeToDisplayTime(overlay.start);
                const endDisplay = sequenceTimeToDisplayTime(overlay.end);
                const leftPercent = displayDuration > 0 ? (startDisplay / displayDuration) * 100 : 0;
                const widthPercent = displayDuration > 0 ? ((endDisplay - startDisplay) / displayDuration) * 100 : 0;
                return (
                  <div
                    key={overlay.id}
                    style={{ left: `${leftPercent}%`, width: `${widthPercent}%`, borderRadius: 12 }}
                    onPointerDown={handleTextHandlePointerDown(overlay, "move")}
                    onPointerMove={handleTextHandlePointerMove}
                    onPointerUp={handleTextHandlePointerUp}
                    onClick={(event) => {
                      event.stopPropagation();
                      setActivePanelSection("text");
                    }}
                    className={`group/text absolute inset-y-0.5 flex cursor-grab items-center overflow-hidden border px-1.5 active:cursor-grabbing ${t.textClipBorder} ${t.textClipBg}`}
                  >
                    <span className={`pointer-events-none truncate text-[11px] font-medium ${t.textClipText}`}>
                      {overlay.text || "Caption"}
                    </span>
                    <div
                      draggable={false}
                      onPointerDown={handleTextHandlePointerDown(overlay, "start")}
                      onPointerMove={handleTextHandlePointerMove}
                      onPointerUp={handleTextHandlePointerUp}
                      title="Drag to retime start"
                      aria-label={`Retime start of caption "${overlay.text}"`}
                      className={`absolute inset-y-0 left-0 z-10 w-1.5 cursor-ew-resize bg-transparent transition-colors ${t.textHandleHover}`}
                    />
                    <div
                      draggable={false}
                      onPointerDown={handleTextHandlePointerDown(overlay, "end")}
                      onPointerMove={handleTextHandlePointerMove}
                      onPointerUp={handleTextHandlePointerUp}
                      title="Drag to retime end"
                      aria-label={`Retime end of caption "${overlay.text}"`}
                      className={`absolute inset-y-0 right-0 z-10 w-1.5 cursor-ew-resize bg-transparent transition-colors ${t.textHandleHover}`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Row 2: Main video track — rounded (12px) clip cards, drag-to-reorder, boundary/
                transition dots, and a trim overlay (dark scrim + cyan handles) drawn directly on
                top of whichever clip card is currently selected. */}
            <div
              ref={trackRef}
              onPointerDown={handleScrubPointerDown}
              onPointerMove={handleScrubPointerMove}
              className={`relative mb-1.5 flex h-16 gap-1.5 rounded-xl ${t.laneBg} p-1 ${
                hasVideo ? "cursor-pointer" : "cursor-not-allowed opacity-50"
              }`}
            >
              <div className="relative flex h-full flex-1 gap-1">
                {clips.length > 0 ? (
                  clips.map((clip, index) => {
                    const range = displayRanges[index];
                    const widthPercent = displayDuration > 0 ? ((range.end - range.start) / displayDuration) * 100 : 100 / clips.length;
                    const clipWidthPx = (laneWidthPx * widthPercent) / 100;
                    const maxThumbs = Math.max(1, Math.floor(clipWidthPx / MIN_THUMB_WIDTH_PX));
                    const thumbs = sampleThumbs(clipThumbnails[clip.id] ?? [], maxThumbs);
                    const isSelected = selectedClipId === clip.id;
                    const isResizing = resizingClipId === clip.id;
                    return (
                      <div
                        key={clip.id}
                        draggable={!isResizing}
                        onDragStart={handleDragStart(index)}
                        onDragOver={handleDragOverClip(index)}
                        onDrop={handleDropOnClip(index)}
                        onDragEnd={handleDragEnd}
                        onClick={(event) => {
                          event.stopPropagation();
                          selectClip(clip.id);
                        }}
                        style={{
                          width: `${widthPercent}%`,
                          borderRadius: 12,
                          // Literal accent selection border rather than a Tailwind ring, per spec
                          // — `border-box` so it doesn't grow the clip's own layout width. Neutral
                          // white/dark-slate per theme (see `t.accentHex`), matching the trim
                          // handles rather than the old brand-cyan accent.
                          border: isSelected ? `2px solid ${t.accentHex}` : `1px solid ${t.cardDefaultBorder}`,
                          boxSizing: "border-box",
                        }}
                        className={`group/clip relative flex h-full shrink-0 cursor-grab overflow-hidden transition-colors active:cursor-grabbing ${t.cardBg} ${
                          isSelected ? t.selectedShadow : ""
                        } ${dragOverIndex === index && draggingIndex !== index ? `ring-2 ring-inset ${t.dragOverRing}` : ""} ${
                          draggingIndex === index ? "opacity-40" : ""
                        }`}
                      >
                        {/* Selecting a clip expands its card to its full source length (see
                            `displayRanges`) and shows its full filmstrip here — the same frames
                            its cyan trim handles (rendered as a sibling overlay below, so they're
                            never clipped by this card's own `overflow-hidden`) operate on. A
                            non-selected card just shows its normal trimmed-width filmstrip. */}
                        {thumbs.length > 0 ? (
                          <div className="pointer-events-none flex h-full w-full">
                            {thumbs.map((src, i) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={i} src={src} alt="" draggable={false} className="h-full flex-1 min-w-0 select-none object-cover" />
                            ))}
                          </div>
                        ) : (
                          <div
                            aria-hidden
                            className="pointer-events-none h-full w-full opacity-60"
                            style={{ backgroundImage: t.placeholderStripe }}
                          />
                        )}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeClip(clip.id);
                          }}
                          aria-label={`Remove ${clip.fileName}`}
                          className={`absolute right-0.5 top-0.5 z-50 flex h-4 w-4 items-center justify-center rounded opacity-0 transition-opacity hover:bg-red-500/70 hover:text-white group-hover/clip:opacity-100 ${t.removeBtn}`}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div
                    aria-hidden
                    className="absolute inset-0 rounded-xl opacity-60"
                    style={{ backgroundImage: t.placeholderStripe }}
                  />
                )}

                {/* Trim overlay for the selected clip: a sibling of the cards above (not nested
                    inside the card's own `overflow-hidden`) positioned at that clip's exact
                    display-axis span, so its cyan timestamp labels can float above the card
                    without being clipped. Everything inside is local-percent within that span. */}
                {selectedClipId &&
                  (() => {
                    const index = clips.findIndex((c) => c.id === selectedClipId);
                    if (index === -1) return null;
                    const clip = clips[index];
                    const range = displayRanges[index];
                    if (!range) return null;
                    const segStartPercent = displayDuration > 0 ? (range.start / displayDuration) * 100 : 0;
                    const segWidthPercent = displayDuration > 0 ? ((range.end - range.start) / displayDuration) * 100 : 0;
                    const fullLength = Math.max(0.01, clip.duration);
                    const localTrimStartPercent = (clip.trimStart / fullLength) * 100;
                    const localTrimEndPercent = (clip.trimEnd / fullLength) * 100;
                    return (
                      <div
                        className="pointer-events-none absolute inset-y-0 z-30"
                        style={{ left: `${segStartPercent}%`, width: `${segWidthPercent}%` }}
                      >
                        {/* Dark scrim (~0.6 opacity) over the untrimmed head/tail — the source
                            frames stay visible underneath rather than being hidden entirely. */}
                        <div
                          aria-hidden
                          className={`pointer-events-none absolute inset-y-0 left-0 ${t.scrim}`}
                          style={{ width: `${localTrimStartPercent}%` }}
                        />
                        <div
                          aria-hidden
                          className={`pointer-events-none absolute inset-y-0 right-0 ${t.scrim}`}
                          style={{ width: `${100 - localTrimEndPercent}%` }}
                        />

                        {/* Selected segment [trimStart, trimEnd]: a light accent wash plus bracket
                            keeps it reading as fully highlighted against the scrim either side —
                            colored from the theme's accent (see `t.wash`/`t.accentHex`), not a
                            hardcoded cyan. Also the active drag surface: grabbing anywhere inside
                            it slides both trimStart and trimEnd together (see
                            handleTrimRangePointer*); a plain click with no movement falls through
                            to an ordinary seek instead. */}
                        <div
                          onPointerDown={handleTrimRangePointerDown(clip)}
                          onPointerMove={handleTrimRangePointerMove}
                          onPointerUp={handleTrimRangePointerUp}
                          title="Drag to shift the trimmed window"
                          aria-label={`Active trim window of ${clip.fileName}, ${formatPreciseTime(clip.trimStart)} to ${formatPreciseTime(clip.trimEnd)}`}
                          className={`pointer-events-auto absolute inset-y-0 z-20 cursor-grab touch-none border-y-2 active:cursor-grabbing ${t.wash}`}
                          style={{
                            left: `${localTrimStartPercent}%`,
                            width: `${Math.max(0, localTrimEndPercent - localTrimStartPercent)}%`,
                          }}
                        />

                        {/* Cyan (theme-accent) trim handles. */}
                        <div
                          draggable={false}
                          onPointerDown={handleTrimHandlePointerDown(clip, "start")}
                          onPointerMove={handleTrimHandlePointerMove}
                          onPointerUp={handleTrimHandlePointerUp}
                          title="Drag to trim start"
                          aria-label={`Trim start of ${clip.fileName}, currently ${formatPreciseTime(clip.trimStart)}`}
                          style={{ left: `${localTrimStartPercent}%` }}
                          className={`pointer-events-auto absolute inset-y-0 z-40 flex w-2 -translate-x-1/2 cursor-ew-resize items-center justify-center transition-colors ${t.handleBg} ${t.handleShadow}`}
                        />
                        <div
                          draggable={false}
                          onPointerDown={handleTrimHandlePointerDown(clip, "end")}
                          onPointerMove={handleTrimHandlePointerMove}
                          onPointerUp={handleTrimHandlePointerUp}
                          title="Drag to trim end"
                          aria-label={`Trim end of ${clip.fileName}, currently ${formatPreciseTime(clip.trimEnd)}`}
                          style={{ left: `${localTrimEndPercent}%` }}
                          className={`pointer-events-auto absolute inset-y-0 z-40 flex w-2 -translate-x-1/2 cursor-ew-resize items-center justify-center transition-colors ${t.handleBg} ${t.handleShadow}`}
                        />

                        {/* Trim timestamps, floating above the handles. */}
                        <span
                          className={`pointer-events-none absolute -top-5 z-50 -translate-x-1/2 whitespace-nowrap rounded px-1 font-mono text-[11px] font-semibold tabular-nums ${t.labelBg} ${t.accentText}`}
                          style={{ left: `${localTrimStartPercent}%` }}
                        >
                          {formatPreciseTime(clip.trimStart)}
                        </span>
                        <span
                          className={`pointer-events-none absolute -top-5 z-50 -translate-x-1/2 whitespace-nowrap rounded px-1 font-mono text-[11px] font-semibold tabular-nums ${t.labelBg} ${t.accentText}`}
                          style={{ left: `${localTrimEndPercent}%` }}
                        >
                          {formatPreciseTime(clip.trimEnd)}
                        </span>
                      </div>
                    );
                  })()}
              </div>
            </div>

            {/* Row 3: Audio track — "Add audio" pill / dropzone, or the background music card
                (proportional to how much of the sequence it covers) with an inline volume/fade
                toggle. Last row inside the lane stack the playhead marker spans. */}
            <div>
              <input
                ref={bgFileInputRef}
                type="file"
                accept="audio/*"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) addBackgroundAudio(file);
                }}
                aria-label="Upload background audio"
              />
              <div
                onPointerDown={handleScrubPointerDown}
                onPointerMove={handleScrubPointerMove}
                className={`relative h-9 overflow-hidden rounded-xl ${t.laneBg} ${
                  hasVideo ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                }`}
              >
                {backgroundAudio ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => setActivePanelSection("audio")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") setActivePanelSection("audio");
                    }}
                    style={{ width: `${audioWidthPercent}%`, borderRadius: 12 }}
                    className={`absolute inset-y-0.5 left-0 flex cursor-pointer items-center gap-1.5 overflow-hidden px-2.5 transition-colors ${t.audioCardBg}`}
                  >
                    {/* Synthetic waveform — a deterministic bar pattern (see buildWaveformBars)
                        rather than a real decode, just enough to read as "this is audio" at
                        track-lane scale. Sits behind the label/controls, dimmed further under
                        the hover-visible text/icons so it never competes with them. */}
                    <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center gap-px px-1 opacity-40">
                      {waveformBars.map((height, i) => (
                        <span
                          key={i}
                          className={`w-full shrink-0 rounded-full ${t.waveformBar}`}
                          style={{ height: `${Math.round(height * 100)}%` }}
                        />
                      ))}
                    </div>
                    <Music size={12} className={`relative shrink-0 ${t.accentText}`} />
                    <span className={`relative truncate text-[11px] font-medium ${t.audioText}`}>{backgroundAudio.fileName}</span>
                    <div className="relative flex-1" />
                    <Volume2 size={11} className={`relative shrink-0 ${t.accentText}`} />
                    <span className={`relative w-8 shrink-0 text-right font-mono text-[11px] ${t.audioTextMuted}`}>
                      {Math.round(backgroundAudio.volume * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeBackgroundAudio();
                      }}
                      aria-label="Remove background audio"
                      className={`relative flex h-4 w-4 shrink-0 items-center justify-center rounded transition-colors ${t.removeAudioBtn}`}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ) : (
                  <div
                    onPointerDown={(event) => event.stopPropagation()}
                    onDragOver={handleBgDragOver}
                    onDragLeave={handleBgDragLeave}
                    onDrop={handleBgDrop}
                    onClick={() => bgFileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    className="absolute inset-0 flex items-center px-1.5"
                  >
                    <span
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        bgDragActive ? `${isDark ? "border-cyan-400/50 bg-neutral-700 text-cyan-200" : "border-cyan-600/50 bg-slate-200 text-cyan-700"}` : t.addPill
                      }`}
                    >
                      <Music size={11} />
                      Add audio
                    </span>
                    {bgDragActive && (
                      <span className={`ml-2 truncate text-[11px] ${t.dropText}`}>Drop audio to add background track</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Hover time preview — a thin guide line plus a timecode pill that follow the
                cursor anywhere over the ruler/lanes, independent of the playhead itself. Sized
                to this lane stack specifically (not the outer wrapper) so it never stretches
                down into the audio fade-controls panel. */}
            {hasVideo && hoverTime !== null && (
              <>
                <div
                  aria-hidden
                  className={`pointer-events-none absolute inset-y-0 z-40 w-px ${t.hoverGuide}`}
                  style={{ left: `${hoverX}px` }}
                />
                <div
                  aria-hidden
                  className={`pointer-events-none absolute top-0 z-50 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums shadow shadow-black/50 ${t.hoverPill}`}
                  style={{ left: `${hoverX}px`, marginTop: "-4px" }}
                >
                  {formatPreciseTime(hoverTime)}
                </div>
              </>
            )}
            </div>

            {/* Single playhead marker for the whole stack: a teardrop/inverted-triangle handle
                sitting on the ruler with a vertical line running down through every lane below
                it. Position is written imperatively (see setPlayheadPx/the rAF effect above) via
                `transform: translateX(px)` rather than a percentage left driven by React state,
                so it stays hardware-accelerated and never triggers layout during a drag or
                playback glide. `will-change: transform` hints the browser to promote this to its
                own compositor layer up front instead of doing so reactively mid-gesture.
                Its display-axis position is structurally clamped into the selected clip's own
                [trimStart, trimEnd] whenever that's the clip actually loaded for playback — see
                `sequenceTimeToDisplayTime`/`displayTimeToSequenceTime` above and the trim-preview
                pause-and-rewind behavior in VideoEditorContext's `timeupdate` handler. */}
            <div
              ref={playheadRef}
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 z-50 will-change-transform"
              style={{ height: "100%", transform: "translateX(0px)" }}
            >
              <div className={`pointer-events-none absolute inset-y-0 left-0 w-px -translate-x-1/2 ${t.playheadLine}`} />
              <div
                role="slider"
                tabIndex={0}
                aria-label="Playhead"
                aria-valuemin={0}
                aria-valuemax={Math.round(displayDuration)}
                aria-valuenow={Math.round(sequenceTimeToDisplayTime(currentTime))}
                onPointerDown={handlePlayheadPointerDown}
                onPointerMove={handlePlayheadPointerMove}
                onPointerUp={handlePlayheadPointerUp}
                className={`pointer-events-auto absolute -top-2.5 left-0 h-3 w-3.5 -translate-x-1/2 cursor-ew-resize ${t.playheadLine}`}
                style={{ clipPath: "polygon(0% 0%, 100% 0%, 50% 100%)" }}
              />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
