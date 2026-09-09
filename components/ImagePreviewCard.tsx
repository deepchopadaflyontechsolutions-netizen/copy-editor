"use client";

import { alpha, useTheme } from "@mui/material/styles";
import {
  Box,
  Card,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { FileImage, HardDrive, Maximize2, X } from "lucide-react";
import { formatBytes, formatMimeLabel } from "@/lib/formatters";
import type { ImagePreviewCardProps } from "@/types/editor";

export default function ImagePreviewCard({
  image,
  onClear,
  className,
}: ImagePreviewCardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const checkerColor = isDark
    ? "rgba(248, 250, 252, 0.08)"
    : "rgba(15, 23, 42, 0.06)";
  const glassBackground = isDark
    ? alpha("#1E293B", 0.7)
    : alpha("#FFFFFF", 0.7);

  return (
    <Card
      variant="outlined"
      className={className}
      sx={{
        overflow: "hidden",
        borderRadius: 3,
        backgroundColor: glassBackground,
        backdropFilter: "blur(12px)",
      }}
    >
      <Box sx={{ position: "relative" }}>
        <Box
          sx={{
            width: "100%",
            minHeight: 280,
            maxHeight: 440,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundImage: `conic-gradient(${checkerColor} 90deg, transparent 90deg 180deg, ${checkerColor} 180deg 270deg, transparent 270deg)`,
            backgroundSize: "24px 24px",
            backgroundColor: theme.palette.background.default,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- intentional: browser handles display scaling, no Canvas downscale */}
          <img
            src={image.url}
            alt={image.fileName}
            style={{
              maxWidth: "100%",
              maxHeight: 440,
              width: "auto",
              height: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
        </Box>

        <Tooltip title="Change image">
          <IconButton
            onClick={onClear}
            aria-label="Change image"
            size="small"
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
              backgroundColor: alpha(theme.palette.background.paper, 0.85),
              backdropFilter: "blur(4px)",
              border: "1px solid",
              borderColor: "divider",
              "&:hover": {
                borderColor: "primary.main",
                color: "primary.main",
              },
            }}
          >
            <X size={16} />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ p: 2.5, borderTop: "1px solid", borderColor: "divider" }}>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 600, mb: 1.5, wordBreak: "break-all" }}
          title={image.fileName}
        >
          {image.fileName}
        </Typography>

        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          <Chip
            icon={<Maximize2 size={14} />}
            label={`${image.originalWidth} × ${image.originalHeight} px`}
            size="small"
            variant="outlined"
          />
          <Chip
            icon={<HardDrive size={14} />}
            label={formatBytes(image.fileSize)}
            size="small"
            variant="outlined"
          />
          <Chip
            icon={<FileImage size={14} />}
            label={formatMimeLabel(image.mimeType)}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Stack>
      </Box>
    </Card>
  );
}
