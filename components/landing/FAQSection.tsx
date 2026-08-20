"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";

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
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="px-6 pb-28">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-12 max-w-2xl text-center"
        >
          <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#0066FF]/15 text-[#0066FF]">
            <HelpCircle size={20} />
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-3 text-slate-400">Everything you need to know before you start editing.</p>
        </motion.div>

        <div className="space-y-3">
          {FAQ_ITEMS.map(({ question, answer }, index) => {
            const isOpen = openIndex === index;
            const panelId = `${idBase}-panel-${index}`;
            const buttonId = `${idBase}-button-${index}`;
            return (
              <div
                key={question}
                className="overflow-hidden rounded-xl border border-[#1E293B] bg-[#0F172A]/60"
              >
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-white sm:text-base">{question}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-slate-400 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-[#0066FF]" : ""
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-4 text-sm leading-relaxed text-slate-400">{answer}</p>
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
