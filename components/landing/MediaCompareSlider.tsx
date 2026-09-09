"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Image from "next/image";
import { animate, useInView, type AnimationPlaybackControlsWithThen } from "framer-motion";
import { ChevronsLeftRight } from "lucide-react";

const STEP = 4;
/** Percent range (from each edge) within which a Before/After label starts fading as the handle nears it. */
const LABEL_FADE_ZONE = 18;
const LABEL_MIN_OPACITY = 0;
/** Handle path for the one-shot auto-preview sweep: center -> near-before -> near-after -> center. */
const SWEEP_KEYFRAMES = [50, 15, 85, 50];
const SWEEP_DURATION = 2.5;

export default function MediaCompareSlider({
  beforeSrc,
  afterSrc,
  beforeAlt,
  afterAlt,
  aspectClassName = "aspect-[4/3]",
  checkerboardAfter = false,
  mediaKind = "image",
}: {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
  aspectClassName?: string;
  checkerboardAfter?: boolean;
  mediaKind?: "image" | "video";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const isHoveringRef = useRef(false);
  const sweepControlsRef = useRef<AnimationPlaybackControlsWithThen | null>(null);
  const [percent, setPercent] = useState(50);

  const isInView = useInView(containerRef, { once: true, amount: 0.4 });

  const stopSweep = useCallback(() => {
    sweepControlsRef.current?.stop();
    sweepControlsRef.current = null;
  }, []);

  // Auto-preview sweep: once the card first scrolls into view, demo the
  // slider on its own — unless the user is already interacting with it.
  useEffect(() => {
    if (!isInView || isHoveringRef.current) return;
    sweepControlsRef.current = animate(SWEEP_KEYFRAMES[0], SWEEP_KEYFRAMES, {
      duration: SWEEP_DURATION,
      ease: "easeInOut",
      onUpdate: (latest) => setPercent(latest),
    });
    return () => sweepControlsRef.current?.stop();
  }, [isInView]);

  const updateFromClientX = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPercent(Math.min(100, Math.max(0, next)));
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      stopSweep();
      isDraggingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      updateFromClientX(event.clientX);
    },
    [stopSweep, updateFromClientX],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      // Mouse: scrub on hover, no click needed. Touch/pen: only while dragging.
      if (!isDraggingRef.current && event.pointerType !== "mouse") return;
      updateFromClientX(event.clientX);
    },
    [updateFromClientX],
  );

  const stopDragging = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleMouseEnter = useCallback(() => {
    isHoveringRef.current = true;
    stopSweep();
  }, [stopSweep]);

  const handleMouseLeave = useCallback(() => {
    isHoveringRef.current = false;
  }, []);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        stopSweep();
        setPercent((value) => Math.max(0, value - STEP));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        stopSweep();
        setPercent((value) => Math.min(100, value + STEP));
      } else if (event.key === "Home") {
        event.preventDefault();
        stopSweep();
        setPercent(0);
      } else if (event.key === "End") {
        event.preventDefault();
        stopSweep();
        setPercent(100);
      }
    },
    [stopSweep],
  );

  // Brand gradient (matches the logo mark and hero headline) — same on every slider, everywhere.
  const accentClasses = {
    badge: "border-[#0066FF]/50 bg-slate-950/80 text-[#5ec8ff] shadow-[0_0_16px_rgba(0,102,255,0.35)]",
    handle: "bg-gradient-to-br from-[#0066FF] to-[#06B6D4] shadow-[0_0_24px_rgba(0,102,255,0.6)]",
    glow: "shadow-[0_0_50px_rgba(0,102,255,0.12)]",
  };

  // Fade each label out as the handle sweeps close enough to overlap it.
  const beforeLabelOpacity =
    percent <= LABEL_FADE_ZONE
      ? Math.max(LABEL_MIN_OPACITY, percent / LABEL_FADE_ZONE)
      : 1;
  const afterLabelOpacity =
    percent >= 100 - LABEL_FADE_ZONE
      ? Math.max(LABEL_MIN_OPACITY, (100 - percent) / LABEL_FADE_ZONE)
      : 1;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 border-white/10 bg-[#0B1320] ${accentClasses.glow}`}
    >
      {/* Interactive canvas */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onPointerLeave={stopDragging}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`relative w-full cursor-ew-resize touch-none select-none overflow-hidden bg-[#0F172A] ${aspectClassName}`}
      >
        {checkerboardAfter && (
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(45deg,#cbd5e1_25%,transparent_25%),linear-gradient(-45deg,#cbd5e1_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#cbd5e1_75%),linear-gradient(-45deg,transparent_75%,#cbd5e1_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px] bg-white"
          />
        )}

        {/* After — full layer underneath */}
        {mediaKind === "video" ? (
          <video
            src={afterSrc}
            aria-label={afterAlt}
            autoPlay
            muted
            loop
            playsInline
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <Image
            src={afterSrc}
            alt={afterAlt}
            fill
            sizes="(min-width: 1024px) 560px, 100vw"
            className="pointer-events-none object-cover"
            priority
          />
        )}

        {/* Before — clipped to the slider position */}
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - percent}% 0 0)` }}>
          {mediaKind === "video" ? (
            <video
              src={beforeSrc}
              aria-label={beforeAlt}
              autoPlay
              muted
              loop
              playsInline
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <Image
              src={beforeSrc}
              alt={beforeAlt}
              fill
              sizes="(min-width: 1024px) 560px, 100vw"
              className="pointer-events-none object-cover"
              priority
            />
          )}
        </div>

        <span
          className="pointer-events-none absolute left-3 top-3 rounded-full border-2 border-white/10 bg-black/50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.4)] transition-opacity duration-150"
          style={{ opacity: beforeLabelOpacity }}
        >
          Before
        </span>
        <span
          className={`pointer-events-none absolute right-3 top-3 rounded-full border-2 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-md transition-opacity duration-150 ${accentClasses.badge}`}
          style={{ opacity: afterLabelOpacity }}
        >
          After
        </span>

        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/80 shadow-[0_0_12px_rgba(255,255,255,0.6)]"
          style={{ left: `${percent}%` }}
        />

        <div
          role="slider"
          aria-label={`Comparison slider — ${beforeAlt} versus ${afterAlt}`}
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          className={`absolute top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border-2 border-white/20 text-white outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${accentClasses.handle}`}
          style={{ left: `${percent}%` }}
        >
          <ChevronsLeftRight size={26} strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}
