import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "興櫃市場行情排行",
  description: "彙整興櫃股票盤後行情、加權平均成交價、週漲跌幅、成交量、成交金額與流動性狀態。",
  alternates: { canonical: "/market" },
};

export default function MarketPage() {
  return <Dashboard initialTab="market" />;
}
