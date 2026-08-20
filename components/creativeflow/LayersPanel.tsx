"use client";

import { Box, IconButton, Stack, Typography } from "@mui/material";
import { ChevronDown, ChevronUp, Eye, EyeOff, Trash2 } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";

export default function LayersPanel() {
  const { layers, reorderLayer, toggleLayerVisibility, activeLayerId, selectLayer, deleteLayer } =
    useCanvasEngine();

  return (
    <Box sx={{ px: 2, py: 1.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        Layers
      </Typography>
      {layers.length === 0 && (
        <Typography variant="caption" color="text.secondary">
          Upload an image to start a layer stack.
        </Typography>
      )}
      <Stack component="ul" sx={{ listStyle: "none", m: 0, p: 0, gap: 0.5 }}>
        {[...layers].reverse().map((layer) => {
          const isSelected = activeLayerId === layer.id;
          return (
            <Box component="li" key={layer.id}>
              <Stack
                direction="row"
                spacing={0.5}
                onClick={() => selectLayer(layer.id)}
                sx={{
                  alignItems: "center",
                  px: 1,
                  py: 0.75,
                  borderRadius: 1.5,
                  cursor: "pointer",
                  bgcolor: isSelected ? "action.selected" : "transparent",
                  border: "1px solid",
                  borderColor: isSelected ? "primary.main" : "transparent",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <Stack sx={{ gap: 0 }}>
                  <IconButton
                    size="small"
                    sx={{ p: 0.25 }}
                    onClick={(event) => {
                      event.stopPropagation();
                      reorderLayer(layer.id, "up");
                    }}
                    aria-label="Move layer up"
                  >
                    <ChevronUp size={12} />
                  </IconButton>
                  <IconButton
                    size="small"
                    sx={{ p: 0.25 }}
                    onClick={(event) => {
                      event.stopPropagation();
                      reorderLayer(layer.id, "down");
                    }}
                    aria-label="Move layer down"
                  >
                    <ChevronDown size={12} />
                  </IconButton>
                </Stack>
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleLayerVisibility(layer.id);
                  }}
                  aria-label={layer.visible ? "Hide layer" : "Show layer"}
                >
                  {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                </IconButton>
                <Typography
                  variant="body2"
                  sx={{
                    flexGrow: 1,
                    fontWeight: isSelected ? 600 : 500,
                    opacity: layer.visible ? 1 : 0.5,
                  }}
                >
                  {layer.name}
                </Typography>
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteLayer(layer.id);
                  }}
                  aria-label="Delete layer"
                >
                  <Trash2 size={14} />
                </IconButton>
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
