const INDUSTRIES = {
  "02": "食品工業", "03": "塑膠工業", "04": "紡織纖維", "05": "電機機械",
  "06": "電器電纜", "08": "玻璃陶瓷", "10": "鋼鐵工業", "11": "橡膠工業",
  "14": "建材營造", "15": "航運業", "16": "觀光餐旅", "17": "金融業",
  "20": "其他", "21": "化學工業", "22": "生技醫療", "23": "油電燃氣",
  "24": "半導體", "25": "電腦及週邊", "26": "光電業", "27": "通信網路",
  "28": "電子零組件", "29": "電子通路", "30": "資訊服務", "31": "其他電子",
  "32": "文化創意", "33": "農業科技", "35": "綠能環保", "36": "數位雲端",
  "37": "運動休閒", "38": "居家生活", "80": "管理股票"
};

export function mergeRecentRegistrations(masterRows, recentRows) {
  const merged = new Map();

  for (const row of masterRows || []) {
    const company = normaliseCompany(row);
    if (company.code) merged.set(company.code, company);
  }
  for (const row of recentRows || []) {
    const company = normaliseCompany(row);
    if (company.code && !merged.has(company.code)) merged.set(company.code, company);
  }

  return [...merged.values()];
}

export function buildMarketPayload({ generatedAt, companies, quotes, baselines = new Map() }) {
  const quoteMap = new Map((quotes || []).map(row => [codeOf(row), row]).filter(([code]) => code));
  const rows = mergeRecentRegistrations(companies || [], []).map(company => {
    const quote = quoteMap.get(company.code) || null;
    const latest = numberValue(valueOf(quote, "LatestPrice", "成交"));
    const previousAverage = numberValue(valueOf(quote, "PreviousAveragePrice", "前日均價"));
    const average = numberValue(valueOf(quote, "Average", "日均價"));
    const volume = integerValue(valueOf(quote, "TransactionVolume", "成交量"));
    const turnover = Math.round((average ?? latest ?? 0) * volume);
    const baseline = baselines.get(company.code) || null;
    const lastWeekClose = numberValue(baseline?.close ?? baseline?.value);
    const dailyChange = latest !== null && previousAverage !== null ? round(latest - previousAverage, 2) : null;
    const dailyChangePercent = latest !== null && previousAverage !== null && previousAverage !== 0
      ? round((latest - previousAverage) / previousAverage, 6) : null;
    const change = latest !== null && lastWeekClose !== null && lastWeekClose !== 0
      ? round((latest - lastWeekClose) / lastWeekClose, 6) : null;
    const quoteDate = toIsoDate(valueOf(quote, "Date", "日期"));
    const quoteTime = normaliseTime(valueOf(quote, "Time", "時間"));
    const suspended = Boolean(cleanText(valueOf(quote, "SuspendTime", "暫停交易開始時間")));
    const qualified = volume >= 10_000 && turnover >= 500_000;

    return {
      code: company.code,
      name: company.name,
      fullName: company.fullName,
      industryCode: company.industryCode,
      industry: company.industry,
      listedDate: company.listedDate,
      latest,
      previousAverage,
      average,
      bid: numberValue(valueOf(quote, "BuyingPrice", "報買價")),
      ask: numberValue(valueOf(quote, "SellingPrice", "報賣價")),
      bidQuantity: integerValue(valueOf(quote, "BuyingQuantity", "報買量")),
      askQuantity: integerValue(valueOf(quote, "SellingQuantity", "報賣量")),
      high: numberValue(valueOf(quote, "Highest", "日最高")),
      low: numberValue(valueOf(quote, "Lowest", "日最低")),
      volume,
      turnover,
      change,
      previousClose: previousAverage,
      previousCloseDate: quoteDate,
      dailyChange,
      dailyChangePercent,
      lastWeekClose,
      lastWeekCloseDate: baseline?.date || "",
      qualified,
      lowLiquidity: !qualified,
      buySell: cleanText(valueOf(quote, "Buy/Sell", "投資人成交買賣別")),
      suspended,
      quoteDate,
      priceTime: [quoteDate, quoteTime].filter(Boolean).join(" "),
      priceSource: "公開行情",
      priceError: latest === null ? "無可用成交價" : "",
      priceNote: baseline?.date ? "" : "上週無有效成交",
      website: company.website
    };
  }).sort((a, b) => (b.dailyChangePercent ?? -Infinity) - (a.dailyChangePercent ?? -Infinity) || b.volume - a.volume || a.code.localeCompare(b.code));

  const quoteDate = rows.map(row => row.quoteDate).filter(Boolean).sort().at(-1) || "";
  const quoteTime = rows.map(row => row.priceTime.slice(11)).filter(Boolean).sort().at(-1) || "";
  return {
    generatedAt,
    quoteDate,
    quoteTime,
    stale: false,
    source: "openapi",
    rows,
    summary: {
      count: rows.length,
      qualified: rows.filter(row => row.qualified).length,
      rising: rows.filter(row => row.dailyChangePercent !== null && row.dailyChangePercent > 0).length,
      falling: rows.filter(row => row.dailyChangePercent !== null && row.dailyChangePercent < 0).length,
      flat: rows.filter(row => row.dailyChangePercent === 0).length,
      lowLiquidity: rows.filter(row => row.lowLiquidity).length,
      turnover: rows.reduce((total, row) => total + row.turnover, 0)
    }
  };
}

