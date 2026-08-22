"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Tab = "market" | "radar" | "ipo";
type SortDirection = "desc" | "asc";
type MarketSortKey = "dailyChangePercent" | "change" | "latest" | "volume" | "turnover";
type MarketMove = "all" | "up" | "down" | "flat" | "noquote";
type MarketSort = { key: MarketSortKey; direction: SortDirection };
type RadarSortKey = "latest" | "dailyChangePercent" | "change";
type RadarSort = { key: RadarSortKey | null; direction: SortDirection };
type RadarFilter = "all" | "setup" | "hold" | "warning" | "exit";
type MarketRow = {
  code: string; name: string; fullName: string; industry: string; latest: number | null;
  listedDate?: string; quoteDate?: string;
  previousAverage: number | null; lastWeekAverage?: number | null; lastWeekClose?: number | null; average: number | null; bid: number | null; ask: number | null;
  high: number | null; low: number | null; volume: number; turnover: number; change: number | null;
  previousClose?: number | null; previousCloseDate?: string; dailyChange?: number | null; dailyChangePercent?: number | null;
  qualified: boolean; lowLiquidity: boolean; suspended: boolean; website: string;
  priceTime?: string; priceSource?: string; priceError?: string; priceNote?: string; lastWeekAverageDate?: string; lastWeekCloseDate?: string;
};
type MarketPayload = {
  generatedAt: string; quoteDate: string; quoteTime: string; stale: boolean;
  source?: "openapi" | "csv" | "legacy" | "snapshot";
  rows: MarketRow[]; summary: Record<string, number>; error?: string;
};
type RadarRow = {
  signal: string; stage: string; code: string; name: string; market: string; status: string;
  submitDays: number | string; mainExit: string; exitDate: string; exitDays: number | string;
  listingDate: string; auctionNext: string; currentPrice: string; currentAverage?: string; lastWeekAverage?: string; lastWeekClose: string;
  weeklyChange: number | string; triggerStatus: string; priceRef: string; premium: number | string;
  provisionalPrice: string; actualPrice: string; pricingStatus: string;
  premiumStatus: string; reason: string; note: string; chartUrl: string;
};
type IpoStageKey = "submitted" | "review" | "board" | "contract" | "auction";
type IpoStageItem = {
  code: string; name: string; market: string; status: string;
  submitDate?: string; reviewDate?: string; boardDate?: string; approvalDate?: string; listingDate?: string;
  provisionalPrice?: number | string; actualPrice?: number | string; pricingStatus?: string;
  auction?: { bidStart?: string; bidEnd?: string; openDate?: string; actualPrice?: number } | null;
};
type TrackerPayload = {
  generatedAt: string; baseFriday: string; counts: Record<string, number>;
  radar: RadarRow[]; alerts: RadarRow[]; categories: Partial<Record<IpoStageKey, IpoStageItem[]>>;
  error?: string;
};
type CompanyProfile = {
  code: string; name: string; fullName: string; industry: string; subindustry: string;
  mainBusiness: string; concepts: string[]; website: string; chairman: string;
  capital: number; listedDate: string; sourceUrl: string; chartUrl: string; checkedAt: string;
  news: Array<{ title: string; url: string; date: string; source: string }>;
  error?: string;
};

type TpexCompanyDetail = {
  mainBusiness: string; website: string; fullName: string; chairman: string;
  capital: number; industry: string; listedDate: string;
};

declare global {
  interface Window { getCompanyBasic?: (data: Record<string, string>) => void; }
}

const EMPTY_MARKET: MarketPayload = { generatedAt: "", quoteDate: "", quoteTime: "", stale: false, rows: [], summary: {} };
const EMPTY_TRACKER: TrackerPayload = { generatedAt: "", baseFriday: "", counts: {}, radar: [], alerts: [], categories: {} };
const NAV_ITEMS: Array<{ id: Tab; path: string; label: string; short: string; description: string }> = [
  { id: "market", path: "/market", label: "興櫃市場", short: "市場", description: "行情排行與流動性" },
  { id: "radar", path: "/radar", label: "進度雷達", short: "雷達", description: "公開事件、階段與時程" },
  { id: "ipo", path: "/ipo", label: "IPO 時程", short: "時程", description: "審議、競拍與買賣日" },
];
const IPO_STAGES: Array<{ label: string; key: IpoStageKey; sub: string }> = [
  { label: "送件待審", key: "submitted", sub: "等待審議" },
  { label: "審議後", key: "review", sub: "等待董事會" },
  { label: "董事會後", key: "board", sub: "等待同意契約" },
  { label: "同意契約後", key: "contract", sub: "等待買賣日期" },
  { label: "競拍／買賣日", key: "auction", sub: "明確交易時程" },
];

