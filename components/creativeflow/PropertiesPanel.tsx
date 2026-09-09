"use client";

import { Box, MenuItem, Select, Slider, Stack, Typography } from "@mui/material";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import type { BlendModeKey } from "@/types/canvasEngine";
import SelectiveColorCurve from "./SelectiveColorCurve";

const BLEND_MODES: BlendModeKey[] = ["Normal", "Multiply", "Screen", "Overlay"];

export default function PropertiesPanel() {
  const { activeLayerId, activeFilterState, setExposure, setContrast, setBlendMode, commitHistorySnapshot } =
    useCanvasEngine();
  const disabled = !activeLayerId;

  return (
    <Box sx={{ px: 2, py: 1.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        Properties
      </Typography>

      <Stack spacing={0.5}>
        <Typography variant="caption" color="text.secondary">
          Mode
        </Typography>
        <Select
          size="small"
          value={activeFilterState.blendMode}
          disabled={disabled}
          onChange={(event) => setBlendMode(event.target.value as BlendModeKey)}
          aria-label="Blend mode"
        >
          {BLEND_MODES.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </Select>
      </Stack>

      <Stack spacing={0.5}>
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
          aria-label="Exposure"
          valueLabelDisplay="auto"
        />
      </Stack>

      <Stack spacing={0.5}>
        <Typography variant="caption" color="text.secondary">
          Hardness
        </Typography>
        <Slider
          size="small"
          value={activeFilterState.contrast}
          min={0}
          max={100}
          disabled={disabled}
          onChange={(_, value) => setContrast(value as number)}
          onChangeCommitted={() => commitHistorySnapshot()}
          aria-label="Hardness"
          valueLabelDisplay="auto"
        />
      </Stack>

      <Stack spacing={0.5}>
        <Typography variant="caption" color="text.secondary">
          Selective color
        </Typography>
        <SelectiveColorCurve />
      </Stack>
    </Box>
  );
}
