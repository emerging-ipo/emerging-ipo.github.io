import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "隱私權政策",
  description: "興櫃市場雷達的資料蒐集、Cookie 與第三方服務隱私說明。",
};

export default function PrivacyPage() {
  return <main className="legal-shell">
    <header className="legal-header">
      <Link className="legal-brand" href="/market"><span><b>興櫃市場雷達</b><small>Taiwan Emerging Stock Data</small></span></Link>
      <nav><Link href="/market">返回首頁</Link><Link href="/about">關於本站</Link><Link href="/methodology">資料方法</Link><Link href="/disclaimer">免責聲明</Link></nav>
    </header>
    <article className="legal-document">
      <div className="legal-title"><span>PRIVACY POLICY</span><h1>隱私權政策</h1><p>最後更新日期：2026 年 7 月 18 日</p></div>
      <div className="legal-summary">本政策依本站目前實際功能撰寫。本站現階段不要求註冊帳號，也不提供留言或聯絡表單。</div>

      <section><h2>1. 適用範圍</h2><p>本政策說明「興櫃市場雷達」（以下簡稱本站）在您瀏覽網站時，如何處理可能產生的使用資訊。本政策不適用於本站連結的交易所、櫃買中心、公開資訊觀測站、公司網站、行情服務或其他第三方網站。</p></section>
      <section><h2>2. 本站目前蒐集的資訊</h2><p>本站不要求訪客提供姓名、電話、地址、身分證字號或投資部位等個人資訊。為維持網站安全與效能，網站託管服務可能自動處理 IP 位址、瀏覽器與裝置類型、請求時間、瀏覽頁面、來源網址及錯誤紀錄等技術資訊。</p><p>這些技術資訊主要用於防止濫用、診斷錯誤、統計流量及改善服務，不用於判斷個別訪客的投資偏好。</p></section>
      <section><h2>3. Cookie 與本機儲存</h2><p>本站目前不主動設置跨站追蹤 Cookie。瀏覽器、託管平台或第三方連結仍可能依其服務需求使用必要 Cookie。您可以在瀏覽器中查看、封鎖或刪除 Cookie，但部分功能可能因此受到影響。</p></section>
      <section><h2>4. 第三方資料與外部連結</h2><p>本站會連結公司公開資料、技術線圖與公開新聞頁面。點擊外部連結後，資料處理方式由該網站的隱私權政策與服務條款規範；本站不控制第三方的 Cookie、內容或資料保存方式，連結亦不表示彼此有合作、授權或背書關係。</p></section>
      <section><h2>5. 資料分享與保存</h2><p>本站不出售訪客個人資料。技術紀錄可能由網站託管或資安服務供應商依其職務處理，或於法律要求時配合合法程序提供。資料僅在達成安全、營運、除錯或法令目的所需期間內保存。</p></section>
      <section><h2>6. 資訊安全與兒童隱私</h2><p>本站會採取合理措施降低未授權存取風險，但網路傳輸與儲存無法保證絕對安全。本站不是以 13 歲以下兒童為主要對象，也不會故意蒐集兒童的可識別個人資訊。</p></section>
      <section><h2>7. 政策更新</h2><p>當網站功能、第三方服務或法規要求變更時，本站可能修訂本政策，並在本頁更新日期。若日後新增會員、表單、電子報或分析工具，將同步補充相關蒐集項目與選擇方式。</p></section>
      <section><h2>8. 隱私問題</h2><p>本站目前沒有會員資料庫或個人資料表單。若日後新增涉及個人資料的功能，本站會在本頁補充可供聯絡與行使資料權利的管理者聯絡方式。</p></section>
    </article>
    <LegalFooter />
  </main>;
}

function LegalFooter() {
  return <footer className="legal-footer"><p>資料來源：臺灣證券交易所、證券櫃檯買賣中心、公開資訊觀測站及其他公開或第三方行情資訊。</p><p>本站為獨立維護之公開資料整理網站，與所引用之機構、公司及第三方服務無隸屬、代理或背書關係；內容僅供資訊查閱與一般研究參考，不構成任何形式之投資建議。</p><nav><Link href="/market">首頁</Link><Link href="/about">關於本站</Link><Link href="/methodology">資料方法</Link><Link href="/disclaimer">免責聲明</Link><Link href="/privacy">隱私權政策</Link></nav></footer>;
}
