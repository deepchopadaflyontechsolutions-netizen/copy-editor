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
  ActiveSelection,
  Canvas,
  Ellipse,
  FabricImage,
  Line,
  PencilBrush,
  Point,
  filters as fabricFilters,
  initFilterBackend,
} from "fabric";
import type { FabricObject } from "fabric";
import {
  BLEND_MODE_TO_COMPOSITE_OPERATION,
  type BlendModeKey,
  type DrawingTool,
  type ExportFormat,
  type FilterState,
  type LayerMeta,
} from "@/types/canvasEngine";
import type { CurvePoint } from "@/types/creativeflow";
import type { EditIntentId } from "@/types/editIntent";
import { curvePointsToColorMatrix, DEFAULT_CURVE_POINTS } from "@/lib/canvas/selectiveColorMatrix";
import {
  detectMarkFromElement,
  featherAlphaMask,
  getElementNaturalSize,
  loadHtmlImage,
  reconstructMark,
  reconstructManualMask,
  type CanvasImageElement,
  type DetectedMark,
  type RegionRect,
} from "@/lib/canvas/autoClean";
import {
  useCanvasCrop,
  type CropPixelSize,
  type CropPresetKey,
  type CropScreenRect,
} from "@/hooks/useCanvasCrop";

type LayerObject = FabricObject & { layerId?: string; layerName?: string };

interface HistoryEntrySnapshot {
  id: string;
  label: string;
  data: Record<string, unknown>;
  aspectRatio: number;
}

const DEFAULT_FILTER_STATE: FilterState = {
  exposure: 50,
  contrast: 50,
  blendMode: "Normal",
  curvePoints: DEFAULT_CURVE_POINTS,
};

// Applies only to secondary layers dropped on top of an existing document —
// they sit inset within the page instead of covering it edge to edge. The
// base photo gets its own (smaller, fixed) inset from the canvas edge — see
// MAX_CANVAS_INSET / applyBaseImageFit — so this is purely about the extra
// margin secondary layers get relative to the base photo's own frame.
const IMAGE_FIT_PADDING = 0.8;
// Breathing room between the photo's edge and the canvas edge, so resize/
// crop handles sitting right on the image boundary have room to render and
// to be grabbed with the mouse instead of overlapping the card border.
const MAX_CANVAS_INSET = 48;
// Translucent highlight for heal-brush strokes — deliberately distinct from
// any real paint color so a mask-in-progress always reads as "marked for
// removal" rather than as an actual brush stroke being added to the photo.
const HEAL_BRUSH_COLOR = "rgba(248, 113, 113, 0.55)";
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.2;
function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}
// Placeholder page shape before any photo has set the document's real aspect
// ratio (empty canvas, or every layer deleted).
const DEFAULT_DOCUMENT_ASPECT_RATIO = 4 / 3;

let layerIdCounter = 0;
function nextLayerId(): string {
  layerIdCounter += 1;
  return `layer-${layerIdCounter}-${Date.now()}`;
}

function mapUiRangeToFabricRange(value: number): number {
  return (value - 50) / 50;
}

function buildFabricFilters(state: FilterState) {
  return [
    new fabricFilters.Brightness({ brightness: mapUiRangeToFabricRange(state.exposure) }),
    new fabricFilters.Contrast({ contrast: mapUiRangeToFabricRange(state.contrast) }),
    new fabricFilters.ColorMatrix({ matrix: curvePointsToColorMatrix(state.curvePoints) as never }),
  ];
}

interface CanvasEngineContextValue {
  registerCanvas: (canvas: Canvas) => void;
  unregisterCanvas: () => void;
  notifyContainerResize: (width: number, height: number) => void;

  hasImage: boolean;
  isImageLoading: boolean;
  documentSize: { width: number; height: number };
  layers: LayerMeta[];
  activeLayerId: string | null;
  selectLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  deleteLayer: (id: string) => void;
  reorderLayer: (id: string, direction: "up" | "down") => void;

  loadImageFromFile: (file: File) => Promise<void>;

  isAutoCleaning: boolean;
  autoCleanPreview: boolean;
  autoCleanMessage: string | null;
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
  setBlendMode: (mode: BlendModeKey) => void;
  setCurvePoint: (index: number, point: CurvePoint) => void;
  commitHistorySnapshot: () => void;

  history: HistoryEntrySnapshot[];
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
  cropPixelSize: CropPixelSize;
  cropAspectLocked: boolean;
  setCropAspectLocked: (locked: boolean) => void;
  cropPreset: CropPresetKey;
  applyCropPreset: (preset: CropPresetKey) => void;
  setCropWidthPx: (nativeWidth: number) => void;
  setCropHeightPx: (nativeHeight: number) => void;
  cropBadgeRect: CropScreenRect | null;

  beforeAfter: boolean;
  toggleBeforeAfter: () => void;

  exportImage: (options: { format: ExportFormat; multiplier: number }) => Promise<void>;

  drawingTool: DrawingTool;
  setDrawingTool: (tool: DrawingTool) => void;
  brushColor: string;
  setBrushColor: (color: string) => void;
  brushWidth: number;
  setBrushWidth: (width: number) => void;

