"use client";

import {
  Box,
  Button,
  ButtonGroup,
  MenuItem,
  Select,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import { Paintbrush2, Wand2, Lasso } from "lucide-react";
import { useCreativeFlow } from "@/context/CreativeFlowContext";
import type { TopToolKey } from "@/types/creativeflow";

const TOP_TOOLS: {
  key: TopToolKey;
  label: string;
  Icon: typeof Paintbrush2;
}[] = [
  { key: "brush", label: "Brush", Icon: Paintbrush2 },
  { key: "magic", label: "Magic", Icon: Wand2 },
  { key: "lasso", label: "Lasso", Icon: Lasso },
];

const AI_MODELS = [
  "Portrait v3",
  "Landscape v2",
  "Object Removal",
  "Upscale AI",
];
const OPTIONS = ["Standard", "Precision", "Fast"];

export default function DesktopTopBar() {
  const {
    topTool,
    setTopTool,
    brushSize,
    setBrushSize,
    aiModel,
    setAiModel,
    optionsValue,
    setOptionsValue,
  } = useCreativeFlow();

  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{
        alignItems: "center",
        px: 2,
        py: 1.5,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <ButtonGroup variant="outlined" aria-label="Editing tools">
        {TOP_TOOLS.map(({ key, label, Icon }) => (
          <Button
            key={key}
            onClick={() => setTopTool(key)}
            startIcon={<Icon size={16} />}
            variant={topTool === key ? "contained" : "outlined"}
          >
            {label}
          </Button>
        ))}
      </ButtonGroup>

      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", width: 160 }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ whiteSpace: "nowrap" }}
        >
          Size
        </Typography>
        <Slider
          size="small"
          value={brushSize}
          min={0}
          max={100}
          onChange={(_, value) => setBrushSize(value as number)}
          aria-label="Brush size"
        />
      </Stack>

      <Select
        size="small"
        value={aiModel}
        onChange={(event) => setAiModel(event.target.value)}
        sx={{ minWidth: 150 }}
        aria-label="AI Model"
      >
        {AI_MODELS.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </Select>

      <Select
        size="small"
        value={optionsValue}
        onChange={(event) => setOptionsValue(event.target.value)}
        sx={{ minWidth: 130 }}
        aria-label="Options"
      >
        {OPTIONS.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </Select>

      <Box sx={{ flexGrow: 1 }} />
    </Stack>
  );
}
