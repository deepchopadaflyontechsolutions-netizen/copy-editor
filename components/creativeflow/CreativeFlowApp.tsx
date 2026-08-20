"use client";

import { useEffect, useState } from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { CreativeFlowProvider } from "@/context/CreativeFlowContext";
import { CanvasEngineProvider } from "@/context/CanvasEngineContext";
import { loadAsset } from "@/lib/landing/assetStore";
import type { EditIntentId } from "@/types/editIntent";
import DesktopTopBar from "./DesktopTopBar";
import DesktopCanvas from "./DesktopCanvas";
import RightPanel from "./RightPanel";
import MobileEditor from "./MobileEditor";

function DesktopEditor() {
  return (
    <Box sx={{ display: "flex", flexGrow: 1, minHeight: 0 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          minWidth: 0,
        }}
      >
        <DesktopTopBar />
        <Box sx={{ display: "flex", flexGrow: 1, minHeight: 0, p: 3 }}>
          <DesktopCanvas />
        </Box>
      </Box>
      <RightPanel />
    </Box>
  );
}

interface CreativeFlowAppProps {
  /** The edit-mode intent chosen on the landing page, read from ?tool= on /editor. */
  initialTool?: EditIntentId | null;
  /** The IndexedDB key for the asset the landing page handed off, read from ?assetId= on /editor. */
  initialAssetId?: string | null;
}

export default function CreativeFlowApp({ initialTool = null, initialAssetId = null }: CreativeFlowAppProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  const [initialImageFile, setInitialImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (!initialAssetId) return;
    let cancelled = false;
    void loadAsset(initialAssetId).then((file) => {
      // Video assets have no editor support yet — only images are handed to
      // the canvas engine, matching the landing page's own scope decision.
      if (!cancelled && file && file.type.startsWith("image/")) {
        setInitialImageFile(file);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [initialAssetId]);

  // Safety net: without this, dropping a file anywhere outside a designated
  // drop zone makes the browser navigate to/open that file, blowing away the
  // whole app. Every drop target in the tree still handles its own drop event
  // first (and stops propagation isn't needed since this only runs as a
  // fallback for events nothing else claimed).
  useEffect(() => {
    const preventDefault = (event: globalThis.DragEvent) =>
      event.preventDefault();
    window.addEventListener("dragover", preventDefault);
    window.addEventListener("drop", preventDefault);
    return () => {
      window.removeEventListener("dragover", preventDefault);
      window.removeEventListener("drop", preventDefault);
    };
  }, []);

  return (
    <CreativeFlowProvider initialTool={initialTool}>
      <CanvasEngineProvider initialImageFile={initialImageFile} initialTool={initialTool}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            overflow: "hidden",
          }}
        >
          {isDesktop ? <DesktopEditor /> : <MobileEditor />}
        </Box>
      </CanvasEngineProvider>
    </CreativeFlowProvider>
  );
}
