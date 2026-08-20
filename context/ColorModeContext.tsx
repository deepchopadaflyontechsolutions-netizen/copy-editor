"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PaletteMode } from "@mui/material";
import { THEME_COOKIE_NAME } from "@/lib/theme-cookie";

interface ColorModeContextValue {
  mode: PaletteMode;
  toggleColorMode: () => void;
}

const ColorModeContext = createContext<ColorModeContextValue | undefined>(
  undefined,
);

interface ColorModeProviderProps {
  children: ReactNode;
  initialMode: PaletteMode;
}

export function ColorModeProvider({
  children,
  initialMode,
}: ColorModeProviderProps) {
  const [mode, setMode] = useState<PaletteMode>(initialMode);

  const toggleColorMode = useCallback(() => {
    setMode((prev) => {
      const next: PaletteMode = prev === "dark" ? "light" : "dark";
      document.cookie = `${THEME_COOKIE_NAME}=${next}; path=/; max-age=31536000; SameSite=Lax`;
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ mode, toggleColorMode }),
    [mode, toggleColorMode],
  );

  return (
    <ColorModeContext.Provider value={value}>
      {children}
    </ColorModeContext.Provider>
  );
}

export function useColorMode(): ColorModeContextValue {
  const context = useContext(ColorModeContext);
  if (!context) {
    throw new Error("useColorMode must be used within a ColorModeProvider");
  }
  return context;
}
