import assert from "node:assert/strict";
import test from "node:test";

import { verifyStaticData } from "../lib/static-data-verifier.mjs";

const completePayloads = quoteDate => ({
  market: {
    generatedAt: "2026-09-02 16:40:00",
    quoteDate,
    rows: Array.from({ length: 364 }, (_, index) => ({ code: String(6000 + index) }))
  },
  tracker: {
    generatedAt: "2026-09-02 16:40:00",
    radar: [{ code: "7999" }]
  }
});

test("16:40 verification rejects a prior-day market snapshot", () => {
  assert.throws(
    () => verifyStaticData({ ...completePayloads("2026-09-01"), today: "2026-09-02", schedule: "40 8 * * 1-5" }),
    /行情日期仍為 2026-09-01/
  );
});

test("16:10 verification allows the prior trading day before official data is complete", () => {
  assert.doesNotThrow(() => verifyStaticData({
    ...completePayloads("2026-09-01"),
    today: "2026-09-02",
    schedule: "10 8 * * 1-5"
  }));
});

test("post-close verification accepts a complete current-day snapshot", () => {
  assert.doesNotThrow(() => verifyStaticData({
    ...completePayloads("2026-09-02"),
    today: "2026-09-02",
    schedule: "40 8 * * 1-5"
  }));
});
