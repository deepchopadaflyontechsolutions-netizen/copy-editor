"use client";

interface TimelinePlayheadProps {
  /** 0-100 — see useTimelineScrubber's `playheadPos`. */
  playheadPos: number;
}

/** Absolutely positioned needle for a scrubbable timeline track (pair with
 * useTimelineScrubber). Split into two layers on purpose:
 *  - the vertical line spans the full track height but is `pointer-events: none`, so it can
 *    never itself capture a pointer;
 *  - the small circular handle is the only part with `pointer-events: auto`.
 * Without that split, a fast drag has the cursor crossing back and forth over the (otherwise
 * hit-testable) line on every frame, which reads as jittery, stuttering movement instead of one
 * smooth drag — pointer capture on the track container handles the actual dragging, this
 * separation just keeps the visual playhead itself out of the way of that.
 */
export default function TimelinePlayhead({ playheadPos }: TimelinePlayheadProps) {
  const clamped = Math.min(100, Math.max(0, playheadPos));

  return (
    <div aria-hidden className="pointer-events-none absolute inset-y-0 z-40" style={{ left: `${clamped}%` }}>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-0.5 -translate-x-1/2 bg-[#f43f5e] shadow-[0_0_8px_rgba(244,63,94,0.7)]" />
      <div
        role="slider"
        aria-label="Playhead"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
        className="pointer-events-auto absolute -top-1 left-0 h-2.5 w-2.5 -translate-x-1/2 cursor-ew-resize rounded-full bg-[#f43f5e] shadow-[0_0_0_2px_rgba(0,0,0,0.5)]"
      />
    </div>
  );
}
