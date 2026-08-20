"use client";

import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Image from "next/image";
import { ChevronsLeftRight, FileImage } from "lucide-react";

const STEP = 4;

export default function MediaCompareSlider({
  beforeSrc,
  afterSrc,
  beforeAlt,
  afterAlt,
  fileLabel,
  aspectClassName = "aspect-[4/3]",
  checkerboardAfter = false,
  accent = "cyan",
}: {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
  fileLabel: string;
  aspectClassName?: string;
  checkerboardAfter?: boolean;
  accent?: "cyan" | "purple";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [percent, setPercent] = useState(50);

  const updateFromClientX = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPercent(Math.min(100, Math.max(0, next)));
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      isDraggingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      updateFromClientX(event.clientX);
    },
    [updateFromClientX],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;
      updateFromClientX(event.clientX);
    },
    [updateFromClientX],
  );

  const stopDragging = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleKeyDown = useCallback((event: ReactKeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setPercent((value) => Math.max(0, value - STEP));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setPercent((value) => Math.min(100, value + STEP));
    } else if (event.key === "Home") {
      event.preventDefault();
      setPercent(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setPercent(100);
    }
  }, []);

  const accentClasses =
    accent === "purple"
      ? {
          badge: "border-purple-400/50 bg-slate-950/80 text-purple-300 shadow-[0_0_16px_rgba(168,85,247,0.35)]",
          handle: "bg-purple-500 shadow-[0_0_24px_rgba(168,85,247,0.65)]",
          glow: "shadow-[0_0_50px_rgba(168,85,247,0.12)]",
        }
      : {
          badge: "border-cyan-400/50 bg-slate-950/80 text-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.35)]",
          handle: "bg-cyan-500 shadow-[0_0_24px_rgba(34,211,238,0.65)]",
          glow: "shadow-[0_0_50px_rgba(34,211,238,0.12)]",
        };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[#0B1320] ${accentClasses.glow}`}
    >
      {/* Titlebar */}
      <div className="flex h-10 shrink-0 items-center gap-3 border-b border-white/10 bg-[#0F172A]/90 px-4 font-mono text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-500/80" />
          <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
          <span className="h-3 w-3 rounded-full bg-green-500/80" />
        </div>
        <div className="flex min-w-0 items-center gap-1.5 text-slate-400">
          <FileImage size={12} className="shrink-0 text-slate-500" />
          <span className="truncate">{fileLabel}</span>
        </div>
      </div>

      {/* Interactive canvas */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onPointerLeave={stopDragging}
        className={`relative w-full touch-none select-none overflow-hidden bg-[#0F172A] ${aspectClassName}`}
      >
        {checkerboardAfter && (
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(45deg,#cbd5e1_25%,transparent_25%),linear-gradient(-45deg,#cbd5e1_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#cbd5e1_75%),linear-gradient(-45deg,transparent_75%,#cbd5e1_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px] bg-white"
          />
        )}

        {/* After — full layer underneath */}
        <Image
          src={afterSrc}
          alt={afterAlt}
          fill
          sizes="(min-width: 1024px) 560px, 100vw"
          className="pointer-events-none object-cover"
          priority
        />

        {/* Before — clipped to the slider position */}
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - percent}% 0 0)` }}>
          <Image
            src={beforeSrc}
            alt={beforeAlt}
            fill
            sizes="(min-width: 1024px) 560px, 100vw"
            className="pointer-events-none object-cover"
            priority
          />
        </div>

        <span className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
          Before
        </span>
        <span
          className={`pointer-events-none absolute right-3 top-3 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-md ${accentClasses.badge}`}
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
          className={`absolute top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border border-white/20 text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${accentClasses.handle}`}
          style={{ left: `${percent}%` }}
        >
          <ChevronsLeftRight size={18} />
        </div>
      </div>
    </div>
  );
}
