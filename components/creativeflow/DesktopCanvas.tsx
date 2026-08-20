"use client";

import { Box } from "@mui/material";
import CanvasSideTools from "./CanvasSideTools";
import CanvasStage from "./CanvasStage";
import BeforeAfterExportBar from "./BeforeAfterExportBar";

export default function DesktopCanvas() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: "1 1 0%", minWidth: 0, minHeight: 0 }}>
      <Box sx={{ display: "flex", gap: 3, flex: "1 1 0%", minHeight: 0 }}>
        <CanvasSideTools />
        <CanvasStage />
      </Box>
      <BeforeAfterExportBar />
    </Box>
  );
}
