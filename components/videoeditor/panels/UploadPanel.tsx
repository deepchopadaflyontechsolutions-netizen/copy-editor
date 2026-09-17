"use client";

import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { motion } from "framer-motion";
import { Film, Loader2, Trash2, UploadCloud, Video as VideoIcon } from "lucide-react";
import { useVideoEditor } from "@/context/VideoEditorContext";
import PanelSection from "@/components/creativeflow/panels/PanelSection";
import { button, cardRadius, text } from "@/components/creativeflow/ui";

const ACCENT_BADGE = "flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50/15 text-slate-50 ring-1 ring-inset ring-slate-50/25";

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Single-clip editor: exactly one video is ever loaded. Picking or dropping a new file
 * replaces whatever's currently loaded (VideoEditorContext.addClips handles the swap), so this
 * panel just shows the one loaded clip's name/duration/size and a way to upload/replace/remove
 * it — no per-clip list or sequence management. */
export default function UploadPanel() {
  const { clips, isLoading, addClips, clearProject } = useVideoEditor();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const clip = clips[0] ?? null;
  const hasVideo = clip !== null;

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      addClips(event.target.files ?? []);
      event.target.value = "";
    },
    [addClips],
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!Array.from(event.dataTransfer.types).includes("Files")) return;
    event.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragActive(false), []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragActive(false);
      addClips(event.dataTransfer.files ?? []);
    },
    [addClips],
  );

  return (
    <PanelSection
      title="Upload"
      actions={<span className={ACCENT_BADGE}><UploadCloud size={13} /></span>}
      fill
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        hidden
        disabled={isLoading}
        onChange={handleChange}
        aria-label="Upload video"
      />

      <div
        className="relative flex flex-1 min-h-0 flex-col"
        onDragEnter={handleDragOver}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={`relative mb-4 mt-1 shrink-0 transition-opacity duration-200 ${isDragActive ? "opacity-30" : ""}`}>
          <motion.button
            type="button"
            disabled={isLoading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => !isLoading && fileInputRef.current?.click()}
            className={`w-full outline-none disabled:opacity-60 ${button.primary} ${isLoading ? "cursor-progress" : "cursor-pointer"}`}
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} strokeWidth={1.75} />}
            {isLoading ? "Loading clip…" : hasVideo ? "Replace video" : "Upload Video"}
          </motion.button>
        </div>

        {hasVideo && clip && (
          <div className="mb-4 flex flex-col gap-2">
            <div className={`flex items-start gap-3 rounded-lg border border-neutral-800/70 bg-neutral-900/40 p-2.5 ${cardRadius}`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-800/70 text-neutral-300 ring-1 ring-inset ring-white/10">
                <Film size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{clip.fileName}</p>
                <p className={text.helper}>
                  {formatDuration(clip.trimEnd - clip.trimStart)}
                  {clip.file.size ? ` · ${formatBytes(clip.file.size)}` : ""}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={clearProject}
              className="mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800/60 py-2 text-sm font-semibold text-neutral-300 transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 size={13} />
              Remove video
            </button>
          </div>
        )}

        {!hasVideo && !isDragActive && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-800/60 ring-1 ring-inset ring-white/15">
              <VideoIcon size={28} strokeWidth={1.75} className="text-white" />
            </div>
            <p className="text-sm font-semibold leading-snug text-neutral-300">
              Your uploaded video
              <br />
              will appear here
            </p>
            <p className={text.helper}>MP4, WebM, or MOV</p>
          </div>
        )}

        {isDragActive && (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/30 bg-neutral-950/70 backdrop-blur-sm">
            <UploadCloud size={28} className="text-white" />
            <p className="text-sm font-semibold text-white">Drop video to upload</p>
          </div>
        )}
      </div>
    </PanelSection>
  );
}
