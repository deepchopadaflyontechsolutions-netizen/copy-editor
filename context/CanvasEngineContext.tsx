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
import {
  type BlendModeKey,
  type DrawingTool,
  type ExportFormat,
  type FilterState,
  type LayerMeta,
} from "@/types/canvasEngine";
import type { CurvePoint } from "@/types/creativeflow";
import type { EditIntentId } from "@/types/editIntent";
import { DEFAULT_CURVE_POINTS } from "@/lib/canvas/selectiveColorMatrix";
import {
  detectMarkFromElement,
  getElementNaturalSize,
  loadHtmlImage,
  reconstructMark,
  type CanvasImageElement,
  type DetectedMark,
} from "@/lib/canvas/autoClean";
import { removeBackground as removeImageBackground } from "@imgly/background-removal";
import { exportScene } from "@/lib/canvasEngine/export";
import { getRenderedSize, nativeToObject, toObject, toScreen } from "@/lib/canvasEngine/geometry";
import { renderLayerThumbnail } from "@/lib/canvasEngine/render";
import type { EngineLayer, HistorySnapshot, Point, Rect, Viewport } from "@/lib/canvasEngine/types";
import { createSnapshot } from "@/lib/canvasEngine/history";
import { clampZoom, easeOutCubic, zoomCentered, ZOOM_STEP } from "@/lib/canvasEngine/viewport";
import {
  CROP_PRESETS,
  commitCrop,
  createCropSession,
  fitCropRectToRatio,
  stepCropHeight,
  stepCropRectPan,
  stepCropResize,
  stepCropWidth,
  stepCropX,
  stepCropY,
  type CropDragState,
  type CropHandleKey,
  type CropPresetKey,
  type CropSessionState,
} from "@/lib/canvasEngine/crop";

const DEFAULT_FILTER_STATE: FilterState = {
  exposure: 50,
  contrast: 50,
  saturation: 50,
  vibrance: 0,
  temperature: 0,
  tint: 0,
  hue: 0,
  exposureAdjust: 0,
  black: 0,
  blendMode: "Normal",
  curvePoints: DEFAULT_CURVE_POINTS,
};

const DEFAULT_DOCUMENT_ASPECT_RATIO = 4 / 3;
const IMAGE_FIT_PADDING = 0.8;
/** The board's starting zoom (and what a "reset view" returns to) — 75% rather than 100%, so the fitted document opens with visible breathing room around it. */
const DEFAULT_ZOOM = 0.75;
const LOGO_MAX_FRACTION = 0.3;
const LOGO_MARGIN = 16;
const NOTICE_DURATION_MS = 2400;
// The model/wasm assets are fetched from imgly's CDN on first use (several
// MB, cached by the browser afterwards) — a slow connection needs real
// headroom before this is treated as "hung" rather than "downloading".
const REMOVE_BACKGROUND_TIMEOUT_MS = 90000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

let layerIdCounter = 0;
function nextLayerId(): string {
  layerIdCounter += 1;
  return `layer-${layerIdCounter}-${Date.now()}`;
}

function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to decode image"));
    img.src = dataUrl;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

interface CanvasEngineContextValue {
  notifyContainerResize: (width: number, height: number) => void;

  hasImage: boolean;
  isImageLoading: boolean;
  documentSize: { width: number; height: number };
  layers: LayerMeta[];
  engineLayers: EngineLayer[];
  activeLayerId: string | null;
  baseLayerId: string | null;
  activeLayerIsBase: boolean;
  originalImageSize: { width: number; height: number } | null;
  selectLayer: (id: string) => void;
  deselectLayer: () => void;
  toggleLayerVisibility: (id: string) => void;
  deleteLayer: (id: string) => void;
  reorderLayer: (id: string, direction: "up" | "down") => void;
  reorderLayerBefore: (draggedId: string, targetId: string) => void;
  duplicateLayer: (id: string) => void;
  toggleLayerLock: (id: string) => void;
  updateLayerTransform: (id: string, transform: EngineLayer["transform"]) => void;
  moveLayerCenterTo: (id: string, x: number, y: number) => void;

  loadImageFromFile: (file: File) => Promise<void>;
  addImageLayer: (file: File) => Promise<void>;
  addTextWatermark: (text: string) => void;
  resizeDocument: (widthPx: number, heightPx: number) => void;
  getLayerThumbnail: (id: string) => string | null;
  removeBackground: () => Promise<void>;
  isRemovingBackground: boolean;
  backgroundRemovalStatus: string | null;

  isAutoCleaning: boolean;
  autoCleanPreview: boolean;
  autoCleanMessage: string | null;
  autoCleanEllipsePreview: { cx: number; cy: number; rx: number; ry: number } | null;
  startAutoClean: () => void;
  applyAutoClean: () => Promise<void>;
  cancelAutoClean: () => void;

  healMode: boolean;
  hasHealStrokes: boolean;
  enterHealMode: () => void;
  cancelHealMode: () => void;
  applyHealMode: () => Promise<void>;

  activeFilterState: FilterState;
  setExposure: (value: number) => void;
  setContrast: (value: number) => void;
  setSaturation: (value: number) => void;
  setVibrance: (value: number) => void;
  setTemperature: (value: number) => void;
  setTint: (value: number) => void;
  setHue: (value: number) => void;
  setExposureAdjust: (value: number) => void;
  setBlack: (value: number) => void;
  setFilters: (patch: Partial<FilterState>) => void;
  setBlendMode: (mode: BlendModeKey) => void;
  setCurvePoint: (index: number, point: CurvePoint) => void;
  commitHistorySnapshot: () => void;

  activeLayerOpacity: number;
  setOpacity: (value: number) => void;

  activeLayerCornerRadius: number;
  setCornerRadius: (value: number) => void;
  flipLayerHorizontal: () => void;
  flipLayerVertical: () => void;

