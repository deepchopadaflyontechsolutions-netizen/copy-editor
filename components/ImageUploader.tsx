"use client";

import {
  useCallback,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { alpha, useTheme } from "@mui/material/styles";
import { Alert, Box, Button, CircularProgress, Snackbar, Typography } from "@mui/material";
import { UploadCloud } from "lucide-react";
import clsx from "clsx";
import { validateImage } from "@/lib/validateImage";
import type { ImageUploaderProps, ValidationError } from "@/types/uploader";

const ACCEPT_LABEL = "JPG • PNG • WebP • GIF";

export default function ImageUploader({
  onImageValidated,
  onValidationError,
  className,
  disabled = false,
}: ImageUploaderProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const inputId = useId();

  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const [isDragActive, setIsDragActive] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const [error, setError] = useState<ValidationError | null>(null);

  const surfaceColor = isDark ? "#1E293B" : "#FFFFFF";
  const restingBorderColor = isDark ? "#334155" : "#E2E8F0";
  const activeBorderColor = isDark ? "#8B5CF6" : "#7C3AED";

  const busy = disabled || isDecoding;

  const processFile = useCallback(
    async (file: File | null | undefined) => {
      setIsDecoding(true);
      setError(null);
      try {
        const result = await validateImage(file);
        if (result.ok) {
          onImageValidated(result.data);
        } else {
          setError(result.error);
          onValidationError?.(result.error);
        }
      } finally {
        setIsDecoding(false);
      }
    },
    [onImageValidated, onValidationError],
  );

  const openFileDialog = useCallback(() => {
    if (busy) return;
    inputRef.current?.click();
  }, [busy]);

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      void processFile(file);
      event.target.value = "";
    },
    [processFile],
  );

  const handleDragEnter = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (busy) return;
      dragCounter.current += 1;
      setIsDragActive(true);
    },
    [busy],
  );

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
    },
    [],
  );

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragCounter.current = 0;
      setIsDragActive(false);
      if (busy) return;
      const file = event.dataTransfer.files?.[0];
      void processFile(file);
    },
    [busy, processFile],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openFileDialog();
      }
    },
    [openFileDialog],
  );

  return (
    <Box className={className}>
      <Box
        role="button"
        tabIndex={busy ? -1 : 0}
        aria-disabled={busy}
        aria-describedby={`${inputId}-hint`}
        onClick={openFileDialog}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={clsx(
          "relative flex w-full flex-col items-center justify-center gap-3",
          "rounded-2xl border-2 border-dashed px-6 py-14 text-center outline-none",
          "transition-[border-color,box-shadow,background-color] duration-200 ease-out",
          busy ? "cursor-progress opacity-80" : "cursor-pointer",
        )}
        sx={{
          backgroundColor: surfaceColor,
          borderColor: isDragActive ? activeBorderColor : restingBorderColor,
          boxShadow: isDragActive
            ? `0 0 0 4px ${alpha(activeBorderColor, 0.18)}, 0 0 24px ${alpha(activeBorderColor, 0.35)}`
            : "none",
          "&:hover": busy
            ? undefined
            : {
                borderColor: activeBorderColor,
              },
          "&:focus-visible": {
            borderColor: activeBorderColor,
            boxShadow: `0 0 0 4px ${alpha(activeBorderColor, 0.18)}`,
          },
        }}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          hidden
          disabled={busy}
          onChange={handleInputChange}
        />

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            borderRadius: "50%",
            backgroundColor: alpha(activeBorderColor, isDark ? 0.16 : 0.1),
            color: activeBorderColor,
          }}
        >
          <UploadCloud size={26} />
        </Box>

        <Typography variant="h6" component="p" sx={{ fontWeight: 700 }}>
          Upload Image
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Drag &amp; drop your image
        </Typography>
        <Typography variant="body2" color="text.secondary">
          or
        </Typography>

        <Button
          variant="outlined"
          color="primary"
          disabled={busy}
          onClick={(event) => {
            event.stopPropagation();
            openFileDialog();
          }}
        >
          Select Image
        </Button>

        <Typography
          id={`${inputId}-hint`}
          variant="caption"
          color="text.secondary"
          sx={{ mt: 1, letterSpacing: 0.4 }}
        >
          {ACCEPT_LABEL}
        </Typography>

        {isDecoding && (
          <Box
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl"
            sx={{
              backgroundColor: alpha(surfaceColor, 0.85),
              backdropFilter: "blur(2px)",
            }}
          >
            <CircularProgress size={28} sx={{ color: activeBorderColor }} />
            <Typography variant="body2" color="text.secondary">
              Decoding image…
            </Typography>
          </Box>
        )}
      </Box>

      <Snackbar
        open={error !== null}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setError(null)}
          sx={{ width: "100%" }}
        >
          {error?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
