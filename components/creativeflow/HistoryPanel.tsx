"use client";

import { Box, Stack, Typography } from "@mui/material";
import { History as HistoryIcon } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";

export default function HistoryPanel() {
  const { history, historyIndex, jumpToHistory } = useCanvasEngine();

  return (
    <Box sx={{ px: 2, py: 1.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        History
      </Typography>
      <Stack component="ul" sx={{ listStyle: "none", m: 0, p: 0, gap: 0.5 }}>
        {[...history].reverse().map((entry) => {
          const originalIndex = history.findIndex((item) => item.id === entry.id);
          const isCurrent = originalIndex === historyIndex;
          const isUndone = originalIndex > historyIndex;
          return (
            <Box component="li" key={entry.id}>
              <Stack
                direction="row"
                spacing={1}
                component="button"
                onClick={() => jumpToHistory(originalIndex)}
                sx={{
                  alignItems: "center",
                  width: "100%",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  px: 1,
                  py: 0.75,
                  borderRadius: 1.5,
                  bgcolor: isCurrent ? "action.selected" : "transparent",
                  color: isUndone ? "text.disabled" : "text.primary",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <HistoryIcon size={14} opacity={isUndone ? 0.4 : 0.8} />
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: isCurrent ? 600 : 500,
                    textDecoration: isUndone ? "line-through" : "none",
                  }}
                >
                  {entry.label}
                </Typography>
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
