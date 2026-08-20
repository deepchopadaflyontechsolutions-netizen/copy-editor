"use client";

import { useMemo, type ReactNode } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import type { PaletteMode } from "@mui/material";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ColorModeProvider, useColorMode } from "@/context/ColorModeContext";
import { getTheme } from "./theme";

function MuiThemeApplier({ children }: { children: ReactNode }) {
  const { mode } = useColorMode();
  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

interface ThemeRegistryProps {
  children: ReactNode;
  initialMode: PaletteMode;
}

export default function ThemeRegistry({
  children,
  initialMode,
}: ThemeRegistryProps) {
  return (
    <AppRouterCacheProvider options={{ key: "mui" }}>
      <ColorModeProvider initialMode={initialMode}>
        <MuiThemeApplier>{children}</MuiThemeApplier>
      </ColorModeProvider>
    </AppRouterCacheProvider>
  );
}
