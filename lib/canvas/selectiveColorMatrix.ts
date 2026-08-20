import type { CurvePoint } from "@/types/creativeflow";

/**
 * Default (neutral) curve points — matches the SelectiveColorCurve SVG viewBox
 * (280x120). Deviation from these positions drives the color-matrix gains below.
 */
export const DEFAULT_CURVE_POINTS: CurvePoint[] = [
  { x: 20, y: 95 },
  { x: 100, y: 55 },
  { x: 180, y: 70 },
  { x: 260, y: 25 },
];

const VIEW_HEIGHT = 120;

/**
 * Approximates a "selective color" grade from the 4-point tone curve: each
 * point's vertical deviation from its neutral position becomes a per-channel
 * gain (shadows -> blue, low/high-mid -> green, highlights -> red). This is
 * a deliberate simplification of true per-hue-range selective color — it
 * still drives a real, visible, non-destructive ColorMatrix pass.
 */
export function curvePointsToColorMatrix(points: CurvePoint[]): number[] {
  const deviations = points.map((point, index) => {
    const neutral = DEFAULT_CURVE_POINTS[index]?.y ?? point.y;
    return (neutral - point.y) / (VIEW_HEIGHT / 2);
  });

  const shadowGain = 1 + (deviations[0] ?? 0) * 0.35;
  const lowMidGain = 1 + (deviations[1] ?? 0) * 0.35;
  const highMidGain = 1 + (deviations[2] ?? 0) * 0.35;
  const highlightGain = 1 + (deviations[3] ?? 0) * 0.35;

  const greenGain = (lowMidGain + highMidGain) / 2;

  return [
    highlightGain, 0, 0, 0, 0,
    0, greenGain, 0, 0, 0,
    0, 0, shadowGain, 0, 0,
    0, 0, 0, 1, 0,
  ];
}
