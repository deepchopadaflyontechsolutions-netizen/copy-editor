"use client";

import { Box, Stack, Typography } from "@mui/material";
import { Folder, Paintbrush2, Sliders, Download, User } from "lucide-react";
import { useCreativeFlow } from "@/context/CreativeFlowContext";
import type { MobileTabKey } from "@/types/creativeflow";

const TABS: { key: MobileTabKey; label: string; Icon: typeof Folder }[] = [
  { key: "projects", label: "Projects", Icon: Folder },
  { key: "edit", label: "Edit", Icon: Paintbrush2 },
  { key: "filters", label: "Filters", Icon: Sliders },
  { key: "export", label: "Export", Icon: Download },
  { key: "account", label: "Account", Icon: User },
];

export default function MobileBottomTabs() {
  const { mobileTab, setMobileTab } = useCreativeFlow();

  return (
    <Stack
      direction="row"
      component="nav"
      sx={{
        borderTop: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        py: 0.75,
      }}
    >
      {TABS.map(({ key, label, Icon }) => {
        const isActive = mobileTab === key;
        return (
          <Box
            key={key}
            component="button"
            onClick={() => setMobileTab(key)}
            sx={{
              flex: 1,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0.25,
              py: 0.5,
              color: isActive ? "primary.main" : "text.secondary",
            }}
          >
            <Icon size={18} />
            <Typography variant="caption" sx={{ fontWeight: isActive ? 700 : 500 }}>
              {label}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
}
