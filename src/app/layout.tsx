import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./fonts/barlow-fallback.css";
import "./fonts/noto-sans-kr.css"; // sets --font-noto-kr (Unicode-range slices — not expressible with next/font/local)
import "./globals.css";

// Self-hosted (src/app/fonts/README.md): the same latin woff2 files Google Fonts served, preloaded as before.
// Fallback metrics come from barlow-fallback.css (copied from the previous next/font/google output).
const barlowCondensed = localFont({
  src: [
    { path: "./fonts/BarlowCondensed-500-latin.woff2", weight: "500", style: "normal" },
    { path: "./fonts/BarlowCondensed-600-latin.woff2", weight: "600", style: "normal" },
    { path: "./fonts/BarlowCondensed-700-latin.woff2", weight: "700", style: "normal" },
    { path: "./fonts/BarlowCondensed-800-latin.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-barlow-condensed",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Barlow Condensed Fallback"],
});
const barlow = localFont({
  src: [
    { path: "./fonts/Barlow-500-latin.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Barlow-600-latin.woff2", weight: "600", style: "normal" },
    { path: "./fonts/Barlow-700-latin.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-barlow",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Barlow Fallback"],
});

export const metadata: Metadata = {
  title: "GearMatch",
  description: "나를 닮은 러닝 동물과 함께 내 러닝을 기록하고, 나와 비슷한 러너들의 러닝화를 발견해요.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A0A0A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${barlowCondensed.variable} ${barlow.variable}`}>
      <body>{children}</body>
    </html>
  );
}
