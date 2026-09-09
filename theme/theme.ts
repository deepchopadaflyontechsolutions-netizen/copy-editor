import { createTheme, type Theme, type ThemeOptions } from "@mui/material/styles";
import type { PaletteMode } from "@mui/material";

// Same system stack as globals.css's `--default-font-family` — keeps
// Tailwind and MUI text rendering in the same typeface everywhere.
const fontFamily = "var(--default-font-family)";

const getDesignTokens = (mode: PaletteMode): ThemeOptions => ({
  palette: {
    mode,
    ...(mode === "dark"
      ? {
          background: {
            default: "#020617",
            paper: "#0F172A",
          },
          primary: {
            main: "#007BFF",
            contrastText: "#F8FAFC",
          },
          secondary: {
            main: "#06B6D4",
            contrastText: "#0F172A",
          },
          text: {
            primary: "#F8FAFC",
            secondary: "#94A3B8",
          },
          divider: "rgba(248, 250, 252, 0.12)",
        }
      : {
          background: {
            default: "#F8FAFC",
            paper: "#FFFFFF",
          },
          primary: {
            main: "#7C3AED",
            contrastText: "#FFFFFF",
          },
          secondary: {
            main: "#0891B2",
            contrastText: "#FFFFFF",
          },
          text: {
            primary: "#0F172A",
            secondary: "#475569",
          },
          divider: "rgba(15, 23, 42, 0.08)",
        }),
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily,
    h1: {
      fontSize: "24px",
      fontWeight: 600,
      lineHeight: 1.25,
      letterSpacing: "var(--tracking-tight)",
    },
    h2: {
      fontSize: "20px",
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: "var(--tracking-tight)",
    },
    h3: {
      fontSize: "16px",
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: "var(--tracking-tight)",
    },
    h4: {
      fontSize: "16px",
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: "var(--tracking-tight)",
    },
    h5: {
      fontSize: "20px",
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: "var(--tracking-tight)",
    },
    h6: {
      fontSize: "16px",
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: "var(--tracking-tight)",
    },
    body1: {
      fontSize: "14px",
      fontWeight: 400,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: "13px",
      fontWeight: 400,
      lineHeight: 1.5,
    },
    button: {
      fontSize: "14px",
      fontWeight: 500,
      lineHeight: 1.4,
      textTransform: "none",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingInline: 18,
        },
      },
      variants: [
        {
          props: { variant: "contained", color: "primary" },
          style: {
            boxShadow: "none",
            "&:hover": {
              boxShadow: "0 0 0 3px rgba(0, 123, 255, 0.25)",
            },
          },
        },
      ],
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          border: `1px solid ${theme.palette.divider}`,
        }),
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          color: theme.palette.primary.main,
          height: 4,
        }),
        thumb: ({ theme }: { theme: Theme }) => ({
          width: 14,
          height: 14,
          backgroundColor: theme.palette.primary.main,
          boxShadow: "none",
          "&:hover, &.Mui-focusVisible": {
            boxShadow: `0 0 0 6px rgba(0, 123, 255, 0.16)`,
          },
        }),
        rail: ({ theme }: { theme: Theme }) => ({
          opacity: 1,
          backgroundColor: theme.palette.divider,
        }),
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          backgroundColor: "transparent",
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 8,
          "&:before": { display: "none" },
          "&.Mui-expanded": { margin: 0 },
        }),
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          minHeight: 40,
          "&.Mui-expanded": { minHeight: 40 },
        },
        content: {
          margin: "8px 0",
          "&.Mui-expanded": { margin: "8px 0" },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          minHeight: 36,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }),
        indicator: ({ theme }: { theme: Theme }) => ({
          backgroundColor: theme.palette.primary.main,
        }),
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 36,
          fontSize: "14px",
          textTransform: "none",
          fontWeight: 500,
        },
      },
    },
  },
});

export const getTheme = (mode: PaletteMode): Theme =>
  createTheme(getDesignTokens(mode));
