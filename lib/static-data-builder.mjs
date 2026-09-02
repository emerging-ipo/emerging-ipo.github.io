import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildMarketPayload,
  buildTrackerPayload,
  completedWeekEndForQuoteDate,
  mergeRecentRegistrations,
  parseDailyAverageReport,
  selectWeeklyBaselines,
  toIsoDate
} from "./official-static-data.mjs";

const TPEx_QUOTES_URL = "https://www.tpex.org.tw/openapi/v1/tpex_esb_latest_statistics";
const TPEx_COMPANIES_URL = "https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_R";
const TPEx_APPLICANTS_URL = "https://www.tpex.org.tw/openapi/v1/tpex_esb_applicant_companies";
const TWSE_APPLICANTS_URL = "https://www.twse.com.tw/rwd/zh/company/applylisting?response=json";
const TWSE_AUCTION_URL = year => `https://www.twse.com.tw/rwd/zh/announcement/auction?response=json&yy=${year}`;
const TWSE_OFFERING_URL = year => `https://www.twse.com.tw/rwd/zh/announcement/publicForm?response=json&yy=${year}`;
const TPEx_DAILY_REPORT_URL = date => `https://www.tpex.org.tw/www/zh-tw/emerging/dss004?date=${date.replaceAll("-", "/")}&response=json`;

export function createRecentRegistrationRequest(year) {
  return {
    url: "https://www.tpex.org.tw/www/zh-tw/company/latestEmerge",
    init: {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": "Mozilla/5.0 (compatible; EmergingStockRadar/1.0)",
        "X-Requested-With": "XMLHttpRequest"
      },
      body: `date=${year}`
    }
  };
}

