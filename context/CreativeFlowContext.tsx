"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { NavKey, ToolKey, TopToolKey } from "@/types/creativeflow";
import type { EditIntentId } from "@/types/editIntent";
// The actual type/guard live in a plain (non-"use client") module so the server-rendered
// /editor page can also validate `?panel=` with `isCreativeFlowPanelSectionId` without
// importing a client-boundary symbol into server code — re-exported below so existing
// `import { type RightPanelSectionId } from "@/context/CreativeFlowContext"` call sites (e.g.
// the floating `ContextToolbar` jumping its Crop icon to the sidebar's Crop panel) still work.
import { type CreativeFlowPanelSectionId, isCreativeFlowPanelSectionId } from "@/lib/creativeflowPanelSections";

export type RightPanelSectionId = CreativeFlowPanelSectionId;
export { isCreativeFlowPanelSectionId };

interface CreativeFlowContextValue {
  activeNav: NavKey;
  setActiveNav: (nav: NavKey) => void;

  activeTool: ToolKey;
  setActiveTool: (tool: ToolKey) => void;

  topTool: TopToolKey;
  setTopTool: (tool: TopToolKey) => void;
  brushSize: number;
  setBrushSize: (value: number) => void;
  aiModel: string;
  setAiModel: (value: string) => void;
  optionsValue: string;
  setOptionsValue: (value: string) => void;

  edgeRefinement: number;
  setEdgeRefinement: (value: number) => void;
  fileFormat: string;
  setFileFormat: (value: string) => void;
  exportQuality: string;
  setExportQuality: (value: string) => void;

  activeRightPanelSection: RightPanelSectionId | null;
  setActiveRightPanelSection: (section: RightPanelSectionId | null) => void;
}

const CreativeFlowContext = createContext<CreativeFlowContextValue | undefined>(
  undefined,
);

// The top bar's tool/brush/AI-model state doubles as a visible confirmation
// of the edit intent chosen on the landing page — e.g. picking "Watermark &
// Object Remover" there should land on a top bar already showing Magic with
// a sensibly larger brush, not the generic defaults.
function resolveInitialTopBarState(intent: EditIntentId | null | undefined): {
  topTool: TopToolKey;
  brushSize: number;
  aiModel: string;
} {
  switch (intent) {
    case "watermark_remover":
      return { topTool: "magic", brushSize: 60, aiModel: "Object Removal" };
    case "background_removal":
      return { topTool: "magic", brushSize: 45, aiModel: "Portrait v3" };
    default:
      return { topTool: "brush", brushSize: 45, aiModel: "Portrait v3" };
  }
}

interface CreativeFlowProviderProps {
  children: ReactNode;
  /** The edit-mode intent chosen on the landing page, if the user arrived from there. */
  initialTool?: EditIntentId | null;
  /** Which sidebar panel to open right away, read from ?panel= on /editor — e.g. the landing
   * page's "Adjust" or "Mark" quick action deep-links straight to that tab instead of always
   * landing on the default "Upload" tab. */
  initialPanel?: RightPanelSectionId | null;
}

export function CreativeFlowProvider({ children, initialTool = null, initialPanel = null }: CreativeFlowProviderProps) {
  const initialTopBarState = useMemo(() => resolveInitialTopBarState(initialTool), [initialTool]);

  const [activeNav, setActiveNav] = useState<NavKey>("home");
  const [activeTool, setActiveTool] = useState<ToolKey>("retouch");

  const [topTool, setTopTool] = useState<TopToolKey>(initialTopBarState.topTool);
  const [brushSize, setBrushSize] = useState(initialTopBarState.brushSize);
  const [aiModel, setAiModel] = useState(initialTopBarState.aiModel);
  const [optionsValue, setOptionsValue] = useState("Standard");

  const [edgeRefinement, setEdgeRefinement] = useState(30);
  const [fileFormat, setFileFormat] = useState("PNG");
  const [exportQuality, setExportQuality] = useState("High");

  const [activeRightPanelSection, setActiveRightPanelSection] = useState<RightPanelSectionId | null>(
    initialPanel ?? "images",
  );

  const value = useMemo<CreativeFlowContextValue>(
    () => ({
      activeNav,
      setActiveNav,
      activeTool,
      setActiveTool,
      topTool,
      setTopTool,
      brushSize,
      setBrushSize,
      aiModel,
      setAiModel,
      optionsValue,
      setOptionsValue,
      edgeRefinement,
      setEdgeRefinement,
      fileFormat,
      setFileFormat,
      exportQuality,
      setExportQuality,
      activeRightPanelSection,
      setActiveRightPanelSection,
    }),
    [
      activeNav,
      activeTool,
      topTool,
      brushSize,
      aiModel,
      optionsValue,
      edgeRefinement,
      fileFormat,
      exportQuality,
      activeRightPanelSection,
    ],
  );

  return (
    <CreativeFlowContext.Provider value={value}>
      {children}
    </CreativeFlowContext.Provider>
  );
}

export function useCreativeFlow(): CreativeFlowContextValue {
  const context = useContext(CreativeFlowContext);
  if (!context) {
    throw new Error("useCreativeFlow must be used within a CreativeFlowProvider");
  }
  return context;
}
