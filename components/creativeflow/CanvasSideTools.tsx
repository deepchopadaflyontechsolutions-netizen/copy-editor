"use client";

import { Box, CircularProgress, IconButton, Slider, Tooltip } from "@mui/material";
import { MousePointer2, Paintbrush2, Lasso, Crop, Pipette, Sparkles, Eraser } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import type { DrawingTool } from "@/types/canvasEngine";

const TOOLS: { key: DrawingTool; label: string; Icon: typeof MousePointer2 }[] = [
  { key: "selection", label: "Selection", Icon: MousePointer2 },
  { key: "brush", label: "Brush", Icon: Paintbrush2 },
  { key: "lasso", label: "Lasso", Icon: Lasso },
];

export default function CanvasSideTools() {
  const {
    drawingTool,
    setDrawingTool,
    brushWidth,
    setBrushWidth,
    brushColor,
    setBrushColor,
    hasImage,
    cropMode,
    enterCropMode,
    startAutoClean,
    isAutoCleaning,
    autoCleanPreview,
    autoCleanMessage,
    healMode,
    enterHealMode,
  } = useCanvasEngine();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
        p: 1,
        borderRadius: 2,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      {TOOLS.map(({ key, label, Icon }) => (
        <Tooltip key={key} title={label} placement="right">
          <IconButton
            aria-label={label}
            onClick={() => setDrawingTool(key)}
            sx={{
              color: drawingTool === key ? "primary.main" : "text.secondary",
              bgcolor: drawingTool === key ? "action.selected" : "transparent",
            }}
          >
            <Icon size={18} />
          </IconButton>
        </Tooltip>
      ))}

      <Tooltip title="Crop" placement="right">
        <span>
          <IconButton
            aria-label="Crop"
            disabled={!hasImage}
            onClick={enterCropMode}
            sx={{
              color: cropMode ? "primary.main" : "text.secondary",
              bgcolor: cropMode ? "action.selected" : "transparent",
            }}
          >
            <Crop size={18} />
          </IconButton>
        </span>
      </Tooltip>

      <Box sx={{ position: "relative" }}>
        <Tooltip
          title={autoCleanMessage ? "" : isAutoCleaning ? "Cleaning…" : autoCleanPreview ? "Reviewing detected mark…" : "Auto Clean"}
          placement="right"
        >
          <span>
            <IconButton
              aria-label="Auto Clean"
              disabled={!hasImage || isAutoCleaning || autoCleanPreview}
              onClick={startAutoClean}
              sx={{
                color: autoCleanPreview ? "primary.main" : "text.secondary",
                bgcolor: autoCleanPreview ? "action.selected" : "transparent",
              }}
            >
              {isAutoCleaning ? <CircularProgress size={18} /> : <Sparkles size={18} />}
            </IconButton>
          </span>
        </Tooltip>

        {autoCleanMessage && (
          <Box
            role="status"
            sx={{
              position: "absolute",
              left: "100%",
              top: "50%",
              transform: "translateY(-50%)",
              ml: 1,
              px: 1.25,
              py: 0.5,
              borderRadius: 1,
              bgcolor: "rgba(11, 18, 32, 0.92)",
              border: "1px solid",
              borderColor: "divider",
              whiteSpace: "nowrap",
              zIndex: 10,
              fontSize: 12,
              fontWeight: 600,
              color: "#F8FAFC",
              pointerEvents: "none",
            }}
          >
            {autoCleanMessage}
          </Box>
        )}
      </Box>

      <Tooltip title={healMode ? "Painting mask…" : "Heal Brush — paint over anything to remove"} placement="right">
        <span>
          <IconButton
            aria-label="Heal Brush"
            disabled={!hasImage || healMode}
            onClick={enterHealMode}
            sx={{
              color: healMode ? "primary.main" : "text.secondary",
              bgcolor: healMode ? "action.selected" : "transparent",
            }}
          >
            <Eraser size={18} />
          </IconButton>
        </span>
      </Tooltip>

      <Box sx={{ height: 72, display: "flex", justifyContent: "center", py: 1 }}>
        <Slider
          orientation="vertical"
          size="small"
          value={brushWidth}
          min={1}
          max={60}
          onChange={(_, value) => setBrushWidth(value as number)}
          aria-label="Brush width"
        />
      </Box>

      <Tooltip title="Color picker" placement="right">
        <IconButton component="label" sx={{ color: "text.secondary" }}>
          <Pipette size={18} style={{ color: brushColor }} />
          <input
            type="color"
            value={brushColor}
            onChange={(event) => setBrushColor(event.target.value)}
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              opacity: 0,
              pointerEvents: "none",
            }}
          />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
