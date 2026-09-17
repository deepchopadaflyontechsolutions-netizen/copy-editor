"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlignCenter,
  Crop as CropIcon,
  FlipHorizontal2,
  FlipVertical2,
  PenLine,
  Radius as RadiusIcon,
} from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import { useCreativeFlow } from "@/context/CreativeFlowContext";
import LabeledSlider from "./panels/LabeledSlider";
import { SWATCHES } from "./panels/swatches";

const QUICK_COLORS = [SWATCHES[1], SWATCHES[6], SWATCHES[4], SWATCHES[9]];
const WEIGHT_PRESETS = [2, 6, 12, 20];

type MenuId = "edit" | "flip" | "weight" | "radius" | "opacity";

interface AnchorRect {
  left: number;
  bottom: number;
}

/** Floating Canva-style context toolbar — only ever mounted while an image/layer is selected (see `RightPanel`'s sibling `CanvasWorkspace`, which gates rendering on `isImageSelected`). */
export default function ContextToolbar() {
  const {
    activeLayerId,
    activeFilterState,
    setExposure,
    setContrast,
    setSaturation,
    activeLayerOpacity,
    setOpacity,
    activeLayerCornerRadius,
    setCornerRadius,
    commitHistorySnapshot,
    brushColor,
    setBrushColor,
    brushWidth,
    setBrushWidth,
    drawingTool,
    setDrawingTool,
    moveLayerCenterTo,
    documentSize,
    flipLayerHorizontal,
    flipLayerVertical,
    enterCropMode,
  } = useCanvasEngine();
  const isDrawing = drawingTool === "brush";
  const toggleDrawing = () => setDrawingTool(isDrawing ? "selection" : "brush");
  const { setActiveRightPanelSection } = useCreativeFlow();

  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Each dropdown's trigger is measured (via one of these) the moment its
  // menu opens, to position it through a portal — see the big comment on
  // `Dropdown` below for why this (rather than plain CSS `absolute`
  // positioning) is needed at all. Plain named refs rather than a
  // dynamically-keyed map, so each `ref={...}` prop below is a stable ref
  // object rather than a freshly-created ref *callback* on every render.
  const editTriggerRef = useRef<HTMLDivElement>(null);
  const weightTriggerRef = useRef<HTMLDivElement>(null);
  const radiusTriggerRef = useRef<HTMLDivElement>(null);
  const flipTriggerRef = useRef<HTMLDivElement>(null);
  const opacityTriggerRef = useRef<HTMLDivElement>(null);
  const triggerRefByMenu: Record<MenuId, React.RefObject<HTMLDivElement | null>> = {
    edit: editTriggerRef,
    weight: weightTriggerRef,
    radius: radiusTriggerRef,
    flip: flipTriggerRef,
    opacity: opacityTriggerRef,
  };

  useEffect(() => {
    if (!openMenu) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      // The open dropdown itself renders through a portal (outside
      // toolbarRef's own DOM subtree — see `Dropdown`), so it needs its own
      // explicit exemption here alongside the toolbar.
      if (toolbarRef.current?.contains(target)) return;
      if (target?.closest("[data-toolbar-dropdown]")) return;
      setOpenMenu(null);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [openMenu]);

  // Measures the trigger's on-screen position the moment its menu opens.
  // Closing on scroll (below) means this never needs to re-measure while
  // open, so a one-shot layout effect is enough; while closed, `anchorRect`
  // is simply left stale and unused (`Dropdown` never renders without
  // `open`, so a leftover position from the last-open menu is harmless).
  useLayoutEffect(() => {
    if (!openMenu) return;
    const el = triggerRefByMenu[openMenu].current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // A deliberate DOM-measurement effect, not a synced/derived value —
    // there's no way to know a trigger's on-screen position without
    // measuring it post-layout, and this is exactly the case
    // `useLayoutEffect` (over plain `useEffect`) exists for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnchorRect({ left: rect.left + rect.width / 2, bottom: rect.bottom });
    // triggerRefByMenu is rebuilt fresh every render from stable refs, so
    // including it would be a no-op dependency that never actually changes
    // in a way that should re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openMenu]);

  // The toolbar's own row scrolls horizontally on narrow screens (see the
  // root className below) — if the user scrolls it while a dropdown is
  // open, the trigger has moved out from under the now-stale anchor
  // position, so just close it rather than tracking a moving target.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !openMenu) return;
    const handleScroll = () => setOpenMenu(null);
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [openMenu]);

  const toggleMenu = (id: MenuId) => setOpenMenu((prev) => (prev === id ? null : id));

  return (
    <motion.div
      ref={toolbarRef}
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 8 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
      className="pointer-events-auto relative h-11 overflow-hidden rounded-full border border-neutral-700/80 bg-neutral-900/90 shadow-2xl backdrop-blur-md"
      onPointerDown={(event) => event.stopPropagation()}
    >
      {/* The row itself is the scrollable element — narrower than its full button
          set on a phone screen, so it scrolls sideways within the viewport instead
          of overflowing off both edges or squeezing every icon down to fit. Dropdown
          menus deliberately live outside this element (portaled — see `Dropdown`),
          since an `overflow-x` scroll container also clips `overflow-y` per the CSS
          spec, which would otherwise cut off every dropdown at the row's own height.
          The pill itself is pinned to a fixed height with `overflow-hidden` (above)
          so this row's horizontal scrolling can never grow the pill or let a
          browser-drawn scrollbar poke out past its rounded edge while scrolling. */}
      <div
        ref={scrollRef}
        className="no-scrollbar flex h-full max-w-[calc(100vw-1.5rem)] items-center gap-1 overflow-x-auto p-1.5 *:shrink-0"
      >
        {/* Action group */}
        <div ref={editTriggerRef}>
          <button
            type="button"
            onClick={() => toggleMenu("edit")}
            aria-pressed={openMenu === "edit"}
            className={`flex h-8 shrink-0 cursor-pointer items-center rounded-full px-3 text-xs font-semibold leading-none transition-colors ${
              openMenu === "edit" ? "bg-neutral-700 text-white" : "bg-neutral-800 text-neutral-100 hover:bg-neutral-700"
            }`}
          >
            Edit
          </button>
        </div>

        <Divider />

        {/* Color & style group — drives the pen/marker tool below */}
        <ToolbarIconButton label={isDrawing ? "Stop drawing (Esc)" : "Draw"} onClick={toggleDrawing} active={isDrawing}>
          <PenLine size={16} />
        </ToolbarIconButton>

        <div className="flex items-center gap-1 px-0.5">
          {QUICK_COLORS.map((hex) => (
            <button
              key={hex}
              type="button"
              title={hex}
              aria-label={`Set color ${hex}`}
              aria-pressed={brushColor.toLowerCase() === hex.toLowerCase()}
              onClick={() => setBrushColor(hex)}
              className={`h-4 w-4 cursor-pointer rounded-full border transition-transform hover:scale-110 ${
                brushColor.toLowerCase() === hex.toLowerCase()
                  ? "border-white/30 ring-2 ring-white/40 ring-offset-1 ring-offset-neutral-900"
                  : "border-white/30"
              }`}
              style={{ backgroundColor: hex }}
            />
          ))}
          <label
            title="Custom color"
            aria-label="Custom color"
            className="relative flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-white/30 transition-transform hover:scale-110"
            style={{
              background: !QUICK_COLORS.some((hex) => hex.toLowerCase() === brushColor.toLowerCase())
                ? brushColor
                : "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
            }}
          >
            <input
              type="color"
              value={brushColor}
              onChange={(event) => setBrushColor(event.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
            />
          </label>
        </div>

        <div ref={weightTriggerRef}>
          <ToolbarIconButton label="Line weight" onClick={() => toggleMenu("weight")} active={openMenu === "weight"}>
            <LineWeightIcon />
          </ToolbarIconButton>
        </div>

        <div ref={radiusTriggerRef}>
          <ToolbarIconButton label="Corner radius" onClick={() => toggleMenu("radius")} active={openMenu === "radius"}>
            <RadiusIcon size={16} />
          </ToolbarIconButton>
        </div>

        <Divider />

        {/* Canvas manipulation group */}
        <ToolbarIconButton
          label="Crop"
          onClick={() => {
            enterCropMode();
            setActiveRightPanelSection("resize");
          }}
        >
          <CropIcon size={16} />
        </ToolbarIconButton>

        <div ref={flipTriggerRef}>
          <ToolbarIconButton label="Flip" onClick={() => toggleMenu("flip")} active={openMenu === "flip"}>
            <FlipHorizontal2 size={16} />
          </ToolbarIconButton>
        </div>

        <div ref={opacityTriggerRef}>
          <ToolbarIconButton label="Opacity" onClick={() => toggleMenu("opacity")} active={openMenu === "opacity"}>
            <CheckerboardIcon />
          </ToolbarIconButton>
        </div>

        <ToolbarIconButton
          label="Align Center"
          onClick={() => activeLayerId && moveLayerCenterTo(activeLayerId, documentSize.width / 2, documentSize.height / 2)}
        >
          <AlignCenter size={16} />
        </ToolbarIconButton>
      </div>

      <Dropdown open={openMenu === "edit"} width={220} anchor={anchorRect}>
        <div className="flex flex-col gap-3">
          <LabeledSlider
            label="Exposure"
            value={activeFilterState.exposure}
            defaultValue={50}
            onChange={setExposure}
            onCommit={commitHistorySnapshot}
          />
          <LabeledSlider
            label="Contrast"
            value={activeFilterState.contrast}
            defaultValue={50}
            onChange={setContrast}
            onCommit={commitHistorySnapshot}
          />
          <LabeledSlider
            label="Saturation"
            value={activeFilterState.saturation}
            defaultValue={50}
            onChange={setSaturation}
            onCommit={commitHistorySnapshot}
          />
        </div>
      </Dropdown>

      <Dropdown open={openMenu === "weight"} width={150} anchor={anchorRect}>
        <div className="flex flex-col gap-1">
          {WEIGHT_PRESETS.map((weight) => (
            <button
              key={weight}
              type="button"
              onClick={() => setBrushWidth(weight)}
              aria-pressed={brushWidth === weight}
              className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-xs transition-colors ${
                brushWidth === weight ? "bg-white/10 text-white" : "text-neutral-300 hover:bg-neutral-800"
              }`}
            >
              <span className="w-8 rounded-full bg-current" style={{ height: Math.min(weight, 8) }} />
              {weight}px
            </button>
          ))}
        </div>
      </Dropdown>

      <Dropdown open={openMenu === "radius"} width={200} anchor={anchorRect}>
        <LabeledSlider
          label="Corner radius"
          value={activeLayerCornerRadius}
          min={0}
          max={200}
          suffix="px"
          defaultValue={0}
          onChange={setCornerRadius}
          onCommit={commitHistorySnapshot}
        />
      </Dropdown>

      <Dropdown open={openMenu === "flip"} width={170} anchor={anchorRect}>
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => {
              flipLayerHorizontal();
              setOpenMenu(null);
            }}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-neutral-300 transition-colors hover:bg-neutral-800"
          >
            <FlipHorizontal2 size={14} />
            Flip Horizontal
          </button>
          <button
            type="button"
            onClick={() => {
              flipLayerVertical();
              setOpenMenu(null);
            }}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-neutral-300 transition-colors hover:bg-neutral-800"
          >
            <FlipVertical2 size={14} />
            Flip Vertical
          </button>
        </div>
      </Dropdown>

      <Dropdown open={openMenu === "opacity"} width={200} anchor={anchorRect}>
        <LabeledSlider
          label="Opacity"
          value={activeLayerOpacity}
          defaultValue={100}
          onChange={setOpacity}
          onCommit={commitHistorySnapshot}
        />
      </Dropdown>

    </motion.div>
  );
}

function Divider() {
  return <span className="mx-0.5 h-4 w-px shrink-0 bg-neutral-700" />;
}

const DROPDOWN_VIEWPORT_MARGIN = 8;

/**
 * Portaled to `document.body` and positioned with `fixed` + a screen-space
 * anchor measured from the trigger, rather than plain CSS `absolute`
 * positioning under the trigger. That used to be enough, but the toolbar's
 * button row now scrolls horizontally on narrow screens (`overflow-x-auto`),
 * and per the CSS overflow spec, an element with `overflow-x` set to
 * anything but `visible` forces its `overflow-y` to `auto` too — so a
 * same-DOM-subtree dropdown extending below the row would get silently
 * clipped to the row's own height instead of showing. Escaping to a portal
 * sidesteps that entirely.
 */
function Dropdown({
  open,
  width,
  anchor,
  children,
}: {
  open: boolean;
  width: number;
  anchor: AnchorRect | null;
  children: ReactNode;
}) {
  // `anchor` starts (and stays) null until a menu has actually been opened
  // once, client-side, by a real pointer event — never during SSR/the
  // initial render — so this alone is enough to guard the `window`/
  // `document.body` access below without a separate mount-tracking effect.
  if (!anchor) return null;

  // Computed as a final left *edge*, clamped to stay fully on screen — not
  // a center point paired with a CSS `translateX(-50%)`, because
  // framer-motion owns the `transform` property on a `motion.div` for its
  // own `animate`/`exit` values (the `y`/`scale` below) and silently
  // overwrites any transform set through `style` alongside them.
  const left = Math.min(
    Math.max(anchor.left - width / 2, DROPDOWN_VIEWPORT_MARGIN),
    window.innerWidth - width - DROPDOWN_VIEWPORT_MARGIN,
  );

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          data-toolbar-dropdown
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }}
          transition={{ duration: 0.12 }}
          style={{ position: "fixed", left, top: anchor.bottom + 8, width }}
          className="z-30 rounded-xl border border-neutral-700/80 bg-neutral-900/95 p-3 shadow-2xl backdrop-blur-md"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Tooltip is portaled to `document.body` (like `Dropdown` above) rather than absolutely
 * positioned inside the button — the toolbar pill is a fixed-height, `overflow-hidden` scroll
 * container (so its own horizontal scrollbar never grows the pill), which would otherwise clip
 * an in-place tooltip. Portaling also means the tooltip never reserves layout space or affects
 * the pill's height/scroll area — it just floats above everything at a measured screen position. */
function ToolbarIconButton({
  label,
  onClick,
  active,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const [rect, setRect] = useState<{ left: number; bottom: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const showTooltip = () => {
    const el = buttonRef.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    setRect({ left: box.left + box.width / 2, bottom: box.bottom });
    setHovered(true);
  };
  const hideTooltip = () => setHovered(false);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          active ? "bg-white text-black" : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
        }`}
      >
        {children}
      </button>
      {hovered &&
        rect &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            style={{ position: "fixed", left: rect.left, top: rect.bottom + 6, transform: "translateX(-50%)" }}
            className="pointer-events-none z-40 whitespace-nowrap rounded-md bg-neutral-950 px-2 py-1 text-xs font-medium text-neutral-100 shadow-lg"
          >
            {label}
          </span>,
          document.body,
        )}
    </div>
  );
}

/** Hamburger-style icon with three lines of increasing thickness — stands in for a line-weight selector, which lucide has no dedicated glyph for. */
function LineWeightIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <rect x={1} y={2.5} width={14} height={1} rx={0.5} fill="currentColor" />
      <rect x={1} y={7} width={14} height={2} rx={1} fill="currentColor" />
      <rect x={1} y={11.5} width={14} height={3} rx={1.5} fill="currentColor" />
    </svg>
  );
}

/** 2x2 checkerboard glyph for the transparency/opacity control — the conventional icon for alpha, which lucide has no dedicated glyph for. */
function CheckerboardIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <rect x={0} y={0} width={16} height={16} rx={3} fill="currentColor" opacity={0.25} />
      <rect x={0} y={0} width={8} height={8} fill="currentColor" />
      <rect x={8} y={8} width={8} height={8} fill="currentColor" />
    </svg>
  );
}