export function buildTrackerPayload({
  generatedAt,
  applicants,
  auctions = [],
  publicOfferings = [],
  prices = new Map(),
  baselines = new Map(),
  today,
  baseFriday = "",
  raw = {}
}) {
  const auctionMap = byCode(auctions);
  const offeringMap = byCode(publicOfferings);
  const items = (applicants || [])
    .map(normaliseApplicant)
    .filter(item => item.code && !isTerminatedApplication(`${item.status} ${item.note}`) && !isManagementStockApplication(item))
    .map(item => enrichApplicant(item, auctionMap.get(item.code), offeringMap.get(item.code), prices.get(item.code), baselines.get(item.code), today))
    .filter(item => (!item.listingDate || item.listingDate > today) && !isInactiveHistoricalApplication(item, today))
    .sort((a, b) => (a.submitDate || "9999-12-31").localeCompare(b.submitDate || "9999-12-31") || a.code.localeCompare(b.code));

  const categories = {
    submitted: items.filter(item => !item.reviewDate && !item.boardDate && !item.approvalDate && !item.listingDate && !item.auction),
    review: items.filter(item => item.reviewDate && !item.boardDate && !item.approvalDate && !item.listingDate && !item.auction),
    board: items.filter(item => item.boardDate && !item.approvalDate && !item.listingDate && !item.auction),
    contract: items.filter(item => item.approvalDate && !item.listingDate && !item.auction),
    auction: items.filter(item => Boolean(item.auction || item.listingDate))
  };
  const radar = items.map(item => radarRow(item, today)).sort((a, b) => a.stage.localeCompare(b.stage) || a.code.localeCompare(b.code));
  const alerts = radar.filter(row => /近期事件|定價完成|定價待確認/.test(row.signal));
  const upcoming = radar
    .filter(row => row.exitDate && row.exitDate >= today)
    .sort((a, b) => a.exitDate.localeCompare(b.exitDate) || a.code.localeCompare(b.code))
    .map(row => ({ event: row.mainExit, code: row.code, name: row.name, date: row.exitDate, days: row.exitDays, signal: row.signal, currentPrice: row.currentPrice, chartUrl: row.chartUrl }));
  const priceErrors = items.filter(item => item.priceError);
  const basisNotes = items.filter(item => !item.priceError && item.priceNote);

  return {
    generatedAt,
    baseFriday: baseFriday || lastCompletedFriday(today),
    counts: {
      total: items.length,
      alerts: alerts.length,
      upcoming: upcoming.length,
      priceErrors: priceErrors.length,
      basisNotes: basisNotes.length,
      submitted: categories.submitted.length,
      review: categories.review.length,
      board: categories.board.length,
      contract: categories.contract.length,
      auction: categories.auction.length
    },
    categories,
    radar,
    alerts,
    upcoming,
    priceErrors,
    basisNotes,
    raw
  };
}

export function selectWeeklyBaselines(reports, lastWeekEnd) {
  const weekStart = addDays(lastWeekEnd, -4);
  const result = new Map();
  const sorted = [...(reports || [])]
    .map(report => ({ ...report, date: toIsoDate(report?.date) }))
    .filter(report => report.date >= weekStart && report.date <= lastWeekEnd)
    .sort((a, b) => b.date.localeCompare(a.date));

  for (const report of sorted) {
    for (const [code, value] of reportEntries(report)) {
      const close = numberValue(value?.close ?? value?.value ?? value);
      if (/^\d{4}$/.test(code) && close !== null && close > 0 && !result.has(code)) {
        result.set(code, { close, date: report.date });
      }
    }
  }
  return result;
}

