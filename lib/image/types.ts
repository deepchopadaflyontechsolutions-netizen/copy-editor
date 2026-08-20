/** Downscaling/upscaling strategy applied when the Canvas renders output. */
export type ResizeMode = "smooth" | "pixelated";

export interface ResizeOptions {
  image: HTMLImageElement | File;
  targetWidth: number;
  targetHeight: number;
  mimeType: string;
  quality?: number;
  resizeMode?: ResizeMode;
}

export interface CompressOptions {
  image: HTMLImageElement | File;
  quality: number;
  mimeType?: string;
}

export interface CropOptions {
  image: HTMLImageElement | File;
  x: number;
  y: number;
  width: number;
  height: number;
  mimeType?: string;
  quality?: number;
}

export type RotationDegrees = 90 | 180 | 270 | -90 | -180 | -270;

export interface RotateOptions {
  image: HTMLImageElement | File;
  degrees: RotationDegrees;
  mimeType?: string;
  quality?: number;
}

export type FlipAxis = "horizontal" | "vertical";

export interface FlipOptions {
  image: HTMLImageElement | File;
  axis: FlipAxis;
  mimeType?: string;
  quality?: number;
}

export type ConvertibleMimeType = "image/jpeg" | "image/png" | "image/webp";

export interface ConvertFormatOptions {
  image: HTMLImageElement | File;
  mimeType: ConvertibleMimeType;
  quality?: number;
}
