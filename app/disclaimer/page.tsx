import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "免責聲明",
  description: "興櫃市場雷達的網站定位、資料限制、投資風險與第三方服務說明。",
};

export default function DisclaimerPage() {
  return <main className="legal-shell">
    <header className="legal-header">
      <Link className="legal-brand" href="/market"><span><b>興櫃市場雷達</b><small>Taiwan Emerging Stock Data</small></span></Link>
      <nav><Link href="/market">返回首頁</Link><Link href="/about">關於本站</Link><Link href="/methodology">資料方法</Link><Link href="/privacy">隱私權政策</Link></nav>
    </header>
    <article className="legal-document">
      <div className="legal-title"><span>DISCLAIMER</span><h1>免責聲明</h1><p>最後更新日期：2026 年 7 月 18 日</p></div>
      <aside className="fraud-alert" aria-labelledby="fraud-alert-title">
        <h2 id="fraud-alert-title">防詐騙提醒</h2>
        <p>本站目前未設立或經營任何 LINE、Telegram、Discord 或其他投資群組，也不會主動私訊招攬會員、收取費用、代為操作、提供明牌、保證獲利，或要求匯款及提供帳戶密碼、驗證碼等敏感資料。</p>
        <p>如有人冒用「興櫃市場雷達」名義邀請入群、推介個股、索取金錢或個人資料，請勿回應或付款，並保留相關紀錄向該平台檢舉；如有疑慮，可撥打 165 反詐騙諮詢專線查證。</p>
      </aside>
      <div className="legal-summary warning">本站整理臺灣證券交易所、證券櫃檯買賣中心、公開資訊觀測站及其他公開或第三方行情資訊，內容僅供資訊查閱與一般研究參考，不構成投資建議、招攬、推介、交易指示或收益保證。</div>
      <section><h2>1. 網站定位與獨立性</h2><p>本站與所引用的主管機關、交易所、櫃買中心、公司、行情服務、新聞網站及其他第三方均無隸屬、代理、合作、授權或背書關係，除非另有清楚書面揭露。第三方名稱及商標僅於必要時用於識別資料來源或外部連結，其權利歸各權利人所有。</p></section>
      <section><h2>2. 不提供個別化投資服務</h2><p>本站並非證券投資顧問事業，不接受個別委任、不代客交易、不接收交易指示、不收受或代管資金，也不依個人財務狀況、持股成本或風險承受度，提供個別有價證券之價值分析、操作建議或推介。行情、資料排序、IPO 階段、事件標籤、題材索引、公司輪廓及新聞連結僅供公開資訊整理與一般研究參考。</p></section>
      <section><h2>3. 排序與標籤不是推薦</h2><p>漲跌幅、成交量、成交金額及近期事件等排序，均依頁面揭露的客觀欄位與規則產生。顯示順序、色彩、標籤或列入前 50 筆不代表本站選股、評等、推薦、價格預測或對未來報酬的判斷。</p></section>
      <section><h2>4. 資料可能延遲或修正</h2><p>本站以自動化程序整理行情、IPO 時程與公司資訊，資料主要取自臺灣證券交易所、證券櫃檯買賣中心、公開資訊觀測站及其他公開或第三方行情資訊。即使採取自動更新與交叉檢查，仍可能因來源延遲、錯誤、遺漏、修正、網路中斷、欄位變動、交易暫停或程式解析差異，而不完整、不即時或與原始公告不同。重要資訊請以主管機關、交易所、櫃買中心、公開資訊觀測站及公司正式公告為準。</p></section>
      <section><h2>5. 興櫃市場風險</h2><p>興櫃股票可能具有成交量低、買賣價差大、單筆交易影響價格及資訊揭露與流動性差異等特性。歷史漲跌、資料排序、事件階段或競拍時程不代表未來表現。使用者應以來源機構及公司最新公告為準，並依自身情況審慎判斷。</p></section>
      <section><h2>6. 事件分類的限制</h2><p>本站依公開 IPO 進度、競拍、實際定價及股票上市／上櫃買賣日等資料進行事件分類。標籤只協助整理日期先後，不代表買賣時點，也未納入每位使用者的成本、資金配置、稅費或其他個人條件。</p></section>
      <section><h2>7. 資料、著作權與外部連結</h2><p>本站尊重資料來源、著作權及商標權，並以文字說明主要資料類型。技術線圖與新聞內容採外部連結呈現，本站不重製第三方網站的版面、圖表或新聞全文。外部網站的內容、可用性、正確性、授權條款與隱私做法由其營運者負責；連結不表示本站認可、合作或保證其內容。</p></section>
      <section><h2>8. 責任限制</h2><p>使用者應在採取任何交易或申購行動前查閱最新公開說明書、重大訊息、競拍及申購公告，必要時諮詢具資格的專業人士。在法律允許的範圍內，本站不對因資料延遲、錯誤、服務中斷或依賴本站內容所生的損失負責；本聲明不排除依法不得預先免除的責任。</p></section>
    </article>
    <footer className="legal-footer"><p>資料來源：臺灣證券交易所、證券櫃檯買賣中心、公開資訊觀測站及其他公開或第三方行情資訊。</p><p>本站為獨立維護之公開資料整理網站，與所引用之機構、公司及第三方服務無隸屬、代理或背書關係；內容僅供資訊查閱與一般研究參考，不構成任何形式之投資建議。</p><nav><Link href="/market">首頁</Link><Link href="/about">關於本站</Link><Link href="/methodology">資料方法</Link><Link href="/disclaimer">免責聲明</Link><Link href="/privacy">隱私權政策</Link></nav></footer>
  </main>;
}
