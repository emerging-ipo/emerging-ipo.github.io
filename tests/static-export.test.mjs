import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("GitHub Pages build uses a static export", async () => {
  const config = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");
  assert.match(config, /output:\s*["']export["']/);
  assert.match(config, /trailingSlash:\s*true/);
});

test("dashboard reads core market and tracker data from same-origin static files", async () => {
  const dashboard = await readFile(new URL("../app/Dashboard.tsx", import.meta.url), "utf8");
  assert.match(dashboard, /fetch\("\/data\/market\.json"/);
  assert.match(dashboard, /fetch\("\/data\/tracker\.json"/);
  assert.doesNotMatch(dashboard, /chatgpt\.site|NEXT_PUBLIC_DATA_API_BASE|DATA_API_BASE/);
  assert.doesNotMatch(dashboard, /\/api\/yahoo/);
  assert.doesNotMatch(dashboard, /Yahoo 技術線圖|正在取得 Yahoo 股市行情|>Yahoo</);
});

test("GitHub Pages workflow deploys the static output", async () => {
  const workflow = await readFile(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(workflow, /path:\s*out/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /cron:\s*["']10 7 \* \* 1-5["']/);
  assert.match(workflow, /npm run build/);
  assert.doesNotMatch(workflow, /DATA_API_BASE|NEXT_PUBLIC_DATA_API_BASE|chatgpt\.site/);
});

test("scheduled build uses the local official-data builder only", async () => {
  const [pkg, script, legacyScript] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../scripts/build-static-data.mjs", import.meta.url), "utf8"),
    readFile(new URL("../scripts/refresh-snapshots.mjs", import.meta.url), "utf8")
  ]);
  assert.match(pkg, /"build:data": "node scripts\/build-static-data\.mjs"/);
  assert.match(pkg, /"build": "npm run build:data && next build"/);
  assert.match(script, /buildStaticData/);
  assert.match(legacyScript, /buildStaticData/);
  assert.doesNotMatch(legacyScript, /chatgpt\.site|DATA_API_BASE/);
});

test("built export contains the core routes and non-empty public datasets", async () => {
  const [marketPage, radarPage, ipoPage, marketData, trackerData] = await Promise.all([
    readFile(new URL("../out/market/index.html", import.meta.url), "utf8"),
    readFile(new URL("../out/radar/index.html", import.meta.url), "utf8"),
    readFile(new URL("../out/ipo/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/data/market.json", import.meta.url), "utf8"),
    readFile(new URL("../public/data/tracker.json", import.meta.url), "utf8")
  ]);

  assert.match(marketPage, /興櫃市場/);
  assert.match(radarPage, /進度雷達/);
  assert.match(ipoPage, /IPO時程表/);
  assert.ok(JSON.parse(marketData).rows.length >= 300);
  assert.ok(JSON.parse(trackerData).counts.total > 0);
});

test("dashboard does not label a static refresh as unsupported live data", async () => {
  const dashboard = await readFile(new URL("../app/Dashboard.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(dashboard, /正在取得即時行情/);
  assert.doesNotMatch(dashboard, /\|\| "即時"/);
});

test("market metadata and methodology describe the post-close static dataset accurately", async () => {
  const [marketPage, methodology] = await Promise.all([
    readFile(new URL("../app/market/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/methodology/page.tsx", import.meta.url), "utf8")
  ]);
  assert.match(marketPage, /收盤排行/);
  assert.doesNotMatch(marketPage, /即時排行|即時報價/);
  assert.match(methodology, /收盤後/);
});
