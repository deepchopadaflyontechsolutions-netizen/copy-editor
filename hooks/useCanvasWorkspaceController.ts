"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAABB, hitTestHandle, toObject, CURSOR_BY_HANDLE } from "@/lib/canvasEngine/geometry";
import { hitTestLayers, stepDrag, stepResize, stepRotate } from "@/lib/canvasEngine/interaction";
import { hitTestCropBody, hitTestCropHandle, type CropHandleKey } from "@/lib/canvasEngine/crop";
import type { EngineLayer, HandleId, InteractionMode, Point, Rect, SnapGuide, TransformState, Viewport } from "@/lib/canvasEngine/types";
import { clampPan, CURSOR_ZOOM_THRESHOLD, zoomCenterSettling, zoomToPoint } from "@/lib/canvasEngine/viewport";

interface UseCanvasWorkspaceControllerOptions {
  /** Owned by the caller (CanvasWorkspace) and attached to the interactive container element — the hook only reads it to compute screen-to-object coordinates. Keeping ref ownership with the component avoids returning a ref bundled inside this hook's result object, which the react-hooks/refs lint rule treats as tainting every render-time read of any other field on that same object. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** The broader workspace element (dot-grid area around the page) that the non-passive wheel listener binds to. Without this, pan/zoom-by-scroll only fires while the cursor sits exactly over the (often small, zoomed-out) page rectangle — everywhere else in the visible "canvas area" feels unscrollable. Coordinates are still computed relative to `containerRef`, since viewport pan/zoom is defined in that element's local space. Falls back to `containerRef` if omitted. */
  wheelTargetRef?: React.RefObject<HTMLDivElement | null>;
  layers: EngineLayer[];
  activeLayerId: string | null;
  activeLayerIsBase: boolean;
  viewport: Viewport;
  setViewport: (viewport: Viewport) => void;
  documentSize: { width: number; height: number };
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
  /** Starts a resize/rotate drag for the active layer's `handle` directly, without needing that handle to already be under a pointerdown that landed inside the page container's own DOM box. Used by the standalone handle hotspots (see LayerHandleHotspots) that stay reachable even when the active layer's box extends past the page. */
  beginHandleDrag: (handle: HandleId, event: React.PointerEvent<HTMLDivElement>) => void;
  containerProps: {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => void;
  };
}

interface DragState {
  mode: InteractionMode;
  layerId: string | null;
  handle: HandleId | null;
  startTransform: TransformState | null;
  startPointerObject: Point | null;
  /** Whether the transform actually changed since pointerdown — a plain click-to-select (no movement) shouldn't push a no-op history entry. */
  didChange: boolean;
}

const IDLE_DRAG_STATE: DragState = {
  mode: "idle",
  layerId: null,
  handle: null,
  startTransform: null,
  startPointerObject: null,
  didChange: false,
};