export function parseDailyAverageReport(payload) {
  const table = payload?.tables?.[0] || {};
  const totals = new Map();
  for (const row of Array.isArray(table.data) ? table.data : []) {
    const code = cleanText(row?.[0]);
    const price = numberValue(row?.[3]);
    const volume = integerValue(row?.[4]) + integerValue(row?.[5]);
    if (!/^\d{4}$/.test(code) || price === null || volume <= 0) continue;
    const current = totals.get(code) || { amount: 0, volume: 0 };
    current.amount += price * volume;
    current.volume += volume;
    totals.set(code, current);
  }
  const values = new Map();
  for (const [code, total] of totals) values.set(code, round(total.amount / total.volume, 2));
  return { date: toIsoDate(table.date), values };
}

export function isTerminatedApplication(note) {
  return /撤件|自撤|自行撤回|撤回(?:申請)?|撤銷.*(?:申請|契約)|退件|退回|終止.*(?:申請|契約)/.test(String(note || ""));
}

export function isManagementStockApplication(item) {
  return /管理股票/.test(`${item?.name || ""} ${item?.note || ""}`);
}

export function isInactiveHistoricalApplication(item, today) {
  if (!today) return false;
  const lastProgressDate = [item?.submitDate, item?.reviewDate, item?.boardDate, item?.approvalDate]
    .filter(Boolean)
    .sort()
    .at(-1);
  if (!lastProgressDate || lastProgressDate >= subtractYears(today, 2)) return false;
  return !hasUpcomingOfficialSchedule(item, today);
}

export function toIsoDate(value) {
  const text = cleanText(value).replace(/\./g, "/");
  if (!text) return "";
  const iso = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return `${iso[1]}-${pad(iso[2])}-${pad(iso[3])}`;
  const roc = text.match(/^(\d{2,3})[-/](\d{1,2})[-/](\d{1,2})/);
  if (roc) return `${Number(roc[1]) + 1911}-${pad(roc[2])}-${pad(roc[3])}`;
  const digits = text.replace(/\D/g, "");
  if (/^\d{8}$/.test(digits)) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  if (/^\d{7}$/.test(digits)) return `${Number(digits.slice(0, 3)) + 1911}-${digits.slice(3, 5)}-${digits.slice(5, 7)}`;
  return "";
}

function normaliseCompany(row) {
  const code = codeOf(row);
  const industryCode = cleanText(valueOf(row, "industryCode", "SecuritiesIndustryCode"));
  const name = cleanText(valueOf(row, "name", "CompanyAbbreviation", "CompanyName"));
  return {
    ...row,
    code,
    name,
    fullName: cleanText(valueOf(row, "fullName", "CompanyName", "CompanyAbbreviation")) || name,
    industryCode,
    industry: INDUSTRIES[industryCode] || "待確認",
    listedDate: toIsoDate(valueOf(row, "listedDate", "DateOfListing")),
    website: normaliseWebsite(valueOf(row, "website", "WebAddress"))
  };
}

function normaliseApplicant(row) {
  return {
    code: cleanText(valueOf(row, "code", "SecuritiesCompanyCode")),
    name: cleanText(valueOf(row, "name", "CompanyName")),
    market: cleanText(valueOf(row, "market")) || "上市",
    submitDate: toIsoDate(valueOf(row, "submitDate", "Date", "ApplyingDate")),
    reviewDate: toIsoDate(valueOf(row, "reviewDate", "TWSEListingReviewDate", "TPExListingScreeningCommitteeDate")),
    boardDate: toIsoDate(valueOf(row, "boardDate", "TWSEBoardDate", "TPExSanctionedDate")),
    approvalDate: toIsoDate(valueOf(row, "approvalDate", "ContractDate", "TPExApprovedTradingDate")),
    listingDate: toIsoDate(valueOf(row, "listingDate", "ListingDate")),
    underwriter: cleanText(valueOf(row, "underwriter", "LeadUnderwriter")),
    actualPrice: numberValue(valueOf(row, "actualPrice", "OfferingPrice")),
    provisionalPrice: numberValue(valueOf(row, "provisionalPrice")),
    status: cleanText(valueOf(row, "status", "ApplyingStatus")) || "剛送件",
    note: cleanText(valueOf(row, "note", "Note"))
  };
}

