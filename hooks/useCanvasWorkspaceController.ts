"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAABB, hitTestHandle, toObject, CURSOR_BY_HANDLE } from "@/lib/canvasEngine/geometry";
import { hitTestLayers, stepDrag, stepResize, stepRotate } from "@/lib/canvasEngine/interaction";
import { hitTestCropBody, hitTestCropHandle, type CropHandleKey } from "@/lib/canvasEngine/crop";
import type { EngineLayer, HandleId, InteractionMode, Point, Rect, SnapGuide, TransformState, Viewport } from "@/lib/canvasEngine/types";
import { zoomToPoint } from "@/lib/canvasEngine/viewport";
import type { DrawingTool } from "@/types/canvasEngine";

interface UseCanvasWorkspaceControllerOptions {
  /** Owned by the caller (CanvasWorkspace) and attached to the interactive container element — the hook only reads it to wire up a native, non-passive wheel listener. Keeping ref ownership with the component avoids returning a ref bundled inside this hook's result object, which the react-hooks/refs lint rule treats as tainting every render-time read of any other field on that same object. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  layers: EngineLayer[];
  activeLayerId: string | null;
  activeLayerIsBase: boolean;
  viewport: Viewport;
  setViewport: (viewport: Viewport) => void;
  documentSize: { width: number; height: number };
  drawingTool: DrawingTool;
  selectLayer: (id: string) => void;
  deselectLayer: () => void;
  updateLayerTransform: (id: string, transform: TransformState) => void;
  commitHistorySnapshot: () => void;
  /** While true, pointer interaction is routed to the crop window instead of normal layer drag/resize/rotate. */
  cropMode: boolean;
  cropRect: Rect | null;
  beginCropHandleDrag: (handle: CropHandleKey) => void;
  beginCropBodyDrag: (screenPoint: Point) => void;
  updateCropDrag: (screenPoint: Point) => void;
  endCropDrag: () => void;
}

export interface CanvasWorkspaceController {
  cursor: string;
  mode: InteractionMode;
  guides: SnapGuide[];
  isOutOfBounds: boolean;
  containerProps: {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  };
}

interface DragState {
  mode: InteractionMode;
  layerId: string | null;
  handle: HandleId | null;
  startTransform: TransformState | null;
  startPointerObject: Point | null;
  startViewport: Viewport | null;
  /** Whether the transform actually changed since pointerdown — a plain click-to-select (no movement) shouldn't push a no-op history entry. */
  didChange: boolean;
}

const IDLE_DRAG_STATE: DragState = {
  mode: "idle",
  layerId: null,
  handle: null,
  startTransform: null,
  startPointerObject: null,
  startViewport: null,
  didChange: false,
};

