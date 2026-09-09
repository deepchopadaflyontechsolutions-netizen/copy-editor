"use client";

/**
 * Bipolar (-100..100, 0 = neutral) slider row used by AdjustPanel's Color/Light
 * sections — label + value above a full-width track with a round thumb marking
 * the current position. Unlike LabeledSlider's fill-bar, the track here is
 * always fully painted (flat for neutral controls, a gradient for color ones)
 * since there's no "amount filled" concept for a control centered on zero.
 */
export default function AdjustSlider({
  label,
  value,
  disabled = false,
  trackGradient,
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  /** CSS `background` for the track — omit for the plain neutral (Light-section) look. */
  trackGradient?: string;
  onChange: (value: number) => void;
  onCommit?: () => void;
}) {
  const min = -100;
  const max = 100;
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className={`flex flex-col gap-1.5 ${disabled ? "opacity-40" : ""}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-neutral-200">{label}</span>
        <span className="tabular-nums text-neutral-300">{Math.round(value)}</span>
      </div>
      <div className="relative flex h-4 items-center">
        <div
          className="h-1.5 w-full rounded-full"
          style={{ background: trackGradient ?? "#404040" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white bg-neutral-200 shadow-[0_1px_3px_rgba(0,0,0,0.6)]"
          style={{ left: `${percent}%` }}
        />
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
          className="absolute inset-0 h-4 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-none disabled:cursor-not-allowed [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:opacity-0 [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:opacity-0"
        />
      </div>
    </div>
  );
}
