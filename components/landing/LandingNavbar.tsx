"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  ChevronDown,
  Crop,
  Eraser,
  FileArchive,
  FileVideo,
  Film,
  Layers,
  Menu,
  Palette,
  Scissors,
  Sparkles,
  X,
} from "lucide-react";

type ToolLink = {
  label: string;
  description: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  href: string;
  soon?: boolean;
};

const IMAGE_TOOLS: ToolLink[] = [
  {
    label: "Crop & Resize",
    description: "Adjust dimensions and aspect ratio",
    icon: Crop,
    href: "/crop-resize",
  },
  {
    label: "Background Removal",
    description: "Precision subject cutout",
    icon: Layers,
    href: "/background-remover",
  },
  {
    label: "Watermark Remover",
    description: "Clean up unwanted overlays",
    icon: Eraser,
    href: "/watermark-remover",
  },
  {
    label: "Color Adjustment",
    description: "Fine-tune tone, contrast & hue",
    icon: Palette,
    href: "/editor?tool=color_adjustment",
  },
];

const VIDEO_TOOLS: ToolLink[] = [
  {
    label: "Trim & Cut",
    description: "Precision timeline editing",
    icon: Scissors,
    href: "/editor",
    soon: true,
  },
  {
    label: "Compress Video",
    description: "Shrink file size, keep quality",
    icon: FileArchive,
    href: "/editor",
    soon: true,
  },
  {
    label: "Format Convert",
    description: "MP4, WebM, MOV & more",
    icon: FileVideo,
    href: "/editor",
    soon: true,
  },
  {
    label: "Extract Frames",
    description: "Pull stills from any clip",
    icon: Film,
    href: "/editor",
    soon: true,
  },
];

type DropdownKey = "video" | "image" | null;

export default function LandingNavbar() {
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<DropdownKey>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenDropdown(null);
        setMobileOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header className="pointer-events-none fixed top-4 left-1/2 z-100 w-[calc(100%-2rem)] max-w-[calc(100%-2rem)] -translate-x-1/2 lg:w-fit">
      <div className="pointer-events-auto">
        <div
          ref={navRef}
          className="flex items-center justify-between gap-6 rounded-full border-2 border-slate-700/50 bg-slate-950/70 px-6 py-2.5 shadow-lg shadow-black/40 ring-1 ring-inset ring-white/5 backdrop-blur-lg backdrop-saturate-150 sm:gap-10"
        >
          <Link
            href="/"
            className="flex items-center gap-2.5"
            onClick={() => {
              setOpenDropdown(null);
              setMobileOpen(false);
            }}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0066FF] to-[#06B6D4] p-2 text-white shadow-[0_0_16px_rgba(0,102,255,0.55)]">
              <Sparkles size={16} />
            </span>
            <span className="text-base font-bold tracking-tight text-white sm:text-lg">
              Creative<span className="text-[#0066FF]">Flow</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            <NavDropdown
              label="Video Tools"
              items={VIDEO_TOOLS}
              isOpen={openDropdown === "video"}
              onToggle={() =>
                setOpenDropdown((current) =>
                  current === "video" ? null : "video",
                )
              }
            />
            <NavDropdown
              label="Image Tools"
              items={IMAGE_TOOLS}
              isOpen={openDropdown === "image"}
              onToggle={() =>
                setOpenDropdown((current) =>
                  current === "image" ? null : "image",
                )
              }
            />
            <Link
              href="/#how-it-works"
              className="rounded-full px-3.5 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              How it works
            </Link>

            <Link
              href="/#faq"
              className="rounded-full px-3.5 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              FAQ
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* No accounts exist yet (the product works with zero sign-up) — shown to match
                the reference layout, but intentionally not a link so it doesn't promise a
                flow that isn't there. */}

            <Link
              href="/editor"
              className="rounded-full bg-[#0066FF] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#0066FF]/25 transition-transform hover:scale-[1.03] hover:bg-[#1a75ff] active:scale-[0.98] sm:px-5 sm:py-2.5"
            >
              Go to Editor
            </Link>

            <button
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((open) => !open)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white/10 bg-white/5 text-slate-300 transition-colors hover:text-white lg:hidden"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="mt-3 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border-2 border-white/10 bg-[#0F172A]/90 p-3 shadow-2xl shadow-black/40 backdrop-blur-2xl backdrop-saturate-150 lg:hidden">
            <MobileSection
              label="Video Tools"
              items={VIDEO_TOOLS}
              isOpen={mobileSection === "video"}
              onToggle={() =>
                setMobileSection((current) =>
                  current === "video" ? null : "video",
                )
              }
              onNavigate={() => setMobileOpen(false)}
            />
            <MobileSection
              label="Image Tools"
              items={IMAGE_TOOLS}
              isOpen={mobileSection === "image"}
              onToggle={() =>
                setMobileSection((current) =>
                  current === "image" ? null : "image",
                )
              }
              onNavigate={() => setMobileOpen(false)}
            />
            <Link
              href="/#how-it-works"
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              How it works
            </Link>
            <Link
              href="/#pricing"
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              Pricing
            </Link>
            <Link
              href="/#faq"
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              FAQ
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

function NavDropdown({
  label,
  items,
  isOpen,
  onToggle,
}: {
  label: string;
  items: ToolLink[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={onToggle}
        className={clsx(
          "flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
          isOpen ? "text-white" : "text-slate-300 hover:text-white",
        )}
      >
        {label}
        <ChevronDown
          size={14}
          className={clsx(
            "transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute left-1/2 top-full mt-3 w-80 -translate-x-1/2 rounded-2xl border-2 border-white/10 bg-[#0F172A] p-2 shadow-2xl shadow-black/40">
          {items.map((item) => (
            <ToolMenuItem key={item.label} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function ToolMenuItem({ item }: { item: ToolLink }) {
  const Icon = item.icon;
  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0066FF]/15 text-[#0066FF]">
        <Icon size={16} />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{item.label}</span>
          {item.soon && (
            <span className="rounded-full bg-slate-700/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
              Soon
            </span>
          )}
        </span>
        <span className="block truncate text-xs text-slate-400">
          {item.description}
        </span>
      </span>
    </>
  );

  if (item.soon) {
    return (
      <div className="flex cursor-not-allowed items-start gap-3 rounded-xl px-3 py-2.5 opacity-60">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5"
    >
      {content}
    </Link>
  );
}

function MobileSection({
  label,
  items,
  isOpen,
  onToggle,
  onNavigate,
}: {
  label: string;
  items: ToolLink[];
  isOpen: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  return (
    <div className="border-b-2 border-white/10">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-sm font-medium text-slate-200"
      >
        {label}
        <ChevronDown
          size={16}
          className={clsx(
            "transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div className="space-y-1 pb-2">
          {items.map((item) => {
            const Icon = item.icon;
            if (item.soon) {
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 opacity-60"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0066FF]/15 text-[#0066FF]">
                    <Icon size={14} />
                  </span>
                  <span className="flex items-center gap-2 text-sm text-slate-300">
                    {item.label}
                    <span className="rounded-full bg-slate-700/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                      Soon
                    </span>
                  </span>
                </div>
              );
            }
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onNavigate}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/5"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0066FF]/15 text-[#0066FF]">
                  <Icon size={14} />
                </span>
                <span className="text-sm text-slate-200">{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
