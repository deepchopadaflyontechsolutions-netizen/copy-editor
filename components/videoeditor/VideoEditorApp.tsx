"use client";

import { useEffect, useState } from "react";
import { VideoEditorProvider, type VideoPanelSectionId } from "@/context/VideoEditorContext";
import { loadAsset } from "@/lib/landing/assetStore";
import VideoTopBar from "./VideoTopBar";
import VideoToolDock from "./VideoToolDock";
import VideoWorkspace from "./VideoWorkspace";

interface VideoEditorAppProps {
  /** The IndexedDB key for the video the landing page handed off, read from ?assetId= on
   * /video-editor — same mechanism CreativeFlowApp uses for the image editor. */
  initialAssetId?: string | null;
  /** Which sidebar panel to open once that video lands, read from ?panel= on /video-editor —
   * e.g. the landing page's "Crop" quick action deep-links to "frame". */
  initialPanel?: VideoPanelSectionId | null;
}

/** Same shell shape as CreativeFlowApp (top bar, left tool dock + drawer, main workspace) so
 * the video editor reads as the same product in a different mode, not a different app. */
export default function VideoEditorApp({ initialAssetId = null, initialPanel = null }: VideoEditorAppProps) {
  const [initialAssetFile, setInitialAssetFile] = useState<File | null>(null);

  useEffect(() => {
    if (!initialAssetId) return;
    let cancelled = false;
    void loadAsset(initialAssetId).then((file) => {
      if (!cancelled && file) setInitialAssetFile(file);
    });
    return () => {
      cancelled = true;
    };
  }, [initialAssetId]);

  // Same safety net as CreativeFlowApp: without this, dropping a file outside a designated
  // drop zone makes the browser navigate to/open it, blowing away the whole app.
  useEffect(() => {
    const preventDefault = (event: globalThis.DragEvent) => event.preventDefault();
    window.addEventListener("dragover", preventDefault);
    window.addEventListener("drop", preventDefault);
    return () => {
      window.removeEventListener("dragover", preventDefault);
      window.removeEventListener("drop", preventDefault);
    };
  }, []);

  return (
    <VideoEditorProvider initialAssetFile={initialAssetFile} initialPanel={initialPanel}>
      <div className="flex h-screen flex-col overflow-hidden bg-[#0a0a0a]">
        <VideoTopBar />
        <div className="flex min-h-0 flex-1">
          <VideoToolDock />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <VideoWorkspace />
          </div>
        </div>
      </div>
    </VideoEditorProvider>
  );
}
