import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-barlow-condensed",
  display: "swap",
});
const barlow = Barlow({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-barlow", display: "swap" });
const notoKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-noto-kr",
  display: "swap",
  preload: false,
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
    <html lang="ko" className={`${barlowCondensed.variable} ${barlow.variable} ${notoKr.variable}`}>
      <body>{children}</body>
    </html>
  );
}
