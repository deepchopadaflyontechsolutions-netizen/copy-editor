const BYTE_UNITS = ["B", "KB", "MB", "GB"] as const;

/** Formats a byte count as a human-readable size, e.g. 5,033,164 -> "4.8 MB". */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";

  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    BYTE_UNITS.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  const decimals = exponent === 0 ? 0 : 1;

  return `${value.toFixed(decimals)} ${BYTE_UNITS[exponent]}`;
}

/** Zero-padded `00:00.0` timecode (minutes:seconds.deciseconds) — one decimal of sub-second
 * precision, for trim handles and other places that need finer feedback than a plain `m:ss`. */
export function formatPreciseTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00.0";
  const mins = Math.floor(seconds / 60);
  const wholeSecs = Math.floor(seconds % 60);
  const deciseconds = Math.floor((seconds * 10) % 10);
  return `${mins.toString().padStart(2, "0")}:${wholeSecs.toString().padStart(2, "0")}.${deciseconds}`;
}

const MIME_LABEL_OVERRIDES: Record<string, string> = {
  "image/jpeg": "JPEG",
  "image/svg+xml": "SVG",
};

/** Formats a MIME type as a short format tag, e.g. "image/webp" -> "WEBP". */
export function formatMimeLabel(mimeType: string): string {
  if (mimeType in MIME_LABEL_OVERRIDES) return MIME_LABEL_OVERRIDES[mimeType];
  const subtype = mimeType.split("/")[1] ?? mimeType;
  return subtype.toUpperCase();
}
