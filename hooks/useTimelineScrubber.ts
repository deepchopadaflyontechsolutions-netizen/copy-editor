"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";

interface UseTimelineScrubberOptions {
  /** The scrubbable track element — pointer position is read relative to its own bounding box,
   * so any element (ruler, filmstrip, custom track) can drive the scrubber. Ref ownership stays
   * with the caller (the component that renders the track), not this hook. */
  containerRef: RefObject<HTMLDivElement | null>;
  /** The <video> element `currentTime` is written to as the user drags, so playback and the
   * on-screen handle never disagree mid-scrub. */
  videoRef: RefObject<HTMLVideoElement | null>;
  duration: number;
  /** In/out points, in the same seconds as `duration`, that playback and scrubbing must never
   * leave. Both default to the full `[0, duration]` range, so a caller with no trim concept (or
   * one that hasn't loaded its trim yet) gets the previous, unclamped behavior for free. */
  trimStart?: number;
  trimEnd?: number;
}

export interface TimelineScrubber {
  currentTime: number;
  /** 0-100, ready to drop straight into a `left: ${playheadPos}%` style. Always falls inside the
   * `[trimStart, trimEnd]` window's own share of that range — it's derived from an already-
   * clamped `currentTime`, so it can never visually drift past either trim handle. */
  playheadPos: number;
  isDragging: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  /** Starts playback, first snapping `currentTime` back to `trimStart` if it's currently outside
   * `[trimStart, trimEnd)` (e.g. paused exactly on the out point, or never seeked into range) —
   * call this from a Play button instead of `videoRef.current.play()` directly. */
  play: () => void;
}

/** Turns a pointer position over `containerRef` into a clamped 0-100% playhead position and the
 * corresponding video `currentTime` (`percentage * duration`), strictly bounded to
 * `[trimStart, trimEnd]` so neither dragging nor native playback can ever land outside the
 * trimmed section.
 *
 * Uses native pointer capture (set on pointerdown, released on pointerup) rather than
 * window-level mousemove/mouseup listeners: 'pointerdown'/'pointermove'/'pointerup' already
 * unify mouse and touch input, and capturing the pointer to the container means dragging keeps
 * tracking correctly even if the cursor/finger leaves the container mid-drag — no separate touch
 * handlers, and no listener to leak if a drag ends off-element. */
export function useTimelineScrubber({
  containerRef,
  videoRef,
  duration,
  trimStart = 0,
  trimEnd = duration,
}: UseTimelineScrubberOptions): TimelineScrubber {
  // Guard against a caller passing a degenerate/not-yet-loaded range (trimEnd <= trimStart, or
  // either bound outside [0, duration]) — clamp them into a sane order once here so every
  // computation below can trust `lo <= hi` without re-checking it every time.
  const lo = Math.max(0, Math.min(trimStart, duration));
  const hi = Math.max(lo, Math.min(trimEnd, duration));

  const [playheadPos, setPlayheadPos] = useState(0);
  const [currentTime, setCurrentTime] = useState(lo);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  const clampToTrim = useCallback((time: number) => Math.max(lo, Math.min(hi, time)), [lo, hi]);

  const commitTime = useCallback(
    (nextTime: number) => {
      setCurrentTime(nextTime);
      setPlayheadPos(duration > 0 ? (nextTime / duration) * 100 : 0);
    },
    [duration],
  );

  const scrubToClientX = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container || duration <= 0) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) return;

      // Mapped against the *full* duration first — so the track's pixel-to-time ratio stays
      // constant no matter where the trim handles currently sit — then strictly clamped into the
      // trimmed window: a drag that overshoots past either trim handle (or either edge of the
      // container) just sticks to that handle instead of seeking outside it.
      const rawPercentage = (clientX - rect.left) / rect.width;
      const percentage = Math.min(1, Math.max(0, rawPercentage));
      const rawTime = percentage * duration;
      const nextTime = clampToTrim(rawTime);

      commitTime(nextTime);

      const video = videoRef.current;
      if (video) video.currentTime = nextTime;
    },
    [containerRef, videoRef, duration, clampToTrim, commitTime],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      isDraggingRef.current = true;
      setIsDragging(true);
      scrubToClientX(event.clientX);
    },
    [scrubToClientX],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      // Pointer capture already scopes move events to this element+pointerId, but the drag can
      // still be mid-flight from a previous gesture for a frame — isDragging is the source of
      // truth for whether this move should actually scrub.
      if (!isDragging) return;
      scrubToClientX(event.clientX);
    },
    [isDragging, scrubToClientX],
  );

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    isDraggingRef.current = false;
    setIsDragging(false);
  }, []);

  // Keeps native playback itself inside [lo, hi]: a `timeupdate` past the out point pauses and
  // snaps back to `trimStart` (matching a "play this trimmed section" tool rather than a loop),
  // and a `timeupdate` that somehow lands before the in point (a stray seek, or the browser
  // resuming slightly early after a seek to `lo`) snaps forward to it. Skipped while the user is
  // actively dragging — `scrubToClientX` above is already the source of truth for `currentTime`
  // during a drag, so this would otherwise fight it on every native `timeupdate` tick.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleTimeUpdate = () => {
      if (isDraggingRef.current) return;
      if (video.currentTime >= hi) {
        video.pause();
        video.currentTime = lo;
        commitTime(lo);
        return;
      }
      if (video.currentTime < lo) {
        video.currentTime = lo;
        return;
      }
      commitTime(video.currentTime);
    };
    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [videoRef, lo, hi, commitTime]);

  const play = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.currentTime < lo || video.currentTime >= hi) {
      video.currentTime = lo;
      commitTime(lo);
    }
    void video.play();
  }, [videoRef, lo, hi, commitTime]);

  return { currentTime, playheadPos, isDragging, onPointerDown, onPointerMove, onPointerUp, play };
}
