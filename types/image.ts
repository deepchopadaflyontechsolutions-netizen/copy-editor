/** The active image being edited, sourced from a loaded File. */
export interface LoadedImageState {
  file: File;
  /** Object URL created via URL.createObjectURL — owned by ImageStateContext. */
  url: string;
  fileName: string;
  fileSize: number; // Bytes
  mimeType: string; // e.g., 'image/jpeg'
  originalWidth: number;
  originalHeight: number;
  currentWidth: number;
  currentHeight: number;
}

/** The most recently processed output, tracked alongside the original for comparison views. */
export interface ProcessedImageState {
  outputBlob: Blob;
  /** Object URL created via URL.createObjectURL — owned by ImageStateContext. */
  outputUrl: string;
  outputWidth: number;
  outputHeight: number;
  outputSize: number; // in Bytes
  outputFormat: string; // e.g., 'image/jpeg'
  reductionPercentage: number; // e.g., -87% size saved
}
