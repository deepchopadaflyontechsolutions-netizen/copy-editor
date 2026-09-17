"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Clapperboard,
  CloudUpload,
  Crop,
  Eraser,
  Film,
  Images,
  Layers,
  Loader2,
  Music,
  Palette,
  Plus,
  Scissors,
  X,
} from "lucide-react";
import {
  ACCEPT_BY_KIND,
  validateMediaFile,
  type MediaKind,
} from "@/lib/landing/mediaValidation";
import { saveAsset } from "@/lib/landing/assetStore";
import { generateUUID } from "@/lib/landing/uuid";
import Toast from "./Toast";

const MAX_ITEMS = 5;

const MODE_TABS: { key: MediaKind; label: string; Icon: typeof Images }[] = [
  { key: "image", label: "Image Mode", Icon: Images },
  { key: "video", label: "Video Mode", Icon: Clapperboard },
];

const TOOL_ACCENTS = {
  blue: {
    icon: "bg-blue-500/15 text-blue-400 group-hover:bg-blue-500 group-hover:text-white",
    hover: "hover:border-blue-500/50 hover:bg-blue-500/[0.06] hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]",
  },
  purple: {
    icon: "bg-purple-500/15 text-purple-400 group-hover:bg-purple-500 group-hover:text-white",
    hover: "hover:border-purple-500/50 hover:bg-purple-500/[0.06] hover:shadow-[0_0_15px_rgba(168,85,247,0.2)]",
  },
  emerald: {
    icon: "bg-emerald-500/15 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white",
    hover: "hover:border-emerald-500/50 hover:bg-emerald-500/[0.06] hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]",
  },
  amber: {
    icon: "bg-amber-500/15 text-amber-400 group-hover:bg-amber-500 group-hover:text-white",
    hover: "hover:border-amber-500/50 hover:bg-amber-500/[0.06] hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]",
  },
} as const;

type ToolAccent = keyof typeof TOOL_ACCENTS;

interface QuickAction {
  label: string;
  description: string;
  Icon: typeof Crop;
  href: string;
  accent: ToolAccent;
  soon?: boolean;
}

const IMAGE_QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Crop & Resize",
    description: "Adjust dimensions and aspect ratio",
    Icon: Crop,
    href: "/crop-resize",
    accent: "blue",
  },
  {
    label: "Remove Background",
    description: "Precision subject cutout",
    Icon: Layers,
    href: "/background-remover",
    accent: "purple",
  },
  {
    label: "Watermark Remover",
    description: "Clean up unwanted overlays",
    Icon: Eraser,
    href: "/watermark-remover",
    accent: "emerald",
  },
  {
    label: "Color Grade",
    description: "Fine-tune tone, contrast & hue",
    Icon: Palette,
    href: "/color-grade",
    accent: "amber",
    soon: true,
  },
];

const VIDEO_QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Trim & Cut",
    description: "Precision timeline editing",
    Icon: Scissors,
    href: "/video-editor",
    accent: "blue",
  },
  {
    label: "Crop",
    description: "Reframe to any aspect ratio",
    Icon: Crop,
    href: "/video-editor?panel=frame",
    accent: "purple",
  },
  {
    label: "Background Audio",
    description: "Layer music underneath your clip",
    Icon: Music,
    href: "/video-editor?panel=audio",
    accent: "emerald",
  },
];

