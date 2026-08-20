"use client";

import { useState, type MouseEvent } from "react";
import {
  Box,
  Button,
  IconButton,
  Menu,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { Download, Redo2, Undo2 } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import type { ExportFormat } from "@/types/canvasEngine";

export default function BeforeAfterExportBar() {
  const { beforeAfter, toggleBeforeAfter, hasImage, exportImage, undo, redo, canUndo, canRedo } = useCanvasEngine();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [format, setFormat] = useState<ExportFormat>("png");
  const [multiplier, setMultiplier] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportImage({ format, multiplier });
    } finally {
      setIsExporting(false);
      setAnchorEl(null);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        mt: 2,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Typography
          variant="body2"
          sx={{ color: beforeAfter ? "primary.main" : "text.secondary", fontWeight: 600 }}
        >
          Before
        </Typography>
        <Switch
          checked={!beforeAfter}
          onChange={toggleBeforeAfter}
          disabled={!hasImage}
          aria-label="Toggle before and after preview"
        />
        <Typography
          variant="body2"
          sx={{ color: !beforeAfter ? "primary.main" : "text.secondary", fontWeight: 600 }}
        >
          After
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
          }}
        >
          <Tooltip title="Undo">
            <span>
              <IconButton
                aria-label="Undo"
                onClick={undo}
                disabled={!canUndo}
                sx={{ borderRadius: 0, borderRight: "1px solid", borderColor: "divider" }}
              >
                <Undo2 size={18} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Redo">
            <span>
              <IconButton aria-label="Redo" onClick={redo} disabled={!canRedo} sx={{ borderRadius: 0 }}>
                <Redo2 size={18} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        <Button
          variant="contained"
          color="primary"
          aria-label="Export image"
          startIcon={<Download size={16} />}
          disabled={!hasImage}
          onClick={(event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget)}
        >
          Export
        </Button>
      </Stack>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <Box sx={{ px: 2, py: 1.5, display: "flex", flexDirection: "column", gap: 1.5, minWidth: 220 }}>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              Format
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={format}
              onChange={(_, value: ExportFormat | null) => value && setFormat(value)}
            >
              <ToggleButton value="png">PNG</ToggleButton>
              <ToggleButton value="jpeg">JPEG</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              Size multiplier
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={multiplier}
              onChange={(_, value: number | null) => value && setMultiplier(value)}
            >
              <ToggleButton value={1}>1x</ToggleButton>
              <ToggleButton value={2}>2x</ToggleButton>
              <ToggleButton value={4}>4x</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          <Button
            variant="contained"
            size="small"
            onClick={() => void handleExport()}
            disabled={isExporting}
          >
            {isExporting ? "Exporting…" : "Download"}
          </Button>
        </Box>
      </Menu>
    </Box>
  );
}
