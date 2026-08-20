import type {
  CompressOptions,
  ConvertFormatOptions,
  CropOptions,
  FlipOptions,
  RotateOptions,
} from "./types";

/** Re-encodes `image` at a lower quality to reduce file size. Not yet implemented. */
export async function compressImage(_options: CompressOptions): Promise<Blob> {
  throw new Error("compressImage is not implemented yet");
}

/** Extracts the `{ x, y, width, height }` region of `image`. Not yet implemented. */
export async function cropImage(_options: CropOptions): Promise<Blob> {
  throw new Error("cropImage is not implemented yet");
}

/** Rotates `image` by a multiple of 90 degrees. Not yet implemented. */
export async function rotateImage(_options: RotateOptions): Promise<Blob> {
  throw new Error("rotateImage is not implemented yet");
}

/** Mirrors `image` across its horizontal or vertical axis. Not yet implemented. */
export async function flipImage(_options: FlipOptions): Promise<Blob> {
  throw new Error("flipImage is not implemented yet");
}

/** Re-encodes `image` into a different output MIME type. Not yet implemented. */
export async function convertFormat(_options: ConvertFormatOptions): Promise<Blob> {
  throw new Error("convertFormat is not implemented yet");
}
