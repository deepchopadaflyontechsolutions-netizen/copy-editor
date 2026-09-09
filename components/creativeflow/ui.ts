/**
 * Shared style tokens for the CreativeFlow editor chrome (right-panel drawers,
 * top bar, floating toolbars). Centralizing these keeps button font sizes and
 * border radii consistent across panels instead of each one picking its own
 * text-[Npx]/rounded-* values.
 */

// Rectangular buttons (full-width or inline CTAs) all share one text size —
// 14px — and one radius (rounded-lg) so "Resize", "Apply", "Upload Image",
// "Export" etc. read as the same control everywhere they appear. Don't
// override the radius per-callsite (e.g. rounded-full) — that reintroduces
// the inconsistency this file exists to remove.
export const buttonFont = "text-sm font-semibold";

const buttonBase = `flex items-center justify-center gap-1.5 rounded-lg ${buttonFont} transition-colors disabled:cursor-not-allowed disabled:opacity-40`;

export const button = {
  /** Solid white CTA — the single "do the main thing" action per panel. */
  primary: `${buttonBase} bg-white py-2.5 text-black shadow-md shadow-black/20 hover:bg-neutral-200 disabled:shadow-none`,
  /** Bordered neutral action — Reset, cancel, secondary choices. */
  secondary: `${buttonBase} border border-neutral-700 bg-neutral-800/60 py-2.5 text-neutral-200 hover:border-neutral-600 hover:bg-neutral-800 hover:text-white`,
  /** Compact bordered chip — toggles/presets (aspect ratio, zoom %, export format). */
  chip: (active: boolean) =>
    `rounded-md border px-3 py-1.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
      active
        ? "border-white/25 bg-white/10 text-white"
        : "border-neutral-700 bg-transparent text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
    }`,
};

export const text = {
  /** Section header inside a right-panel drawer (matches PanelSection's own title). */
  sectionTitle: "text-sm font-semibold text-neutral-300",
  /** Small uppercase label above a sub-group (e.g. "Text watermark", "Format"). */
  eyebrow: "text-xs font-bold uppercase tracking-wider text-neutral-400",
  /** Field label above an input. */
  fieldLabel: "text-xs font-semibold uppercase tracking-wide text-neutral-400",
  /** Helper/description copy. */
  helper: "text-xs leading-relaxed text-neutral-500",
};

/** Radius for card-like containers (grouped controls inside a panel). */
export const cardRadius = "rounded-xl";
