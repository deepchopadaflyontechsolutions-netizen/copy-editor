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
import {
  Captions,
  Crop,
  Eraser,
  FileArchive,
  Film,
  ImageIcon,
  Layers,
  Loader2,
  Palette,
  Plus,
  Scissors,
  UploadCloud,
  Video,
  X,
} from "lucide-react";
import {
  ACCEPT_BY_KIND,
  validateMediaFile,
  type MediaKind,
} from "@/lib/landing/mediaValidation";
import { saveAsset } from "@/lib/landing/assetStore";
import Toast from "./Toast";

const MAX_ITEMS = 5;

const MODE_TABS: { key: MediaKind; label: string; Icon: typeof ImageIcon }[] = [
  { key: "image", label: "Image Mode", Icon: ImageIcon },
  { key: "video", label: "Video Mode", Icon: Video },
];

const IMAGE_QUICK_ACTIONS = [
  { label: "Crop & Resize", Icon: Crop, href: "/crop-resize" },
  { label: "Remove Background", Icon: Layers, href: "/background-remover" },
  { label: "Watermark Remover", Icon: Eraser, href: "/watermark-remover" },
  { label: "Color Grade", Icon: Palette, href: "/color-grade", soon: true },
];

const VIDEO_QUICK_ACTIONS = [
  { label: "Trim & Cut", Icon: Scissors, href: "/trim-cut", soon: true },
  { label: "Compress", Icon: FileArchive, href: "/compress-video", soon: true },
  { label: "Add Subtitles", Icon: Captions, href: "/add-subtitles", soon: true },
];

const MODE_ACCENT = {
  image: {
    border: "border-blue-500/80",
    glow: "shadow-[0_0_35px_rgba(59,130,246,0.3)]",
    glowDrag: "shadow-[0_0_50px_rgba(59,130,246,0.55)]",
    idleGlow: "shadow-[0_0_25px_rgba(59,130,246,0.3)]",
    bgGlow: "bg-[radial-gradient(circle_at_50%_38%,rgba(37,99,235,0.22),transparent_60%)]",
    iconBox: "bg-blue-600/20 border border-blue-500/30",
    iconGlow: "shadow-[0_0_24px_rgba(59,130,246,0.35)]",
    text: "text-blue-400 underline decoration-blue-400 underline-offset-4",
    pillActive: "scale-105 bg-blue-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]",
  },
  video: {
    border: "border-purple-500/80",
    glow: "shadow-[0_0_35px_rgba(168,85,247,0.3)]",
    glowDrag: "shadow-[0_0_50px_rgba(168,85,247,0.55)]",
    idleGlow: "shadow-[0_0_25px_rgba(168,85,247,0.3)]",
    bgGlow: "bg-[radial-gradient(circle_at_50%_38%,rgba(168,85,247,0.22),transparent_60%)]",
    iconBox: "bg-purple-600/20 border border-purple-500/30",
    iconGlow: "shadow-[0_0_24px_rgba(168,85,247,0.35)]",
    text: "text-purple-400 underline decoration-purple-400 underline-offset-4",
    pillActive: "scale-105 bg-purple-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)]",
  },
} as const satisfies Record<MediaKind, Record<string, string>>;

/** Neon blue-to-pink gradient stroke shown on the empty dropzone's hover/drag-over state. */
const HOVER_GRADIENT_BORDER = "linear-gradient(90deg, #3b82f6, #6366f1, #ec4899) 1";
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