export function useCanvasWorkspaceController(options: UseCanvasWorkspaceControllerOptions): CanvasWorkspaceController {
  const {
    containerRef,
    layers,
    activeLayerId,
    activeLayerIsBase,
    viewport,
    setViewport,
    documentSize,
    drawingTool,
    selectLayer,
    deselectLayer,
    updateLayerTransform,
    commitHistorySnapshot,
    cropMode,
    cropRect,
    beginCropHandleDrag,
    beginCropBodyDrag,
    updateCropDrag,
    endCropDrag,
  } = options;

  const [mode, setMode] = useState<InteractionMode>("idle");
  const [guides, setGuides] = useState<SnapGuide[]>([]);
  const [isOutOfBounds, setIsOutOfBounds] = useState(false);
  const [cursor, setCursor] = useState("default");
  const [spaceHeld, setSpaceHeld] = useState(false);
  const dragRef = useRef<DragState>(IDLE_DRAG_STATE);

  // Space+drag panning, matching Photoshop/Figma — tracked at document level
  // so it works regardless of which element currently has focus.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" && !event.repeat) setSpaceHeld(true);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpaceHeld(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const activeLayer = activeLayerId ? layers.find((l) => l.id === activeLayerId) ?? null : null;
  const page = useMemo(() => ({ x: 0, y: 0, width: documentSize.width, height: documentSize.height }), [documentSize.width, documentSize.height]);

  const getScreenPoint = useCallback((event: React.PointerEvent<HTMLDivElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const screenPoint = getScreenPoint(event);
      const shouldPan = drawingTool === "pan" || spaceHeld || event.button === 1;

      if (shouldPan) {
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = { ...IDLE_DRAG_STATE, mode: "panning", startPointerObject: screenPoint, startViewport: viewport };
        setMode("panning");
        setCursor("grabbing");
        return;
      }

      if (cropMode) {
        if (cropRect) {
          const handle = hitTestCropHandle(screenPoint, cropRect, viewport);
          if (handle) {
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = { ...IDLE_DRAG_STATE, mode: "cropping" };
            beginCropHandleDrag(handle);
            setMode("cropping");
            return;
          }
          if (hitTestCropBody(screenPoint, cropRect, viewport)) {
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = { ...IDLE_DRAG_STATE, mode: "cropping" };
            beginCropBodyDrag(screenPoint);
            setMode("cropping");
            return;
          }
        }
        return;
      }

      const objectPoint = toObject(screenPoint, viewport);

      if (activeLayer && !activeLayer.locked) {
        const handle = hitTestHandle(screenPoint, activeLayer.transform, viewport);
        if (handle) {
          event.currentTarget.setPointerCapture(event.pointerId);
          const nextMode: InteractionMode = handle === "rotate" ? "rotating" : "resizing";
          dragRef.current = {
            mode: nextMode,
            layerId: activeLayer.id,
            handle,
            startTransform: activeLayer.transform,
            startPointerObject: objectPoint,
            startViewport: null,
            didChange: false,
          };
          setMode(nextMode);
          return;
        }
      }

      const hitId = hitTestLayers(layers, objectPoint);
      if (!hitId) {
        deselectLayer();
        dragRef.current = IDLE_DRAG_STATE;
        return;
      }

      selectLayer(hitId);
      const hitLayer = layers.find((l) => l.id === hitId);
      if (!hitLayer || hitLayer.locked) return;

      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        mode: "dragging",
        layerId: hitId,
        handle: null,
        startTransform: hitLayer.transform,
        startPointerObject: objectPoint,
        startViewport: null,
        didChange: false,
      };
      setMode("dragging");
    },
    [
      activeLayer,
      beginCropBodyDrag,
      beginCropHandleDrag,
      cropMode,
      cropRect,
      deselectLayer,
      drawingTool,
      getScreenPoint,
      layers,
      selectLayer,
      spaceHeld,
      viewport,
    ],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const screenPoint = getScreenPoint(event);
      const drag = dragRef.current;

      if (drag.mode === "panning" && drag.startPointerObject && drag.startViewport) {
        const dx = screenPoint.x - drag.startPointerObject.x;
        const dy = screenPoint.y - drag.startPointerObject.y;
        setViewport({ zoom: drag.startViewport.zoom, panX: drag.startViewport.panX + dx, panY: drag.startViewport.panY + dy });
        return;
      }

      if (cropMode) {
        if (drag.mode === "cropping") {
          updateCropDrag(screenPoint);
          return;
        }
        if (cropRect) {
          const handle = hitTestCropHandle(screenPoint, cropRect, viewport);
          if (handle) {
            setCursor(CURSOR_BY_HANDLE[handle]);
            return;
          }
          setCursor(hitTestCropBody(screenPoint, cropRect, viewport) ? "move" : "default");
          return;
        }
        setCursor("default");
        return;
      }

      const objectPoint = toObject(screenPoint, viewport);

      if (drag.mode === "dragging" && drag.layerId && drag.startTransform && drag.startPointerObject) {
        const delta = { x: objectPoint.x - drag.startPointerObject.x, y: objectPoint.y - drag.startPointerObject.y };
        const siblingBoxes = layers.filter((l) => l.id !== drag.layerId).map((l) => getAABB(l.transform));
        const result = stepDrag(drag.startTransform, delta, siblingBoxes, page, activeLayerIsBase);
        updateLayerTransform(drag.layerId, result.transform);
        setGuides(result.guides);
        setIsOutOfBounds(result.outOfBounds);
        drag.didChange = true;
        return;
      }

      if (drag.mode === "resizing" && drag.layerId && drag.handle && drag.handle !== "rotate" && drag.startTransform) {
        const result = stepResize(drag.startTransform, drag.handle, objectPoint, page, activeLayerIsBase);
        updateLayerTransform(drag.layerId, result.transform);
        setIsOutOfBounds(result.outOfBounds);
        drag.didChange = true;
        return;
      }

      if (drag.mode === "rotating" && drag.layerId && drag.startTransform) {
        const transform = stepRotate(drag.startTransform, objectPoint);
        updateLayerTransform(drag.layerId, transform);
        drag.didChange = true;
        return;
      }

      // Idle hover — just update the cursor.
      if (activeLayer && !activeLayer.locked) {
        const handle = hitTestHandle(screenPoint, activeLayer.transform, viewport);
        if (handle) {
          setCursor(CURSOR_BY_HANDLE[handle]);
          return;
        }
      }
      setCursor(spaceHeld ? "grab" : hitTestLayers(layers, objectPoint) ? "move" : "default");
    },
    [
      activeLayer,
      activeLayerIsBase,
      cropMode,
      cropRect,
      getScreenPoint,
      layers,
      page,
      setViewport,
      spaceHeld,
      updateCropDrag,
      updateLayerTransform,
      viewport,
    ],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      const drag = dragRef.current;
      if (drag.mode === "cropping") {
        endCropDrag();
        dragRef.current = IDLE_DRAG_STATE;
        setMode("idle");
        setCursor(spaceHeld ? "grab" : "default");
        return;
      }
      if (drag.didChange && (drag.mode === "dragging" || drag.mode === "resizing" || drag.mode === "rotating")) {
        commitHistorySnapshot();
      }
      dragRef.current = IDLE_DRAG_STATE;
      setMode("idle");
      setGuides([]);
      setCursor(spaceHeld ? "grab" : "default");
    },
    [commitHistorySnapshot, endCropDrag, spaceHeld],
  );

  // React's synthetic onWheel prop is attached as a passive listener, so
  // calling event.preventDefault() inside it throws/warns and never actually
  // stops the browser's own page-scroll — wheel-zoom/pan needs a real,
  // non-passive native listener instead. viewportRef mirrors `viewport` so
  // this effect can stay mounted once (not re-subscribing on every pan/zoom
  // tick) while still reading the current value.
  const viewportRef = useRef(viewport);
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const screenPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const current = viewportRef.current;
      if (event.ctrlKey || event.metaKey) {
        setViewport(zoomToPoint(current, current.zoom * 0.999 ** event.deltaY, screenPoint));
      } else {
        setViewport({ zoom: current.zoom, panX: current.panX - event.deltaX, panY: current.panY - event.deltaY });
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [containerRef, setViewport]);

  return {
    cursor,
    mode,
    guides,
    isOutOfBounds,
    containerProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
    },
  };
}
