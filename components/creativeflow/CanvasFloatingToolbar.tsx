"use client";

import { Box, Divider, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { Grid3x3, Maximize, Redo2, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";

export default function CanvasFloatingToolbar() {
  const { zoom, zoomIn, zoomOut, resetView, centerCanvas, undo, redo, canUndo, canRedo, showGrid, toggleGrid } =
    useCanvasEngine();

  return (
    <Box
      sx={{
        position: "absolute",
        left: "50%",
        top: 16,
        transform: "translateX(-50%)",
        zIndex: 2,
      }}
    >
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          alignItems: "center",
          px: 1,
          py: 0.5,
          borderRadius: 2,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
        }}
      >
        <Tooltip title="Undo">
          <span>
            <IconButton size="small" aria-label="Undo" onClick={undo} disabled={!canUndo}>
              <Undo2 size={16} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Redo">
          <span>
            <IconButton size="small" aria-label="Redo" onClick={redo} disabled={!canRedo}>
              <Redo2 size={16} />
            </IconButton>
          </span>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        <Tooltip title="Zoom out">
          <IconButton size="small" aria-label="Zoom out" onClick={zoomOut}>
            <ZoomOut size={16} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Reset zoom to 100%">
          <Typography
            component="button"
            onClick={resetView}
            variant="caption"
            sx={{
              minWidth: 44,
              textAlign: "center",
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              color: "text.secondary",
              bgcolor: "transparent",
              border: "none",
              cursor: "pointer",
              "&:hover": { color: "text.primary" },
            }}
          >
            {Math.round(zoom * 100)}%
          </Typography>
        </Tooltip>
        <Tooltip title="Zoom in">
          <IconButton size="small" aria-label="Zoom in" onClick={zoomIn}>
            <ZoomIn size={16} />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        <Tooltip title="Center canvas">
          <IconButton size="small" aria-label="Center canvas" onClick={centerCanvas}>
            <Maximize size={16} />
          </IconButton>
        </Tooltip>
        <Tooltip title={showGrid ? "Hide grid" : "Show grid"}>
          <IconButton
            size="small"
            aria-label="Toggle composition grid"
            aria-pressed={showGrid}
            onClick={toggleGrid}
            sx={{ color: showGrid ? "primary.main" : "text.secondary" }}
          >
            <Grid3x3 size={16} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}
