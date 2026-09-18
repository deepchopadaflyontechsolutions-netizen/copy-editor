"use client";

import { useEffect, useRef, type ComponentType, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UploadCloud, Crop, Type, Music, Gauge, Wand2, X, ChevronLeft, Pencil } from "lucide-react";
import { useVideoEditor, type VideoPanelSectionId } from "@/context/VideoEditorContext";
import UploadPanel from "./panels/UploadPanel";
import FramePanel from "./panels/FramePanel";
import TextPanel from "./panels/TextPanel";
import AudioPanel from "./panels/AudioPanel";
import SpeedPanel from "./panels/SpeedPanel";
import EffectsPanel from "./panels/EffectsPanel";
import AdSlot from "@/components/creativeflow/panels/AdSlot";

type SectionId = VideoPanelSectionId;

// "Frame" groups the canvas's own aspect ratio with the crop that fills it — picking a ratio
// reshapes the crop selection live, right on the preview (see FrameCropOverlay), rather than
// opening a separate modal. No standalone Trim/Rotate/Flip tab: in/out points are set by
// dragging the cyan handles directly on the Timeline's filmstrip.
const NAV_ITEMS: { id: SectionId; label: string; icon: ComponentType<{ size?: number }>; Panel: ComponentType }[] = [
  { id: "upload", label: "Upload", icon: UploadCloud, Panel: UploadPanel },
  { id: "frame", label: "Crop", icon: Crop, Panel: FramePanel },
  { id: "text", label: "Text", icon: Type, Panel: TextPanel },
  { id: "audio", label: "Audio", icon: Music, Panel: AudioPanel },
  { id: "speed", label: "Speed", icon: Gauge, Panel: SpeedPanel },
  { id: "effects", label: "Effects", icon: Wand2, Panel: EffectsPanel },
];

const DRAWER_WIDTH = 320;
const DRAWER_ID = "video-control-drawer";
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900";