function enrichApplicant(item, auction, offering, marketRow, baseline, today) {
  const listingDate = item.listingDate || toIsoDate(offering?.listingDate);
  const actualPrice = firstPositive(item.actualPrice, offering?.actualPrice, auction?.actualPrice);
  const provisionalPrice = firstPositive(item.provisionalPrice, offering?.provisionalPrice);
  const currentPrice = numberValue(marketRow?.latest ?? marketRow?.currentPrice);
  const lastWeekClose = numberValue(marketRow?.lastWeekClose ?? baseline?.close ?? baseline?.value);
  const weeklyChange = currentPrice !== null && lastWeekClose !== null && lastWeekClose !== 0
    ? round((currentPrice - lastWeekClose) / lastWeekClose, 6) : "";
  const auctionValue = auction ? {
    ...auction,
    bidStart: toIsoDate(auction.bidStart),
    bidEnd: toIsoDate(auction.bidEnd),
    openDate: toIsoDate(auction.openDate)
  } : null;

  return {
    ...item,
    listingDate,
    auction: auctionValue,
    publicOffering: offering || null,
    actualPrice,
    provisionalPrice,
    offerPrice: actualPrice,
    pricingStatus: actualPrice !== "" ? "已定價" : provisionalPrice !== "" ? "暫定價／待定價" : "待公告",
    currentPrice: currentPrice ?? "",
    lastWeekClose: lastWeekClose ?? "",
    priceTime: cleanText(marketRow?.priceTime),
    priceError: cleanText(marketRow?.priceError),
    priceNote: cleanText(marketRow?.priceNote) || (baseline?.date ? "" : "上週無有效成交"),
    weeklyChange,
    status: trackerStatus({ ...item, listingDate, auction: auctionValue, actualPrice, today })
  };
}

function radarRow(item, today) {
  const stage = trackerStage(item, today);
  const exit = mainEvent(item, today);
  const auctionNext = nextAuctionEvent(item.auction, today);
  const current = numberValue(item.currentPrice);
  const priceRef = item.actualPrice !== "" ? item.actualPrice : "";
  const premium = current !== null && priceRef !== "" && priceRef !== 0 ? round((current - priceRef) / priceRef, 4) : "";
  const triggerStatus = weeklyTrigger(item.weeklyChange);
  const premiumStatus = premiumText(premium, priceRef);
  const reason = [
    item.approvalDate ? "已核准／同意契約" : "",
    auctionNext.name ? `${auctionNext.name}${auctionNext.date ? ` ${auctionNext.date.slice(5)}` : ""}` : "",
    item.actualPrice !== "" ? `承銷價 ${displayPrice(item.actualPrice)} 已確認` : item.provisionalPrice !== "" ? `暫定價 ${displayPrice(item.provisionalPrice)}` : "",
    item.listingDate ? listingEventName(item.market) + " " + item.listingDate.slice(5) : "",
    triggerStatus
  ].filter(Boolean).join("；");
  return {
    signal: trackerSignal(stage, exit.days),
    stage,
    code: item.code,
    name: item.name,
    market: item.market,
    status: trackerStatus({ ...item, today }),
    submitDays: item.submitDate ? daysBetween(item.submitDate, today) : "",
    mainExit: exit.name,
    exitDate: exit.date,
    exitDays: exit.days,
    listingDate: item.listingDate,
    auctionNext: auctionNext.name,
    currentPrice: displayPrice(item.currentPrice),
    lastWeekClose: displayPrice(item.lastWeekClose),
    weeklyChange: item.weeklyChange,
    triggerStatus,
    priceRef: displayPrice(priceRef),
    provisionalPrice: displayPrice(item.provisionalPrice),
    actualPrice: displayPrice(item.actualPrice),
    pricingStatus: item.pricingStatus,
    premium,
    premiumStatus,
    reason,
    note: item.note,
    chartUrl: `https://tw.stock.yahoo.com/quote/${item.code}.${item.market === "上市" ? "TW" : "TWO"}`
  };
}

function trackerStatus(item) {
  if (item.listingDate) return "買賣日已排定";
  const next = nextAuctionEvent(item.auction, item.today || "9999-12-31");
  if (next.name === "競拍開始") return "競拍中";
  if (next.name === "競拍結束") return "競拍中";
  if (next.name === "開標") return "競拍待開標";
  if (item.auction) return "競拍已開標";
  if (item.approvalDate) return "已核准";
  if (item.boardDate) return "董事會通過";
  if (item.reviewDate) return "已審議";
  return item.status || "剛送件";
}

function trackerStage(item, today) {
  if (item.actualPrice !== "") return "D.定價完成";
  if (item.auction?.openDate && item.auction.openDate <= today) return "D.定價待確認";
  if (item.auction) return "D.競拍進程";
  if (item.listingDate) return "D.買賣日排定";
  if (item.approvalDate) return "C.契約後";
  if (item.boardDate || item.reviewDate) return "B.審議進程";
  return "A.送件觀察";
}