  zoom: number;
  setZoom: (value: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  centerCanvas: () => void;

  showGrid: boolean;
  toggleGrid: () => void;
}

const CanvasEngineContext = createContext<CanvasEngineContextValue | undefined>(undefined);

interface CanvasEngineProviderProps {
  children: ReactNode;
  /** An image handed off from the landing page's uploader, auto-loaded once a canvas registers. */
  initialImageFile?: File | null;
  /** The edit-mode intent chosen alongside initialImageFile — activates the matching tool once it's loaded. */
  initialTool?: EditIntentId | null;
}

export function CanvasEngineProvider({ children, initialImageFile = null, initialTool = null }: CanvasEngineProviderProps) {
  const canvasRef = useRef<Canvas | null>(null);
  const layerObjectsRef = useRef<Map<string, LayerObject>>(new Map());
  const historyIndexRef = useRef(-1);
  const isRestoringRef = useRef(false);

  // The document's shape is driven by its base photo, not by whatever space
  // happens to be available — these track that independently of React state
  // so resize/undo/crop can all recompute the same way without re-render churn.
  const baseImageLayerIdRef = useRef<string | null>(null);
  const documentAspectRatioRef = useRef(DEFAULT_DOCUMENT_ASPECT_RATIO);
  const availableSizeRef = useRef({ width: 0, height: 0 });

  const [hasImage, setHasImage] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isAutoCleaning, setIsAutoCleaning] = useState(false);
  const [autoCleanPreview, setAutoCleanPreview] = useState(false);
  const [autoCleanMessage, setAutoCleanMessage] = useState<string | null>(null);
  // The confidence-gated detection result (native image pixel coordinates)
  // that's currently being previewed — applyAutoClean reconstructs exactly
  // this mask, never a freshly recomputed one, so what the user approved is
  // what gets applied.
  const autoCleanMarkRef = useRef<DetectedMark | null>(null);
  // The dashed preview ellipse added directly to the Fabric canvas while
  // previewing — a real Fabric object (not an HTML overlay) so it pans/zooms
  // with the canvas for free.
  const autoCleanOverlayRef = useRef<Ellipse | null>(null);
  const autoCleanMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [healMode, setHealMode] = useState(false);
  const [hasHealStrokes, setHasHealStrokes] = useState(false);
  // Mirrors healMode for the path:created canvas event handler, which is
  // registered once in registerCanvas and would otherwise close over a
  // stale healMode value (same reason drawingToolRef exists below).
  const healModeRef = useRef(false);
  // Live-preview brush strokes (translucent highlight paths) the user has
  // painted this heal session — kept off the real layer stack and never
  // committed as objects; applyHealMode rasterizes them into a mask instead.
  const healPathsRef = useRef<LayerObject[]>([]);
  // The actual pixel size the canvas was just resized to — mirrored into
  // state (rather than left as a ref) so CanvasStage can size its card
  // wrapper to match exactly. Fabric wraps the <canvas> in its own
  // out-of-flow container element, so the wrapper can't just shrink to fit
  // it via CSS; it needs this value explicitly.
  const [documentSize, setDocumentSize] = useState({ width: 0, height: 0 });
  const [layers, setLayers] = useState<LayerMeta[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const activeLayerIdRef = useRef<string | null>(null);
  // Mirrors layerObjectsRef's lookup for the active layer into real state —
  // useCanvasCrop (and anything else reading it during render) needs the
  // current Fabric object, and reading a ref's .current during render isn't
  // safe to rely on for that.
  const [activeLayerObject, setActiveLayerObjectState] = useState<LayerObject | null>(null);
  // Registered canvas instance mirrored into state for the same reason —
  // canvasRef.current is still used everywhere else (event handlers,
  // imperative callbacks), where reading a ref is fine.
  const [registeredCanvas, setRegisteredCanvas] = useState<Canvas | null>(null);
  const [filterStateByLayer, setFilterStateByLayer] = useState<Record<string, FilterState>>({});
  const [history, setHistory] = useState<HistoryEntrySnapshot[]>([]);
  const [historyIndex, setHistoryIndexState] = useState(-1);
  const [cropMode, setCropMode] = useState(false);
  const [beforeAfter, setBeforeAfter] = useState(false);
  const [drawingTool, setDrawingToolState] = useState<DrawingTool>("selection");
  const [brushColor, setBrushColor] = useState("#007BFF");
  const [brushWidth, setBrushWidth] = useState(8);
  const drawingToolRef = useRef<DrawingTool>("selection");
  const [zoom, setZoomState] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const compositionGridRef = useRef<Line[]>([]);

  const setActiveLayer = useCallback((id: string | null, obj: LayerObject | null) => {
    activeLayerIdRef.current = id;
    setActiveLayerId(id);
    setActiveLayerObjectState(obj);
  }, []);

  const syncLayers = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const objects = canvas.getObjects() as LayerObject[];
    layerObjectsRef.current = new Map(
      objects
        .filter((obj) => Boolean(obj.layerId))
        .map((obj) => [obj.layerId as string, obj]),
    );
    setLayers(
      objects
        .filter((obj): obj is LayerObject & { layerId: string } => Boolean(obj.layerId))
        .map((obj) => ({
          id: obj.layerId,
          name: obj.layerName ?? obj.type ?? "Layer",
          type: obj.type ?? "object",
          visible: obj.visible !== false,
        })),
    );
  }, []);

  // The base photo sits inset from the canvas edge on all four sides (see
  // fitCanvasToDocument) rather than filling it exactly — flush edges meant
  // the image's own selection handles and the crop box's edge/corner handles
  // rendered right on top of the card's border, with no room to see or grab
  // them cleanly. Re-applied after every resize, crop, and history jump so
  // the inset never drifts out of sync with the canvas.
  const applyBaseImageFit = useCallback((canvas: Canvas, imageWidth: number, imageHeight: number, inset: number) => {
    const baseId = baseImageLayerIdRef.current;
    const baseObj = baseId ? layerObjectsRef.current.get(baseId) : undefined;
    if (!(baseObj instanceof FabricImage) || !baseObj.width || !baseObj.height) return;
    // Scale each axis independently (rather than one uniform factor) so
    // flooring the fit size never leaves a stray sliver of card color along
    // one edge — width and height each land exactly on the inset bounds.
    baseObj.set({
      scaleX: imageWidth / baseObj.width,
      scaleY: imageHeight / baseObj.height,
      left: inset,
      top: inset,
    });
    baseObj.setCoords();
  }, []);

  // Resizes the document (canvas) to the largest box that fits the last-known
  // available space at the document's own aspect ratio, insets the photo
  // within it by a margin (scaled down on very small viewports so it never
  // eats an outsized share of the available space), then re-fits the base
  // photo to that inset box. This is the single source of truth for canvas
  // size — called on container resize, image load, crop, and history jumps.
  const fitCanvasToDocument = useCallback(() => {
    const canvas = canvasRef.current;
    const { width: availableWidth, height: availableHeight } = availableSizeRef.current;
    if (!canvas || availableWidth <= 0 || availableHeight <= 0) return;

    const inset = Math.max(16, Math.min(MAX_CANVAS_INSET, Math.floor(Math.min(availableWidth, availableHeight) * 0.06)));
    const aspectRatio = documentAspectRatioRef.current;
    const innerAvailableWidth = Math.max(1, availableWidth - inset * 2);
    const innerAvailableHeight = Math.max(1, availableHeight - inset * 2);

    let imageWidth = innerAvailableWidth;
    let imageHeight = imageWidth / aspectRatio;
    if (imageHeight > innerAvailableHeight) {
      imageHeight = innerAvailableHeight;
      imageWidth = imageHeight * aspectRatio;
    }
    imageWidth = Math.max(1, Math.floor(imageWidth));
    imageHeight = Math.max(1, Math.floor(imageHeight));

    const width = imageWidth + inset * 2;
    const height = imageHeight + inset * 2;

    canvas.setDimensions({ width, height });
    applyBaseImageFit(canvas, imageWidth, imageHeight, inset);
    canvas.requestRenderAll();
    setDocumentSize({ width, height });
  }, [applyBaseImageFit]);

  const notifyContainerResize = useCallback(
    (width: number, height: number) => {
      availableSizeRef.current = { width, height };
      fitCanvasToDocument();
    },
    [fitCanvasToDocument],
  );

  const commitHistorySnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isRestoringRef.current) return;
    const data = canvas.toObject(["layerId", "layerName"]) as Record<string, unknown>;
    setHistory((prev) => {
      const truncated = prev.slice(0, historyIndexRef.current + 1);
      const nextIndex = truncated.length;
      const entry: HistoryEntrySnapshot = {
        id: `undo-${nextIndex}-${Date.now()}`,
        label: `Undo ${nextIndex + 1}`,
        data,
        aspectRatio: documentAspectRatioRef.current,
      };
      const next = [...truncated, entry];
      historyIndexRef.current = next.length - 1;
      setHistoryIndexState(historyIndexRef.current);
      return next;
    });
  }, []);

  const applyFiltersForLayer = useCallback((id: string, state: FilterState) => {
    const obj = layerObjectsRef.current.get(id);
    if (!obj || !(obj instanceof FabricImage)) return;
    obj.filters = buildFabricFilters(state);
    obj.globalCompositeOperation = BLEND_MODE_TO_COMPOSITE_OPERATION[state.blendMode];
    obj.applyFilters();
    canvasRef.current?.requestRenderAll();
  }, []);

  const registerCanvas = useCallback(
    (canvas: Canvas) => {
      canvasRef.current = canvas;
      setRegisteredCanvas(canvas);
      initFilterBackend();

      canvas.on("object:added", syncLayers);
      canvas.on("object:removed", syncLayers);
      canvas.on("object:modified", () => {
        syncLayers();
        commitHistorySnapshot();
      });
      canvas.on("selection:created", (event) => {
        const target = event.selected?.[0] as LayerObject | undefined;
        if (target?.layerId) setActiveLayer(target.layerId, target);
      });
      canvas.on("selection:updated", (event) => {
        const target = event.selected?.[0] as LayerObject | undefined;
        if (target?.layerId) setActiveLayer(target.layerId, target);
      });
      // Pinch/ctrl+scroll zooms toward the cursor (matching Photoshop/Figma);
      // plain scroll pans, matching a normal scrollable canvas.
      canvas.on("mouse:wheel", (opt) => {
        const evt = opt.e;
        if (evt.ctrlKey || evt.metaKey) {
          const nextZoom = clampZoom(canvas.getZoom() * 0.999 ** evt.deltaY);
          canvas.zoomToPoint(new Point(evt.offsetX, evt.offsetY), nextZoom);
          setZoomState(nextZoom);
        } else {
          canvas.relativePan(new Point(-evt.deltaX, -evt.deltaY));
        }
        evt.preventDefault();
        evt.stopPropagation();
      });

      canvas.on("path:created", (event) => {
        const path = event.path as LayerObject;
        if (healModeRef.current) {
          // Manual heal-brush stroke — kept only as a live-preview overlay,
          // never committed as a real layer; applyHealMode() rasterizes
          // these into a reconstruction mask instead.
          path.set({ selectable: false, evented: false, excludeFromExport: true });
          healPathsRef.current.push(path);
          setHasHealStrokes(true);
          canvas.requestRenderAll();
          return;
        }
        if (drawingToolRef.current === "lasso") {
          const pathBounds = path.getBoundingRect();
          canvas.remove(path);
          const hits = canvas.getObjects().filter((obj) => {
            const b = obj.getBoundingRect();
            const noOverlap =
              b.left > pathBounds.left + pathBounds.width ||
              b.left + b.width < pathBounds.left ||
              b.top > pathBounds.top + pathBounds.height ||
              b.top + b.height < pathBounds.top;
            return !noOverlap;
          });
          if (hits.length === 1) {
            canvas.setActiveObject(hits[0]);
            const hit = hits[0] as LayerObject;
            if (hit.layerId) setActiveLayer(hit.layerId, hit);
          } else if (hits.length > 1) {
            canvas.setActiveObject(new ActiveSelection(hits, { canvas }));
          }
          canvas.requestRenderAll();
        } else {
          const id = nextLayerId();
          path.layerId = id;
          path.layerName = `Brush ${layerObjectsRef.current.size + 1}`;
          syncLayers();
          commitHistorySnapshot();
        }
      });
    },
    [syncLayers, commitHistorySnapshot, setActiveLayer],
  );

  const applyDrawingMode = useCallback((tool: DrawingTool, color: string, width: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (tool === "selection") {
      canvas.isDrawingMode = false;
      return;
    }
    canvas.isDrawingMode = true;
    const brush = new PencilBrush(canvas);
    brush.color = color;
    brush.width = width;
    if (tool === "lasso") {
      brush.strokeDashArray = [6, 4];
    }
    canvas.freeDrawingBrush = brush;
  }, []);

  const setDrawingTool = useCallback(
    (tool: DrawingTool) => {
      // Switching to a normal drawing tool mid heal-brush session discards
      // any in-progress heal strokes (inlined rather than calling
      // cancelHealMode, which is declared later in this file and would be a
      // temporal-dead-zone dependency here).
      if (healModeRef.current) {
        const canvas = canvasRef.current;
        healPathsRef.current.forEach((path) => canvas?.remove(path));
        healPathsRef.current = [];
        healModeRef.current = false;
        setHealMode(false);
        setHasHealStrokes(false);
      }
      drawingToolRef.current = tool;
      setDrawingToolState(tool);
      applyDrawingMode(tool, brushColor, brushWidth);
    },
    [applyDrawingMode, brushColor, brushWidth],
  );

  const handleSetBrushColor = useCallback(
    (color: string) => {
      setBrushColor(color);
      // Heal mode's brush always uses its own fixed highlight color — the
      // chosen paint color is still remembered in state for when the user
      // returns to the real Brush tool, it just doesn't touch the live
      // canvas brush while healing.
      if (healModeRef.current) return;
      applyDrawingMode(drawingToolRef.current, color, brushWidth);
    },
    [applyDrawingMode, brushWidth],
  );

  const handleSetBrushWidth = useCallback(
    (width: number) => {
      setBrushWidth(width);
      // The width slider is shared with heal mode — swap in a freshly-built
      // heal brush at the new width rather than routing through
      // applyDrawingMode, which would reset the canvas back to the last
      // selection/brush/lasso tool and drop the heal-highlight brush
      // mid-session.
      if (healModeRef.current) {
        const canvas = canvasRef.current;
        if (canvas) {
          const brush = new PencilBrush(canvas);
          brush.color = HEAL_BRUSH_COLOR;
          brush.width = width;
          canvas.freeDrawingBrush = brush;
        }
        return;
      }
      applyDrawingMode(drawingToolRef.current, brushColor, width);
    },
    [applyDrawingMode, brushColor],
  );

  const unregisterCanvas = useCallback(() => {
    canvasRef.current = null;
    setRegisteredCanvas(null);
    layerObjectsRef.current = new Map();
    historyIndexRef.current = -1;
    baseImageLayerIdRef.current = null;
    documentAspectRatioRef.current = DEFAULT_DOCUMENT_ASPECT_RATIO;
    availableSizeRef.current = { width: 0, height: 0 };
    setDocumentSize({ width: 0, height: 0 });
    setHasImage(false);
    setIsImageLoading(false);
    setIsAutoCleaning(false);
    setAutoCleanPreview(false);
    setAutoCleanMessage(null);
    autoCleanMarkRef.current = null;
    autoCleanOverlayRef.current = null;
    if (autoCleanMessageTimerRef.current) {
      clearTimeout(autoCleanMessageTimerRef.current);
      autoCleanMessageTimerRef.current = null;
    }
    healModeRef.current = false;
    healPathsRef.current = [];
    setHealMode(false);
    setHasHealStrokes(false);
    setLayers([]);
    setActiveLayer(null, null);
    setFilterStateByLayer({});
    setHistory([]);
    setHistoryIndexState(-1);
    setCropMode(false);
    setBeforeAfter(false);
  }, [setActiveLayer]);

  const loadImageFromFile = useCallback(
    async (file: File) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      setIsImageLoading(true);
      try {
        // A data URL (rather than a blob: object URL) is used so the image
        // src stays valid forever — history snapshots serialize this src
        // string and re-fetch it on every undo/redo via loadFromJSON, and a
        // revoked blob URL would silently break every jump to a snapshot
        // taken before the revoke.
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
          reader.readAsDataURL(file);
        });

        const image = (await FabricImage.fromURL(dataUrl)) as LayerObject;
        // Fabric objects default to center-origin coordinates, where left/top
        // address the object's center rather than its top-left corner.
        // Pinning to a top-left origin keeps this positioning math (and
        // every other left/top read elsewhere — crop bounds, snapping, dim
        // panels) in the corner-based coordinates the rest of this file
        // assumes.
        image.set({ originX: "left", originY: "top" });

        const id = nextLayerId();
        image.layerId = id;
        image.layerName = `Layer ${layerObjectsRef.current.size + 1}`;

        const isBaseImage = baseImageLayerIdRef.current === null;

        if (isBaseImage) {
          // The document's very first photo defines the page itself — the
          // card is resized to this image's own aspect ratio and the image
          // fills it exactly, instead of floating inside a generically
          // shaped frame.
          baseImageLayerIdRef.current = id;
          documentAspectRatioRef.current = (image.width ?? 1) / (image.height ?? 1);
          canvas.add(image);
          fitCanvasToDocument();
        } else {
          // A second image dropped onto an existing document is an overlay,
          // not a new page — it sits inset within the current canvas rather
          // than resizing (or covering) the document underneath it.
          const canvasWidth = canvas.getWidth();
          const canvasHeight = canvas.getHeight();
          const imageWidth = image.width ?? canvasWidth;
          const imageHeight = image.height ?? canvasHeight;
          const scale = Math.min(
            (canvasWidth * IMAGE_FIT_PADDING) / imageWidth,
            (canvasHeight * IMAGE_FIT_PADDING) / imageHeight,
          );
          image.scale(scale);
          image.set({
            left: (canvasWidth - image.getScaledWidth()) / 2,
            top: (canvasHeight - image.getScaledHeight()) / 2,
          });
          canvas.add(image);
        }

        canvas.setActiveObject(image);
        canvas.requestRenderAll();

        setFilterStateByLayer((prev) => ({ ...prev, [id]: { ...DEFAULT_FILTER_STATE, curvePoints: DEFAULT_CURVE_POINTS } }));
        setActiveLayer(id, image);
        setHasImage(true);
        commitHistorySnapshot();
      } finally {
        setIsImageLoading(false);
      }
    },
    [commitHistorySnapshot, fitCanvasToDocument, setActiveLayer],
  );

  // Removes any active Auto Clean preview overlay/state without applying it.
  const cancelAutoClean = useCallback(() => {
    const canvas = canvasRef.current;
    if (autoCleanOverlayRef.current) {
      canvas?.remove(autoCleanOverlayRef.current);
      autoCleanOverlayRef.current = null;
    }
    autoCleanMarkRef.current = null;
    setAutoCleanPreview(false);
    canvas?.requestRenderAll();
  }, []);

  const showAutoCleanMessage = useCallback((message: string) => {
    if (autoCleanMessageTimerRef.current) clearTimeout(autoCleanMessageTimerRef.current);
    setAutoCleanMessage(message);
    autoCleanMessageTimerRef.current = setTimeout(() => setAutoCleanMessage(null), 2600);
  }, []);

  // Phase 1 — locates the small watermark/logo mark that tends to sit in a
  // photo's bottom-right corner (see lib/canvas/autoClean.ts) and shows it
  // as a dashed preview overlay for the user to confirm; nothing about the
  // image itself changes yet. Always targets the base photo (matching
  // exportImage's own notion of "the image"), not whatever layer happens to
  // be selected. If nothing confident enough is found, surfaces a message
  // instead of guessing at a larger area.
  const startAutoClean = useCallback(() => {
    const canvas = canvasRef.current;
    const baseId = baseImageLayerIdRef.current;
    const obj = baseId ? layerObjectsRef.current.get(baseId) : undefined;
    if (!canvas || !obj || !(obj instanceof FabricImage) || cropMode || autoCleanPreview || isAutoCleaning || healMode)
      return;

    // Reads from the untouched original element (rather than getElement(),
    // which returns the already-filtered element when exposure/contrast/
    // curve filters are active) so detection isn't thrown off by those
    // filters, and so applyAutoClean's setElement() re-applies them exactly
    // once.
    const sourceElement = obj._originalElement as CanvasImageElement;
    const { width: nativeWidth, height: nativeHeight } = getElementNaturalSize(sourceElement);
    if (!nativeWidth || !nativeHeight) return;

    const mark = detectMarkFromElement(sourceElement, nativeWidth, nativeHeight);
    if (!mark) {
      showAutoCleanMessage("No watermark-like mark detected");
      return;
    }

    autoCleanMarkRef.current = mark;

    // Native image pixel coordinates -> Fabric object space, the same
    // mapping useCanvasCrop's commit() uses in reverse.
    const scaleX = obj.scaleX ?? 1;
    const scaleY = obj.scaleY ?? 1;
    const cropX = obj.cropX ?? 0;
    const cropY = obj.cropY ?? 0;
    const overlay = new Ellipse({
      originX: "center",
      originY: "center",
      left: (obj.left ?? 0) + (mark.ellipse.cx - cropX) * scaleX,
      top: (obj.top ?? 0) + (mark.ellipse.cy - cropY) * scaleY,
      rx: mark.ellipse.rx * scaleX,
      ry: mark.ellipse.ry * scaleY,
      fill: "rgba(56, 189, 248, 0.18)",
      stroke: "#38BDF8",
      strokeDashArray: [6, 4],
      strokeWidth: 2,
      selectable: false,
      evented: false,
      excludeFromExport: true,
    });
    autoCleanOverlayRef.current = overlay;
    canvas.add(overlay);
    canvas.bringObjectToFront(overlay);
    canvas.requestRenderAll();
    setAutoCleanPreview(true);
  }, [cropMode, autoCleanPreview, isAutoCleaning, healMode, showAutoCleanMessage]);

  // Phase 2 — reconstructs exactly the mask that was just previewed (never
  // recomputed here), so what the user approved is what gets applied.
  const applyAutoClean = useCallback(async () => {
    const canvas = canvasRef.current;
    const baseId = baseImageLayerIdRef.current;
    const obj = baseId ? layerObjectsRef.current.get(baseId) : undefined;
    const mark = autoCleanMarkRef.current;
    if (!canvas || !obj || !(obj instanceof FabricImage) || !mark) {
      cancelAutoClean();
      return;
    }

    if (autoCleanOverlayRef.current) {
      canvas.remove(autoCleanOverlayRef.current);
      autoCleanOverlayRef.current = null;
    }
    setAutoCleanPreview(false);
    setIsAutoCleaning(true);
    try {
      const sourceElement = obj._originalElement as CanvasImageElement;
      const { width: nativeWidth, height: nativeHeight } = getElementNaturalSize(sourceElement);
      if (!nativeWidth || !nativeHeight) return;

      const cleanedCanvas = await reconstructMark(sourceElement, nativeWidth, nativeHeight, mark);
      const dataUrl = cleanedCanvas.toDataURL("image/png");
      const newImage = await loadHtmlImage(dataUrl);

      // setElement() resets the crop window to the new element's full size —
      // restore whatever crop was previously applied so it survives.
      const prevWidth = obj.width;
      const prevHeight = obj.height;
      const prevCropX = obj.cropX;
      const prevCropY = obj.cropY;
      obj.setElement(newImage);
      obj.set({ width: prevWidth, height: prevHeight, cropX: prevCropX, cropY: prevCropY });
      obj.setCoords();
      canvas.requestRenderAll();
      commitHistorySnapshot();
    } finally {
      autoCleanMarkRef.current = null;
      setIsAutoCleaning(false);
    }
  }, [cancelAutoClean, commitHistorySnapshot]);

  // Removes any live heal-brush preview strokes and restores whatever
  // drawing mode was active before heal mode started, without changing the
  // image.
  const cancelHealMode = useCallback(() => {
    const canvas = canvasRef.current;
    healPathsRef.current.forEach((path) => canvas?.remove(path));
    healPathsRef.current = [];
    healModeRef.current = false;
    setHealMode(false);
    setHasHealStrokes(false);
    applyDrawingMode(drawingToolRef.current, brushColor, brushWidth);
    canvas?.requestRenderAll();
  }, [applyDrawingMode, brushColor, brushWidth]);

  // Switches the canvas into free-drawing mode with a translucent
  // heal-highlight brush (distinct from the real paint Brush's color/tool)
  // so the user can mark an arbitrary area to remove. Mutually exclusive
  // with crop and Auto Clean preview.
  const enterHealMode = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasImage || cropMode || autoCleanPreview || healMode) return;
    cancelAutoClean();
    const brush = new PencilBrush(canvas);
    brush.color = HEAL_BRUSH_COLOR;
    brush.width = brushWidth;
    canvas.freeDrawingBrush = brush;
    canvas.isDrawingMode = true;
    healModeRef.current = true;
    setHasHealStrokes(false);
    setHealMode(true);
  }, [hasImage, cropMode, autoCleanPreview, healMode, cancelAutoClean, brushWidth]);

  // Rasterizes the accumulated heal-brush strokes into a native-resolution
  // mask (object-space canvas pixels -> native image pixels, the same
  // mapping useCanvasCrop's commit() and Auto Clean's preview overlay use)
  // and reconstructs exactly that masked area.
  const applyHealMode = useCallback(async () => {
    const canvas = canvasRef.current;
    const baseId = baseImageLayerIdRef.current;
    const obj = baseId ? layerObjectsRef.current.get(baseId) : undefined;
    const paths = healPathsRef.current;
    if (!canvas || !obj || !(obj instanceof FabricImage) || paths.length === 0) {
      cancelHealMode();
      return;
    }

    const imgBounds = {
      left: obj.left ?? 0,
      top: obj.top ?? 0,
      width: obj.getScaledWidth(),
      height: obj.getScaledHeight(),
    };

    // Union bounding box of every stroke, padded a little for feather
    // headroom and clamped to the photo's own bounds so a stray stroke off
    // the edge can't touch anything outside the image.
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const path of paths) {
      const b = path.getBoundingRect();
      minX = Math.min(minX, b.left);
      minY = Math.min(minY, b.top);
      maxX = Math.max(maxX, b.left + b.width);
      maxY = Math.max(maxY, b.top + b.height);
    }
    const pad = 4;
    minX = Math.max(imgBounds.left, minX - pad);
    minY = Math.max(imgBounds.top, minY - pad);
    maxX = Math.min(imgBounds.left + imgBounds.width, maxX + pad);
    maxY = Math.min(imgBounds.top + imgBounds.height, maxY + pad);
    const boxWidth = Math.max(1, Math.round(maxX - minX));
    const boxHeight = Math.max(1, Math.round(maxY - minY));

    healModeRef.current = false;
    setHealMode(false);
    setHasHealStrokes(false);
    applyDrawingMode(drawingToolRef.current, brushColor, brushWidth);
    paths.forEach((path) => canvas.remove(path));
    healPathsRef.current = [];

    if (minX >= maxX || minY >= maxY) {
      canvas.requestRenderAll();
      return;
    }

    setIsAutoCleaning(true);
    try {
      const sourceElement = obj._originalElement as CanvasImageElement;
      const { width: nativeWidth, height: nativeHeight } = getElementNaturalSize(sourceElement);
      if (!nativeWidth || !nativeHeight) return;

      // Render the strokes at their own on-screen (object-space) resolution
      // first — Fabric's own render() reproduces the exact stroke geometry
      // — then resample into native image pixel space, same as any other
      // object-space -> native conversion in this file.
      const strokeCanvas = document.createElement("canvas");
      strokeCanvas.width = boxWidth;
      strokeCanvas.height = boxHeight;
      const strokeCtx = strokeCanvas.getContext("2d");
      if (!strokeCtx) return;
      strokeCtx.translate(-minX, -minY);
      paths.forEach((path) => path.render(strokeCtx));

      const scaleX = obj.scaleX ?? 1;
      const scaleY = obj.scaleY ?? 1;
      const cropX = obj.cropX ?? 0;
      const cropY = obj.cropY ?? 0;
      const nativeX = (minX - imgBounds.left) / scaleX + cropX;
      const nativeY = (minY - imgBounds.top) / scaleY + cropY;
      const nativeBoxWidth = Math.max(1, Math.round(boxWidth / scaleX));
      const nativeBoxHeight = Math.max(1, Math.round(boxHeight / scaleY));
      const rectX = Math.max(0, Math.min(nativeWidth - 1, Math.round(nativeX)));
      const rectY = Math.max(0, Math.min(nativeHeight - 1, Math.round(nativeY)));
      const rect: RegionRect = {
        x: rectX,
        y: rectY,
        width: Math.max(1, Math.min(nativeBoxWidth, nativeWidth - rectX)),
        height: Math.max(1, Math.min(nativeBoxHeight, nativeHeight - rectY)),
      };

      const nativeMaskCanvas = document.createElement("canvas");
      nativeMaskCanvas.width = rect.width;
      nativeMaskCanvas.height = rect.height;
      const nativeMaskCtx = nativeMaskCanvas.getContext("2d");
      if (!nativeMaskCtx) return;
      nativeMaskCtx.drawImage(strokeCanvas, 0, 0, boxWidth, boxHeight, 0, 0, rect.width, rect.height);
      const maskData = nativeMaskCtx.getImageData(0, 0, rect.width, rect.height);
      const rawAlpha = new Float32Array(rect.width * rect.height);
      for (let i = 0; i < rawAlpha.length; i++) rawAlpha[i] = maskData.data[i * 4 + 3] / 255;
      const alpha = featherAlphaMask(rawAlpha, rect.width, rect.height, 2);

      const cleanedCanvas = await reconstructManualMask(sourceElement, nativeWidth, nativeHeight, { rect, alpha });
      const dataUrl = cleanedCanvas.toDataURL("image/png");
      const newImage = await loadHtmlImage(dataUrl);

      // setElement() resets the crop window to the new element's full size —
      // restore whatever crop was previously applied so it survives.
      const prevWidth = obj.width;
      const prevHeight = obj.height;
      const prevCropX = obj.cropX;
      const prevCropY = obj.cropY;
      obj.setElement(newImage);
      obj.set({ width: prevWidth, height: prevHeight, cropX: prevCropX, cropY: prevCropY });
      obj.setCoords();
      canvas.requestRenderAll();
      commitHistorySnapshot();
    } finally {
      setIsAutoCleaning(false);
    }
  }, [cancelHealMode, applyDrawingMode, brushColor, brushWidth, commitHistorySnapshot]);

  const selectLayer = useCallback(
    (id: string) => {
      const obj = layerObjectsRef.current.get(id);
      const canvas = canvasRef.current;
      if (!obj || !canvas) return;
      canvas.setActiveObject(obj);
      canvas.requestRenderAll();
      setActiveLayer(id, obj);
    },
    [setActiveLayer],
  );

  const toggleLayerVisibility = useCallback(
    (id: string) => {
      const obj = layerObjectsRef.current.get(id);
      if (!obj) return;
      obj.set("visible", !obj.visible);
      canvasRef.current?.requestRenderAll();
      syncLayers();
      commitHistorySnapshot();
    },
    [syncLayers, commitHistorySnapshot],
  );

  const deleteLayer = useCallback(
    (id: string) => {
      const canvas = canvasRef.current;
      const obj = layerObjectsRef.current.get(id);
      if (!canvas || !obj) return;
      canvas.remove(obj);
      setFilterStateByLayer((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (activeLayerIdRef.current === id) setActiveLayer(null, null);
      setHasImage(canvas.getObjects().length > 0);

      // Losing the base photo means the page itself no longer has a shape
      // to follow — fall back to the default placeholder aspect ratio
      // instead of leaving the canvas pinned to whatever the deleted photo
      // last measured.
      if (id === baseImageLayerIdRef.current) {
        baseImageLayerIdRef.current = null;
        documentAspectRatioRef.current = DEFAULT_DOCUMENT_ASPECT_RATIO;
        fitCanvasToDocument();
      } else {
        canvas.requestRenderAll();
      }

      commitHistorySnapshot();
    },
    [commitHistorySnapshot, fitCanvasToDocument, setActiveLayer],
  );

  const reorderLayer = useCallback(
    (id: string, direction: "up" | "down") => {
      const canvas = canvasRef.current;
      const obj = layerObjectsRef.current.get(id);
      if (!canvas || !obj) return;
      if (direction === "up") canvas.bringObjectForward(obj);
      else canvas.sendObjectBackwards(obj);
      canvas.requestRenderAll();
      syncLayers();
      commitHistorySnapshot();
    },
    [syncLayers, commitHistorySnapshot],
  );

  const setExposure = useCallback(
    (value: number) => {
      if (!activeLayerId) return;
      setFilterStateByLayer((prev) => {
        const current = prev[activeLayerId] ?? DEFAULT_FILTER_STATE;
        const nextState = { ...current, exposure: value };
        applyFiltersForLayer(activeLayerId, nextState);
        return { ...prev, [activeLayerId]: nextState };
      });
    },
    [activeLayerId, applyFiltersForLayer],
  );

  const setContrast = useCallback(
    (value: number) => {
      if (!activeLayerId) return;
      setFilterStateByLayer((prev) => {
        const current = prev[activeLayerId] ?? DEFAULT_FILTER_STATE;
        const nextState = { ...current, contrast: value };
        applyFiltersForLayer(activeLayerId, nextState);
        return { ...prev, [activeLayerId]: nextState };
      });
    },
    [activeLayerId, applyFiltersForLayer],
  );

  const setBlendMode = useCallback(
    (mode: BlendModeKey) => {
      if (!activeLayerId) return;
      setFilterStateByLayer((prev) => {
        const current = prev[activeLayerId] ?? DEFAULT_FILTER_STATE;
        const nextState = { ...current, blendMode: mode };
        applyFiltersForLayer(activeLayerId, nextState);
        return { ...prev, [activeLayerId]: nextState };
      });
      commitHistorySnapshot();
    },
    [activeLayerId, applyFiltersForLayer, commitHistorySnapshot],
  );

  const setCurvePoint = useCallback(
    (index: number, point: CurvePoint) => {
      if (!activeLayerId) return;
      setFilterStateByLayer((prev) => {
        const current = prev[activeLayerId] ?? DEFAULT_FILTER_STATE;
        const nextPoints = current.curvePoints.map((p, i) => (i === index ? point : p));
        const nextState = { ...current, curvePoints: nextPoints };
        applyFiltersForLayer(activeLayerId, nextState);
        return { ...prev, [activeLayerId]: nextState };
      });
    },
    [activeLayerId, applyFiltersForLayer],
  );

  const jumpToHistory = useCallback(
    (index: number) => {
      const canvas = canvasRef.current;
      const entry = history[index];
      if (!canvas || !entry) return;
      isRestoringRef.current = true;
      // A snapshot's object data only makes sense at the page shape it was
      // taken at — restore that aspect ratio (and re-fit the base photo to
      // it) before/alongside the objects themselves, or a crop undone/redone
      // across a resize would restore objects sized for a canvas that no
      // longer matches.
      documentAspectRatioRef.current = entry.aspectRatio;
      void canvas.loadFromJSON(entry.data).then(() => {
        syncLayers();
        fitCanvasToDocument();
        setHasImage(canvas.getObjects().length > 0);
        // loadFromJSON reconstructs fresh Fabric object instances, so the
        // previously-active layer id now points at a stale, removed object —
        // re-resolve it against the just-rebuilt map.
        const currentId = activeLayerIdRef.current;
        setActiveLayerObjectState(currentId ? layerObjectsRef.current.get(currentId) ?? null : null);
        historyIndexRef.current = index;
        setHistoryIndexState(index);
        isRestoringRef.current = false;
      });
    },
    [history, syncLayers, fitCanvasToDocument],
  );

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    jumpToHistory(historyIndex - 1);
  }, [historyIndex, jumpToHistory]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    jumpToHistory(historyIndex + 1);
  }, [historyIndex, history.length, jumpToHistory]);

  // Guards against entering crop mode with nothing valid to crop (mirrors
  // the disabled state of the toolbar's crop button, just defensively).
  // Also cancels any pending Auto Clean preview / heal-brush session — the
  // overlays would otherwise fight for the same canvas space.
  const enterCropMode = useCallback(() => {
    if (activeLayerObject) {
      cancelAutoClean();
      cancelHealMode();
      setCropMode(true);
    }
  }, [activeLayerObject, cancelAutoClean, cancelHealMode]);
  const cancelCropMode = useCallback(() => setCropMode(false), []);

  // The crop rect's own lifecycle, custom resize/move handles, dimension
  // math, and dimmed-mask/grid chrome all live in this hook — see
  // hooks/useCanvasCrop.ts. CanvasEngineContext just feeds it the current
  // canvas/target image and turns its commit() result into a crop on the
  // underlying FabricImage.
  const crop = useCanvasCrop({
    canvas: registeredCanvas,
    active: cropMode,
    targetImage: activeLayerObject,
  });

  const applyCrop = useCallback(() => {
    const canvas = canvasRef.current;
    const obj = activeLayerObject;
    const result = crop.commit();
    if (!canvas || !obj || !(obj instanceof FabricImage) || !result) {
      setCropMode(false);
      return;
    }

    obj.set({
      cropX: result.cropX,
      cropY: result.cropY,
      width: result.width,
      height: result.height,
      left: result.left,
      top: result.top,
    });

    // Toggling crop mode off unmounts the crop hook's overlay (rect, dimmed
    // mask, grid) via its own layout-effect cleanup, synchronously in this
    // same commit — no separate manual teardown needed here.
    setCropMode(false);

    // Cropping the base photo reshapes the page itself — resize the document
    // to the new aspect ratio so the card keeps matching the image exactly,
    // instead of leaving the cropped photo stranded inside its old frame.
    if (activeLayerId === baseImageLayerIdRef.current) {
      documentAspectRatioRef.current = (obj.width ?? 1) / (obj.height ?? 1);
      fitCanvasToDocument();
    } else {
      canvas.requestRenderAll();
    }

    commitHistorySnapshot();
  }, [activeLayerId, activeLayerObject, commitHistorySnapshot, fitCanvasToDocument, crop]);

  const setZoom = useCallback((value: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const next = clampZoom(value);
    canvas.zoomToPoint(new Point(canvas.getWidth() / 2, canvas.getHeight() / 2), next);
    canvas.requestRenderAll();
    setZoomState(next);
  }, []);

  const zoomIn = useCallback(() => setZoom(zoom * ZOOM_STEP), [setZoom, zoom]);
  const zoomOut = useCallback(() => setZoom(zoom / ZOOM_STEP), [setZoom, zoom]);

  const resetView = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.requestRenderAll();
    setZoomState(1);
  }, []);

  // Re-centers the current zoom level (undoes panning) without resetting
  // back to 100% — distinct from Reset View, which does both.
  const centerCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const vpt = canvas?.viewportTransform;
    if (!canvas || !vpt) return;
    canvas.setViewportTransform([vpt[0], vpt[1], vpt[2], vpt[3], 0, 0]);
    canvas.requestRenderAll();
  }, []);

  const toggleGrid = useCallback(() => setShowGrid((prev) => !prev), []);

  // A standalone rule-of-thirds composition guide, independent of the one
  // useCanvasCrop draws inside an active crop box — this one traces the
  // current base photo's full bounds so it's useful while framing a shot
  // even when not cropping.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !showGrid || !hasImage || cropMode) {
      if (compositionGridRef.current.length) {
        compositionGridRef.current.forEach((line) => canvas?.remove(line));
        compositionGridRef.current = [];
        canvas?.requestRenderAll();
      }
      return;
    }

    const baseId = baseImageLayerIdRef.current;
    const baseObj = baseId ? layerObjectsRef.current.get(baseId) : undefined;
    if (!baseObj) return;

    const bounds = {
      left: baseObj.left ?? 0,
      top: baseObj.top ?? 0,
      width: baseObj.getScaledWidth(),
      height: baseObj.getScaledHeight(),
    };
    const lineOptions = {
      stroke: "rgba(248, 250, 252, 0.4)",
      strokeWidth: 1,
      selectable: false,
      evented: false,
      excludeFromExport: true,
    };
    const lines = [
      new Line(
        [bounds.left + bounds.width / 3, bounds.top, bounds.left + bounds.width / 3, bounds.top + bounds.height],
        lineOptions,
      ),
      new Line(
        [
          bounds.left + (bounds.width * 2) / 3,
          bounds.top,
          bounds.left + (bounds.width * 2) / 3,
          bounds.top + bounds.height,
        ],
        lineOptions,
      ),
      new Line(
        [bounds.left, bounds.top + bounds.height / 3, bounds.left + bounds.width, bounds.top + bounds.height / 3],
        lineOptions,
      ),
      new Line(
        [
          bounds.left,
          bounds.top + (bounds.height * 2) / 3,
          bounds.left + bounds.width,
          bounds.top + (bounds.height * 2) / 3,
        ],
        lineOptions,
      ),
    ];
    lines.forEach((line) => canvas.add(line));
    compositionGridRef.current = lines;
    canvas.requestRenderAll();

    return () => {
      lines.forEach((line) => canvas.remove(line));
      if (compositionGridRef.current === lines) compositionGridRef.current = [];
      canvas.requestRenderAll();
    };
  }, [showGrid, hasImage, cropMode, documentSize]);

  const toggleBeforeAfter = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBeforeAfter((prev) => {
      const next = !prev;
      (canvas.getObjects() as LayerObject[]).forEach((layerObj) => {
        if (!(layerObj instanceof FabricImage)) return;
        const obj = layerObj as FabricImage & LayerObject;
        if (next) {
          obj.filters = [];
          obj.globalCompositeOperation = "source-over";
        } else {
          const state = obj.layerId ? filterStateByLayer[obj.layerId] : undefined;
          if (state) {
            obj.filters = buildFabricFilters(state);
            obj.globalCompositeOperation = BLEND_MODE_TO_COMPOSITE_OPERATION[state.blendMode];
          }
        }
        obj.applyFilters();
      });
      canvas.requestRenderAll();
      return next;
    });
  }, [filterStateByLayer]);

  const exportImage = useCallback(async ({ format, multiplier }: { format: ExportFormat; multiplier: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // The canvas is now larger than the document (see MAX_CANVAS_INSET) so
    // handles have room around the photo — export only the base photo's own
    // bounds, or that inset margin would show up as a solid-color border
    // baked into the downloaded file.
    const baseId = baseImageLayerIdRef.current;
    const baseObj = baseId ? layerObjectsRef.current.get(baseId) : undefined;
    const bounds =
      baseObj instanceof FabricImage
        ? { left: baseObj.left ?? 0, top: baseObj.top ?? 0, width: baseObj.getScaledWidth(), height: baseObj.getScaledHeight() }
        : undefined;
    const blob = await canvas.toBlob({ format, multiplier, quality: 0.92, ...bounds });
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `creativeflow-export.${format === "jpeg" ? "jpg" : "png"}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, []);

  // --- Landing-page hand-off: auto-load + activate the chosen tool ------
  // Refs (rather than the callbacks themselves) back the second effect below
  // so it only re-runs when hasImage actually flips — enterCropMode's own
  // identity changes the instant activeLayerObject updates (i.e. the moment
  // the image finishes loading), which would otherwise re-fire this effect
  // immediately after it already ran. Synced from an effect (not during
  // render) since mutating a ref while rendering isn't safe.
  const enterCropModeRef = useRef(enterCropMode);
  const enterHealModeRef = useRef(enterHealMode);
  const setDrawingToolRef = useRef(setDrawingTool);
  const loadImageFromFileRef = useRef(loadImageFromFile);
  useEffect(() => {
    enterCropModeRef.current = enterCropMode;
    enterHealModeRef.current = enterHealMode;
    setDrawingToolRef.current = setDrawingTool;
    loadImageFromFileRef.current = loadImageFromFile;
  });

  // Re-populated (not consumed) on every registeredCanvas change, including
  // the throwaway remount React's dev Strict Mode does on initial mount —
  // that way whichever canvas ends up being the real one still sees it.
  const pendingIntentRef = useRef<EditIntentId | null>(null);

  useEffect(() => {
    if (!registeredCanvas || !initialImageFile) return;
    pendingIntentRef.current = initialTool;
    void loadImageFromFileRef.current(initialImageFile);
  }, [registeredCanvas, initialImageFile, initialTool]);

  // Waits for hasImage to actually commit (rather than chaining off
  // loadImageFromFile's promise directly) so activeLayerObject/hasImage are
  // guaranteed fresh by the time the intent-specific tool activates.
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

  const activeFilterState = useMemo(
    () => (activeLayerId ? filterStateByLayer[activeLayerId] ?? DEFAULT_FILTER_STATE : DEFAULT_FILTER_STATE),
    [activeLayerId, filterStateByLayer],
  );

  const value = useMemo<CanvasEngineContextValue>(
    () => ({
      registerCanvas,
      unregisterCanvas,
      notifyContainerResize,
      hasImage,
      isImageLoading,
      documentSize,
      layers,
      activeLayerId,
      selectLayer,
      toggleLayerVisibility,
      deleteLayer,
      reorderLayer,
      loadImageFromFile,
      isAutoCleaning,
      autoCleanPreview,
      autoCleanMessage,
      startAutoClean,
      applyAutoClean,
      cancelAutoClean,
      healMode,
      hasHealStrokes,
      enterHealMode,
      cancelHealMode,
      applyHealMode,
      activeFilterState,
      setExposure,
      setContrast,
      setBlendMode,
      setCurvePoint,
      commitHistorySnapshot,
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
      cropPixelSize: crop.pixelSize,
      cropAspectLocked: crop.aspectLocked,
      setCropAspectLocked: crop.setAspectLocked,
      cropPreset: crop.preset,
      applyCropPreset: crop.applyPreset,
      setCropWidthPx: crop.setWidthPx,
      setCropHeightPx: crop.setHeightPx,
      cropBadgeRect: crop.badgeRect,
      beforeAfter,
      toggleBeforeAfter,
      exportImage,
      drawingTool,
      setDrawingTool,
      brushColor,
      setBrushColor: handleSetBrushColor,
      brushWidth,
      setBrushWidth: handleSetBrushWidth,
      zoom,
      setZoom,
      zoomIn,
      zoomOut,
      resetView,
      centerCanvas,
      showGrid,
      toggleGrid,
    }),
    [
      registerCanvas,
      unregisterCanvas,
      notifyContainerResize,
      hasImage,
      isImageLoading,
      documentSize,
      layers,
      activeLayerId,
      selectLayer,
      toggleLayerVisibility,
      deleteLayer,
      reorderLayer,
      loadImageFromFile,
      isAutoCleaning,
      autoCleanPreview,
      autoCleanMessage,
      startAutoClean,
      applyAutoClean,
      cancelAutoClean,
      healMode,
      hasHealStrokes,
      enterHealMode,
      cancelHealMode,
      applyHealMode,
      activeFilterState,
      setExposure,
      setContrast,
      setBlendMode,
      setCurvePoint,
      commitHistorySnapshot,
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
      crop,
      beforeAfter,
      toggleBeforeAfter,
      exportImage,
      drawingTool,
      setDrawingTool,
      brushColor,
      handleSetBrushColor,
      brushWidth,
      handleSetBrushWidth,
      zoom,
      setZoom,
      zoomIn,
      zoomOut,
      resetView,
      centerCanvas,
      showGrid,
      toggleGrid,
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