// Same dock+drawer shell as the image editor's RightPanel: a fixed 80px icon dock with a
// shared-layout active pill/bar that glides between tiles, spring-opening a glassmorphic
// drawer flush against it. Kept as its own component (rather than reusing RightPanel) since
// the two editors' tab sets, gating condition (hasVideo vs hasImage), and panels are
// unrelated — only the visual chrome is meant to match.
export default function VideoToolDock() {
  const {
    hasVideo,
    activePanelSection: activeSection,
    setActivePanelSection: setActiveSection,
    mobilePanelOpen: mobileOpen,
    setMobilePanelOpen: setMobileOpen,
  } = useVideoEditor();
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const drawerScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    drawerScrollRef.current?.scrollTo({ top: 0 });
  }, [activeSection]);

  const mobileSheetOpen = mobileOpen && Boolean(activeSection);

  const closeSection = () => setActiveSection(null);
  const switchSection = (id: SectionId) => {
    if (!hasVideo && id !== "upload") return;
    setActiveSection(activeSection === id ? null : id);
  };

  const active = NAV_ITEMS.find((item) => item.id === activeSection) ?? null;
  const ActivePanel = active?.Panel;

  const openMobilePanel = () => {
    if (!activeSection) setActiveSection(hasVideo ? "effects" : "upload");
    setMobileOpen(true);
  };
  const switchMobileSection = (id: SectionId) => {
    if (!hasVideo && id !== "upload") return;
    setActiveSection(id);
  };

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
    <>
      <aside data-accent="video" className="relative hidden min-h-0 shrink-0 bg-neutral-950 md:flex">
        <nav
          aria-label="Video editor tools"
          className="flex w-20 shrink-0 flex-col gap-2 overflow-y-auto overflow-x-visible border-r border-neutral-800/70 bg-neutral-900/90 p-2.5"
        >
          {NAV_ITEMS.map(({ id, label, icon: Icon }, index) => {
            const isActive = activeSection === id;
            const isDisabled = !hasVideo && id !== "upload";
            return (
              <motion.button
                key={id}
                ref={(el) => {
                  buttonRefs.current[index] = el;
                }}
                type="button"
                whileTap={isDisabled ? undefined : { scale: 0.93 }}
                onClick={() => switchSection(id)}
                onKeyDown={(event) => handleTileKeyDown(event, index)}
                disabled={isDisabled}
                aria-pressed={isActive}
                aria-label={label}
                aria-controls={isActive ? DRAWER_ID : undefined}
                className={`group relative flex h-16 shrink-0 flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium tracking-tight transition-colors ${FOCUS_RING} ${
                  isDisabled
                    ? "cursor-not-allowed text-neutral-700"
                    : isActive
                      ? "text-white"
                      : "text-neutral-400 hover:text-neutral-100"
                }`}
              >
                {isActive && (
                  <>
                    <motion.span
                      layoutId="video-dock-active-pill"
                      className="absolute inset-0.5 rounded-lg bg-white/10"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    />
                    <motion.span
                      layoutId="video-dock-active-bar"
                      className="absolute right-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-l-full bg-white"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    />
                  </>
                )}
                {!isActive && !isDisabled && (
                  <span className="absolute inset-0.5 rounded-lg bg-transparent transition-colors group-hover:bg-neutral-800/60" />
                )}
                <span
                  className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                    isDisabled
                      ? "text-neutral-700"
                      : isActive
                        ? "text-white"
                        : "text-neutral-400 group-hover:bg-neutral-800/70 group-hover:text-neutral-100"
                  }`}
                >
                  <Icon size={19} />
                </span>
                <span className={`relative z-10 leading-none ${isActive ? "font-semibold" : ""}`}>{label}</span>
              </motion.button>
            );
          })}
        </nav>

        <div aria-hidden className="shrink-0" style={{ width: DRAWER_WIDTH }} />

        <AnimatePresence initial={false}>
          {ActivePanel && (
            <motion.div
              key="drawer"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: DRAWER_WIDTH, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="absolute left-20 top-0 z-20 h-full overflow-visible"
            >
              <button
                type="button"
                onClick={closeSection}
                aria-label="Collapse panel"
                title="Collapse panel"
                className={`absolute right-0 top-1/2 z-20 flex h-10 w-5 -translate-y-1/2 translate-x-full cursor-pointer items-center justify-center rounded-r-lg border border-l-0 border-neutral-800 bg-neutral-800 text-neutral-300 shadow-lg shadow-black/50 transition-colors hover:bg-white hover:text-black ${FOCUS_RING}`}
              >
                <ChevronLeft size={14} strokeWidth={2.5} />
              </button>
              <div
                id={DRAWER_ID}
                role="region"
                aria-label={`${active?.label} controls`}
                className="h-full w-full border-l border-r border-neutral-800/70 bg-neutral-900/95 shadow-2xl shadow-black/40 backdrop-blur-md"
              >
                <div className="flex h-full min-h-0 flex-col" style={{ width: DRAWER_WIDTH }}>
                  <div className="flex shrink-0 items-center justify-end px-3 pt-3">
                    <button
                      type="button"
                      onClick={closeSection}
                      aria-label="Close panel"
                      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800/60 text-neutral-300 transition-colors hover:border-neutral-600 hover:bg-neutral-800 hover:text-white ${FOCUS_RING}`}
                    >
                      <X size={18} strokeWidth={2.25} />
                    </button>
                  </div>
                  {/* Only this middle region scrolls — the ad slot below stays pinned to the
                      bottom of the drawer regardless of how tall the active panel's own content
                      is, same as every other panel. */}
                  <div ref={drawerScrollRef} className="custom-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={activeSection}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="flex min-h-full flex-col"
                      >
                        <ActivePanel />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <div className="shrink-0 border-t border-neutral-800/70 px-4 py-3">
                    <AdSlot />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </aside>

      <button
        type="button"
        onClick={openMobilePanel}
        aria-label="Open editing tools"
        aria-haspopup="dialog"
        aria-expanded={mobileSheetOpen}
        className={`fixed bottom-5 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-2xl shadow-black/50 transition-transform active:scale-95 md:hidden ${
          mobileSheetOpen ? "hidden" : "flex"
        } ${FOCUS_RING}`}
      >
        <Pencil size={22} strokeWidth={2.25} />
      </button>

      <AnimatePresence>
        {mobileSheetOpen && (
          <motion.div
            key="mobile-sheet"
            role="region"
            aria-label="Editing tools"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
            // Explicit inline height (not a `h-[42vh]` class) so the sheet's height can never be
            // clobbered or left unset — it must stay identical across every tab, never grow or
            // shrink to fit whichever panel's content happens to be tallest/shortest.
            style={{ height: "42vh" }}
            className="fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-2xl border-t border-neutral-800 bg-neutral-900/98 shadow-2xl shadow-black/60 backdrop-blur-md md:hidden"
          >
            <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-neutral-700" />

            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-800/70 px-3 py-2">
              <div className="flex flex-1 items-center gap-1 overflow-x-auto">
                {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
                  const isActive = activeSection === id;
                  const isDisabled = !hasVideo && id !== "upload";
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => switchMobileSection(id)}
                      disabled={isDisabled}
                      aria-pressed={isActive}
                      aria-label={label}
                      className={`flex shrink-0 flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${FOCUS_RING} ${
                        isDisabled
                          ? "cursor-not-allowed text-neutral-700"
                          : isActive
                            ? "bg-white/10 text-white"
                            : "text-neutral-400"
                      }`}
                    >
                      <Icon size={18} />
                      {label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close editing tools"
                className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800/60 text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white ${FOCUS_RING}`}
              >
                <X size={18} strokeWidth={2.25} />
              </button>
            </div>

            {/* No ad slot on the mobile sheet — its fixed 42vh height is too short to fit a square
                ad block alongside real panel content without squeezing the panel to nothing
                (matches ImagesPanel's own `md:flex`-gated ad slot, which is desktop-only too). */}
            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {ActivePanel && <ActivePanel />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
