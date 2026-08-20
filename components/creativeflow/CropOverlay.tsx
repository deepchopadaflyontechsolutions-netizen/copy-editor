"use client";

import { useState, type ChangeEvent } from "react";
import { Box, Button, Divider, IconButton, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material";
import { Check, Lock, Unlock, X } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import { CROP_PRESETS } from "@/hooks/useCanvasCrop";

function DimensionBadge() {
  const { cropBadgeRect, cropPixelSize } = useCanvasEngine();
  if (!cropBadgeRect || cropPixelSize.width <= 0 || cropPixelSize.height <= 0) return null;

  const top = Math.max(8, cropBadgeRect.top - 30);

  return (
    <Box
      sx={{
        position: "absolute",
        left: cropBadgeRect.left,
        top,
        zIndex: 3,
        px: 1,
        py: 0.375,
        borderRadius: 1,
        bgcolor: "rgba(11, 18, 32, 0.85)",
        border: "1px solid",
        borderColor: "#38BDF8",
        pointerEvents: "none",
        whiteSpace: "nowrap",
      }}
    >
      <Typography variant="caption" sx={{ color: "#F8FAFC", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        {cropPixelSize.width} × {cropPixelSize.height} px
      </Typography>
    </Box>
  );
}

// Width/height fields show the live cropPixelSize from the engine, except
// while a field is being actively typed into — then a local "draft" string
// takes over so a mid-drag value update from the engine can't fight the
// caret. `null` means "not editing," so the field falls back to displaying
// the live value with no separate sync effect needed.
function DimensionFields() {
  const { cropPixelSize, setCropWidthPx, setCropHeightPx } = useCanvasEngine();
  const [widthDraft, setWidthDraft] = useState<string | null>(null);
  const [heightDraft, setHeightDraft] = useState<string | null>(null);

  const commitWidth = () => {
    const value = Number(widthDraft);
    if (widthDraft !== null && Number.isFinite(value) && value > 0) setCropWidthPx(value);
    setWidthDraft(null);
  };

  const commitHeight = () => {
    const value = Number(heightDraft);
    if (heightDraft !== null && Number.isFinite(value) && value > 0) setCropHeightPx(value);
    setHeightDraft(null);
  };

  return (
    <>
      <TextField
        size="small"
        label="Width"
        value={widthDraft ?? String(cropPixelSize.width)}
        onFocus={() => setWidthDraft(String(cropPixelSize.width))}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setWidthDraft(event.target.value)}
        onBlur={commitWidth}
        onKeyDown={(event) => event.key === "Enter" && commitWidth()}
        sx={{ width: 88 }}
        slotProps={{ htmlInput: { inputMode: "numeric" } }}
        aria-label="Crop width in pixels"
      />
      <Typography variant="caption" color="text.secondary">
        ×
      </Typography>
      <TextField
        size="small"
        label="Height"
        value={heightDraft ?? String(cropPixelSize.height)}
        onFocus={() => setHeightDraft(String(cropPixelSize.height))}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setHeightDraft(event.target.value)}
        onBlur={commitHeight}
        onKeyDown={(event) => event.key === "Enter" && commitHeight()}
        sx={{ width: 88 }}
        slotProps={{ htmlInput: { inputMode: "numeric" } }}
        aria-label="Crop height in pixels"
      />
    </>
  );
}

export default function CropOverlay() {
  const { applyCrop, cancelCropMode, cropPreset, applyCropPreset, cropAspectLocked, setCropAspectLocked } =
    useCanvasEngine();

  return (
    <>
      <DimensionBadge />
      <Box
        sx={{
          position: "absolute",
          left: "50%",
          bottom: 16,
          transform: "translateX(-50%)",
          zIndex: 2,
        }}
      >
        <Stack
          spacing={1.25}
          sx={{
            px: 2,
            py: 1.5,
            borderRadius: 2,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
          }}
        >
          <ToggleButtonGroup
            size="small"
            exclusive
            value={cropPreset}
            onChange={(_, value: (typeof CROP_PRESETS)[number]["key"] | null) => value && applyCropPreset(value)}
            aria-label="Crop aspect ratio preset"
          >
            {CROP_PRESETS.map(({ key, label }) => (
              <ToggleButton key={key} value={key} sx={{ px: 1.25, whiteSpace: "nowrap" }}>
                {label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <DimensionFields />
            <Tooltip title={cropAspectLocked ? "Unlock aspect ratio" : "Lock aspect ratio"}>
              <IconButton
                size="small"
                onClick={() => setCropAspectLocked(!cropAspectLocked)}
                aria-label="Toggle aspect ratio lock"
                aria-pressed={cropAspectLocked}
                sx={{ color: cropAspectLocked ? "primary.main" : "text.secondary" }}
              >
                {cropAspectLocked ? <Lock size={16} /> : <Unlock size={16} />}
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem />

            <Button size="small" variant="text" startIcon={<X size={14} />} onClick={cancelCropMode}>
              Cancel
            </Button>
            <Button size="small" variant="contained" startIcon={<Check size={14} />} onClick={applyCrop}>
              Apply
            </Button>
          </Stack>
        </Stack>
      </Box>
    </>
  );
}
