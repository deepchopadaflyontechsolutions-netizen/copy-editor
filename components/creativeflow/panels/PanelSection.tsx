"use client";

import type { ReactNode } from "react";

/** Shared header/spacing chrome for one collapsible-looking card in the right rail — mirrors the reference's "SLIDER CONTROL / COLOR CHANGE / …" section labels. */
export default function PanelSection({
  id,
  title,
  children,
  actions,
  fill,
}: {
  id?: string;
  /** Omit to skip the header row entirely — for a panel whose nav tile already names it (e.g. ResizePanel). */
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  /** Stretch to fill any leftover drawer height instead of sizing to content — for a lone section whose content should fill the panel (e.g. ImagesPanel's ad slot). */
  fill?: boolean;
}) {
  return (
    <section
      id={id}
      className={`border-b border-neutral-800/70 px-4 py-3.5 last:border-b-0 ${fill ? "flex flex-1 min-h-0 flex-col" : ""}`}
    >
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h3 className="text-sm font-semibold text-neutral-300">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
