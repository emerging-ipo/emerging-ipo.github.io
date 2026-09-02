import { readFile } from "node:fs/promises";

import { verifyStaticData } from "../lib/static-data-verifier.mjs";

const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const [market, tracker] = await Promise.all([
  readJson("../public/data/market.json"),
  readJson("../public/data/tracker.json")
]);
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());
const result = verifyStaticData({ market, tracker, today, schedule: process.env.REFRESH_SCHEDULE || "" });

console.log(`Verified ${result.marketRows} market rows, ${result.trackerRows} tracker rows, quote date ${result.quoteDate}.`);
