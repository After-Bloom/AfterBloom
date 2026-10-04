import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Nunito, Noto_Sans_Devanagari, Noto_Serif_Devanagari } from "next/font/google";
import { Shell } from "@/components/Shell";
import { themeScript } from "@/lib/theme";

const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["600", "700"], display: "swap", variable: "--font-serif" });
const sans = Nunito({ subsets: ["latin"], variable: "--font-sans" });
// Devanagari fallbacks: Latin glyphs come from the fonts above, Hindi text from these
const devaSans = Noto_Sans_Devanagari({ subsets: ["devanagari"], display: "swap", preload: false, variable: "--font-deva" });
const devaSerif = Noto_Serif_Devanagari({ subsets: ["devanagari"], display: "swap", preload: false, variable: "--font-deva-serif" });

export const metadata: Metadata = {
  title: "AfterBloom",
  description: "A postpartum care platform for Indian mothers, their families and their babies",
  applicationName: "AfterBloom",
  appleWebApp: { capable: true, title: "AfterBloom", statusBarStyle: "default" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: [{ media: "(prefers-color-scheme: light)", color: "#FFF8F3" }, { media: "(prefers-color-scheme: dark)", color: "#1C1117" }], viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${serif.variable} ${sans.variable} ${devaSans.variable} ${devaSerif.variable}`}>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body><Shell>{children}</Shell></body>
    </html>
  );
}
