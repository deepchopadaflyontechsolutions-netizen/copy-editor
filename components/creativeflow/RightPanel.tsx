"use client";

import { useRef, useState, type ComponentType, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Tooltip from "@mui/material/Tooltip";
import {
  Image as ImageIcon,
  SlidersHorizontal,
  Palette,
  Sun,
  Crop as CropIcon,
  Stamp,
  Maximize2,
  Paintbrush2,
  Percent,
  X,
} from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import UploadPanel from "./panels/UploadPanel";
import ImagesPanel from "./panels/ImagesPanel";
import SliderControlPanel from "./panels/SliderControlPanel";
import ColorWheelPanel from "./panels/ColorWheelPanel";
import BrightnessPanel from "./panels/BrightnessPanel";
import CropPanel from "./panels/CropPanel";
import WatermarkPanel from "./panels/WatermarkPanel";
import ResizePanel from "./panels/ResizePanel";
import MarkerPanel from "./panels/MarkerPanel";
import OpacityPanel from "./panels/OpacityPanel";

type SectionId =
  | "images"
  | "slider"
  | "color"
  | "brightness"
  | "crop"
  | "watermark"
  | "resize"
  | "marker"
  | "opacity";

const NAV_ITEMS: { id: SectionId; label: string; icon: ComponentType<{ size?: number }>; Panel: ComponentType }[] = [
  { id: "images", label: "Images", icon: ImageIcon, Panel: ImagesPanel },
  { id: "slider", label: "Slider", icon: SlidersHorizontal, Panel: SliderControlPanel },
  { id: "color", label: "Color", icon: Palette, Panel: ColorWheelPanel },
  { id: "brightness", label: "Light", icon: Sun, Panel: BrightnessPanel },
  { id: "crop", label: "Crop", icon: CropIcon, Panel: CropPanel },
  { id: "watermark", label: "Mark", icon: Stamp, Panel: WatermarkPanel },
  { id: "resize", label: "Resize", icon: Maximize2, Panel: ResizePanel },
  { id: "marker", label: "Brush", icon: Paintbrush2, Panel: MarkerPanel },
  { id: "opacity", label: "Opacity", icon: Percent, Panel: OpacityPanel },
];

const DRAWER_WIDTH = 320;
const DRAWER_ID = "control-drawer";
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900";

// A fixed 64px tool dock pinned to the outer edge — only one tile is ever
// "active", shown via a shared-layout indigo pill that glides between tiles
// instead of popping between states. Picking a tile spring-opens a
// glassmorphic control drawer, flush against the dock and stretched to the
// full height of the column, and either the same tile or the drawer's own
// close button spring-closes it again. Arrow keys rove focus across tiles
// like a native toolbar.
export default function RightPanel() {
  const { hasImage } = useCanvasEngine();
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  if (!hasImage) {
    return (
      <aside
        data-accent="image"
        className="flex w-80 shrink-0 flex-col border-l border-slate-800 bg-slate-900/90"
      >
        <UploadPanel compact />
      </aside>
    );
  }

  const active = NAV_ITEMS.find((item) => item.id === activeSection) ?? null;
  const ActivePanel = active?.Panel;

  const focusTile = (index: number) => {
    const count = NAV_ITEMS.length;
    buttonRefs.current[(index + count) % count]?.focus();
  };

  const handleTileKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusTile(index + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusTile(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusTile(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusTile(NAV_ITEMS.length - 1);
    }
  };

  return (
    <aside data-accent="image" className="flex min-h-0 shrink-0 border-l border-slate-800 bg-slate-950">
      <AnimatePresence initial={false}>
        {ActivePanel && (
          <motion.div
            key="drawer"
            id={DRAWER_ID}
            role="region"
            aria-label={`${active?.label} controls`}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: DRAWER_WIDTH, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="custom-scrollbar h-full overflow-x-hidden overflow-y-auto border-r border-slate-800/70 bg-slate-900/95 shadow-lg shadow-black/30 backdrop-blur-md"
          >
            <div className="flex flex-col" style={{ width: DRAWER_WIDTH }}>
              <div className="flex shrink-0 items-center justify-end px-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSection(null)}
                  aria-label="Close panel"
                  className={`rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100 ${FOCUS_RING}`}
                >
                  <X size={16} />
                </button>
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  <ActivePanel />
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav
        aria-label="Editor tools"
        className="flex w-16 shrink-0 flex-col gap-1 overflow-y-auto border-l border-slate-800/70 bg-slate-900/90 p-1.5"
      >
        {NAV_ITEMS.map(({ id, label, icon: Icon }, index) => {
          const isActive = activeSection === id;
          return (
            <Tooltip key={id} title={label} placement="left" arrow>
              <motion.button
                ref={(el) => {
                  buttonRefs.current[index] = el;
                }}
                type="button"
                whileTap={{ scale: 0.93 }}
                onClick={() => setActiveSection((prev) => (prev === id ? null : id))}
                onKeyDown={(event) => handleTileKeyDown(event, index)}
                aria-pressed={isActive}
                aria-label={label}
                aria-controls={isActive ? DRAWER_ID : undefined}
                className={`group relative flex flex-col items-center gap-1 rounded-lg py-2 text-[9px] font-medium tracking-tight transition-colors ${FOCUS_RING} ${
                  isActive ? "text-indigo-300" : "text-slate-400 hover:text-slate-100"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="dock-active-pill"
                    className="absolute inset-0.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                {!isActive && (
                  <span className="absolute inset-0.5 rounded-lg bg-transparent transition-colors group-hover:bg-slate-800/60" />
                )}
                <span
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    isActive ? "text-indigo-300" : "text-slate-400 group-hover:text-slate-100"
                  }`}
                >
                  <Icon size={20} />
                </span>
                <span className="relative z-10 leading-none">{label}</span>
              </motion.button>
            </Tooltip>
          );
        })}
      </nav>
    </aside>
  );
}
