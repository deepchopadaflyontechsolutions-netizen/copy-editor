import { probeImageDimensions } from "@/lib/decodeImage";
import type { LoadedImageState } from "@/types/image";

/**
 * Builds the editor's active-image state from a File: creates its Object
 * URL and preloads it via HTMLImageElement to confirm decodability and
 * read its intrinsic (natural) dimensions. Caller owns the returned url's
 * lifecycle (revoke it when the image is replaced or discarded).
 */
export async function loadImageState(file: File): Promise<LoadedImageState> {
  const url = URL.createObjectURL(file);

  try {
    const { width, height } = await probeImageDimensions(url);
    return {
      file,
      url,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      originalWidth: width,
      originalHeight: height,
      currentWidth: width,
      currentHeight: height,
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}
