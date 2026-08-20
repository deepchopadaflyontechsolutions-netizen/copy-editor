"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { loadImageState } from "@/lib/loadImage";
import { resizeImage } from "@/lib/image";
import type { LoadedImageState, ProcessedImageState } from "@/types/image";
import type { ResizeOptions } from "@/types/editor";

interface ImageStateContextValue {
  image: LoadedImageState | null;
  isLoading: boolean;
  error: string | null;
  processedImage: ProcessedImageState | null;
  isProcessing: boolean;
  loadImage: (file: File) => Promise<void>;
  clearImage: () => void;
  updateDimensions: (width: number, height: number) => void;
  applyResize: (options: ResizeOptions) => Promise<void>;
}

const ImageStateContext = createContext<ImageStateContextValue | undefined>(
  undefined,
);

export function ImageStateProvider({ children }: { children: ReactNode }) {
  const [image, setImage] = useState<LoadedImageState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<ProcessedImageState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const urlRef = useRef<string | null>(null);
  const outputUrlRef = useRef<string | null>(null);

  const clearImage = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = null;
    }
    setImage(null);
    setProcessedImage(null);
    setError(null);
  }, []);

  const loadImage = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const next = await loadImageState(file);
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }
      urlRef.current = next.url;
      if (outputUrlRef.current) {
        URL.revokeObjectURL(outputUrlRef.current);
        outputUrlRef.current = null;
      }
      setProcessedImage(null);
      setImage(next);
    } catch {
      setError("This image couldn't be loaded into the editor.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }
      if (outputUrlRef.current) {
        URL.revokeObjectURL(outputUrlRef.current);
      }
    };
  }, []);

  const updateDimensions = useCallback((width: number, height: number) => {
    setImage((prev) =>
      prev ? { ...prev, currentWidth: width, currentHeight: height } : prev,
    );
  }, []);

  const applyResize = useCallback(
    async (options: ResizeOptions) => {
      if (!image) return;

      setIsProcessing(true);
      setError(null);
      try {
        const outputBlob = await resizeImage({
          image: image.file,
          targetWidth: options.width,
          targetHeight: options.height,
          mimeType: image.mimeType,
          resizeMode: options.mode,
        });

        const outputUrl = URL.createObjectURL(outputBlob);
        if (outputUrlRef.current) {
          URL.revokeObjectURL(outputUrlRef.current);
        }
        outputUrlRef.current = outputUrl;

        const reductionPercentage = Math.round(
          ((outputBlob.size - image.fileSize) / image.fileSize) * 100,
        );

        setProcessedImage({
          outputBlob,
          outputUrl,
          outputWidth: options.width,
          outputHeight: options.height,
          outputSize: outputBlob.size,
          outputFormat: outputBlob.type || image.mimeType,
          reductionPercentage,
        });
        setImage((prev) =>
          prev ? { ...prev, currentWidth: options.width, currentHeight: options.height } : prev,
        );
      } catch {
        setError("This image couldn't be resized. Try different dimensions.");
        throw new Error("resize-failed");
      } finally {
        setIsProcessing(false);
      }
    },
    [image],
  );

  const value = useMemo(
    () => ({
      image,
      isLoading,
      error,
      processedImage,
      isProcessing,
      loadImage,
      clearImage,
      updateDimensions,
      applyResize,
    }),
    [image, isLoading, error, processedImage, isProcessing, loadImage, clearImage, updateDimensions, applyResize],
  );

  return (
    <ImageStateContext.Provider value={value}>
      {children}
    </ImageStateContext.Provider>
  );
}

export function useImageState(): ImageStateContextValue {
  const context = useContext(ImageStateContext);
  if (!context) {
    throw new Error("useImageState must be used within an ImageStateProvider");
  }
  return context;
}
