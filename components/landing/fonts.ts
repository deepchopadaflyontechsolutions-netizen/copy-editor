import { Sora, Inter } from "next/font/google";

/** Landing-only display face for spotlight/feature headings — the editor's own chrome
 * deliberately stays on one system font (see globals.css), so this is scoped to marketing
 * sections via `sora.className` rather than touching the global `--font-sans`. */
export const sora = Sora({ subsets: ["latin"], weight: ["600", "700"], display: "swap" });

/** Landing-only body face paired with `sora` above — again scoped locally via `inter.className`
 * rather than overriding the editor's global system-font stack. */
export const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });
