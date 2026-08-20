"use client";

import { motion } from "framer-motion";
import StudioPanel from "./StudioPanel";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-20 sm:pt-28">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-10rem] -z-10 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[#0066FF]/20 blur-[120px]"
      />

      <div className="mx-auto max-w-4xl text-center">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl md:whitespace-nowrap"
        >
          Free Online{" "}
          <span className="bg-gradient-to-r from-[#0066FF] to-[#06B6D4] bg-clip-text text-transparent">
            Image &amp; Video Editor
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 md:text-base"
        >
          Resize, crop, remove backgrounds, and edit video — all in your
          browser. No installs, no plugins, nothing to download. Drop a file in
          and start editing in seconds.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.16 }}
          className="mt-10"
        >
          <StudioPanel />
        </motion.div>
      </div>
    </section>
  );
}
