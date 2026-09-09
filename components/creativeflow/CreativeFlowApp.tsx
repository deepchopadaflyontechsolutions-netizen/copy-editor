"use client";

import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { CreativeFlowProvider } from "@/context/CreativeFlowContext";
import { CanvasEngineProvider } from "@/context/CanvasEngineContext";
import { loadAsset } from "@/lib/landing/assetStore";
import type { EditIntentId } from "@/types/editIntent";
import EditorTopBar from "./EditorTopBar";
import CanvasWorkspace from "./CanvasWorkspace";
import RightPanel from "./RightPanel";

interface CreativeFlowAppProps {
  /** The edit-mode intent chosen on the landing page, read from ?tool= on /editor. */
  initialTool?: EditIntentId | null;
  /** The IndexedDB key for the asset the landing page handed off, read from ?assetId= on /editor. */
  initialAssetId?: string | null;
}

export default function CreativeFlowApp({ initialTool = null, initialAssetId = null }: CreativeFlowAppProps) {
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
        {/* One tree for every screen size — RightPanel decides for itself (via CSS breakpoints,
            not JS) whether to render as the permanent desktop dock or the mobile floating-button
            + bottom-sheet, so there's no client-only "which layout am I" branch left to flash or
            mismatch during hydration. */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            minHeight: 0,
            height: "100vh",
            overflow: "hidden",
            bgcolor: "#0a0a0a",
          }}
        >
          <EditorTopBar />
          <Box sx={{ display: "flex", flexGrow: 1, minHeight: 0 }}>
            <RightPanel />
            <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1, minWidth: 0, minHeight: 0 }}>
              <Box sx={{ display: "flex", flexGrow: 1, minHeight: 0 }}>
                <CanvasWorkspace />
              </Box>
            </Box>
          </Box>
        </Box>
      </CanvasEngineProvider>
    </CreativeFlowProvider>
  );
}
