import {
  ACCEPTED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  type ValidatedImage,
  type ValidationResult,
} from "@/types/uploader";
import { probeImageDimensions } from "@/lib/decodeImage";

function toMB(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

/**
 * Runs all 4 pre-upload checks in order: presence, MIME type, size, then an
 * async browser-decode probe. Only the last check touches the network/GPU,
 * so cheap checks short-circuit first.
 */
export async function validateImage(
  file: File | null | undefined,
): Promise<ValidationResult> {
  if (!file) {
    return {
      ok: false,
      error: { code: "NO_FILE", message: "No file was selected." },
    };
  }

  if (!ACCEPTED_IMAGE_MIME_TYPES.includes(file.type as never)) {
    return {
      ok: false,
      error: {
        code: "INVALID_TYPE",
        message: `"${file.type || "Unknown type"}" isn't supported. Upload a JPG, PNG, WebP, or GIF image.`,
      },
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      ok: false,
      error: {
        code: "FILE_TOO_LARGE",
        message: `This image is ${toMB(file.size)} MB. The maximum allowed size is 20 MB.`,
      },
    };
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const { width, height } = await probeImageDimensions(objectUrl);
    const data: ValidatedImage = {
      file,
      objectUrl,
      name: file.name,
      mimeType: file.type,
      width,
      height,
      sizeMB: toMB(file.size),
    };
    return { ok: true, data };
  } catch {
    URL.revokeObjectURL(objectUrl);
    return {
      ok: false,
      error: {
        code: "DECODE_FAILED",
        message: "This image couldn't be decoded — the file may be corrupted or unsupported.",
      },
    };
  }
}
