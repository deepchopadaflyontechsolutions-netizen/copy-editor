"use client";

import { RotateCcw } from "lucide-react";

/**
 * Stacked "Label · value" header over a thin white-fill progress track.
 * The native range input sits transparently on top of the fill so the row
 * stays fully draggable/keyboard-accessible — only its thumb is visible, as
 * a small glowing dot. Numeric feedback uses a mono font for precise
 * readability, and an optional `defaultValue` surfaces a reset button once
 * the slider has actually been moved away from it.
 */
export default function LabeledSlider({
  label,
  value,
  min = 0,
  max = 100,
  disabled = false,
  suffix = "%",
  defaultValue,
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  suffix?: string;
  defaultValue?: number;
  onChange: (value: number) => void;
  onCommit?: () => void;
}) {
  const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
  const canReset =
    defaultValue !== undefined &&
    !disabled &&
    Math.round(value) !== Math.round(defaultValue);

  const handleReset = () => {
    if (defaultValue === undefined) return;
    onChange(defaultValue);
    onCommit?.();
  };

  return (
    <div className={`flex flex-col gap-1.5 ${disabled ? "opacity-40" : ""}`}>
      <div className="flex items-center justify-between text-[11px] text-neutral-400">
        <span>{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="tabular-nums text-neutral-300">
            {Math.round(value)}
            {suffix}
          </span>
          {defaultValue !== undefined && (
            <button
              type="button"
              onClick={handleReset}
              disabled={!canReset}
              aria-label={`Reset ${label} to default`}
              className={`flex h-4 w-4 items-center justify-center rounded transition-colors ${
                canReset
                  ? "cursor-pointer text-neutral-400 hover:text-white focus-visible:text-white"
                  : "cursor-not-allowed text-neutral-700"
              }`}
            >
              <RotateCcw size={11} />
            </button>
          )}
        </div>
      </div>
      <div className="relative flex h-4 items-center">
        <div className="h-1 w-full rounded-full bg-neutral-700">
          <div className="h-1 rounded-full bg-white" style={{ width: `${percent}%` }} />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          onMouseUp={onCommit}
          onTouchEnd={onCommit}
          onKeyUp={onCommit}
          aria-label={label}
          className="absolute inset-0 h-4 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-none disabled:cursor-not-allowed [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.3)] [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.3)]"
        />
      </div>
    </div>
  );
}
