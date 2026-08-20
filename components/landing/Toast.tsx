"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface ToastProps {
  message: string | null;
}

export default function Toast({ message }: ToastProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="alert"
            className="pointer-events-auto flex max-w-md items-start gap-3 rounded-xl border border-red-500/30 bg-[#1E293B] px-4 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
          >
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-400" />
            <p className="text-sm leading-snug text-slate-200">{message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
