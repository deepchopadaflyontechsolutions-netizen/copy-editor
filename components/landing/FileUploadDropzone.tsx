"use client";

import {
  useCallback,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { Film, ImageIcon, Sparkle, UploadCloud } from "lucide-react";

type UploadMode = "image" | "video";

const ACCEPT_BY_MODE: Record<UploadMode, string> = {
  image: "image/jpeg,image/png,image/webp,image/gif",
  video: "video/*",
};

const FORMAT_CHIPS: Record<UploadMode, string[]> = {
  image: ["JPG", "PNG", "WebP", "GIF"],
  video: ["MP4", "MOV", "WebM", "AVI"],
};

export default function FileUploadDropzone({
  onFilesSelected,
}: {
  onFilesSelected?: (files: File[]) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const [mode, setMode] = useState<UploadMode>("image");
  const [isDragging, setIsDragging] = useState(false);

  const openFileDialog = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      onFilesSelected?.(Array.from(files));
    },
    [onFilesSelected],
  );

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      handleFiles(event.target.files);
      event.target.value = "";
    },
    [handleFiles],
  );

  const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounterRef.current += 1;
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openFileDialog();
      }
    },
    [openFileDialog],
  );

  return (
    <div className="relative mx-auto w-full max-w-2xl px-4 py-6">
      <p className="mx-auto mb-8 max-w-md text-center text-sm text-slate-400">
        No installs, no plugins, nothing to download. Drop a file in and start
        editing in seconds.
      </p>

      {/* Segmented mode toggle */}
      <div className="mb-5 flex justify-center">
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-slate-900/80 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_24px_rgba(59,130,246,0.08)] backdrop-blur-xl">
          <button
            type="button"
            aria-label="Image mode"
            aria-pressed={mode === "image"}
            onClick={() => setMode("image")}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ${
              mode === "image"
                ? "bg-blue-600 text-white shadow-[0_0_16px_rgba(59,130,246,0.55)]"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <ImageIcon size={16} />
          </button>
          <button
            type="button"
            aria-label="Video mode"
            aria-pressed={mode === "video"}
            onClick={() => setMode("video")}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ${
              mode === "video"
                ? "bg-blue-600 text-white shadow-[0_0_16px_rgba(59,130,246,0.55)]"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Film size={16} />
          </button>
        </div>
      </div>

      {/* Gradient-border dropzone card: electric blue at the top fading to violet at the bottom edge */}
      <div
        className={`relative rounded-3xl bg-gradient-to-b from-blue-500/70 via-blue-500/30 to-violet-500/60 p-px shadow-[0_0_50px_rgba(59,130,246,0.2),0_20px_60px_-15px_rgba(139,92,246,0.25)] transition-shadow duration-300 ${
          isDragging
            ? "shadow-[0_0_70px_rgba(59,130,246,0.38),0_20px_70px_-15px_rgba(139,92,246,0.4)]"
            : ""
        }`}
      >
        <div
          role="button"
          tabIndex={0}
          aria-describedby={`${inputId}-hint`}
          onClick={openFileDialog}
          onKeyDown={handleKeyDown}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center gap-5 rounded-[calc(1.5rem-1px)] bg-[#0B0F19]/95 px-8 py-14 text-center outline-none backdrop-blur-xl transition-colors duration-200 ${
            isDragging ? "bg-[#0B0F19]/85" : ""
          }`}
        >
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ACCEPT_BY_MODE[mode]}
            multiple
            hidden
            onChange={handleInputChange}
          />

          <div
            className={`flex h-20 w-20 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-950/40 shadow-[0_0_28px_rgba(59,130,246,0.3)] transition-transform duration-200 ${
              isDragging ? "scale-110" : ""
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 shadow-[0_0_18px_rgba(59,130,246,0.55)]">
              <UploadCloud
                size={24}
                strokeWidth={2.25}
                className="text-[#0B0F19]"
              />
            </div>
          </div>

          <div>
            <p className="text-xl font-semibold text-slate-100 sm:text-2xl">
              Drag &amp; drop your images here, or{" "}
              <span className="text-blue-400 underline decoration-blue-400/70 underline-offset-4 transition-colors duration-200 hover:text-blue-300 hover:decoration-blue-300">
                click to browse
              </span>
            </p>
            <p id={`${inputId}-hint`} className="mt-2 text-sm text-slate-400">
              Supports JPG, PNG, WebP — Max 25MB — up to 5 files
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {FORMAT_CHIPS[mode].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-slate-700/50 bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-300"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Sparkle
        aria-hidden
        size={20}
        className="pointer-events-none absolute -bottom-2 right-2 text-white/80 drop-shadow-[0_0_10px_rgba(255,255,255,0.9)]"
      />
    </div>
  );
}
