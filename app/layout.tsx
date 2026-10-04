import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Nunito, Noto_Sans_Devanagari, Noto_Serif_Devanagari } from "next/font/google";
import { Shell } from "@/components/Shell";

const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-serif" });
const sans = Nunito({ subsets: ["latin"], variable: "--font-sans" });
// Devanagari fallbacks: Latin glyphs come from the fonts above, Hindi text from these
const devaSans = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-deva" });
const devaSerif = Noto_Serif_Devanagari({ subsets: ["devanagari"], variable: "--font-deva-serif" });

export const metadata: Metadata = { title: "AfterBloom", description: "A postpartum care platform for Indian mothers, their families and their babies" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#c85d68" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${devaSans.variable} ${devaSerif.variable}`}>
      <body><Shell>{children}</Shell></body>
    </html>
  );
}
