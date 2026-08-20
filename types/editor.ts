import type { LoadedImageState } from "@/types/image";
import type { ResizeMode } from "@/lib/image";

export type { LoadedImageState, ResizeMode };

export interface ResizeOptions {
  width: number;
  height: number;
  mode: ResizeMode;
}

export interface ImagePreviewCardProps {
  image: LoadedImageState;
  /** Resets the workspace back to the ImageUploader. */
  onClear: () => void;
  className?: string;
}

export interface ResizeControlsProps {
  image: LoadedImageState;
  /** Runs the Canvas resize pipeline; rejects if processing fails. */
  onApplyResize: (options: ResizeOptions) => Promise<void>;
  className?: string;
}
