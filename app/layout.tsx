import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import type { PaletteMode } from "@mui/material";
import ThemeRegistry from "@/theme/ThemeRegistry";
import { THEME_COOKIE_NAME } from "@/lib/theme-cookie";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CreativeFlow — The All-in-One Visual Platform",
  description: "Fast, browser-based photo editing, retouching, and export in one workspace.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const storedMode = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const initialMode: PaletteMode = storedMode === "light" ? "light" : "dark";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeRegistry initialMode={initialMode}>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
