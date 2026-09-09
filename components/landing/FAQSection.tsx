"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

// Rendered visible copy and the injected JSON-LD schema below both read from
// this single list, so the structured data can never drift from what users
// actually see (a requirement for Google's FAQPage rich-result eligibility).
const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Is CreativeFlow really free to use?",
    answer:
      "Yes. Crop, watermark removal, background removal, and color adjustment are free to use directly in your browser — no account or subscription required.",
  },
  {
    question: "Is my file uploaded to a server?",
    answer:
      "No. Every edit runs entirely in your browser tab using canvas-based processing. Your photos and videos are never sent to a remote server.",
  },
  {
    question: "What image and video formats are supported?",
    answer:
      "You can import JPG, PNG, or WebP images (up to 25MB) and MP4 or WebM video (up to 200MB). Edited images export back out as high-quality JPG, PNG, or WebP.",
  },
  {
    question: "Do I need to install any software or browser extension?",
    answer:
      "No installs, plugins, or extensions. CreativeFlow runs entirely as a web app in any modern browser.",
  },
  {
    question: "Can I trim or edit videos, not just images?",
    answer:
      "Video upload is supported today, but video editing tools like trim and compress are still in development and will unlock soon. Image editing is fully available now.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: {
      "@type": "Answer",
      text: answer,
    },
  })),
};

export default function FAQSection() {
  const idBase = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="px-6 pb-28">
      <div className="mx-auto max-w-3xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-3 text-slate-400">Everything you need to know before you start editing.</p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map(({ question, answer }, index) => {
            const isOpen = openIndex === index;
            const panelId = `${idBase}-panel-${index}`;
            const buttonId = `${idBase}-button-${index}`;
            return (
              <div
                key={question}
                className={`overflow-hidden rounded-2xl border-2 backdrop-blur-md transition-all duration-300 ${
                  isOpen
                    ? "border-cyan-500/50 bg-slate-900/60 shadow-[0_0_24px_-8px_rgba(6,182,212,0.35)]"
                    : "border-slate-800/80 bg-slate-950/40 hover:border-cyan-500/30 hover:bg-slate-900/40"
                }`}
              >
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-200 active:bg-slate-900/60"
                >
                  <span className="text-sm font-semibold text-white sm:text-base">{question}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0"
                  >
                    <ChevronDown size={18} className={isOpen ? "text-cyan-400" : "text-slate-400"} />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="border-t border-slate-800/60 px-5 pb-4 pt-4 text-sm leading-relaxed text-slate-400">
                        {answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </section>
  );
}
