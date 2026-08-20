"use client";

import { useCallback, useRef, useState } from "react";
import { Box } from "@mui/material";
import { useCanvasEngine } from "@/context/CanvasEngineContext";

const VIEW_WIDTH = 280;
const VIEW_HEIGHT = 120;
const POINT_RADIUS = 5;

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    d += ` Q ${current.x} ${current.y} ${midX} ${(current.y + next.y) / 2}`;
  }
  d += ` T ${points[points.length - 1].x} ${points[points.length - 1].y}`;
  return d;
}

export default function SelectiveColorCurve() {
  const { activeFilterState, activeLayerId, setCurvePoint, commitHistorySnapshot } = useCanvasEngine();
  const curvePoints = activeFilterState.curvePoints;
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const clientToPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * VIEW_WIDTH;
    const y = ((clientY - rect.top) / rect.height) * VIEW_HEIGHT;
    return {
      x: Math.min(VIEW_WIDTH, Math.max(0, x)),
      y: Math.min(VIEW_HEIGHT, Math.max(0, y)),
    };
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (draggingIndex === null) return;
      const point = clientToPoint(event.clientX, event.clientY);
      if (point) setCurvePoint(draggingIndex, point);
    },
    [draggingIndex, clientToPoint, setCurvePoint],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      event.currentTarget.releasePointerCapture(event.pointerId);
      if (draggingIndex !== null) commitHistorySnapshot();
      setDraggingIndex(null);
    },
    [draggingIndex, commitHistorySnapshot],
  );

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1.5,
        p: 1,
        bgcolor: "background.default",
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="w-full"
        style={{
          height: 120,
          touchAction: "none",
          opacity: activeLayerId ? 1 : 0.4,
          pointerEvents: activeLayerId ? "auto" : "none",
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <rect x={0} y={0} width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="none" />
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={0}
            x2={VIEW_WIDTH}
            y1={VIEW_HEIGHT * f}
            y2={VIEW_HEIGHT * f}
            stroke="currentColor"
            strokeOpacity={0.08}
          />
        ))}
        <path d={buildSmoothPath(curvePoints)} fill="none" stroke="#007BFF" strokeWidth={2} />
        {curvePoints.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={POINT_RADIUS}
            fill="#007BFF"
            stroke="#F8FAFC"
            strokeWidth={1.5}
            style={{ cursor: "grab" }}
            onPointerDown={(event) => {
              event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
              setDraggingIndex(index);
            }}
          />
        ))}
      </svg>
    </Box>
  );
}
