import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "關於本站",
  description: "興櫃市場雷達的網站定位、資料原則、獨立性與內容維護方式。",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return <main className="legal-shell">
    <header className="legal-header">
      <Link className="legal-brand" href="/market"><span><b>興櫃市場雷達</b><small>Taiwan Emerging Stock Data</small></span></Link>
      <nav><Link href="/market">返回首頁</Link><Link href="/methodology">資料方法</Link><Link href="/disclaimer">免責聲明</Link></nav>
    </header>
    <article className="legal-document">
      <div className="legal-title"><span>ABOUT</span><h1>關於本站</h1><p>最後更新日期：2026 年 7 月 18 日</p></div>
      <div className="legal-summary">興櫃市場雷達以公開資訊為基礎，將興櫃行情、IPO 進度、競拍與股票買賣日期，依一致欄位與清楚時序整理呈現，使重要資訊更易於查閱與比對。</div>
      <section><h2>1. 資料範圍</h2><p>本站彙整公司基本資料、興櫃報價與成交資訊，以及上市上櫃申請進度、審議、契約、競拍、承銷定價與股票買賣日期。各項資料均保留更新時間與來源線索，便於讀者回溯查核。</p></section>
      <section><h2>2. 網站定位</h2><p>本站專注於公開資訊的整理、分類與呈現，不接受個別委任、不代客交易，也不依個人條件提供投資分析。頁面中的排序、色彩與事件標籤，僅用於協助閱讀，不代表對任何公司的評價或推薦。</p></section>
      <section><h2>3. 編排原則</h2><p>市場表格依讀者選擇的公開數值排序；事件資料則依公開日期與一致規則進行階段分類。遇有資料缺漏時，本站將標示待確認、無報價或備援資料，不以推測取代尚未公告的事實。詳細條件載於資料方法頁。</p></section>
      <section><h2>4. 更新與勘誤</h2><p>網站於頁面開啟、重新取得瀏覽焦點及固定時間間隔檢查 IPO 與事件進度。資料來源若有延遲、欄位調整或公告修正，本站將於後續更新反映；涉及交易或申購的重要資訊，仍應以原始公告為準。</p></section>
    </article>
    <footer className="legal-footer"><p>資料來源：臺灣證券交易所、證券櫃檯買賣中心、公開資訊觀測站及其他公開或第三方行情資訊。</p><p>本站為獨立維護之公開資料整理網站，與所引用之機構、公司及第三方服務無隸屬、代理或背書關係；內容僅供資訊查閱與一般研究參考，不構成任何形式之投資建議。</p><nav><Link href="/market">首頁</Link><Link href="/about">關於本站</Link><Link href="/methodology">資料方法</Link><Link href="/disclaimer">免責聲明</Link><Link href="/privacy">隱私權政策</Link></nav></footer>
  </main>;
}
