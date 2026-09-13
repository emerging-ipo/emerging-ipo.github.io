const STRICT_CURRENT_DAY_SCHEDULES = new Set([
  "40 9 * * 1-5"
]);

const MIN_MARKET_ROWS = 300;
const WEEKLY_CHANGE_TOLERANCE = 0.000001;

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

  for (const row of market.rows) {
    const latest = numberValue(row?.latest);
    const lastWeekClose = numberValue(row?.lastWeekClose);
    const weeklyChange = numberValue(row?.change);

    if (
      latest === null ||
      lastWeekClose === null ||
      lastWeekClose === 0 ||
      weeklyChange === null
    ) {
      continue;
    }

    const expectedWeeklyChange = round(latest / lastWeekClose - 1, 6);
    if (Math.abs(weeklyChange - expectedWeeklyChange) > WEEKLY_CHANGE_TOLERANCE) {
      throw new Error(`週漲跌幅計算不一致：${row?.code || "未知代號"}`);
    }
  }

  return { marketRows: market.rows.length, trackerRows: tracker.radar.length, quoteDate: market.quoteDate };
}

function numberValue(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}
