"use client";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Divider,
  MenuItem,
  Select,
  Slider,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { ChevronDown } from "lucide-react";
import { useCreativeFlow } from "@/context/CreativeFlowContext";
import PropertiesPanel from "./PropertiesPanel";
import LayersPanel from "./LayersPanel";
import HistoryPanel from "./HistoryPanel";
import type { RightPanelTab } from "@/types/creativeflow";

const FILE_FORMATS = ["PNG", "JPG", "WEBP", "TIFF"];
const QUALITIES = ["Low", "Medium", "High", "Maximum"];

export default function RightPanel() {
  const {
    rightPanelTab,
    setRightPanelTab,
    aiModel,
    setAiModel,
    edgeRefinement,
    setEdgeRefinement,
    fileFormat,
    setFileFormat,
    exportQuality,
    setExportQuality,
  } = useCreativeFlow();

  return (
    <Box
      component="aside"
      sx={{
        width: 320,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        overflowY: "auto",
      }}
    >
      <Tabs
        value={rightPanelTab}
        onChange={(_, value: RightPanelTab) => setRightPanelTab(value)}
        variant="fullWidth"
      >
        <Tab value="layers" label="Layers" />
        <Tab value="history" label="History" />
      </Tabs>

      {rightPanelTab === "layers" ? <LayersPanel /> : <HistoryPanel />}

      <Divider />
      <PropertiesPanel />
      <Divider />

      <Accordion disableGutters elevation={0} square sx={{ mx: 2, my: 1 }}>
        <AccordionSummary expandIcon={<ChevronDown size={16} />}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Advanced Settings
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5}>
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                AI Model
              </Typography>
              <Select
                size="small"
                value={aiModel}
                onChange={(event) => setAiModel(event.target.value)}
                aria-label="Advanced AI Model"
              >
                <MenuItem value={aiModel}>{aiModel}</MenuItem>
              </Select>
            </Stack>
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                Edge refinement
              </Typography>
              <Slider
                size="small"
                value={edgeRefinement}
                min={0}
                max={100}
                onChange={(_, value) => setEdgeRefinement(value as number)}
                aria-label="Edge refinement"
                valueLabelDisplay="auto"
              />
            </Stack>
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters elevation={0} square sx={{ mx: 2, mb: 2 }}>
        <AccordionSummary expandIcon={<ChevronDown size={16} />}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Export
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5}>
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                File format
              </Typography>
              <Select
                size="small"
                value={fileFormat}
                onChange={(event) => setFileFormat(event.target.value)}
                aria-label="File format"
              >
                {FILE_FORMATS.map((format) => (
                  <MenuItem key={format} value={format}>
                    {format}
                  </MenuItem>
                ))}
              </Select>
            </Stack>
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                Quality
              </Typography>
              <Select
                size="small"
                value={exportQuality}
                onChange={(event) => setExportQuality(event.target.value)}
                aria-label="Export quality"
              >
                {QUALITIES.map((quality) => (
                  <MenuItem key={quality} value={quality}>
                    {quality}
                  </MenuItem>
                ))}
              </Select>
            </Stack>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
