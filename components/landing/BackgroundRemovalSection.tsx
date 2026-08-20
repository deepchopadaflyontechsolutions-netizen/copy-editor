"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Layers, ScanEye, ImageDown } from "lucide-react";
import MediaCompareSlider from "./MediaCompareSlider";

const FEATURES = [
  { Icon: ScanEye, text: "Precise edge detection for complex subjects" },
  { Icon: ImageDown, text: "Transparent PNG export, ready to use" },
  { Icon: Layers, text: "Instant background swap on any subject" },
];

export default function BackgroundRemovalSection() {
  return (
    <section id="background-remover" className="px-6 pb-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-14">
          {/* Description */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="md:order-1"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-300">
              <Layers size={12} />
              Background Remover
            </span>

            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Isolate subjects and erase backgrounds in seconds
            </h2>

            <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-400 sm:text-base">
              Fine fur, stray hairs, motion blur — our edge detection handles the
              hard cases automatically, cutting out clean subjects without the
              halos or jagged edges of a manual selection.
            </p>

            <ul className="mt-6 flex flex-col gap-3">
              {FEATURES.map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-purple-400/20 bg-purple-400/10 text-purple-300">
                    <Icon size={15} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>

            <Link
              href="/background-remover"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-purple-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-transform hover:scale-[1.03] hover:bg-purple-400 active:scale-[0.98]"
            >
              Try Background Remover
              <ArrowRight size={16} />
            </Link>
          </motion.div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:order-2"
          >
            <div className="mx-auto max-w-sm">
              <MediaCompareSlider
                beforeSrc="/showcase/bg-remove-before.jpg"
                afterSrc="/showcase/bg-remove-after.png"
                beforeAlt="Dog running on grass with a full background"
                afterAlt="Same dog cut out with a transparent background"
                fileLabel="Background Remover — dog-running.png"
                aspectClassName="aspect-[604/802]"
                checkerboardAfter
                accent="purple"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
