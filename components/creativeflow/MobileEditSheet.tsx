"use client";

import { Box, SwipeableDrawer, Tab, Tabs } from "@mui/material";
import { useCreativeFlow } from "@/context/CreativeFlowContext";
import LayersPanel from "./LayersPanel";
import HistoryPanel from "./HistoryPanel";
import PropertiesPanel from "./PropertiesPanel";
import type { RightPanelTab } from "@/types/creativeflow";

interface MobileEditSheetProps {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
}

export default function MobileEditSheet({ open, onClose, onOpen }: MobileEditSheetProps) {
  const { rightPanelTab, setRightPanelTab } = useCreativeFlow();

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={onOpen}
      disableSwipeToOpen
      slotProps={{ paper: { sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "75vh" } } }}
    >
      <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: "divider", mx: "auto", mt: 1.5, mb: 0.5 }} />
      <Tabs
        value={rightPanelTab}
        onChange={(_, value: RightPanelTab) => setRightPanelTab(value)}
        variant="fullWidth"
      >
        <Tab value="layers" label="Layers" />
        <Tab value="history" label="History" />
      </Tabs>
      <Box sx={{ overflowY: "auto", pb: 2 }}>
        {rightPanelTab === "layers" ? <LayersPanel /> : <HistoryPanel />}
        <PropertiesPanel />
      </Box>
    </SwipeableDrawer>
  );
}