function trackerSignal(stage, days) {
  if (stage === "D.定價完成") return "定價完成";
  if (stage === "D.定價待確認") return "定價待確認";
  if (stage === "D.競拍進程" || stage === "D.買賣日排定") return days !== "" && days <= 5 ? "近期事件" : "時程接近";
  if (stage === "C.契約後") return "契約後";
  if (stage === "B.審議進程") return "審議進程";
  return "資料觀察";
}

function nextAuctionEvent(auction, today) {
  if (!auction) return { name: "", date: "" };
  if (auction.bidStart && today <= auction.bidStart) return { name: "競拍開始", date: auction.bidStart };
  if (auction.bidEnd && today <= auction.bidEnd) return { name: "競拍結束", date: auction.bidEnd };
  if (auction.openDate && today <= auction.openDate) return { name: "開標", date: auction.openDate };
  return { name: "已開標", date: "" };
}

function mainEvent(item, today) {
  const auctionNext = nextAuctionEvent(item.auction, today);
  if (auctionNext.name && auctionNext.name !== "已開標") return { name: auctionNext.name, date: auctionNext.date, days: daysBetween(today, auctionNext.date) };
  if (item.listingDate) return { name: listingEventName(item.market), date: item.listingDate, days: daysBetween(today, item.listingDate) };
  return { name: "", date: "", days: "" };
}

function listingEventName(market) {
  return market === "上櫃" ? "股票上櫃買賣日" : "股票上市買賣日";
}

function reportEntries(report) {
  if (report.values instanceof Map) return [...report.values.entries()];
  if (Array.isArray(report.values)) return report.values;
  return (report.rows || []).map(row => [cleanText(row.code), row]);
}

function byCode(rows) {
  return new Map((rows || []).map(row => [codeOf(row), row]).filter(([code]) => code));
}

function valueOf(row, ...keys) {
  if (!row) return "";
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) return row[key];
  }
  return "";
}

function codeOf(row) {
  return cleanText(valueOf(row, "code", "SecuritiesCompanyCode", "股票代號", "公司代號"));
}

function numberValue(value) {
  const text = cleanText(value).replace(/,/g, "");
  if (!text || text === "-") return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function integerValue(value) {
  return Math.trunc(numberValue(value) || 0);
}

function firstPositive(...values) {
  for (const value of values) {
    const number = numberValue(value);
    if (number !== null && number > 0) return number;
  }
  return "";
}

function normaliseWebsite(value) {
  const website = cleanText(value);
  if (!website) return "";
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

function normaliseTime(value) {
  const text = cleanText(value);
  if (/^\d{2}:\d{2}:\d{2}$/.test(text)) return text;
  const digits = text.replace(/\D/g, "");
  if (/^\d{6}$/.test(digits)) return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4, 6)}`;
  if (/^\d{4}$/.test(digits)) return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:00`;
  return text;
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function addDays(value, offset) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function subtractYears(value, years) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date.toISOString().slice(0, 10);
}

function hasUpcomingOfficialSchedule(item, today) {
  if (item?.listingDate && item.listingDate > today) return true;
  return [item?.auction?.bidStart, item?.auction?.bidEnd, item?.auction?.openDate]
    .some(date => date && date >= today);
}

function daysBetween(start, end) {
  if (!start || !end) return "";
  return Math.round((new Date(`${end}T00:00:00Z`) - new Date(`${start}T00:00:00Z`)) / 86_400_000);
}

function lastCompletedFriday(today) {
  const date = new Date(`${today}T00:00:00Z`);
  const weekday = date.getUTCDay();
  const offset = (weekday - 5 + 7) % 7 || 7;
  return addDays(today, -offset);
}

function weeklyTrigger(value) {
  const change = numberValue(value);
  if (change === null) return "";
  if (change >= 0.1) return "漲幅較大";
  if (change >= 0.03) return "近週上漲";
  if (change <= -0.1) return "跌幅較大";
  if (change <= -0.03) return "近週下跌";
  return "波動有限";
}

function premiumText(premium, priceRef) {
  if (priceRef === "" || premium === "") return "待承銷／定價";
  if (premium >= 0.3) return "價差較大";
  if (premium >= 0.15) return "價差中等";
  if (premium >= 0) return "高於承銷價";
  return "低於承銷價";
}

function displayPrice(value) {
  const number = numberValue(value);
  return number === null ? "" : String(round(number, 2));
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function pad(value) {
  return String(value).padStart(2, "0");
}
