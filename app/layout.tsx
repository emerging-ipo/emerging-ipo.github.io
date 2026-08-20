import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://esrstk.github.io"),
  title: { default: "興櫃雷達觀測站", template: "%s｜興櫃雷達觀測站" },
  description: "整理臺灣興櫃市場報價、公開排行、IPO 時程、事件進度與公司資訊。",
  openGraph: {
    title: "興櫃雷達觀測站",
    description: "整理臺灣興櫃市場報價、公開排行、IPO 時程、事件進度與公司資訊。",
    images: [{ url: "/og-preview.png", width: 1536, height: 1024 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "興櫃雷達觀測站",
    description: "整理臺灣興櫃市場報價、公開排行、IPO 時程、事件進度與公司資訊。",
    images: ["/og-preview.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
