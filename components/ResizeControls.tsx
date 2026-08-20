"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { useTheme } from "@mui/material/styles";
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { Grid3x3, Sparkles, Wand2 } from "lucide-react";
import type { ResizeControlsProps, ResizeMode } from "@/types/editor";

const SCALE_PRESETS = [
  { label: "50%", scale: 0.5 },
  { label: "75%", scale: 0.75 },
  { label: "100%", scale: 1 },
];

const RATIO_PRESETS = [
  { label: "16:9", ratio: 16 / 9 },
  { label: "1:1", ratio: 1 },
  { label: "4:3", ratio: 4 / 3 },
];

/** Local width/height state seeds from `image` on mount only — render with `key={image.url}` so a newly loaded image remounts and reseeds it. */
export default function ResizeControls({
  image,
  onApplyResize,
  className,
}: ResizeControlsProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [width, setWidth] = useState(image.originalWidth);
  const [height, setHeight] = useState(image.originalHeight);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [mode, setMode] = useState<ResizeMode>("smooth");
  const [isApplying, setIsApplying] = useState(false);

  const aspectRatio = useMemo(
    () => image.originalWidth / image.originalHeight,
    [image.originalWidth, image.originalHeight],
  );

  const widthError = !Number.isFinite(width) || width <= 0;
  const heightError = !Number.isFinite(height) || height <= 0;

  const handleWidthChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setWidth(value);
    if (maintainAspectRatio && value > 0) {
      setHeight(Math.round(value / aspectRatio));
    }
  };

  const handleHeightChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setHeight(value);
    if (maintainAspectRatio && value > 0) {
      setWidth(Math.round(value * aspectRatio));
    }
  };

  const handleAspectRatioToggle = (event: ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setMaintainAspectRatio(checked);
    if (checked && Number.isFinite(width) && width > 0) {
      setHeight(Math.round(width / aspectRatio));
    }
  };

  const applyScalePreset = (scale: number) => {
    setWidth(Math.round(image.originalWidth * scale));
    setHeight(Math.round(image.originalHeight * scale));
  };

  const applyRatioPreset = (ratio: number) => {
    setWidth(image.originalWidth);
    setHeight(Math.round(image.originalWidth / ratio));
    setMaintainAspectRatio(false);
  };

  const canApply = !widthError && !heightError && !isApplying;

  const handleApply = async () => {
    if (!canApply) return;
    setIsApplying(true);
    try {
      await onApplyResize({ width, height, mode });
    } catch {
      // Failure is already surfaced via the shared image state's error — nothing further to do here.
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Card
      variant="outlined"
      className={className}
      sx={{
        p: 3,
        borderRadius: 3,
        backgroundColor: isDark ? "#1E293B" : "background.paper",
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
        Resize
      </Typography>

      <Stack direction="row" spacing={2}>
        <TextField
          label="Width"
          type="number"
          size="small"
          fullWidth
          value={Number.isFinite(width) ? width : ""}
          onChange={handleWidthChange}
          error={widthError}
          helperText={widthError ? "Must be greater than 0" : "px"}
          slotProps={{ htmlInput: { min: 1 } }}
        />
        <TextField
          label="Height"
          type="number"
          size="small"
          fullWidth
          value={Number.isFinite(height) ? height : ""}
          onChange={handleHeightChange}
          error={heightError}
          helperText={heightError ? "Must be greater than 0" : "px"}
          slotProps={{ htmlInput: { min: 1 } }}
        />
      </Stack>

      <FormControlLabel
        sx={{ mt: 0.5 }}
        control={
          <Switch
            checked={maintainAspectRatio}
            onChange={handleAspectRatioToggle}
            size="small"
          />
        }
        label={
          <Typography variant="body2" color="text.secondary">
            Maintain aspect ratio
          </Typography>
        }
      />

      <Divider sx={{ my: 2 }} />

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mb: 1 }}
      >
        Quick presets
      </Typography>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ flexWrap: "wrap", mb: 2 }}
      >
        {SCALE_PRESETS.map((preset) => (
          <Chip
            key={preset.label}
            label={preset.label}
            size="small"
            variant="outlined"
            clickable
            onClick={() => applyScalePreset(preset.scale)}
          />
        ))}
        {RATIO_PRESETS.map((preset) => (
          <Chip
            key={preset.label}
            label={preset.label}
            size="small"
            variant="outlined"
            clickable
            onClick={() => applyRatioPreset(preset.ratio)}
          />
        ))}
      </Stack>

      <Divider sx={{ mb: 2 }} />

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mb: 1 }}
      >
        Resize quality
      </Typography>
      <ToggleButtonGroup
        value={mode}
        exclusive
        size="small"
        fullWidth
        onChange={(_event, value: ResizeMode | null) => {
          if (value) setMode(value);
        }}
        sx={{ mb: 3 }}
      >
        <ToggleButton value="smooth">
          <Tooltip title="Bicubic-quality smoothing — best for photos">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Sparkles size={15} />
              <Typography variant="body2">Smooth</Typography>
            </Box>
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="pixelated">
          <Tooltip title="Nearest-neighbor — crisp edges for pixel art">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Grid3x3 size={15} />
              <Typography variant="body2">Pixelated</Typography>
            </Box>
          </Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>

      <Button
        variant="contained"
        color="primary"
        fullWidth
        size="large"
        startIcon={
          isApplying ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            <Wand2 size={18} />
          )
        }
        disabled={!canApply}
        onClick={() => {
          void handleApply();
        }}
      >
        {isApplying ? "Resizing…" : "Resize Image"}
      </Button>
    </Card>
  );
}
