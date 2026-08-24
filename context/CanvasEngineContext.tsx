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
  type PendingUploadAsset,
} from "@/types/canvasEngine";
import type { CurvePoint } from "@/types/creativeflow";
import type { EditIntentId } from "@/types/editIntent";
import { DEFAULT_CURVE_POINTS } from "@/lib/canvas/selectiveColorMatrix";
import { probeImageDimensions } from "@/lib/decodeImage";
import {
  detectMarkFromElement,
  getElementNaturalSize,
  loadHtmlImage,
  reconstructMark,
  type CanvasImageElement,
  type DetectedMark,
} from "@/lib/canvas/autoClean";
import { exportScene } from "@/lib/canvasEngine/export";
import { nativeToObject, toObject, toScreen } from "@/lib/canvasEngine/geometry";
import { renderLayerThumbnail } from "@/lib/canvasEngine/render";
import type { EngineLayer, HistorySnapshot, Point, Rect, Viewport } from "@/lib/canvasEngine/types";
import { createSnapshot } from "@/lib/canvasEngine/history";
import { clampZoom, easeOutCubic, zoomToPoint, ZOOM_STEP } from "@/lib/canvasEngine/viewport";
import {
  CROP_PRESETS,
  commitCrop,
  createCropSession,
  fitCropRectToRatio,
  stepCropHeight,
  stepCropPan,
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
  blendMode: "Normal",
  curvePoints: DEFAULT_CURVE_POINTS,
};