  history: HistorySnapshot[];
  historyIndex: number;
  jumpToHistory: (index: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  cropMode: boolean;
  enterCropMode: (initial?: { preset: CropPresetKey; ratio: number }) => void;
  cancelCropMode: () => void;
  applyCrop: () => void;
  resetCrop: () => void;
  cropRect: Rect | null;
  cropImageBox: Rect | null;
  cropLayerId: string | null;
  cropPixelSize: { width: number; height: number };
  cropOffsetPx: { x: number; y: number };
  cropAspectLocked: boolean;
  setCropAspectLocked: (locked: boolean) => void;
  cropPreset: CropPresetKey;
  applyCropPreset: (preset: CropPresetKey) => void;
  applyCropCustomRatio: (ratio: number) => void;
  setCropWidthPx: (nativeWidth: number) => void;
  setCropHeightPx: (nativeHeight: number) => void;
  setCropXPx: (nativeX: number) => void;
  setCropYPx: (nativeY: number) => void;
  cropBadgeRect: { left: number; top: number; width: number; height: number } | null;
  beginCropHandleDrag: (handle: CropHandleKey) => void;
  beginCropBodyDrag: (screenPoint: Point) => void;
  updateCropDrag: (screenPoint: Point) => void;
  endCropDrag: () => void;

  exportImage: (options: { format: ExportFormat; multiplier: number }) => Promise<void>;

  drawingTool: DrawingTool;
  setDrawingTool: (tool: DrawingTool) => void;
  brushColor: string;
  setBrushColor: (color: string) => void;
  brushWidth: number;
  setBrushWidth: (width: number) => void;
  commitLayerBitmapEdit: (dataUrl: string) => Promise<void>;

  viewport: Viewport;
  setViewport: (viewport: Viewport) => void;
  zoom: number;
  setZoom: (value: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  centerCanvas: () => void;

  showGrid: boolean;
  toggleGrid: () => void;
  setShowGrid: (value: boolean) => void;

  notice: string | null;
}

const CanvasEngineContext = createContext<CanvasEngineContextValue | undefined>(undefined);

interface CanvasEngineProviderProps {
  children: ReactNode;
  initialImageFile?: File | null;
  initialTool?: EditIntentId | null;
}

export function CanvasEngineProvider({ children, initialImageFile = null, initialTool = null }: CanvasEngineProviderProps) {
  const baseLayerIdRef = useRef<string | null>(null);
  const documentAspectRatioRef = useRef(DEFAULT_DOCUMENT_ASPECT_RATIO);
  const availableSizeRef = useRef({ width: 0, height: 0 });
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoCleanMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoCleanMarkRef = useRef<DetectedMark | null>(null);
  const zoomAnimationRef = useRef<number | null>(null);
  const historyIndexRef = useRef(-1);
  const isRestoringRef = useRef(false);
  const activeLayerIdRef = useRef<string | null>(null);

  const [layers, setLayers] = useState<EngineLayer[]>([]);
  const [activeLayerId, setActiveLayerIdState] = useState<string | null>(null);
  // Mirrors baseLayerIdRef into real state — the ref is authoritative for
  // callbacks/effects, but `activeLayerIsBase` below is computed during
  // render, and reading a ref's .current there isn't safe to rely on.
  const [baseLayerId, setBaseLayerIdState] = useState<string | null>(null);
  const [hasImage, setHasImage] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [documentSize, setDocumentSize] = useState({ width: 0, height: 0 });
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [historyIndex, setHistoryIndexState] = useState(-1);
  const [viewport, setViewportState] = useState<Viewport>({ zoom: DEFAULT_ZOOM, panX: 0, panY: 0 });
  const [showGrid, setShowGridState] = useState(false);
  const [drawingTool, setDrawingToolState] = useState<DrawingTool>("selection");
  const [brushColor, setBrushColor] = useState("#007BFF");
  const [brushWidth, setBrushWidth] = useState(8);
  const [notice, setNotice] = useState<string | null>(null);

  const [isAutoCleaning, setIsAutoCleaning] = useState(false);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [backgroundRemovalStatus, setBackgroundRemovalStatus] = useState<string | null>(null);
  const [autoCleanPreview, setAutoCleanPreview] = useState(false);
  const [autoCleanMessage, setAutoCleanMessage] = useState<string | null>(null);
  const [autoCleanEllipsePreview, setAutoCleanEllipsePreview] = useState<{ cx: number; cy: number; rx: number; ry: number } | null>(null);

  useEffect(() => {
    activeLayerIdRef.current = activeLayerId;
  }, [activeLayerId]);

  const showNotice = useCallback((message: string) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice(message);
    noticeTimerRef.current = setTimeout(() => setNotice(null), NOTICE_DURATION_MS);
  }, []);

  const showAutoCleanMessage = useCallback((message: string) => {
    if (autoCleanMessageTimerRef.current) clearTimeout(autoCleanMessageTimerRef.current);
    setAutoCleanMessage(message);
    autoCleanMessageTimerRef.current = setTimeout(() => setAutoCleanMessage(null), NOTICE_DURATION_MS);
  }, []);

  const fitDocument = useCallback(() => {
    const { width: availW, height: availH } = availableSizeRef.current;
    if (availW <= 0 || availH <= 0) return { width: documentSize.width, height: documentSize.height };

    const innerW = availW;
    const innerH = availH;
    const ratio = documentAspectRatioRef.current;

    let w = innerW;
    let h = w / ratio;
    if (h > innerH) {
      h = innerH;
      w = h * ratio;
    }
    const next = { width: Math.max(1, Math.floor(w)), height: Math.max(1, Math.floor(h)) };
    setDocumentSize(next);
    return next;
    // documentSize itself is intentionally not a dependency — this recomputes
    // it, so depending on it would just describe its own staleness.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deliberately depends on nothing but `fitDocument` (itself effectively
  // stable) so its own identity stays stable across every layer edit —
  // CanvasWorkspace's ResizeObserver effect captures this function exactly
  // once at mount. Passive window/container resizes (the right panel
  // opening/closing, the browser window resizing) only ever re-fit the
  // on-screen *display* — they must never touch layer transforms, or a
  // deliberate crop (see `resizeDocument`) would silently revert back to
  // "fill" the instant the panel closes or the window resizes, which is
  // exactly the "my resize doesn't save" bug this comment used to cause.
  // The one place that *does* intentionally scale the base layer to fill
  // the page is the initial image load, which sets that transform itself.
  const notifyContainerResize = useCallback(
    (width: number, height: number) => {
      availableSizeRef.current = { width, height };
      fitDocument();
    },
    [fitDocument],
  );

  // Accepts an optional explicit `layers` array (the public, zero-arg
  // `CanvasEngineContextValue.commitHistorySnapshot` type still allows this —
  // extra optional params are compatible). Callers that just computed a new
  // layers array via `setLayers(nextArray)` must pass that same array here
  // rather than relying on the closure's `layers`: React state updates apply
  // on the *next* render, so a commit called synchronously right after
  // `setLayers` would otherwise see the array as it was *before* this
  // action — silently pushing a snapshot of the wrong (stale) state.
  const commitHistorySnapshot = useCallback((layersOverride?: EngineLayer[]) => {
    if (isRestoringRef.current) return;
    // Side effects (the ref mutation, the second setState) live here, in the
    // callback body — not inside the setHistory updater. React Strict Mode
    // double-invokes updater functions in dev (discarding the first result,
    // but NOT undoing its side effects), so a ref mutated inside one gets
    // corrupted on the throwaway first call. Computing `nextIndex` up front
    // and passing a pure function to setHistory sidesteps that entirely.
    const snapshot = createSnapshot(layersOverride ?? layers, documentAspectRatioRef.current, baseLayerIdRef.current);
    const nextIndex = historyIndexRef.current + 1;
    setHistory((prev) => [...prev.slice(0, nextIndex), snapshot]);
    historyIndexRef.current = nextIndex;
    setHistoryIndexState(nextIndex);
  }, [layers]);

  const selectLayer = useCallback((id: string) => setActiveLayerIdState(id), []);
  const deselectLayer = useCallback(() => setActiveLayerIdState(null), []);

  const toggleLayerVisibility = useCallback(
    (id: string) => {
      const next = layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l));
      setLayers(next);
      commitHistorySnapshot(next);
    },
    [commitHistorySnapshot, layers],
  );

  const toggleLayerLock = useCallback((id: string) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)));
  }, []);

  const deleteLayer = useCallback(
    (id: string) => {
      const next = layers.filter((l) => l.id !== id);
      setLayers(next);
      if (activeLayerIdRef.current === id) setActiveLayerIdState(null);
      if (id === baseLayerIdRef.current) {
        baseLayerIdRef.current = null;
        setBaseLayerIdState(null);
        documentAspectRatioRef.current = DEFAULT_DOCUMENT_ASPECT_RATIO;
        fitDocument();
      }
      setHasImage(next.length > 0);
      commitHistorySnapshot(next);
    },
    [commitHistorySnapshot, fitDocument, layers],
  );

  const reorderLayer = useCallback((id: string, direction: "up" | "down") => {
    const index = layers.findIndex((l) => l.id === id);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index + 1 : index - 1;
    if (targetIndex < 0 || targetIndex >= layers.length) return;
    const next = [...layers];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setLayers(next);
    commitHistorySnapshot(next);
  }, [commitHistorySnapshot, layers]);

  // Reorders by visual grid position (Media Library renders layers newest-first,
  // i.e. reversed), so the swap happens on that reversed view and is flipped
  // back before committing — keeping the panel's drag target and the
  // underlying z-order in sync.
  const reorderLayerBefore = useCallback(
    (draggedId: string, targetId: string) => {
      if (draggedId === targetId) return;
      const visual = [...layers].reverse();
      const fromIndex = visual.findIndex((l) => l.id === draggedId);
      const toIndex = visual.findIndex((l) => l.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return;
      const [moved] = visual.splice(fromIndex, 1);
      visual.splice(toIndex, 0, moved);
      const next = visual.reverse();
      setLayers(next);
      commitHistorySnapshot(next);
    },
    [commitHistorySnapshot, layers],
  );

  const duplicateLayer = useCallback(
    (id: string) => {
      const source = layers.find((l) => l.id === id);
      if (!source) return;
      const copy: EngineLayer = {
        ...source,
        id: nextLayerId(),
        name: `${source.name} copy`,
        transform: { ...source.transform, x: source.transform.x + 16, y: source.transform.y + 16 },
      };
      const next = [...layers, copy];
      setLayers(next);
      setActiveLayerIdState(copy.id);
      commitHistorySnapshot(next);
    },
    [commitHistorySnapshot, layers],
  );

  const updateLayerTransform = useCallback((id: string, transform: EngineLayer["transform"]) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, transform } : l)));
  }, []);

  // Recenters a layer on a document-space point without touching its size —
  // used when a Media Library thumbnail is dragged onto the canvas, so the
  // dropped image lands under the cursor instead of at whatever spot it was
  // originally placed.
  const moveLayerCenterTo = useCallback(
    (id: string, x: number, y: number) => {
      const layer = layers.find((l) => l.id === id);
      if (!layer) return;
      const { width, height } = getRenderedSize(layer.transform);
      const next = layers.map((l) =>
        l.id === id ? { ...l, transform: { ...l.transform, x: x - width / 2, y: y - height / 2 } } : l,
      );
      setLayers(next);
      setActiveLayerIdState(id);
      commitHistorySnapshot(next);
    },
    [commitHistorySnapshot, layers],
  );

  const createImageLayer = useCallback((image: HTMLImageElement, name: string): EngineLayer => {
    const id = nextLayerId();
    return {
      id,
      name,
      type: "image",
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: "Normal",
      cornerRadius: 0,
      transform: {
        x: 0,
        y: 0,
        width: image.naturalWidth,
        height: image.naturalHeight,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        flipX: false,
        flipY: false,
      },
      image: { bitmap: image, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, cropX: 0, cropY: 0, filters: { ...DEFAULT_FILTER_STATE, curvePoints: DEFAULT_CURVE_POINTS } },
    };
  }, []);

  const loadImageFromFile = useCallback(
    async (file: File) => {
      setIsImageLoading(true);
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const image = await loadImageElement(dataUrl);
        const isBase = baseLayerIdRef.current === null;
        const layer = createImageLayer(image, `Layer ${layers.length + 1}`);

        if (isBase) {
          baseLayerIdRef.current = layer.id;
          setBaseLayerIdState(layer.id);
          documentAspectRatioRef.current = image.naturalWidth / image.naturalHeight;
          const next = fitDocument();
          layer.transform = { ...layer.transform, x: 0, y: 0, scaleX: next.width / image.naturalWidth, scaleY: next.height / image.naturalHeight };
        } else {
          const scale = Math.min(
            (documentSize.width * IMAGE_FIT_PADDING) / image.naturalWidth,
            (documentSize.height * IMAGE_FIT_PADDING) / image.naturalHeight,
          );
          layer.transform = {
            ...layer.transform,
            scaleX: scale,
            scaleY: scale,
            x: (documentSize.width - image.naturalWidth * scale) / 2,
            y: (documentSize.height - image.naturalHeight * scale) / 2,
          };
        }

        const next = [...layers, layer];
        setLayers(next);
        setActiveLayerIdState(layer.id);
        setHasImage(true);
        commitHistorySnapshot(next);
      } finally {
        setIsImageLoading(false);
      }
    },
    [commitHistorySnapshot, createImageLayer, documentSize.height, documentSize.width, fitDocument, layers],
  );

  const addImageLayer = useCallback(
    async (file: File) => {
      if (!hasImage) return;
      setIsImageLoading(true);
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const image = await loadImageElement(dataUrl);
        const layer = createImageLayer(image, "Logo");
        const scale = Math.min(
          (documentSize.width * LOGO_MAX_FRACTION) / image.naturalWidth,
          (documentSize.height * LOGO_MAX_FRACTION) / image.naturalHeight,
          1,
        );
        layer.transform = {
          ...layer.transform,
          scaleX: scale,
          scaleY: scale,
          x: documentSize.width - image.naturalWidth * scale - LOGO_MARGIN,
          y: documentSize.height - image.naturalHeight * scale - LOGO_MARGIN,
        };
        const next = [...layers, layer];
        setLayers(next);
        setActiveLayerIdState(layer.id);
        commitHistorySnapshot(next);
      } finally {
        setIsImageLoading(false);
      }
    },
    [commitHistorySnapshot, createImageLayer, documentSize.height, documentSize.width, hasImage, layers],
  );

  const addTextWatermark = useCallback(
    (_text: string) => {
      showNotice("Text layers — coming soon");
    },
    [showNotice],
  );

  const removeBackground = useCallback(async () => {
    if (!activeLayerId || isRemovingBackground) return;
    const layer = layers.find((l) => l.id === activeLayerId);
    if (!layer) {
      showNotice("Select an image layer first");
      return;
    }

    setIsRemovingBackground(true);
    setBackgroundRemovalStatus("Preparing image…");
    try {
      const sourceElement = layer.image.bitmap as unknown as CanvasImageElement;
      const { width, height } = getElementNaturalSize(sourceElement);
      if (!width || !height) {
        showNotice("Couldn't read this image — try re-uploading it");
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        showNotice("Background removal failed — try again");
        return;
      }
      ctx.drawImage(sourceElement, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/png");

      const resultBlob = await withTimeout(
        removeImageBackground(dataUrl, {
          // The quantized model is a fraction of the size of the default
          // ("medium"/isnet_fp16) — much more likely to fetch reliably
          // (and quickly) on the first run, when nothing is cached yet.
          model: "isnet_quint8",
          output: { format: "image/png" },
          progress: (key, current, total) => {
            if (key.startsWith("fetch:")) {
              const pct = total > 0 ? Math.round((current / total) * 100) : 0;
              setBackgroundRemovalStatus(`Downloading background-removal model… ${pct}%`);
            } else {
              setBackgroundRemovalStatus("Removing background…");
            }
          },
        }),
        REMOVE_BACKGROUND_TIMEOUT_MS,
        "Background removal timed out",
      );
      const objectUrl = URL.createObjectURL(resultBlob);
      try {
        const newImage = await loadHtmlImage(objectUrl);
        const next = layers.map((l) =>
          l.id === layer.id ? { ...l, image: { ...l.image, bitmap: newImage } } : l,
        );
        setLayers(next);
        commitHistorySnapshot(next);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    } catch (error) {
      // Surfaced in devtools — the CDN model fetch, decode, and inference
      // can each fail for reasons only visible here (network/CORS,
      // unsupported image codec, OOM, etc.).
      console.error("Background removal failed:", error);
      const timedOut = error instanceof Error && error.message === "Background removal timed out";
      showNotice(timedOut ? "Background removal timed out — try a smaller image" : "Background removal failed — try again");
    } finally {
      setIsRemovingBackground(false);
      setBackgroundRemovalStatus(null);
    }
  }, [activeLayerId, commitHistorySnapshot, isRemovingBackground, layers, showNotice]);

  // Canvas-size resize, not image-size resize: changes only the document
  // frame (and its aspect ratio) to widthPx:heightPx. Layers keep their
  // existing scale and position exactly as-is, so switching to a taller or
  // narrower preset crops (or reveals blank space around) the photo instead
  // of stretching/shrinking its pixels to fill the new frame.
  const resizeDocument = useCallback(
    (widthPx: number, heightPx: number) => {
      const baseId = baseLayerIdRef.current;
      if (!hasImage || !baseId || widthPx <= 0 || heightPx <= 0) return;
      documentAspectRatioRef.current = widthPx / heightPx;
      fitDocument();
      // Picking a marketplace preset or aspect ratio should surface the
      // image's selection border right away — without this the board looks
      // unchanged until the user separately clicks the image.
      selectLayer(baseId);
      commitHistorySnapshot();
    },
    [commitHistorySnapshot, fitDocument, hasImage, selectLayer],
  );

  const getLayerThumbnail = useCallback(
    (id: string) => {
      const layer = layers.find((l) => l.id === id);
      return layer ? renderLayerThumbnail(layer) : null;
    },
    [layers],
  );

  const cancelAutoClean = useCallback(() => {
    autoCleanMarkRef.current = null;
    setAutoCleanPreview(false);
    setAutoCleanEllipsePreview(null);
  }, []);

  const startAutoClean = useCallback(() => {
    const baseId = baseLayerIdRef.current;
    const baseLayer = layers.find((l) => l.id === baseId);
    if (!baseLayer || autoCleanPreview || isAutoCleaning) return;

    const sourceElement = baseLayer.image.bitmap as unknown as CanvasImageElement;
    const { width: nativeWidth, height: nativeHeight } = getElementNaturalSize(sourceElement);
    if (!nativeWidth || !nativeHeight) return;

    const mark = detectMarkFromElement(sourceElement, nativeWidth, nativeHeight);
    if (!mark) {
      showAutoCleanMessage("No watermark-like mark detected");
      return;
    }
    autoCleanMarkRef.current = mark;

    const { transform, image } = baseLayer;
    setAutoCleanEllipsePreview({
      cx: nativeToObject(mark.ellipse.cx, transform.x, transform.scaleX, image.cropX),
      cy: nativeToObject(mark.ellipse.cy, transform.y, transform.scaleY, image.cropY),
      rx: mark.ellipse.rx * transform.scaleX,
      ry: mark.ellipse.ry * transform.scaleY,
    });
    setAutoCleanPreview(true);
  }, [autoCleanPreview, isAutoCleaning, layers, showAutoCleanMessage]);

  const applyAutoClean = useCallback(async () => {
    const baseId = baseLayerIdRef.current;
    const baseLayer = layers.find((l) => l.id === baseId);
    const mark = autoCleanMarkRef.current;
    if (!baseLayer || !mark) {
      cancelAutoClean();
      return;
    }
    setAutoCleanPreview(false);
    setAutoCleanEllipsePreview(null);
    setIsAutoCleaning(true);
    try {
      const sourceElement = baseLayer.image.bitmap as unknown as CanvasImageElement;
      const { width: nativeWidth, height: nativeHeight } = getElementNaturalSize(sourceElement);
      if (!nativeWidth || !nativeHeight) return;
      const cleanedCanvas = await reconstructMark(sourceElement, nativeWidth, nativeHeight, mark);
      const dataUrl = cleanedCanvas.toDataURL("image/png");
      const newImage = await loadHtmlImage(dataUrl);
      const next = layers.map((l) => (l.id === baseLayer.id ? { ...l, image: { ...l.image, bitmap: newImage } } : l));
      setLayers(next);
      commitHistorySnapshot(next);
    } finally {
      autoCleanMarkRef.current = null;
      setIsAutoCleaning(false);
    }
  }, [cancelAutoClean, commitHistorySnapshot, layers]);

  const enterHealMode = useCallback(() => {
    if (!hasImage) return;
    showNotice("Heal brush — coming soon");
  }, [hasImage, showNotice]);
  const cancelHealMode = useCallback(() => {}, []);
  const applyHealMode = useCallback(async () => {}, []);

  const activeLayer = activeLayerId ? layers.find((l) => l.id === activeLayerId) ?? null : null;

  const activeFilterState = useMemo(() => activeLayer?.image.filters ?? DEFAULT_FILTER_STATE, [activeLayer]);

  const updateActiveFilters = useCallback(
    (patch: Partial<FilterState>) => {
      if (!activeLayerId) return;
      setLayers((prev) =>
        prev.map((l) => (l.id === activeLayerId ? { ...l, image: { ...l.image, filters: { ...l.image.filters, ...patch } } } : l)),
      );
    },
    [activeLayerId],
  );

  const setExposure = useCallback((value: number) => updateActiveFilters({ exposure: value }), [updateActiveFilters]);
  const setContrast = useCallback((value: number) => updateActiveFilters({ contrast: value }), [updateActiveFilters]);
  const setSaturation = useCallback((value: number) => updateActiveFilters({ saturation: value }), [updateActiveFilters]);
  const setVibrance = useCallback((value: number) => updateActiveFilters({ vibrance: value }), [updateActiveFilters]);
  const setTemperature = useCallback((value: number) => updateActiveFilters({ temperature: value }), [updateActiveFilters]);
  const setTint = useCallback((value: number) => updateActiveFilters({ tint: value }), [updateActiveFilters]);
  const setHue = useCallback((value: number) => updateActiveFilters({ hue: value }), [updateActiveFilters]);
  const setExposureAdjust = useCallback((value: number) => updateActiveFilters({ exposureAdjust: value }), [updateActiveFilters]);
  const setBlack = useCallback((value: number) => updateActiveFilters({ black: value }), [updateActiveFilters]);
  const setBlendMode = useCallback(
    (mode: BlendModeKey) => {
      if (!activeLayerId) return;
      const next = layers.map((l) => (l.id === activeLayerId ? { ...l, blendMode: mode } : l));
      setLayers(next);
      commitHistorySnapshot(next);
    },
    [activeLayerId, commitHistorySnapshot, layers],
  );
  const setCurvePoint = useCallback(
    (index: number, point: CurvePoint) => {
      if (!activeLayerId) return;
      updateActiveFilters({ curvePoints: activeFilterState.curvePoints.map((p, i) => (i === index ? point : p)) });
    },
    [activeFilterState.curvePoints, activeLayerId, updateActiveFilters],
  );

  const activeLayerOpacity = activeLayer?.opacity ?? 100;
  const setOpacity = useCallback(
    (value: number) => {
      if (!activeLayerId) return;
      const clamped = Math.min(100, Math.max(0, value));
      setLayers((prev) => prev.map((l) => (l.id === activeLayerId ? { ...l, opacity: clamped } : l)));
    },
    [activeLayerId],
  );

  const activeLayerCornerRadius = activeLayer?.cornerRadius ?? 0;
  const setCornerRadius = useCallback(
    (value: number) => {
      if (!activeLayerId) return;
      const clamped = Math.max(0, value);
      setLayers((prev) => prev.map((l) => (l.id === activeLayerId ? { ...l, cornerRadius: clamped } : l)));
    },
    [activeLayerId],
  );

  const flipLayerHorizontal = useCallback(() => {
    if (!activeLayerId) return;
    const next = layers.map((l) =>
      l.id === activeLayerId ? { ...l, transform: { ...l.transform, flipX: !l.transform.flipX } } : l,
    );
    setLayers(next);
    commitHistorySnapshot(next);
  }, [activeLayerId, commitHistorySnapshot, layers]);

  const flipLayerVertical = useCallback(() => {
    if (!activeLayerId) return;
    const next = layers.map((l) =>
      l.id === activeLayerId ? { ...l, transform: { ...l.transform, flipY: !l.transform.flipY } } : l,
    );
    setLayers(next);
    commitHistorySnapshot(next);
  }, [activeLayerId, commitHistorySnapshot, layers]);

  const jumpToHistory = useCallback(
    (index: number) => {
      const entry = history[index];
      if (!entry) return;
      isRestoringRef.current = true;
      documentAspectRatioRef.current = entry.documentAspectRatio;
      const restored = entry.layers;
      setLayers(restored);
      setHasImage(restored.length > 0);
      baseLayerIdRef.current = entry.baseLayerId;
      setBaseLayerIdState(entry.baseLayerId);
      fitDocument();
      if (activeLayerIdRef.current && !restored.some((l) => l.id === activeLayerIdRef.current)) {
        setActiveLayerIdState(null);
      }
      historyIndexRef.current = index;
      setHistoryIndexState(index);
      isRestoringRef.current = false;
    },
    [fitDocument, history],
  );

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const undo = useCallback(() => { if (historyIndex > 0) jumpToHistory(historyIndex - 1); }, [historyIndex, jumpToHistory]);
  const redo = useCallback(() => { if (historyIndex < history.length - 1) jumpToHistory(historyIndex + 1); }, [historyIndex, history.length, jumpToHistory]);

  // --- Crop (native canvas engine — plain object-space math, no canvas library involved) ---
  const [cropSession, setCropSession] = useState<CropSessionState | null>(null);
  const cropSessionRef = useRef<CropSessionState | null>(null);
  const cropDragRef = useRef<CropDragState>(null);
  // Crop mode force-enables the alignment grid so the thirds lines are
  // visible while dragging the frame — this remembers whatever the grid
  // toggle was actually set to beforehand, so applying/canceling the crop
  // restores it instead of leaving the grid stuck on afterwards.
  const showGridBeforeCropRef = useRef(false);
  useEffect(() => {
    cropSessionRef.current = cropSession;
  }, [cropSession]);

  const cropMode = cropSession !== null;

  // Bounds a ratio fit to the photo's currently-visible extent (its full
  // `imageBox` intersected with the page) rather than the whole original
  // bitmap — the image itself stays put on the board; only the crop frame
  // is sized/centered to land fully within what's already on screen, so
  // picking a ratio never has to pan or zoom the photo to keep the frame
  // from clipping off the board's edge.
  const cropRatioBounds = useCallback(
    (imageBox: Rect): Rect => {
      const x1 = Math.max(imageBox.x, 0);
      const y1 = Math.max(imageBox.y, 0);
      const x2 = Math.min(imageBox.x + imageBox.width, documentSize.width);
      const y2 = Math.min(imageBox.y + imageBox.height, documentSize.height);
      if (x2 <= x1 || y2 <= y1) return imageBox;
      return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
    },
    [documentSize],
  );

  // `initial` starts the session already locked to a ratio (the Resize
  // panel's aspect-ratio cards) instead of the plain freeform crop the
  // canvas toolbar's Crop icon opens. Building the ratio-locked crop rect
  // here, atomically, from `layer` (rather than splitting this into a
  // separate `applyCropPreset` call right after) matters because that
  // second call would otherwise run against a still-stale `cropSessionRef`
  // — state updates from this same click haven't committed yet — and
  // silently do nothing.
  const enterCropMode = useCallback(
    (initial?: { preset: CropPresetKey; ratio: number }) => {
      if (!hasImage) return;
      // Falls back to the base photo when nothing is actively selected (e.g.
      // triggered from the Resize panel's aspect-ratio cards right after a
      // click elsewhere deselected everything) — without this, that entry
      // point would silently no-op instead of starting a crop.
      const targetId = activeLayerId ?? baseLayerIdRef.current;
      const layer = layers.find((l) => l.id === targetId);
      if (!layer) return;
      const rawSession = createCropSession(layer);
      // Center the photo on the board the moment a crop starts — wherever
      // it happened to be sitting before (especially if it's smaller than
      // the page and was left off to one side), so every part of it is
      // reachable instead of some of it landing off in unused space. The
      // crop window shifts by the exact same amount so it stays put over
      // whatever part of the photo it was already framing.
      const { imageBox: rawImageBox, cropRect: rawCropRect } = rawSession;
      const centeredImageBox: Rect = {
        ...rawImageBox,
        x: (documentSize.width - rawImageBox.width) / 2,
        y: (documentSize.height - rawImageBox.height) / 2,
      };
      const shiftX = centeredImageBox.x - rawImageBox.x;
      const shiftY = centeredImageBox.y - rawImageBox.y;
      const session: CropSessionState = {
        ...rawSession,
        imageBox: centeredImageBox,
        cropRect: { ...rawCropRect, x: rawCropRect.x + shiftX, y: rawCropRect.y + shiftY },
      };
      const nextSession = initial
        ? {
            ...session,
            preset: initial.preset,
            aspectLocked: true,
            aspectRatio: initial.ratio,
            cropRect: fitCropRectToRatio(cropRatioBounds(session.imageBox), initial.ratio),
          }
        : session;
      showGridBeforeCropRef.current = showGrid;
      setShowGridState(true);
      setCropSession(nextSession);
    },
    [activeLayerId, hasImage, layers, showGrid, cropRatioBounds, documentSize],
  );

  const cancelCropMode = useCallback(() => {
    cropDragRef.current = null;
    setShowGridState(showGridBeforeCropRef.current);
    setCropSession(null);
  }, []);

  const applyCrop = useCallback(() => {
    const session = cropSessionRef.current;
    if (!session) return;
    const patch = commitCrop(session);
    const next = layers.map((l) =>
      l.id === session.layerId
        ? {
            ...l,
            transform: { ...l.transform, x: patch.x, y: patch.y, width: patch.width, height: patch.height },
            image: { ...l.image, cropX: patch.cropX, cropY: patch.cropY },
          }
        : l,
    );
    setLayers(next);
    cropDragRef.current = null;
    setShowGridState(showGridBeforeCropRef.current);
    setCropSession(null);
    commitHistorySnapshot(next);
  }, [commitHistorySnapshot, layers]);

  const resetCrop = useCallback(() => {
    setCropSession((prev) => (prev ? { ...prev, cropRect: { ...prev.imageBox }, aspectLocked: false, preset: "free" } : prev));
  }, []);

  const setCropAspectLocked = useCallback((locked: boolean) => {
    setCropSession((prev) => {
      if (!prev) return prev;
      if (locked) return { ...prev, aspectLocked: true, aspectRatio: prev.cropRect.width / prev.cropRect.height };
      return { ...prev, aspectLocked: false, preset: "free" };
    });
  }, []);

  const applyCropPreset = useCallback((preset: CropPresetKey) => {
    setCropSession((prev) => {
      if (!prev) return prev;
      const config = CROP_PRESETS.find((p) => p.key === preset);
      if (!config || config.ratio === null) return { ...prev, preset: "free", aspectLocked: false };
      return {
        ...prev,
        preset,
        aspectLocked: true,
        aspectRatio: config.ratio,
        cropRect: fitCropRectToRatio(cropRatioBounds(prev.imageBox), config.ratio),
      };
    });
  }, [cropRatioBounds]);

  // Same as `applyCropPreset`, but for a typed W:H ratio that isn't one of
  // the fixed presets (the Resize panel's "Custom ratio" field).
  const applyCropCustomRatio = useCallback((ratio: number) => {
    if (!Number.isFinite(ratio) || ratio <= 0) return;
    setCropSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        preset: "free",
        aspectLocked: true,
        aspectRatio: ratio,
        cropRect: fitCropRectToRatio(cropRatioBounds(prev.imageBox), ratio),
      };
    });
  }, [cropRatioBounds]);

  const setCropWidthPx = useCallback((nativeWidth: number) => {
    if (!Number.isFinite(nativeWidth) || nativeWidth <= 0) return;
    setCropSession((prev) => (prev ? { ...prev, cropRect: stepCropWidth(prev, nativeWidth) } : prev));
  }, []);

  const setCropHeightPx = useCallback((nativeHeight: number) => {
    if (!Number.isFinite(nativeHeight) || nativeHeight <= 0) return;
    setCropSession((prev) => (prev ? { ...prev, cropRect: stepCropHeight(prev, nativeHeight) } : prev));
  }, []);

  const setCropXPx = useCallback((nativeX: number) => {
    if (!Number.isFinite(nativeX)) return;
    setCropSession((prev) => (prev ? { ...prev, cropRect: stepCropX(prev, nativeX) } : prev));
  }, []);

  const setCropYPx = useCallback((nativeY: number) => {
    if (!Number.isFinite(nativeY)) return;
    setCropSession((prev) => (prev ? { ...prev, cropRect: stepCropY(prev, nativeY) } : prev));
  }, []);

  const beginCropHandleDrag = useCallback((handle: CropHandleKey) => {
    const session = cropSessionRef.current;
    if (!session) return;
    cropDragRef.current = { kind: "handle", handle, startRect: session.cropRect };
  }, []);

  // Dragging inside the frame moves the crop window itself over a
  // stationary photo — the photo never pans/re-centers, only the selection
  // does, so it's always clear which part of the fixed image is being kept.
  const beginCropBodyDrag = useCallback(
    (screenPoint: Point) => {
      const session = cropSessionRef.current;
      if (!session) return;
      cropDragRef.current = { kind: "body", startRect: session.cropRect, startPointerObject: toObject(screenPoint, viewport) };
    },
    [viewport],
  );

  const updateCropDrag = useCallback(
    (screenPoint: Point) => {
      const drag = cropDragRef.current;
      const session = cropSessionRef.current;
      if (!drag || !session) return;
      const objectPoint = toObject(screenPoint, viewport);
      if (drag.kind === "handle") {
        const cropRect = stepCropResize(
          drag.startRect,
          session.imageBox,
          drag.handle,
          objectPoint,
          session.aspectLocked,
          session.aspectRatio,
        );
        setCropSession((prev) => (prev ? { ...prev, cropRect } : prev));
      } else {
        const delta = { x: objectPoint.x - drag.startPointerObject.x, y: objectPoint.y - drag.startPointerObject.y };
        const cropRect = stepCropRectPan(drag.startRect, session.imageBox, delta);
        setCropSession((prev) => (prev ? { ...prev, cropRect } : prev));
      }
    },
    [viewport],
  );

  const endCropDrag = useCallback(() => {
    cropDragRef.current = null;
  }, []);

  const cropPixelSize = useMemo(
    () =>
      cropSession
        ? {
            width: Math.round(cropSession.cropRect.width / cropSession.scaleX),
            height: Math.round(cropSession.cropRect.height / cropSession.scaleY),
          }
        : { width: 0, height: 0 },
    [cropSession],
  );

  const cropOffsetPx = useMemo(
    () =>
      cropSession
        ? {
            x: Math.round((cropSession.cropRect.x - cropSession.imageBox.x) / cropSession.scaleX),
            y: Math.round((cropSession.cropRect.y - cropSession.imageBox.y) / cropSession.scaleY),
          }
        : { x: 0, y: 0 },
    [cropSession],
  );

  const cropBadgeRect = useMemo(() => {
    if (!cropSession) return null;
    const topLeft = toScreen({ x: cropSession.cropRect.x, y: cropSession.cropRect.y }, viewport);
    return {
      left: topLeft.x,
      top: topLeft.y,
      width: cropSession.cropRect.width * viewport.zoom,
      height: cropSession.cropRect.height * viewport.zoom,
    };
  }, [cropSession, viewport]);

  // Esc/Enter work regardless of which element has focus — except Enter while actively typing
  // in a dimension field, which should commit that field (its own onKeyDown already does that),
  // not also apply the whole crop out from under it.
  useEffect(() => {
    if (!cropMode) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isFormField = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if (event.key === "Escape") {
        event.preventDefault();
        cancelCropMode();
      } else if (event.key === "Enter" && !isFormField) {
        event.preventDefault();
        applyCrop();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cropMode, cancelCropMode, applyCrop]);

  // Tapping the board outside the crop frame (but still on the canvas
  // itself) auto-saves the in-progress crop instead of leaving it dangling —
  // scoped to `[data-canvas-workspace]` like the deselect effect below, so it
  // only fires for genuine "stepping off the crop frame onto the photo"
  // clicks. Without that scoping this used to catch every click anywhere in
  // the document — picking a different ratio preset, switching right-panel
  // tabs, closing the mobile sheet — and would commit the crop with
  // whatever (possibly stale/zero-size) rect happened to be current at that
  // instant, occasionally cropping the image down to nothing.
  useEffect(() => {
    if (!cropMode) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-crop-ui]")) return;
      if (!target?.closest("[data-canvas-workspace]")) return;
      applyCrop();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [cropMode, applyCrop]);

  // NOTE: deselecting on an empty-workspace click (e.g. after picking a marketplace/preset
  // size from the sidebar, or any other action that leaves a layer selected without the user
  // ever touching the canvas) used to be handled by a second, independent `document`-level
  // pointerdown listener here, purely by DOM containment (`data-canvas-workspace` but not
  // `data-crop-ui`). That containment check has no idea whether a real drag/resize/move is
  // starting on that same click — CanvasWorkspaceController's own onPointerDown (attached to
  // the whole workspace, not just the page's own box, so it can track a layer whose resized
  // footprint extends into the surrounding padding) can legitimately begin dragging a layer
  // from a point that is geometrically inside that layer's body/handles but happens to sit
  // outside `data-crop-ui` in the DOM. Both listeners fired on the same event; this one always
  // won the race and deselected regardless, so grabbing an oversized layer anywhere near its
  // outer edge would drop the selection border/handles the instant you pressed down, making
  // the drag look broken. The controller's own handlePointerDown already deselects on a
  // genuine miss (`hitTestLayers` returns null) across that same full-workspace area, however
  // the layer became selected — so it alone is sufficient, and this redundant listener was
  // removed rather than patched to avoid the same class of bug recurring.

  const exportImage = useCallback(
    async ({ format, multiplier }: { format: ExportFormat; multiplier: number }) => {
      const blob = await exportScene({ layers, documentSize, format, multiplier });
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `creativeflow-export.${format === "jpeg" ? "jpg" : "png"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
    [documentSize, layers],
  );

  const setDrawingTool = useCallback(
    (tool: DrawingTool) => {
      if (tool === "lasso") {
        showNotice("Lasso tool — coming soon");
        return;
      }
      setDrawingToolState(tool);
    },
    [showNotice],
  );

  // Escape backs out of an active pen/marker or eraser session, same as it does for crop mode.
  useEffect(() => {
    if (drawingTool !== "brush" && drawingTool !== "eraser") return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setDrawingToolState("selection");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawingTool]);

  // Used by the pen/marker and eraser tools (DrawOverlay), which paint
  // live onto their own working canvas — positioned exactly over the active
  // layer — in real time as the pointer moves, so the user sees the actual
  // erase/draw result immediately rather than a deferred preview. Once the
  // stroke is finished, DrawOverlay hands over the finished bitmap as a data
  // URL and this just writes it into the layer and pushes undo history —
  // same destructive-raster pattern as removeBackground/applyAutoClean, so
  // exports, thumbnails, and undo/redo all pick it up for free.
  const commitLayerBitmapEdit = useCallback(
    async (dataUrl: string) => {
      if (!activeLayerId) return;
      const layer = layers.find((l) => l.id === activeLayerId);
      if (!layer) return;
      try {
        const newImage = await loadHtmlImage(dataUrl);
        const next = layers.map((l) =>
          l.id === layer.id ? { ...l, image: { ...l.image, bitmap: newImage } } : l,
        );
        setLayers(next);
        commitHistorySnapshot(next);
      } catch (error) {
        console.error("Failed to commit layer edit:", error);
        showNotice("Couldn't save that change — try again");
      }
    },
    [activeLayerId, commitHistorySnapshot, layers, showNotice],
  );

  // Zoom is always board-centered: the board container is positioned at the
  // center of the workspace via CSS and grows/shrinks symmetrically around
  // that center regardless of zoom level, so animating `zoom` alone (leaving
  // panX/panY untouched) is all that's needed — there is no cursor-anchored
  // variant to opt into.
  const animateZoomTo = useCallback(
    (target: number) => {
      if (zoomAnimationRef.current !== null) {
        cancelAnimationFrame(zoomAnimationRef.current);
        zoomAnimationRef.current = null;
      }
      const clamped = clampZoom(target);
      const startZoom = viewport.zoom;
      const startTime = performance.now();
      const duration = 220;

      const step = (now: number) => {
        const t = Math.min(1, (now - startTime) / duration);
        const value = startZoom + (clamped - startZoom) * easeOutCubic(t);
        setViewportState((current) => zoomCentered(current, value));
        zoomAnimationRef.current = t < 1 ? requestAnimationFrame(step) : null;
      };
      zoomAnimationRef.current = requestAnimationFrame(step);
    },
    [viewport.zoom],
  );

  const setZoom = useCallback((value: number) => animateZoomTo(value), [animateZoomTo]);
  const zoomIn = useCallback(() => animateZoomTo(viewport.zoom * ZOOM_STEP), [animateZoomTo, viewport.zoom]);
  const zoomOut = useCallback(() => animateZoomTo(viewport.zoom / ZOOM_STEP), [animateZoomTo, viewport.zoom]);
  const resetView = useCallback(() => {
    if (zoomAnimationRef.current !== null) {
      cancelAnimationFrame(zoomAnimationRef.current);
      zoomAnimationRef.current = null;
    }
    setViewportState({ zoom: DEFAULT_ZOOM, panX: 0, panY: 0 });
  }, []);
  const centerCanvas = useCallback(() => setViewportState((v) => ({ ...v, panX: 0, panY: 0 })), []);
  const setViewport = useCallback((v: Viewport) => setViewportState(v), []);

  const toggleGrid = useCallback(() => setShowGridState((prev) => !prev), []);
  const setShowGrid = useCallback((value: boolean) => setShowGridState(value), []);

  const layerMeta = useMemo<LayerMeta[]>(
    () => layers.map((l) => ({ id: l.id, name: l.name, type: l.type, visible: l.visible })),
    [layers],
  );

  // The base image's native pixel size — what "Reset to original size" in the
  // Resize panel restores the document to, regardless of any resizes since load.
  const originalImageSize = useMemo(() => {
    const base = layers.find((l) => l.id === baseLayerId);
    if (!base) return null;
    return { width: base.image.naturalWidth, height: base.image.naturalHeight };
  }, [layers, baseLayerId]);

  // --- Landing-page hand-off: auto-load + surface the chosen tool's status ---
  const loadImageFromFileRef = useRef(loadImageFromFile);
  const enterHealModeRef = useRef(enterHealMode);
  const setDrawingToolRef = useRef(setDrawingTool);
  const enterCropModeRef = useRef(enterCropMode);
  const setShowGridRef = useRef(setShowGrid);
  useEffect(() => {
    loadImageFromFileRef.current = loadImageFromFile;
    enterHealModeRef.current = enterHealMode;
    setDrawingToolRef.current = setDrawingTool;
    enterCropModeRef.current = enterCropMode;
    setShowGridRef.current = setShowGrid;
  });
  const pendingIntentRef = useRef<EditIntentId | null>(null);

  useEffect(() => {
    if (!initialImageFile) return;
    pendingIntentRef.current = initialTool;
    void loadImageFromFileRef.current(initialImageFile);
    // Runs once per handed-off file — intentionally not re-triggered by
    // later renders of this same provider instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialImageFile]);

  useEffect(() => {
    if (!hasImage || !pendingIntentRef.current) return;
    const intent = pendingIntentRef.current;
    pendingIntentRef.current = null;
    switch (intent) {
      case "crop":
        // Crop lives directly on the canvas now (no sidebar panel for it) —
        // drop straight into a live crop session, guides on.
        enterCropModeRef.current();
        setShowGridRef.current(true);
        break;
      case "watermark_remover":
        enterHealModeRef.current();
        break;
      case "background_removal":
        setDrawingToolRef.current("lasso");
        break;
      default:
        break;
    }
  }, [hasImage]);

  const value = useMemo<CanvasEngineContextValue>(
    () => ({
      notifyContainerResize,
      hasImage,
      isImageLoading,
      documentSize,
      layers: layerMeta,
      engineLayers: layers,
      activeLayerId,
      baseLayerId,
      activeLayerIsBase: activeLayerId !== null && activeLayerId === baseLayerId,
      originalImageSize,
      selectLayer,
      deselectLayer,
      toggleLayerVisibility,
      deleteLayer,
      reorderLayer,
      reorderLayerBefore,
      duplicateLayer,
      toggleLayerLock,
      updateLayerTransform,
      moveLayerCenterTo,
      loadImageFromFile,
      addImageLayer,
      addTextWatermark,
      resizeDocument,
      getLayerThumbnail,
      removeBackground,
      isRemovingBackground,
      backgroundRemovalStatus,
      isAutoCleaning,
      autoCleanPreview,
      autoCleanMessage,
      autoCleanEllipsePreview,
      startAutoClean,
      applyAutoClean,
      cancelAutoClean,
      healMode: false,
      hasHealStrokes: false,
      enterHealMode,
      cancelHealMode,
      applyHealMode,
      activeFilterState,
      setExposure,
      setContrast,
      setSaturation,
      setVibrance,
      setTemperature,
      setTint,
      setHue,
      setExposureAdjust,
      setBlack,
      setFilters: updateActiveFilters,
      setBlendMode,
      setCurvePoint,
      commitHistorySnapshot,
      activeLayerOpacity,
      setOpacity,
      activeLayerCornerRadius,
      setCornerRadius,
      flipLayerHorizontal,
      flipLayerVertical,
      history,
      historyIndex,
      jumpToHistory,
      undo,
      redo,
      canUndo,
      canRedo,
      cropMode,
      enterCropMode,
      cancelCropMode,
      applyCrop,
      resetCrop,
      cropRect: cropSession?.cropRect ?? null,
      cropImageBox: cropSession?.imageBox ?? null,
      cropLayerId: cropSession?.layerId ?? null,
      cropPixelSize,
      cropOffsetPx,
      cropAspectLocked: cropSession?.aspectLocked ?? false,
      setCropAspectLocked,
      cropPreset: cropSession?.preset ?? "free",
      applyCropPreset,
      applyCropCustomRatio,
      setCropWidthPx,
      setCropHeightPx,
      setCropXPx,
      setCropYPx,
      cropBadgeRect,
      beginCropHandleDrag,
      beginCropBodyDrag,
      updateCropDrag,
      endCropDrag,
      exportImage,
      drawingTool,
      setDrawingTool,
      brushColor,
      setBrushColor,
      brushWidth,
      setBrushWidth,
      commitLayerBitmapEdit,
      viewport,
      setViewport,
      zoom: viewport.zoom,
      setZoom,
      zoomIn,
      zoomOut,
      resetView,
      centerCanvas,
      showGrid,
      toggleGrid,
      setShowGrid,
      notice,
    }),
    [
      notifyContainerResize,
      hasImage,
      isImageLoading,
      documentSize,
      layerMeta,
      layers,
      activeLayerId,
      baseLayerId,
      originalImageSize,
      selectLayer,
      deselectLayer,
      toggleLayerVisibility,
      deleteLayer,
      reorderLayer,
      reorderLayerBefore,
      duplicateLayer,
      toggleLayerLock,
      updateLayerTransform,
      moveLayerCenterTo,
      loadImageFromFile,
      addImageLayer,
      addTextWatermark,
      resizeDocument,
      getLayerThumbnail,
      removeBackground,
      isRemovingBackground,
      backgroundRemovalStatus,
      isAutoCleaning,
      autoCleanPreview,
      autoCleanMessage,
      autoCleanEllipsePreview,
      startAutoClean,
      applyAutoClean,
      cancelAutoClean,
      enterHealMode,
      cancelHealMode,
      applyHealMode,
      activeFilterState,
      setExposure,
      setContrast,
      setSaturation,
      setVibrance,
      setTemperature,
      setTint,
      setHue,
      setExposureAdjust,
      setBlack,
      updateActiveFilters,
      setBlendMode,
      setCurvePoint,
      commitHistorySnapshot,
      activeLayerOpacity,
      setOpacity,
      activeLayerCornerRadius,
      setCornerRadius,
      flipLayerHorizontal,
      flipLayerVertical,
      history,
      historyIndex,
      jumpToHistory,
      undo,
      redo,
      canUndo,
      canRedo,
      cropMode,
      enterCropMode,
      cancelCropMode,
      applyCrop,
      resetCrop,
      cropSession,
      cropPixelSize,
      cropOffsetPx,
      setCropAspectLocked,
      applyCropPreset,
      applyCropCustomRatio,
      setCropWidthPx,
      setCropHeightPx,
      setCropXPx,
      setCropYPx,
      cropBadgeRect,
      beginCropHandleDrag,
      beginCropBodyDrag,
      updateCropDrag,
      endCropDrag,
      exportImage,
      drawingTool,
      setDrawingTool,
      brushColor,
      brushWidth,
      commitLayerBitmapEdit,
      viewport,
      setViewport,
      setZoom,
      zoomIn,
      zoomOut,
      resetView,
      centerCanvas,
      showGrid,
      toggleGrid,
      setShowGrid,
      notice,
    ],
  );

  return <CanvasEngineContext.Provider value={value}>{children}</CanvasEngineContext.Provider>;
}

export function useCanvasEngine(): CanvasEngineContextValue {
  const context = useContext(CanvasEngineContext);
  if (!context) {
    throw new Error("useCanvasEngine must be used within a CanvasEngineProvider");
  }
  return context;
}
