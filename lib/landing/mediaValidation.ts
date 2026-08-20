export type MediaKind = "image" | "video";

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
] as const;

export const MAX_IMAGE_SIZE_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024;

export const ACCEPT_BY_KIND: Record<MediaKind, string> = {
  image: IMAGE_MIME_TYPES.join(","),
  video: VIDEO_MIME_TYPES.join(","),
};

export const HINT_BY_KIND: Record<MediaKind, string> = {
  image: "Supports JPG, PNG, WebP, GIF — Max 25MB",
  video: "Supports MP4, MOV, WebM, AVI — Max 500MB",
};

export type MediaValidationResult = { ok: true } | { ok: false; message: string };

function toMB(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

export function validateMediaFile(file: File, kind: MediaKind): MediaValidationResult {
  const acceptedTypes: readonly string[] = kind === "image" ? IMAGE_MIME_TYPES : VIDEO_MIME_TYPES;
  const oppositeTypes: readonly string[] = kind === "image" ? VIDEO_MIME_TYPES : IMAGE_MIME_TYPES;

  if (oppositeTypes.includes(file.type)) {
    return {
      ok: false,
      message:
        kind === "image"
          ? "That's a video file. Switch to the Video Mode tab, or drop a JPG, PNG, WebP, or GIF image."
          : "That's an image file. Switch to the Image Mode tab, or drop an MP4, MOV, WebM, or AVI video.",
    };
  }

  if (!acceptedTypes.includes(file.type)) {
    return {
      ok: false,
      message:
        kind === "image"
          ? `"${file.type || "Unknown type"}" isn't supported. Upload a JPG, PNG, WebP, or GIF image.`
          : `"${file.type || "Unknown type"}" isn't supported. Upload an MP4, MOV, WebM, or AVI video.`,
    };
  }

  const maxSize = kind === "image" ? MAX_IMAGE_SIZE_BYTES : MAX_VIDEO_SIZE_BYTES;
  if (file.size > maxSize) {
    const maxLabel = kind === "image" ? "25MB" : "500MB";
    return {
      ok: false,
      message: `This file is ${toMB(file.size)}MB. The maximum allowed size for ${kind}s is ${maxLabel}.`,
    };
  }

  return { ok: true };
}
