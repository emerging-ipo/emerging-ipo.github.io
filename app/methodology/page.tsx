import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "資料方法與分類說明",
  description: "說明興櫃市場雷達的報價來源、週比較基準、流動性分類、IPO 事件標籤與資料限制。",
  alternates: { canonical: "/methodology" },
};

export default function MethodologyPage() {
  return <main className="legal-shell">
    <header className="legal-header">
      <Link className="legal-brand" href="/market"><span><b>興櫃市場雷達</b><small>Taiwan Emerging Stock Data</small></span></Link>
      <nav><Link href="/market">返回首頁</Link><Link href="/about">關於本站</Link><Link href="/disclaimer">免責聲明</Link></nav>
    </header>
    <article className="legal-document">
      <div className="legal-title"><span>METHODOLOGY</span><h1>資料方法與分類說明</h1><p>最後更新：2026 年 7 月 18 日</p></div>
      <div className="legal-summary">本站以公開資料的日期、價格與事件狀態進行整理。所有排行與標籤均為規則式分類，不代表公司評價、報酬預測或操作方向。</div>

      <section><h2>1. 報價與更新時間</h2><p>成交價優先採用可取得的第三方即時行情，並顯示資料來源回傳的報價時間。興櫃市場可能因交易稀少而長時間沒有新成交；此時畫面會標示無報價或保留最後可確認資料，不將缺值視為價格不變。即時行情僅供資訊查閱，實際成交資訊仍以券商及市場公告為準。</p></section>
      <section><h2>2. 上週比較基準</h2><p>上週收盤以最近一個已完整結束交易週的最後有效交易日為準。一般情況為星期五；若星期五因國定假日或休市沒有資料，則採該週最後一個有效交易日。週漲跌幅以現價相對此基準計算。</p></section>
      <section><h2>3. 流動性分類</h2><p>流動性門檻內資料目前採成交量至少 10,000 股且估算成交金額至少新臺幣 500,000 元作為版面分類條件。未達門檻者列入低量資料區。這不是對股票品質、適合程度或未來表現的判定。</p></section>
      <section><h2>4. IPO 事件分類</h2><p>進度雷達依來源機構公開日期分為送件觀察、審議進程、契約後、競拍或買賣日排定、定價完成與已掛牌等階段。近期事件僅表示公開日期接近；已定價僅表示可確認的實際承銷價已出現。</p></section>
      <section><h2>5. 定價與買賣日</h2><p>暫定承銷價、最低投標價格、實際承銷價及股票上市／上櫃買賣日為不同欄位，不互相推定。只有來源資料明確提供實際承銷價時才標示已定價；只有公開公告明確日期時才顯示買賣日。</p></section>
      <section><h2>6. 公司概況與題材</h2><p>公司名稱、產業、董事長、資本額、官網、興櫃日期與主要業務優先採櫃買中心公開資料，連線受限時由瀏覽器直接讀取同一官方端點補充。題材標籤依可確認的產業與主要業務資料整理，不以名稱相近或未經證實的新聞推測取代。</p></section>
      <section><h2>7. 外部服務與資料限制</h2><p>來源機構或第三方行情服務暫時無法連線時，本站可能顯示最近一次成功取得的公開資料快照，並在來源恢復後更新。技術線圖與新聞標題均以外部連結方式提供；本站不重製第三方網站的版面、圖表或新聞全文。資料仍可能因來源延遲、修正、代號轉換或交易稀少而出現時間差，重要資訊應回到原始公告查核。</p></section>
    </article>
    <footer className="legal-footer"><p>資料來源：臺灣證券交易所、證券櫃檯買賣中心、公開資訊觀測站及其他公開或第三方行情資訊。</p><p>本站為獨立維護之公開資料整理網站，與所引用之機構、公司及第三方服務無隸屬、代理或背書關係；內容僅供資訊查閱與一般研究參考，不構成任何形式之投資建議。</p><nav><Link href="/market">首頁</Link><Link href="/about">關於本站</Link><Link href="/methodology">資料方法</Link><Link href="/disclaimer">免責聲明</Link><Link href="/privacy">隱私權政策</Link></nav></footer>
  </main>;
}
