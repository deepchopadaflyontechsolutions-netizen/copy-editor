import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { PaletteMode } from "@mui/material";
import ThemeRegistry from "@/theme/ThemeRegistry";
import { THEME_COOKIE_NAME } from "@/lib/theme-cookie";
import "./globals.css";

export const metadata: Metadata = {
  title: "CreativeFlow — The All-in-One Visual Platform",
  description:
    "Fast, browser-based photo editing, retouching, and export in one workspace.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const storedMode = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const initialMode: PaletteMode = storedMode === "light" ? "light" : "dark";

  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* Plain <script> in the server-rendered <head> (not next/script) so AdSense's site
            verification crawler sees it in the raw HTML on every page. */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1985890330605429"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeRegistry initialMode={initialMode}>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
