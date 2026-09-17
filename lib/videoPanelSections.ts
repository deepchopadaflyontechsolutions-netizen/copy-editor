// Deliberately NOT "use client" — this needs to be callable from the server-rendered
// /video-editor page (validating ?panel=) as well as from VideoEditorContext's own client code.

export type VideoPanelSectionId = "upload" | "frame" | "transform" | "text" | "audio" | "speed" | "effects";

const VIDEO_PANEL_SECTION_IDS: readonly VideoPanelSectionId[] = [
  "upload",
  "frame",
  "transform",
  "text",
  "audio",
  "speed",
  "effects",
];

/** Validates an untrusted string (e.g. `?panel=` on /video-editor, handed off from the landing
 * page's quick actions) before trusting it as a real `VideoPanelSectionId`. */
export function isVideoPanelSectionId(value: string | null | undefined): value is VideoPanelSectionId {
  return VIDEO_PANEL_SECTION_IDS.includes(value as VideoPanelSectionId);
}