export default function Dashboard({ initialTab = "market" }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [market, setMarket] = useState<MarketPayload>(EMPTY_MARKET);
  const [tracker, setTracker] = useState<TrackerPayload>(EMPTY_TRACKER);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("全部產業");
  const [board, setBoard] = useState<"main" | "low">("main");
  const [limit, setLimit] = useState<50 | 9999>(50);
  const [marketSort, setMarketSort] = useState<MarketSort>({ key: "dailyChangePercent", direction: "desc" });
  const [marketMove, setMarketMove] = useState<MarketMove>("all");
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileRefreshing, setProfileRefreshing] = useState(false);
  const [selectedCode, setSelectedCode] = useState("");
  const profileCache = useRef(new Map<string, CompanyProfile>());
  const marketRowsRef = useRef<MarketRow[]>([]);
  const trackerRefreshingRef = useRef(false);
  const trackerRefreshAtRef = useRef(0);
  const [quoteProgress, setQuoteProgress] = useState({ updating: false, done: 0, total: 0, success: 0, errors: 0 });

  const loadMarket = useCallback(async () => {
    setLoading(true);
    setQuoteProgress(current => ({ ...current, updating: true }));
    try {
      const response = await fetch("/data/market.json", { cache: "no-store" });
      const json = await response.json() as MarketPayload;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (json.error) throw new Error(json.error);
      const success = json.rows.filter(row => row.latest !== null).length;
      setMarket(json);
      setQuoteProgress({ updating: false, done: json.rows.length, total: json.rows.length, success, errors: json.rows.length - success });
      setError("");
    } catch (err) {
      setQuoteProgress(current => ({ ...current, updating: false }));
      setError(`行情更新失敗：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTracker = useCallback(async () => {
    if (trackerRefreshingRef.current) return;
    trackerRefreshingRef.current = true;
    trackerRefreshAtRef.current = Date.now();
    try {
      const response = await fetch("/data/tracker.json", { cache: "no-store" });
      const json = await response.json() as TrackerPayload;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (json.error) throw new Error(json.error);
      setTracker(json);
    } catch (err) {
      setError(current => current || `事件資料更新失敗：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      trackerRefreshingRef.current = false;
    }
  }, []);

  const openProfile = useCallback(async (code: string) => {
    const marketRow = marketRowsRef.current.find(row => row.code === code);
    const cachedProfile = profileCache.current.get(code);
    const immediateProfile: CompanyProfile = cachedProfile || {
      code,
      name: marketRow?.name || code,
      fullName: marketRow?.fullName || marketRow?.name || "",
      industry: marketRow?.industry || "",
      subindustry: "",
      mainBusiness: "",
      concepts: [],
      website: marketRow?.website || "",
      chairman: "",
      capital: 0,
      listedDate: "",
      sourceUrl: `https://ic.tpex.org.tw/company_basic.php?stk_code=${code}`,
      chartUrl: `https://tw.stock.yahoo.com/quote/${code}.TWO/technical-analysis`,
      checkedAt: "",
      news: []
    };
    setSelectedCode(code);
    setProfileLoading(!cachedProfile);
    setProfileRefreshing(true);
    setProfile(immediateProfile);
    const url = new URL(window.location.href);
    url.searchParams.set("company", code);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);

    try {
      const detail = await loadTpexCompanyDetail(code);
      const verifiedProfile = mergeOfficialCompanyDetail({ ...immediateProfile, checkedAt: new Date().toISOString() }, detail);
      profileCache.current.set(code, verifiedProfile);
      if (new URL(window.location.href).searchParams.get("company") === code) setProfile(verifiedProfile);
    } catch (err) {
      if (!cachedProfile && new URL(window.location.href).searchParams.get("company") === code) {
        setProfile(current => current ? { ...current, error: err instanceof Error ? err.message : String(err) } : immediateProfile);
      }
    } finally {
      setProfileLoading(false);
      if (new URL(window.location.href).searchParams.get("company") === code) setProfileRefreshing(false);
    }
  }, []);

  const closeProfile = useCallback(() => {
    setSelectedCode("");
    setProfile(null);
    setProfileLoading(false);
    setProfileRefreshing(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("company");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  useEffect(() => {
    marketRowsRef.current = market.rows;
  }, [market.rows]);

  useEffect(() => {
    const tabFromLocation = () => {
      const pathname = window.location.pathname.replace(/\/$/, "") || "/";
      const routeTab = NAV_ITEMS.find(item => item.path === pathname)?.id;
      const legacyHash = window.location.hash.replace("#", "") as Tab;
      return routeTab || (NAV_ITEMS.some(item => item.id === legacyHash) ? legacyHash : initialTab);
    };
    const initialLocationTab = tabFromLocation();
    setTab(initialLocationTab);
    if (window.location.hash) {
      const destination = NAV_ITEMS.find(item => item.id === initialLocationTab)?.path || "/market";
      window.history.replaceState(null, "", `${destination}${window.location.search}`);
    }
    const onPopState = () => setTab(tabFromLocation());
    window.addEventListener("popstate", onPopState);
    void loadMarket();
    void loadTracker();
    const sharedCompany = new URLSearchParams(window.location.search).get("company") || "";
    if (/^\d{4}$/.test(sharedCompany)) void openProfile(sharedCompany);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [initialTab, loadMarket, loadTracker, openProfile]);

  useEffect(() => {
    const refreshWhenVisible = (minimumAge: number) => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - trackerRefreshAtRef.current < minimumAge) return;
      void loadTracker();
    };
    const onFocus = () => refreshWhenVisible(60_000);
    const onVisibilityChange = () => refreshWhenVisible(60_000);
    const timer = window.setInterval(() => refreshWhenVisible(15 * 60 * 1000), 60_000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [loadTracker]);

  useEffect(() => {
    if (!selectedCode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeProfile();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedCode, closeProfile]);

  const industries = useMemo(() => ["全部產業", ...Array.from(new Set(market.rows.map(x => x.industry))).sort((a, b) => a.localeCompare(b, "zh-Hant"))], [market.rows]);
  const scopedRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return market.rows
      .filter(x => board === "main" ? x.qualified : x.lowLiquidity)
      .filter(x => industry === "全部產業" || x.industry === industry)
      .filter(x => !keyword || `${x.code} ${x.name} ${x.fullName} ${x.industry}`.toLowerCase().includes(keyword));
  }, [market.rows, board, industry, search]);
  const moveCounts = useMemo(() => ({
    all: scopedRows.length,
    up: scopedRows.filter(row => row.dailyChangePercent !== null && row.dailyChangePercent !== undefined && row.dailyChangePercent > 0).length,
    down: scopedRows.filter(row => row.dailyChangePercent !== null && row.dailyChangePercent !== undefined && row.dailyChangePercent < 0).length,
    flat: scopedRows.filter(row => row.dailyChangePercent === 0).length,
    noquote: scopedRows.filter(row => row.latest === null).length,
  }), [scopedRows]);
  const filteredRows = useMemo(() => scopedRows.filter(row => matchesMarketMove(row, marketMove)), [scopedRows, marketMove]);
  const visibleRows = useMemo(() => [...filteredRows]
    .sort((a, b) => compareMarketRows(a, b, marketSort))
    .slice(0, limit), [filteredRows, marketSort, limit]);

  const selectedMarket = useMemo(() => market.rows.find(row => row.code === selectedCode) || null, [market.rows, selectedCode]);
  const activeNav = NAV_ITEMS.find(item => item.id === tab) || NAV_ITEMS[0];

  function navigate(next: Tab) {
    setTab(next);
    const destination = NAV_ITEMS.find(item => item.id === next)?.path || "/market";
    window.history.pushState(null, "", `${destination}${window.location.search}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const lastUpdated = market.generatedAt || tracker.generatedAt || "載入中";
  return (
    <main className="app-shell">
      <aside className="side-rail">
        <div className="brand-block">
          <div><strong>興櫃雷達觀測站</strong><span>Taiwan Emerging Stock Data</span></div>
        </div>
        <nav className="side-nav" aria-label="主要頁面">
          {NAV_ITEMS.map(item => (
            <Link key={item.id} href={item.path} className={tab === item.id ? "active" : ""} onClick={(event) => { event.preventDefault(); navigate(item.id); }}>
              <span><b>{item.label}</b><small>{item.description}</small></span>
            </Link>
          ))}
        </nav>
        <div className="rail-status">
          <div className="rail-status-line"><span className={`live-dot ${quoteProgress.updating || market.stale ? "stale" : ""}`} /><b>{quoteProgress.updating ? "資料讀取中" : `盤後行情 ${quoteProgress.success}/${quoteProgress.total}`}</b></div>
          <span>{market.quoteDate || "讀取中"} {market.quoteTime || ""}</span>
          <small>行情 · TWSE · TPEx</small>
        </div>
      </aside>

      <div className="workspace">
        <header className="command-bar">
          <div className="mobile-brand"><strong>興櫃雷達觀測站</strong></div>
          <div className="breadcrumb"><span>台灣資本市場</span><b>{activeNav.label}</b></div>
          <div className="command-actions">
            <div className="quote-clock"><span>資料更新</span><b>{lastUpdated}</b></div>
            <button className="icon-action" disabled={quoteProgress.updating} onClick={() => void Promise.all([loadMarket(), loadTracker()])} aria-label="重新讀取" title="重新讀取">↻</button>
          </div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div><span className="page-kicker">EMERGING STOCKS</span><h1>{activeNav.label}</h1><p>{activeNav.description}</p></div>
            <div className={`market-state ${quoteProgress.updating || market.stale ? "stale" : ""}`}><span className="live-dot" />{quoteProgress.updating ? "資料讀取中" : `盤後行情 · ${quoteProgress.errors} 檔無報價`}</div>
          </div>

          <aside className="fraud-strip" aria-label="防詐騙提醒">
            <b>防詐騙提醒</b>
            <p>本站不經營 LINE、Telegram、Discord 等投資群組，不會主動私訊招攬、收費代操、提供明牌、保證獲利，或要求匯款及提供帳密、驗證碼。遇冒名請勿回應或付款，並撥 165 查證。</p>
            <Link href="/disclaimer#fraud-alert-title">完整說明</Link>
          </aside>

          {error && <div className="notice error"><span className="status-dot" />{error}</div>}
          {tab === "market" && <MarketView market={market} rows={visibleRows} totalRows={filteredRows.length} loading={loading} quoteProgress={quoteProgress} search={search} setSearch={setSearch} industry={industry} setIndustry={setIndustry} industries={industries} board={board} setBoard={setBoard} limit={limit} setLimit={setLimit} move={marketMove} setMove={setMarketMove} moveCounts={moveCounts} sort={marketSort} setSort={setMarketSort} refresh={() => void loadMarket()} openProfile={openProfile} />}
          {tab === "radar" && <RadarView tracker={tracker} marketRows={market.rows} openProfile={openProfile} />}
          {tab === "ipo" && <IpoView tracker={tracker} openProfile={openProfile} />}
          <footer className="site-footer" id="disclaimer">
            <div className="footer-warning"><b>重要聲明</b><p>本站為獨立維護之公開資料整理網站，與資料來源、所列公司及第三方服務無隸屬、代理或背書關係。內容僅供資訊查閱與一般研究參考，不構成投資建議；重要資訊請以原始公告為準。</p></div>
            <div className="footer-meta"><span>資料來源：臺灣證券交易所、證券櫃檯買賣中心、公開資訊觀測站及其他公開或第三方行情資訊；詳細來源與限制請見資料方法。</span><nav aria-label="網站資訊"><Link href="/market">首頁</Link><Link href="/about">關於本站</Link><Link href="/methodology">資料方法</Link><Link href="/disclaimer">免責聲明</Link><Link href="/privacy">隱私權政策</Link></nav></div>
            <small>行情、時程與公司資料可能因來源更新、延遲或修正而變動；低量股票的單筆成交亦可能放大漲跌幅。</small>
          </footer>
        </div>
      </div>

      <nav className="mobile-nav" aria-label="手機版主要頁面">
        {NAV_ITEMS.map(item => <Link key={item.id} href={item.path} className={tab === item.id ? "active" : ""} onClick={(event) => { event.preventDefault(); navigate(item.id); }}><span>{item.short}</span></Link>)}
      </nav>

      {(profileLoading || profile) && <CompanyDrawer profile={profile} marketRow={selectedMarket} loading={profileLoading} refreshing={profileRefreshing} onClose={closeProfile} />}
    </main>
  );
}

function MarketView(props: {
  market: MarketPayload; rows: MarketRow[]; totalRows: number; loading: boolean; search: string; setSearch: (v: string) => void;
  quoteProgress: { updating: boolean; done: number; total: number; success: number; errors: number };
  industry: string; setIndustry: (v: string) => void; industries: string[]; board: "main" | "low";
  setBoard: (v: "main" | "low") => void; limit: 50 | 9999; setLimit: (v: 50 | 9999) => void;
  move: MarketMove; setMove: (v: MarketMove) => void; moveCounts: Record<MarketMove, number>;
  sort: MarketSort; setSort: (v: MarketSort) => void;
  refresh: () => void; openProfile: (code: string) => void;
}) {
  const s = props.market.summary;
  const priced = props.market.rows.filter(row => row.qualified && row.dailyChangePercent !== null && row.dailyChangePercent !== undefined);
  const gainers = [...priced].sort((a, b) => Number(b.dailyChangePercent) - Number(a.dailyChangePercent)).slice(0, 3);
  const decliners = [...priced].sort((a, b) => Number(a.dailyChangePercent) - Number(b.dailyChangePercent)).slice(0, 3);
  const active = [...props.market.rows].filter(row => row.qualified).sort((a, b) => b.volume - a.volume).slice(0, 3);
  const basisDate = props.market.rows.map(row => row.lastWeekAverageDate).find(Boolean) || "待行情更新";
  const sortLabel = ({ dailyChangePercent: "幅度", change: "週漲跌幅", latest: "最後成交價", volume: "成交量", turnover: "推估成交額" } as const)[props.sort.key];
  const toggleSort = (key: MarketSortKey) => props.setSort({ key, direction: props.sort.key === key && props.sort.direction === "desc" ? "asc" : "desc" });
  const moveOptions: Array<[MarketMove, string]> = [["all", "全部"], ["up", "上漲"], ["down", "下跌"], ["flat", "平盤"], ["noquote", "無報價"]];
  return <>
    <section className="market-overview">
      <div className="snapshot-copy"><span>MARKET PULSE</span><h2>興櫃盤面</h2><p>日漲跌以當日加權平均成交價相較前一交易日加權均價計算；週漲跌另列供觀察，低流動性標的獨立分榜。首日交易無前一交易日均價者不納入幅度排行。</p></div>
      <div className="summary-grid">
        <Metric label="興櫃公司" value={formatInt(s.count)} sub="公開名單家數" />
        <Metric label="有效樣本" value={formatInt(s.qualified)} sub="10張且50萬元以上" />
        <Metric label="上漲／下跌" value={`${formatInt(s.rising)} / ${formatInt(s.falling)}`} sub="相較前一交易日加權均價" className="split" />
        <Metric label="推估成交額" value={formatMoney(s.turnover)} sub="依櫃買成交資料估算" />
      </div>
      <div className="market-movers">
        <MoverLane label="漲幅排行" rows={gainers} value={row => percent(row.dailyChangePercent)} tone="up" openProfile={props.openProfile} />
        <MoverLane label="跌幅排行" rows={decliners} value={row => percent(row.dailyChangePercent)} tone="down" openProfile={props.openProfile} />
        <MoverLane label="成交量排行" rows={active} value={row => formatShares(row.volume)} tone="flat" openProfile={props.openProfile} />
      </div>
    </section>

    <section className="data-surface">
      <div className="surface-title"><div><span>STOCK SCREENER</span><h2>{props.board === "main" ? "興櫃市場排行" : "低量異動觀察"}</h2></div><div className="result-count">顯示 <b>{props.rows.length}</b> / {props.totalRows} 檔 · {sortLabel} <b>{props.sort.direction === "desc" ? "高到低" : "低到高"}</b></div></div>
      <div className="quote-source-bar">
        <div><span>行情時間</span><b>{props.market.quoteDate ? `${props.market.quoteDate} ${props.market.quoteTime}` : "更新中"}</b></div>
        <div><span>上週基準</span><b>{basisDate}</b></div>
        <div className={props.quoteProgress.errors ? "source-warning" : ""}><span>報價完整度</span><b>{props.quoteProgress.success}/{props.quoteProgress.total} · {props.quoteProgress.errors} 檔無報價</b></div>
      </div>
      <div className="filter-bar">
        <label className="search-field"><span>搜尋</span><input aria-label="搜尋公司" value={props.search} onChange={e => props.setSearch(e.target.value)} placeholder="代號、公司或產業" /></label>
        <label><span>產業</span><select aria-label="產業篩選" value={props.industry} onChange={e => props.setIndustry(e.target.value)}>{props.industries.map(x => <option key={x}>{x}</option>)}</select></label>
        <label><span>資料區</span><select aria-label="資料區類型" value={props.board} onChange={e => props.setBoard(e.target.value as "main" | "low")}><option value="main">流動性門檻內</option><option value="low">低量異動</option></select></label>
        <div className="filter-spacer" />
        <div className="segmented" aria-label="顯示筆數">
          {([[50, "前 50 筆"], [9999, "全部"]] as const).map(([value, label]) => <button key={value} className={props.limit === value ? "active" : ""} onClick={() => props.setLimit(value)}>{label}</button>)}
        </div>
        <button className="refresh-button" disabled={props.quoteProgress.updating} onClick={props.refresh}>{props.quoteProgress.updating ? `更新中 ${props.quoteProgress.done}/${props.quoteProgress.total}` : "更新"}</button>
      </div>
      <div className="quick-filter-bar"><span>漲跌狀態</span><div>{moveOptions.map(([value, label]) => <button key={value} className={props.move === value ? "active" : ""} onClick={() => props.setMove(value)}>{label}<b>{props.moveCounts[value]}</b></button>)}</div></div>
      <div className="table-wrap market-table-wrap">
        <table className="data-table market-table">
          <thead><tr><th>排名</th><th>代號／公司</th><th>產業</th><SortHeader label="最後成交價" sortKey="latest" sort={props.sort} onSort={toggleSort} /><th className="num">漲跌</th><SortHeader label="幅度" sortKey="dailyChangePercent" sort={props.sort} onSort={toggleSort} /><th className="num">上週基準均價</th><SortHeader label="週漲跌幅" sortKey="change" sort={props.sort} onSort={toggleSort} /><th className="num mobile-hide">買價</th><th className="num mobile-hide">賣價</th><SortHeader label="成交量" sortKey="volume" sort={props.sort} onSort={toggleSort} className="mobile-hide" /><SortHeader label="推估成交額" sortKey="turnover" sort={props.sort} onSort={toggleSort} /><th className="mobile-hide">狀態</th></tr></thead>
          <tbody>{props.rows.map((row, index) => <MarketTableRow key={row.code} row={row} rank={index + 1} onOpen={() => props.openProfile(row.code)} />)}</tbody>
        </table>
        {!props.rows.length && <div className="empty">{props.loading ? "正在讀取報價資料" : "目前篩選條件沒有資料"}</div>}
      </div>
    </section>
  </>;
}

function MoverLane({ label, rows, value, tone, openProfile }: { label: string; rows: MarketRow[]; value: (row: MarketRow) => string; tone: "up" | "down" | "flat"; openProfile: (code: string) => void }) {
  return <div className="mover-lane"><div className="mover-title"><span>{label}</span><small>依公開數值排序</small></div>{rows.map((row, index) => <button key={row.code} onClick={() => openProfile(row.code)}><i>{index + 1}</i><span><b>{row.name}</b><small>{row.code}</small></span><strong className={tone}>{value(row)}</strong></button>)}</div>;
}

function SortHeader({ label, sortKey, sort, onSort, className = "" }: { label: string; sortKey: MarketSortKey; sort: MarketSort; onSort: (key: MarketSortKey) => void; className?: string }) {
  const active = sort.key === sortKey;
  const ariaSort = active ? sort.direction === "desc" ? "descending" : "ascending" : "none";
  return <th className={`num sortable-header ${className}`} aria-sort={ariaSort}><button className="sort-button" onClick={() => onSort(sortKey)} title={active ? `目前由${sort.direction === "desc" ? "高到低" : "低到高"}，點擊切換` : `依${label}排序`}>{label}<span aria-hidden="true">{active ? sort.direction === "desc" ? "↓" : "↑" : "↕"}</span></button></th>;
}

function MarketTableRow({ row, rank, onOpen }: { row: MarketRow; rank: number; onOpen: () => void }) {
  const dailyDirection = changeClass(Number(row.dailyChangePercent));
  const weeklyDirection = changeClass(Number(row.change));
  const firstTradingDay = Boolean(row.listedDate && row.priceTime?.startsWith(row.listedDate));
  return <tr className={rank <= 10 ? "top-ten" : ""}>
    <td className="rank"><span>{rank}</span></td>
    <td><button className="company-button" onClick={onOpen}>{row.name}</button><span className="subtext">{row.code}</span></td>
    <td><span className="tag">{row.industry}</span></td>
    <td className="num price-cell">{price(row.latest)}<span className="subtext">{row.latest === null ? "無報價" : row.priceTime?.slice(11, 16) || "--"}</span></td>
    <td className={`num change-amount ${dailyDirection}`}>{signedPrice(row.dailyChange)}</td>
    <td className={`change ${dailyDirection}`}>{firstTradingDay ? <span className="muted-text" title="首日交易沒有前一交易日加權均價，不納入幅度排序">首日</span> : <><b>{percent(row.dailyChangePercent)}</b><span className="change-track"><i style={{ width: `${Math.min(100, Math.abs(row.dailyChangePercent || 0) * 500)}%` }} /></span></>}</td>
    <td className="num">{row.lastWeekAverage === null || row.lastWeekAverage === undefined ? <span className="muted-text" title={row.priceNote || "上週無有效加權均價"}>無基準</span> : price(row.lastWeekAverage)}</td>
    <td className={`change ${weeklyDirection}`}>{row.change === null ? <span className="muted-text" title={row.priceNote || "上週無有效成交"}>無基準</span> : <><b>{percent(row.change)}</b><span className="change-track"><i style={{ width: `${Math.min(100, Math.abs(row.change) * 500)}%` }} /></span></>}</td>
    <td className="num mobile-hide">{price(row.bid)}</td><td className="num mobile-hide">{price(row.ask)}</td>
    <td className="num mobile-hide">{formatShares(row.volume)}</td><td className="num">{formatMoney(row.turnover)}</td>
    <td className="mobile-hide">{row.priceError ? <span className="status-chip warning">無報價</span> : row.suspended ? <span className="status-chip warning">暫停交易</span> : firstTradingDay ? <span className="status-chip normal">首日交易</span> : row.lowLiquidity ? <span className="status-chip low">低量</span> : <span className="status-chip normal">正常</span>}</td>
  </tr>;
}

function compareMarketRows(a: MarketRow, b: MarketRow, sort: MarketSort): number {
  const aValue = (sort.key === "dailyChangePercent" ? a.dailyChangePercent : sort.key === "change" ? a.change : sort.key === "latest" ? a.latest : sort.key === "volume" ? a.volume : a.turnover) ?? null;
  const bValue = (sort.key === "dailyChangePercent" ? b.dailyChangePercent : sort.key === "change" ? b.change : sort.key === "latest" ? b.latest : sort.key === "volume" ? b.volume : b.turnover) ?? null;
  if (aValue === null && bValue === null) return a.code.localeCompare(b.code);
  if (aValue === null) return 1;
  if (bValue === null) return -1;
  const order = sort.direction === "desc" ? bValue - aValue : aValue - bValue;
  return order || b.turnover - a.turnover || a.code.localeCompare(b.code);
}

function matchesMarketMove(row: MarketRow, move: MarketMove): boolean {
  if (move === "up") return row.dailyChangePercent !== null && row.dailyChangePercent !== undefined && row.dailyChangePercent > 0;
  if (move === "down") return row.dailyChangePercent !== null && row.dailyChangePercent !== undefined && row.dailyChangePercent < 0;
  if (move === "flat") return row.dailyChangePercent === 0;
  if (move === "noquote") return row.latest === null;
  return true;
}

function RadarView({ tracker, marketRows, openProfile }: { tracker: TrackerPayload; marketRows: MarketRow[]; openProfile: (code: string) => void }) {
  const [filter, setFilter] = useState<RadarFilter>("all");
  const [sort, setSort] = useState<RadarSort>({ key: null, direction: "desc" });
  const exitCount = tracker.radar.filter(row => /近期事件|已定價/.test(row.signal)).length;
  const alertCount = tracker.radar.filter(row => /契約後|時程接近|定價待確認/.test(row.signal)).length;
  const setupCount = tracker.radar.filter(row => /近期送件|審議進程|資料觀察/.test(row.signal)).length;
  const priority = [...tracker.radar].sort((a, b) => radarPriorityScore(a) - radarPriorityScore(b) || radarEventDays(a) - radarEventDays(b) || a.code.localeCompare(b.code)).slice(0, 5);
  const filterOptions: Array<[RadarFilter, string]> = [["all", "全部"], ["setup", "資料觀察"], ["hold", "審議進程"], ["warning", "契約／時程"], ["exit", "定價／掛牌"]];
  const filteredRows = tracker.radar.filter(row => matchesRadarFilter(row, filter));
  const marketByCode = new Map(marketRows.map(row => [row.code, row]));
  const displayRows = filteredRows.map(row => ({ row, quote: marketByCode.get(row.code) }));
  if (sort.key) displayRows.sort((a, b) => compareRadarRows(a, b, sort));
  const toggleSort = (key: RadarSortKey) => setSort(current => ({ key, direction: current.key === key && current.direction === "desc" ? "asc" : "desc" }));
  return <>
    <section className="radar-banner">
      <div className="radar-copy"><span>EVENT MONITOR</span><h2>從送件到掛牌的事件雷達</h2><p>依公開日期與進度分類，僅供資料整理，不代表公司評價、報酬預測或操作方向。</p></div>
      <div className="radar-counts"><div><span>送件／審議進程</span><b>{setupCount}</b></div><div><span>契約／時程接近</span><b>{alertCount}</b></div><div className="exit"><span>定價／近期事件</span><b>{exitCount}</b></div></div>
      <div className="baseline"><span>上週比較基準</span><b>{tracker.baseFriday || "讀取中"}</b></div>
    </section>
    <section className="priority-surface">
      <div className="surface-title"><div><span>UPCOMING EVENTS</span><h2>近期事件</h2></div><div className="result-count">依公開事件日排序</div></div>
      <div className="priority-grid">{priority.map(row => <button key={row.code} onClick={() => openProfile(row.code)}><span className={`signal-chip ${signalClass(row.signal)}`}>{row.signal}</span><b>{row.name}</b><small>{row.code} · {row.market}</small><strong>{[row.mainExit, row.exitDate].filter(Boolean).join(" ") || row.status}</strong><i>{row.exitDate ? formatEventDays(row.exitDays) : row.stage}</i></button>)}</div>
      {!priority.length && <div className="empty compact">正在整理近期事件</div>}
    </section>
    <section className="signal-legend" aria-label="公開事件階段圖例">
      <div className="observe"><b>A</b><span>送件觀察<small>已送件、等待審議</small></span></div>
      <div className="hold"><b>B</b><span>審議進程<small>審議會或董事會後</small></span></div>
      <div className="warning"><b>C</b><span>契約後<small>等待後續公開時程</small></span></div>
      <div className="exit"><b>D</b><span>定價／掛牌進程<small>競拍、定價或買賣日</small></span></div>
    </section>
    <section className="data-surface">
      <div className="surface-title"><div><span>EVENT CLASSIFICATION</span><h2>事件觀察清單</h2></div><div className="result-count">顯示 <b>{filteredRows.length}</b> / {tracker.radar.length} 家</div></div>
      <div className="radar-filter-bar">{filterOptions.map(([value, label]) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>)}</div>
      <div className="table-wrap radar-table-wrap"><table className="data-table radar-table"><thead><tr><th>事件標籤／階段</th><th>代號／公司</th><th>目前進度</th><th>主要事件／距離</th><th>定價狀態</th><RadarSortHeader label="最後成交價" sortKey="latest" sort={sort} onSort={toggleSort} /><th className="num">漲跌</th><RadarSortHeader label="幅度" sortKey="dailyChangePercent" sort={sort} onSort={toggleSort} /><RadarSortHeader label="週漲跌幅" sortKey="change" sort={sort} onSort={toggleSort} /><th>波動／價差</th><th>分類依據</th></tr></thead>
        <tbody>{displayRows.map(({ row, quote }) => {
          const current = quote?.latest ?? numericValue(row.currentPrice);
          const dailyChange = quote?.dailyChange ?? null;
          const dailyChangePercent = quote?.dailyChangePercent ?? null;
          const weeklyChange = quote?.change ?? numericValue(row.weeklyChange);
          const dailyDirection = changeClass(Number(dailyChangePercent));
          const weeklyDirection = changeClass(Number(weeklyChange));
          const event = [row.mainExit, row.exitDate].filter(Boolean).join(" ") || "-";
          return <tr key={row.code}><td><span className={`signal-chip ${signalClass(row.signal)}`}>{row.signal}</span><span className="subtext">{row.stage}</span></td><td><button className="company-button" onClick={() => openProfile(row.code)}>{row.name}</button><span className="subtext">{row.code} · {row.market}</span></td><td>{row.status}</td><td><b>{event}</b>{row.exitDate && <span className="subtext">{formatEventDays(row.exitDays)}</span>}</td><td><span className={`pricing-chip ${pricingClass(row.pricingStatus)}`}>{row.pricingStatus || "待公告"}</span><span className="subtext">{pricingDetail(row)}</span></td><td className="num price-cell">{price(current)}<span className="subtext">{quote?.priceTime?.slice(11, 16) || "無報價"}</span></td><td className={`num change-amount ${dailyDirection}`}>{signedPrice(dailyChange)}</td><td className={`change ${dailyDirection}`}><b>{percent(dailyChangePercent)}</b></td><td className={`change ${weeklyDirection}`}><b>{percent(weeklyChange)}</b></td><td><b>{row.triggerStatus || "-"}</b><span className="subtext">{row.premiumStatus || "-"}</span></td><td className="reason-cell">{row.reason}</td></tr>;
        })}</tbody>
      </table>{!filteredRows.length && <div className="empty">目前篩選條件沒有事件資料</div>}</div>
    </section>
  </>;
}

function RadarSortHeader({ label, sortKey, sort, onSort }: { label: string; sortKey: RadarSortKey; sort: RadarSort; onSort: (key: RadarSortKey) => void }) {
  const active = sort.key === sortKey;
  const ariaSort = active ? sort.direction === "desc" ? "descending" : "ascending" : "none";
  return <th className="num sortable-header" aria-sort={ariaSort}><button className="sort-button" onClick={() => onSort(sortKey)} title={`${label}排序`}>{label}<span aria-hidden="true">{active ? sort.direction === "desc" ? "↓" : "↑" : "↕"}</span></button></th>;
}

function compareRadarRows(a: { row: RadarRow; quote?: MarketRow }, b: { row: RadarRow; quote?: MarketRow }, sort: RadarSort): number {
  if (!sort.key) return 0;
  const value = (item: { row: RadarRow; quote?: MarketRow }) => sort.key === "latest"
    ? item.quote?.latest ?? numericValue(item.row.currentPrice)
    : sort.key === "dailyChangePercent"
      ? item.quote?.dailyChangePercent ?? null
      : item.quote?.change ?? numericValue(item.row.weeklyChange);
  const aValue = value(a);
  const bValue = value(b);
  if (aValue === null && bValue === null) return a.row.code.localeCompare(b.row.code);
  if (aValue === null) return 1;
  if (bValue === null) return -1;
  const order = sort.direction === "desc" ? bValue - aValue : aValue - bValue;
  return order || a.row.code.localeCompare(b.row.code);
}

function radarPriorityScore(row: RadarRow): number {
  if (row.signal === "已定價") return 0;
  if (/近期事件/.test(row.signal)) return 1;
  if (/時程接近|定價待確認/.test(row.signal)) return 2;
  if (/契約後/.test(row.signal)) return 3;
  if (/審議進程/.test(row.signal)) return 4;
  if (/近期送件/.test(row.signal)) return 5;
  return 6;
}

function radarEventDays(row: RadarRow): number {
  const days = Number(row.exitDays);
  return Number.isFinite(days) && row.exitDays !== "" ? days : 9999;
}

function matchesRadarFilter(row: RadarRow, filter: RadarFilter): boolean {
  if (filter === "setup") return /近期送件|資料觀察|報價待確認/.test(row.signal);
  if (filter === "hold") return /審議進程/.test(row.signal);
  if (filter === "warning") return /契約後|時程接近|定價待確認/.test(row.signal);
  if (filter === "exit") return /近期事件|已定價|已掛牌/.test(row.signal);
  return true;
}

function IpoView({ tracker, openProfile }: { tracker: TrackerPayload; openProfile: (code: string) => void }) {
  const categories = tracker.categories || {};
  const stageTotal = IPO_STAGES.reduce((total, stage) => total + (categories[stage.key]?.length || 0), 0);
  const scheduled = tracker.radar
    .filter(row => row.exitDate || row.listingDate || row.auctionNext)
    .sort((a, b) => Number(a.exitDays || 9999) - Number(b.exitDays || 9999));
  const futureEvents = scheduled.filter(row => radarEventDays(row) >= 0);
  const recentEvents = scheduled.filter(row => radarEventDays(row) < 0 && radarEventDays(row) >= -14).sort((a, b) => radarEventDays(b) - radarEventDays(a));
  return <>
    <section className="ipo-stage-overview">
      <div className="surface-title"><div><span>LISTING PIPELINE</span><h2>IPO時程表</h2></div><div className="result-count">五階段共 <b>{stageTotal}</b> 家</div></div>
      <div className="ipo-stage-board">
        {IPO_STAGES.map((stage, index) => {
          const items = categories[stage.key] || [];
          return <div className={`ipo-stage-column stage-${stage.key}`} key={stage.key}>
            <div className="ipo-stage-head"><span>0{index + 1}</span><div><b>{stage.label}</b><small>{stage.sub}</small></div><strong>{items.length}</strong></div>
            <div className="ipo-company-list">
              {items.map(item => <button className="ipo-company-row" key={item.code} onClick={() => openProfile(item.code)}>
                <span className="ipo-company-line"><b>{item.name}</b><i>{item.market}</i></span>
                <small>{item.code} · {item.status}</small>
                <span className="ipo-stage-facts">{ipoStageFacts(item, stage.key).map(fact => <span key={`${fact.label}-${fact.value}`}><i>{fact.label}</i><b>{fact.value}</b></span>)}</span>
              </button>)}
              {!items.length && <div className="ipo-stage-empty">目前無公司</div>}
            </div>
          </div>;
        })}
      </div>
    </section>
    <section className="upcoming-events">
      <div className="surface-title"><div><span>NEXT EVENTS</span><h2>未來關鍵事件</h2></div><div className="result-count">共 <b>{futureEvents.length}</b> 家 · 依日期排序</div></div>
      <div className="event-strip">{futureEvents.slice(0, 5).map(row => <button key={row.code} onClick={() => openProfile(row.code)}><span className={`event-type ${eventClass(row)}`}>{eventLabel(row)}</span><b>{row.name}</b><small>{row.code} · {row.market}</small><strong>{eventDate(row)}</strong><i>{formatEventDays(row.exitDays)} · {row.pricingStatus || "待公告"}</i></button>)}</div>
      {!futureEvents.length && <div className="empty compact">目前沒有已公告的未來事件</div>}
      {!!recentEvents.length && <div className="recent-events"><span>最近 14 天完成</span><div>{recentEvents.slice(0, 5).map(row => <button key={row.code} onClick={() => openProfile(row.code)}><b>{row.name}</b><small>{eventLabel(row)} · {eventDate(row)} · {formatEventDays(row.exitDays)}</small></button>)}</div></div>}
    </section>
    <section className="data-surface">
      <div className="surface-title"><div><span>PUBLIC SCHEDULE</span><h2>公開事件明細</h2></div><div className="result-count">共 <b>{scheduled.length}</b> 家</div></div>
      <div className="table-wrap ipo-table-wrap"><table className="data-table ipo-table"><thead><tr><th>代號／公司</th><th>市場</th><th>目前階段</th><th>事件類型</th><th>主要事件日</th><th className="num">距今天</th><th>定價狀態</th><th className="num">暫定承銷價</th><th className="num">實際承銷價</th><th>股票上市／上櫃買賣日</th><th>競拍進度</th><th>分類依據</th></tr></thead><tbody>{scheduled.map(row => <tr key={row.code}><td><button className="company-button" onClick={() => openProfile(row.code)}>{row.name}</button><span className="subtext">{row.code}</span></td><td>{row.market}</td><td>{row.status}</td><td><span className={`event-type ${eventClass(row)}`}>{eventLabel(row)}</span></td><td><b>{eventDate(row)}</b></td><td className="num">{formatEventDays(row.exitDays)}</td><td><span className={`pricing-chip ${pricingClass(row.pricingStatus)}`}>{row.pricingStatus || "待公告"}</span></td><td className="num">{row.provisionalPrice || "-"}</td><td className="num"><b>{row.actualPrice || "-"}</b></td><td>{row.listingDate ? <><b>{row.listingDate}</b><span className="subtext">{formatEventDays(daysFromToday(row.listingDate))}</span></> : "-"}</td><td>{row.auctionNext || "-"}</td><td className="reason-cell">{row.reason}</td></tr>)}</tbody></table>{!scheduled.length && <div className="empty">目前沒有可確認的公開事件時程</div>}</div>
    </section>
  </>;
}

function ipoStageFacts(item: IpoStageItem, stage: IpoStageKey): Array<{ label: string; value: string }> {
  if (stage === "submitted") return [{ label: "送件", value: shortIsoDate(item.submitDate) || "待確認" }];
  if (stage === "review") return [{ label: "審議", value: shortIsoDate(item.reviewDate) || "待確認" }];
  if (stage === "board") return [{ label: "董事會", value: shortIsoDate(item.boardDate) || "待確認" }];
  if (stage === "contract") return [{ label: "同意契約", value: shortIsoDate(item.approvalDate) || "待確認" }];

  const facts: Array<{ label: string; value: string }> = [];
  const bidStart = shortIsoDate(item.auction?.bidStart);
  const bidEnd = shortIsoDate(item.auction?.bidEnd);
  const openDate = shortIsoDate(item.auction?.openDate);
  const listingDate = shortIsoDate(item.listingDate);
  if (bidStart || bidEnd) facts.push({ label: "競拍", value: [bidStart, bidEnd].filter(Boolean).join(" - ") });
  if (openDate) facts.push({ label: "開標", value: openDate });
  if (listingDate) facts.push({ label: "買賣日", value: listingDate });
  if (item.actualPrice) facts.push({ label: "實際價", value: price(Number(item.actualPrice)) });
  else if (item.provisionalPrice) facts.push({ label: "暫定價", value: price(Number(item.provisionalPrice)) });
  return facts.length ? facts : [{ label: "時程", value: "待公告" }];
}

function shortIsoDate(value?: string): string {
  const match = String(value || "").match(/^\d{4}-(\d{2})-(\d{2})/);
  return match ? `${match[1]}/${match[2]}` : "";
}

function CompanyDrawer({ profile, marketRow, loading, refreshing, onClose }: { profile: CompanyProfile | null; marketRow: MarketRow | null; loading: boolean; refreshing: boolean; onClose: () => void }) {
  const dailyDirection = changeClass(Number(marketRow?.dailyChangePercent));
  const weeklyDirection = changeClass(Number(marketRow?.change));
  const companyWebsite = profile?.website || marketRow?.website || "";
  return <><div className="drawer-backdrop" onClick={onClose} /><aside className="drawer" aria-label="公司輪廓">
    <div className="drawer-head"><div><span>COMPANY PROFILE</span><h2>{profile ? `${profile.code} ${profile.name}` : marketRow ? `${marketRow.code} ${marketRow.name}` : "公司輪廓"}</h2><p>{profile?.fullName || "正在讀取公開公司名稱"}{refreshing && <small className="profile-refresh-status">補充資料讀取中</small>}</p></div><button className="icon-button" onClick={onClose} aria-label="關閉" title="關閉">×</button></div>
    <div className="drawer-body">
      {marketRow && <section className="quote-panel"><div><span>最後成交價</span><strong>{price(marketRow.latest)}</strong></div><div><span>漲跌</span><b className={dailyDirection}>{signedPrice(marketRow.dailyChange)}</b></div><div><span>幅度</span><b className={dailyDirection}>{percent(marketRow.dailyChangePercent)}</b></div><div><span>上週基準均價</span><b>{price(marketRow.lastWeekAverage)}</b></div><div><span>週漲跌幅</span><b className={weeklyDirection}>{percent(marketRow.change)}</b></div><div><span>報價時間</span><b>{marketRow.priceTime?.slice(5, 16) || "無報價"}</b></div></section>}
      {loading && !profile && <div className="profile-loading"><span /><span /><span /><span /></div>}
      {profile?.error && <div className="notice error"><span className="status-dot" />{profile.error}</div>}
      {profile && <>
        <section className="profile-section"><div className="profile-section-title"><span>01</span><h3>公司概況</h3><small>櫃買中心與公司公開資料</small></div><dl className="profile-grid"><dt>資料來源產業</dt><dd>{profile.industry || "待確認"}</dd><dt>主要產品／業務</dt><dd>{profile.mainBusiness || (refreshing ? "櫃買資料讀取中" : "待確認")}</dd><dt>董事長</dt><dd>{profile.chairman || "待確認"}</dd><dt>實收資本額</dt><dd>{profile.capital ? formatMoney(profile.capital) : "待確認"}</dd><dt>興櫃日期</dt><dd>{profile.listedDate || "待確認"}</dd><dt>資料更新</dt><dd>{profile.checkedAt ? formatTaipeiDateTime(profile.checkedAt) : refreshing ? "更新中" : "待確認"}</dd></dl></section>
        <section className="profile-section"><div className="profile-section-title"><span>02</span><h3>題材與連結</h3><small>題材僅作資料索引，不代表評價或操作方向</small></div><div className="concept-list">{profile.concepts.length ? profile.concepts.map(x => <span className="tag" key={x}>{x}</span>) : <span className="muted-text">題材待確認</span>}</div><div className="actions">{companyWebsite ? <a className="link-button" href={companyWebsite} target="_blank" rel="noopener noreferrer">公司官網 <span>↗</span></a> : <span className="link-unavailable">公開來源未登錄公司官網</span>}<a className="link-button primary" href={profile.chartUrl} target="_blank" rel="noopener noreferrer">技術線圖 <span>↗</span></a><a className="link-button" href={profile.sourceUrl} target="_blank" rel="noopener noreferrer">櫃買中心資料 <span>↗</span></a></div></section>
        <section className="profile-section"><div className="profile-section-title"><span>03</span><h3>近期新聞</h3><small>標題連結至原始報導</small></div><ul className="news-list">{profile.news.map(item => <li key={item.url}><span className="news-source">{item.source}</span><a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a><small>{item.date}</small></li>)}</ul>{!profile.news.length && <div className="empty compact">{refreshing ? "新聞資料讀取中" : "目前沒有可確認的近期公開新聞"}</div>}</section>
      </>}
    </div>
  </aside></>;
}

function formatTaipeiDateTime(value: string): string {
  if (!value) return "本次開啟時查核";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString("zh-TW", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
}

let tpexDetailQueue: Promise<unknown> = Promise.resolve();

function loadTpexCompanyDetail(code: string): Promise<TpexCompanyDetail> {
  const request = tpexDetailQueue.then(() => loadTpexCompanyDetailScript(code));
  tpexDetailQueue = request.catch(() => undefined);
  return request;
}

function loadTpexCompanyDetailScript(code: string): Promise<TpexCompanyDetail> {
  return new Promise((resolve, reject) => {
    const previousCallback = window.getCompanyBasic;
    const script = document.createElement("script");
    const cleanup = () => {
      window.clearTimeout(timeout);
      script.remove();
      if (previousCallback) window.getCompanyBasic = previousCallback;
      else delete window.getCompanyBasic;
    };
    const timeout = window.setTimeout(() => { cleanup(); reject(new Error("櫃買公司資料逾時")); }, 6500);
    window.getCompanyBasic = data => {
      cleanup();
      const chineseBusiness = [data.MAIN_BUSINESS1, data.MAIN_BUSINESS2, data.MAIN_BUSINESS3].map(cleanCompanyText).filter(Boolean);
      resolve({
        mainBusiness: [...new Set(chineseBusiness.length ? chineseBusiness : [cleanCompanyText(data.MAIN_BUSINESS4)])].filter(Boolean).join("；"),
        website: normalizeCompanyWebsite(data.INTERNET_ADDRESS || ""),
        fullName: cleanCompanyText(data.COMPANY_NAME), chairman: cleanCompanyText(data.CHAIRMAN_NAME),
        capital: Number(String(data.CAPITAL_AMT || "").replace(/,/g, "")) || 0,
        industry: cleanCompanyText(data.NAME), listedDate: compactDate(data.LISTING_DATE)
      });
    };
    script.async = true;
    script.onerror = () => { cleanup(); reject(new Error("櫃買公司資料無法載入")); };
    script.src = `https://dsp.tpex.org.tw/storage/company_basic/company_basic.php?s=${encodeURIComponent(code)}&m=20&_=${Date.now()}`;
    document.head.appendChild(script);
  });
}

function mergeOfficialCompanyDetail(profile: CompanyProfile, detail: TpexCompanyDetail): CompanyProfile {
  return {
    ...profile,
    fullName: detail.fullName || profile.fullName,
    industry: detail.industry || profile.industry,
    mainBusiness: detail.mainBusiness || profile.mainBusiness,
    website: detail.website || profile.website,
    chairman: detail.chairman || profile.chairman,
    capital: detail.capital || profile.capital,
    listedDate: detail.listedDate || profile.listedDate,
    concepts: detail.mainBusiness ? conceptLabels(detail.industry || profile.industry, detail.mainBusiness) : profile.concepts
  };
}

function conceptLabels(industry: string, business: string): string[] {
  const source = `${industry} ${business}`;
  const rules: Array<[RegExp, string]> = [
    [/伺服器|資料中心|雲端/i, "伺服器/雲端"], [/連接器|電子零組件/i, "電子零組件"],
    [/半導體|晶圓|封裝|IC設計/i, "半導體"], [/電動車|車用|充電/i, "電動車"],
    [/人工智慧|\bAI\b/i, "AI"], [/機器人|自動化/i, "機器人/自動化"],
    [/生技|醫療|新藥|醫材/i, "生技醫療"], [/儲能|綠能|再生能源/i, "綠能/儲能"]
  ];
  const labels = rules.filter(([pattern]) => pattern.test(source)).map(([, label]) => label);
  if (!labels.length && industry) labels.push(industry);
  return [...new Set(labels)].slice(0, 3);
}

function cleanCompanyText(value: string | undefined): string { return String(value || "").replace(/\s+/g, " ").trim(); }
function normalizeCompanyWebsite(value: string): string { return value ? /^https?:\/\//i.test(value) ? value : `https://${value}` : ""; }
function compactDate(value: string): string { const digits = String(value || "").replace(/\D/g, ""); return /^\d{8}$/.test(digits) ? `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}` : ""; }

function Metric({ label, value, sub, className = "" }: { label: string; value: string; sub: string; className?: string }) {
  return <div className={`metric ${className}`}><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>;
}

function price(value: number | null | undefined) { return value === null || value === undefined || !Number.isFinite(value) ? "-" : value.toLocaleString("zh-TW", { maximumFractionDigits: 2 }); }
function percent(value: number | null | undefined) { if (value === null || value === undefined || !Number.isFinite(value)) return "-"; return `${value > 0 ? "+" : ""}${(value * 100).toFixed(2)}%`; }
function numericValue(value: number | string | null | undefined): number | null { const text = String(value ?? "").replace(/,/g, "").trim(); const n = Number(text); return text && Number.isFinite(n) ? n : null; }
function changeClass(value: number) { return !Number.isFinite(value) || value === 0 ? "flat" : value > 0 ? "up" : "down"; }
function signedPrice(value: number | null | undefined) { if (value === null || value === undefined || !Number.isFinite(value)) return "-"; return `${value > 0 ? "+" : ""}${price(value)}`; }
function signalClass(signal: string) { return /已定價|近期事件|已掛牌/.test(signal) ? "exit" : /契約後|時程接近|定價待確認/.test(signal) ? "warning" : /審議進程/.test(signal) ? "hold" : "observe"; }
function eventLabel(row: RadarRow) { return /競拍|開標|定價/.test(`${row.mainExit} ${row.auctionNext}`) ? "競拍／定價" : row.listingDate ? "股票買賣日" : "階段事件"; }
function eventClass(row: RadarRow) { return /競拍|開標|定價/.test(`${row.mainExit} ${row.auctionNext}`) ? "auction" : row.listingDate ? "listing" : "stage"; }
function eventDate(row: RadarRow) { return row.exitDate || row.listingDate || "日期待定"; }
function pricingClass(value: string) { return value === "已定價" ? "confirmed" : /暫定|待定價/.test(value) ? "pending" : "unknown"; }
function pricingDetail(row: RadarRow) { return row.actualPrice ? `實際 ${row.actualPrice}` : row.provisionalPrice ? `暫定 ${row.provisionalPrice}` : "尚無價格"; }
function daysFromToday(value: string) { const target = new Date(`${value}T00:00:00`); const today = new Date(); today.setHours(0, 0, 0, 0); return Math.round((target.getTime() - today.getTime()) / 86400000); }
function formatEventDays(value: number | string) { const n = Number(value); if (!Number.isFinite(n) || value === "") return "-"; if (n === 0) return "今天"; return n > 0 ? `${n} 天後` : `已過 ${Math.abs(n)} 天`; }
function formatInt(value: number | undefined) { return Number(value || 0).toLocaleString("zh-TW"); }
function formatShares(value: number) { return value >= 1000 ? `${(value / 1000).toLocaleString("zh-TW", { maximumFractionDigits: 1 })}張` : `${value}股`; }
function formatMoney(value: number | undefined) { const n = Number(value || 0); if (n >= 100000000) return `${(n / 100000000).toFixed(2)}億`; if (n >= 10000) return `${(n / 10000).toFixed(1)}萬`; return n.toLocaleString("zh-TW"); }
