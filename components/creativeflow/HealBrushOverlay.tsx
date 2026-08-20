"use client";

import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { Check, X } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";

// Floating confirm/cancel bar shown while the user is painting a manual
// heal-brush mask (the strokes themselves are real Fabric paths added
// directly to the canvas by CanvasEngineContext, styled as a translucent
// highlight) — same bottom-center slot AutoCleanOverlay/CropOverlay use,
// since only one of the three modes is ever active at once.
export default function HealBrushOverlay() {
  const { cancelHealMode, applyHealMode, isAutoCleaning, hasHealStrokes } = useCanvasEngine();

  return (
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
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "center",
          px: 2,
          py: 1.5,
          borderRadius: 2,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
        }}
      >
        <Typography variant="body2" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
          {hasHealStrokes ? "Ready to remove painted area" : "Paint over the area to remove"}
        </Typography>

        <Button size="small" variant="text" startIcon={<X size={14} />} onClick={cancelHealMode} disabled={isAutoCleaning}>
          Cancel
        </Button>
        <Button
          size="small"
          variant="contained"
          startIcon={isAutoCleaning ? <CircularProgress size={14} color="inherit" /> : <Check size={14} />}
          onClick={() => void applyHealMode()}
          disabled={isAutoCleaning || !hasHealStrokes}
        >
          {isAutoCleaning ? "Cleaning…" : "Apply"}
        </Button>
      </Stack>
    </Box>
  );
}