const MODE_ACCENT = {
  image: {
    borderBg: "bg-blue-500/40",
    idleGlow: "shadow-[0_0_22px_rgba(59,130,246,0.22)]",
    bgGlow: "bg-[radial-gradient(circle_at_50%_38%,rgba(37,99,235,0.22),transparent_60%)]",
    iconBox: "bg-gradient-to-br from-blue-500 to-blue-600 border-2 border-blue-400/40",
    iconGlow: "shadow-[0_0_16px_rgba(59,130,246,0.4)]",
    text: "text-blue-400 underline decoration-blue-400/70 underline-offset-4 transition-colors duration-200 hover:text-blue-300",
    pillActive: "scale-105 bg-blue-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]",
    tooltipBorder: "border-blue-500/40",
    tooltipGlow: "shadow-[0_12px_32px_-8px_rgba(59,130,246,0.5)]",
    tooltipIconBox: "bg-blue-500/15 text-blue-400",
  },
  video: {
    borderBg: "bg-purple-500/40",
    idleGlow: "shadow-[0_0_22px_rgba(168,85,247,0.22)]",
    bgGlow: "bg-[radial-gradient(circle_at_50%_38%,rgba(168,85,247,0.22),transparent_60%)]",
    iconBox: "bg-gradient-to-br from-purple-500 to-purple-600 border-2 border-purple-400/40",
    iconGlow: "shadow-[0_0_16px_rgba(168,85,247,0.4)]",
    text: "text-purple-400 underline decoration-purple-400/70 underline-offset-4 transition-colors duration-200 hover:text-purple-300",
    pillActive: "scale-105 bg-purple-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)]",
    tooltipBorder: "border-purple-500/40",
    tooltipGlow: "shadow-[0_12px_32px_-8px_rgba(168,85,247,0.5)]",
    tooltipIconBox: "bg-purple-500/15 text-purple-400",
  },
} as const satisfies Record<MediaKind, Record<string, string>>;

/** Neon blue-to-pink gradient stroke shown on the empty dropzone's hover/drag-over state.
 *  Applied as a background (not border-image) so the rounded corners are preserved. */
const HOVER_GRADIENT_BORDER_BG = "bg-gradient-to-r from-blue-500 via-indigo-500 to-pink-500";
const HOVER_GLOW = "shadow-[0_0_40px_rgba(59,130,246,0.35),0_0_55px_rgba(236,72,153,0.28)]";

const SUBTEXT_BY_KIND: Record<MediaKind, string> = {
  image: "Supports JPG, PNG, WebP, GIF — Max 25MB — up to 5 files",
  video: "Supports MP4, MOV, WebM, AVI — Max 500MB",
};

const FORMAT_CHIPS_BY_KIND: Record<MediaKind, string[]> = {
  image: ["JPG", "PNG", "WebP", "GIF"],
  video: ["MP4", "MOV", "WebM", "4K"],
};

type MediaItem = {
  id: string;
  file: File;
  kind: MediaKind;
  previewUrl: string;
  width: number | null;
  height: number | null;
};

function formatLabel(file: File): string {
  const subtype = file.type.split("/")[1];
  return subtype ? subtype.toUpperCase() : "FILE";
}