export default function StudioPanel() {
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const mediaListRef = useRef<MediaItem[]>([]);

  const [mode, setMode] = useState<MediaKind>("image");
  const [isDragActive, setIsDragActive] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeItem = mediaList.find((item) => item.id === activeId) ?? null;
  const hasMedia = mediaList.length > 0;

  useEffect(() => {
    mediaListRef.current = mediaList;
  }, [mediaList]);

  useEffect(() => {
    return () => {
      mediaListRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
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
          id: crypto.randomUUID(),
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
      setMediaList((prev) => [...prev, ...accepted]);
      setActiveId((prev) => prev ?? accepted[0].id);
    },
    [isBusy, mode, mediaList.length, showError],
  );

  const handleModeChange = useCallback(
    (next: MediaKind) => {
      if (isBusy || next === mode) return;
      setMediaList((prev) => {
        prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        return [];
      });
      setActiveId(null);
      setMode(next);
    },
    [isBusy, mode],
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
      setMediaList((prev) => prev.filter((entry) => entry.id !== id));
      setActiveId((prev) => {
        if (prev !== id) return prev;
        const remaining = mediaList.filter((entry) => entry.id !== id);
        return remaining[0]?.id ?? null;
      });
    },
    [mediaList],
  );

  const handleClearAll = useCallback(() => {
    setMediaList((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
    setActiveId(null);
  }, []);

  const handleImageLoad = useCallback((id: string, img: HTMLImageElement) => {
    setMediaList((prev) =>
      prev.map((item) =>
        item.id === id && item.width == null
          ? { ...item, width: img.naturalWidth, height: img.naturalHeight }
          : item,
      ),
    );
  }, []);

  const handleVideoLoad = useCallback((id: string, video: HTMLVideoElement) => {
    setMediaList((prev) =>
      prev.map((item) =>
        item.id === id && item.width == null
          ? { ...item, width: video.videoWidth, height: video.videoHeight }
          : item,
      ),
    );
  }, []);

  const handleQuickAction = useCallback(
    async (href: string, soon?: boolean) => {
      if (!activeItem || soon || isBusy) return;
      setIsBusy(true);
      try {
        const assetId = crypto.randomUUID();
        await saveAsset(assetId, activeItem.file);
        router.push(`${href}?assetId=${assetId}`);
      } catch {
        setIsBusy(false);
        showError("Couldn't prepare that file. Please try again.");
      }
    },
    [activeItem, isBusy, router, showError],
  );

  const cardClass = (disabled: boolean) =>
    `flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all ${
      disabled
        ? "cursor-not-allowed border-slate-800 bg-slate-900/40 opacity-50"
        : "cursor-pointer border-slate-700 bg-slate-800/60 hover:border-blue-500/50 hover:bg-blue-600/10"
    }`;

  const accent = MODE_ACCENT[mode];

  const showHoverGradient = !hasMedia && (isDragActive || isHovering);

  return (
    <div className={`relative mx-auto w-full max-w-4xl ${hasMedia ? "pb-16" : "pt-16"}`}>
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        style={showHoverGradient ? { borderImage: HOVER_GRADIENT_BORDER, borderStyle: "solid" } : undefined}
        className={`relative h-[420px] w-full rounded-3xl border-2 backdrop-blur-md transition-all duration-300 ease-in-out ${
          hasMedia ? "bg-slate-950/70" : "bg-slate-950"
        } ${accent.border} ${
          hasMedia
            ? isDragActive || isHovering
              ? accent.glowDrag
              : accent.glow
            : showHoverGradient
              ? HOVER_GLOW
              : accent.idleGlow
        }`}
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

        <div className="relative h-full w-full overflow-hidden rounded-[22px]">
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
              className={`relative flex h-full flex-col items-center justify-center gap-4 overflow-hidden p-6 text-center outline-none ${
                isBusy ? "cursor-progress opacity-70" : "cursor-pointer"
              }`}
            >
              <div aria-hidden className={`pointer-events-none absolute inset-0 ${accent.bgGlow}`} />

              <div className="relative flex h-16 w-16 items-center justify-center">
                <div
                  aria-hidden
                  className={`absolute inset-0 animate-pulse rounded-2xl ${accent.iconGlow}`}
                />
                <div
                  className={`relative flex h-16 w-16 items-center justify-center rounded-2xl text-white ${accent.iconBox} ${accent.iconGlow}`}
                >
                {isBusy ? (
                  <Loader2 size={28} className="animate-spin" />
                ) : mode === "image" ? (
                  <UploadCloud size={28} />
                ) : (
                  <Film size={28} />
                )}
                </div>
              </div>

              <div className="relative">
                <p className="text-base font-semibold text-white">
                  {isBusy ? (
                    "Loading…"
                  ) : mode === "image" ? (
                    <>
                      Drag &amp; drop your <span className={accent.text}>images</span> here, or{" "}
                      <span className={accent.text}>click to browse</span>
                    </>
                  ) : (
                    <>
                      Drag &amp; drop your <span className={accent.text}>videos</span> here, or{" "}
                      <span className={accent.text}>click to browse</span>
                    </>
                  )}
                </p>

                <p id={`${inputId}-hint`} className="mt-1.5 text-xs tracking-wide text-slate-500">
                  {SUBTEXT_BY_KIND[mode]}
                </p>
              </div>

              <div className="relative flex flex-wrap items-center justify-center gap-1.5">
                {FORMAT_CHIPS_BY_KIND[mode].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-[11px] font-medium text-slate-300"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid h-full w-full grid-cols-1 divide-y divide-slate-800/80 md:grid-cols-12 md:divide-x md:divide-y-0">
            {/* Left pane — canvas + carousel */}
            <div className="relative flex h-full w-full min-h-0 flex-col justify-between overflow-hidden bg-black/40 p-4 md:col-span-7">
              {activeItem && (
                <div className="absolute left-3 top-3 z-10 rounded-md border border-slate-700/60 bg-slate-900/80 px-2.5 py-1 font-mono text-[10px] text-slate-300 backdrop-blur-md">
                  {activeItem.width && activeItem.height ? `${activeItem.width} × ${activeItem.height} • ` : ""}
                  {formatLabel(activeItem.file)}
                </div>
              )}

              <button
                type="button"
                aria-label="Clear all"
                onClick={handleClearAll}
                className="absolute right-3 top-3 z-10 rounded-lg border border-slate-700/60 bg-slate-900/80 p-1.5 text-slate-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
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
                className="custom-scrollbar flex w-full items-center gap-2 overflow-x-auto border-t border-slate-800/60 pt-2"
              >
                {mediaList.map((item) => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Show ${item.file.name}`}
                    aria-pressed={item.id === activeId}
                    onClick={() => setActiveId(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setActiveId(item.id);
                      }
                    }}
                    className={`relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg border outline-none ${
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
                  </div>
                ))}

                {mediaList.length < MAX_ITEMS && (
                  <button
                    type="button"
                    onClick={openFileDialog}
                    disabled={isBusy}
                    aria-label="Add more files"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-700 text-slate-500 transition-colors hover:border-blue-500/50 hover:text-blue-400 disabled:opacity-50"
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
                  Edit Tools
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(mode === "image" ? IMAGE_QUICK_ACTIONS : VIDEO_QUICK_ACTIONS).map((action) => {
                    const disabled = !activeItem || isBusy || Boolean(action.soon);
                    return (
                      <button
                        key={action.label}
                        type="button"
                        onClick={() => handleQuickAction(action.href, action.soon)}
                        disabled={disabled}
                        title={action.soon ? "Coming soon" : undefined}
                        className={cardClass(disabled)}
                      >
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            disabled ? "bg-slate-800 text-slate-500" : "bg-blue-600/15 text-blue-400"
                          }`}
                        >
                          {isBusy && !action.soon ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <action.Icon size={15} />
                          )}
                        </span>
                        <span className="text-[11px] font-medium leading-tight text-white">
                          {action.label}
                        </span>
                        {action.soon && (
                          <span className="rounded-full bg-slate-700/60 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-slate-400">
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

      {/* Floating mode switcher pill — above the dropzone before upload, below the card once media is loaded */}
      <div
        className={`absolute left-1/2 z-20 -translate-x-1/2 ${hasMedia ? "bottom-0" : "top-0"}`}
      >
        <div
          title={hasMedia ? "Clear your files to switch mode" : undefined}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/90 p-1.5 shadow-2xl backdrop-blur-xl"
        >
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
                    disabled={hasMedia}
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
                    className="pointer-events-none absolute -top-12 left-1/2 flex -translate-x-1/2 translate-y-1 scale-95 items-center gap-1.5 whitespace-nowrap rounded-lg border border-white/10 bg-slate-900/95 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-xl backdrop-blur-md transition-all duration-200 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100"
                  >
                    <Icon size={12} />
                    {label}
                    <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-white/10 bg-slate-900" />
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
