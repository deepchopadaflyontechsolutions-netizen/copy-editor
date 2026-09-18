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
  Film,
  Images,
  Loader2,
  Music,
  Plus,
  Scissors,
  SlidersHorizontal,
  Stamp,
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

// Image mode only ever hands one file off to a quick action (see handleQuickAction, which
// only ever reads `activeItem`), so there's no real use for picking among several images —
// video keeps its own multi-clip cap since the video editor itself is a multi-clip timeline.
const MAX_ITEMS_BY_KIND: Record<MediaKind, number> = { image: 1, video: 5 };

const MODE_TABS: { key: MediaKind; label: string; Icon: typeof Images }[] = [
  { key: "image", label: "Image Mode", Icon: Images },
  { key: "video", label: "Video Mode", Icon: Clapperboard },
];

const TOOL_ACCENTS = {
  blue: {
    icon: "bg-white/10 text-neutral-200 group-hover:bg-white group-hover:text-black",
    hover: "hover:border-neutral-600 hover:bg-white/[0.04]",
  },
  purple: {
    icon: "bg-white/10 text-neutral-200 group-hover:bg-white group-hover:text-black",
    hover: "hover:border-neutral-600 hover:bg-white/[0.04]",
  },
  emerald: {
    icon: "bg-white/10 text-neutral-200 group-hover:bg-white group-hover:text-black",
    hover: "hover:border-neutral-600 hover:bg-white/[0.04]",
  },
  amber: {
    icon: "bg-white/10 text-neutral-200 group-hover:bg-white group-hover:text-black",
    hover: "hover:border-neutral-600 hover:bg-white/[0.04]",
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

// Mirrors the real editor's own dock (RightPanel.tsx: Upload/Adjust/Crop/Mark) instead of a
// separate set of AI-styled marketing names — "Upload" is skipped since the user's already
// past that step by the time this list shows. Each one routes into the same unified editor
// the dock tab does, not a standalone page for a feature that isn't actually there.
const IMAGE_QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Crop & Resize",
    description: "Aspect ratio, dimensions & rotate",
    Icon: Crop,
    href: "/editor?tool=crop&panel=resize",
    accent: "blue",
  },
  {
    label: "Adjust",
    description: "Presets, color & light controls",
    Icon: SlidersHorizontal,
    href: "/editor?panel=adjust",
    accent: "purple",
  },
  {
    label: "Mark",
    description: "Add a text or logo watermark",
    Icon: Stamp,
    href: "/editor?panel=watermark",
    accent: "emerald",
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
    borderBg: "bg-neutral-700",
    idleGlow: "shadow-lg shadow-black/30",
    bgGlow: "bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.05),transparent_60%)]",
    iconBox: "bg-neutral-800 border border-neutral-700",
    iconGlow: "shadow-lg shadow-black/30",
    text: "text-white underline decoration-white/50 underline-offset-4 transition-colors duration-200 hover:text-neutral-300",
    pillActive: "scale-105 bg-white text-black shadow-md shadow-black/20",
    tooltipBorder: "border-neutral-700",
    tooltipGlow: "shadow-2xl shadow-black/40",
    tooltipIconBox: "bg-white/10 text-white",
  },
  video: {
    borderBg: "bg-neutral-700",
    idleGlow: "shadow-lg shadow-black/30",
    bgGlow: "bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.05),transparent_60%)]",
    iconBox: "bg-neutral-800 border border-neutral-700",
    iconGlow: "shadow-lg shadow-black/30",
    text: "text-white underline decoration-white/50 underline-offset-4 transition-colors duration-200 hover:text-neutral-300",
    pillActive: "scale-105 bg-white text-black shadow-md shadow-black/20",
    tooltipBorder: "border-neutral-700",
    tooltipGlow: "shadow-2xl shadow-black/40",
    tooltipIconBox: "bg-white/10 text-white",
  },
} as const satisfies Record<MediaKind, Record<string, string>>;

