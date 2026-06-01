import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import TourProvider from "./components/TourProvider";

export const metadata: Metadata = {
  title: "민중 — 누구나 쉽게 민원",
  description: "노인·외국인·저소득층을 위한 친근한 민원 안내",
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
        <Suspense fallback={null}>
          <TourProvider />
        </Suspense>
      </body>
    </html>
  );
}
