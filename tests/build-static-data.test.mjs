import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  completedWeekEndForQuoteDate,
  createRecentRegistrationRequest,
  loadCompletedWeekReports,
  writeValidatedJson
} from "../lib/static-data-builder.mjs";

test("Friday and Saturday builds keep Friday's quote date on the prior completed week", () => {
  const fridayQuoteDate = "2026-08-21";
  assert.equal(completedWeekEndForQuoteDate(fridayQuoteDate), "2026-08-14");
  assert.equal(completedWeekEndForQuoteDate(fridayQuoteDate), "2026-08-14");
});

test("builder refuses a short roster and preserves the prior market file", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "esrstk-static-data-"));
  const destination = path.join(directory, "market.json");
  const priorText = '{"rows":["prior"]}\n';
  await writeFile(destination, priorText, "utf8");

  await assert.rejects(
    () => writeValidatedJson(destination, [{ SecuritiesCompanyCode: "1234" }], { minimumRows: 300 }),
    /only 1 valid rows/
  );
  assert.equal(await readFile(destination, "utf8"), priorText);
});

test("recent-registration endpoint posts the current Gregorian year", () => {
  const request = createRecentRegistrationRequest(2026);
  assert.equal(request.url, "https://www.tpex.org.tw/www/zh-tw/company/latestEmerge");
  assert.equal(request.init.method, "POST");
  assert.equal(request.init.body, "date=2026");
});

test("weekly report download retries and refuses an incomplete official week", async () => {
  const attempts = new Map();
  const fetchImpl = async url => {
    const date = decodeURIComponent(String(url).match(/date=([^&]+)/)?.[1] || "").replaceAll("/", "-");
    attempts.set(date, (attempts.get(date) || 0) + 1);
    if (date === "2026-08-14") throw new Error("temporary official source failure");
    return {
      ok: true,
      json: async () => ({
        date: date.replaceAll("-", ""),
        tables: [{ data: [["1234", "", "", "80", "1", "0"]] }]
      })
    };
  };

  await assert.rejects(
    () => loadCompletedWeekReports(fetchImpl, "2026-08-14"),
    /2026-08-14.*temporary official source failure/
  );
  assert.equal(attempts.get("2026-08-14"), 3);
});