const DEFAULT_DOCUMENT_ASPECT_RATIO = 4 / 3;
const IMAGE_FIT_PADDING = 0.8;
const LOGO_MAX_FRACTION = 0.3;
const LOGO_MARGIN = 16;
const NOTICE_DURATION_MS = 2400;

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
  activeLayerIsBase: boolean;
  selectLayer: (id: string) => void;
  deselectLayer: () => void;
  toggleLayerVisibility: (id: string) => void;
  deleteLayer: (id: string) => void;
  reorderLayer: (id: string, direction: "up" | "down") => void;
  duplicateLayer: (id: string) => void;
  toggleLayerLock: (id: string) => void;
  updateLayerTransform: (id: string, transform: EngineLayer["transform"]) => void;

  loadImageFromFile: (file: File) => Promise<void>;
  addImageLayer: (file: File) => Promise<void>;
  addTextWatermark: (text: string) => void;
  resizeDocument: (widthPx: number, heightPx: number) => void;
  getLayerThumbnail: (id: string) => string | null;

  pendingAssets: PendingUploadAsset[];
  addPendingAsset: (file: File) => void;
  placePendingAsset: (id: string) => Promise<void>;
  removePendingAsset: (id: string) => void;

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
  setBlendMode: (mode: BlendModeKey) => void;
  setCurvePoint: (index: number, point: CurvePoint) => void;
  commitHistorySnapshot: () => void;

  activeLayerOpacity: number;
  setOpacity: (value: number) => void;

  history: HistorySnapshot[];
  historyIndex: number;
  jumpToHistory: (index: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  cropMode: boolean;
  enterCropMode: () => void;
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
  setCropWidthPx: (nativeWidth: number) => void;
  setCropHeightPx: (nativeHeight: number) => void;
  setCropXPx: (nativeX: number) => void;
  setCropYPx: (nativeY: number) => void;
  cropBadgeRect: { left: number; top: number; width: number; height: number } | null;
  beginCropHandleDrag: (handle: CropHandleKey) => void;
  beginCropBodyDrag: (screenPoint: Point) => void;
  updateCropDrag: (screenPoint: Point) => void;
  endCropDrag: () => void;

  beforeAfter: boolean;
  toggleBeforeAfter: () => void;
  beforeAfterBitmap: HTMLImageElement | null;

  exportImage: (options: { format: ExportFormat; multiplier: number }) => Promise<void>;

  drawingTool: DrawingTool;
  setDrawingTool: (tool: DrawingTool) => void;
  brushColor: string;
  setBrushColor: (color: string) => void;
  brushWidth: number;
  setBrushWidth: (width: number) => void;

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
  const originalBaseImageDataUrlRef = useRef<string | null>(null);
  const beforeHiddenIdsRef = useRef<Set<string>>(new Set());
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoCleanMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoCleanMarkRef = useRef<DetectedMark | null>(null);
  const zoomAnimationRef = useRef<number | null>(null);
  const historyIndexRef = useRef(-1);
  const isRestoringRef = useRef(false);
  const pendingAssetsRef = useRef<PendingUploadAsset[]>([]);
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
  const [pendingAssets, setPendingAssets] = useState<PendingUploadAsset[]>([]);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [historyIndex, setHistoryIndexState] = useState(-1);
  const [viewport, setViewportState] = useState<Viewport>({ zoom: 1, panX: 0, panY: 0 });
  const [showGrid, setShowGrid] = useState(false);
  const [drawingTool, setDrawingToolState] = useState<DrawingTool>("selection");
  const [brushColor, setBrushColor] = useState("#007BFF");
  const [brushWidth, setBrushWidth] = useState(8);
  const [notice, setNotice] = useState<string | null>(null);

  const [isAutoCleaning, setIsAutoCleaning] = useState(false);
  const [autoCleanPreview, setAutoCleanPreview] = useState(false);
  const [autoCleanMessage, setAutoCleanMessage] = useState<string | null>(null);
  const [autoCleanEllipsePreview, setAutoCleanEllipsePreview] = useState<{ cx: number; cy: number; rx: number; ry: number } | null>(null);

  const [beforeAfter, setBeforeAfter] = useState(false);
  const [beforeAfterBitmap, setBeforeAfterBitmap] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    pendingAssetsRef.current = pendingAssets;
  }, [pendingAssets]);
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
  // once at mount, so a `notifyContainerResize` that changed identity on
  // every layers update would silently start refitting against a stale,
  // captured-at-mount `layers` snapshot for the rest of the session. Passive
  // window/container resizes never need to land in undo history (matching
  // the old Fabric-based engine's behavior), so the functional `setLayers`
  // form — no fresh array to hand back to a caller — is fine here; the one
  // caller that *does* need to commit a resize (resizeDocument, below)
  // computes its own refit inline instead of going through this function.
  const notifyContainerResize = useCallback(
    (width: number, height: number) => {
      availableSizeRef.current = { width, height };
      const next = fitDocument();
      // The base layer fills the page exactly — re-fit it whenever the page
      // itself is resized, so cropping/resizing the document never leaves
      // the base photo stranded at its old scale.
      const baseId = baseLayerIdRef.current;
      if (baseId) {
        setLayers((prev) =>
          prev.map((l) =>
            l.id === baseId
              ? { ...l, transform: { ...l.transform, x: 0, y: 0, scaleX: next.width / l.image.naturalWidth, scaleY: next.height / l.image.naturalHeight } }
              : l,
          ),
        );
      }
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
        originalBaseImageDataUrlRef.current = null;
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
      transform: { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight, scaleX: 1, scaleY: 1, rotation: 0 },
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
          originalBaseImageDataUrlRef.current = dataUrl;
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

  const resizeDocument = useCallback(
    (widthPx: number, heightPx: number) => {
      const baseId = baseLayerIdRef.current;
      if (!hasImage || !baseId || widthPx <= 0 || heightPx <= 0) return;
      documentAspectRatioRef.current = widthPx / heightPx;
      const size = fitDocument();
      const next = layers.map((l) =>
        l.id === baseId
          ? { ...l, transform: { ...l.transform, x: 0, y: 0, scaleX: size.width / l.image.naturalWidth, scaleY: size.height / l.image.naturalHeight } }
          : l,
      );
      setLayers(next);
      commitHistorySnapshot(next);
    },
    [commitHistorySnapshot, fitDocument, hasImage, layers],
  );

  const getLayerThumbnail = useCallback(
    (id: string) => {
      const layer = layers.find((l) => l.id === id);
      return layer ? renderLayerThumbnail(layer) : null;
    },
    [layers],
  );

  const addPendingAsset = useCallback((file: File) => {
    const id = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const previewUrl = URL.createObjectURL(file);
    setPendingAssets((prev) => [...prev, { id, file, previewUrl, status: "loading" as const }]);
    probeImageDimensions(previewUrl)
      .then(() => setPendingAssets((prev) => prev.map((a) => (a.id === id ? { ...a, status: "ready" as const } : a))))
      .catch(() => {
        URL.revokeObjectURL(previewUrl);
        setPendingAssets((prev) => prev.filter((a) => a.id !== id));
      });
  }, []);

  const removePendingAsset = useCallback((id: string) => {
    setPendingAssets((prev) => {
      const asset = prev.find((a) => a.id === id);
      if (asset) URL.revokeObjectURL(asset.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const placePendingAsset = useCallback(
    async (id: string) => {
      const asset = pendingAssetsRef.current.find((a) => a.id === id);
      if (!asset || asset.status !== "ready") return;
      await loadImageFromFile(asset.file);
      removePendingAsset(id);
    },
    [loadImageFromFile, removePendingAsset],
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
  useEffect(() => {
    cropSessionRef.current = cropSession;
  }, [cropSession]);

  const cropMode = cropSession !== null;

  const enterCropMode = useCallback(() => {
    if (!hasImage || !activeLayerId) return;
    const layer = layers.find((l) => l.id === activeLayerId);
    if (!layer) return;
    setCropSession(createCropSession(layer));
  }, [activeLayerId, hasImage, layers]);

  const cancelCropMode = useCallback(() => {
    cropDragRef.current = null;
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
        cropRect: fitCropRectToRatio(prev.imageBox, config.ratio),
      };
    });
  }, []);

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

  const beginCropBodyDrag = useCallback(
    (screenPoint: Point) => {
      const session = cropSessionRef.current;
      if (!session) return;
      cropDragRef.current = { kind: "body", startImageBox: session.imageBox, startPointerObject: toObject(screenPoint, viewport) };
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
        const imageBox = stepCropPan(drag.startImageBox, session.cropRect, delta);
        setCropSession((prev) => (prev ? { ...prev, imageBox } : prev));
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

  const toggleBeforeAfter = useCallback(() => {
    // Side effects (ref writes, the async image load) live directly in this
    // callback body rather than inside a setState updater — same rationale
    // as commitHistorySnapshot above: Strict Mode's dev-only double-invoke
    // of updater functions would otherwise fire the async load twice and
    // leave beforeHiddenIdsRef reflecting whichever invocation ran last.
    if (!beforeAfter) {
      if (!originalBaseImageDataUrlRef.current) return;
      const hidden = new Set<string>();
      setLayers((current) =>
        current.map((l) => {
          if (l.visible) hidden.add(l.id);
          return { ...l, visible: false };
        }),
      );
      beforeHiddenIdsRef.current = hidden;
      setBeforeAfter(true);
      void loadImageElement(originalBaseImageDataUrlRef.current).then((img) => setBeforeAfterBitmap(img));
    } else {
      setBeforeAfterBitmap(null);
      setLayers((current) => current.map((l) => (beforeHiddenIdsRef.current.has(l.id) ? { ...l, visible: true } : l)));
      beforeHiddenIdsRef.current = new Set();
      setBeforeAfter(false);
    }
  }, [beforeAfter]);

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
      if (tool === "brush" || tool === "lasso") {
        showNotice("Drawing tools — coming soon");
        return;
      }
      setDrawingToolState(tool);
    },
    [showNotice],
  );

  const animateZoomTo = useCallback(
    (target: number, focalPoint?: { x: number; y: number }) => {
      if (zoomAnimationRef.current !== null) {
        cancelAnimationFrame(zoomAnimationRef.current);
        zoomAnimationRef.current = null;
      }
      const clamped = clampZoom(target);
      const startViewport = viewport;
      const focal = focalPoint ?? { x: documentSize.width / 2, y: documentSize.height / 2 };
      const startZoom = startViewport.zoom;
      const startTime = performance.now();
      const duration = 220;

      const step = (now: number) => {
        const t = Math.min(1, (now - startTime) / duration);
        const value = startZoom + (clamped - startZoom) * easeOutCubic(t);
        setViewportState((current) => zoomToPoint(current, value, focal));
        zoomAnimationRef.current = t < 1 ? requestAnimationFrame(step) : null;
      };
      zoomAnimationRef.current = requestAnimationFrame(step);
    },
    [documentSize.height, documentSize.width, viewport],
  );

  const setZoom = useCallback((value: number) => animateZoomTo(value), [animateZoomTo]);
  const zoomIn = useCallback(() => animateZoomTo(viewport.zoom * ZOOM_STEP), [animateZoomTo, viewport.zoom]);
  const zoomOut = useCallback(() => animateZoomTo(viewport.zoom / ZOOM_STEP), [animateZoomTo, viewport.zoom]);
  const resetView = useCallback(() => {
    if (zoomAnimationRef.current !== null) {
      cancelAnimationFrame(zoomAnimationRef.current);
      zoomAnimationRef.current = null;
    }
    setViewportState({ zoom: 1, panX: 0, panY: 0 });
  }, []);
  const centerCanvas = useCallback(() => setViewportState((v) => ({ ...v, panX: 0, panY: 0 })), []);
  const setViewport = useCallback((v: Viewport) => setViewportState(v), []);

  const toggleGrid = useCallback(() => setShowGrid((prev) => !prev), []);

  const layerMeta = useMemo<LayerMeta[]>(
    () => layers.map((l) => ({ id: l.id, name: l.name, type: l.type, visible: l.visible })),
    [layers],
  );

  // --- Landing-page hand-off: auto-load + surface the chosen tool's status ---
  const loadImageFromFileRef = useRef(loadImageFromFile);
  const enterCropModeRef = useRef(enterCropMode);
  const enterHealModeRef = useRef(enterHealMode);
  const setDrawingToolRef = useRef(setDrawingTool);
  useEffect(() => {
    loadImageFromFileRef.current = loadImageFromFile;
    enterCropModeRef.current = enterCropMode;
    enterHealModeRef.current = enterHealMode;
    setDrawingToolRef.current = setDrawingTool;
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
        enterCropModeRef.current();
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
      activeLayerIsBase: activeLayerId !== null && activeLayerId === baseLayerId,
      selectLayer,
      deselectLayer,
      toggleLayerVisibility,
      deleteLayer,
      reorderLayer,
      duplicateLayer,
      toggleLayerLock,
      updateLayerTransform,
      loadImageFromFile,
      addImageLayer,
      addTextWatermark,
      resizeDocument,
      getLayerThumbnail,
      pendingAssets,
      addPendingAsset,
      placePendingAsset,
      removePendingAsset,
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
      setBlendMode,
      setCurvePoint,
      commitHistorySnapshot,
      activeLayerOpacity,
      setOpacity,
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
      setCropWidthPx,
      setCropHeightPx,
      setCropXPx,
      setCropYPx,
      cropBadgeRect,
      beginCropHandleDrag,
      beginCropBodyDrag,
      updateCropDrag,
      endCropDrag,
      beforeAfter,
      toggleBeforeAfter,
      beforeAfterBitmap,
      exportImage,
      drawingTool,
      setDrawingTool,
      brushColor,
      setBrushColor,
      brushWidth,
      setBrushWidth,
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
      selectLayer,
      deselectLayer,
      toggleLayerVisibility,
      deleteLayer,
      reorderLayer,
      duplicateLayer,
      toggleLayerLock,
      updateLayerTransform,
      loadImageFromFile,
      addImageLayer,
      addTextWatermark,
      resizeDocument,
      getLayerThumbnail,
      pendingAssets,
      addPendingAsset,
      placePendingAsset,
      removePendingAsset,
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
      setBlendMode,
      setCurvePoint,
      commitHistorySnapshot,
      activeLayerOpacity,
      setOpacity,
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
      setCropWidthPx,
      setCropHeightPx,
      setCropXPx,
      setCropYPx,
      cropBadgeRect,
      beginCropHandleDrag,
      beginCropBodyDrag,
      updateCropDrag,
      endCropDrag,
      beforeAfter,
      toggleBeforeAfter,
      beforeAfterBitmap,
      exportImage,
      drawingTool,
      setDrawingTool,
      brushColor,
      brushWidth,
      viewport,
      setViewport,
      setZoom,
      zoomIn,
      zoomOut,
      resetView,
      centerCanvas,
      showGrid,
      toggleGrid,
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
