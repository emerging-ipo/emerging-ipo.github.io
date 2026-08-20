import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMarketPayload,
  buildTrackerPayload,
  isTerminatedApplication,
  mergeRecentRegistrations,
  parseDailyAverageReport,
  selectWeeklyBaselines
} from "../lib/official-static-data.mjs";

test("recent registrations supplement but never remove the master roster", () => {
  const rows = mergeRecentRegistrations(
    [{ SecuritiesCompanyCode: "7943", CompanyAbbreviation: "鴻璟科技" }],
    [{ code: "7944", name: "睿禾金碳", listedDate: "2026-08-19" }]
  );

  assert.deepEqual(rows.map(row => row.code), ["7943", "7944"]);
  assert.equal(rows[1].name, "睿禾金碳");
});

test("withdrawn applications are excluded and auction dates never become listing dates", () => {
  const payload = buildTrackerPayload({
    generatedAt: "2026-08-20 15:10:00",
    applicants: [
      { code: "9999", name: "撤件公司", market: "上市", submitDate: "2026-08-01", status: "自行撤回申請" },
      { code: "8888", name: "競拍公司", market: "上市", submitDate: "2026-08-01", status: "已核准" },
      { code: "7777", name: "審議公司", market: "上市", submitDate: "2026-08-01", reviewDate: "2026-08-18", status: "剛送件" }
    ],
    auctions: [{ code: "8888", name: "競拍公司", bidStart: "2026-08-20", bidEnd: "2026-08-22", openDate: "2026-08-25" }],
    publicOfferings: [],
    prices: new Map(),
    baselines: new Map(),
    today: "2026-08-20"
  });

  assert.equal(payload.radar.some(row => row.code === "9999"), false);
  const auctionRow = payload.radar.find(row => row.code === "8888");
  assert.equal(auctionRow.listingDate, "");
  assert.equal(auctionRow.auctionNext, "競拍開始");
  assert.equal(auctionRow.status, "競拍中");
  assert.equal(payload.categories.review.find(row => row.code === "7777").status, "已審議");
});

test("terminated application terms are recognised across official status wording", () => {
  assert.equal(isTerminatedApplication("撤件"), true);
  assert.equal(isTerminatedApplication("公司自行撤回申請"), true);
  assert.equal(isTerminatedApplication("審議會決議退回上櫃審議"), true);
  assert.equal(isTerminatedApplication("終止上市契約"), true);
  assert.equal(isTerminatedApplication("終止申請"), true);
  assert.equal(isTerminatedApplication("已核准"), false);
});

test("weekly baseline uses the final available session in the completed week", () => {
  const baselines = selectWeeklyBaselines([
    { date: "2026-08-03", rows: [{ code: "1234", close: 80 }] },
    { date: "2026-08-06", rows: [{ code: "1234", close: 83 }] }
  ], "2026-08-07");

  assert.deepEqual(baselines.get("1234"), { close: 83, date: "2026-08-06" });
});

test("market payload keeps official current, prior-session and completed-week values distinct", () => {
  const payload = buildMarketPayload({
    generatedAt: "2026-08-20 15:10:00",
    companies: [{ SecuritiesCompanyCode: "1234", CompanyAbbreviation: "測試公司", CompanyName: "測試公司股份有限公司", SecuritiesIndustryCode: "24", DateOfListing: "20260819" }],
    quotes: [{ SecuritiesCompanyCode: "1234", Date: "115/08/20", Time: "15:00:00", LatestPrice: "110", PreviousAveragePrice: "100", Average: "108", TransactionVolume: "10000" }],
    baselines: new Map([["1234", { close: 90, date: "2026-08-14" }]])
  });

  assert.equal(payload.rows[0].latest, 110);
  assert.equal(payload.rows[0].dailyChange, 10);
  assert.equal(payload.rows[0].dailyChangePercent, 0.1);
  assert.equal(payload.rows[0].lastWeekClose, 90);
  assert.equal(payload.rows[0].change, 0.222222);
  assert.equal(payload.rows[0].industry, "半導體");
});

test("daily TPEx report aggregates transaction rows before selecting a weekly baseline", () => {
  const report = parseDailyAverageReport({
    tables: [{
      date: "115/08/06",
      data: [
        ["1234", "", "", "80", "2", "0"],
        ["1234", "", "", "100", "1", "0"],
        ["9999", "", "", "-", "3", "0"]
      ]
    }]
  });

  assert.equal(report.date, "2026-08-06");
  assert.equal(report.values.get("1234"), 86.67);
  assert.equal(report.values.has("9999"), false);
});

test("compact official quote times are displayed as clock times", () => {
  const payload = buildMarketPayload({
    generatedAt: "2026-08-20 16:10:00",
    companies: [{ SecuritiesCompanyCode: "1234", CompanyAbbreviation: "測試公司" }],
    quotes: [{ SecuritiesCompanyCode: "1234", Date: "1150820", Time: "160005", LatestPrice: "100", PreviousAveragePrice: "90", Average: "95", TransactionVolume: "10000" }],
    baselines: new Map()
  });

  assert.equal(payload.quoteTime, "16:00:05");
  assert.equal(payload.rows[0].priceTime, "2026-08-20 16:00:05");
});