/** Subtle white stroke shown on the empty dropzone's hover/drag-over state.
 *  Applied as a background (not border-image) so the rounded corners are preserved. */
const HOVER_GRADIENT_BORDER_BG = "bg-neutral-500";
const HOVER_GLOW = "shadow-xl shadow-black/40";

const SUBTEXT_BY_KIND: Record<MediaKind, string> = {
  image: "Supports JPG, PNG, WebP, GIF — Max 25MB",
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
  // Which quick action is actually preparing its handoff, so only *that* card swaps to a
  // spinner — `isBusy` alone doubled as "which one is loading" before, which made every quick
  // action card spin at once no matter which single one was clicked.
  const [loadingHref, setLoadingHref] = useState<string | null>(null);
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
      const maxItems = MAX_ITEMS_BY_KIND[mode];

      // Single-item modes (image) replace whatever's already loaded instead of rejecting the
      // drop — there's no tray to add alongside, so "drop a new one" reads as "swap it in".
      if (maxItems === 1) {
        const result = validateMediaFile(files[0], mode);
        if (!result.ok) {
          showError(result.message);
          return;
        }
        mediaList.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        const accepted: MediaItem = {
          id: generateUUID(),
          file: files[0],
          kind: mode,
          previewUrl: URL.createObjectURL(files[0]),
          width: null,
          height: null,
        };
        setMediaByMode((prev) => ({ ...prev, [mode]: [accepted] }));
        setActiveIdByMode((prev) => ({ ...prev, [mode]: accepted.id }));
        return;
      }

      const room = maxItems - mediaList.length;
      if (room <= 0) {
        showError(`You can add up to ${maxItems} files.`);
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
          `Only added ${accepted.length} file${accepted.length === 1 ? "" : "s"} — the ${maxItems}-file limit was reached.`,
        );
      }
      setMediaByMode((prev) => ({ ...prev, [mode]: [...prev[mode], ...accepted] }));
      setActiveIdByMode((prev) => ({ ...prev, [mode]: prev[mode] ?? accepted[0].id }));
    },
    [isBusy, mode, mediaList, showError],
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
      setLoadingHref(href);
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
        setLoadingHref(null);
        showError("Couldn't prepare that file. Please try again.");
      }
    },
    [activeItem, isBusy, router, showError],
  );

  const cardClass = (disabled: boolean, toolAccent: ToolAccent) =>
    `group flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all duration-200 ${
      disabled
        ? "cursor-not-allowed border-neutral-800 bg-neutral-900/40 opacity-50"
        : `cursor-pointer border-neutral-700 bg-neutral-800/40 hover:scale-[1.02] ${TOOL_ACCENTS[toolAccent].hover}`
    }`;

  const accent = MODE_ACCENT[mode];

  const showHoverGradient = isDragActive || isHovering;

  return (
    <div className="relative mx-auto w-full max-w-4xl pt-17.75">
      {/* Ambient soft glow behind the dropzone card */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-17.75 -z-10 h-[420px] rounded-[32px] bg-white/[0.03] blur-2xl"
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
          multiple={MAX_ITEMS_BY_KIND[mode] > 1}
          hidden
          disabled={isBusy}
          onChange={handleInputChange}
        />

        <div
          className={`relative h-full w-full overflow-hidden rounded-[calc(1.5rem-2px)] backdrop-blur-md ${
            hasMedia ? "bg-neutral-950/70" : "bg-neutral-950"
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
                  <p className="text-xl font-semibold text-neutral-100 sm:text-2xl">
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

                  <p id={`${inputId}-hint`} className="mt-2 text-sm text-neutral-400">
                    {SUBTEXT_BY_KIND[mode]}
                  </p>
                </div>

                <div className="relative flex flex-wrap items-center justify-center gap-2">
                  {FORMAT_CHIPS_BY_KIND[mode].map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-neutral-700 bg-neutral-800/60 px-3 py-1 text-xs font-medium text-neutral-300 transition-transform duration-200 hover:-translate-y-1 hover:border-neutral-500 hover:shadow-sm"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid h-full w-full grid-cols-1 divide-y divide-neutral-800 md:grid-cols-12 md:divide-x md:divide-y-0">
            {/* Left pane — canvas + carousel */}
            <div className="relative flex h-full w-full min-h-0 flex-col justify-between overflow-hidden bg-black/40 p-4 md:col-span-7">
              {activeItem && (
                <div className="absolute left-3 top-3 z-10 rounded-md border border-neutral-700 bg-neutral-900/80 px-2.5 py-1 text-[10px] text-neutral-300 backdrop-blur-md">
                  {activeItem.width && activeItem.height ? `${activeItem.width} × ${activeItem.height} • ` : ""}
                  {formatLabel(activeItem.file)}
                </div>
              )}

              <button
                type="button"
                aria-label="Clear all"
                onClick={handleClearAll}
                className="absolute right-3 top-3 z-10 rounded-lg border border-neutral-700 bg-neutral-900/80 p-1.5 text-neutral-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
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

              {/* Thumbnail tray — only meaningful once more than one item can be loaded at a
                  time (video). Single-item modes (image) have nothing to switch between, so
                  the strip and its "+" add button are just noise there. */}
              {MAX_ITEMS_BY_KIND[mode] > 1 && (
                <div
                  data-accent={mode}
                  className="custom-scrollbar flex w-full items-center gap-2 overflow-x-auto border-t border-neutral-800 pt-2"
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
                      className={`relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg border outline-none ${
                        item.id === activeId
                          ? "border-white ring-2 ring-white/30"
                          : "border-neutral-700 hover:border-neutral-600"
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
                        className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-bl bg-black/70 text-neutral-200 transition-colors hover:bg-red-500/80"
                      >
                        <X size={10} />
                      </button>
                    </motion.div>
                  ))}

                  {mediaList.length < MAX_ITEMS_BY_KIND[mode] && (
                    <button
                      type="button"
                      onClick={openFileDialog}
                      disabled={isBusy}
                      aria-label="Add more files"
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-neutral-700 text-neutral-500 transition-colors hover:border-neutral-500 hover:text-neutral-200 disabled:opacity-50"
                    >
                      <Plus size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right pane — edit controls */}
            <div
              data-accent={mode}
              className="custom-scrollbar flex h-full w-full flex-col overflow-y-auto bg-neutral-900/90 p-5 md:col-span-5"
            >
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
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
                            disabled ? "bg-neutral-800 text-neutral-500" : TOOL_ACCENTS[action.accent].icon
                          }`}
                        >
                          {loadingHref === action.href ? (
                            <Loader2 size={17} className="animate-spin" />
                          ) : (
                            <action.Icon size={17} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold leading-tight text-white">
                            {action.label}
                          </span>
                          <span className="mt-0.5 block truncate text-xs leading-tight text-neutral-400">
                            {action.description}
                          </span>
                        </span>
                        {action.soon && (
                          <span className="animate-pulse shrink-0 rounded-full bg-neutral-700/60 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-neutral-400">
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
        <div className="flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/90 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl">
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
                        : "text-neutral-500 hover:scale-105 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon size={18} />
                  </button>

                  <div
                    aria-hidden
                    className={`pointer-events-none absolute -top-14 left-1/2 flex -translate-x-1/2 translate-y-1 scale-95 items-center gap-2 whitespace-nowrap rounded-xl border bg-neutral-900/95 py-1.5 pl-1.5 pr-3.5 text-xs font-semibold text-neutral-100 opacity-0 backdrop-blur-md transition-all duration-200 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 ${MODE_ACCENT[key].tooltipBorder} ${MODE_ACCENT[key].tooltipGlow}`}
                  >
                    <span className={`flex h-5 w-5 items-center justify-center rounded-md ${MODE_ACCENT[key].tooltipIconBox}`}>
                      <Icon size={12} />
                    </span>
                    {label}
                    <span
                      className={`absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r bg-neutral-900 ${MODE_ACCENT[key].tooltipBorder}`}
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
