"use client";

import { IconButton, Tooltip } from "@mui/material";
import { Moon, Sun } from "lucide-react";
import { useColorMode } from "@/context/ColorModeContext";

export default function ThemeToggle() {
  const { mode, toggleColorMode } = useColorMode();
  const isDark = mode === "dark";

  return (
    <Tooltip title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
      <IconButton
        onClick={toggleColorMode}
        aria-label="Toggle color mode"
        size="medium"
        sx={{
          color: "text.primary",
          border: "1px solid",
          borderColor: "divider",
          transition: "border-color 0.2s ease, color 0.2s ease",
          "&:hover": {
            borderColor: "primary.main",
            color: "primary.main",
          },
        }}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </IconButton>
    </Tooltip>
  );
}