export function useCanvasWorkspaceController(options: UseCanvasWorkspaceControllerOptions): CanvasWorkspaceController {
  const {
    containerRef,
    wheelTargetRef,
    layers,
    activeLayerId,
    activeLayerIsBase,
    viewport,
    setViewport,
    documentSize,
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
  const dragRef = useRef<DragState>(IDLE_DRAG_STATE);

  // `updateLayerTransform` writes through shared context state that ~18 panels/components
  // subscribe to, so calling it straight from a pointermove handler re-renders the whole
  // editor once per native mouse event — pointermove can fire far more often than the
  // browser ever paints, so most of those renders are pure waste that shows up as
  // jumping/shaking/lag while dragging. Instead, every pointermove during an active
  // drag/resize/rotate just recomputes the next transform (cheap: refs + geometry only)
  // and stashes it here; at most one rAF-scheduled flush per frame actually commits it to
  // React state, always using whichever pointermove ran most recently before the frame —
  // never a stale one — so the handle still tracks the cursor 1:1 with no drift, just
  // without over-rendering between paints.
  const pendingTransformRef = useRef<{
    layerId: string;
    transform: TransformState;
    guides?: SnapGuide[];
    outOfBounds?: boolean;
  } | null>(null);
  const transformRafRef = useRef<number | null>(null);

  const flushPendingTransform = useCallback(() => {
    transformRafRef.current = null;
    const pending = pendingTransformRef.current;
    if (!pending) return;
    pendingTransformRef.current = null;
    updateLayerTransform(pending.layerId, pending.transform);
    if (pending.guides !== undefined) setGuides(pending.guides);
    if (pending.outOfBounds !== undefined) setIsOutOfBounds(pending.outOfBounds);
  }, [updateLayerTransform]);

  const scheduleTransformFlush = useCallback(() => {
    if (transformRafRef.current === null) {
      transformRafRef.current = requestAnimationFrame(flushPendingTransform);
    }
  }, [flushPendingTransform]);

  useEffect(() => {
    return () => {
      if (transformRafRef.current !== null) cancelAnimationFrame(transformRafRef.current);
    };
  }, []);

  const activeLayer = activeLayerId ? layers.find((l) => l.id === activeLayerId) ?? null : null;
  const page = useMemo(() => ({ x: 0, y: 0, width: documentSize.width, height: documentSize.height }), [documentSize.width, documentSize.height]);

  // Always measured against the board (containerRef), never `event.currentTarget` — the
  // pointer handlers are attached to the wider workspace element so that a layer whose
  // rotated box/handles extend past the board's own DOM rect still gets hover cursors,
  // drag-start, and resize/rotate out there; object-space math is only meaningful relative
  // to the board's own origin, so screen points must stay anchored to it regardless of
  // which element actually received the native event.
  const getScreenPoint = useCallback(
    (event: React.PointerEvent<HTMLDivElement>): Point => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: event.clientX, y: event.clientY };
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    },
    [containerRef],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const screenPoint = getScreenPoint(event);

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
      getScreenPoint,
      layers,
      selectLayer,
      viewport,
    ],
  );

  // The page container (containerRef) is sized to the page, not to whatever the active
  // layer's box grows to — a handle can sit past the page edge (see LayerHandleHotspots)
  // where containerRef's own pointerdown/pointermove never fires because there's no
  // page-box DOM there to receive it. This starts the same resizing/rotating drag as the
  // in-bounds path above, but is called directly by a hotspot positioned at the handle's
  // exact screen coordinate.
  //
  // Capture is acquired on `event.currentTarget` — the hotspot div itself, the same
  // element that actually received this pointerdown — not on containerRef. That used to
  // seem backwards (capturing on the small, constantly-repositioning hotspot instead of
  // the stable page container), but capturing on an ancestor the hotspot doesn't itself
  // own turned out to silently truncate the gesture: the browser would deliver capture and
  // exactly one pointermove, then fire `lostpointercapture` on its own and stop routing
  // further moves — but only for a *second or later* handle-drag in the same session (the
  // very first one after a page load always worked, which is what made this so easy to
  // miss in a quick manual check). The result read exactly like "the selection handler
  // detached after finishing one resize" — dragging any handle a second time moved the
  // layer only a few pixels then stopped responding, even though pointerdown/pointerup and
  // React's own state were both firing and updating correctly the whole time. Capturing on
  // the hotspot itself (its real pointerdown target) avoids the mismatch entirely, and
  // subsequent move/up events still reach the workspace's own handlers via ordinary DOM
  // bubbling (the hotspot is a descendant of the workspace element either way).
  const beginHandleDrag = useCallback(
    (handle: HandleId, event: React.PointerEvent<HTMLDivElement>) => {
      if (!activeLayer || activeLayer.locked) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const screenPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const objectPoint = toObject(screenPoint, viewport);
      event.currentTarget.setPointerCapture(event.pointerId);
      const nextMode: InteractionMode = handle === "rotate" ? "rotating" : "resizing";
      dragRef.current = {
        mode: nextMode,
        layerId: activeLayer.id,
        handle,
        startTransform: activeLayer.transform,
        startPointerObject: objectPoint,
        didChange: false,
      };
      setMode(nextMode);
    },
    [activeLayer, containerRef, viewport],
  );

  // Shared end-of-gesture cleanup — used by the real pointerup/pointercancel handlers below,
  // and also called defensively from inside handlePointerMove itself when it notices a drag
  // is stuck active with no button actually held (see there). Deliberately does NOT try to
  // explicitly release pointer capture itself: capture can have been acquired on different
  // elements depending on how the gesture started (workspace body vs. a handle hotspot, see
  // beginHandleDrag above), and explicitly targeting the wrong one is a silent no-op that's
  // easy to get wrong — the browser already releases capture on its own once the real
  // pointerup/pointercancel fires, which is a strict superset of what an explicit call here
  // could do safely. Always safe to call more than once for the same gesture: flushPendingTransform
  // is a no-op once there's nothing pending, so a second call (e.g. the pointerup that still
  // arrives right after a defensive recovery) is harmless rather than double-committing.
  const finishInteraction = useCallback(() => {
    // Stop the schedule and apply whatever the last in-flight pointermove computed right
    // away, rather than waiting for a frame that may never come now that the drag is over
    // — the release position must always be reflected, not silently dropped.
    if (transformRafRef.current !== null) {
      cancelAnimationFrame(transformRafRef.current);
      transformRafRef.current = null;
    }
    flushPendingTransform();
    const drag = dragRef.current;
    if (drag.mode === "cropping") {
      endCropDrag();
      dragRef.current = IDLE_DRAG_STATE;
      setMode("idle");
      setCursor("default");
      return;
    }
    if (drag.didChange && (drag.mode === "dragging" || drag.mode === "resizing" || drag.mode === "rotating")) {
      commitHistorySnapshot();
    }
    dragRef.current = IDLE_DRAG_STATE;
    setMode("idle");
    setGuides([]);
    setCursor("default");
  }, [commitHistorySnapshot, endCropDrag, flushPendingTransform]);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const screenPoint = getScreenPoint(event);
      let drag = dragRef.current;

      // Defensive recovery: `event.buttons` is a live bitmask of buttons currently held, not
      // just the one that started the gesture — if a drag/resize/rotate is "active" per our
      // own state but the primary button (bit 1) isn't actually down anymore, the real
      // pointerup was missed (e.g. released outside the window, over devtools, during an
      // OS-level focus change) and pointer capture's own onPointerUp/onLostPointerCapture
      // never fired to clean up. Left uncaught, every future plain mouse move — no button
      // held at all — would keep being treated as a continuing drag, which reads exactly
      // like "hover resizes the image". Catching it here, on the very next move, snaps back
      // to idle immediately instead of only recovering on the next real mousedown.
      if (
        (drag.mode === "dragging" || drag.mode === "resizing" || drag.mode === "rotating") &&
        (event.buttons & 1) === 0
      ) {
        finishInteraction();
        drag = dragRef.current;
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
        const result = stepDrag(drag.startTransform, delta, siblingBoxes, page, activeLayerIsBase, viewport.zoom);
        pendingTransformRef.current = {
          layerId: drag.layerId,
          transform: result.transform,
          guides: result.guides,
          outOfBounds: result.outOfBounds,
        };
        scheduleTransformFlush();
        drag.didChange = true;
        return;
      }

      if (drag.mode === "resizing" && drag.layerId && drag.handle && drag.handle !== "rotate" && drag.startTransform) {
        const result = stepResize(drag.startTransform, drag.handle, objectPoint, page, activeLayerIsBase);
        pendingTransformRef.current = {
          layerId: drag.layerId,
          transform: result.transform,
          outOfBounds: result.outOfBounds,
        };
        scheduleTransformFlush();
        drag.didChange = true;
        return;
      }

      if (drag.mode === "rotating" && drag.layerId && drag.startTransform) {
        const transform = stepRotate(drag.startTransform, objectPoint);
        pendingTransformRef.current = { layerId: drag.layerId, transform };
        scheduleTransformFlush();
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
      setCursor(hitTestLayers(layers, objectPoint) ? "move" : "default");
    },
    [
      activeLayer,
      activeLayerIsBase,
      cropMode,
      cropRect,
      finishInteraction,
      getScreenPoint,
      layers,
      page,
      scheduleTransformFlush,
      updateCropDrag,
      viewport,
    ],
  );

  const handlePointerUp = useCallback(
    () => finishInteraction(),
    [finishInteraction],
  );

  // Fires when the browser itself aborts an in-progress pointer stream — an OS-level
  // gesture takes over, a touch/pen input is cancelled, the tab loses focus mid-drag, etc.
  // No pointerup follows a cancel, so without this the drag would otherwise only be caught
  // by the defensive buttons-check on the next stray pointermove (see handlePointerMove).
  const handlePointerCancel = useCallback(
    () => finishInteraction(),
    [finishInteraction],
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
  const documentSizeRef = useRef(documentSize);
  useEffect(() => {
    documentSizeRef.current = documentSize;
  }, [documentSize]);

  useEffect(() => {
    const el = (wheelTargetRef ?? containerRef).current;
    const container = containerRef.current;
    if (!el || !container) return;

    // There is no panning in this editor — the board can only ever move as
    // a side effect of zoom itself. Only Ctrl/Cmd+wheel (which also covers
    // trackpad pinch, reported by browsers as a ctrlKey wheel event) zooms;
    // a plain wheel/trackpad scroll with no modifier does nothing, matching
    // Figma/Photoshop's "scroll is not zoom" convention.
    //
    // At/below 100% the board is dead-center (zoomCenterSettling); above it,
    // zoom follows the cursor (zoomToPoint) so zooming in further reads as
    // inspecting the exact spot under the pointer. Crossing back down
    // through the threshold can leave the viewport carrying pan from that
    // cursor-anchored zooming — rather than snapping it to zero on the tick
    // that crosses, `flush` keeps re-scheduling itself via requestAnimationFrame
    // (even once wheel input stops, and independently of any new wheel
    // ticks) for as long as `zoomCenterSettling` reports leftover pan,
    // easing it back to center smoothly instead of jumping. Both branches
    // are driven through this single rAF slot, so a settling frame and a
    // fresh wheel tick can never race each other and stomp one another's
    // update.
    //
    // Every result — from either branch — is then run through `clampPan`
    // against the workspace's own live size, so cursor-anchored zoom can
    // never push the board far enough for one edge to retreat past the
    // workspace's edge and expose dead space on the opposite side; it can
    // still be nudged right up to that edge (to inspect a corner of an
    // oversized image) but no further.
    let rafId: number | null = null;
    let pendingZoomFactor = 1;
    let pendingScreenPoint: Point | null = null;

    const scheduleFlush = () => {
      if (rafId === null) rafId = requestAnimationFrame(flush);
    };

    const flush = () => {
      rafId = null;
      const current = viewportRef.current;
      const targetZoom = current.zoom * pendingZoomFactor;
      pendingZoomFactor = 1;

      let next: Viewport;
      if (targetZoom > CURSOR_ZOOM_THRESHOLD && pendingScreenPoint) {
        next = zoomToPoint(current, targetZoom, pendingScreenPoint, documentSizeRef.current);
      } else {
        next = zoomCenterSettling(current, targetZoom);
        if (next.panX !== 0 || next.panY !== 0) scheduleFlush();
      }
      pendingScreenPoint = null;

      const workspaceRect = el.getBoundingClientRect();
      next = clampPan(next, documentSizeRef.current, { width: workspaceRect.width, height: workspaceRect.height });

      if (next.zoom !== current.zoom || next.panX !== current.panX || next.panY !== current.panY) setViewport(next);
    };

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      // Block the browser's own pinch-zoom/page-scroll only for the
      // gesture we actually handle — a plain scroll is left alone so it
      // never fights the page's normal scroll behavior.
      event.preventDefault();
      // Screen point stays relative to the board container (not the wider
      // workspace listener target) — viewport pan/zoom is defined in that
      // element's local coordinate space. Clamped to the board's own rect:
      // outside the board there's no content to visually anchor to, so
      // extrapolating the focal point past the edge lets a few ticks of
      // zoom fling the whole board off-screen. Clamping pins the anchor to
      // the nearest edge/corner instead, so zooming from the gray padding
      // around the board still reads as smooth, board-relative zoom.
      const rect = container.getBoundingClientRect();
      pendingScreenPoint = {
        x: Math.min(Math.max(event.clientX - rect.left, 0), rect.width),
        y: Math.min(Math.max(event.clientY - rect.top, 0), rect.height),
      };
      pendingZoomFactor *= 0.999 ** event.deltaY;
      scheduleFlush();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [containerRef, wheelTargetRef, setViewport]);

  return {
    cursor,
    mode,
    guides,
    isOutOfBounds,
    beginHandleDrag,
    containerProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    },
  };
}
