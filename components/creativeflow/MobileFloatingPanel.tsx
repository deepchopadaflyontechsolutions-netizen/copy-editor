"use client";

import { Box, Chip, IconButton, Slider, Stack, Typography } from "@mui/material";
import { Check, ChevronDown, Minus, Plus } from "lucide-react";
import { useCreativeFlow } from "@/context/CreativeFlowContext";
import { useCanvasEngine } from "@/context/CanvasEngineContext";

export default function MobileFloatingPanel() {
  const { mobileSize, setMobileSize, brushSizeEnabled, toggleBrushSizeEnabled, aiSelectionMode, setAiSelectionMode } =
    useCreativeFlow();
  const { activeLayerId, activeFilterState, setExposure, setContrast, commitHistorySnapshot } = useCanvasEngine();
  const disabled = !activeLayerId;

  return (
    <Box
      sx={{
        mx: 1.5,
        mb: 1,
        p: 1.5,
        borderRadius: 3,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
      }}
    >
      <Stack spacing={0.5}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
          Size
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <IconButton size="small" onClick={() => setMobileSize(Math.max(0, mobileSize - 5))} aria-label="Decrease size">
            <Minus size={14} />
          </IconButton>
          <Slider
            size="small"
            value={mobileSize}
            min={0}
            max={100}
            onChange={(_, value) => setMobileSize(value as number)}
            aria-label="Size"
          />
          <IconButton size="small" onClick={() => setMobileSize(Math.min(100, mobileSize + 5))} aria-label="Increase size">
            <Plus size={14} />
          </IconButton>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1}>
        <Chip
          label="Brush size"
          size="small"
          icon={brushSizeEnabled ? <Check size={14} /> : undefined}
          color={brushSizeEnabled ? "primary" : "default"}
          onClick={toggleBrushSizeEnabled}
        />
        <Chip
          label={`AI selection: ${aiSelectionMode}`}
          size="small"
          icon={<ChevronDown size={14} />}
          onClick={() => setAiSelectionMode(aiSelectionMode === "Auto" ? "Manual" : "Auto")}
        />
      </Stack>

      <Stack direction="row" spacing={2}>
        <Stack spacing={0.5} sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Exposure
          </Typography>
          <Slider
            size="small"
            value={activeFilterState.exposure}
            min={0}
            max={100}
            disabled={disabled}
            onChange={(_, value) => setExposure(value as number)}
            onChangeCommitted={() => commitHistorySnapshot()}
            aria-label="Mobile exposure"
          />
        </Stack>
        <Stack spacing={0.5} sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Contrast
          </Typography>
          <Slider
            size="small"
            value={activeFilterState.contrast}
            min={0}
            max={100}
            disabled={disabled}
            onChange={(_, value) => setContrast(value as number)}
            onChangeCommitted={() => commitHistorySnapshot()}
            aria-label="Mobile contrast"
          />
        </Stack>
      </Stack>
    </Box>
  );
}