export async function writeValidatedJson(destination, payload, { minimumRows = 1, rows = payload } = {}) {
  const valueRows = Array.isArray(rows) ? rows : [];
  const validRows = valueRows.filter(row => /^\d{4}$/.test(String(row?.code || row?.SecuritiesCompanyCode || "").trim()));
  if (validRows.length < minimumRows) {
    throw new Error(`${path.basename(destination)} has only ${validRows.length} valid rows`);
  }

  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(payload)}\n`, "utf8");
  await rename(temporary, destination);
  return validRows.length;
}

export async function buildStaticData({ root = process.cwd(), fetchImpl = fetch, now = new Date(), log = console } = {}) {
  const taipei = taipeiParts(now);
  const year = Number(taipei.date.slice(0, 4));
  const outputDir = path.join(root, "public", "data");
  const generatedAt = `${taipei.date} ${taipei.time}`;

  const [quotes, companies, recentPayload, twsePayload, tpexApplicants, auctionPayload, offeringPayload] = await Promise.all([
    fetchJson(fetchImpl, TPEx_QUOTES_URL),
    fetchJson(fetchImpl, TPEx_COMPANIES_URL),
    fetchJson(fetchImpl, createRecentRegistrationRequest(year).url, createRecentRegistrationRequest(year).init),
    fetchJson(fetchImpl, TWSE_APPLICANTS_URL),
    fetchJson(fetchImpl, TPEx_APPLICANTS_URL),
    fetchJson(fetchImpl, TWSE_AUCTION_URL(year)),
    fetchJson(fetchImpl, TWSE_OFFERING_URL(year))
  ]);

  if (!Array.isArray(quotes) || !Array.isArray(companies)) throw new Error("TPEx market source returned an invalid payload");
  const recent = recentRegistrationRows(recentPayload);
  const mergedCompanies = mergeRecentRegistrations(companies, recent);
  const quoteDate = latestOfficialQuoteDate(quotes);
  if (!quoteDate) throw new Error("Official market quotes contain no valid quote date");
  const completedFriday = completedWeekEndForQuoteDate(quoteDate);
  const dailyReports = await loadCompletedWeekReports(fetchImpl, completedFriday);
  const baselines = selectWeeklyBaselines(dailyReports, completedFriday);
  if (!baselines.size) throw new Error(`No official weekly baseline is available for ${completedFriday}`);

  const market = buildMarketPayload({ generatedAt, companies: mergedCompanies, quotes, baselines });
  if (market.rows.length < 300) throw new Error(`Official market roster has only ${market.rows.length} valid rows`);

  const applicants = [
    ...twseApplicantRows(twsePayload?.data || []),
    ...tpexApplicantRows(tpexApplicants || [])
  ];
  const auctions = auctionRows(auctionPayload?.data || []);
  const publicOfferings = publicOfferingRows(offeringPayload?.data || []);
  const prices = new Map(market.rows.map(row => [row.code, row]));
  const tracker = buildTrackerPayload({
    generatedAt,
    applicants,
    auctions,
    publicOfferings,
    prices,
    baselines,
    today: taipei.date,
    baseFriday: completedFriday,
    raw: {
      listedRows: Array.isArray(twsePayload?.data) ? twsePayload.data.length : 0,
      otcRows: Array.isArray(tpexApplicants) ? tpexApplicants.length : 0,
      auctionRows: Array.isArray(auctionPayload?.data) ? auctionPayload.data.length : 0,
      publicOfferingRows: Array.isArray(offeringPayload?.data) ? offeringPayload.data.length : 0,
      recentRegistrationRows: recent.length
    }
  });
  if (!tracker.radar.length) throw new Error("Official IPO sources returned no active applications");

  const results = await Promise.all([
    writeValidatedJson(path.join(outputDir, "tpex-quotes.json"), quotes, { minimumRows: 300 }),
    writeValidatedJson(path.join(outputDir, "tpex-companies.json"), companies, { minimumRows: 300 }),
    writeValidatedJson(path.join(outputDir, "market.json"), market, { minimumRows: 300, rows: market.rows }),
    writeValidatedJson(path.join(outputDir, "tracker.json"), tracker, { minimumRows: 1, rows: tracker.radar })
  ]);
  log.info(`Saved ${market.rows.length} market rows (quote date ${market.quoteDate}), ${tracker.radar.length} active IPO rows and ${baselines.size} weekly baselines. Generated at ${generatedAt} Asia/Taipei.`);
  return { market, tracker, counts: results, completedFriday };
}

export { completedWeekEndForQuoteDate };

export async function fetchJson(fetchImpl, url, init = {}, { attempts = 5, delayMs = 3_000, waitImpl = wait, log = console } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        ...init,
        headers: {
          Accept: "application/json, text/plain, */*",
          "User-Agent": "Mozilla/5.0 (compatible; EmergingStockRadar/1.0)",
          ...(init.headers || {})
        },
        signal: AbortSignal.timeout(90_000)
      });
      if (!response.ok) {
        const error = new Error(`${url} HTTP ${response.status}`);
        error.status = response.status;
        error.retryAfterMs = retryAfterDelay(response.headers?.get?.("retry-after"));
        if (response.body) await response.body.cancel().catch(() => {});
        throw error;
      }
      return await response.json();
    } catch (error) {
      if (!shouldRetryFetchError(error) || attempt === attempts) throw error;
      lastError = error;
    }
    const retryDelay = Math.max(Math.min(delayMs * 2 ** (attempt - 1), 30_000), lastError.retryAfterMs || 0);
    log.warn(`Official source ${url}: ${lastError.message} (attempt ${attempt}/${attempts}); retrying in ${retryDelay} ms.`);
    await waitImpl(retryDelay);
  }
  throw lastError;
}

function shouldRetryFetchStatus(status) {
  return (status >= 300 && status < 400) || status === 408 || status === 429 || status >= 500;
}

function retryAfterDelay(value) {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  return Math.max(0, Date.parse(value) - Date.now()) || 0;
}

function shouldRetryFetchError(error) {
  const status = Number(error?.status);
  return !Number.isFinite(status) || shouldRetryFetchStatus(status);
}

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

export async function loadCompletedWeekReports(fetchImpl, weekEnd, retryOptions = {}) {
  const dates = Array.from({ length: 5 }, (_, index) => addDays(weekEnd, -index));
  const reports = [];
  for (const date of dates) reports.push(await loadDailyReport(fetchImpl, date, retryOptions));
  return reports.filter(report => report.date && report.values.size);
}

async function loadDailyReport(fetchImpl, date, retryOptions) {
  try {
    return parseDailyAverageReport(await fetchJson(fetchImpl, TPEx_DAILY_REPORT_URL(date), {}, retryOptions));
  } catch (error) {
    throw new Error(`Official TPEx daily report ${date} failed after retries: ${error?.message || "unknown error"}`);
  }
}

function recentRegistrationRows(payload) {
  const table = payload?.tables?.[0] || {};
  const fields = table.fields || [];
  return (table.data || []).map(row => objectFromFields(fields, row)).map(row => ({
    code: readField(row, /公司代號|股票代號|證券代號|代號/),
    name: readField(row, /公司簡稱|公司名稱|名稱/),
    listedDate: toIsoDate(readField(row, /興櫃.*日期|登錄日期|掛牌日期|日期/))
  })).filter(row => /^\d{4}$/.test(row.code));
}

function twseApplicantRows(rows) {
  return rows.map(row => ({
    code: String(row?.[1] || "").trim(),
    name: String(row?.[2] || "").trim(),
    market: "上市",
    submitDate: toIsoDate(row?.[3]),
    reviewDate: toIsoDate(row?.[6]),
    boardDate: toIsoDate(row?.[7]),
    approvalDate: toIsoDate(row?.[8]),
    listingDate: toIsoDate(row?.[9]),
    underwriter: String(row?.[10] || "").trim(),
    actualPrice: row?.[11],
    note: String(row?.[12] || "").trim()
  })).filter(row => /^\d{4}$/.test(row.code));
}

function tpexApplicantRows(rows) {
  return rows.map(row => ({
    code: String(row?.SecuritiesCompanyCode || "").trim(),
    name: String(row?.CompanyName || "").trim(),
    market: "上櫃",
    submitDate: toIsoDate(row?.Date),
    reviewDate: toIsoDate(row?.TPExListingScreeningCommitteeDate),
    boardDate: toIsoDate(row?.TPExSanctionedDate),
    approvalDate: toIsoDate(row?.TPExApprovedTradingDate),
    listingDate: toIsoDate(row?.ListingDate),
    underwriter: String(row?.LeadUnderwriter || "").trim(),
    actualPrice: row?.OfferingPrice,
    note: String(row?.Note || "").trim()
  })).filter(row => /^\d{4}$/.test(row.code));
}

function auctionRows(rows) {
  return rows.map(row => ({
    code: String(row?.[3] || "").trim(),
    name: String(row?.[2] || "").trim(),
    type: String(row?.[5] || "").trim(),
    openDate: toIsoDate(row?.[1]),
    bidStart: toIsoDate(row?.[7]),
    bidEnd: toIsoDate(row?.[8]),
    actualPrice: row?.[24],
    underwriter: String(row?.[16] || "").trim(),
    cancelled: String(row?.[25] || "").trim()
  })).filter(row => /^\d{4}$/.test(row.code) && !row.cancelled && /初上市|初上櫃|創新板/.test(row.type));
}

function publicOfferingRows(rows) {
  return rows.map(row => ({
    code: String(row?.[3] || "").trim(),
    name: String(row?.[2] || "").trim(),
    type: String(row?.[4] || "").trim(),
    actualPrice: row?.[10],
    provisionalPrice: row?.[9],
    listingDate: toIsoDate(row?.[11]),
    underwriter: String(row?.[12] || "").trim(),
    cancelled: String(row?.[17] || "").trim()
  })).filter(row => /^\d{4}$/.test(row.code) && !row.cancelled && /初上市|初上櫃|創新板/.test(row.type));
}

function objectFromFields(fields, values) {
  return Object.fromEntries((fields || []).map((field, index) => [String(field || ""), values?.[index] ?? ""]));
}

function readField(row, expression) {
  const key = Object.keys(row).find(name => expression.test(name));
  return String(key ? row[key] : "").trim();
}

function latestOfficialQuoteDate(quotes) {
  return (quotes || []).map(row => toIsoDate(row?.Date ?? row?.日期)).filter(Boolean).sort().at(-1) || "";
}

function taipeiParts(value) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  }).formatToParts(value).reduce((result, part) => {
    if (part.type !== "literal") result[part.type] = part.value;
    return result;
  }, {});
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`
  };
}

function addDays(value, offset) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
