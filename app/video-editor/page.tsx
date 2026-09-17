import VideoEditorApp from "@/components/videoeditor/VideoEditorApp";
// Imported directly from the plain (non-"use client") module, not re-exported through
// VideoEditorContext — every export of a "use client" file is treated as a client boundary by
// the RSC compiler, so this server component can't call a function re-exported from one even if
// its actual implementation has no client-only code.
import { isVideoPanelSectionId } from "@/lib/videoPanelSections";

export default async function VideoEditorPage(props: PageProps<"/video-editor">) {
  const { assetId, panel } = await props.searchParams;
  const assetIdParam = Array.isArray(assetId) ? assetId[0] : assetId;
  const panelParam = Array.isArray(panel) ? panel[0] : panel;

  return (
    <VideoEditorApp
      initialAssetId={assetIdParam ?? null}
      initialPanel={isVideoPanelSectionId(panelParam) ? panelParam : null}
    />
  );
}
