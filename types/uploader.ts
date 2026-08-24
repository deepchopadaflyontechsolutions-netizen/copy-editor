export const ACCEPTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AcceptedImageMimeType = (typeof ACCEPTED_IMAGE_MIME_TYPES)[number];

export const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;

/** Metadata extracted from a file that has passed all validation checks. */
export interface ValidatedImage {
  file: File;
  /** Object URL created via URL.createObjectURL — caller owns revocation. */
  objectUrl: string;
  name: string;
  mimeType: string;
  width: number;
  height: number;
  sizeMB: number;
}

export type ValidationErrorCode =
  | "NO_FILE"
  | "INVALID_TYPE"
  | "FILE_TOO_LARGE"
  | "DECODE_FAILED";

export interface ValidationError {
  code: ValidationErrorCode;
  message: string;
}

export type ValidationResult =
  | { ok: true; data: ValidatedImage }
  | { ok: false; error: ValidationError };
