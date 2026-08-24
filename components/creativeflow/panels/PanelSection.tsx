"use client";

import type { ReactNode } from "react";

/** Shared header/spacing chrome for one collapsible-looking card in the right rail — mirrors the reference's "SLIDER CONTROL / COLOR CHANGE / …" section labels. */
export default function PanelSection({
  id,
  title,
  children,
  actions,
}: {
  id?: string;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section id={id} className="border-b border-slate-800/70 px-4 py-4 last:border-b-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
}
