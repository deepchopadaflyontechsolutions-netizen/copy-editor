"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  MobileTabKey,
  NavKey,
  RightPanelTab,
  ToolKey,
  TopToolKey,
} from "@/types/creativeflow";
import type { EditIntentId } from "@/types/editIntent";

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

  rightPanelTab: RightPanelTab;
  setRightPanelTab: (tab: RightPanelTab) => void;

  mobileTab: MobileTabKey;
  setMobileTab: (tab: MobileTabKey) => void;
  mobileSize: number;
  setMobileSize: (value: number) => void;
  brushSizeEnabled: boolean;
  toggleBrushSizeEnabled: () => void;
  aiSelectionMode: string;
  setAiSelectionMode: (value: string) => void;
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
}

export function CreativeFlowProvider({ children, initialTool = null }: CreativeFlowProviderProps) {
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

  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>("layers");

  const [mobileTab, setMobileTab] = useState<MobileTabKey>("edit");
  const [mobileSize, setMobileSize] = useState(50);
  const [brushSizeEnabled, setBrushSizeEnabled] = useState(true);
  const [aiSelectionMode, setAiSelectionMode] = useState("Auto");

  const toggleBrushSizeEnabled = useCallback(() => {
    setBrushSizeEnabled((prev) => !prev);
  }, []);

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
      rightPanelTab,
      setRightPanelTab,
      mobileTab,
      setMobileTab,
      mobileSize,
      setMobileSize,
      brushSizeEnabled,
      toggleBrushSizeEnabled,
      aiSelectionMode,
      setAiSelectionMode,
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
      rightPanelTab,
      mobileTab,
      mobileSize,
      brushSizeEnabled,
      toggleBrushSizeEnabled,
      aiSelectionMode,
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
