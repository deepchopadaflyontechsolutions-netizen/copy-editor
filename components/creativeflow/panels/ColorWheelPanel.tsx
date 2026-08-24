"use client";

import { useCallback, useRef, useState } from "react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import PanelSection from "./PanelSection";

export const SWATCHES = [
  "#F8FAFC",
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#22C55E",
  "#06B6D4",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#0F172A",
];

// Minimal HSL -> hex conversion (h in degrees, s/l in 0-1) — the wheel below
// only ever needs to go one direction (pointer position -> color), so this
// is the only conversion this panel requires.
function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const value = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * value)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

// The color it maps to (hue by angle, saturation by radius, fixed 50%
// lightness) — used for the marker/draw tool's paint color, the only real
// color concept this editor currently has.
export default function ColorWheelPanel() {
  const { brushColor, setBrushColor } = useCanvasEngine();
  const wheelRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const pickFromPoint = useCallback(
    (clientX: number, clientY: number) => {
      const el = wheelRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const radius = rect.width / 2;
      const distance = Math.min(1, Math.sqrt(dx * dx + dy * dy) / radius);
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angle < 0) angle += 360;
      setBrushColor(hslToHex(angle, distance, 0.5));
    },
    [setBrushColor],
  );

  return (
    <PanelSection title="Color Change">
      <div className="flex items-center gap-4">
        <div
          ref={wheelRef}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
            pickFromPoint(event.clientX, event.clientY);
          }}
          onPointerMove={(event) => dragging && pickFromPoint(event.clientX, event.clientY)}
          onPointerUp={() => setDragging(false)}
          aria-label={`Marker color wheel, current color ${brushColor}`}
          tabIndex={0}
          className="h-20 w-20 shrink-0 cursor-crosshair touch-none rounded-full ring-2 ring-slate-800"
          style={{
            background:
              "radial-gradient(circle, #fff 0%, rgba(255,255,255,0) 70%), conic-gradient(from 90deg, red, yellow, lime, cyan, blue, magenta, red)",
          }}
        />

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span
              className="h-6 w-6 rounded-full border-2 border-white/20"
              style={{ backgroundColor: brushColor }}
              aria-hidden
            />
            <span className="font-mono text-xs text-slate-400">{brushColor.toUpperCase()}</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {SWATCHES.map((hex) => (
              <button
                key={hex}
                type="button"
                aria-label={`Set marker color ${hex}`}
                aria-pressed={brushColor.toLowerCase() === hex.toLowerCase()}
                onClick={() => setBrushColor(hex)}
                className={`h-5 w-5 rounded-full border transition-transform hover:scale-110 ${
                  brushColor.toLowerCase() === hex.toLowerCase()
                    ? "border-indigo-400 ring-2 ring-indigo-500/50"
                    : "border-white/20"
                }`}
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>
      </div>
      <p className="mt-2.5 text-[11px] leading-snug text-slate-500">
        Sets the color for the Marker (brush) tool below.
      </p>
    </PanelSection>
  );
}
