"use client";

import { motion } from "framer-motion";
import { Download, UploadCloud, Wand2, type LucideIcon } from "lucide-react";

interface Step {
  index: string;
  title: string;
  description: string;
  Icon: LucideIcon;
}

const STEPS: Step[] = [
  {
    index: "01",
    title: "Upload",
    description: "Drag in a photo or video, or pick one from your device — no account required.",
    Icon: UploadCloud,
  },
  {
    index: "02",
    title: "Edit",
    description: "Crop, remove watermarks, cut backgrounds, or fine-tune color with precision editing tools.",
    Icon: Wand2,
  },
  {
    index: "03",
    title: "Export",
    description: "Download your result in the format you need — full quality, no watermark.",
    Icon: Download,
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 pb-28">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-16 max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            From upload to export in three steps
          </h2>
          <p className="mt-3 text-slate-400">No tutorials needed — the workflow is the whole app.</p>
        </motion.div>

        <div className="relative grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-6">
          <div
            aria-hidden
            className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-[#334155] to-transparent sm:block"
          />

          {STEPS.map(({ index, title, description, Icon }, i) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="relative flex flex-col items-center text-center"
            >
              <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#334155] bg-[#0F172A] text-[#0066FF] shadow-[0_0_24px_rgba(0,102,255,0.3)]">
                <Icon size={24} />
                <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#0066FF] text-[10px] font-bold text-white shadow-[0_0_12px_rgba(0,102,255,0.6)]">
                  {index}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-400">{description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
