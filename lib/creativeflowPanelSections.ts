// Deliberately NOT "use client" — this needs to be callable from the server-rendered /editor
// page (validating ?panel=) as well as from CreativeFlowContext's own client code, mirroring
// lib/videoPanelSections.ts's split for the video editor.

export type CreativeFlowPanelSectionId = "images" | "adjust" | "resize" | "watermark";

const CREATIVE_FLOW_PANEL_SECTION_IDS: readonly CreativeFlowPanelSectionId[] = [
  "images",
  "adjust",
  "resize",
  "watermark",
];

/** Validates an untrusted string (e.g. `?panel=` on /editor, handed off from the landing
 * page's quick actions) before trusting it as a real `CreativeFlowPanelSectionId`. */
export function isCreativeFlowPanelSectionId(value: string | null | undefined): value is CreativeFlowPanelSectionId {
  return CREATIVE_FLOW_PANEL_SECTION_IDS.includes(value as CreativeFlowPanelSectionId);
}
