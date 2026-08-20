"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles, Wand2, Layers, MousePointerClick } from "lucide-react";
import MediaCompareSlider from "./MediaCompareSlider";

const FEATURES = [
  { Icon: Wand2, text: "AI auto-detection of logos, text & stamps" },
  { Icon: Layers, text: "Lossless detail preservation underneath" },
  { Icon: MousePointerClick, text: "One-click export, no manual masking" },
];

export default function WatermarkRemovalSection() {
  return (
    <section id="watermark-remover" className="px-6 pb-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-14">
          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <MediaCompareSlider
              beforeSrc="/showcase/watermark-before.png"
              afterSrc="/showcase/watermark-after.png"
              beforeAlt="Portrait with a watermark in the corner"
              afterAlt="Same portrait with the watermark removed"
              fileLabel="Watermark Remover — royal-portrait.png"
              aspectClassName="aspect-[4/3]"
              accent="cyan"
            />
          </motion.div>

          {/* Description */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-300">
              <Sparkles size={12} />
              Watermark Remover
            </span>

            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Remove logos, text, and stamps seamlessly
            </h2>

            <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-400 sm:text-base">
              Our AI detects corner watermarks and overlay logos, then reconstructs
              what&apos;s underneath — so the cleaned image keeps its original
              texture and detail instead of leaving a smudge behind.
            </p>

            <ul className="mt-6 flex flex-col gap-3">
              {FEATURES.map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
                    <Icon size={15} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>

            <Link
              href="/watermark-remover"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 transition-transform hover:scale-[1.03] hover:bg-cyan-400 active:scale-[0.98]"
            >
              Try Watermark Remover
              <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
