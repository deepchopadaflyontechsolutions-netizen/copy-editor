"use client";

import { useEffect, useRef, useState, type ComponentType, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Image as ImageIcon, SlidersHorizontal, Ratio, Stamp, X, ChevronLeft, Pencil } from "lucide-react";
import { useCanvasEngine } from "@/context/CanvasEngineContext";
import { useCreativeFlow, type RightPanelSectionId } from "@/context/CreativeFlowContext";
import SidebarAd from "@/components/SidebarAd";
import ImagesPanel from "./panels/ImagesPanel";
import AdjustPanel from "./panels/AdjustPanel";
import ResizePanel from "./panels/ResizePanel";
import WatermarkPanel from "./panels/WatermarkPanel";

type SectionId = RightPanelSectionId;

const NAV_ITEMS: { id: SectionId; label: string; icon: ComponentType<{ size?: number }>; Panel: ComponentType }[] = [
  { id: "images", label: "Upload", icon: ImageIcon, Panel: ImagesPanel },
  { id: "adjust", label: "Adjust", icon: SlidersHorizontal, Panel: AdjustPanel },
  { id: "resize", label: "Crop", icon: Ratio, Panel: ResizePanel },
  { id: "watermark", label: "Mark", icon: Stamp, Panel: WatermarkPanel },
];

const DRAWER_WIDTH = 320;
const DRAWER_ID = "control-drawer";
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900";

