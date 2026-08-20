export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Loads objectUrl into an HTMLImageElement and confirms the browser can
 * actually decode it (not just parse a header), resolving with its
 * intrinsic pixel dimensions.
 */
export function probeImageDimensions(objectUrl: string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const dimensions = { width: img.naturalWidth, height: img.naturalHeight };

      if (typeof img.decode === "function") {
        img
          .decode()
          .then(() => resolve(dimensions))
          .catch(() => reject(new Error("decode-failed")));
      } else {
        resolve(dimensions);
      }
    };

    img.onerror = () => reject(new Error("decode-failed"));
    img.src = objectUrl;
  });
}
