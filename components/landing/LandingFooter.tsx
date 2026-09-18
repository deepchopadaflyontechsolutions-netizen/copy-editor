import Logo from "@/components/Logo";

export default function LandingFooter() {
  return (
    <footer className="border-t border-neutral-800 px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <Logo size={24} wordmarkClassName="text-sm font-semibold text-neutral-300" />
        <p className="text-xs text-neutral-500">
          © {new Date().getFullYear()} CreativeFlow. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
