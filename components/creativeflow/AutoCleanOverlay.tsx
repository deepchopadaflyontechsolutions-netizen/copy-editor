"use client";

import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { Check, X } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";

// Floating confirm/cancel bar shown while a detected mark is being
// previewed (the dashed ellipse itself is a real Fabric object added
// directly to the canvas by CanvasEngineContext, so it pans/zooms for
// free) — same bottom-center slot CropOverlay uses, since the two modes
// are mutually exclusive.
export default function AutoCleanOverlay() {
  const { cancelAutoClean, applyAutoClean, isAutoCleaning } = useCanvasEngine();

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
          Mark detected — remove it?
        </Typography>

        <Button size="small" variant="text" startIcon={<X size={14} />} onClick={cancelAutoClean} disabled={isAutoCleaning}>
          Cancel
        </Button>
        <Button
          size="small"
          variant="contained"
          startIcon={isAutoCleaning ? <CircularProgress size={14} color="inherit" /> : <Check size={14} />}
          onClick={() => void applyAutoClean()}
          disabled={isAutoCleaning}
        >
          {isAutoCleaning ? "Cleaning…" : "Apply"}
        </Button>
      </Stack>
    </Box>
  );
}
