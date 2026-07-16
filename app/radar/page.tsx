import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "IPO 公開進度雷達",
  description: "依送件、審議、契約、競拍、定價與掛牌等公開事件整理公司進度，不代表投資建議。",
  alternates: { canonical: "/radar" },
};

export default function RadarPage() {
  return <Dashboard initialTab="radar" />;
}
