const STRICT_CURRENT_DAY_SCHEDULES = new Set([
  "40 8 * * 1-5",
  "40 9 * * 1-5",
  "10 10 * * 1-5"
]);

const MIN_MARKET_ROWS = 300;

export function verifyStaticData({ market, tracker, today, schedule = "" }) {
  if (!Array.isArray(market?.rows) || market.rows.length < MIN_MARKET_ROWS) {
    throw new Error(`市場資料不完整：${market?.rows?.length || 0} 筆`);
  }
  if (!Array.isArray(tracker?.radar) || tracker.radar.length < 1) {
    throw new Error("IPO／進度資料不完整");
  }
  if (!String(market.generatedAt || "").startsWith(today) || !String(tracker.generatedAt || "").startsWith(today)) {
    throw new Error(`產生日期不是今日 ${today}`);
  }
  if (STRICT_CURRENT_DAY_SCHEDULES.has(schedule) && market.quoteDate !== today) {
    throw new Error(`盤後行情日期仍為 ${market.quoteDate || "空白"}，預期 ${today}`);
  }

  return { marketRows: market.rows.length, trackerRows: tracker.radar.length, quoteDate: market.quoteDate };
}
