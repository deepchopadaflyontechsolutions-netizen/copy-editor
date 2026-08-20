"use client";

import { useState } from "react";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import { SlidersHorizontal, User } from "lucide-react";
import CanvasStage from "./CanvasStage";
import MobileFloatingPanel from "./MobileFloatingPanel";
import MobileBottomTabs from "./MobileBottomTabs";
import MobileEditSheet from "./MobileEditSheet";
import { useCreativeFlow } from "@/context/CreativeFlowContext";

export default function MobileEditor() {
  const { mobileTab } = useCreativeFlow();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        bgcolor: "background.default",
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
          Done
        </Typography>
        <Typography variant="body2" sx={{ flexGrow: 1, textAlign: "center", color: "text.secondary" }}>
          project name
        </Typography>
        <IconButton size="small" aria-label="Layers and history" onClick={() => setSheetOpen(true)}>
          <SlidersHorizontal size={18} />
        </IconButton>
        <IconButton size="small" aria-label="Account">
          <User size={18} />
        </IconButton>
      </Stack>

      <Box sx={{ display: "flex", flexGrow: 1, minHeight: 0, m: 1.5 }}>
        <CanvasStage />
      </Box>

      {mobileTab === "edit" && <MobileFloatingPanel />}

      <MobileBottomTabs />

      <MobileEditSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onOpen={() => setSheetOpen(true)} />
    </Box>
  );
}