export default function StudioPanel({
  mode,
  onModeChange,
}: {
  mode: MediaKind;
  onModeChange: (next: MediaKind) => void;
}) {
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const mediaByModeRef = useRef<Record<MediaKind, MediaItem[]>>({ image: [], video: [] });

  const [isDragActive, setIsDragActive] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  // Each mode keeps its own uploaded files and selection, so switching
  // modes never discards what was already picked — switching back just
  // shows that mode's tray again.
  const [mediaByMode, setMediaByMode] = useState<Record<MediaKind, MediaItem[]>>({
    image: [],
    video: [],
  });
  const [activeIdByMode, setActiveIdByMode] = useState<Record<MediaKind, string | null>>({
    image: null,
    video: null,
  });
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaList = mediaByMode[mode];
  const activeId = activeIdByMode[mode];
  const activeItem = mediaList.find((item) => item.id === activeId) ?? null;
  const hasMedia = mediaList.length > 0;

  useEffect(() => {
    mediaByModeRef.current = mediaByMode;
  }, [mediaByMode]);

  useEffect(() => {
    return () => {
      Object.values(mediaByModeRef.current)
        .flat()
        .forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const showError = useCallback((message: string) => {
    setErrorMessage(message);
    window.setTimeout(() => setErrorMessage(null), 5000);
  }, []);

  const handleFiles = useCallback(
    (files: File[]) => {
      if (!files.length || isBusy) return;
      const room = MAX_ITEMS - mediaList.length;
      if (room <= 0) {
        showError(`You can add up to ${MAX_ITEMS} files.`);
        return;
      }

      const accepted: MediaItem[] = [];
      for (const file of files.slice(0, room)) {
        const result = validateMediaFile(file, mode);
        if (!result.ok) {
          showError(result.message);
          continue;
        }
        accepted.push({
          id: generateUUID(),
          file,
          kind: mode,
          previewUrl: URL.createObjectURL(file),
          width: null,
          height: null,
        });
      }

      if (!accepted.length) return;
      if (files.length > room) {
        showError(
          `Only added ${accepted.length} file${accepted.length === 1 ? "" : "s"} — the ${MAX_ITEMS}-file limit was reached.`,
        );
      }
      setMediaByMode((prev) => ({ ...prev, [mode]: [...prev[mode], ...accepted] }));
      setActiveIdByMode((prev) => ({ ...prev, [mode]: prev[mode] ?? accepted[0].id }));
    },
    [isBusy, mode, mediaList.length, showError],
  );

  const handleModeChange = useCallback(
    (next: MediaKind) => {
      if (isBusy || next === mode) return;
      onModeChange(next);
    },
    [isBusy, mode, onModeChange],
  );

  const openFileDialog = useCallback(() => {
    if (isBusy) return;
    inputRef.current?.click();
  }, [isBusy]);

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      handleFiles(Array.from(event.target.files ?? []));
      event.target.value = "";
    },
    [handleFiles],
  );

  const handleDragEnter = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (isBusy) return;
      dragCounterRef.current += 1;
      setIsDragActive(true);
    },
    [isBusy],
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragCounterRef.current = 0;
      setIsDragActive(false);
      handleFiles(Array.from(event.dataTransfer.files ?? []));
    },
    [handleFiles],
  );

  const handleRemoveItem = useCallback(
    (id: string) => {
      const item = mediaList.find((entry) => entry.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      setMediaByMode((prev) => ({ ...prev, [mode]: prev[mode].filter((entry) => entry.id !== id) }));
      setActiveIdByMode((prev) => {
        if (prev[mode] !== id) return prev;
        const remaining = mediaList.filter((entry) => entry.id !== id);
        return { ...prev, [mode]: remaining[0]?.id ?? null };
      });
    },
    [mediaList, mode],
  );

  const handleClearAll = useCallback(() => {
    mediaList.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setMediaByMode((prev) => ({ ...prev, [mode]: [] }));
    setActiveIdByMode((prev) => ({ ...prev, [mode]: null }));
  }, [mediaList, mode]);

  const handleImageLoad = useCallback(
    (id: string, img: HTMLImageElement) => {
      setMediaByMode((prev) => ({
        ...prev,
        [mode]: prev[mode].map((item) =>
          item.id === id && item.width == null
            ? { ...item, width: img.naturalWidth, height: img.naturalHeight }
            : item,
        ),
      }));
    },
    [mode],
  );

  const handleVideoLoad = useCallback(
    (id: string, video: HTMLVideoElement) => {
      setMediaByMode((prev) => ({
        ...prev,
        [mode]: prev[mode].map((item) =>
          item.id === id && item.width == null
            ? { ...item, width: video.videoWidth, height: video.videoHeight }
            : item,
        ),
      }));
    },
    [mode],
  );

  const handleQuickAction = useCallback(
    async (href: string, soon?: boolean) => {
      if (!activeItem || soon || isBusy) return;
      setIsBusy(true);
      try {
        const assetId = generateUUID();
        await saveAsset(assetId, activeItem.file);
        // Some hrefs already carry their own query string (e.g. "/video-editor?panel=frame"
        // deep-linking straight to a panel) — appending with a bare "?" there would produce a
        // malformed "...?panel=frame?assetId=..." URL.
        const separator = href.includes("?") ? "&" : "?";
        router.push(`${href}${separator}assetId=${assetId}`);
      } catch {
        setIsBusy(false);
        showError("Couldn't prepare that file. Please try again.");
      }
    },
    [activeItem, isBusy, router, showError],
  );

  const cardClass = (disabled: boolean, toolAccent: ToolAccent) =>
    `group flex w-full items-center gap-3 rounded-xl border-2 px-3.5 py-3 text-left transition-all duration-200 ${
      disabled
        ? "cursor-not-allowed border-slate-800 bg-slate-900/40 opacity-50"
        : `cursor-pointer border-slate-700/70 bg-slate-800/40 hover:scale-[1.02] ${TOOL_ACCENTS[toolAccent].hover}`
    }`;

  const accent = MODE_ACCENT[mode];

  const showHoverGradient = isDragActive || isHovering;

  return (
    <div className="relative mx-auto w-full max-w-4xl pt-17.75">
      {/* Ambient pulsing neon glow behind the dropzone card */}
      <div
        aria-hidden
        className={`animate-neon-glow-pulse pointer-events-none absolute inset-x-6 top-17.75 -z-10 h-[420px] rounded-[32px] ${
          mode === "image" ? "bg-blue-500/40" : "bg-purple-500/40"
        }`}
      />

      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={`relative h-[420px] w-full rounded-3xl p-0.5 transition-all duration-300 ease-in-out ${
          showHoverGradient ? HOVER_GRADIENT_BORDER_BG : accent.borderBg
        } ${showHoverGradient ? HOVER_GLOW : accent.idleGlow}`}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT_BY_KIND[mode]}
          multiple
          hidden
          disabled={isBusy}
          onChange={handleInputChange}
        />

        <div
          className={`relative h-full w-full overflow-hidden rounded-[calc(1.5rem-2px)] backdrop-blur-md ${
            hasMedia ? "bg-slate-950/70" : "bg-slate-950"
          }`}
        >
          {mediaList.length === 0 ? (
            <div
              role="button"
              tabIndex={isBusy ? -1 : 0}
              aria-disabled={isBusy}
              aria-describedby={`${inputId}-hint`}
              onClick={openFileDialog}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openFileDialog();
                }
              }}
              className={`relative flex h-full flex-col items-center justify-center gap-6 overflow-hidden px-6 py-10 text-center outline-none ${
                isBusy ? "cursor-progress" : "cursor-pointer"
              }`}
            >
              <div aria-hidden className={`pointer-events-none absolute inset-0 ${accent.bgGlow}`} />

              <div
                aria-hidden
                className={`pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/6 backdrop-blur-2xl ring-1 ring-inset ring-white/15 transition-all duration-200 ${
                  isDragActive ? "opacity-100" : "opacity-0"
                }`}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/10 via-transparent to-transparent"
                />
                <div
                  className={`relative flex h-16 w-16 items-center justify-center rounded-2xl text-white ${accent.iconBox} ${accent.iconGlow}`}
                >
                  {mode === "image" ? <CloudUpload size={28} /> : <Film size={28} />}
                </div>
                <p className="relative text-xl font-semibold text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)]">
                  Drop {mode === "image" ? "images" : "videos"} here
                </p>
              </div>

              <div
                className={`relative flex h-full w-full flex-col items-center justify-center gap-6 transition-opacity duration-200 ${
                  isDragActive ? "opacity-0" : isBusy ? "opacity-70" : "opacity-100"
                }`}
              >
                <div className="relative flex h-20 w-20 items-center justify-center">
                  <motion.div
                    animate={{ scale: isDragActive ? 1.1 : 1 }}
                    whileHover={isBusy ? undefined : { scale: 1.12, y: -3 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    className={`flex h-20 w-20 items-center justify-center rounded-2xl text-white ${accent.iconBox} ${accent.iconGlow}`}
                  >
                    {isBusy ? (
                      <Loader2 size={32} className="animate-spin" />
                    ) : mode === "image" ? (
                      <CloudUpload size={32} />
                    ) : (
                      <Film size={32} />
                    )}
                  </motion.div>
                </div>

                <div className="relative">
                  <p className="text-xl font-semibold text-slate-100 sm:text-2xl">
                    {isBusy ? (
                      "Loading…"
                    ) : mode === "image" ? (
                      <>
                        Drag &amp; drop your images here, or{" "}
                        <span className={accent.text}>click to browse</span>
                      </>
                    ) : (
                      <>
                        Drag &amp; drop your videos here, or{" "}
                        <span className={accent.text}>click to browse</span>
                      </>
                    )}
                  </p>

                  <p id={`${inputId}-hint`} className="mt-2 text-sm text-slate-400">
                    {SUBTEXT_BY_KIND[mode]}
                  </p>
                </div>

                <div className="relative flex flex-wrap items-center justify-center gap-2">
                  {FORMAT_CHIPS_BY_KIND[mode].map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border-2 border-slate-700/50 bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-300 transition-transform duration-200 hover:-translate-y-1 hover:border-blue-400 hover:shadow-sm"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid h-full w-full grid-cols-1 divide-y divide-slate-800/80 md:grid-cols-12 md:divide-x md:divide-y-0">
            {/* Left pane — canvas + carousel */}
            <div className="relative flex h-full w-full min-h-0 flex-col justify-between overflow-hidden bg-black/40 p-4 md:col-span-7">
              {activeItem && (
                <div className="absolute left-3 top-3 z-10 rounded-md border-2 border-slate-700/60 bg-slate-900/80 px-2.5 py-1 text-[10px] text-slate-300 backdrop-blur-md">
                  {activeItem.width && activeItem.height ? `${activeItem.width} × ${activeItem.height} • ` : ""}
                  {formatLabel(activeItem.file)}
                </div>
              )}

              <button
                type="button"
                aria-label="Clear all"
                onClick={handleClearAll}
                className="absolute right-3 top-3 z-10 rounded-lg border-2 border-slate-700/60 bg-slate-900/80 p-1.5 text-slate-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
              >
                <X size={14} />
              </button>

              <div className="flex min-h-0 flex-1 items-center justify-center pt-8">
                {activeItem?.kind === "image" ? (
                  // next/image doesn't support blob: object URLs, so a plain <img> is correct here.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeItem.previewUrl}
                    alt={activeItem.file.name}
                    onLoad={(event) => handleImageLoad(activeItem.id, event.currentTarget)}
                    className="max-h-[280px] max-w-full rounded-lg object-contain shadow-md"
                  />
                ) : activeItem ? (
                  <video
                    key={activeItem.id}
                    src={activeItem.previewUrl}
                    onLoadedMetadata={(event) => handleVideoLoad(activeItem.id, event.currentTarget)}
                    controls
                    playsInline
                    className="max-h-[280px] max-w-full rounded-lg object-contain shadow-md"
                  />
                ) : null}
              </div>

              <div
                data-accent={mode}
                className="custom-scrollbar flex w-full items-center gap-2 overflow-x-auto border-t-2 border-slate-800/60 pt-2"
              >
                {mediaList.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Show ${item.file.name}`}
                    aria-pressed={item.id === activeId}
                    onClick={() => setActiveIdByMode((prev) => ({ ...prev, [mode]: item.id }))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setActiveIdByMode((prev) => ({ ...prev, [mode]: item.id }));
                      }
                    }}
                    className={`relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 outline-none ${
                      item.id === activeId
                        ? "border-blue-500 ring-2 ring-blue-500/30"
                        : "border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    {item.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.previewUrl}
                        alt={item.file.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <video src={item.previewUrl} muted className="h-full w-full object-cover" />
                    )}
                    <button
                      type="button"
                      aria-label={`Remove ${item.file.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemoveItem(item.id);
                      }}
                      className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-bl bg-black/70 text-slate-200 transition-colors hover:bg-red-500/80"
                    >
                      <X size={10} />
                    </button>
                  </motion.div>
                ))}

                {mediaList.length < MAX_ITEMS && (
                  <button
                    type="button"
                    onClick={openFileDialog}
                    disabled={isBusy}
                    aria-label="Add more files"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-slate-700 text-slate-500 transition-colors hover:border-blue-500/50 hover:text-blue-400 disabled:opacity-50"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Right pane — edit controls */}
            <div
              data-accent={mode}
              className="custom-scrollbar flex h-full w-full flex-col overflow-y-auto bg-slate-900/90 p-5 md:col-span-5"
            >
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Select Feature
                </p>
                <div className="flex flex-col gap-2">
                  {(mode === "image" ? IMAGE_QUICK_ACTIONS : VIDEO_QUICK_ACTIONS).map((action) => {
                    const disabled = !activeItem || isBusy || Boolean(action.soon);
                    return (
                      <button
                        key={action.label}
                        type="button"
                        onClick={() => handleQuickAction(action.href, action.soon)}
                        disabled={disabled}
                        title={action.soon ? "Coming soon" : undefined}
                        className={cardClass(disabled, action.accent)}
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${
                            disabled ? "bg-slate-800 text-slate-500" : TOOL_ACCENTS[action.accent].icon
                          }`}
                        >
                          {isBusy && !action.soon ? (
                            <Loader2 size={17} className="animate-spin" />
                          ) : (
                            <action.Icon size={17} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold leading-tight text-white">
                            {action.label}
                          </span>
                          <span className="mt-0.5 block truncate text-xs leading-tight text-slate-400">
                            {action.description}
                          </span>
                        </span>
                        {action.soon && (
                          <span className="animate-pulse shrink-0 rounded-full bg-slate-700/60 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                            Soon
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Floating mode switcher pill — always above the dropzone */}
      <div className="absolute left-1/2 top-1.25 z-20 -translate-x-1/2">
        <div className="flex items-center gap-2 rounded-full border-2 border-white/10 bg-slate-900/90 p-1.5 shadow-2xl backdrop-blur-xl">
          {MODE_TABS.map(({ key, label, Icon }, index) => {
            const active = mode === key;
            return (
              <div key={key} className="contents">
                {index > 0 && <span aria-hidden className="h-1 w-1 shrink-0 rounded-full bg-white/20" />}
                <div className="group relative">
                  <button
                    type="button"
                    aria-label={label}
                    aria-pressed={active}
                    disabled={isBusy}
                    onClick={() => handleModeChange(key)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                      active
                        ? MODE_ACCENT[key].pillActive
                        : "text-slate-500 hover:scale-105 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon size={18} />
                  </button>

                  <div
                    aria-hidden
                    className={`pointer-events-none absolute -top-14 left-1/2 flex -translate-x-1/2 translate-y-1 scale-95 items-center gap-2 whitespace-nowrap rounded-xl border-2 bg-gradient-to-b from-slate-800/95 to-slate-900/95 py-1.5 pl-1.5 pr-3.5 text-xs font-semibold text-slate-100 opacity-0 backdrop-blur-md transition-all duration-200 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 ${MODE_ACCENT[key].tooltipBorder} ${MODE_ACCENT[key].tooltipGlow}`}
                  >
                    <span className={`flex h-5 w-5 items-center justify-center rounded-md ${MODE_ACCENT[key].tooltipIconBox}`}>
                      <Icon size={12} />
                    </span>
                    {label}
                    <span
                      className={`absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b-2 border-r-2 bg-slate-900 ${MODE_ACCENT[key].tooltipBorder}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Toast message={errorMessage} />
    </div>
  );
}
