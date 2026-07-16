import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "IPO 公開時程",
  description: "整理上市上櫃申請、審議、競拍、定價及股票上市或上櫃買賣日期。",
  alternates: { canonical: "/ipo" },
};

export default function IpoPage() {
  return <Dashboard initialTab="ipo" />;
}
