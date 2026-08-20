/**
 * Converts a File or existing URL into a decoded HTMLImageElement. File
 * inputs are loaded via a throwaway Object URL that's revoked as soon as
 * the browser has decoded it — the caller never owns or needs to manage it.
 */
export function loadImage(src: string | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = src instanceof File ? URL.createObjectURL(src) : null;

    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error("image-load-failed"));
    };
    img.src = objectUrl ?? (src as string);
  });
}