// A fixed 64px tool dock pinned to the outer edge — only one tile is ever
// "active", shown via a shared-layout translucent pill that glides between tiles
// instead of popping between states. Picking a tile spring-opens a
// glassmorphic control drawer, flush against the dock and stretched to the
// full height of the column, and either the same tile or the drawer's own
// close button spring-closes it again. Arrow keys rove focus across tiles
// like a native toolbar.
export default function RightPanel() {
  const { hasImage, cropMode, enterCropMode, cancelCropMode } = useCanvasEngine();
  // Every tab is always switchable — each panel already disables its own
  // controls when there's no image yet (see e.g. AdjustPanel's `disabled =
  // !activeLayerId`), so gating the *tab itself* on `hasImage` here was
  // redundant and actively broken deep-linking: landing straight on a
  // non-Upload tab (e.g. the landing page's "Adjust"/"Mark" quick actions)
  // made every tab, including the one just opened, briefly disabled and
  // unclickable until the handed-off asset finished loading async — which
  // read as "the sidebar won't navigate to any other section".
  const { activeRightPanelSection: activeSection, setActiveRightPanelSection: setActiveSection } = useCreativeFlow();
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const drawerScrollRef = useRef<HTMLDivElement>(null);
  // Mobile keeps the sidebar closed until the user asks for it, even though
  // `activeRightPanelSection` itself defaults to "images" (so the desktop
  // drawer opens pre-set to Upload). This flag is mobile's own on/off switch
  // for the same shared section state.
  const [mobileOpen, setMobileOpen] = useState(false);

  // The drawer body is one shared scroll container across every section —
  // without this, switching from a tall panel (e.g. Adjust, scrolled down)
  // to a short one keeps the old scrollTop, so the new panel opens already
  // scrolled past its own content, or the scrollbar visibly snaps in/out as
  // panels of different heights swap in.
  useEffect(() => {
    drawerScrollRef.current?.scrollTo({ top: 0 });
  }, [activeSection]);

  // The Crop tab and the live crop overlay are meant to be the same thing — arriving on
  // "resize" from anywhere else (clicking the tab, or a deep link that lands here without also
  // carrying a `tool=crop` intent) should already show the interactive frame/handles, not a
  // plain "Crop" button the user has to press first. `enterCropMode()` with no preset starts the
  // same freeform session the canvas toolbar's own Crop icon does. Conversely, leaving "resize"
  // for any other tab drops the in-progress selection instead of leaving its frame/handles
  // floating on top of whatever tab is now open — `cancelCropMode` discards it without applying,
  // matching what the Resize panel's own "Cancel" button already does.
  //
  // `autoEnteredCropRef` guards this to firing once per *visit* to the tab, not once per
  // render where `cropMode` happens to be false while already there — without it, applying (or
  // cancelling) the crop via Enter/Escape/the panel's own buttons/clicking outside the image all
  // flip `cropMode` back to false while `activeSection` is still "resize", which this effect
  // would otherwise read as "just arrived, start a fresh crop" and silently re-enter crop mode
  // right back, making Apply/Escape/click-outside look like they'd done nothing at all.
  const autoEnteredCropRef = useRef(false);
  useEffect(() => {
    if (activeSection !== "resize") {
      autoEnteredCropRef.current = false;
      if (cropMode) cancelCropMode();
      return;
    }
    if (hasImage && !cropMode && !autoEnteredCropRef.current) {
      autoEnteredCropRef.current = true;
      enterCropMode();
    }
  }, [activeSection, hasImage, cropMode, enterCropMode, cancelCropMode]);

  // Panels close themselves by calling setActiveRightPanelSection(null) (e.g. AdjustPanel's
  // Apply button) — on desktop that's enough to collapse the drawer. On mobile the sheet has its
  // own open/closed flag (so it doesn't auto-open just because activeSection defaults to
  // "images"), so deriving visibility from both together means that same Apply call also closes
  // the sheet, instead of leaving it open with nothing in it.
  const mobileSheetOpen = mobileOpen && Boolean(activeSection);

  const closeSection = () => setActiveSection(null);
  const switchSection = (id: SectionId) => {
    setActiveSection(activeSection === id ? null : id);
  };

  const active = NAV_ITEMS.find((item) => item.id === activeSection) ?? null;
  const ActivePanel = active?.Panel;

  const openMobilePanel = () => {
    if (!activeSection) setActiveSection(hasImage ? "adjust" : "images");
    setMobileOpen(true);
  };
  const switchMobileSection = (id: SectionId) => {
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
    {/* Fixed-width shell — nav dock plus a permanently reserved drawer-sized
        gutter (empty when no section is open) — so this element's own layout
        footprint never changes whether or not the drawer is open. Previously
        the drawer occupied real flex width only while open, so toggling it
        resized CanvasWorkspace's container and — via its ResizeObserver →
        `notifyContainerResize` → `fitDocument` chain — re-fit (and visibly
        shifted/rescaled) the whole document every time. Reserving the gutter
        up front means the canvas already excludes that space from its fit,
        so the drawer sliding open over it never covers real canvas content.
        Desktop only — md:flex; on mobile this whole dock+drawer is replaced
        by the floating toggle button and bottom sheet below. */}
    <aside data-accent="image" className="relative hidden min-h-0 shrink-0 bg-neutral-950 md:flex">
      <nav
        aria-label="Editor tools"
        className="flex w-20 shrink-0 flex-col gap-2 overflow-y-auto overflow-x-visible border-r border-neutral-800/70 bg-neutral-900/90 p-2.5"
      >
        {NAV_ITEMS.map(({ id, label, icon: Icon }, index) => {
          const isActive = activeSection === id;
          return (
            <motion.button
              key={id}
              ref={(el) => {
                buttonRefs.current[index] = el;
              }}
              type="button"
              whileTap={{ scale: 0.93 }}
              onClick={() => switchSection(id)}
              onKeyDown={(event) => handleTileKeyDown(event, index)}
              aria-pressed={isActive}
              aria-label={label}
              aria-controls={isActive ? DRAWER_ID : undefined}
              className={`group relative flex h-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-medium tracking-tight transition-colors ${FOCUS_RING} ${
                isActive ? "text-white" : "text-neutral-400 hover:text-neutral-100"
              }`}
            >
              {isActive && (
                <>
                  <motion.span
                    layoutId="dock-active-pill"
                    className="absolute inset-0.5 rounded-lg bg-white/10"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                  <motion.span
                    layoutId="dock-active-bar"
                    className="absolute right-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-l-full bg-white"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                </>
              )}
              {!isActive && (
                <span className="absolute inset-0.5 rounded-lg bg-transparent transition-colors group-hover:bg-neutral-800/60" />
              )}
              <span
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  isActive ? "text-white" : "text-neutral-400 group-hover:text-neutral-100"
                }`}
              >
                <Icon size={20} />
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
              className="h-full w-full overflow-hidden border-l border-r border-neutral-800/70 bg-neutral-900/95 shadow-2xl shadow-black/40 backdrop-blur-md"
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
                {/* Only this middle region scrolls — long panels (e.g. Adjust) scroll here while
                    the 300×250 ad slot below stays pinned to the bottom of the drawer. */}
                <div ref={drawerScrollRef} className="custom-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
                  <AnimatePresence mode="wait" initial={false}>
                    {/*
                      Fade only — no `y` offset. A transform on this child shifts
                      its post-transform box, and since the scroll container is
                      an ancestor, that shift briefly reads as real overflow and
                      flashes the scrollbar for the ~150ms of the transition.
                    */}
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
                {/* 320px drawer − 2×10px padding = exactly 300px wide, matching SidebarAd. */}
                <div className="shrink-0 border-t border-neutral-800/70 px-2.5 py-2.5">
                  <SidebarAd />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>

    {/* Mobile only — the sidebar starts closed and is opened/closed with this
        floating button, sliding the same panels up as a bottom sheet instead
        of a permanent dock. */}
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

    {/* Non-modal on purpose — no full-screen dimming layer. The old version
        wrapped the sheet in a `fixed inset-0` backdrop, which visually
        darkened and pointer-blocked the *entire* screen (including the
        image board above the 75vh-tall sheet) any time the panel was open,
        so the board was neither visible nor usable alongside it. Capping
        the sheet's own height leaves a clear, undimmed, fully interactive
        strip of canvas above it — the user can keep panning/zooming the
        photo while a tool panel is open — and closing goes through the X
        button only (tapping the board should pan/zoom it, not dismiss the
        sheet). */}
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
          className="fixed inset-x-0 bottom-0 z-30 flex max-h-[42vh] flex-col rounded-t-2xl border-t border-neutral-800 bg-neutral-900/98 shadow-2xl shadow-black/60 backdrop-blur-md md:hidden"
        >
          <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-neutral-700" />

          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-800/70 px-3 py-2">
            <div className="flex flex-1 items-center gap-1 overflow-x-auto">
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
                const isActive = activeSection === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => switchMobileSection(id)}
                    aria-pressed={isActive}
                    aria-label={label}
                    className={`flex shrink-0 flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${FOCUS_RING} ${
                      isActive ? "bg-white/10 text-white" : "text-neutral-400"
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

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {ActivePanel && <ActivePanel />}
            <div className="border-t border-neutral-800/70 px-4 py-3">
              <SidebarAd />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
