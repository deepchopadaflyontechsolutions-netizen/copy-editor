import { Sparkles } from "lucide-react";

export default function LandingFooter() {
  return (
    <footer className="border-t-2 border-[#1E293B] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0066FF] text-white">
            <Sparkles size={13} />
          </span>
          <span className="text-sm font-semibold text-slate-300">CreativeFlow</span>
        </div>
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} CreativeFlow. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
